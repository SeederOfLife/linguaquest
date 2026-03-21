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
    const userData = await loadUserFromDB(email);

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
  if(pass.length<6){showAuthErr('reg',t('forgot_short'));return;}

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

function doLogout(){U=null;clearCurrent();window.location.href='index.html';}

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

  if (U.lastNL && U.lastTL && U.lastNL !== U.lastTL) {
    // Known language pair — restore and go straight to levels
    S.nL = U.lastNL; S.tL = U.lastTL;
    setTimeout(()=>{
      // Pre-select flags in the language grid (for when user goes back)
      const ng = document.querySelector(`#native-grid [data-code="${S.nL}"]`);
      const tg = document.querySelector(`#target-grid [data-code="${S.tL}"]`);
      if(ng) ng.classList.add('selected');
      if(tg) tg.classList.add('selected');
      if(typeof syncPair==='function') syncPair();
      if(typeof syncDots==='function') syncDots();
      const ts=$('target-section'); if(ts) ts.style.opacity='1';
      // Go directly to levels
      if(typeof goToLevels==='function') goToLevels();
    }, 150);
  } else {
    // First time — show language picker
    navTo('learn');
  }

  if(typeof initSocial==='function') setTimeout(initSocial, 500);
  setTimeout(()=>{ _appReady = true; }, 900);
}

function showChrome(){$('top-bar').style.display='flex';$('nav-bar').style.display='flex';}
function hideChrome(){$('top-bar').style.display='none';$('nav-bar').style.display='none';}


// ══════════════════════════════════════════════
// SHOW / HIDE PASSWORD
// ══════════════════════════════════════════════
function togglePass(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const isHidden = inp.type === 'password';
  inp.type = isHidden ? 'text' : 'password';
  btn.textContent = isHidden ? '🙈' : '👁';
  btn.classList.toggle('visible', isHidden);
}

// ══════════════════════════════════════════════
// FORGOT PASSWORD
// ══════════════════════════════════════════════
let _forgotEmail = null;

function openForgot() {
  _forgotEmail = null;
  // Reset all steps
  document.getElementById('forgot-step-1').style.display = 'block';
  document.getElementById('forgot-step-2').style.display = 'none';
  document.getElementById('forgot-step-3').style.display = 'none';
  document.getElementById('forgot-email').value = '';
  document.getElementById('forgot-err-1').textContent = '';
  document.getElementById('forgot-err-1').classList.remove('show');
  const m = document.getElementById('forgot-modal');
  if (m) { m.style.display = 'flex'; }
}

function closeForgot(e) {
  if (e && e.target !== document.getElementById('forgot-modal')) return;
  const m = document.getElementById('forgot-modal');
  if (m) m.style.display = 'none';
}

function _forgotErr(step, msg) {
  const id = 'forgot-err-' + step;
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4000);
}

async function forgotStep1() {
  const email = document.getElementById('forgot-email').value.trim().toLowerCase();
  if (!email || !email.includes('@')) { _forgotErr(1, 'Entre un email valide.'); return; }

  const btn = document.getElementById('btn-forgot-1');
  const orig = btn.textContent; btn.textContent = t('forgot_checking'); btn.disabled = true;

  try {
    // Try Supabase first
    let userData = null;
    try {
      const { data, error } = await _SB.from('users').select('data').eq('email', email).single();
      if (data && !error) userData = data.data;
    } catch(e) {}

    // Fallback to localStorage
    if (!userData) {
      const users = loadUsers();
      if (users[email]) userData = users[email];
    }

    if (!userData) {
      _forgotErr(1, t('forgot_not_found'));
      return;
    }

    _forgotEmail = email;
    document.getElementById('forgot-found-name').textContent =
      (userData.name || 'Utilisateur') + ' · ' + email;
    document.getElementById('forgot-new-pass').value = '';
    document.getElementById('forgot-confirm-pass').value = '';
    document.getElementById('forgot-err-2').textContent = '';
    document.getElementById('forgot-err-2').classList.remove('show');
    document.getElementById('forgot-step-1').style.display = 'none';
    document.getElementById('forgot-step-2').style.display = 'block';
    setTimeout(() => document.getElementById('forgot-new-pass').focus(), 100);

  } finally {
    btn.textContent = orig; btn.disabled = false;
  }
}

async function forgotStep2() {
  if (!_forgotEmail) { openForgot(); return; }

  const newPass    = document.getElementById('forgot-new-pass').value;
  const confirmPass = document.getElementById('forgot-confirm-pass').value;

  if (newPass.length < 6) { _forgotErr(2, t('forgot_short')); return; }
  if (newPass !== confirmPass) { _forgotErr(2, t('forgot_mismatch')); return; }

  const btn = document.getElementById('btn-forgot-2');
  const orig = btn.textContent; btn.textContent = t('forgot_resetting'); btn.disabled = true;

  try {
    // Load full user data
    let userData = null;
    try {
      const { data } = await _SB.from('users').select('data').eq('email', _forgotEmail).single();
      if (data) userData = data.data;
    } catch(e) {}
    if (!userData) {
      const users = loadUsers();
      userData = users[_forgotEmail];
    }
    if (!userData) { _forgotErr(2, t('forgot_error')); return; }

    // Update password
    userData.pass = btoa(newPass);
    userData._savedAt = Date.now();

    // Save to localStorage
    const users = loadUsers();
    users[_forgotEmail] = userData;
    saveUsers(users);
    localStorage.setItem('lq_u_' + _forgotEmail, JSON.stringify(userData));

    // Save to Supabase
    try {
      await _SB.from('users').upsert({
        email: _forgotEmail,
        data: userData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' });
    } catch(e) { /* offline — localStorage saved */ }

    // Pre-fill login email field
    const loginEmail = document.getElementById('login-email');
    if (loginEmail) loginEmail.value = _forgotEmail;

    document.getElementById('forgot-step-2').style.display = 'none';
    document.getElementById('forgot-step-3').style.display = 'block';
    _forgotEmail = null;

  } finally {
    btn.textContent = orig; btn.disabled = false;
  }
}
