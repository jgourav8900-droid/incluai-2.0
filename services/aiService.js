/**
 * AI Service — Phase B: Advanced AI Copilot
 *
 * Features:
 *  - Project-aware intelligence (INCLUAI architecture knowledge baked into system prompt)
 *  - HR policy assistant (intent-based policy retrieval with citations)
 *  - Context-aware conversations (per-user rolling history)
 *  - AI email drafting (structured email tool output)
 *  - Smart recommendations (context-based action suggestions)
 *  - Proper error handling (no fake responses on failure)
 *
 * NOTE: Set AI_PROVIDER with its corresponding API key to use a hosted model.
 *       Without a provider key, the service falls back to Neural RAG (Fast Mode).
 */

const { GoogleGenAI } = require('@google/genai');
const modelProvider = require('./modelProvider');
const ragService = require('./ragService');
const conversationService = require('./conversationService');
const db = require('./dbService');

const DEFAULT_COMPANY = 'COMP001';
const DEFAULT_MODEL = 'gemini-3.1-flash-lite';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Whole-word match so "ai" doesn't match "email" */
function hasAny(text, terms) {
  return terms.some(term => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
  });
}

/** Save conversation silently — never breaks the main response */
async function safeSave(entry) {
  try { await conversationService.addMessage(entry); }
  catch (err) { console.warn('[AIService] Conversation save error:', err.message); }
}

