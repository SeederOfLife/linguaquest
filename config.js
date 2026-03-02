// ═══════════════════════════════════════════
// CONFIG.JS — Thème, Langue UI, Supabase
// ═══════════════════════════════════════════

// Supabase client
var _SB = null;
(function(){
  try{
    if(window.supabase){
      _SB = window.supabase.createClient(
        'https://luufdddauoucmjiixrax.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1dWZkZGRhdW91Y21qaWl4cmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjg4ODAsImV4cCI6MjA4Nzk0NDg4MH0.sYP_nRJQTMTT4_2svodb8kPV2vF9ceCVkuG5CMVaLv4'
      );
    }
  }catch(e){ console.warn('Supabase init failed:', e); }
})();

const UI_STRINGS = {
  fr:{
    learn:'Apprendre', portfolio:'Portfolio', shop:'Boutique', profile:'Profil',
    login:'Se connecter', register:"S'inscrire", logout:'Se déconnecter',
    start:'Commencer', levels:'Niveaux', chapters:'Chapitres',
    iSpeak:'Je parle', iLearn:'Je veux apprendre',
    settings:'Apparence', langChange:'Changer de langue',
    guest:'Continuer en invité',
    verify:'Vérifier', next:'Suivant', skip:'Passer',
    correct:'Correct !', wrong:'Pas tout à fait !', almost:'Presque !',
  },
  en:{
    learn:'Learn', portfolio:'Portfolio', shop:'Shop', profile:'Profile',
    login:'Log in', register:'Sign up', logout:'Log out',
    start:'Start', levels:'Levels', chapters:'Chapters',
    iSpeak:'I speak', iLearn:'I want to learn',
    settings:'Appearance', langChange:'Change language',
    guest:'Continue as guest',
    verify:'Check', next:'Next', skip:'Skip',
    correct:'Correct!', wrong:'Not quite!', almost:'Almost!',
  },
  es:{
    learn:'Aprender', portfolio:'Portafolio', shop:'Tienda', profile:'Perfil',
    login:'Iniciar sesión', register:'Registrarse', logout:'Cerrar sesión',
    start:'Comenzar', levels:'Niveles', chapters:'Capítulos',
    iSpeak:'Hablo', iLearn:'Quiero aprender',
    settings:'Apariencia', langChange:'Cambiar idioma',
    guest:'Continuar como invitado'',
    verify:'Verificar', next:'Siguiente', skip:'Saltar',
    correct:'¡Correcto!', wrong:'¡No exactamente!', almost:'¡Casi!',
  },
  de:{
    learn:'Lernen', portfolio:'Portfolio', shop:'Shop', profile:'Profil',
    login:'Anmelden', register:'Registrieren', logout:'Abmelden',
    start:'Starten', levels:'Stufen', chapters:'Kapitel',
    iSpeak:'Ich spreche', iLearn:'Ich möchte lernen',
    settings:'Erscheinungsbild', langChange:'Sprache ändern',
    guest:'Als Gast fortfahren'',
    verify:'Prüfen', next:'Weiter', skip:'Überspringen',
    correct:'Richtig!', wrong:'Nicht ganz!', almost:'Fast!',
  },
  cs:{
    learn:'Učit se', portfolio:'Portfolio', shop:'Obchod', profile:'Profil',
    login:'Přihlásit se', register:'Registrovat se', logout:'Odhlásit se',
    start:'Začít', levels:'Úrovně', chapters:'Kapitoly',
    iSpeak:'Mluvím', iLearn:'Chci se naučit',
    settings:'Vzhled', langChange:'Změnit jazyk',
    guest:'Pokračovat jako host'',
    verify:'Zkontrolovat', next:'Další', skip:'Přeskočit',
    correct:'Správně!', wrong:'Skoro!', almost:'Téměř!',
  },
};

let _uiLang = 'fr';


function detectBrowserLang(){
  const nav = navigator.language || navigator.userLanguage || 'fr';
  const code = nav.split('-')[0].toLowerCase();
  const map = {fr:'fr',en:'en',es:'es',de:'de',cs:'cs',sk:'cs',cz:'cs'};
  return map[code] || 'fr';
}


function setUILang(code){
  if(!UI_STRINGS[code]) code='fr';
  _uiLang = code;
  localStorage.setItem('lq_ui_lang', code);
  applyUILang();
}


function t(key){ return (UI_STRINGS[_uiLang]||UI_STRINGS.fr)[key] || key; }


function applyUILang(){
  // Nav bar
  const navMap = {learn:'learn',portfolio:'portfolio',shop:'shop',profile:'profile'};
  const navIcons = {learn:'A',portfolio:'$',shop:'&#9733;',profile:'&#9673;'};
  Object.entries(navMap).forEach(([key,id])=>{
    const el = document.getElementById('nav-'+id);
    if(el) el.innerHTML = `<span class="ni" style="font-size:1.1rem;font-weight:900;color:inherit;">${navIcons[key]}</span>${t(key)}`;
  });
  // Buttons
  const btnNext = $('btn-next'); if(btnNext) btnNext.textContent = t('next')+' →';
  const btnCheck = $('btn-check'); if(btnCheck) btnCheck.textContent = t('verify')+' ✓';
  const btnSkip = $('btn-skip'); if(btnSkip) btnSkip.textContent = t('skip');
  // Auth tabs
  const tabLogin = $('tab-login'); if(tabLogin) tabLogin.textContent = t('login');
  const tabReg = $('tab-register'); if(tabReg) tabReg.textContent = t('register');
  // Guest/demo buttons
  const btnGuest = $('btn-guest'); if(btnGuest) btnGuest.innerHTML = '&#128100; '+t('guest');
}


function setTheme(mode){
  localStorage.setItem('lq_theme', mode);
  _applyTheme(mode);
  // Update active buttons
  ['light','dark','claude','auto'].forEach(function(m){
    var b=document.getElementById('theme-btn-'+m);
    if(b){b.classList.toggle('active',m===mode);}
  });
}


function _applyTheme(mode){
  const root = document.documentElement;
  if(mode==='auto'){
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', mode);
  }
}


function initTheme(){
  const saved = localStorage.getItem('lq_theme') || 'light';
  setTheme(saved);
}


function maybeShowThemePicker(){
  if(!localStorage.getItem('lq_theme')){
    goTo('theme-picker');
  }
}


function pickTheme(mode){
  localStorage.setItem('lq_theme', mode);
  _applyTheme(mode);
  goTo('auth');
}

