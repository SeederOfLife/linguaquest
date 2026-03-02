// ═══════════════════════════════════════════
// BOOT.JS — Initialisation de l'app
// Démarrage, auto-login, event listeners
// ═══════════════════════════════════════════

// ══════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════
mkStars();buildGrids();readParams();
// Auto-login if session exists
// Auto-login: Supabase first, localStorage fallback
maybeShowThemePicker();
(async function(){
  const saved=loadCurrent();
  if(saved){
    try{
      const loaded=await loadUserFromDB(saved);
      if(loaded){U=loaded;afterLogin();return;}
    }catch(e){}
    const users=loadUsers();
    if(users[saved]){U=users[saved];afterLogin();return;}
  }
})();
// Dividend tick every 60s while app is open
setInterval(()=>{if(U){calcDividends();const db=$('div-banner');if(U.pendingDiv>=1&&db) db.style.display='flex';}},60000);

// ── GUEST LOGIN ──

// ══════════════════════════════════════════════
// AUTH FUNCTIONS
// ══════════════════════════════════════════════
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

function afterLogin(){
  showChrome();
  calcDividends();
  updateTopBar();
  navTo('learn');
}

function showChrome(){
  document.getElementById('top-bar').style.display='flex';
  document.getElementById('nav-bar').style.display='flex';
}

function hideChrome(){
  document.getElementById('top-bar').style.display='none';
  document.getElementById('nav-bar').style.display='none';
}

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
})();

// ══════════════════════════════════════════════
// LANGUAGE CHANGE MODAL
// ══════════════════════════════════════════════
let _lpNative=null, _lpTarget=null;

function openLangModal(){
  _lpNative=S.nL||null;
  _lpTarget=S.tL||null;
  buildLangPicker();
  $('lang-modal').style.display='flex';
}

function closeLangModal(e){
  if(!e||e.target===$('lang-modal')) $('lang-modal').style.display='none';
}

function buildLangPicker(){
  ['lp-native','lp-target'].forEach((gid,side)=>{
    const g=$(gid); g.innerHTML='';
    Object.entries(LANGS).forEach(([code,l])=>{
      const active=side===0?(code===_lpNative):(code===_lpTarget);
      const d=document.createElement('div');
      d.className='lang-picker-item'+(active?' active':'');
      d.innerHTML=`<span class="lp-flag">${l.flag}</span><span class="lp-name">${l.name}</span>`;
      d.onclick=()=>{
        if(side===0){
          _lpNative=code;
          if(_lpTarget===code) _lpTarget=null;
        } else {
          _lpTarget=code;
          if(_lpNative===code) _lpNative=null;
        }
        buildLangPicker();
        updateLpPair();
      };
      g.appendChild(d);
    });
  });
  updateLpPair();
}

function updateLpPair(){
  const el=$('lp-pair');
  if(_lpNative&&_lpTarget&&_lpNative!==_lpTarget){
    const N=LANGS[_lpNative],T=LANGS[_lpTarget];
    el.innerHTML=`${N.flag} ${N.name} &rarr; ${T.flag} ${T.name}`;
    el.style.color='var(--accent3)';
  } else if(_lpNative===_lpTarget&&_lpNative){
    el.textContent='Choisis deux langues différentes';
    el.style.color='var(--red)';
  } else {
    el.textContent='';
  }
}

function applyLangChange(){
  if(!_lpNative||!_lpTarget||_lpNative===_lpTarget){
    toast('Choisis deux langues différentes !');
    return;
  }
  S.nL=_lpNative; S.tL=_lpTarget;
  // Reset level/chapter selection
  S.level=null; S.chap=null;
  // Update native/target grids on learn screen
  clrSel('native-grid'); clrSel('target-grid');
  const nn=document.querySelector('#native-grid [data-code="'+S.nL+'"]');
  const tn=document.querySelector('#target-grid [data-code="'+S.tL+'"]');
  if(nn) nn.classList.add('selected');
  if(tn) tn.classList.add('selected');
  $('target-section').style.opacity='1';
  syncPair(); syncDots();
  $('lang-modal').style.display='none';
  const N=LANGS[S.nL],T=LANGS[S.tL];
  toast(N.flag+' '+N.name+' → '+T.flag+' '+T.name+' sélectionné !');
  navTo('learn');
}

