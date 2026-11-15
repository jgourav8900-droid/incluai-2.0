// Comprehensive Deep Audit & Debug Tool for INCLUAI 2.0
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('=======================================================');
console.log('   INCLUAI 2.0 DEEP AUDIT & LINK INTEGRITY CHECKER     ');
console.log('=======================================================\n');

let totalErrors = 0;
let totalChecks = 0;

function check(desc, condition, errorMsg = '') {
  totalChecks++;
  if (condition) {
    console.log(`[PASS] ${desc}`);
  } else {
    totalErrors++;
    console.error(`[FAIL] ${desc} -> ${errorMsg}`);
  }
}

// 1. Audit HTML script tags for syntax errors
const htmlFiles = ['public/index.html', 'index.html', 'public/app.html', 'app.html', 'public/dataset.html', 'dataset.html'];
for (const file of htmlFiles) {
  if (!fs.existsSync(file)) {
    check(`File exists: ${file}`, false, 'File missing');
    continue;
  }
  const content = fs.readFileSync(file, 'utf8');
  check(`File exists: ${file}`, true);

  const scripts = [...content.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  scripts.forEach((s, idx) => {
    const code = s[1].trim();
    if (!code) return; // external script
    try {
      new Function(code);
      check(`${file} script #${idx} syntax valid (${code.length} chars)`, true);
    } catch (err) {
      check(`${file} script #${idx} syntax valid`, false, err.message);
    }
  });
}

// 2. Audit internal anchor links in public/index.html
console.log('\n--- Checking Anchor Links in public/index.html ---');
const indexHtml = fs.readFileSync('public/index.html', 'utf8');
const idMatches = new Set([...indexHtml.matchAll(/\bid=[\"']([^\"']+)[\"']/gi)].map(m => m[1]));
const anchorMatches = [...indexHtml.matchAll(/\bhref=[\"']#([^\"']+)[\"']/gi)].map(m => m[1]);

anchorMatches.forEach(anchor => {
  if (anchor === '' || anchor === '#') return;
  const exists = idMatches.has(anchor);
  check(`Anchor #${anchor} points to existing ID in index.html`, exists, `Target #${anchor} element not found in DOM`);
});

// 3. Audit all backend routes & services
console.log('\n--- Checking Backend Services & Route Modules ---');
const modulesToTest = [
  './services/dbService',
  './services/authService',
  './services/ragService',
  './services/aiService',
  './services/metricsService',
  './routes/auth',
  './routes/copilot',
  './routes/knowledge',
  './routes/reports',
  './routes/messages',
  './routes/tasks',
  './routes/email',
  './routes/observability',
  './routes/analytics',
  './routes/settings',
  './routes/notifications',
  './routes/waitlist',
  './routes/dataset'
];

modulesToTest.forEach(mod => {
  try {
    const loaded = require(mod);
    check(`Module loads cleanly: ${mod}`, !!loaded);
  } catch (err) {
    check(`Module loads cleanly: ${mod}`, false, err.message);
  }
});

// 4. Test live server HTTP status
console.log('\n--- Checking Live Server HTTP Status ---');
const endpoints = [
  '/',
  '/app',
  '/app.html',
  '/dataset',
  '/dataset.html',
  '/api/v2/observability/metrics',
  '/api/v2/analytics/public',
  '/api/v2/waitlist/stats'
];

function testHttp(urlPath) {
  return new Promise(resolve => {
    http.get('http://localhost:5000' + urlPath, res => {
      check(`Endpoint http://localhost:5000${urlPath} returns 200 OK`, res.statusCode === 200, `Got HTTP ${res.statusCode}`);
      resolve();
    }).on('error', err => {
      check(`Endpoint http://localhost:5000${urlPath} reachable`, false, err.message);
      resolve();
    });
  });
}

(async () => {
  for (const ep of endpoints) {
    await testHttp(ep);
  }

  console.log('\n=======================================================');
  console.log(`Audit Complete: ${totalChecks} Checks, ${totalErrors} Failures`);
  console.log('=======================================================');

  if (totalErrors > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
})();

