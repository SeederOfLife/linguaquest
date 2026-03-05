// ══════════════════════════════════════════════
// DIVIDEND ENGINE
// ══════════════════════════════════════════════
function calcDividends(){
  if(!U) return;
  const now=Date.now();
  const elapsedMs=now-U.lastDivTime;
  const elapsedDays=elapsedMs/(1000*60*60*24);
  let total=0;
  ASSET_DEFS.forEach(a=>{
    const owned=U.assets[a.id]||0;
    if(owned>0){
      const invested=a.cost*owned;
      // Daily dividend rate * owned levels * elapsed days
      const div=invested*a.divRate*elapsedDays;
      // Also grow asset value slightly (simulates price appreciation)
      U.assetValues[a.id]=(U.assetValues[a.id]||0)+invested*a.growthRate*elapsedDays;
      total+=div;
    }
  });
  U.pendingDiv=(U.pendingDiv||0)+total;
  U.lastDivTime=now;
  saveU();
}

function collectDividends(){
  if(!U||U.pendingDiv<0.5) return;
  const amount=Math.floor(U.pendingDiv);
  U.coins+=amount;U.pendingDiv-=amount;
  saveU();updateTopBar();
  floatCoin($('collect-btn'),`+${amount} <span class="coin"></span>`);
  renderPortfolio();
  toast(`🌱 +${amount} <span class="coin"></span> dividendes collectés !`);
}

function getAssetWealth(){
  if(!U) return 0;
  return ASSET_DEFS.reduce((s,a)=>{
    const owned=U.assets[a.id]||0;
    if(!owned) return s;
    const base=a.cost*owned;
    const appreciated=base+(U.assetValues[a.id]||0);
    return s+appreciated;
  },0);
}

function getTotalWealth(){return Math.floor(U.coins+getAssetWealth());}

function getDailyDividend(){
  if(!U) return 0;
  return ASSET_DEFS.reduce((s,a)=>{
    const owned=U.assets[a.id]||0;
    return s+a.cost*owned*a.divRate;
  },0);
}