// ══════════════════════════════════════════════
// TARGET / TIME SIMULATOR
// ══════════════════════════════════════════════
function updateTarget(){
  const slider=$('target-slider');
  if(!slider) return;
  const target=parseInt(slider.value);

  // Format target value
  $('target-val').innerHTML=target.toLocaleString()+' <span class="coin"></span>';

  const coins=Math.floor(U?U.coins:0);
  const daily=getDailyDividend();
  const wealth=getTotalWealth();
  const missing=Math.max(0, target-wealth);
  const pct=Math.min(100, Math.round(wealth/target*100));

  // Missing
  const misEl=$('tr-missing');
  if(misEl) misEl.innerHTML=(missing>0?missing.toLocaleString()+' <span class="coin"></span>':'<span style="color:var(--green)">Objectif atteint !</span>');

  // Daily
  const dEl=$('tr-daily');
  if(dEl) dEl.innerHTML=daily>0?daily.toFixed(1)+' <span class="coin"></span>':'<span style="color:var(--muted)">Aucun actif</span>';

  // Time
  const tEl=$('tr-time');
  if(tEl){
    if(missing<=0){
      tEl.innerHTML='<span style="color:var(--green)">&#10003; Atteint !</span>';
    } else if(daily<=0){
      tEl.textContent="Investis d'abord";
      tEl.style.color='var(--muted)';
    } else {
      const days=missing/daily;
      if(days<1) tEl.textContent=Math.round(days*24)+'h';
      else if(days<30) tEl.textContent=Math.round(days)+' jours';
      else if(days<365) tEl.textContent=Math.round(days/30.4)+' mois';
      else tEl.textContent=(days/365).toFixed(1)+' ans';
      tEl.style.color='var(--accent3)';
    }
  }

  // Percent
  const pEl=$('tr-pct');
  if(pEl) pEl.textContent=pct+'%';

  // Timeline
  const fill=$('tl-fill');
  const cursor=$('tl-cursor');
  const nowLbl=$('tl-now');
  if(fill) fill.style.width=pct+'%';
  if(cursor){ cursor.style.left=pct+'%'; }
  if(nowLbl){ nowLbl.style.left=pct+'%'; }
}

// updateTarget is now called inside the market data wrapper below

// ══════════════════════════════════════════════
// REAL MARKET DATA
// ══════════════════════════════════════════════
// Maps asset id → real-world ticker/id for price display
const MARKET_IDS = {
  gold:   { source:'yahoo',  ticker:'GC=F',    label:'Or (XAU)',   unit:'USD/oz'  },
  house:  { source:'yahoo',  ticker:'VNQ',     label:'REIT Index', unit:'USD'     },
  stock:  { source:'yahoo',  ticker:'SPY',     label:'S&P 500 ETF',unit:'USD'     },
  crypto: { source:'coingecko', id:'bitcoin',  label:'Bitcoin',    unit:'USD'     },
};

// Cache prices to avoid hammering APIs
const _priceCache = {};
let _lastFetch = 0;

