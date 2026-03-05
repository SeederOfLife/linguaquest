// ══════════════════════════════════════════════
// STATE & STORAGE
// ══════════════════════════════════════════════
// ══════════════════════════════════════════════
// THEME & UI LANGUAGE
// ══════════════════════════════════════════════
let _uiLang = localStorage.getItem('lq_ui_lang') || (() => {
  const nav = (navigator.language||'fr').split('-')[0].toLowerCase();
  const map = {fr:'fr',en:'en',es:'es',de:'de',cs:'cs',sk:'cs',cz:'cs'};
  return map[nav] || 'fr';
})();

function setTheme(mode) {
  const themes = ['dark','light','claude'];
  const effective = mode === 'random'
    ? themes[Math.floor(Math.random() * themes.length)]
    : mode;
  localStorage.setItem('lq_theme', effective);
  document.documentElement.setAttribute('data-theme', effective);
  ['dark','light','claude'].forEach(m => {
    const b = document.getElementById('theme-btn-'+m);
    if(b) b.classList.toggle('active', m === effective);
  });
  // Random button never stays "active" — it's an action, not a state
  const rb = document.getElementById('theme-btn-random');
  if(rb) rb.classList.remove('active');
}

function initTheme() {
  const saved = localStorage.getItem('lq_theme');
  if(saved) setTheme(saved);
}

function pickTheme(mode) {
  setTheme(mode);
  navTo('auth');
}

function applyUILang() {
  const s = UI_STRINGS[_uiLang] || UI_STRINGS.fr;
  const set = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };
  set('lbl-nav-learn',     s.learn);
  set('lbl-nav-portfolio', s.portfolio);
  set('lbl-nav-shop',      s.shop);
  set('lbl-nav-profile',   s.profile);
}

function renderUILangGrid() {
  const wrap = document.getElementById('ui-lang-btns');
  if(!wrap) return;
  wrap.innerHTML = '';
  Object.entries(LANGS).forEach(([code, l]) => {
    const btn = document.createElement('button');
    btn.className = 'lang-ui-btn' + (code === _uiLang ? ' active' : '');
    btn.textContent = l.flag + ' ' + l.native;
    btn.onclick = () => { _uiLang = code; localStorage.setItem('lq_ui_lang', code); applyUILang(); renderUILangGrid(); };
    wrap.appendChild(btn);
  });
}

let U=null; // current user


// ══════════════════════════════════════════════
// SUPABASE
// ══════════════════════════════════════════════
const _SB = supabase.createClient('https://luufdddauoucmjiixrax.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1dWZkZGRhdW91Y21qaWl4cmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjg4ODAsImV4cCI6MjA4Nzk0NDg4MH0.sYP_nRJQTMTT4_2svodb8kPV2vF9ceCVkuG5CMVaLv4');

function defaultUser(name, email){
  return {
    name, email, pass: '',
    joined: Date.now(),
    xp: 0, coins: 100, sessions: 0, streak: 0, lastDay: null, chaptersCompleted: 0,
    progress: {},
    assets: {gold:0,house:0,stock:0,crypto:0},
    assetValues: {gold:0,house:0,stock:0,crypto:0},
    lastDivTime: Date.now(),
    pendingDiv: 0, totalInvested: 0,
    owned: [], avatar: '',
  };
}

// Save to Supabase (upsert) + localStorage backup
async function saveU() {
  if (!U || U.isGuest) return;
  // Always save locally first for instant response
  localStorage.setItem('lq_u_' + U.email, JSON.stringify(U));
  // Then sync to Supabase
  try {
    await _SB.from('users').upsert({
      email: U.email,
      data: U,
      updated_at: new Date().toISOString()
    }, {onConflict: 'email'});
  } catch(e) { /* offline — localStorage backup is enough */ }
}

// Load user from Supabase, fallback to localStorage
async function loadUserFromDB(email) {
  try {
    const { data, error } = await _SB.from('users').select('data').eq('email', email).single();
    if (data && !error) return data.data;
  } catch(e) {}
  // Fallback to localStorage
  const local = localStorage.getItem('lq_u_' + email);
  return local ? JSON.parse(local) : null;
}

// Legacy compat shims (keep working while migrating)
function loadUsers(){ return JSON.parse(localStorage.getItem('lq_users') || '{}'); }
function saveUsers(u){ localStorage.setItem('lq_users', JSON.stringify(u)); }
function loadCurrent(){ return JSON.parse(localStorage.getItem('lq_current') || 'null'); }
function saveCurrent(id){ localStorage.setItem('lq_current', JSON.stringify(id)); }
function clearCurrent(){ localStorage.removeItem('lq_current'); }
function defaultUser_OLD(name,email){
  return{
    name,email,pass:'',
    joined:Date.now(),
    xp:0,coins:100,sessions:0,streak:0,lastDay:null,chaptersCompleted:0,
    progress:{},
    // Portfolio
    assets:{gold:0,house:0,stock:0,crypto:0},
    assetValues:{gold:0,house:0,stock:0,crypto:0},// accumulated value growth
    lastDivTime:Date.now(),
    pendingDiv:0,
    totalInvested:0,
    // Shop
    owned:[],
    // Cosmetics
    avatar:'',
  };
}

function saveU(){if(U&&U.isGuest)return;
  const users=loadUsers();
  users[U.email]=U;
  saveUsers(users);
}


