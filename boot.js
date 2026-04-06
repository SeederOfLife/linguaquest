// ══════════════════════════════════════════════
// UI HELPERS
// ══════════════════════════════════════════════
function dirLbl(){const N=LANGS[S.nL],T=LANGS[S.tL];return`${N.flag} ${N.native}  →  ${T.flag} ${T.native}`;}
function shuf(a){return[...a].sort(()=>Math.random()-.5);}
function $(id){return document.getElementById(id);}
function sT(id,v){const e=$(id);if(e)e.textContent=v;}

function toast(msg){const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),3000);}
function floatCoin(anchor,text){
  const el=document.createElement('div');el.className='float-coin';el.innerHTML=text;
  const rect=anchor?.getBoundingClientRect?anchor.getBoundingClientRect():{top:window.innerHeight/2,left:window.innerWidth/2};
  el.style.cssText=`top:${rect.top}px;left:${rect.left}px;`;
  document.body.appendChild(el);setTimeout(()=>el.remove(),1300);
}

function confetti(){const cols=['#7c3aed','#ec4899','#06b6d4','#f59e0b','#10b981'];for(let i=0;i<55;i++){const el=document.createElement('div');el.className='confetti-piece';const s=5+Math.random()*9;el.style.cssText=`left:${Math.random()*100}%;width:${s}px;height:${s*1.4}px;background:${cols[i%5]};animation-duration:${1.3+Math.random()*1.3}s;animation-delay:${Math.random()*.4}s;border-radius:${Math.random()>.5?'50%':'3px'};`;document.body.appendChild(el);setTimeout(()=>el.remove(),3200);}}

function mkStars(){const c=$('stars');for(let i=0;i<130;i++){const s=document.createElement('div');s.className='star';const z=Math.random()*2.4+.4;s.style.cssText=`width:${z}px;height:${z}px;top:${Math.random()*100}%;left:${Math.random()*100}%;--d:${2+Math.random()*4}s;--o:${.06+Math.random()*.5};`;c.appendChild(s);}}

// URL params (shared quiz)
function readParams(){const p=new URLSearchParams(location.search);const n=p.get('n'),t=p.get('t'),l=p.get('l'),c=p.get('c');if(n&&t&&l&&c&&LANGS[n]&&LANGS[t]&&n!==t&&CHAPTERS[l]){S.nL=n;S.tL=t;S.level=l;S.chap=c;}}

// ══════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════
mkStars();buildGrids();readParams();
initTheme();
applyUILang();
// Auto-login if session exists
// Auto-login: Supabase first, localStorage fallback
(async function(){
  const saved = loadCurrent();

  if(saved){
    // 1. Try localStorage first — instant
    const usersLocal = loadUsers();
    if(usersLocal && usersLocal[saved]){
      U = usersLocal[saved];
      afterLogin();
      // Refresh from Supabase silently in background
      loadUserFromDB(saved).then(fresh=>{
        if(fresh && U){ U=fresh; updateTopBar(); }
      }).catch(()=>{});
      return;
    }

    // 2. Show loading screen while trying Supabase
    const loadEl = document.getElementById('screen-loading');
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    if(loadEl) loadEl.classList.add('active');

    try{
      // Timeout after 5s
      const loaded = await Promise.race([
        loadUserFromDB(saved),
        new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),5000))
      ]);
      if(loaded){ U=loaded; afterLogin(); return; }
    }catch(e){}

    // 3. Nothing worked — clear bad session, show auth
    clearCurrent();
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    const authEl = document.getElementById('screen-auth');
    if(authEl) authEl.classList.add('active');
    return;
  }

  // No saved session — show auth screen directly (no redirect)
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const authEl = document.getElementById('screen-auth');
  if(authEl){
    authEl.classList.add('active');
  } else {
    // Fallback: auth screen might be in index.html
    window.location.href='index.html';
  }
})();
// Dividend tick every 60s while app is open
setInterval(()=>{if(U){calcDividends();const db=$('div-banner');if(U.pendingDiv>=1&&db) db.style.display='flex';}},60000);

// ── GUEST LOGIN ──
function guestLogin(){
  U=defaultUser('Invité','guest@local');
  U.isGuest=true;
  afterLogin();
  toast('👤 Mode invité — la progression ne sera pas sauvegardée');
}

// ── WIRE BUTTONS THAT CAN'T USE onclick (avoids CF injection issues) ──
(function(){
  function wire(id,fn){var el=document.getElementById(id);if(el)el.addEventListener('click',fn);}
  wire('btn-guest', guestLogin);
  wire('btn-demo',  demoLogin);
})();

