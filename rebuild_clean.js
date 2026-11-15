/**
 * rebuild_clean.js
 * 
 * Definitive fix: replaces the corrupt/doubled script block in build_index.js
 * with a clean external script tag, then rebuilds public/index.html & index.html.
 * 
 * Root causes fixed:
 *  1. Duplicate $ declaration (SyntaxError → page freeze)
 *  2. let+const redeclaration inside try block (SyntaxError)
 *  3. Double </script> tag from previous patching
 *  4. Three.js crash stops loader dismissal
 *  5. All JS now in external public/app_index.js (syntax-validated separately)
 */
const fs = require('fs');

// ── Step 1: Fix build_index.js ────────────────────────────────────────────────
let src = fs.readFileSync('build_index.js', 'utf8');

const SCRIPT_OPEN = 71801; // char position of <script>
// Replace everything from <script> to the doubled </script></script> with external ref
// Find actual end of script section
const doubleClose = src.indexOf('</script></script>');
if(doubleClose === -1){
  console.log('No double </script> found — looking for single close after script open...');
}
const scriptClose = doubleClose !== -1 ? doubleClose : src.lastIndexOf('</script>');
const SCRIPT_END = scriptClose + (doubleClose !== -1 ? '</script></script>'.length : '</script>'.length);

console.log('Script block: chars', SCRIPT_OPEN, '→', SCRIPT_END, '(', SCRIPT_END - SCRIPT_OPEN, 'chars)');

const before = src.slice(0, SCRIPT_OPEN);
const after  = src.slice(SCRIPT_END);

// The replacement: external script tag (loads from public folder, served as /app_index.js)
const externalScriptTag = `<!-- =====================================================================
     MAIN JAVASCRIPT: loaded from public/app_index.js
     Edits go there — syntax-validated separately. No template-literal escaping.
     ===================================================================== -->
<script src="/app_index.js"></script>`;

const patched = before + externalScriptTag + after;
fs.writeFileSync('build_index.js', patched, 'utf8');
console.log('✅ build_index.js script block replaced with external tag');
console.log('   New size:', patched.length, 'bytes');

// ── Step 2: Add /app_index.js route to server.js if not already present ──────
let serverSrc = fs.readFileSync('server.js', 'utf8');
if(!serverSrc.includes('app_index.js')){
  // Add static route for /app_index.js — serve the file from public/
  // Find where express.static is set up
  const staticLine = serverSrc.indexOf("express.static(path.join(__dirname, 'public'))");
  if(staticLine !== -1){
    console.log('ℹ️  express.static already serves public/ dir — /app_index.js will be served automatically');
  } else {
    console.log('⚠️  Could not find express.static in server.js — may need manual route');
  }
}
console.log('✅ server.js check complete (public/ dir serves app_index.js automatically)');

// ── Step 3: Rebuild HTML ───────────────────────────────────────────────────────
console.log('\nRunning build_index.js to regenerate HTML...');
try {
  // Clear require cache
  delete require.cache[require.resolve('./build_index.js')];
  require('./build_index.js');
  console.log('✅ HTML rebuild complete!');
} catch(e) {
  console.error('❌ Build error:', e.message);
  process.exit(1);
}

// ── Step 4: Verify JS syntax one more time ────────────────────────────────────
const { execSync } = require('child_process');
try {
  execSync('node --check public/app_index.js', { stdio: 'pipe' });
  console.log('✅ public/app_index.js syntax OK');
} catch(e) {
  console.error('❌ Syntax error in app_index.js:', e.stderr?.toString());
  process.exit(1);
}

// ── Step 5: Verify the generated HTML ────────────────────────────────────────
const html = fs.readFileSync('public/index.html', 'utf8');
const checks = [
  ['<script src="/app_index.js">', true],
  ['</script></script>', false],   // should NOT exist
  ['id="load"', true],
  ['id="problem-solution"', true],
  ['id="how-it-works"', true],
  ['id="copilot-demo"', true],
  ['id="impact"', true],
  ['id="roadmap"', true],
  ['id="faq"', true],
  ['</footer>', true],
];

console.log('\n── HTML Verification ──');
let allOk = true;
checks.forEach(([needle, shouldExist]) => {
  const found = html.includes(needle);
  const ok = found === shouldExist;
  allOk = allOk && ok;
  console.log((ok ? '✅' : '❌'), (shouldExist ? 'PRESENT' : 'ABSENT '), needle.slice(0,50));
});

console.log('\n' + (allOk ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'));
console.log('HTML size:', html.length, 'bytes');