// ══════════════════════════════════════════════
// PORTFOLIO SCREEN
// ══════════════════════════════════════════════
function renderPortfolio(){
  if(!U) return;
  calcDividends();
  const wealth=getTotalWealth();
  const daily=getDailyDividend();
  const invested=U.totalInvested||0;
  $('wealth-total').innerHTML=`${wealth.toLocaleString()} <span class="coin"></span>`;
  $('wealth-sub').innerHTML=`+${daily.toFixed(1)} <span class="coin"></span> générés par jour · Patrimoine en croissance constante`;
  $('pf-coins').innerHTML=Math.floor(U.coins).toLocaleString()+' <span class="coin"></span>';
  $('pf-div-total').innerHTML=daily.toFixed(1)+' <span class="coin"></span>/j';
  $('pf-invested').innerHTML=invested.toLocaleString()+' <span class="coin"></span>';

  // Dividend banner
  const pending=U.pendingDiv||0;
  const db=$('div-banner');
  if(pending>=1){
    db.style.display='flex';
    $('div-amount').innerHTML=`+${Math.floor(pending)} <span class="coin"></span>`;
    $('div-banner-sub').innerHTML=`Temps écoulé depuis la dernière collecte · Taux journalier : ${daily.toFixed(1)} <span class="coin"></span>`;
    $('collect-btn').disabled=false;
  } else {db.style.display='none';}

  // Render assets
  const grid=$('assets-grid');grid.innerHTML='';
  ASSET_DEFS.forEach(a=>{
    const owned=U.assets[a.id]||0;
    const base=a.cost*owned;
    const appreciated=base+(U.assetValues[a.id]||0);
    const scaledCost=Math.round(a.cost*(1+(owned)*0.1));const canBuy=U.coins>=scaledCost;
    const pct=Math.min(100, owned*10);// visual fill: each unit = 10% up to 100%
    const dailyEarn=(a.cost*owned*a.divRate).toFixed(1);
    const growthPct=owned>0?((U.assetValues[a.id]||0)/Math.max(base,1)*100).toFixed(1):0;
    const div=document.createElement('div');
    div.className=`asset-card ${a.class}`;
    div.innerHTML=`
      <div class="asset-header">
        <div class="asset-icon">${a.icon}</div>
        <div><div class="asset-name">${a.name}</div><div class="asset-type">${a.type}</div><div class="asset-real-price" id="rp-${a.id}" style="font-size:.7rem;color:var(--accent3);margin-top:2px;">Chargement...</div></div>
        <div class="asset-value">
          <div class="asset-price">${Math.floor(appreciated)} <span class="coin"></span></div>
          <div class="asset-change">+${growthPct}% depuis achat</div>
        </div>
      </div>
      <div class="asset-progress">
        <div class="asset-progress-bar"><div class="asset-progress-fill" style="width:${pct}%;background:${a.class==='gold'?'linear-gradient(90deg,#d97706,#fbbf24)':a.class==='house'?'linear-gradient(90deg,#0891b2,#06b6d4)':a.class==='stock'?'linear-gradient(90deg,#059669,#10b981)':'linear-gradient(90deg,#6d28d9,#7c3aed)'};"></div></div>
        <div class="asset-owned"><span>${owned} unit${owned>1?"s":""}</span><span>${a.cost} <span class="coin"></span> / niveau</span></div>
      </div>
      <div class="asset-div-info">🌱 Dividende : ${a.divRate*100}%/j · Soit <strong>${dailyEarn} <span class="coin"></span>/jour</strong> au niveau actuel · Croissance : +${(a.growthRate*100).toFixed(2)}%/j</div>
      <div style="font-size:.74rem;color:var(--muted);margin:8px 0;">${a.explain}</div>
      <button class="asset-info-btn" onclick="openAssetInfo('${a.id}')">&#128202; Voir les données du marché</button>
      <div class="asset-actions">
        <button class="asset-buy-btn" onclick="buyAsset('${a.id}')" ${!canBuy?'disabled':''}>
          ${owned===0?`Acheter (${a.cost} <span class="coin"></span>)`:`+1 unité (${Math.round(a.cost*(1+owned*0.1))} <span class="coin"></span>)`}
        </button>
        ${owned>0?`<button class="asset-sell-btn" onclick="sellAsset('${a.id}')">Vendre 1 (${Math.round(a.cost*(1+(owned-1)*0.1)*0.8)} <span class="coin"></span>)</button>`:''}
        ${owned>0?`<div style="background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);border-radius:9px;padding:8px 12px;font-size:.78rem;color:var(--green);font-weight:700;">+${dailyEarn} <span class="coin"></span>/j</div>`:''}
      </div>
    `;
    grid.appendChild(div);
  });
}

function buyAsset(id){
  const a=ASSET_DEFS.find(x=>x.id===id);
  if(!a) return;
  const owned=U.assets[id]||0;
  const scaledCost=Math.round(a.cost*(1+owned*0.1));
  if(U.coins<scaledCost) return;
  U.coins-=scaledCost;
  U.assets[id]=owned+1;
  U.totalInvested=(U.totalInvested||0)+scaledCost;
  saveU();updateTopBar();
  floatCoin(document.getElementById('assets-grid'),`-${scaledCost} <span class="coin"></span>`);
  renderPortfolio();
  toast(`${a.name} x${U.assets[id]} — +${(a.divRate*100)}%/j · Prochaine unité : ${Math.round(a.cost*(1+(owned+1)*0.1))} coins`);
}

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

function sellAsset(id){
  const a = ASSET_DEFS.find(x=>x.id===id);
  if(!a) return;
  const owned = U.assets[id]||0;
  if(owned <= 0) return;
  // Sell price = 80% of what the last unit cost (simulates market spread)
  const lastCost = Math.round(a.cost*(1+(owned-1)*0.1));
  const sellPrice = Math.round(lastCost * 0.8);
  U.coins += sellPrice;
  U.assets[id] = owned - 1;
  // Reduce invested amount proportionally
  U.totalInvested = Math.max(0, (U.totalInvested||0) - lastCost);
  // Remove a bit of appreciation
  if(U.assetValues[id]) U.assetValues[id] = Math.max(0, U.assetValues[id] - lastCost*0.05);
  saveU(); updateTopBar();
  floatCoin(document.getElementById('assets-grid'), `+${sellPrice} <span class="coin"></span>`);
  renderPortfolio();
  toast(`Vendu 1 unité de ${a.name} pour ${sellPrice} coins (80% du prix d'achat)`);
}

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

  $('asset-modal').style.display = 'flex';
}

function closeAssetModal(e){
  if(!e || e.target===$('asset-modal')) $('asset-modal').style.display='none';
}
