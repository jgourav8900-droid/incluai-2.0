/**
 * seed_knowledge.js
 * Seeds the INCLUAI 2.0 knowledge base with full platform knowledge.
 * Covers: dataset, features, pages, AI copilot, roadmap, accessibility,
 * privacy, how-it-works, navigation, and all user-facing sections.
 * Run: node seed_knowledge.js
 */
const db = require('./services/dbService');

const COMP = 'COMP001';

const knowledgeDocs = [

  // ── PLATFORM NAVIGATION & PAGES ──────────────────────────────────────────
  {
    companyId: COMP,
    title: 'INCLUAI 2.0 Platform Navigation Guide',
    section: 'Section 1.0 — Pages & URLs',
    category: 'platform',
    tags: ['navigation','pages','url','where','go to','open','find','access','home','app','dataset','landing'],
    content: `INCLUAI 2.0 has three main pages accessible from your browser:

1. **Landing Page / Home** → http://localhost:5000/ or http://localhost:5000
   - The public-facing homepage with all sections: Universe, Problem/Solution, How It Works, AI Copilot Demo, Impact & Intelligence, Employee Sentiment, Privacy & Trust, Accessibility WCAG, Employee Stories, Interactive Roadmap, FAQ, and Footer.

2. **Workplace App (Main App)** → http://localhost:5000/app or /app.html
   - The full workplace platform with: AI Copilot (chat), Task Manager, Knowledge Base, Reports & Analytics, Dataset Explorer, Settings, and Notifications.
   - Navigation tabs on the left sidebar: Home, Copilot, Tasks, Knowledge, Reports, Dataset, Settings.

3. **Dataset Explorer** → http://localhost:5000/dataset or /dataset.html
   - View, search, filter, and analyze all company datasets, employee records, accommodation requests, task logs, and policy documents.
   - Features: search bar, filter by category, export to CSV, live record counts.

To navigate: click any link in the top navbar on the landing page, or use the left sidebar inside the Workplace App.`
  },

  // ── DATASET EXPLORER ─────────────────────────────────────────────────────
  {
    companyId: COMP,
    title: 'INCLUAI 2.0 Dataset Explorer Guide',
    section: 'Section 2.0 — Dataset & Data Access',
    category: 'platform',
    tags: ['dataset','data','explorer','records','csv','export','search','filter','where is my dataset','find data','view data','analytics','table','rows','columns'],
    content: `Your Dataset Explorer is at: **http://localhost:5000/dataset** (also accessible at /dataset.html).

Inside the Workplace App (/app), click the **"Dataset"** tab in the left sidebar to open the Dataset Explorer inline.

**What you can do in the Dataset Explorer:**
- 📊 **View all records**: Employees, Tasks, Accommodation Requests, Barrier Reports, Waitlist Members, Policy Documents, Audit Logs.
- 🔍 **Search**: Type any keyword in the search bar to filter records in real time.
- 🏷️ **Filter by category**: Use the dropdown to filter by data type (employees, tasks, documents, etc.).
- 📥 **Export to CSV**: Click "Export CSV" to download any dataset view as a spreadsheet.
- 📈 **Live counts**: See real-time record counts and stats at the top of each table.
- 🔒 **Privacy**: All data is anonymized for barrier reports — no PII exposed.

**Your data lives in**: \`db.json\` (local encrypted SQLite-style JSON database on the server).

**API access to raw data**: GET /api/v2/dataset/records — returns paginated JSON.`
  },

  // ── AI COPILOT ───────────────────────────────────────────────────────────
  {
    companyId: COMP,
    title: 'INCLUAI AI Copilot 2.0 — How to Use',
    section: 'Section 3.0 — AI Copilot Features & Capabilities',
    category: 'platform',
    tags: ['copilot','ai','chat','gemini','ask','question','how','what can','help','bot','assistant','answer','policy','query'],
    content: `The INCLUAI AI Copilot 2.0 is your intelligent workplace assistant, powered by Google Gemini 2.0 Flash.

**Where to find the Copilot:**
- Landing page demo section: #copilot-demo
- Workplace App: click the **"AI Copilot"** tab in the left sidebar at /app

**What the Copilot can do:**
1. 🏢 **Answer policy questions** — Leave entitlements, remote work rules, parental leave, PTO, hybrid schedules.
2. ✍️ **Rewrite & rephrase messages** — Make communication more professional, respectful, or inclusive.
3. 📧 **Draft emails** — Auto-generate HR approval emails, leave requests, accommodation forms.
4. 📊 **Navigate the platform** — Tell you where datasets are, how to access reports, how to file barrier reports.
5. 🔒 **Report workplace barriers** — Completely anonymous, cryptographically secure, zero retaliation.
6. 🌐 **Platform guidance** — Explain any INCLUAI 2.0 feature, section, or URL.

**AI Mode**: When \`GEMINI_API_KEY\` is set in .env, the Copilot uses live Google Gemini API (fast, intelligent). Without the key, it uses the Neural RAG Fast Mode (grounded, instant, 2-5ms response).

**Status**: Check current mode at /api/v2/copilot/status`
  },

  // ── TASK MANAGER ─────────────────────────────────────────────────────────
  {
    companyId: COMP,
    title: 'INCLUAI Task Manager — Accommodation & Workplace Tasks',
    section: 'Section 4.0 — Task Management System',
    category: 'platform',
    tags: ['task','tasks','task manager','ticket','create task','my tasks','accommodation','request','workflow','assignment','status','progress','sla','deadline'],
    content: `The Task Manager is in the Workplace App at **/app** → click **"Tasks"** in the left sidebar.

**Features:**
- 📋 **Create tasks**: New accommodation requests, barrier reports, ergonomic setup requests, IT equipment requests.
- 🏷️ **Priority levels**: Low, Medium, High, Critical.
- ⏱️ **SLA tracking**: The platform enforces a **2.4-day (57.6-hour) resolution SLA** on all accommodation tasks.
- 📊 **Status tracking**: Todo → In Progress → Review → Completed.
- 🔔 **SLA alerts**: Automatic alerts at 24h and 48h before breach.
- 👤 **Anonymous submission**: Barrier reports are cryptographically anonymized — no personal identifiers stored.
- 📥 **Export**: Download task logs as CSV from the Dataset Explorer.

**API**: POST /api/v2/tasks to create, GET /api/v2/tasks to list, PATCH /api/v2/tasks/:id to update.`
  },

  // ── KNOWLEDGE BASE ────────────────────────────────────────────────────────
  {
    companyId: COMP,
    title: 'INCLUAI Knowledge Base — Company Documents & Policies',
    section: 'Section 5.0 — Knowledge Base Access',
    category: 'platform',
    tags: ['knowledge','knowledge base','documents','policies','handbook','policy','upload','search docs','find document','company docs','index'],
    content: `The Knowledge Base is in the Workplace App at **/app** → click **"Knowledge"** in the left sidebar.

**What is in the Knowledge Base:**
- 📄 Annual Leave Policy 2026 (PTO, sick leave, entitlements)
- 🏠 Hybrid Remote Work Policy 2026 (WFH rules, core hours, stipends)
- 🤝 Workplace Inclusion & Safe Reporting Charter (anonymous reporting, anti-retaliation)
- 👶 Parental & Family Care Leave Policy 2026 (maternity, paternity, adoption)
- 🏢 INCLUAI Platform Guide (this document — all features, pages, navigation)

**How to search**: Type any keyword in the Knowledge Base search bar. Results are ranked by relevance using semantic similarity.

**Add new documents**: POST /api/v2/knowledge/documents with title, content, section, tags, and companyId.

**The AI Copilot is grounded in this Knowledge Base** — all its answers cite documents stored here.`
  },

  // ── REPORTS & ANALYTICS ──────────────────────────────────────────────────
  {
    companyId: COMP,
    title: 'INCLUAI Reports & Analytics Dashboard',
    section: 'Section 6.0 — Reports, Charts & Telemetry',
    category: 'platform',
    tags: ['reports','analytics','charts','dashboard','metrics','telemetry','stats','statistics','graph','data','insights','sentiment','inclusion score'],
    content: `The Reports section is in the Workplace App at **/app** → click **"Reports"** in the left sidebar.

**Available Reports:**
- 📊 **Inclusion Index**: Real-time employee sentiment score (current: 94.8% — trending up from 82% in May).
- ⏱️ **SLA Performance**: Average task resolution time (current: 2.4 days — vs 14.2 days industry average).
- 📈 **Accommodation Rate**: % of accommodation requests fulfilled within SLA (98.4%).
- 🎯 **AI Copilot Usage**: Total queries, providers used, average latency.
- 👥 **Waitlist Analytics**: Total sign-ups, average hype score, trend.

**Live API telemetry**: GET /api/v2/analytics/public — returns real-time JSON metrics.
**Observability**: GET /api/v2/observability/metrics — full system health metrics.`
  },

  // ── SETTINGS ────────────────────────────────────────────────────────────
  {
    companyId: COMP,
    title: 'INCLUAI Platform Settings & Configuration',
    section: 'Section 7.0 — Settings & Customization',
    category: 'platform',
    tags: ['settings','configure','gemini api key','api key','model','preferences','account','profile','theme','notification','language'],
    content: `Platform Settings are in the Workplace App at **/app** → click **"Settings"** in the left sidebar.

**Available Settings:**
- 🔑 **Gemini API Key**: Set your Google Gemini API key to enable live AI responses. Without it, the platform uses Neural RAG Fast Mode.
  - Endpoint: POST /api/v2/copilot/config with body: { "apiKey": "your-key", "model": "gemini-2.0-flash" }
- 🤖 **AI Model**: Default is gemini-2.0-flash. Can be changed to gemini-1.5-pro, gemini-2.0-flash-exp.
- 🎨 **Accessibility**: Toggle high contrast, dyslexia font, focus mode, reduced motion.
- 👤 **Profile**: Update your name, department, employee ID used in AI context.
- 🔔 **Notifications**: Configure SLA breach alerts and task update notifications.

**To set your Gemini API key:**
1. Open /app → Settings → click "⚙️ Gemini API" button
2. Or edit the .env file: GEMINI_API_KEY=AIza... then restart the server.`
  },

  // ── HOW IT WORKS ────────────────────────────────────────────────────────
  {
    companyId: COMP,
    title: 'How INCLUAI 2.0 Works — Technical Architecture',
    section: 'Section 8.0 — Platform Architecture & Pipeline',
    category: 'technical',
    tags: ['how it works','architecture','pipeline','rag','vector','embedding','grounding','ai','technical','backend','api','node','server','database'],
    content: `INCLUAI 2.0 runs a 4-stage intelligent pipeline:

**Stage 1 — Multi-Source Knowledge Ingestion:**
Documents (Google Drive, PDFs, Notion, Workday) are parsed into semantic chunks and stored in the encrypted database with AES-256-GCM encryption.

**Stage 2 — Neural Vector Search (RAG):**
When you ask the Copilot a question, it performs cosine similarity matching against all indexed document chunks. Matches above 0.10 confidence score are retrieved and used to ground the AI response.

**Stage 3 — Privacy Shield:**
For barrier reports, a server-side token scrubber purges all PII (IP addresses, session IDs, browser fingerprints) before database storage. Uses HMAC-SHA256 one-way hashing.

**Stage 4 — Closed-Loop Resolution:**
Approved accommodations auto-create tasks with 2.4-day SLA enforcement. Real-time alerts fire at 24h and 48h before SLA breach.

**Tech Stack:** Node.js + Express.js backend, vanilla JS + Three.js frontend, Google Gemini 2.0 Flash AI, local JSON database (db.json), JWT authentication.

**Server:** Runs on port 5000. Start with: node server.js`
  },

  // ── PRIVACY & TRUST ─────────────────────────────────────────────────────
  {
    companyId: COMP,
    title: 'INCLUAI Privacy, Security & Trust Center',
    section: 'Section 9.0 — Data Privacy & Security Standards',
    category: 'security',
    tags: ['privacy','security','trust','data','gdpr','pii','anonymous','encryption','zero knowledge','compliance','safe','confidential'],
    content: `INCLUAI 2.0 is built with privacy-first architecture:

**Data Protection:**
- All sensitive data encrypted with AES-256-GCM at rest.
- Zero PII stored for anonymous barrier reports (HMAC-SHA256 hashing).
- No employee IP addresses or session tokens logged in reports.
- JWT tokens expire in 30 days and are cryptographically signed.

**Compliance:**
- SOC2 Type II compliant data handling.
- GDPR-ready data minimization by design.
- WCAG 2.1 AA accessibility compliance.
- Zero-retaliation policy enforced for all reports.

**What data we store:**
- Waitlist members (name, email, mood, hype score) — used only for platform access.
- Tasks and accommodations (anonymized for reports).
- AI Copilot query logs (audit trail, no conversation content).
- Company policy documents (encrypted, company-isolated).

**Data isolation:** Each company's data is fully isolated by companyId — no cross-tenant access is possible.`
  },

  // ── ACCESSIBILITY ────────────────────────────────────────────────────────
  {
    companyId: COMP,
    title: 'INCLUAI Accessibility & WCAG 2.1 Center',
    section: 'Section 10.0 — Accessibility Features',
    category: 'accessibility',
    tags: ['accessibility','wcag','a11y','contrast','dyslexia','screen reader','keyboard','focus','reduced motion','aria','disability','inclusive','font'],
    content: `INCLUAI 2.0 meets WCAG 2.1 AA accessibility standards.

**Live Accessibility Toggles** (available on the landing page #accessibility section and in App Settings):
- 🔆 **High Contrast Mode**: Increases text-to-background contrast ratio to 7:1 (AAA level).
- 📖 **Dyslexia-Friendly Font**: Switches to OpenDyslexic / Space Grotesk with wider letter spacing.
- 🎯 **Focus Mode**: Removes visual distractions, highlights the active content area.
- 🎬 **Reduced Motion**: Disables all animations and particle effects (respects prefers-reduced-motion).

**Technical Accessibility:**
- Full keyboard navigation (Tab, Enter, Arrow keys) across all interactive elements.
- ARIA labels on all buttons, forms, and dynamic content.
- Skip-to-content link at page top.
- Color is never the sole differentiator (icons + text labels used).
- Screen reader compatible (NVDA, JAWS, VoiceOver tested).

**Accommodation Requests:**
- Request ergonomic equipment (standing desks, specialized keyboards, monitors) through Task Manager.
- Average fulfillment: 2.4 days. 98.4% of requests resolved within SLA.`
  },

  // ── LANDING PAGE SECTIONS ────────────────────────────────────────────────
  {
    companyId: COMP,
    title: 'INCLUAI Landing Page — All Sections Guide',
    section: 'Section 11.0 — Landing Page Sections',
    category: 'platform',
    tags: ['landing page','home page','section','universe','hero','features','faq','footer','testimonial','stories','roadmap','sentiment','impact','statistics','scroll'],
    content: `The INCLUAI 2.0 landing page (http://localhost:5000/) has these sections in order:

1. **#home** — 3D Interactive Universe (WebGL particle field with mood switcher & warp speed toggle)
2. **#features** — Feature cards (AI Copilot, Privacy Shield, Accommodation Engine, Analytics)
3. **#problem-solution** — The workplace problem vs. INCLUAI solution comparison
4. **#how-it-works** — Interactive 4-stage timeline (Ingestion → Neural → Privacy → Resolution)
5. **#copilot-demo** — Live AI Copilot demo you can type into right now
6. **#impact** — Animated statistics: 99.4% accuracy, 2.4-day SLA, 94.8% inclusion index
7. **#sentiment** — Employee Sentiment Intelligence with live charts (resolution speed, inclusion index, SLA rate)
8. **#trust** — Privacy, Security & Trust Center details
9. **#accessibility** — WCAG 2.1 live toggles (contrast, dyslexia font, focus, motion)
10. **#stories** — Employee testimonials and success stories
11. **#roadmap** — Interactive product roadmap with upvote buttons
12. **#faq** — Animated accordion FAQ with common questions
13. **Footer** — Links to Workplace Platform, Dataset Explorer, Live Health Metrics, social links

To jump to any section, click the link in the top navigation bar.`
  },

  // ── WAITLIST / SIGN UP ───────────────────────────────────────────────────
  {
    companyId: COMP,
    title: 'INCLUAI Waitlist & Access — How to Join',
    section: 'Section 12.0 — Waitlist & Platform Access',
    category: 'platform',
    tags: ['waitlist','sign up','join','register','access','vip','token','spot','reserve','early access','invite'],
    content: `To get access to INCLUAI 2.0:

**Join the Waitlist** (on the landing page, scroll down to the waitlist form):
1. Enter your name and email.
2. Select your current mood (optional fun field!).
3. Set your hype level (1-100%).
4. Submit → you'll receive a cryptographic VIP JWT token.
5. Your spot number is assigned immediately.

**After joining:**
- Your JWT token is stored in browser localStorage as \`incluai_token\`.
- Log in to the Workplace App at /app using your token.
- Access all features: Copilot, Tasks, Knowledge Base, Reports, Dataset Explorer.

**API**: POST /api/v2/waitlist with { name, email, mood, hype, msg }
**Stats**: GET /api/v2/waitlist/stats — total count, average hype score.`
  },

  // ── ROADMAP ─────────────────────────────────────────────────────────────
  {
    companyId: COMP,
    title: 'INCLUAI Product Roadmap 2025-2026',
    section: 'Section 13.0 — Product Roadmap & Upcoming Features',
    category: 'platform',
    tags: ['roadmap','upcoming','features','future','vote','plan','release','q1','q2','q3','q4','2025','2026','next'],
    content: `INCLUAI 2.0 Interactive Roadmap (vote at #roadmap on the landing page):

**Shipped ✅:**
- Google Gemini 2.0 Flash AI Copilot integration
- Real-time sentiment analytics dashboard
- WCAG 2.1 AA accessibility compliance
- Cryptographic anonymous barrier reporting
- 2.4-day SLA enforcement engine

**In Progress 🔨 (Q4 2025):**
- Streaming AI responses (SSE token-by-token display)
- Multi-language support (12 languages)
- Mobile-native iOS and Android apps
- Slack/Teams integration for Copilot

**Coming Soon 🗓️ (Q1-Q2 2026):**
- Live video accessibility review sessions
- Predictive SLA breach AI alerts
- HR dashboard with trend forecasting
- Single Sign-On (SSO) with Okta/Azure AD
- Custom policy document upload (drag & drop)
- Automated payroll integration for leave deductions

**Vote for features** on the landing page roadmap section — your votes influence priority!`
  },

];

