process.env.NODE_ENV = 'test';
const app = require('../server');
const http = require('http');

let server;
const PORT = 5097;

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

async function runLiveTests() {
  console.log('--- STARTING INCLUAI 2.0 GEMINI LIVE API TESTS ---');
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
    // 1. Login employee to obtain JWT
    const loginRes = await request('POST', '/api/v2/auth/login', {
      email: 'emp@comp001.internal',
      password: 'password123'
    });
    assert(loginRes.status === 200 && loginRes.body.token, 'Login succeeds for Live tests');
    const empToken = loginRes.body.token;

    // 2. Token route requires authentication (401 when missing token)
    const unauthRes = await request('POST', '/api/v2/copilot/live/token');
    assert(unauthRes.status === 401, 'POST /live/token requires authentication (HTTP 401)');

    // 3. Token route returns 503 if no Gemini key configured (never fakes responses)
    const tokenRes = await request('POST', '/api/v2/copilot/live/token', {}, empToken);
    assert(
      tokenRes.status === 503 &&
      tokenRes.body.success === false &&
      tokenRes.body.error.includes('Gemini Live service is not available'),
      'POST /live/token returns honest HTTP 503 with helpful message when client is null'
    );

    // 4. Tool-search route requires authentication (401)
    const unauthToolRes = await request('POST', '/api/v2/copilot/live/tool-search', { query: 'leave' });
    assert(unauthToolRes.status === 401, 'POST /live/tool-search requires authentication (HTTP 401)');

    // 5. Tool-search route validates input (400 on empty query)
    const badToolRes = await request('POST', '/api/v2/copilot/live/tool-search', { query: '' }, empToken);
    assert(badToolRes.status === 400 && badToolRes.body.success === false, 'POST /live/tool-search validates input (HTTP 400)');

    // 6. Tool-search route returns grounded policy result
    const toolSearchRes = await request('POST', '/api/v2/copilot/live/tool-search', {
      query: 'What is the hybrid remote work policy?'
    }, empToken);
    assert(
      toolSearchRes.status === 200 &&
      toolSearchRes.body.success === true &&
      toolSearchRes.body.found === true &&
      toolSearchRes.body.result.includes('Hybrid Remote Work Policy'),
      'POST /live/tool-search grounds query in company policy documents'
    );

    // 7. Tool-search route handles non-matching query cleanly
    const noMatchRes = await request('POST', '/api/v2/copilot/live/tool-search', {
      query: 'zzzznonexistenttopic12345'
    }, empToken);
    assert(
      noMatchRes.status === 200 &&
      noMatchRes.body.success === true,
      'POST /live/tool-search handles no-match queries with a clean honest response'
    );

    // 8. Transcript persistence endpoint saves voice turns without storing audio
    const transcriptRes = await request('POST', '/api/v2/copilot/live/transcript', {
      role: 'user',
      content: 'Can I take remote work days on Fridays?'
    }, empToken);
    assert(
      transcriptRes.status === 200 &&
      transcriptRes.body.success === true &&
      transcriptRes.body.entry.content.includes('remote work days'),
      'POST /live/transcript persists text transcript to conversation history'
    );

    // 9. Status endpoint accurately reports text vs live capability
    const statusRes = await request('GET', '/api/v2/copilot/status');
    assert(
      statusRes.status === 200 &&
      typeof statusRes.body.liveAvailable === 'boolean' &&
      statusRes.body.liveModel === 'gemini-2.0-flash',
      'GET /copilot/status reports liveAvailable flag and accurate liveModel'
    );

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close(() => {
      console.log(`\nLIVE TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
      process.exit(failed > 0 ? 1 : 0);
    });
  }
}

server = app.listen(PORT, () => {
  runLiveTests();
});

