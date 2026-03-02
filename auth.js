// ═══════════════════════════════════════════
// AUTH.JS — Authentification & stockage
// Login, Register, Supabase sync, localStorage
// ═══════════════════════════════════════════

var U = null; // Utilisateur courant


function switchTab(tab){
  document.getElementById('tab-login').classList.toggle('active',tab==='login');
  document.getElementById('tab-register').classList.toggle('active',tab==='register');
  document.getElementById('form-login').style.display=tab==='login'?'block':'none';
  document.getElementById('form-register').style.display=tab==='register'?'block':'none';
}


function showAuthErr(prefix,msg){
  const id=prefix==='login'?'login-err':'reg-err';
  const el=document.getElementById(id);
  if(!el) return;
  el.textContent=msg;el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),4000);
}


async function doLogin(){
  const email=document.getElementById('login-email').value.trim().toLowerCase();
  const pass=document.getElementById('login-pass').value;
  if(!email||!pass){showAuthErr('login','Remplis tous les champs.');return;}
  const btn=document.querySelector('#form-login .btn-primary');
  if(btn){const orig=btn.textContent;btn.textContent='Connexion...';btn.disabled=true;
    setTimeout(()=>{btn.textContent=orig;btn.disabled=false;},4000);}
  try{
    const {data,error}=await _SB.from('users').select('data').eq('email',email).single();
    if(error||!data){
      const users=loadUsers();
      if(!users[email]){showAuthErr('login','Compte introuvable. Inscris-toi !');return;}
      if(users[email].pass!==btoa(pass)){showAuthErr('login','Mot de passe incorrect.');return;}
      U=users[email];
    } else {
      U=data.data;
      if(U.pass!==btoa(pass)){showAuthErr('login','Mot de passe incorrect.');return;}
    }
    saveCurrent(U.email);afterLogin();
  } catch(e){
    const users=loadUsers();
    if(!users[email]){showAuthErr('login','Compte introuvable.');return;}
    if(users[email].pass!==btoa(pass)){showAuthErr('login','Mot de passe incorrect.');return;}
    U=users[email];saveCurrent(U.email);afterLogin();
  }
}


async function doRegister(){
  const name=document.getElementById('reg-name').value.trim();
  const email=document.getElementById('reg-email').value.trim().toLowerCase();
  const pass=document.getElementById('reg-pass').value;
  if(!name){showAuthErr('reg','Entrez votre prénom.');return;}
  if(!email.includes('@')){showAuthErr('reg','Email invalide.');return;}
  if(pass.length<6){showAuthErr('reg','Mot de passe trop court (min 6).');return;}
  const btn=document.querySelector('#form-register .btn-primary');
  if(btn){const orig=btn.textContent;btn.textContent='Création...';btn.disabled=true;
    setTimeout(()=>{btn.textContent=orig;btn.disabled=false;},4000);}
  try{
    const {data:existing}=await _SB.from('users').select('email').eq('email',email).maybeSingle();
    if(existing){showAuthErr('reg','Cet email est déjà utilisé.');return;}
  } catch(e){
    const users=loadUsers();
    if(users[email]){showAuthErr('reg','Cet email est déjà utilisé.');return;}
  }
  U=defaultUser(name,email);U.pass=btoa(pass);
  const users=loadUsers();users[email]=U;saveUsers(users);saveCurrent(U.email);
  await saveU();
  afterLogin();
  toast('🎉 Bienvenue '+name+' ! Tu reçois 100 pièces de départ !');
}


function doLogout(){
  U=null;clearCurrent();
  goTo('auth');hideChrome();
}


function guestLogin(){
  U=defaultUser('Invité','guest@local');
  U.isGuest=true;
  afterLogin();
  toast('👤 Mode invité — la progression ne sera pas sauvegardée');
}


function defaultUser(name, email){
  return {
    name: name, email: email, joined: Date.now(),
    coins: 100, xp: 0, streak: 0, sessions: 0,
    chaptersCompleted: 0, lastSession: null,
    progress: {}, assets: {gold:0,house:0,stock:0,crypto:0},
    assetValues: {}, totalInvested: 0, pendingDiv: 0,
    lastDivTime: Date.now(), owned: [], pass: ''
  };
}


function loadUsers(){
  try{ return JSON.parse(localStorage.getItem('lq_users')||'{}'); }catch(e){ return {}; }
}


function saveUsers(u){ localStorage.setItem('lq_users', JSON.stringify(u)); }


function loadCurrent(){ return localStorage.getItem('lq_current'); }


function saveCurrent(email){ localStorage.setItem('lq_current', email); }


function clearCurrent(){ localStorage.removeItem('lq_current'); }


async function saveU(){
  if(!U) return;
  const users = loadUsers();
  users[U.email] = U;
  saveUsers(users);
  if(_SB){
    try{
      await _SB.from('users').upsert({email:U.email, data:U}, {onConflict:'email'});
    }catch(e){}
  }
}


async function loadUserFromDB(email){
  if(!_SB) return null;
  try{
    const {data,error} = await _SB.from('users').select('data').eq('email',email).single();
    if(!error && data) return data.data;
  }catch(e){}
  return null;
}