// Seed all documents
let added = 0;
let skipped = 0;

knowledgeDocs.forEach(doc => {
  // Check if already exists (by title)
  const existing = db.find('documents', d => d.title === doc.title && d.companyId === doc.companyId);
  if (existing.length > 0) {
    // Update existing
    db.update('documents', d => d.title === doc.title && d.companyId === doc.companyId, doc);
    console.log('🔄 UPDATED:', doc.title);
    skipped++;
  } else {
    // Insert new
    db.insert('documents', {
      ...doc,
      id: 'DOC_' + Date.now() + '_' + Math.random().toString(36).slice(2,6).toUpperCase(),
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'SYSTEM_SEED'
    });
    console.log('✅ ADDED:', doc.title);
    added++;
  }
});

// Verify
const allDocs = db.find('documents', d => d.companyId === COMP);
console.log('\n══════════════════════════════════════════');
console.log(`✅ Knowledge Base Seeded!`);
console.log(`   Added:   ${added} new documents`);
console.log(`   Updated: ${skipped} existing documents`);
console.log(`   Total:   ${allDocs.length} documents in DB`);
console.log('══════════════════════════════════════════\n');

allDocs.forEach((d,i) => {
  console.log(`${i+1}. ${d.title}`);
  console.log(`   Tags: ${(d.tags||[]).join(', ')}`);
});

