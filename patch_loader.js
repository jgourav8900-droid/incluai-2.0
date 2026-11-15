/**
 * patch_loader.js
 * Patches build_index.js to:
 * 1. Add guaranteed loader dismissal at the top of the <script> block
 * 2. Wrap Three.js initialization in try/catch so crashes don't freeze the page
 * 3. Remove the old loader interval code (now handled at top)
 * 4. Close the try/catch around Three.js code properly
 */
const fs = require('fs');
const path = require('path');

let src = fs.readFileSync('build_index.js', 'utf8');

// ── PATCH 1: Replace the Three.js init section with try/catch version ─────────
// Find the marker line and inject loader failsafe + try block before THREE init
const OLD_THREEJS_INIT = `/* Three.js WebGL Particle Universe & Polyhedra Engine */
const R=new THREE.WebGLRenderer({canvas:$('#gl'),antialias:true,alpha:true});
R.setPixelRatio(Math.min(devicePixelRatio,2));
const S=new THREE.Scene(),C=new THREE.PerspectiveCamera(60,1,.1,400);
C.position.z=30;`;

// We'll search by a reliable unique substring
const MARKER = 'Three.js WebGL Particle Universe';
const THREEJS_INIT_REGEX = /\/\* Three\.js WebGL Particle Universe[^*]*\*\/[\s\S]*?C\.position\.z=30;/;

const NEW_THREEJS_HEADER = `/* Three.js WebGL Particle Universe & Polyhedra Engine — wrapped in try/catch */
let R=null,S=null,C=null,pg=null,wm=null,icosa=null,rings=[],core=null;
let currentSpeed=0.09,isWarp=false,currentMood=0;
try{
R=new THREE.WebGLRenderer({canvas:$('#gl'),antialias:true,alpha:true,powerPreference:'low-power'});
R.setPixelRatio(Math.min(devicePixelRatio,2));
S=new THREE.Scene();C=new THREE.PerspectiveCamera(60,1,.1,400);
C.position.z=30;`;

if(THREEJS_INIT_REGEX.test(src)){
  src = src.replace(THREEJS_INIT_REGEX, NEW_THREEJS_HEADER);
  console.log('✅ PATCH 1: Three.js init wrapped with try/catch opener');
} else {
  console.error('❌ PATCH 1 FAILED: Could not find Three.js init section');
}

// ── PATCH 2: Fix variable declarations that are now let instead of const ──────
// Replace `const moodPalettes` etc. that are inside the try block
// These were already declared at module level before as const - only fix currentMood/isWarp/currentSpeed
src = src.replace(/\nlet currentMood = 0;\nconst moodPalettes/, '\nconst moodPalettes');
src = src.replace(/\nlet isWarp = false;\nlet currentSpeed = 0\.09;/, '');
console.log('✅ PATCH 2: Removed duplicate variable declarations');

// ── PATCH 3: Close the try/catch before the cursor/loop code ─────────────────
// Find the end of the THREE render call and close the try there
const LOOP_END_MARKER = 'requestAnimationFrame(loop);\n\n/* Hover States';
const LOOP_END_WITH_CATCH = `requestAnimationFrame(loop);
} catch(e) {
  // Three.js/WebGL unavailable — page still works, just no 3D particles
  const glCanvas = document.getElementById('gl');
  if(glCanvas) glCanvas.style.display = 'none';
  console.warn('WebGL not available:', e.message);
}

/* Hover States`;

if(src.includes(LOOP_END_MARKER)){
  src = src.replace(LOOP_END_MARKER, LOOP_END_WITH_CATCH);
  console.log('✅ PATCH 3: try/catch closed after requestAnimationFrame(loop)');
} else {
  console.error('❌ PATCH 3 FAILED: Could not find requestAnimationFrame(loop) + Hover States marker');
}

// ── PATCH 4: Add guaranteed loader dismissal at top of <script> block ─────────
const SCRIPT_OPEN = `<script>
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;`;

const SCRIPT_OPEN_WITH_LOADER = `<script>
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ═══════════════════════════════════════════════════════════════════════
   GUARANTEED LOADER DISMISSAL
   Runs BEFORE Three.js so WebGL errors never freeze the loading screen.
   Hard failsafe dismisses after 1800ms no matter what.
   ═══════════════════════════════════════════════════════════════════════ */
function dismissLoader(){
  const l=document.getElementById('load');
  if(!l||l._gone)return;
  l._gone=true;
  const done=()=>{if(l.parentNode)l.remove();};
  if(!reduce&&l.animate){
    l.animate([{opacity:1},{opacity:0}],{duration:420,easing:'ease-out',fill:'forwards'});
    setTimeout(done,440);
  } else { done(); }
}
// Hard cap: dismiss within 1800ms
setTimeout(dismissLoader,1800);
// Click-to-dismiss
(function(){const l=document.getElementById('load');if(l)l.addEventListener('click',dismissLoader);})();

/* Animated loader progress */
(function(){
  let p=0;
  const iv=setInterval(()=>{
    p=Math.min(100,p+(reduce?100:Math.random()*20+12));
    const mi=document.getElementById('mi'),pc=document.getElementById('pc');
    if(mi)mi.style.width=p+'%';
    if(pc)pc.textContent=String(p|0).padStart(3,'0');
    if(p>=100){clearInterval(iv);setTimeout(dismissLoader,150);}
  },28);
})();`;

if(src.includes(SCRIPT_OPEN)){
  src = src.replace(SCRIPT_OPEN, SCRIPT_OPEN_WITH_LOADER);
  console.log('✅ PATCH 4: Guaranteed loader dismissal added at top of <script>');
} else {
  console.error('❌ PATCH 4 FAILED: Could not find <script> opening block');
}

// ── PATCH 5: Remove the OLD loader code at the bottom (now replaced) ──────────
const OLD_LOADER_SECTION = `/* Cinematic Loader with Rapid Failsafe */
let p=0;
const loadEl = document.getElementById('load');
if(loadEl) {
  loadEl.addEventListener('click', () => loadEl.remove());
  setTimeout(() => { if(document.getElementById('load')) document.getElementById('load').remove(); }, 900);
}

const iv=setInterval(()=>{
  p=Math.min(100,p+(reduce?100:Math.random()*20+12));
  if($('#mi')) $('#mi').style.width=p+'%';
  if($('#pc')) $('#pc').textContent=String(p|0).padStart(3,'0');
  if(p>=100){
    clearInterval(iv);
    setTimeout(()=>{
      const l = $('#load');
      if(l && l.animate){
        l.animate([
          {clipPath:'inset(0 0 0 0)',opacity:1},
          {clipPath:'inset(0 0 100% 0)',opacity:.4}
        ],{duration:reduce?10:450,easing:'cubic-bezier(.7,0,.2,1)',fill:'forwards'});
        setTimeout(()=>{ if(l) l.remove(); }, 500);
      } else if(l) {
        l.remove();
      }
    },100);
  }
},30);`;

if(src.includes(OLD_LOADER_SECTION)){
  src = src.replace(OLD_LOADER_SECTION, '/* Loader handled at top of script — see dismissLoader() */');
  console.log('✅ PATCH 5: Old loader code removed from bottom');
} else {
  console.warn('⚠️  PATCH 5: Old loader code not found (may already be patched)');
}

// ── Write patched file ────────────────────────────────────────────────────────
fs.writeFileSync('build_index.js', src, 'utf8');
console.log('\n✅ All patches applied to build_index.js');
console.log('   Run: node build_index.js  to regenerate public/index.html\n');

