// ══════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════
function switchTab(tab){
  document.getElementById('tab-login').classList.toggle('active',tab==='login');
  document.getElementById('tab-register').classList.toggle('active',tab==='register');
  document.getElementById('form-login').style.display=tab==='login'?'block':'none';
  document.getElementById('form-register').style.display=tab==='register'?'block':'none';
}

async function doLogin(){
  const email=$('login-email').value.trim().toLowerCase();
  const pass=$('login-pass').value;
  if(!email||!pass){showAuthErr('login','Remplis tous les champs.');return;}

  // Show loading state
  const btn=document.querySelector('#form-login .btn-primary');
  const origText=btn.textContent; btn.textContent='Connexion...'; btn.disabled=true;

  try {
    // Check localStorage first — it's always the most recently saved version
    const localRaw = localStorage.getItem('lq_u_' + email);
    const localData = localRaw ? JSON.parse(localRaw) : null;

    // Also try Supabase
    let remoteData = null;
    try {
      const {data, error} = await _SB.from('users').select('data').eq('email', email).single();
      if (!error && data) remoteData = data.data;
    } catch(e) {}

    // Pick the most recent version (by lastDivTime or joined timestamp)
    let userData = null;
    if (localData && remoteData) {
      // Use whichever was saved more recently
      userData = (localData.lastDivTime||0) >= (remoteData.lastDivTime||0) ? localData : remoteData;
    } else {
      userData = localData || remoteData;
    }

    if (!userData) {
      // Final fallback — legacy lq_users key
      const users = loadUsers();
      userData = users[email] || null;
    }

    if (!userData) { showAuthErr('login', 'Compte introuvable. Inscris-toi !'); return; }
    if (userData.pass !== btoa(pass)) { showAuthErr('login', 'Mot de passe incorrect.'); return; }

    U = userData;
    saveCurrent(U.email);
    afterLogin();
  } catch(e) {
    // Full offline fallback
    const users = loadUsers();
    if (!users[email]) { showAuthErr('login', 'Compte introuvable.'); return; }
    if (users[email].pass !== btoa(pass)) { showAuthErr('login', 'Mot de passe incorrect.'); return; }
    U = users[email]; saveCurrent(U.email); afterLogin();
  } finally {
    btn.textContent = origText; btn.disabled = false;
  }
}

async function doRegister(){
  const name=$('reg-name').value.trim();
  const email=$('reg-email').value.trim().toLowerCase();
  const pass=$('reg-pass').value;
  if(!name){showAuthErr('reg','Entrez votre prénom.');return;}
  if(!email.includes('@')){showAuthErr('reg','Email invalide.');return;}
  if(pass.length<6){showAuthErr('reg','Mot de passe trop court (min 6).');return;}

  const btn=document.querySelector('#form-register .btn-primary');
  const origText=btn.textContent; btn.textContent='Création...'; btn.disabled=true;

  try {
    // Check if email already exists in Supabase
    const {data:existing} = await _SB.from('users').select('email').eq('email',email).maybeSingle();
    if(existing){showAuthErr('reg','Cet email est déjà utilisé.');return;}
  } catch(e) {
    // Offline — check localStorage
    const users=loadUsers();
    if(users[email]){showAuthErr('reg','Cet email est déjà utilisé.');return;}
  }

  U=defaultUser(name,email); U.pass=btoa(pass);
  // Save locally immediately
  const users=loadUsers(); users[email]=U; saveUsers(users); saveCurrent(U.email);
  // Save to Supabase
  await saveU();
  afterLogin();
  btn.textContent=origText; btn.disabled=false;
  toast(`Bienvenue ${name} ! Tu reçois 100 <span class="coin"></span> de départ !`);
}

function demoLogin(){
  const users=loadUsers();
  const demo='demo'+'@'+'linguaquest.app';
  if(!users[demo]){
    U=defaultUser('Démo',demo);U.pass=btoa('demo123');U.coins=350;
    U.xp=1200;U.sessions=14;U.streak=5;U.chaptersCompleted=4;
    U.assets={gold:2,house:1,stock:3,crypto:4};
    ASSET_DEFS.forEach(a=>{U.assetValues[a.id]=a.cost*U.assets[a.id]*0.05;});
    U.totalInvested=ASSET_DEFS.reduce((s,a)=>s+a.cost*U.assets[a.id],0);
    users[demo]=U;saveUsers(users);
  } else {U=users[demo];}
  saveCurrent(U.email);afterLogin();
}

function doLogout(){U=null;clearCurrent();goTo('auth');hideChrome();}

function showAuthErr(prefix,msg){
  const id=prefix==='login'?'login-err':'reg-err';
  const el=$(id);el.textContent=msg;el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),4000);
}

function migrateUser(){
  if(!U) return;
  let changed = false;
  const set = (key, val) => { if(U[key] === undefined){ U[key] = val; changed = true; } };

  set('assets', {});
  set('assetValues', {});
  set('lessonsCompleted', {});
  set('pendingDiv', 0);
  set('lastDivTime', Date.now());
  set('progress', {});
  set('xp', 0);
  set('sessions', 0);
  set('streak', 0);
  set('chaptersCompleted', 0);

  // coins: only default to 0 if truly missing (never overwrite earned coins)
  if(U.coins === undefined){ U.coins = 0; changed = true; }

  // totalInvested: recalculate only if missing
  if(U.totalInvested === undefined){
    U.totalInvested = typeof ASSET_DEFS !== 'undefined'
      ? ASSET_DEFS.reduce((s,a) => s + a.cost*(U.assets[a.id]||0), 0) : 0;
    changed = true;
  }

  // Ensure assetValues for all known assets
  if(typeof ASSET_DEFS !== 'undefined'){
    ASSET_DEFS.forEach(a => {
      if(U.assetValues[a.id] === undefined){ U.assetValues[a.id] = 0; changed = true; }
    });
  }

  // Calculate real investor level — never reset to 1
  if(typeof INVESTOR_LEVELS !== 'undefined' && INVESTOR_LEVELS.length){
    let realLevel = 1;
    const invested = U.totalInvested || 0;
    for(const lv of INVESTOR_LEVELS){ if(invested >= lv.min) realLevel = lv.level; }
    if(U.investorLevel === undefined || U.investorLevel < realLevel){
      U.investorLevel = realLevel; changed = true;
    }
  } else {
    if(U.investorLevel === undefined){ U.investorLevel = 1; changed = true; }
  }

  // Only save if something was actually missing — don't overwrite fresh data
  if(changed) saveU();
}

let _appReady = false;
function afterLogin(){
  migrateUser();
  showChrome();
  calcDividends();
  updateTopBar();
  navTo('learn');
  // Mark app as ready AFTER init — level-up modal only fires after this
  setTimeout(()=>{ _appReady = true; }, 800);
}

function showChrome(){$('top-bar').style.display='flex';$('nav-bar').style.display='flex';}
function hideChrome(){$('top-bar').style.display='none';$('nav-bar').style.display='none';}

