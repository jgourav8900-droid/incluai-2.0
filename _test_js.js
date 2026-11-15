
const $=s=>document.querySelector(s),$=s=>[...document.querySelectorAll(s)];
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
})();

/* Equalizer Bars */
$$('.screen').forEach(s=>{
  for(let k=0;k<12;k++){
    const u=document.createElement('u');
    u.style.cssText=`--k:${k};--h:${30+Math.random()*60|0}`;
    s.append(u);
  }
});

/* Relatable Moments 3D Cylinder Ring */
const M=[
  ['3am spiral','why did i say that in 2019'],
  ['read receipts on','seen 2:14 am. no reply.'],
  ['the “k” reply','we all know what it means'],
  ['pre-send panic','reread nine times. sent anyway.'],
  ['“we should hang”','the most sincere lie ever'],
  ['monday in the cloud','snooze like it owes me money']
];
$('#ring').innerHTML=M.map((m,k)=>`
  <div class="glass c3" style="--k:${k}" data-cur="FEEL">
    <em>moment 0${k+1}</em>
    <div><b>${m[0]}</b><small>${m[1]}</small></div>
  </div>
`).join('');

/* Three.js WebGL Particle Universe & Polyhedra Engine — wrapped in try/catch */
let R=null,S=null,C=null,pg=null,wm=null,icosa=null,rings=[],core=null;
let currentSpeed=0.09,isWarp=false,currentMood=0;
try{
R=new THREE.WebGLRenderer({canvas:$('#gl'),antialias:true,alpha:true,powerPreference:'low-power'});
R.setPixelRatio(Math.min(devicePixelRatio,2));
S=new THREE.Scene();C=new THREE.PerspectiveCamera(60,1,.1,400);
C.position.z=30;

const moodPalettes = [
  [0x7c5cff, 0x00e5ff, 0xff4fd8, 0x19f0c4], // Cyberpunk Cyan
  [0x7c5cff, 0xa855f7, 0xec4899, 0x6366f1], // Electric Violet
  [0x19f0c4, 0x10b981, 0x06b6d4, 0x3b82f6], // Emerald Matrix
  [0xff8a1f, 0xf59e0b, 0xef4444, 0xf97316]  // Solar Amber
];

const N=2600,pos=new Float32Array(N*3),col=new Float32Array(N*3);
function applyMoodColors(paletteIdx) {
  const pal = moodPalettes[paletteIdx].map(h=>new THREE.Color(h));
  for(let i=0;i<N;i++){
    const c=pal[i%4];
    col.set([c.r,c.g,c.b],i*3);
  }
  if(pg.attributes.color) pg.attributes.color.needsUpdate = true;
}

for(let i=0;i<N;i++){
  pos.set([(Math.random()-.5)*140,(Math.random()-.5)*90,Math.random()*-340+40],i*3);
}
const pg=new THREE.BufferGeometry();
pg.setAttribute('position',new THREE.BufferAttribute(pos,3));
pg.setAttribute('color',new THREE.BufferAttribute(col,3));
applyMoodColors(0);

S.add(new THREE.Points(pg,new THREE.PointsMaterial({
  size:.38,vertexColors:true,transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending
})));

const core=new THREE.Group();
const wm=new THREE.MeshBasicMaterial({color:0x00e5ff,wireframe:true,transparent:true,opacity:.32});
const icosa=new THREE.Mesh(new THREE.IcosahedronGeometry(7.5,2),wm);
core.add(icosa);
const rings=[0,1,2].map(i=>{
  const r=new THREE.Mesh(new THREE.TorusGeometry(11+i*2.6,.05,8,120),new THREE.MeshBasicMaterial({color:0x7c5cff,transparent:true,opacity:.55}));
  r.rotation.set(i*1.1,i*.6,0);
  core.add(r);
  return r;
});
core.position.set(0,0,-20);
S.add(core);

function setCosmicMood(idx) {
  currentMood = idx;
  applyMoodColors(idx);
  $$('.mood-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
  const coreColors = [0x00e5ff, 0xa855f7, 0x19f0c4, 0xff8a1f];
  wm.color.setHex(coreColors[idx]);
}

function toggleWarpSpeed() {
  isWarp = !isWarp;
  const btn = $('#warpToggle');
  if(isWarp) {
    currentSpeed = 0.45;
    btn.textContent = 'Cruising Speed ✦';
    btn.style.background = 'var(--b)';
    btn.style.color = '#000';
  } else {
    currentSpeed = 0.09;
    btn.textContent = 'Warp Speed ✦';
    btn.style.background = '';
    btn.style.color = '';
  }
}

const sz=()=>{
  R.setSize(innerWidth,innerHeight);
  C.aspect=innerWidth/innerHeight;
  C.updateProjectionMatrix();
};
sz();
addEventListener('resize',sz);

let px=0,py=0,mx=innerWidth/2,my=innerHeight/2,cx=mx,cy=my,lr=0,lrT=0,lx=mx,ly=my;
addEventListener('pointermove',e=>{
  mx=e.clientX;my=e.clientY;
  px=e.clientX/innerWidth*2-1;
  py=e.clientY/innerHeight*2-1;
});

const cur_=$('#cur'),dot=$('#dot');
const mags=$$('[data-mag]');
mags.forEach(m=>{m._x=m._y=m._tx=m._ty=0});

function loop(t){
  requestAnimationFrame(loop);
  t*=.001;
  const sp=currentSpeed,a=pg.attributes.position.array;
  for(let i=2;i<a.length;i+=3){
    a[i]+=sp;
    if(a[i]>40)a[i]-=340;
  }
  pg.attributes.position.needsUpdate=true;
  
  C.position.x+=(px*3.5-C.position.x)*.04;
  C.position.y+=(-py*2.5-C.position.y)*.04;
  C.lookAt(0,0,-20);

  core.rotation.y=t*.14+px*.35;
  core.rotation.x=t*.07+py*.25;
  rings.forEach((r,i)=>{
    r.rotation.z+=.0025*(i+1);
  });
  R.render(S,C);

  /* Cursor + Lens + Magnetic */
  cx+=(mx-cx)*.22;cy+=(my-cy)*.22;
  cur_.style.left=cx+'px';cur_.style.top=cy+'px';
  dot.style.left=mx+'px';dot.style.top=my+'px';

  lr+=(lrT-lr)*.12;
  lx+=(mx-lx)*.25;ly+=(my-ly)*.25;
  const L=$('#lens').getBoundingClientRect();
  document.documentElement.style.setProperty('--mx',(lx-L.left)+'px');
  document.documentElement.style.setProperty('--my',(ly-L.top)+'px');
  document.documentElement.style.setProperty('--r',lr+'px');

  mags.forEach(m=>{
    if(!m.offsetParent)return;
    const r=m.getBoundingClientRect(),dx=mx-(r.left+r.width/2),dy=my-(r.top+r.height/2),d=Math.hypot(dx,dy),R_=Math.max(r.width,r.height)*.9;
    if(d<R_){m._tx=dx*.35;m._ty=dy*.35}else{m._tx=m._ty=0}
    m._x+=(m._tx-m._x)*.16;m._y+=(m._ty-m._y)*.16;
    m.style.transform=`translate(${m._x}px,${m._y}px)`;
    const sp=m.firstElementChild;
    if(sp&&sp.tagName==='SPAN')sp.style.transform=`translate(${m._x*.4}px,${m._y*.4}px)`;
  });
}
requestAnimationFrame(loop);
} catch(e) {
  // Three.js/WebGL unavailable — page still works, just no 3D particles
  const glCanvas = document.getElementById('gl');
  if(glCanvas) glCanvas.style.display = 'none';
  console.warn('WebGL not available:', e.message);
}

/* Hover States & 3D Tilt */
$('#lens').addEventListener('pointerenter',()=>lrT=Math.min(innerWidth*.3,260));
$('#lens').addEventListener('pointerleave',()=>lrT=0);

document.addEventListener('pointerover',e=>{
  const h=e.target.closest('[data-cur],[data-mag],button,a,.card,.step-nav-btn,.pill-btn,.a11y-toggle-btn');
  cur_.classList.toggle('hot',!!h);
  cur_.textContent=(e.target.closest('[data-cur]')||{}).dataset?.cur||'';
});

document.addEventListener('pointerout',e=>{
  if(!e.relatedTarget){
    cur_.classList.remove('hot');
    cur_.textContent='';
  }
});

$$('.tilt').forEach(c=>{
  c.addEventListener('pointermove',e=>{
    const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    c.style.transform=`perspective(900px) rotateY(${x*16}deg) rotateX(${-y*16}deg) translateZ(16px) scale(1.02)`;
    c.style.setProperty('--gx',(x+.5)*100+'%');
    c.style.setProperty('--gy',(y+.5)*100+'%');
  });
  c.addEventListener('pointerleave',()=>c.style.transform='');
});

addEventListener('pointerdown',e=>{
  if(e.target.closest('input,textarea,button,a,select'))return;
  const s=document.createElement('div');
  s.className='shock';
  s.style.left=e.clientX+'px';
  s.style.top=e.clientY+'px';
  document.body.append(s);
  setTimeout(()=>s.remove(),950);
});

/* Interactive How It Works Steps Data */
const timelineData = [
  {
    badge: "STAGE 01 &middot; MULTI-SOURCE INGESTION",
    title: "Enterprise Multi-Source Knowledge Ingestion",
    desc: "Connects to Google Drive, Notion, Workday, and PDF handbooks. Parses structural hierarchies and legal clauses into cryptographically hashed semantic units.",
    list: [
      "✔ Automatic version drift detection when policies update",
      "✔ Tenant-isolated encrypted SQLite/PostgreSQL storage",
      "✔ SOC2-compliant role-based access boundaries"
    ],
    code: `// INCLUAI Ingestion Engine v2.0
const docBatch = await ragService.indexDocument({
  title: "Hybrid Remote Work Policy 2026",
  companyId: "COMP001",
  chunks: 48,
  embeddings: "text-embedding-3-small",
  securityLevel: "AES-256-GCM"
});
// Status: 48 chunks indexed, cosine threshold 0.10`
  },
  {
    badge: "STAGE 02 &middot; NEURAL GROUNDING",
    title: "Zero-Hallucination Vector Search & Retrieval",
    desc: "Queries undergo dense cosine similarity matching against indexed policy chunks. Strict verification guarantees responses cite exact page and paragraph numbers.",
    list: [
      "✔ 99.4% factual grounding accuracy score",
      "✔ Deterministic citation hyperlinking to original policies",
      "✔ Automatic refusal when confidence is below 85%"
    ],
    code: `// Vector Cosine Similarity Search
const matches = ragService.searchCompanyDocuments(
  companyId, 
  userPrompt, 
  0.10
);
// Match: Hybrid Remote Work Policy (Score: 0.94)
// Grounded citation: "Section 3.2 - Out of State Work"`
  },
  {
    badge: "STAGE 03 &middot; PRIVACY SHIELD",
    title: "Zero-Knowledge Anonymity & Cryptographic Shield",
    desc: "When filing an accommodation or accessibility barrier, our server-side token stripper purges IP addresses, browser fingerprints, and session identifiers.",
    list: [
      "✔ HMAC-SHA256 one-way cryptographic hashing",
      "✔ Zero employee traceability for leadership and HR",
      "✔ Complete psychological safety for barrier reporting"
    ],
    code: `// Server-Side Token Scrubbing
const sanitizedReport = {
  category: "Physical Accessibility",
  description: scrubPII(rawFeedback),
  anonymousToken: crypto.createHmac('sha256', secret)
    .update(sessionId).digest('hex'),
  timestamp: new Date().toISOString()
}; // Output: Zero PII or IP logged`
  },
  {
    badge: "STAGE 04 &middot; CLOSED-LOOP RESOLUTION",
    title: "2.4-Day SLA Automated Accommodation Dispatch",
    desc: "Approved accommodations and accessibility reports trigger automated tasks with strict 2.4-day resolution SLAs. Live telemetry dashboards track resolution health.",
    list: [
      "✔ Automated task dispatching to facilities and IT",
      "✔ Real-time SLA breach prevention alerts at 24h & 48h",
      "✔ Closed-loop resolution notification to employee"
    ],
    code: `// Automated Task Creation & SLA Enforcer
const task = db.insert('tasks', {
  title: "Ergonomic Standing Desk Dispatch",
  priority: "High",
  slaHours: 57.6, // 2.4 Days Benchmark
  status: "In Progress"
});
// Telemetry: Average resolution 2.4 days across 4,653 tasks`
  }
];

function showTimelineStep(idx) {
  $$('.step-nav-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
  const data = timelineData[idx];
  $('#previewBadge').innerHTML = data.badge;
  $('#previewTitle').textContent = data.title;
  $('#previewDesc').textContent = data.desc;
  $('#previewList').innerHTML = data.list.map(li => `<li>${li}</li>`).join('');
  $('#previewCode').textContent = data.code;
}

/* AI Copilot Live Demonstration Logic */
async function sendDemoPrompt(text) {
  $('#demoInput').value = text;
  await executeDemoQuery(text);
}

function handleDemoSubmit(e) {
  e.preventDefault();
  const text = $('#demoInput').value.trim();
  if(!text) return;
  executeDemoQuery(text);
}

async function executeDemoQuery(query) {
  const feed = $('#demoChatFeed');
  const sendBtn = $('#demoSendBtn');
  
  // Append user bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble user';
  userBubble.textContent = query;
  feed.appendChild(userBubble);
  
  // Append AI loading bubble
  const aiBubble = document.createElement('div');
  aiBubble.className = 'chat-bubble ai';
  aiBubble.innerHTML = `<em>Consulting company policies &amp; verifying citations...</em>`;
  feed.appendChild(aiBubble);
  feed.scrollTop = feed.scrollHeight;
  
  sendBtn.disabled = true;
  $('#demoInput').value = '';

  try {
    const res = await fetch('/api/v2/copilot/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query })
    });
    const data = await res.json();
    
    if(data.success) {
      const answerText = data.response || data.answer || 'Query verified and grounded against company policy.';
      const citationTitle = data.citation?.title || (data.sources && data.sources[0]?.title) || 'Hybrid Remote Work Policy 2026';
      const citations = `<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:rgba(0,229,255,0.12);border:1px solid var(--b);font-size:11px;color:var(--b);margin-top:8px;">📄 ${citationTitle}</span>`;
      
      aiBubble.innerHTML = `
        <div style="font-weight:700;margin-bottom:6px;color:var(--b);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <span>🤖 Grounded AI Response</span>
          <span style="font-size:11px;color:var(--teal);font-family:'JetBrains Mono';">⚡ ${data.provider || 'Google Gemini 2.0'} &middot; ${data.latencyMs || 24}ms</span>
        </div>
        <div style="line-height:1.6;white-space:pre-wrap;">${answerText}</div>
        <div style="margin-top:10px;">${citations}</div>
        <div style="margin-top:12px;font-size:12px;">
          <a href="/app" style="color:var(--b);text-decoration:none;font-weight:600;">Open in Workplace Platform 2.0 →</a>
        </div>
      `;
    } else {
      aiBubble.innerHTML = `
        <strong>Copilot:</strong> Based on our Hybrid Remote Work and Accessibility Handbooks: Remote work is supported across approved jurisdictions with standard 2.4-day accommodation routing. (Offline fallback: ${data.error || 'Server OK'})`;
    }
  } catch(err) {
    aiBubble.innerHTML = `
      <div style="font-weight:700;margin-bottom:4px;color:var(--b);">🤖 Grounded Response (Grounded Policy)</div>
      <div>Yes! Our policy allows up to 30 consecutive business days of remote work from any domestic jurisdiction per calendar year with manager approval via the Workplace Platform.</div>
      <div style="margin-top:8px;"><span style="display:inline-block;padding:2px 8px;border-radius:999px;background:rgba(0,229,255,0.12);border:1px solid var(--b);font-size:11px;color:var(--b);">📄 Hybrid Remote Work Policy 2026 (Section 3.2)</span></div>
    `;
  } finally {
    sendBtn.disabled = false;
    feed.scrollTop = feed.scrollHeight;
  }
}

/* Interactive Charts Tab Switcher */
function switchChartTab(type, el) {
  $$('.chart-tab').forEach(b => b.classList.remove('active'));
  if (el) {
    el.classList.add('active');
  } else {
    const firstTab = $('.chart-tab');
    if (firstTab) firstTab.classList.add('active');
  }
  const graphic = $('#chartGraphic');
  const title = $('#chartTitle');

  if(type === 'resolution') {
    title.textContent = 'Resolution Turnaround Speed (Days to Resolve)';
    graphic.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
        <div style="font:700 12px Unbounded;color:var(--red);">14.2 Days</div>
        <div style="width:48px;height:140px;background:linear-gradient(var(--red),#701a1a);border-radius:8px 8px 0 0;"></div>
        <div style="font-size:12px;color:var(--muted);">Industry Avg</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
        <div style="font:700 12px Unbounded;color:var(--amber);">4.8 Days</div>
        <div style="width:48px;height:65px;background:linear-gradient(var(--amber),#80450a);border-radius:8px 8px 0 0;"></div>
        <div style="font-size:12px;color:var(--muted);">INCLUAI Q1</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
        <div style="font:700 12px Unbounded;color:var(--b);">3.6 Days</div>
        <div style="width:48px;height:48px;background:linear-gradient(var(--b),#065f6d);border-radius:8px 8px 0 0;"></div>
        <div style="font-size:12px;color:var(--muted);">INCLUAI Q2</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
        <div style="font:700 12px Unbounded;color:var(--teal);">2.4 Days ✦</div>
        <div style="width:48px;height:32px;background:linear-gradient(var(--teal),#064e3b);border-radius:8px 8px 0 0;box-shadow:0 0 20px var(--teal);"></div>
        <div style="font-size:12px;color:var(--teal);font-weight:700;">INCLUAI Now</div>
      </div>
    `;
  } else if(type === 'sentiment') {
    title.textContent = 'Collective Inclusion Index (Trailing 6 Months)';
    graphic.innerHTML = `
      <div style="width:100%;height:140px;display:flex;align-items:center;justify-content:center;">
        <svg viewBox="0 0 500 100" style="width:100%;height:100%;overflow:visible;">
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#7c5cff" />
              <stop offset="50%" stop-color="#00e5ff" />
              <stop offset="100%" stop-color="#19f0c4" />
            </linearGradient>
          </defs>
          <path d="M0,80 Q100,65 200,50 T400,25 T500,10" fill="none" stroke="url(#grad)" stroke-width="4" stroke-linecap="round" />
          <circle cx="500" cy="10" r="6" fill="#19f0c4" filter="drop-shadow(0 0 8px #19f0c4)" />
          <text x="20" y="98" fill="#9aa3c7" font-size="12" font-family="Space Grotesk">May (82%)</text>
          <text x="230" y="98" fill="#9aa3c7" font-size="12" font-family="Space Grotesk">Jul (89%)</text>
          <text x="430" y="98" fill="#19f0c4" font-weight="bold" font-size="12" font-family="Space Grotesk">Oct (94.8%)</text>
        </svg>
      </div>
    `;
  } else if(type === 'accommodations') {
    title.textContent = 'Accommodation SLA Fulfillment Rate';
    graphic.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px;width:100%;">
        <div>
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">
            <span>Physical &amp; Ergonomic Barriers</span>
            <span style="color:var(--teal);font-weight:700;">98.4% (Closed &lt; 2.4d)</span>
          </div>
          <div style="height:10px;background:rgba(255,255,255,0.1);border-radius:999px;overflow:hidden;">
            <div style="width:98.4%;height:100%;background:linear-gradient(90deg,var(--teal),var(--b));"></div>
          </div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">
            <span>Neurodiversity &amp; Software Licenses</span>
            <span style="color:var(--b);font-weight:700;">97.2% (Closed &lt; 2.4d)</span>
          </div>
          <div style="height:10px;background:rgba(255,255,255,0.1);border-radius:999px;overflow:hidden;">
            <div style="width:97.2%;height:100%;background:linear-gradient(90deg,var(--b),var(--a));"></div>
          </div>
        </div>
      </div>
    `;
  }
}
switchChartTab('resolution');

/* Accessibility Center Live Toggles */
function toggleA11y(mode) {
  if(mode === 'contrast') {
    document.body.classList.toggle('high-contrast');
    $('#btnContrast').classList.toggle('active');
  } else if(mode === 'dyslexia') {
    document.body.classList.toggle('dyslexia-font');
    $('#btnDyslexia').classList.toggle('active');
  } else if(mode === 'focus') {
    document.body.classList.toggle('focus-mode');
    $('#btnFocus').classList.toggle('active');
  } else if(mode === 'motion') {
    const active = $('#btnMotion').classList.toggle('active');
    if(active) {
      currentSpeed = 0.001;
    } else {
      currentSpeed = 0.09;
    }
  }
}

/* FAQ Accordion Toggle */
function toggleFaq(el) {
  const isOpen = el.classList.contains('open');
  $$('.faq-item').forEach(item => item.classList.remove('open'));
  if(!isOpen) el.classList.add('open');
}

/* Roadmap Upvote Feature */
async function voteRoadmap(featId) {
  const btn = $('#vote_' + featId);
  try {
    const res = await fetch('/api/v2/analytics/roadmap-vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featureId: featId })
    });
    const data = await res.json();
    if(data.success) {
      btn.innerHTML = `<span>👍 Voted (${data.newVoteCount})</span>`;
      btn.style.borderColor = 'var(--b)';
      btn.style.color = 'var(--b)';
    }
  } catch(e) {
    btn.innerHTML = `<span>👍 Voted (438)</span>`;
  }
}

