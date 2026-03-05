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
  const html = (id, val) => { const e = document.getElementById(id); if(e) e.innerHTML = val; };
  const ph = (id, val) => { const e = document.getElementById(id); if(e) e.placeholder = val; };

  // NAV
  set('lbl-nav-learn', s.nav_learn);
  set('lbl-nav-portfolio', s.nav_portfolio);
  set('lbl-nav-shop', s.nav_shop);
  set('lbl-nav-profile', s.nav_profile);

  // THEME PICKER
  set('lbl-tagline', s.tagline);
  set('lbl-pick-theme', s.pick_theme);
  set('lbl-theme-dark', s.theme_dark);
  set('lbl-theme-light', s.theme_light);
  set('lbl-theme-claude', s.theme_claude);
  set('lbl-theme-random', s.theme_random);

  // AUTH
  set('lbl-tagline-auth', s.tagline);
  set('tab-login', s.tab_login);
  set('tab-register', s.tab_register);
  set('lbl-login-pass', s.lbl_pass);
  set('btn-do-login', s.btn_login);
  set('btn-demo', s.demo_link);
  set('lbl-reg-name', s.lbl_reg_name);
  set('lbl-reg-email', s.lbl_reg_email);
  set('lbl-reg-pass', s.lbl_reg_pass);
  set('btn-do-register', s.btn_register);
  set('lbl-or-guest', s.or_guest);
  set('lbl-guest-btn', s.guest_btn);
  set('lbl-guest-warn', s.guest_warn);
  ph('login-email', s.ph_login_email);
  ph('login-pass', s.ph_login_pass);
  ph('reg-name', s.ph_reg_name);
  ph('reg-email', s.ph_reg_email);
  ph('reg-pass', s.ph_reg_pass);

  // LEARN
  set('lbl-learn-tagline', s.learn_tagline);
  set('lbl-i-speak', s.i_speak);
  set('lbl-i-learn', s.i_learn);
  set('btn-start', s.btn_start);

  // LEVELS
  set('lbl-levels-sub', s.levels_sub);

  // GAME SELECT
  set('lbl-mix-badge', s.mix_badge);
  set('lbl-gtype-mixed', s.gtype_mixed);
  set('lbl-gdesc-mixed', s.gdesc_mixed);
  set('lbl-gtype-quiz', s.gtype_quiz);
  set('lbl-gdesc-quiz', s.gdesc_quiz);
  set('lbl-gtype-fill', s.gtype_fill);
  set('lbl-gdesc-fill', s.gdesc_fill);
  set('lbl-gtype-match', s.gtype_match);
  set('lbl-gdesc-match', s.gdesc_match);
  set('lbl-reward-mixed', s.reward_mixed);
  set('lbl-reward-quiz', s.reward_quiz);
  set('lbl-reward-fill', s.reward_fill);
  set('lbl-reward-match', s.reward_match);

  // GAME
  ph('fill-input', s.ph_fill);
  set('lbl-your-sent', s.your_sent);
  set('lbl-words-avail', s.words_avail);
  set('lbl-pairs', s.pairs);
  set('btn-check', s.btn_check);
  set('btn-next', s.btn_next);
  set('btn-skip', s.btn_continue);

  // RESULTS
  set('lbl-coins-won', s.coins_won);
  set('lbl-coins-hint', s.coins_hint);
  set('lbl-r-correct', s.r_correct);
  set('lbl-r-wrong', s.r_wrong);
  set('btn-replay', s.btn_replay);
  set('btn-r-chapters', s.btn_r_chapters);
  set('btn-r-invest', s.btn_r_invest);

  // PORTFOLIO
  set('lbl-wealth-hero', s.wealth_hero);
  set('lbl-liquid-coins', s.liquid_coins);
  set('lbl-div-day', s.div_day);
  set('lbl-invested', s.invested);
  set('lbl-div-avail', s.div_avail);
  set('collect-btn', s.btn_collect);
  set('lbl-div-explain-title', s.div_explain_title);
  html('lbl-div-explain-body', s.div_explain_body);
  set('lbl-target-title', s.target_title);
  set('lbl-target-sub', s.target_sub);
  set('lbl-target-obj', s.target_obj);
  set('lbl-tr-missing', s.tr_missing);
  set('lbl-tr-daily', s.tr_daily);
  set('lbl-tr-time', s.tr_time);
  set('lbl-tr-progress', s.tr_progress);
  set('lbl-tl-target', s.tl_target);
  set('tl-now', s.tl_now);
  set('lbl-assets-title', s.assets_title);

  // SHOP
  set('lbl-shop-title', s.shop_title);
  set('lbl-shop-sub', s.shop_sub);
  set('lbl-shop-coins-lbl', s.shop_coins_lbl);

  // PROFILE
  set('lbl-ps-xp', s.ps_xp);
  set('lbl-ps-coins', s.ps_coins);
  set('lbl-ps-sessions', s.ps_sessions);
  set('lbl-ps-streak', s.ps_streak);
  set('lbl-ps-chapters', s.ps_chapters);
  set('lbl-ps-wealth', s.ps_wealth);
  set('lbl-appearance', s.appearance);
  set('lbl-lang-ui', s.lang_ui);
  set('theme-btn-dark', s.theme_dark);
  set('theme-btn-light', s.theme_light);
  set('theme-btn-claude', s.theme_claude);
  set('theme-btn-random', s.theme_random);
  set('btn-change-lang', s.btn_change_lang);
  set('btn-logout', s.btn_logout);

  // QR MODAL
  set('lbl-qr-title', s.qr_title);
  set('btn-qr-copy', s.btn_qr_copy);
  set('btn-qr-close', s.btn_close);

  // LANG CHANGE MODAL
  set('lbl-langmodal-title', s.langmodal_title);
  set('lbl-lm-speak', s.lm_speak);
  set('lbl-lm-learn', s.lm_learn);
  set('btn-lm-apply', s.btn_apply);
  set('btn-lm-cancel', s.btn_cancel);

  // ASSET INFO MODAL
  set('lbl-amod-market', s.amod_market);
  set('lbl-amod-position', s.amod_position);
  set('lbl-amod-units', s.amod_units);
  set('lbl-amod-value', s.amod_value);
  set('lbl-amod-daily', s.amod_daily);
  set('lbl-amod-pv', s.amod_pv);
  set('amod-buy-btn', s.btn_buy);
  set('amod-sell-btn', s.btn_sell);
  set('btn-amod-close', s.btn_close);

  // Finance Academy — static lesson screen labels
  set('lbl-academy-title', s.academy_title);
  // back button in lesson screen uses lesson_back from current lang
  const _lessonBack = document.getElementById('lesson-done-back');
  if(_lessonBack) _lessonBack.textContent = s.lesson_back;
  // Re-render academy grid if portfolio screen is active
  const pfScreen = document.getElementById('screen-portfolio');
  if(pfScreen && pfScreen.classList.contains('active')){
    if(typeof renderAcademy === 'function') renderAcademy();
    if(typeof renderInvestorLevel === 'function') renderInvestorLevel();
  }
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
    owned: [], avatar: '', lessonsCompleted: {}, investorLevel: 1,
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


