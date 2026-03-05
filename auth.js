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
    // Try Supabase first
    const {data,error} = await _SB.from('users').select('data').eq('email',email).single();
    if(error || !data){
      // Fallback to localStorage
      const users=loadUsers();
      if(!users[email]){showAuthErr('login','Compte introuvable. Inscris-toi !');return;}
      if(users[email].pass!==btoa(pass)){showAuthErr('login','Mot de passe incorrect.');return;}
      U=users[email];
    } else {
      U=data.data;
      if(U.pass!==btoa(pass)){showAuthErr('login','Mot de passe incorrect.');return;}
    }
    saveCurrent(U.email);
    afterLogin();
  } catch(e) {
    // Full offline fallback
    const users=loadUsers();
    if(!users[email]){showAuthErr('login','Compte introuvable.');return;}
    if(users[email].pass!==btoa(pass)){showAuthErr('login','Mot de passe incorrect.');return;}
    U=users[email]; saveCurrent(U.email); afterLogin();
  } finally {
    btn.textContent=origText; btn.disabled=false;
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

function afterLogin(){
  showChrome();
  calcDividends();
  updateTopBar();
  navTo('learn');
}

function showChrome(){$('top-bar').style.display='flex';$('nav-bar').style.display='flex';}
function hideChrome(){$('top-bar').style.display='none';$('nav-bar').style.display='none';}