async function fetchMarketPrices() {
  const now = Date.now();
  if (now - _lastFetch < 5 * 60 * 1000 && Object.keys(_priceCache).length > 0) {
    updatePriceDisplay(); return;
  }
  _lastFetch = now;

  // ── CoinGecko via cors proxy (Bitcoin) ──
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true', {mode:'cors'});
    if(r.ok){
      const d = await r.json();
      if(d.bitcoin) _priceCache.crypto = {price: d.bitcoin.usd, change: d.bitcoin.usd_24h_change};
    }
  } catch(e) {}

  // ── Open Exchange / Metals API for Gold via corsproxy.io ──
  // Use AllOrigins as CORS proxy for Yahoo Finance
  const tickers = [{t:'GC%3DF',id:'gold'},{t:'SPY',id:'stock'},{t:'VNQ',id:'house'}];
  for(const {t,id} of tickers){
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${t}?interval=1d&range=2d`;
      const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const r = await fetch(proxy);
      if(r.ok){
        const wrapper = await r.json();
        const d = JSON.parse(wrapper.contents);
        const res = d?.chart?.result?.[0];
        if(res){
          const meta = res.meta;
          const price = meta.regularMarketPrice;
          const prev = meta.chartPreviousClose || meta.previousClose;
          const change = prev ? ((price-prev)/prev*100) : 0;
          _priceCache[id] = {price, change};
        }
      }
    } catch(e) {}
  }

  updatePriceDisplay();
}

function updatePriceDisplay() {
  Object.entries(MARKET_IDS).forEach(([id, info]) => {
    const el = document.getElementById('rp-' + id);
    if (!el) return;
    const cached = _priceCache[id];
    if (!cached) {
      el.textContent = info.label + ' — données indisponibles';
      el.style.color = 'var(--muted)';
      return;
    }
    const changeStr = (cached.change >= 0 ? '+' : '') + cached.change.toFixed(2) + '%';
    const changeColor = cached.change >= 0 ? 'var(--green)' : 'var(--red)';
    el.innerHTML = `${info.label}: <strong>$${cached.price.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</strong> <span style="color:${changeColor}">${changeStr} 24h</span>`;
    el.style.color = 'var(--accent3)';
  });
}

// Wrap renderPortfolio to also fetch prices
const __origRP = renderPortfolio;
renderPortfolio = function() {
  __origRP();
  setTimeout(updateTarget, 0);
  fetchMarketPrices();
};

// ── GLOBAL ENTER KEY: Suivant / Vérifier ──
document.addEventListener('keydown', function(e){
  if(e.key !== 'Enter') return;
  const activeScreen = document.querySelector('.screen.active');
  if(!activeScreen || activeScreen.id !== 'screen-game') return;
  const btnNext = $('btn-next');
  const btnCheck = $('btn-check');
  // If "Suivant" is visible → go next
  if(btnNext && btnNext.style.display !== 'none'){
    e.preventDefault();
    nextQ();
    return;
  }
  // If "Vérifier" is visible and we're NOT in fill mode (fill handles its own Enter)
  if(btnCheck && btnCheck.style.display !== 'none' && S.curType !== 'fill'){
    e.preventDefault();
    checkCurrentQ();
  }
});


// ══════════════════════════════════════════════
// ASSET INFO MODAL
// ══════════════════════════════════════════════
let _currentAssetId = null;

function openAssetInfo(id){
  const a = ASSET_DEFS.find(x=>x.id===id);
  if(!a) return;
  _currentAssetId = id;
  const owned = U.assets[id]||0;
  const base = a.cost*owned;
  const appreciated = base + (U.assetValues[id]||0);
  const pv = appreciated - base;
  const daily = (a.cost*owned*a.divRate).toFixed(1);
  const mInfo = {
    gold:   {ticker:'GC=F (Or/USD)',  what:"L'or physique est un actif refuge. Les banques centrales en détiennent des tonnes. Sa valeur monte en période d'incertitude économique."},
    house:  {ticker:'VNQ (REIT ETF)', what:"L'immobilier génère des loyers. Le VNQ est un fonds qui possède des centaines d'immeubles. Tu touches ta part des loyers comme dividende."},
    stock:  {ticker:'SPY (S&P 500)',  what:"Le S&P 500 regroupe les 500 plus grandes entreprises américaines. Apple, Microsoft, Amazon… Investir dedans = posséder un morceau de l'économie mondiale."},
    crypto: {ticker:'BTC/USD',        what:"Bitcoin est la première cryptomonnaie. Sa quantité est limitée à 21 millions. De plus en plus d'institutions financières l'intègrent à leur bilan."},
  };
  const info = mInfo[id]||{ticker:'',what:''};

  $('amod-icon').innerHTML = a.icon;
  $('amod-name').textContent = a.name;
  $('amod-type').textContent = a.type + ' · ' + info.ticker;
  $('amod-owned').textContent = owned + ' unité' + (owned>1?'s':'');
  $('amod-val').innerHTML = Math.floor(appreciated) + ' <span class="coin"></span>';
  $('amod-daily').innerHTML = daily + ' <span class="coin"></span>/j';
  const pvColor = pv >= 0 ? 'var(--green)' : 'var(--red)';
  $('amod-pv').innerHTML = `<span style="color:${pvColor}">${pv>=0?'+':''}${Math.floor(pv)} <span class="coin"></span></span>`;
  $('amod-explain').textContent = info.what;

  // Live price
  const cached = _priceCache[id];
  if(cached){
    $('amod-price').textContent = '$' + cached.price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
    const chg = cached.change;
    $('amod-change').innerHTML = `<span style="color:${chg>=0?'var(--green)':'var(--red)'}">${chg>=0?'+':''}${chg.toFixed(2)}% sur 24h</span>`;
    $('amod-ticker').textContent = info.ticker;
  } else {
    $('amod-price').textContent = 'Prix non disponible';
    $('amod-change').textContent = 'Active la connexion pour voir le prix live';
  }

  // Wire buy/sell buttons
  const scaledCost = Math.round(a.cost*(1+owned*0.1));
  $('amod-buy-btn').innerHTML = 'Acheter (' + scaledCost + ')';
  $('amod-buy-btn').onclick = ()=>{buyAsset(id); openAssetInfo(id);};
  $('amod-buy-btn').disabled = U.coins < scaledCost;
  const sellPrice = Math.round(a.cost*(1+(owned-1)*0.1)*0.8);
  $('amod-sell-btn').innerHTML = owned>0 ? 'Vendre ('+sellPrice+')' : 'Vendre';
  $('amod-sell-btn').onclick = ()=>{if(owned>0){sellAsset(id);closeAssetModal();}};
  $('amod-sell-btn').disabled = owned <= 0;
  $('asset-modal').style.display='flex';
}

function closeAssetModal(){
  $('asset-modal').style.display='none';
}

function copyUrl(){
  const url = S._shareUrl || location.href;
  navigator.clipboard.writeText(url).then(()=>toast('Lien copié !')).catch(()=>toast(url));
}

function closeQR(e){
  if(!e || e.target===e.currentTarget || e.currentTarget.id==='qr-modal'){
    $('qr-modal').style.display='none';
  }
}

function mkStars(){
  const c=$('stars');
  for(let i=0;i<160;i++){
    const s=document.createElement('div');
    s.className='star';
    const z=Math.random()*2.4+.4;
    s.style.cssText=`width:${z}px;height:${z}px;top:${Math.random()*100}%;left:${Math.random()*100}%;--d:${2+Math.random()*4}s;--o:${.06+Math.random()*.5};`;
    c.appendChild(s);
  }
}

function readParams(){
  const p=new URLSearchParams(location.search);
  const n=p.get('n'),t=p.get('t'),l=p.get('l'),c=p.get('c');
  if(n&&t&&l&&c&&LANGS[n]&&LANGS[t]&&n!==t&&CHAPTERS[l]){
    S.nL=n;S.tL=t;S.level=l;S.chap=c;
  }
}

// ══════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════
mkStars();
buildGrids();
readParams();

// Init theme instantly
initTheme();

// Init UI language
(function(){
  const savedLang = localStorage.getItem('lq_ui_lang');
  if(savedLang){ setUILang(savedLang); }
  else { setUILang(detectBrowserLang()); }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ()=>{
    if(localStorage.getItem('lq_theme')==='auto') _applyTheme('auto');
  });
})();

// Auto-login: Supabase first, localStorage fallback
maybeShowThemePicker();
(async function(){
  const saved=loadCurrent();
  if(saved){
    try{
      const loaded=await loadUserFromDB(saved);
      if(loaded){U=loaded;afterLogin();return;}
    }catch(e){}
    const users=loadUsers();
    if(users[saved]){U=users[saved];afterLogin();return;}
  }
})();

// Wire static buttons
wire('btn-guest', guestLogin);



function openAssetModal(id){
  var a = ASSET_DEFS.find(function(x){return x.id===id;});
  if(!a || !U) return;
  var owned = U.assets[id]||0;
  var scaledCost = Math.round(a.cost * Math.pow(1.1, owned));
  if($('amod-name')) $('amod-name').textContent = a.name;
  if($('amod-icon')) $('amod-icon').innerHTML = a.icon;
  if($('amod-type')) $('amod-type').textContent = a.type;
  if($('amod-owned')) $('amod-owned').textContent = owned;
  if($('amod-cost')) $('amod-cost').textContent = scaledCost;
  if($('amod-desc')) $('amod-desc').textContent = a.desc;
  if($('amod-explain')) $('amod-explain').textContent = a.explain||'';
  var divDaily = owned>0 ? (a.cost*owned*(1+(owned-1)*0.1)*a.divRate).toFixed(2) : '0';
  if($('amod-div')) $('amod-div').textContent = divDaily;
  var buyBtn = $('amod-buy-btn');
  if(buyBtn){
    buyBtn.textContent = 'Acheter ('+scaledCost+')';
    buyBtn.disabled = U.coins < scaledCost;
    buyBtn.onclick = function(){ buyAsset(id); closeAssetModal(); };
  }
  var sellPrice = Math.round(a.cost*(1+(owned-1)*0.1)*0.8);
  var sellBtn = $('amod-sell-btn');
  if(sellBtn){
    sellBtn.innerHTML = owned>0 ? 'Vendre ('+sellPrice+')' : 'Vendre';
    sellBtn.onclick = function(){if(owned>0){sellAsset(id);closeAssetModal();}};
    sellBtn.disabled = owned <= 0;
  }
  $('asset-modal').style.display='flex';
}
