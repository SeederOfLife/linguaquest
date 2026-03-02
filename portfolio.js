// ═══════════════════════════════════════════
// PORTFOLIO.JS — Actifs & Dividendes
// Assets, marché en temps réel, revenus passifs
// ═══════════════════════════════════════════

const _priceCache = {};

let _currentAssetId = null;

const MARKET_IDS = {
// ═══════════════════════════════════════════
// PORTFOLIO.JS — Actifs & Dividendes
// Assets, marché en temps réel, revenus passifs
// ═══════════════════════════════════════════

const _priceCache = {};

let _currentAssetId = null;

const MARKET_IDS = {
  gold:   { source:'yahoo',  ticker:'GC=F',    label:'Or (XAU)',   unit:'USD/oz' },
  house:  { source:'yahoo',  ticker:'VNQ',     label:'REIT Index', unit:'USD'    },
  stock:  { source:'yahoo',  ticker:'SPY',     label:'S&P 500 ETF',unit:'USD'    },
  crypto: { source:'coingecko', id:'bitcoin',  label:'Bitcoin',    unit:'USD'    },
};

function calcDividends(){
  if(!U) return;
  var now = Date.now();
  var elapsed = (now - (U.lastDivTime||now)) / 1000;
  if(elapsed < 1) return;
  U.lastDivTime = now;
  var total = 0;
  ASSET_DEFS.forEach(function(a){
    var owned = U.assets[a.id]||0;
    if(owned > 0){
      var val = a.cost * owned * (1 + (owned-1)*0.1);
      total += val * a.divRate * elapsed / 86400;
    }
  });
  U.pendingDiv = (U.pendingDiv||0) + total;
}


function collectDiv(){
  if(!U || U.pendingDiv < 1) return;
  var amt = Math.floor(U.pendingDiv);
  U.coins += amt;
  U.pendingDiv -= amt;
  saveU();
  updateTopBar();
  renderPortfolio();
  toast('💰 +'+amt+' pièces de dividendes !');
  floatCoin('+'+amt);
}


function getTotalWealth(){
  if(!U) return 0;
  return Math.round(ASSET_DEFS.reduce(function(s,a){
    var owned=U.assets[a.id]||0;
    return s + a.cost*owned*(1+(owned-1)*0.1);
  },0));
}


function buyAsset(id){
  if(!U) return;
  var a = ASSET_DEFS.find(function(x){return x.id===id;});
  if(!a) return;
  var owned = U.assets[id]||0;
  var cost = Math.round(a.cost * Math.pow(1.1, owned));
  if(U.coins < cost){ toast('Pas assez de pièces !'); return; }
  U.coins -= cost;
  U.assets[id] = owned + 1;
  saveU(); updateTopBar(); renderPortfolio();
  toast(a.icon||a.name+' acheté !');
  floatCoin('-'+cost);
}


function sellAsset(id){
  if(!U) return;
  var a = ASSET_DEFS.find(function(x){return x.id===id;});
  if(!a) return;
  var owned = U.assets[id]||0;
  if(owned <= 0) return;
  var sellPrice = Math.round(a.cost * Math.pow(1.1, owned-1) * 0.8);
  U.coins += sellPrice;
  U.assets[id] = owned - 1;
  saveU(); updateTopBar(); renderPortfolio();
  toast('Vendu pour '+sellPrice+' pièces');
  floatCoin('+'+sellPrice);
}


function renderPortfolio(){
  if(!U) return;
  calcDividends();
  var tw = getTotalWealth();
  if($('wealth-total')) $('wealth-total').textContent = tw;
  if($('portfolio-coins')) $('portfolio-coins').textContent = Math.floor(U.coins);
  var pending = Math.floor(U.pendingDiv||0);
  var divBanner = $('div-banner');
  if(divBanner) divBanner.style.display = pending >= 1 ? 'flex' : 'none';
  if($('div-amount')) $('div-amount').textContent = pending;
  var grid = $('assets-grid');
  if(!grid) return;
  grid.innerHTML = '';
  ASSET_DEFS.forEach(function(a){
    var owned = U.assets[a.id]||0;
    var cost = Math.round(a.cost * Math.pow(1.1, owned));
    var dailyDiv = owned>0 ? (a.cost*owned*(1+(owned-1)*0.1)*a.divRate).toFixed(2) : '0';
    var card = document.createElement('div');
    card.className = 'asset-card '+a.class;
    var buyDisabled = U.coins < cost ? ' disabled' : '';
    card.innerHTML =
      '<div class="asset-header">' +
        '<div class="asset-icon">' + a.icon + '</div>' +
        '<div style="flex:1">' +
          '<div style="font-weight:800">' + a.name + '</div>' +
          '<div style="font-size:.75rem;color:var(--muted)">' + a.type + '</div>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<div class="asset-price">×' + owned + '</div>' +
          '<div style="font-size:.7rem;color:var(--green)">+' + dailyDiv + '/j</div>' +
        '</div>' +
      '</div>' +
      '<div class="asset-progress-bar"><div class="asset-progress-fill" style="width:' + Math.min(owned*10,100) + '%"></div></div>' +
      '<div style="display:flex;gap:8px;margin-top:10px">' +
        '<button class="asset-buy-btn" data-buy="' + a.id + '" style="flex:1;padding:8px;border:none;border-radius:10px;font-family:Nunito;font-weight:800;font-size:.82rem;cursor:pointer;background:var(--accent);color:white;"' + buyDisabled + '>Acheter (' + cost + ')</button>' +
        '<button class="asset-info-btn" data-info="' + a.id + '" style="padding:8px 12px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:transparent;color:var(--muted);font-family:Nunito;font-weight:700;font-size:.8rem;cursor:pointer;">ℹ</button>' +
      '</div>';
    card.querySelector('[data-buy]').addEventListener('click', function(){ buyAsset(this.dataset.buy); });
    card.querySelector('[data-info]').addEventListener('click', function(){ if(openAssetModal) openAssetModal(this.dataset.info); });
    grid.appendChild(card);
  });
}


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


function closeAssetModal(){
  $('asset-modal').style.display='none';
}



function calcDividends(){
  if(!U) return;
  var now = Date.now();
  var elapsed = (now - (U.lastDivTime||now)) / 1000;
  if(elapsed < 1) return;
  U.lastDivTime = now;
  var total = 0;
  ASSET_DEFS.forEach(function(a){
    var owned = U.assets[a.id]||0;
    if(owned > 0){
      var val = a.cost * owned * (1 + (owned-1)*0.1);
      total += val * a.divRate * elapsed / 86400;
    }
  });
  U.pendingDiv = (U.pendingDiv||0) + total;
}


function collectDiv(){
  if(!U || U.pendingDiv < 1) return;
  var amt = Math.floor(U.pendingDiv);
  U.coins += amt;
  U.pendingDiv -= amt;
  saveU();
  updateTopBar();
  renderPortfolio();
  toast('💰 +'+amt+' pièces de dividendes !');
  floatCoin('+'+amt);
}


function getTotalWealth(){
  if(!U) return 0;
  return Math.round(ASSET_DEFS.reduce(function(s,a){
    var owned=U.assets[a.id]||0;
    return s + a.cost*owned*(1+(owned-1)*0.1);
  },0));
}


function buyAsset(id){
  if(!U) return;
  var a = ASSET_DEFS.find(function(x){return x.id===id;});
  if(!a) return;
  var owned = U.assets[id]||0;
  var cost = Math.round(a.cost * Math.pow(1.1, owned));
  if(U.coins < cost){ toast('Pas assez de pièces !'); return; }
  U.coins -= cost;
  U.assets[id] = owned + 1;
  saveU(); updateTopBar(); renderPortfolio();
  toast(a.icon||a.name+' acheté !');
  floatCoin('-'+cost);
}


function sellAsset(id){
  if(!U) return;
  var a = ASSET_DEFS.find(function(x){return x.id===id;});
  if(!a) return;
  var owned = U.assets[id]||0;
  if(owned <= 0) return;
  var sellPrice = Math.round(a.cost * Math.pow(1.1, owned-1) * 0.8);
  U.coins += sellPrice;
  U.assets[id] = owned - 1;
  saveU(); updateTopBar(); renderPortfolio();
  toast('Vendu pour '+sellPrice+' pièces');
  floatCoin('+'+sellPrice);
}


function renderPortfolio(){
  if(!U) return;
  calcDividends();
  var tw = getTotalWealth();
  if($('wealth-total')) $('wealth-total').textContent = tw;
  if($('portfolio-coins')) $('portfolio-coins').textContent = Math.floor(U.coins);
  var pending = Math.floor(U.pendingDiv||0);
  var divBanner = $('div-banner');
  if(divBanner) divBanner.style.display = pending >= 1 ? 'flex' : 'none';
  if($('div-amount')) $('div-amount').textContent = pending;
  var grid = $('assets-grid');
  if(!grid) return;
  grid.innerHTML = '';
  ASSET_DEFS.forEach(function(a){
    var owned = U.assets[a.id]||0;
    var cost = Math.round(a.cost * Math.pow(1.1, owned));
    var dailyDiv = owned>0 ? (a.cost*owned*(1+(owned-1)*0.1)*a.divRate).toFixed(2) : '0';
    var card = document.createElement('div');
    card.className = 'asset-card '+a.class;
    card.innerHTML =
      '<div class="asset-header">'+
        '<div class="asset-icon">'+a.icon+'</div>'+
        '<div style="flex:1">'+
          '<div style="font-weight:800">'+a.name+'</div>'+
          '<div style="font-size:.75rem;color:var(--muted)">'+a.type+'</div>'+
        '</div>'+
        '<div style="text-align:right">'+
          '<div class="asset-price">×'+owned+'</div>'+
          '<div style="font-size:.7rem;color:var(--green)">+'+dailyDiv+'/j</div>'+
        '</div>'+
      '</div>'+
      '<div class="asset-progress-bar"><div class="asset-progress-fill" style="width:'+(Math.min(owned*10,100))+'%"></div></div>'+
      '<div style="display:flex;gap:8px;margin-top:10px">'+
        '<button class="asset-buy-btn" style="flex:1;padding:8px;border:none;border-radius:10px;font-family:Nunito;font-weight:800;font-size:.82rem;cursor:pointer;background:var(--accent);color:white;" onclick="buyAsset(''+a.id+'')" '+(U.coins<cost?'disabled':'')+'>Acheter ('+cost+')</button>'+
        '<button onclick="openAssetModal && openAssetModal(''+a.id+'')" style="padding:8px 12px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:transparent;color:var(--muted);font-family:Nunito;font-weight:700;font-size:.8rem;cursor:pointer;">ℹ</button>'+
      '</div>';
    grid.appendChild(card);
  });
}


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


function closeAssetModal(){
  $('asset-modal').style.display='none';
}