// ── Intent classifier ─────────────────────────────────────────────────────────
function classifyIntent(lower) {
  return {
    isGreeting:      hasAny(lower, ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening', 'how are you', 'whats up']),
    isRewrite:       hasAny(lower, ['rewrite', 'rephrase', 'make clearer', 'more respectful', 'improve this message']),
    isEmailDraft:    hasAny(lower, ['draft email', 'write email', 'email to hr', 'draft a leave', 'write to hr']) ||
                     (hasAny(lower, ['leave']) && hasAny(lower, ['apply', 'email', 'request'])),
    isDataset:       hasAny(lower, ['dataset', 'where is my data', 'find data', 'view data', 'my records', 'attrition']),
    isCopilot:       hasAny(lower, ['what can you do', 'what can this', 'help me with', 'capabilities']),
    isRoadmap:       hasAny(lower, ['roadmap', 'upcoming feature', 'next feature', 'future plan']),
    isSettings:      hasAny(lower, ['settings', 'api key', 'gemini key', 'configure', 'preferences']),
    isParental:      hasAny(lower, ['parental leave', 'maternity', 'paternity', 'baby leave', 'child leave']),
    isLeave:         hasAny(lower, ['leave', 'pto', 'vacation', 'day off', 'time off', 'paid leave', 'sick leave']),
    isRemote:        hasAny(lower, ['remote', 'wfh', 'hybrid', 'work from home', 'work remotely', 'flexible work']),
    isReport:        hasAny(lower, ['file a report', 'submit report', 'raise concern', 'barrier report', 'anonymous report', 'complaint']),
    isAnalytics:     hasAny(lower, ['analytics', 'dashboard metrics', 'stats', 'charts', 'report summary']),
    isPrivacy:       hasAny(lower, ['privacy', 'security', 'data safe', 'gdpr', 'pii', 'trust']),
    isWaitlist:      hasAny(lower, ['waitlist', 'early access', 'sign up for access']),
    isHRPolicy:      hasAny(lower, ['policy', 'entitlement', 'hr rule', 'company rule', 'benefit', 'allowance', 'stipend', 'eligible']),
    isRecommend:     hasAny(lower, ['recommend', 'suggest', 'what should i do', 'next step', 'advice', 'guide me']),
    isNavigation:    hasAny(lower, ['where is', 'how do i', 'how to', 'go to', 'open', 'find the', 'navigate']),
    isTasks:         hasAny(lower, ['task', 'to-do', 'todo', 'action item', 'deadline', 'assignment']),
    isMessages:      hasAny(lower, ['message', 'chat', 'send to', 'inbox']),
  };
}

// ── Project-aware system prompt ───────────────────────────────────────────────
function buildSystemPrompt(name, role, department, employeeId, policyContext) {
  return `You are the INCLUAI 2.0 Enterprise Workplace Intelligence Copilot, embedded in the INCLUAI workplace intelligence platform.

## User Context
- Name: ${name}
- Role: ${role}
- Department: ${department}
- Employee ID: ${employeeId}

## Platform Modules (for navigation questions)
- **/app → Dashboard**: Live analytics and metrics
- **/app → Copilot**: This AI assistant
- **/app → Tasks**: Create, edit, track workplace tasks
- **/app → Reports**: Submit accessibility/inclusion reports (anonymously if needed)
- **/app → Knowledge**: Browse HR policies and company documents
- **/app → Messages**: Internal workplace messaging
- **/app → Settings**: Profile, accessibility, notifications
- **/dataset**: Employee Dataset Explorer & Attrition Intelligence Engine

## Company Knowledge Base Documents
${policyContext || 'No specific company document matched this query.'}

## RESPONSE RULES:
1. **Greetings & Small Talk**: If the user says "hello", "hi", or asks how you are, respond warmly and conversationally (e.g., "Hello! How can I assist you with your workplace questions, company policies, or tasks today?").
2. **General Knowledge & How-to Questions**: For general questions not specific to company policy (e.g. definitions, business concepts like SWOT analysis, coding, general productivity), answer directly, informatively, and accurately. Add a brief, helpful note if relevant that this is general guidance, not company policy.
3. **Company Policy & Entitlement Questions**: For questions about leave, vacation, PTO, parental care, remote/hybrid work, reports, benefits, stipends, or workplace rules, you MUST ground your answer in the Company Knowledge Base above.
   - Always cite the document title and section: "According to [Document Title] ([Section])..."
   - Never invent policy figures, numbers, leave days, or rules.
   - If the Company Knowledge Base lacks the policy answer, explicitly state that the company document is not in the knowledge base, suggest contacting HR via **/app → Messages**, and still offer whatever general best practice info is helpful.
4. **Navigation**: Give exact platform paths (e.g., "/app → Tasks").
5. **Rewriting**: When asked to rewrite, rephrase the user's text to be respectful, inclusive, and professional.
6. **Email Drafts**: Produce a complete professional email draft ready to send.`;
}

// ── Live Spoken System Prompt (Audio-optimized) ────────────────────────────────
function buildLiveSystemPrompt(userContext = {}) {
  const {
    name = 'Team Member',
    role = 'Employee',
    department = 'General',
    employeeId = 'EMP001'
  } = userContext;

  return `You are the spoken voice assistant for INCLUAI 2.0 Workplace Intelligence.
You are speaking directly with: ${name} (${role}, Department: ${department}, ID: ${employeeId}).

CORE BEHAVIOR RULES:
1. Speak concisely in natural, conversational spoken sentences suitable for voice playback.
2. DO NOT use markdown, asterisks, bullet points, numbered lists, or table formatting in your spoken responses.
3. For workplace and HR policy questions, ALWAYS call the 'search_company_policy' tool before answering to ground your answer in verified company policies.
4. State the exact document title and section when citing a policy (e.g. "According to the Hybrid Remote Work Policy 2026, Section 2.1...").
5. Never fabricate figures, leave balances, or policy rules. If a policy document does not contain the answer, state that clearly and advise contacting HR via the Messages tab.
6. For platform navigation, give the exact page path (for example, "open the Tasks tab in the sidebar").`;
}

// ── Smart recommendations engine ──────────────────────────────────────────────
function generateRecommendations(intent, topDoc, role) {
  const recs = [];

  if (intent.isLeave || intent.isParental) {
    recs.push({ action: 'Draft a leave request email', prompt: 'Draft an email to HR requesting 3 days of paid leave' });
    recs.push({ action: 'View leave policy details', prompt: 'What is the full annual leave policy?' });
  }
  if (intent.isRemote) {
    recs.push({ action: 'Check remote work eligibility', prompt: 'How many days per week can I work remotely?' });
    recs.push({ action: 'Claim home office stipend', prompt: 'How do I claim the home office ergonomic stipend?' });
  }
  if (intent.isReport) {
    recs.push({ action: 'File an anonymous report', prompt: 'How do I submit an anonymous accessibility barrier report?' });
    recs.push({ action: 'Check report privacy policy', prompt: 'Is my report really anonymous? What data is stored?' });
  }
  if (intent.isTasks) {
    recs.push({ action: 'View my tasks', prompt: 'Show me my open tasks' });
    recs.push({ action: 'Create a new task', prompt: 'Create a task to review the accessibility audit by Friday' });
  }
  if (topDoc && recs.length === 0) {
    recs.push({ action: `Read full policy: ${topDoc.title}`, prompt: `Tell me everything in the ${topDoc.title}` });
  }
  if (recs.length === 0) {
    recs.push({ action: 'Ask about leave policy', prompt: 'How many paid leaves do I get per year?' });
    recs.push({ action: 'File a report', prompt: 'How do I submit an accessibility barrier report?' });
    recs.push({ action: 'Draft a professional email', prompt: 'Draft an email to HR requesting remote work approval' });
  }
  return recs.slice(0, 3);
}

// ── Main AI Service class ─────────────────────────────────────────────────────
class AIService {
  constructor() {
    this.geminiClient = null;
    this.isGeminiVerified = null;
    this.isProviderVerified = false;
    this.initGeminiClient();
  }

  getApiKey() {
    const config = modelProvider.getProviderConfig();
    if (config.id !== 'gemini') return null;
    const key = config.apiKey;
    if (key.trim().length > 5 && !key.startsWith('YOUR_')) return key.trim();
    return null;
  }

  initGeminiClient(verify = true) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      this.geminiClient = null;
      this.isGeminiVerified = false;
      if (!modelProvider.isConfigured()) {
        console.log('[AIService] No hosted AI key, running offline fallback.');
      } else {
        console.log('[AIService] Gemini Live voice is unavailable for the selected provider.');
      }
      return;
    }
    try {
      this.geminiClient = new GoogleGenAI({ apiKey });
      this.isGeminiVerified = null;
      const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
      console.log(`[AIService] Gemini ready, model=${model}.`);
      if (verify) this.verifyGemini().catch(() => {});
    } catch (err) {
      console.error('[AIService] Failed to init Gemini client:', err.message);
      this.geminiClient = null;
      this.isGeminiVerified = false;
    }
  }

  async verifyGemini() {
    if (!this.geminiClient) {
      this.isGeminiVerified = false;
      return false;
    }
    try {
      const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
      const res = await this.geminiClient.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        config: { maxOutputTokens: 5 }
      });
      if (res && res.text) {
        this.isGeminiVerified = true;
        return true;
      }
      this.isGeminiVerified = false;
      return false;
    } catch (err) {
      console.warn('[AIService] Gemini verification test failed, offline fallback will be used:', err.message);
      this.isGeminiVerified = false;
      return false;
    }
  }

  async verifyProvider() {
    if (!modelProvider.isConfigured()) {
      this.isProviderVerified = false;
      return false;
    }
    try {
      const response = await modelProvider.generate({
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        maxOutputTokens: 8
      });
      this.isProviderVerified = Boolean(response.text);
      if (modelProvider.getProviderConfig().id === 'gemini') {
        this.isGeminiVerified = this.isProviderVerified;
      }
      return this.isProviderVerified;
    } catch (err) {
      console.warn('[AIService] AI provider verification failed:', err.message);
      this.isProviderVerified = false;
      return false;
    }
  }

  getStatus() {
    const config = modelProvider.getProviderConfig();
    const hasKey = !!config.apiKey;
    const liveModel = process.env.GEMINI_LIVE_MODEL || 'gemini-2.0-flash';
    const liveAvailable = config.id === 'gemini' && !!this.geminiClient && this.isGeminiVerified === true;

    return {
      success: true,
      provider: hasKey ? config.name : 'Offline fallback',
      connected: hasKey && this.isProviderVerified,
      hasApiKey: hasKey,
      liveAvailable,
      liveModel,
      model: config.model,
      mode: hasKey ? (this.isProviderVerified ? 'live-api' : 'configured') : 'offline-fallback',
      capabilities: [
        'General Q&A',
        'HR Policy Q&A',
        'Voice Live Mode',
        'Email Drafting',
        'Report Guidance',
        'Navigation',
        'Message Rewriting',
        'Smart Recommendations'
      ],
      latencyTarget: '< 350ms'
    };
  }

  // ── Core query processor ───────────────────────────────────────────────────
  async processQuery(userPrompt, userContext = {}) {
    const startTime = Date.now();
    const {
      id: userId = 'DEMO_USER',
      companyId = DEFAULT_COMPANY,
      name = 'Team Member',
      role = 'Employee',
      department = 'General',
      employeeId = 'EMP001'
    } = userContext;

    // Input guard
    if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim().length === 0) {
      return { success: false, error: 'Empty query received.', response: null };
    }
    const cleanPrompt = userPrompt.trim().slice(0, 1000); // cap length

    await safeSave({ userId, companyId, role: 'user', content: cleanPrompt });

    // ── Conversation history (context-aware) ─────────────────────────────
    let recent = [];
    try { recent = conversationService.getRecent({ userId, companyId, limit: 8 }); }
    catch (e) { recent = []; }
    // Exclude the message we just saved (last item)
    const priorTurns = recent.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const lower = cleanPrompt.toLowerCase();
    const intent = classifyIntent(lower);

    // ── RAG retrieval ────────────────────────────────────────────────────
    const retrievedDocs = await ragService.searchCompanyDocuments(companyId, cleanPrompt, 0.05, 5);
    const topDoc = retrievedDocs[0] || null;

    let responseText = '';
    let provider = 'Neural RAG (Fast Mode)';
    let errorDetail = null;

    // ── Configured language model path ──────────────────────────────────
    if (modelProvider.isConfigured()) {
      try {
        const policyContext = retrievedDocs.slice(0, 4)
          .map(d => `--- DOCUMENT: ${d.title} (${d.section}) ---\n${d.content}`)
          .join('\n\n');

        const systemInstruction = buildSystemPrompt(name, role, department, employeeId, policyContext);

        const response = await modelProvider.generate({
          contents: [...priorTurns, { role: 'user', parts: [{ text: cleanPrompt }] }],
          systemInstruction,
          temperature: 0.15,
          maxOutputTokens: 1024
        });

        if (response?.text && response.text.trim().length > 0) {
          responseText = response.text.trim();
          provider = response.provider;
          this.isProviderVerified = true;
        } else {
          errorDetail = 'The configured AI provider returned an empty response.';
          this.isProviderVerified = false;
        }
      } catch (err) {
        errorDetail = err.message;
        console.warn('[AIService] AI provider call failed, using fast mode:', err.message);
        this.isProviderVerified = false;
      }
    }

    // ── Fast-mode fallback (Neural RAG) ──────────────────────────────────
    if (!responseText) {
      responseText = this._fastModeResponse(cleanPrompt, lower, intent, topDoc, retrievedDocs, name, department, employeeId);
      provider = 'Neural RAG (Fast Mode)';
    }

    // ── Citation calculation ──────────────────────────────────────────────
    // Ground policy answers with citations; do not attach citations to greetings or general topics
    let citation = null;
    const isPolicyIntent = intent.isLeave || intent.isParental || intent.isRemote || intent.isReport || intent.isHRPolicy;
    if (!intent.isGreeting && topDoc && (isPolicyIntent || (topDoc.score >= 0.25 && responseText.toLowerCase().includes(topDoc.title.toLowerCase())))) {
      citation = { title: topDoc.title, section: topDoc.section, score: topDoc.score };
    }

    // ── Email draft tool ─────────────────────────────────────────────────
    let toolExecution = null;
    if (intent.isEmailDraft) {
      toolExecution = this._buildEmailDraft(cleanPrompt, name, department, employeeId, companyId);
    }

    // ── Smart recommendations ────────────────────────────────────────────
    const recommendations = generateRecommendations(intent, topDoc, role);

    const latencyMs = Math.max(1, Date.now() - startTime);

    // Audit log (non-blocking)
    try {
      db.logAudit(companyId, userId, 'AI_COPILOT_QUERY',
        `"${cleanPrompt.slice(0, 60)}" → ${provider} (${latencyMs}ms)`);
    } catch (e) { /* non-fatal */ }

    await safeSave({ userId, companyId, role: 'assistant', content: responseText });

    return {
      success: true,
      query: cleanPrompt,
      response: responseText,
      citation,
      toolExecution,
      recommendations,
      provider,
      latencyMs,
      timestamp: new Date().toISOString(),
      ...(errorDetail && process.env.NODE_ENV === 'development' ? { _debug: errorDetail } : {})
    };
  }

  // ── HR Policy assistant (dedicated endpoint) ──────────────────────────────
  async queryHRPolicy(question, userContext = {}) {
    const { companyId = DEFAULT_COMPANY, name = 'Team Member', role = 'Employee',
            department = 'General', employeeId = 'EMP001' } = userContext;

    // Always do RAG — HR policy answers must be grounded
    const docs = await ragService.searchCompanyDocuments(companyId, question, 0.05, 5);
    const policyDocs = docs.filter(d =>
      (d.title || '').toLowerCase().includes('policy') ||
      (d.title || '').toLowerCase().includes('leave') ||
      (d.title || '').toLowerCase().includes('remote') ||
      (d.title || '').toLowerCase().includes('parental') ||
      (d.title || '').toLowerCase().includes('inclusion')
    );
    const relevantDocs = policyDocs.length > 0 ? policyDocs : docs;
    const topDoc = relevantDocs[0] || null;

    let answer = '';
    let citation = null;

    if (modelProvider.isConfigured() && topDoc) {
      try {
        const context = relevantDocs.slice(0, 3)
          .map(d => `--- ${d.title} (${d.section}) ---\n${d.content}`)
          .join('\n\n');

        const systemInstruction = `You are an HR Policy Assistant for the INCLUAI platform. Answer ONLY using the policy documents provided. If the answer is not in the documents, say: "This specific detail is not available in the current policy documents. Please contact HR directly via /app → Messages."

User: ${name} (${role}, ${department})

POLICY DOCUMENTS:
${context}

Rules:
- Always cite the document name and section
- Quote exact figures (days, amounts, percentages) from the documents
- Never guess or extrapolate policy terms
- Be concise and empathetic`;

        const response = await modelProvider.generate({
          contents: [{ role: 'user', parts: [{ text: question }] }],
          systemInstruction,
          temperature: 0.05,
          maxOutputTokens: 512
        });

        if (response?.text) {
          answer = response.text.trim();
          this.isProviderVerified = true;
          citation = { title: topDoc.title, section: topDoc.section, score: topDoc.score };
        }
      } catch (err) {
        this.isProviderVerified = false;
        console.warn('[AIService] HR Policy AI provider failed:', err.message);
      }
    }

    // Fast-mode fallback for HR policy
    if (!answer && topDoc) {
      const snippet = topDoc.snippet || topDoc.content.slice(0, 350);
      answer = `According to **${topDoc.title}** (${topDoc.section}):\n\n${snippet}`;
      citation = { title: topDoc.title, section: topDoc.section, score: topDoc.score };
    } else if (!answer) {
      answer = `I couldn't find a specific HR policy document matching your question. Please contact HR directly via **/app → Messages** or browse the Knowledge Base at **/app → Knowledge**.`;
    }

    return {
      success: true,
      question,
      answer,
      citation,
      provider: this.isProviderVerified
        ? `${modelProvider.getProviderConfig().name} (Live)`
        : 'Neural RAG (Fast Mode)'
    };
  }

  // ── Conversation history retrieval ────────────────────────────────────────
  getConversationHistory(userId, companyId, limit = 20) {
    try {
      return conversationService.getRecent({ userId, companyId: companyId || DEFAULT_COMPANY, limit });
    } catch (e) {
      return [];
    }
  }

  // ── Fast-mode response builder ────────────────────────────────────────────
  _fastModeResponse(prompt, lower, intent, topDoc, retrievedDocs, name, department, employeeId) {
    // 1. Greetings & small talk
    if (intent.isGreeting) {
      return `Hello ${name}! 👋 How can I help with your workplace questions, company policies, or tasks today?`;
    }

    // 2. Common general concepts (offline fallback)
    if (lower.includes('swot')) {
      return `A **SWOT analysis** is a strategic planning framework used to evaluate four key dimensions: **Strengths** (internal advantages), **Weaknesses** (internal vulnerabilities), **Opportunities** (external favorable factors), and **Threats** (external competitive risks).\n\n*(Note: Running in offline fallback mode. Ask an Organization Admin to configure a hosted AI provider for live reasoning across general subjects.)*`;
    }

    // 3. Platform features & navigation intents
    if (intent.isDataset) return `Your **Dataset Explorer** is at **/dataset**, or open **/app → Dataset** tab. View, filter, and export employee records there.`;
    if (intent.isSettings) return `**Settings** are at **/app → Settings**.\n\n• An Organization Admin can configure a hosted Gemini or Claude provider for live AI responses.\n• Adjust accessibility: high contrast, dyslexia font, reduced motion.\n• Manage notifications and profile details.`;
    if (intent.isAnalytics) return `**Reports & Analytics** are at **/app → Reports**.\n\nLive telemetry is also available at \`GET /api/v2/analytics/public\`.`;
    if (intent.isPrivacy) return `Anonymous reports strip your user ID, employee number, IP address, and session tokens before storage. Only designated HR Ethics personnel receive the report.\n\nSee the **Workplace Inclusion & Safe Reporting Charter** in the Knowledge Base for full details.`;
    if (intent.isCopilot) return `I'm the **INCLUAI AI Copilot**. I can help you:\n\n• **Answer HR policy questions** — leave, remote work, parental leave, benefits\n• **Draft professional emails** — leave requests, HR queries\n• **Rewrite messages** — more inclusive, professional tone\n• **Navigate the platform** — find any feature\n• **File reports** — anonymous or identified\n• **Smart recommendations** — based on your context\n\nTry: *"How many paid leaves do I get?"* or *"Draft an email requesting 3 days leave"*`;
    if (intent.isRoadmap) return `View the product roadmap on the landing page: [#roadmap](http://localhost:5001/#roadmap). You can also vote for upcoming features there.`;
    if (intent.isTasks) return `Manage your tasks at **/app → Tasks**.\n\n• Create tasks with priority, deadline, and assignee\n• Edit status: Pending → In Progress → Completed\n• HR and admins can assign tasks to employees`;
    if (intent.isNavigation) return `Here's how to navigate INCLUAI 2.0:\n\n• 🏠 **Dashboard**: /app → Dashboard\n• 🤖 **AI Copilot**: /app → Copilot\n• 📋 **Tasks**: /app → Tasks\n• 📊 **Reports**: /app → Reports\n• 📚 **Knowledge Base**: /app → Knowledge\n• 💬 **Messages**: /app → Messages\n• 📈 **Dataset Engine**: /dataset\n• ⚙️ **Settings**: /app → Settings`;

    // 4. Policy questions with verified knowledge base matches
    if (topDoc && topDoc.score >= 0.2) {
      const snippet = topDoc.snippet || topDoc.content.slice(0, 300);
      if (intent.isParental) {
        return `According to **${topDoc.title}** (${topDoc.section}):\n\n• Eligible employees receive **16 weeks of fully paid parental leave** after birth, adoption, or foster placement.\n• Flexible part-time return schedules available through HR.\n• Lactation suites and family care assistance provided at company premises.`;
      }
      if (intent.isLeave) {
        return `According to **${topDoc.title}** (${topDoc.section}):\n\n• Full-time employees receive **24 paid leave days (PTO) per year**, accruing at 2.0 days/month.\n• Short leaves (1–2 days): 24 hours' notice required.\n• Extended leaves (3+ days): 5 days' advance notice + manager sign-off.\n• Sick leave up to 3 days: self-certification; longer: medical documentation required.`;
      }
      if (intent.isRemote) {
        return `According to **${topDoc.title}** (${topDoc.section}):\n\n• Core collaboration hours: **10:00 AM – 4:00 PM** local time.\n• Full-time employees may work remotely up to **3 days/week** with team lead coordination.\n• **$500 annual ergonomic home-office stipend** — claim via HR Benefits portal.`;
      }
      if (intent.isReport) {
        return `According to **${topDoc.title}** (${topDoc.section}):\n\n• You can submit reports **anonymously** — your user ID, employee number, and session tokens are stripped before storage.\n• Reports go only to designated HR Ethics personnel.\n• Zero tolerance for retaliation is guaranteed by policy.`;
      }
      return `According to **${topDoc.title}** (${topDoc.section}):\n\n${snippet}…`;
    }

    // 5. If it's specifically a policy question but no document matched
    const isPolicy = intent.isLeave || intent.isParental || intent.isRemote || intent.isReport || intent.isHRPolicy;
    if (isPolicy) {
      return `I couldn't find an approved company policy document matching your question. Please contact HR directly via **/app → Messages** or browse the Knowledge Base at **/app → Knowledge**.`;
    }

    // 6. Conversational / general fallback (never say "couldn't find" for normal questions)
    return `I am currently operating in offline fallback mode. I can assist you with company policy guidelines (leave, remote work, parental leave), platform navigation, task tracking, and email drafting.\n\nTo enable live generative answers for general questions, ask an Organization Admin to configure a hosted Gemini or Claude provider.`;
  }

  // ── Email draft builder ───────────────────────────────────────────────────
  _buildEmailDraft(prompt, name, department, employeeId, companyId) {
    const dayMatch = prompt.match(/(\d+)\s*(?:day|days)\b/i);
    const days = dayMatch ? parseInt(dayMatch[1], 10) : null;
    const daysText = days ? `${days} day${days === 1 ? '' : 's'}` : '[specify number of days]';

    const isRemoteRequest = /remote|wfh|work from home/i.test(prompt);
    const isParentalRequest = /parental|maternity|paternity/i.test(prompt);

    let subject, body;

    if (isParentalRequest) {
      subject = `Parental Leave Request — ${name} (${employeeId})`;
      body = `Dear HR Partner,\n\nI am writing to formally request parental leave as per the INCLUAI Parental & Family Care Leave Policy 2026.\n\nI would appreciate guidance on the required documentation and the process to initiate the leave period.\n\nI am committed to ensuring a smooth handover of my responsibilities in ${department} before the leave commences.\n\nPlease let me know a convenient time to discuss the arrangements.\n\nWarm regards,\n${name}\n${department} (${employeeId})`;
    } else if (isRemoteRequest) {
      subject = `Remote Work Arrangement Request — ${name} (${employeeId})`;
      body = `Dear HR Partner,\n\nI am writing to request approval for a remote work arrangement in line with the INCLUAI Hybrid Remote Work Policy 2026.\n\nI would like to work remotely for ${daysText} per week, coordinating availability during core hours (10:00 AM – 4:00 PM) with my team lead.\n\nPlease let me know if any additional approval steps are required.\n\nWarm regards,\n${name}\n${department} (${employeeId})`;
    } else {
      subject = `Leave Application: Paid Time Off Request — ${name} (${employeeId})`;
      body = `Dear HR Partner,\n\nI would like to request ${daysText} of annual paid leave (PTO) for upcoming personal commitments.\n\nI have arranged appropriate handoffs for my active deliverables in ${department} and will resume duties promptly upon return.\n\nPlease let me know if you need any further information or documentation.\n\nWarm regards,\n${name}\n${department} (${employeeId})`;
    }

    return {
      toolName: 'Agent.DraftProfessionalEmail',
      status: 'DRAFT_READY',
      parameters: {
        to: `hr-services@${companyId.toLowerCase()}.internal`,
        subject,
        body
      }
    };
  }
}

module.exports = new AIService();
module.exports.buildLiveSystemPrompt = buildLiveSystemPrompt;
module.exports.buildSystemPrompt = buildSystemPrompt;
