process.env.NODE_ENV = 'test';
const cleanupTestData = require('./testData').createTestData();
const crypto = require('crypto');
const db = require('../services/dbService');
const app = require('../server');
const http = require('http');

let server;
const PORT = 5098;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json'
    };
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING INCLUAI 2.0 EXTENDED INTEGRATION TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await request('GET', '/api/v2/observability/health');
    assert(health.status === 200 && health.body.status === 'UP', 'Health check returns 200 UP');

    // 2. Sign Up validation (Password mismatch)
    const badSignup = await request('POST', '/api/v2/auth/signup', {
      name: 'Test User',
      email: 'test@comp001.internal',
      companyName: 'Acme',
      password: 'password123',
      confirmPassword: 'different_password'
    });
    assert(badSignup.status === 400, 'Sign up rejects mismatched passwords with 400');

    // 3. Sign Up functional test
    const uniqueEmail = `user_${Date.now()}@testcorp.com`;
    const goodSignup = await request('POST', '/api/v2/auth/signup', {
      name: 'Jane Doe',
      email: uniqueEmail,
      companyName: 'Test Corp',
      password: 'securePassword123',
      confirmPassword: 'securePassword123',
      role: 'Employee'
    });
    assert(goodSignup.status === 201 && goodSignup.body.token, 'Sign up creates new account and returns JWT token');
    const newUserToken = goodSignup.body.token;

    // 4. Duplicate Sign Up prevention
    const dupSignup = await request('POST', '/api/v2/auth/signup', {
      name: 'Jane Doe 2',
      email: uniqueEmail,
      companyName: 'Test Corp',
      password: 'securePassword123'
    });
    assert(dupSignup.status === 409, 'Sign up rejects duplicate email with 409 Conflict');

    // 5. Existing PBKDF2 accounts remain usable and upgrade after a valid login.
    db.update('users', u => u.email === 'emp@comp001.internal', u => ({
      ...u,
      passwordHash: crypto.pbkdf2Sync('password123', 'incluai_default_salt_2026', 1000, 64, 'sha512').toString('hex')
    }));
    const loginRes = await request('POST', '/api/v2/auth/login', {
      email: 'emp@comp001.internal',
      password: 'password123'
    });
    assert(
      loginRes.status === 200 && loginRes.body.token &&
      db.findOne('users', u => u.email === 'emp@comp001.internal').passwordHash.startsWith('scrypt$'),
      'Employee login upgrades the legacy password hash'
    );
    const empToken = loginRes.body.token;

    const hrLoginRes = await request('POST', '/api/v2/auth/login', {
      email: 'hr@comp001.internal',
      password: 'password123'
    });
    const hrToken = hrLoginRes.body.token;
    assert(hrLoginRes.status === 200 && hrToken, 'HR admin login succeeds');

    // Dataset is private and limited to HR/admin; never fall back to a public data file.
    const publicDatasetRes = await request('GET', '/api/v2/dataset');
    const employeeDatasetRes = await request('GET', '/api/v2/dataset', null, empToken);
    const hrDatasetRes = await request('GET', '/api/v2/dataset?limit=all', null, hrToken);
    const exposedDbRes = await request('GET', '/data/db.json');
    const exposedSourceRes = await request('GET', '/server.js');
    assert(publicDatasetRes.status === 401, 'Dataset API rejects unauthenticated reads');
    assert(employeeDatasetRes.status === 403, 'Dataset API restricts employee reads to HR/admin');
    assert(hrDatasetRes.status === 200 && hrDatasetRes.body.total === 2, 'Authorized HR access returns dataset records');
    assert(exposedDbRes.status === 404 && exposedSourceRes.status === 404, 'Static server does not expose database or source files');
    const unauthorizedDatasetWrite = await request('POST', '/api/v2/dataset', {
      Education: 'Bachelors', JoiningYear: 2020, City: 'Bangalore', PaymentTier: 3,
      Age: 30, Gender: 'Female', EverBenched: 'No',
      ExperienceInCurrentDomain: 5, LeaveOrNot: 0
    }, empToken);
    assert(unauthorizedDatasetWrite.status === 403, 'Dataset API rejects employee writes');
    const invalidDatasetWrite = await request('POST', '/api/v2/dataset', {
      Education: 'Bachelors', JoiningYear: 2020, City: 'Bangalore', PaymentTier: 9,
      Age: 30, Gender: 'Female', EverBenched: 'No',
      ExperienceInCurrentDomain: 5, LeaveOrNot: 0
    }, hrToken);
    assert(invalidDatasetWrite.status === 400, 'Dataset API validates record field bounds');
    const disabledPrediction = await request('POST', '/api/v2/dataset/predict', {
      Gender: 'Female', Age: 30
    }, hrToken);
    assert(disabledPrediction.status === 410, 'Individual attrition predictions are disabled');

    // 6. Dashboard Analytics endpoint
    const dashRes = await request('GET', '/api/v2/analytics/dashboard', null, empToken);
    assert(
      dashRes.status === 200 && 
      dashRes.body.metrics && 
      dashRes.body.charts.taskTrends.length > 0,
      'Dashboard analytics returns valid metrics and chart trends'
    );

    // 7. Task Creation
    const newTaskRes = await request('POST', '/api/v2/tasks', {
      title: 'Audit Conference Room B ramps',
      description: 'Check slope and handrail compliance',
      priority: 'High',
      deadline: '2026-11-05'
    }, empToken);
    assert(newTaskRes.status === 201 && newTaskRes.body.task.id, 'Task creation saves task persistently');
    const taskId = newTaskRes.body.task.id;

    // 8. Task Status Update
    const updateTaskRes = await request('PUT', `/api/v2/tasks/${taskId}`, {
      status: 'Completed'
    }, empToken);
    assert(updateTaskRes.status === 200 && updateTaskRes.body.task.status === 'Completed', 'Task status update marks task Completed');

    // 9. Task Deletion
    const deleteTaskRes = await request('DELETE', `/api/v2/tasks/${taskId}`, null, empToken);
    assert(deleteTaskRes.status === 200, 'Task deletion removes task');

    // 10. AI Copilot Chat with RAG grounding
    const copilotRes = await request('POST', '/api/v2/copilot/chat', {
      message: 'What is the company hybrid remote work policy?'
    }, empToken);
    assert(
      copilotRes.status === 200 && 
      copilotRes.body.citation && 
      copilotRes.body.citation.title.includes('Remote Work Policy'),
      'AI Copilot grounds answer in Hybrid Remote Work Policy'
    );

    // 11. Reports CSV Export
    const exportRes = await request('GET', '/api/v2/reports/export?format=csv', null, empToken);
    assert(exportRes.status === 200 && typeof exportRes.body === 'string' && exportRes.body.includes('ReportID'), 'Reports export generates valid CSV data');

    // 12. Settings Preferences Update
    const settingsRes = await request('PUT', '/api/v2/settings', {
      theme: 'dark',
      language: 'English',
      emailNotifications: true
    }, empToken);
    assert(settingsRes.status === 200 && settingsRes.body.preferences.emailNotifications === true, 'Settings preferences saved successfully');

    // 13. Waitlist Reservation & JWT Token Issuance
    const waitlistRes = await request('POST', '/api/v2/waitlist', {
      name: 'Taylor Swift',
      email: `early_${Date.now()}@realfeels.internal`,
      mood: 'soft but unbothered',
      hype: 92,
      msg: 'Need this space desperately'
    });
    assert(
      waitlistRes.status === 201 &&
      !waitlistRes.body.token &&
      waitlistRes.body.member.spotNumber >= 249,
      'Waitlist signup saves an early-access reservation without issuing a workplace token'
    );

    // 14. Waitlist Public Stats Telemetry
    const statsRes = await request('GET', '/api/v2/waitlist/stats');
    assert(
      statsRes.status === 200 && 
      statsRes.body.totalCount >= 249 && 
      statsRes.body.averageHype > 0,
      'Waitlist public stats endpoint returns live collective vibe telemetry'
    );

    // 15. Waitlist Duplicate Email Handling
    const duplicateWaitlistRes = await request('POST', '/api/v2/waitlist', {
      name: 'Taylor Swift',
      email: waitlistRes.body.member.email,
      mood: 'soft but unbothered',
      hype: 95
    });
    assert(
      duplicateWaitlistRes.status === 200 && 
      duplicateWaitlistRes.body.alreadyRegistered === true && 
      !duplicateWaitlistRes.body.token,
      'Waitlist duplicate lookup does not disclose a stored access token'
    );

    // 16. WebGL Cinematic UI Landing Page Route
    const indexRes = await request('GET', '/');
    assert(
      indexRes.status === 200 && 
      typeof indexRes.body === 'string' && 
      indexRes.body.includes('id="gl"') && 
      indexRes.body.includes('id="lens"'),
      'Landing page serves Three.js WebGL canvas and cinematic Lens Reveal UI'
    );

    // 17. Workplace App Route Resolution
    const appRes = await request('GET', '/app');
    const appHtmlRes = await request('GET', '/app.html');
    assert(
      appRes.status === 200 && 
      appHtmlRes.status === 200 && 
      typeof appRes.body === 'string' && 
      appRes.body.includes('Workplace Intelligence'),
      'Workplace App resolves cleanly on both /app and /app.html'
    );

    // 18. Dataset Engine Route Resolution
    const datasetRes = await request('GET', '/dataset');
    const datasetHtmlRes = await request('GET', '/dataset.html');
    assert(
      datasetRes.status === 200 && 
      datasetHtmlRes.status === 200 && 
      typeof datasetRes.body === 'string' && 
      datasetRes.body.includes('Workforce Dataset Engine'),
      'Dataset Engine resolves cleanly on both /dataset and /dataset.html'
    );

    // 19. Public AI Copilot Demo endpoint
    const copilotDemoRes = await request('POST', '/api/v2/copilot/demo', {
      message: 'Can I work remotely from another state?'
    });
    assert(
      copilotDemoRes.status === 200 &&
      copilotDemoRes.body.success === true &&
      (copilotDemoRes.body.response || copilotDemoRes.body.answer),
      'Live AI Copilot demo resolves queries with zero-hallucination policy grounding'
    );

    // 19b. Copilot Status endpoint
    const copilotStatusRes = await request('GET', '/api/v2/copilot/status');
    assert(
      copilotStatusRes.status === 200 &&
      copilotStatusRes.body.success === true &&
      (copilotStatusRes.body.provider === 'Google Gemini' || copilotStatusRes.body.provider === 'Offline fallback'),
      'Copilot status endpoint returns correct provider label'
    );

    // 19c. Copilot greeting handler ("hello")
    const copilotHelloRes = await request('POST', '/api/v2/copilot/chat', {
      message: 'hello'
    }, empToken);
    assert(
      copilotHelloRes.status === 200 &&
      copilotHelloRes.body.success === true &&
      copilotHelloRes.body.response &&
      copilotHelloRes.body.response.length > 5 &&
      !copilotHelloRes.body.response.toLowerCase().includes("couldn't find"),
      'Copilot answers "hello" with friendly non-empty greeting and does NOT return "couldn\'t find"'
    );

    // 19d. Copilot general knowledge ("What is a SWOT analysis?") without policy citation
    const copilotSwotRes = await request('POST', '/api/v2/copilot/chat', {
      message: 'What is a SWOT analysis?'
    }, empToken);
    assert(
      copilotSwotRes.status === 200 &&
      copilotSwotRes.body.success === true &&
      copilotSwotRes.body.response &&
      copilotSwotRes.body.response.length > 20 &&
      copilotSwotRes.body.citation === null,
      'Copilot answers general knowledge questions directly without attaching policy citations'
    );

    // 19e. Copilot policy question ("What is the parental leave policy?") with citation
    const copilotPolicyRes = await request('POST', '/api/v2/copilot/chat', {
      message: 'What is the parental leave policy?'
    }, empToken);
    assert(
      copilotPolicyRes.status === 200 &&
      copilotPolicyRes.body.success === true &&
      copilotPolicyRes.body.response &&
      copilotPolicyRes.body.citation &&
      copilotPolicyRes.body.citation.title,
      'Copilot grounds company policy questions with approved knowledge base citation'
    );

    // 20. Public Intelligence Telemetry endpoint
    const publicAnalyticsRes = await request('GET', '/api/v2/analytics/public');
    assert(
      publicAnalyticsRes.status === 200 &&
      publicAnalyticsRes.body.success === true &&
      publicAnalyticsRes.body.telemetry.groundingAccuracy === 99.4 &&
      publicAnalyticsRes.body.telemetry.avgResolutionDays === 2.4,
      'Public analytics endpoint serves live impact and sentiment telemetry'
    );

    // 21. Roadmap voting endpoint
    const roadmapVoteRes = await request('POST', '/api/v2/analytics/roadmap-vote', {
      featureId: 'feat_voice'
    });
    assert(
      roadmapVoteRes.status === 200 &&
      roadmapVoteRes.body.success === true &&
      typeof roadmapVoteRes.body.newVoteCount === 'number',
      'Roadmap voting endpoint records votes dynamically'
    );

    // ── PHASE B: ADVANCED AI COPILOT TESTS ────────────────────────────────

    // 22. AI Email Drafting Assistance via Copilot Chat
    const emailDraftRes = await request('POST', '/api/v2/copilot/chat', {
      message: 'Draft an email to HR requesting 4 days of paid leave'
    }, empToken);
    assert(
      emailDraftRes.status === 200 &&
      emailDraftRes.body.toolExecution &&
      emailDraftRes.body.toolExecution.toolName === 'Agent.DraftProfessionalEmail' &&
      emailDraftRes.body.toolExecution.parameters.subject.includes('Leave Application') &&
      emailDraftRes.body.toolExecution.parameters.body.includes('4 days'),
      'AI Copilot accurately executes email drafting action assistance'
    );

    // 23. Context & Recommendations Generation
    assert(
      emailDraftRes.status === 200 &&
      Array.isArray(emailDraftRes.body.recommendations) &&
      emailDraftRes.body.recommendations.length > 0,
      'AI Copilot returns smart recommendations tailored to query intent'
    );

    // 24. Dedicated HR Policy Assistant Endpoint
    const hrPolicyRes = await request('POST', '/api/v2/copilot/hr-policy', {
      question: 'How many weeks of parental leave do employees get?'
    }, empToken);
    assert(
      hrPolicyRes.status === 200 &&
      hrPolicyRes.body.citation &&
      hrPolicyRes.body.citation.title.includes('Parental') &&
      hrPolicyRes.body.answer.includes('16 weeks'),
      'HR Policy Assistant grounds specific entitlement answers in policy documentation'
    );

    // 25. Conversation Context Memory / History retrieval
    const historyRes = await request('GET', '/api/v2/copilot/history', null, empToken);
    assert(
      historyRes.status === 200 &&
      Array.isArray(historyRes.body.history) &&
      historyRes.body.history.length > 0,
      'Copilot session history retains multi-turn conversational context'
    );

    // ── PHASE C: ADVANCED AI FEATURES TESTS ───────────────────────────────

    // Login HR Admin for admin-scoped features
    // 26. AI Meeting Assistant: Summarize Transcript
    const meetingRes = await request('POST', '/api/v2/copilot/advanced/meeting-summary', {
      meetingTitle: 'Q4 Inclusive Engineering Sync',
      transcript: 'Sarah: We need to ensure automatic live captions are activated on all sprint sync calls. Maya: I will follow up with IT to enable the caption plugin by Thursday. David: Approved, let us make sure all team members have access.',
      attendees: ['Sarah', 'Maya', 'David']
    }, empToken);
    assert(
      meetingRes.status === 200 &&
      meetingRes.body.success === true &&
      Array.isArray(meetingRes.body.actionItems) &&
      meetingRes.body.actionItems.length > 0 &&
      meetingRes.body.executiveSummary,
      'AI Meeting Assistant analyzes transcript and extracts structured action items'
    );

    // 27. Employee Sentiment Analysis
    const sentimentRes = await request('POST', '/api/v2/copilot/advanced/sentiment', {
      text: 'The new ramp and standing desk in Room B have made collaboration completely accessible and welcoming!'
    }, empToken);
    assert(
      sentimentRes.status === 200 &&
      sentimentRes.body.success === true &&
      sentimentRes.body.sentiment === 'Positive' &&
      typeof sentimentRes.body.inclusionIndex === 'number' &&
      sentimentRes.body.inclusionIndex >= 70,
      'Employee Sentiment Analysis accurately measures positive sentiment and inclusion index'
    );

    // 28. AI Executive Report Generator (Management Summaries)
    const execReportRes = await request('POST', '/api/v2/copilot/advanced/executive-report', {}, hrToken);
    assert(
      execReportRes.status === 200 &&
      execReportRes.body.success === true &&
      execReportRes.body.executiveHeadline &&
      Array.isArray(execReportRes.body.topRiskAreas) &&
      Array.isArray(execReportRes.body.recommendedInterventions),
      'AI Report Generator produces structured executive summaries with intervention recommendations'
    );

    // 29. Workplace Risk Detection Engine
    const risksRes = await request('GET', '/api/v2/copilot/advanced/workplace-risks', null, hrToken);
    assert(
      risksRes.status === 200 &&
      risksRes.body.success === true &&
      typeof risksRes.body.riskScore === 'number' &&
      Array.isArray(risksRes.body.risks),
      'Workplace Risk Detection identifies recurring barriers and SLA vulnerabilities'
    );

    // 30. Accessibility Assistant (Interactive WCAG auditor)
    const auditRes = await request('POST', '/api/v2/copilot/advanced/check-accessibility', {
      description: 'Modal dialog without aria-label or keyboard focus trap'
    }, empToken);
    assert(
      auditRes.status === 200 &&
      auditRes.body.success === true &&
      (auditRes.body.complianceStatus === 'Needs Improvement' || auditRes.body.complianceStatus === 'Critical Barrier') &&
      Array.isArray(auditRes.body.identifiedBarriers) &&
      auditRes.body.identifiedBarriers.length > 0,
      'Accessibility Assistant audits digital descriptions and prescribes WCAG remediation'
    );

    // ── PHASE E: SECURITY, AUDIT & DATA ISOLATION TESTS ───────────────────

    // 31. Server-side Anonymity: Submitter identity stripped from storage & response
    const anonReportRes = await request('POST', '/api/v2/reports', {
      title: 'Restroom accessibility door assist sensor inoperative',
      category: 'Accessibility Barrier',
      description: 'The automated wheelchair assist sensor is not responding in East Wing restrooms.',
      isAnonymous: true
    }, empToken);
    assert(
      anonReportRes.status === 201 &&
      anonReportRes.body.report.isAnonymous === true &&
      anonReportRes.body.report.submitterId === null &&
      anonReportRes.body.report.submitterName === 'Anonymous Employee' &&
      !anonReportRes.body.report.userIp,
      'Anonymous reporting guarantees true server-side anonymity with zero submitter PII'
    );
    const employeeReportsRes = await request('GET', '/api/v2/reports', null, empToken);
    const hrReportsRes = await request('GET', '/api/v2/reports', null, hrToken);
    assert(
      employeeReportsRes.status === 200 && !employeeReportsRes.body.reports.some(report => report.isAnonymous),
      'Employees cannot list anonymous workplace reports'
    );
    assert(
      hrReportsRes.status === 200 && hrReportsRes.body.reports.some(report => report.isAnonymous),
      'HR admins can review anonymous workplace reports'
    );

    const employeeUploadRes = await request('POST', '/api/v2/knowledge/upload', {
      title: 'Unauthorized policy', content: 'This content must not be added.'
    }, empToken);
    assert(employeeUploadRes.status === 403, 'Employee role cannot upload company knowledge');

    // 32. Multi-tenant Data Isolation: Users cannot read records of other companies
    // Sign up a user in an isolated company COMP999
    const comp2UserEmail = `tenant_${Date.now()}@foreign.internal`;
    const foreignSignup = await request('POST', '/api/v2/auth/signup', {
      name: 'Foreign User',
      email: comp2UserEmail,
      companyName: 'Foreign Enterprise',
      password: 'securePassword123',
      confirmPassword: 'securePassword123',
      role: 'Employee'
    });
    const foreignToken = foreignSignup.body.token;

    // Foreign user requests COMP001 reports
    const foreignReportsRes = await request('GET', '/api/v2/reports', null, foreignToken);
    assert(
      foreignReportsRes.status === 200 &&
      foreignReportsRes.body.reports.length === 0,
      'Multi-tenant data isolation strictly prevents cross-company data leakage'
    );

    // 33. Role-Based Access Control: Unauthorized role rejected from administrative endpoints
    const forbiddenRes = await request('POST', '/api/v2/copilot/advanced/executive-report', {}, empToken);
    assert(
      forbiddenRes.status === 403,
      'Role-based access control rejects unauthorized employee access with HTTP 403'
    );

    // 34. Security: Unauthenticated request to protected endpoint blocked with HTTP 401
    const unauthRes = await request('GET', '/api/v2/copilot/history');
    assert(
      unauthRes.status === 401,
      'Security gateway enforces authentication and rejects missing tokens with HTTP 401'
    );

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close(() => {
      cleanupTestData();
      console.log(`\nTEST SUMMARY: ${passed} Passed, ${failed} Failed`);
      process.exit(failed > 0 ? 1 : 0);
    });
  }
}

server = app.listen(PORT, () => {
  runTests();
});
