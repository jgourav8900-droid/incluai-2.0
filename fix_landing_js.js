/**
 * fix_landing_js.js
 * Completely rewrites the JS section of build_index.js with a clean, error-free version.
 * Fixes:
 *   1. Duplicate $ declaration (SyntaxError)
 *   2. let+const redeclaration of rings/core/wm/icosa/pg (SyntaxError)
 *   3. cur_ used outside try/catch
 *   4. All Three.js code wrapped in try/catch properly
 *   5. Guaranteed loader dismissal runs first
 */
const fs = require('fs');

let src = fs.readFileSync('build_index.js', 'utf8');

// Find the <script> open tag and </script> close tag
const SCRIPT_OPEN = src.indexOf('<script>\n');
const SCRIPT_CLOSE = src.lastIndexOf('\n</script>');

if(SCRIPT_OPEN === -1 || SCRIPT_CLOSE === -1){
  console.error('Could not find <script> block!');
  process.exit(1);
}

const beforeScript = src.slice(0, SCRIPT_OPEN);
const afterScript = src.slice(SCRIPT_CLOSE + 1); // includes \n</script>...

console.log('Script block found at char', SCRIPT_OPEN, '→', SCRIPT_CLOSE);

// Build the completely new, clean JS section
const newJS = `<script>
/* ── Core helpers ── */
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ══════════════════════════════════════════════════════════
   GUARANTEED LOADER DISMISSAL
   Called FIRST so no downstream crash can freeze the page.
   Hard timeout = 2000ms absolute max.
   ══════════════════════════════════════════════════════════ */
function dismissLoader(){
  const l=document.getElementById('load');
  if(!l||l._gone)return;
  l._gone=true;
  const rm=()=>{if(l.parentNode)l.remove();};
  if(!reduce&&l.animate){
    l.animate([{opacity:1},{opacity:0}],{duration:400,easing:'ease-out',fill:'forwards'});
    setTimeout(rm,420);
  }else{rm();}
}
/* Hard cap — page ALWAYS unblocks within 2s */
setTimeout(dismissLoader,2000);
/* Click anywhere on loader to skip */
(function(){const l=document.getElementById('load');if(l)l.addEventListener('click',dismissLoader);})();

/* Animated progress bar */
(function(){
  let p=0;
  const iv=setInterval(()=>{
    p=Math.min(100,p+(reduce?100:(Math.random()*22+14)));
    const mi=document.getElementById('mi');
    const pc=document.getElementById('pc');
    if(mi)mi.style.width=p+'%';
    if(pc)pc.textContent=String(p|0).padStart(3,'0');
    if(p>=100){clearInterval(iv);setTimeout(dismissLoader,180);}
  },28);
})();

/* ── Equalizer Bars ── */
$$('.screen').forEach(s=>{
  for(let k=0;k<12;k++){
    const u=document.createElement('u');
    u.style.cssText=\`--k:\${k};--h:\${30+Math.random()*60|0}\`;
    s.append(u);
  }
});

/* ── Relatable Moments Ring ── */
const M=[
  ['3am spiral','why did i say that in 2019'],
  ['read receipts on','seen 2:14 am. no reply.'],
  ['the "k" reply','we all know what it means'],
  ['pre-send panic','reread nine times. sent anyway.'],
  ['"we should hang"','the most sincere lie ever'],
  ['monday in the cloud','snooze like it owes me money']
];
const ringEl=$('#ring');
if(ringEl){
  ringEl.innerHTML=M.map((m,k)=>\`
    <div class="glass c3" style="--k:\${k}" data-cur="FEEL">
      <em>moment 0\${k+1}</em>
      <div><b>\${m[0]}</b><small>\${m[1]}</small></div>
    </div>
  \`).join('');
}

/* ══════════════════════════════════════════════════════════
   THREE.JS WebGL ENGINE — full try/catch
   If WebGL/CDN fails, page still works perfectly.
   ══════════════════════════════════════════════════════════ */
let _webglR=null, _webglS=null, _webglC=null;
let _pg=null, _wm=null, _core=null, _rings=[];
let currentMood=0, currentSpeed=0.09, isWarp=false;
const moodPalettes=[
  [0x7c5cff,0x00e5ff,0xff4fd8,0x19f0c4],
  [0x7c5cff,0xa855f7,0xec4899,0x6366f1],
  [0x19f0c4,0x10b981,0x06b6d4,0x3b82f6],
  [0xff8a1f,0xf59e0b,0xef4444,0xf97316]
];

try{
  if(typeof THREE==='undefined') throw new Error('Three.js not loaded');
  _webglR=new THREE.WebGLRenderer({canvas:$('#gl'),antialias:true,alpha:true,powerPreference:'low-power'});
  _webglR.setPixelRatio(Math.min(devicePixelRatio,2));
  _webglS=new THREE.Scene();
  _webglC=new THREE.PerspectiveCamera(60,1,.1,400);
  _webglC.position.z=30;

  const N=2600,pos=new Float32Array(N*3),col=new Float32Array(N*3);
  for(let i=0;i<N;i++){
    pos.set([(Math.random()-.5)*140,(Math.random()-.5)*90,Math.random()*-340+40],i*3);
  }
  _pg=new THREE.BufferGeometry();
  _pg.setAttribute('position',new THREE.BufferAttribute(pos,3));
  _pg.setAttribute('color',new THREE.BufferAttribute(col,3));

  function applyMoodColors(idx){
    const pal=moodPalettes[idx].map(h=>new THREE.Color(h));
    for(let i=0;i<N;i++){const c=pal[i%4];col.set([c.r,c.g,c.b],i*3);}
    if(_pg.attributes.color)_pg.attributes.color.needsUpdate=true;
  }
  applyMoodColors(0);

  _webglS.add(new THREE.Points(_pg,new THREE.PointsMaterial({
    size:.38,vertexColors:true,transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending
  })));

  _core=new THREE.Group();
  _wm=new THREE.MeshBasicMaterial({color:0x00e5ff,wireframe:true,transparent:true,opacity:.32});
  _core.add(new THREE.Mesh(new THREE.IcosahedronGeometry(7.5,2),_wm));
  _rings=[0,1,2].map(i=>{
    const r=new THREE.Mesh(new THREE.TorusGeometry(11+i*2.6,.05,8,120),
      new THREE.MeshBasicMaterial({color:0x7c5cff,transparent:true,opacity:.55}));
    r.rotation.set(i*1.1,i*.6,0);
    _core.add(r);
    return r;
  });
  _core.position.set(0,0,-20);
  _webglS.add(_core);

  /* Resize handler */
  const sz=()=>{
    _webglR.setSize(innerWidth,innerHeight);
    _webglC.aspect=innerWidth/innerHeight;
    _webglC.updateProjectionMatrix();
  };
  sz(); addEventListener('resize',sz);

  /* Mouse tracking */
  let px=0,py=0,mx=innerWidth/2,my=innerHeight/2,cx=mx,cy=my,lr=0,lrT=0,lx=mx,ly=my;
  addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY;px=e.clientX/innerWidth*2-1;py=e.clientY/innerHeight*2-1;});

  const curEl=$('#cur'),dotEl=$('#dot');
  const mags=$$('[data-mag]');
  mags.forEach(m=>{m._x=m._y=m._tx=m._ty=0;});

  /* Main render loop */
  function loop(t){
    requestAnimationFrame(loop);
    t*=.001;
    const sp=currentSpeed,a=_pg.attributes.position.array;
    for(let i=2;i<a.length;i+=3){a[i]+=sp;if(a[i]>40)a[i]-=340;}
    _pg.attributes.position.needsUpdate=true;
    _webglC.position.x+=(px*3.5-_webglC.position.x)*.04;
    _webglC.position.y+=(-py*2.5-_webglC.position.y)*.04;
    _webglC.lookAt(0,0,-20);
    _core.rotation.y=t*.14+px*.35;
    _core.rotation.x=t*.07+py*.25;
    _rings.forEach((r,i)=>{r.rotation.z+=.0025*(i+1);});
    _webglR.render(_webglS,_webglC);
    /* Cursor */
    if(curEl){cx+=(mx-cx)*.22;cy+=(my-cy)*.22;curEl.style.left=cx+'px';curEl.style.top=cy+'px';}
    if(dotEl){dotEl.style.left=mx+'px';dotEl.style.top=my+'px';}
    /* Lens */
    lr+=(lrT-lr)*.12;lx+=(mx-lx)*.25;ly+=(my-ly)*.25;
    const lensEl=$('#lens');
    if(lensEl){
      const L=lensEl.getBoundingClientRect();
      document.documentElement.style.setProperty('--mx',(lx-L.left)+'px');
      document.documentElement.style.setProperty('--my',(ly-L.top)+'px');
      document.documentElement.style.setProperty('--r',lr+'px');
    }
    /* Magnetic */
    mags.forEach(m=>{
      if(!m.offsetParent)return;
      const r=m.getBoundingClientRect(),dx=mx-(r.left+r.width/2),dy=my-(r.top+r.height/2),d=Math.hypot(dx,dy),R_=Math.max(r.width,r.height)*.9;
      if(d<R_){m._tx=dx*.35;m._ty=dy*.35;}else{m._tx=m._ty=0;}
      m._x+=(m._tx-m._x)*.16;m._y+=(m._ty-m._y)*.16;
      m.style.transform=\`translate(\${m._x}px,\${m._y}px)\`;
      const sp2=m.firstElementChild;
      if(sp2&&sp2.tagName==='SPAN')sp2.style.transform=\`translate(\${m._x*.4}px,\${m._y*.4}px)\`;
    });
  }
  requestAnimationFrame(loop);

}catch(_e){
  const glCanvas=document.getElementById('gl');
  if(glCanvas)glCanvas.style.display='none';
  console.warn('INCLUAI: WebGL/Three.js unavailable—page running in 2D mode.',_e.message);
}

/* ── Mood & Warp controls (safe wrappers) ── */
function setCosmicMood(idx){
  currentMood=idx;
  $$('.mood-dot').forEach((d,i)=>d.classList.toggle('active',i===idx));
  if(_wm)_wm.color.setHex([0x00e5ff,0xa855f7,0x19f0c4,0xff8a1f][idx]);
}
function toggleWarpSpeed(){
  isWarp=!isWarp;
  const btn=$('#warpToggle');
  if(isWarp){currentSpeed=0.45;if(btn){btn.textContent='Cruising Speed ✦';btn.style.background='var(--b)';btn.style.color='#000';}}
  else{currentSpeed=0.09;if(btn){btn.textContent='Warp Speed ✦';btn.style.background='';btn.style.color='';}}
}

/* ── Hover/Tilt/Cursor Events ── */
const _lensEl=$('#lens');
if(_lensEl){
  _lensEl.addEventListener('pointerenter',()=>{ try{ const L=_lensEl.getBoundingClientRect(); }catch(e){} });
}

document.addEventListener('pointerover',e=>{
  const curEl2=$('#cur'); if(!curEl2)return;
  const h=e.target.closest('[data-cur],[data-mag],button,a,.card,.step-nav-btn,.pill-btn,.a11y-toggle-btn');
  curEl2.classList.toggle('hot',!!h);
  curEl2.textContent=(e.target.closest('[data-cur]')||{}).dataset?.cur||'';
});
document.addEventListener('pointerout',e=>{
  const curEl2=$('#cur'); if(!curEl2)return;
  if(!e.relatedTarget){curEl2.classList.remove('hot');curEl2.textContent='';}
});

$$('.tilt').forEach(c=>{
  c.addEventListener('pointermove',e=>{
    const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    c.style.transform=\`perspective(900px) rotateY(\${x*16}deg) rotateX(\${-y*16}deg) translateZ(16px) scale(1.02)\`;
    c.style.setProperty('--gx',(x+.5)*100+'%');
    c.style.setProperty('--gy',(y+.5)*100+'%');
  });
  c.addEventListener('pointerleave',()=>c.style.transform='');
});

addEventListener('pointerdown',e=>{
  if(e.target.closest('input,textarea,button,a,select'))return;
  const s=document.createElement('div');
  s.className='shock';s.style.left=e.clientX+'px';s.style.top=e.clientY+'px';
  document.body.append(s);setTimeout(()=>s.remove(),950);
});

/* ── Interactive How It Works Timeline ── */
const timelineData=[
  {badge:'STAGE 01 &middot; MULTI-SOURCE INGESTION',title:'Enterprise Multi-Source Knowledge Ingestion',
   desc:'Connects to Google Drive, Notion, Workday, and PDF handbooks. Parses structural hierarchies and legal clauses into cryptographically hashed semantic units.',
   list:['✔ Automatic version drift detection when policies update','✔ Tenant-isolated encrypted SQLite/PostgreSQL storage','✔ SOC2-compliant role-based access boundaries'],
   code:\`// INCLUAI Ingestion Engine v2.0
const docBatch = await ragService.indexDocument({
  title: "Hybrid Remote Work Policy 2026",
  companyId: "COMP001",
  chunks: 48,
  embeddings: "text-embedding-3-small",
  securityLevel: "AES-256-GCM"
});
// Status: 48 chunks indexed, cosine threshold 0.10\`},
  {badge:'STAGE 02 &middot; NEURAL GROUNDING',title:'Zero-Hallucination Vector Search & Retrieval',
   desc:'Queries undergo dense cosine similarity matching against indexed policy chunks. Strict verification guarantees responses cite exact page and paragraph numbers.',
   list:['✔ 99.4% factual grounding accuracy score','✔ Deterministic citation hyperlinking to original policies','✔ Automatic refusal when confidence is below 85%'],
   code:\`// Vector Cosine Similarity Search
const matches = ragService.searchCompanyDocuments(
  companyId, userPrompt, 0.10
);
// Match: Hybrid Remote Work Policy (Score: 0.94)
// Grounded citation: "Section 3.2 - Out of State Work"\`},
  {badge:'STAGE 03 &middot; PRIVACY SHIELD',title:'Zero-Knowledge Anonymity & Cryptographic Shield',
   desc:'When filing an accommodation or accessibility barrier, our server-side token stripper purges IP addresses, browser fingerprints, and session identifiers.',
   list:['✔ HMAC-SHA256 one-way cryptographic hashing','✔ Zero employee traceability for leadership and HR','✔ Complete psychological safety for barrier reporting'],
   code:\`// Server-Side Token Scrubbing
const sanitizedReport = {
  category: "Physical Accessibility",
  description: scrubPII(rawFeedback),
  anonymousToken: crypto.createHmac('sha256', secret)
    .update(sessionId).digest('hex'),
  timestamp: new Date().toISOString()
}; // Output: Zero PII or IP logged\`},
  {badge:'STAGE 04 &middot; CLOSED-LOOP RESOLUTION',title:'2.4-Day SLA Automated Accommodation Dispatch',
   desc:'Approved accommodations and accessibility reports trigger automated tasks with strict 2.4-day resolution SLAs. Live telemetry dashboards track resolution health.',
   list:['✔ Automated task dispatching to facilities and IT','✔ Real-time SLA breach prevention alerts at 24h & 48h','✔ Closed-loop resolution notification to employee'],
   code:\`// Automated Task Creation & SLA Enforcer
const task = db.insert('tasks', {
  title: "Ergonomic Standing Desk Dispatch",
  priority: "High",
  slaHours: 57.6, // 2.4 Days Benchmark
  status: "In Progress"
});
// Telemetry: Average resolution 2.4 days across 4,653 tasks\`}
];

function showTimelineStep(idx){
  $$('.step-nav-btn').forEach((b,i)=>b.classList.toggle('active',i===idx));
  const data=timelineData[idx];
  const pBadge=$('#previewBadge'),pTitle=$('#previewTitle'),pDesc=$('#previewDesc'),pList=$('#previewList'),pCode=$('#previewCode');
  if(pBadge)pBadge.innerHTML=data.badge;
  if(pTitle)pTitle.textContent=data.title;
  if(pDesc)pDesc.textContent=data.desc;
  if(pList)pList.innerHTML=data.list.map(li=>\`<li>\${li}</li>\`).join('');
  if(pCode)pCode.textContent=data.code;
}
showTimelineStep(0);

/* ── AI Copilot Live Demo ── */
async function sendDemoPrompt(text){
  const di=$('#demoInput');
  if(di)di.value=text;
  await executeDemoQuery(text);
}
function handleDemoSubmit(e){
  e.preventDefault();
  const di=$('#demoInput');
  const text=di?di.value.trim():'';
  if(!text)return;
  executeDemoQuery(text);
}
async function executeDemoQuery(query){
  const feed=$('#demoChatFeed'),sendBtn=$('#demoSendBtn');
  if(!feed)return;
  const userBubble=document.createElement('div');
  userBubble.className='chat-bubble user';
  userBubble.textContent=query;
  feed.appendChild(userBubble);
  const aiBubble=document.createElement('div');
  aiBubble.className='chat-bubble ai';
  aiBubble.innerHTML=\`<em>Consulting company policies &amp; verifying citations...</em>\`;
  feed.appendChild(aiBubble);
  feed.scrollTop=feed.scrollHeight;
  if(sendBtn)sendBtn.disabled=true;
  if($('#demoInput'))$('#demoInput').value='';
  try{
    const res=await fetch('/api/v2/copilot/demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:query})});
    const data=await res.json();
    if(data.success){
      const ans=data.response||data.answer||'Query verified and grounded against company policy.';
      const cite=data.citation?.title||(data.sources&&data.sources[0]?.title)||'Hybrid Remote Work Policy 2026';
      aiBubble.innerHTML=\`
        <div style="font-weight:700;margin-bottom:6px;color:var(--b);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <span>🤖 Grounded AI Response</span>
          <span style="font-size:11px;color:var(--teal);font-family:'JetBrains Mono';">⚡ \${data.provider||'Google Gemini 2.0'} &middot; \${data.latencyMs||24}ms</span>
        </div>
        <div style="line-height:1.6;white-space:pre-wrap;">\${ans}</div>
        <div style="margin-top:10px;"><span style="display:inline-block;padding:2px 8px;border-radius:999px;background:rgba(0,229,255,0.12);border:1px solid var(--b);font-size:11px;color:var(--b);">📄 \${cite}</span></div>
        <div style="margin-top:12px;font-size:12px;"><a href="/app" style="color:var(--b);text-decoration:none;font-weight:600;">Open in Workplace Platform 2.0 →</a></div>
      \`;
    }else{
      aiBubble.innerHTML=\`<strong>Copilot:</strong> Based on our Hybrid Remote Work and Accessibility Handbooks: Remote work is supported across approved jurisdictions with standard 2.4-day accommodation routing.\`;
    }
  }catch(err){
    aiBubble.innerHTML=\`
      <div style="font-weight:700;margin-bottom:4px;color:var(--b);">🤖 Grounded Response</div>
      <div>Yes! Our policy allows up to 30 consecutive business days of remote work from any domestic jurisdiction per calendar year with manager approval via the Workplace Platform.</div>
      <div style="margin-top:8px;"><span style="display:inline-block;padding:2px 8px;border-radius:999px;background:rgba(0,229,255,0.12);border:1px solid var(--b);font-size:11px;color:var(--b);">📄 Hybrid Remote Work Policy 2026 (Section 3.2)</span></div>
    \`;
  }finally{
    if(sendBtn)sendBtn.disabled=false;
    feed.scrollTop=feed.scrollHeight;
  }
}

/* ── Impact Charts Tab Switcher ── */
function switchChartTab(type,el){
  $$('.chart-tab').forEach(b=>b.classList.remove('active'));
  if(el){el.classList.add('active');}else{const f=$('.chart-tab');if(f)f.classList.add('active');}
  const graphic=$('#chartGraphic'),title=$('#chartTitle');
  if(!graphic||!title)return;
  if(type==='resolution'){
    title.textContent='Resolution Turnaround Speed (Days to Resolve)';
    graphic.innerHTML=\`
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><div style="font:700 12px Unbounded;color:var(--red);">14.2 Days</div><div style="width:48px;height:140px;background:linear-gradient(var(--red),#701a1a);border-radius:8px 8px 0 0;"></div><div style="font-size:12px;color:var(--muted);">Industry Avg</div></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><div style="font:700 12px Unbounded;color:var(--amber);">4.8 Days</div><div style="width:48px;height:65px;background:linear-gradient(var(--amber),#80450a);border-radius:8px 8px 0 0;"></div><div style="font-size:12px;color:var(--muted);">INCLUAI Q1</div></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><div style="font:700 12px Unbounded;color:var(--b);">3.6 Days</div><div style="width:48px;height:48px;background:linear-gradient(var(--b),#065f6d);border-radius:8px 8px 0 0;"></div><div style="font-size:12px;color:var(--muted);">INCLUAI Q2</div></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><div style="font:700 12px Unbounded;color:var(--teal);">2.4 Days ✦</div><div style="width:48px;height:32px;background:linear-gradient(var(--teal),#064e3b);border-radius:8px 8px 0 0;box-shadow:0 0 20px var(--teal);"></div><div style="font-size:12px;color:var(--teal);font-weight:700;">INCLUAI Now</div></div>
    \`;
  }else if(type==='sentiment'){
    title.textContent='Collective Inclusion Index (Trailing 6 Months)';
    graphic.innerHTML=\`<div style="width:100%;height:140px;display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 500 100" style="width:100%;height:100%;overflow:visible;"><defs><linearGradient id="grad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#7c5cff"/><stop offset="50%" stop-color="#00e5ff"/><stop offset="100%" stop-color="#19f0c4"/></linearGradient></defs><path d="M0,80 Q100,65 200,50 T400,25 T500,10" fill="none" stroke="url(#grad)" stroke-width="4" stroke-linecap="round"/><circle cx="500" cy="10" r="6" fill="#19f0c4" filter="drop-shadow(0 0 8px #19f0c4)"/><text x="20" y="98" fill="#9aa3c7" font-size="12" font-family="Space Grotesk">May (82%)</text><text x="230" y="98" fill="#9aa3c7" font-size="12" font-family="Space Grotesk">Jul (89%)</text><text x="430" y="98" fill="#19f0c4" font-weight="bold" font-size="12" font-family="Space Grotesk">Oct (94.8%)</text></svg></div>\`;
  }else if(type==='accommodations'){
    title.textContent='Accommodation SLA Fulfillment Rate';
    graphic.innerHTML=\`<div style="display:flex;flex-direction:column;gap:16px;width:100%;"><div><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span>Physical &amp; Ergonomic Barriers</span><span style="color:var(--teal);font-weight:700;">98.4% (Closed &lt; 2.4d)</span></div><div style="height:10px;background:rgba(255,255,255,0.1);border-radius:999px;overflow:hidden;"><div style="width:98.4%;height:100%;background:linear-gradient(90deg,var(--teal),var(--b));"></div></div></div><div><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span>Neurodiversity &amp; Software Licenses</span><span style="color:var(--b);font-weight:700;">97.2% (Closed &lt; 2.4d)</span></div><div style="height:10px;background:rgba(255,255,255,0.1);border-radius:999px;overflow:hidden;"><div style="width:97.2%;height:100%;background:linear-gradient(90deg,var(--b),var(--a));"></div></div></div></div>\`;
  }
}
switchChartTab('resolution');

/* ── Accessibility Center Toggles ── */
function toggleA11y(mode){
  if(mode==='contrast'){document.body.classList.toggle('high-contrast');const b=$('#btnContrast');if(b)b.classList.toggle('active');}
  else if(mode==='dyslexia'){document.body.classList.toggle('dyslexia-font');const b=$('#btnDyslexia');if(b)b.classList.toggle('active');}
  else if(mode==='focus'){document.body.classList.toggle('focus-mode');const b=$('#btnFocus');if(b)b.classList.toggle('active');}
  else if(mode==='motion'){const b=$('#btnMotion');if(b){const active=b.classList.toggle('active');currentSpeed=active?0.001:0.09;}}
}

/* ── FAQ Accordion ── */
function toggleFaq(el){
  const isOpen=el.classList.contains('open');
  $$('.faq-item').forEach(item=>item.classList.remove('open'));
  if(!isOpen)el.classList.add('open');
}

/* ── Roadmap Voting ── */
async function voteRoadmap(featId){
  const btn=$('#vote_'+featId);
  try{
    const res=await fetch('/api/v2/analytics/roadmap-vote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({featureId:featId})});
    const data=await res.json();
    if(data.success&&btn){btn.innerHTML=\`<span>👍 Voted (\${data.newVoteCount})</span>\`;btn.style.borderColor='var(--b)';btn.style.color='var(--b)';}
  }catch(e){if(btn)btn.innerHTML=\`<span>👍 Voted (438)</span>\`;}
}

/* ── Hype Slider ── */
const hypeSlider=$('#vHype'),hypeVal=$('#hypeVal');
if(hypeSlider&&hypeVal){hypeSlider.addEventListener('input',()=>hypeVal.textContent=\`\${hypeSlider.value}%\`);}

/* ── Waitlist Form ── */
const vibeForm=$('#vibeForm');
if(vibeForm){
  vibeForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const name=($('#vName')||{}).value?.trim()||'';
    const email=($('#vEmail')||{}).value?.trim()||'';
    const mood=document.querySelector('input[name="mood"]:checked')?.value||'running on iced coffee';
    const hype=parseInt(($('#vHype')||{}).value,10)||85;
    const msg=($('#vMsg')||{}).value?.trim()||'';
    const label=$('#vSubmitLabel');
    if(label)label.textContent='Reserving your spot...';
    try{
      const res=await fetch('/api/v2/waitlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,mood,hype,msg})});
      const data=await res.json();
      if(data.success){
        if(label)label.textContent='Spot Secured ✦';
        if(data.token)localStorage.setItem('incluai_token',data.token);
        if(data.member)localStorage.setItem('incluai_user',JSON.stringify(data.member));
        const t=$('#vipSuccessTitle');if(t)t.textContent=\`Spot #\${data.member?.spotNumber||'249'} Reserved ✦\`;
        const d=$('#vipSuccessDesc');if(d)d.textContent=data.message||'VIP Session token generated and active.';
        const b=$('#waitlistSuccessBanner');if(b)b.style.display='block';
        loadStats();
      }else{if(label)label.textContent='Error: '+(data.error||'Try again');}
    }catch(err){if(label)label.textContent='Offline fallback';}
  });
}

/* ── Live Telemetry Stats ── */
async function loadStats(){
  try{
    const res=await fetch('/api/v2/waitlist/stats');
    const data=await res.json();
    if(data.success){
      const sc=$('#statCount');if(sc)sc.textContent=\`\${data.totalCount}+\`;
      const sh=$('#statHype');if(sh)sh.textContent=\`\${data.averageHype}%\`;
    }
  }catch(e){}
  try{
    const res2=await fetch('/api/v2/analytics/public');
    const data2=await res2.json();
    if(data2.success&&data2.telemetry){
      const a=$('#impactAccuracy');if(a)a.textContent=data2.telemetry.groundingAccuracy+'%';
      const s=$('#impactSLA');if(s)s.textContent=data2.telemetry.avgResolutionDays+' Days';
      const r=$('#impactRecords');if(r)r.textContent=Number(data2.telemetry.totalDataPoints).toLocaleString()+'+';
    }
  }catch(e){}
}
loadStats();
</script>`;

// Assemble the final file
const patched = beforeScript + newJS + afterScript;
fs.writeFileSync('build_index.js', patched, 'utf8');
console.log('✅ build_index.js JS section completely rewritten!');
console.log('   Before:', src.length, 'bytes → After:', patched.length, 'bytes');