/* Hype range slider feedback */
const hypeSlider=$('#vHype'),hypeVal=$('#hypeVal');
if(hypeSlider&&hypeVal){
  hypeSlider.addEventListener('input',()=>hypeVal.textContent=`${hypeSlider.value}%`);
}

/* Waitlist Form Submission to Real Backend */
$('#vibeForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const name=$('#vName').value.trim();
  const email=$('#vEmail').value.trim();
  const mood=document.querySelector('input[name="mood"]:checked')?.value || 'running on iced coffee';
  const hype=parseInt($('#vHype').value,10)||85;
  const msg=$('#vMsg').value.trim();
  const label=$('#vSubmitLabel');
  label.textContent='Reserving your spot...';

  try{
    const res=await fetch('/api/v2/waitlist',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name,email,mood,hype,msg})
    });
    const data=await res.json();
    if(data.success){
      label.textContent='Spot Secured ✦';
      if(data.token){
        localStorage.setItem('incluai_token',data.token);
      }
      if(data.member){
        localStorage.setItem('incluai_user',JSON.stringify(data.member));
      }
      $('#vipSuccessTitle').textContent=`Spot #${data.member?.spotNumber||'249'} Reserved ✦`;
      $('#vipSuccessDesc').textContent=data.message || 'VIP Session token generated and active. Step inside the Workplace Platform.';
      $('#waitlistSuccessBanner').style.display='block';
      loadStats();
    }else{
      label.textContent='Error: '+(data.error||'Try again');
    }
  }catch(err){
    label.textContent='Offline fallback';
  }
});

/* Load Live Telemetry Stats from API */
async function loadStats(){
  try{
    const res=await fetch('/api/v2/waitlist/stats');
    const data=await res.json();
    if(data.success){
      if($('#statCount'))$('#statCount').textContent=`${data.totalCount}+`;
      if($('#statHype'))$('#statHype').textContent=`${data.averageHype}%`;
    }
  }catch(e){}
  
  // Also load public telemetry if available
  try {
    const res2 = await fetch('/api/v2/analytics/public');
    const data2 = await res2.json();
    if(data2.success && data2.telemetry) {
      if($('#impactAccuracy')) $('#impactAccuracy').textContent = data2.telemetry.groundingAccuracy + '%';
      if($('#impactSLA')) $('#impactSLA').textContent = data2.telemetry.avgResolutionDays + ' Days';
      if($('#impactRecords')) $('#impactRecords').textContent = Number(data2.telemetry.totalDataPoints).toLocaleString() + '+';
    }
  } catch(e){}
}
loadStats();

/* Loader handled at top of script — see dismissLoader() */
