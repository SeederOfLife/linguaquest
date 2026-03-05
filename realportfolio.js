// ══════════════════════════════════════════════════════════════
// REAL PORTFOLIO SIMULATOR  (realportfolio.js)
// Paper trading at live market prices with fractional shares
// ══════════════════════════════════════════════════════════════

// ── State ────────────────────────────────────────────────────────
let _portfolioMode = 'practice'; // 'practice' | 'real'

const REAL_START_CASH = 10000; // Virtual USD

// Asset display config for real mode (maps to MARKET_IDS + ASSET_DEFS)
const REAL_ASSETS = [
  { id:'crypto', name:'Bitcoin',     icon:'₿',  ticker:'BTC',  minFrac:0.00001 },
  { id:'stock',  name:'S&P 500',     icon:'📈', ticker:'SPY',  minFrac:0.001   },
  { id:'nasdaq', name:'Nasdaq 100',  icon:'🚀', ticker:'QQQ',  minFrac:0.001   },
  { id:'etf',    name:'ETF Monde',   icon:'🌐', ticker:'VT',   minFrac:0.001   },
  { id:'gold',   name:'Or',          icon:'🥇', ticker:'GC',   minFrac:0.001   },
  { id:'house',  name:'REIT',        icon:'🏢', ticker:'VNQ',  minFrac:0.001   },
  { id:'bonds',  name:'Obligations', icon:'📜', ticker:'TLT',  minFrac:0.001   },
  { id:'oil',    name:'Pétrole WTI', icon:'🛢️', ticker:'CL',   minFrac:0.01    },
];

// ── Default real portfolio ────────────────────────────────────────
function defaultRealPortfolio() {
  return {
    cash: REAL_START_CASH,
    positions: {},  // { assetId: { shares, avgCost } }
    txHistory: [],  // [ { date, type, id, shares, price, total } ]
  };
}

function getRealP() {
  if (!U.realPortfolio) U.realPortfolio = defaultRealPortfolio();
  return U.realPortfolio;
}

// ── Mode toggle ───────────────────────────────────────────────────
function setPortfolioMode(mode) {
  _portfolioMode = mode;

  const btnP = document.getElementById('pf-mode-practice');
  const btnR = document.getElementById('pf-mode-real');
  if (btnP) btnP.classList.toggle('active', mode === 'practice');
  if (btnR) btnR.classList.toggle('active', mode === 'real');

  const practiceEl = document.getElementById('pf-practice-zone');
  const realEl     = document.getElementById('pf-real-zone');
  if (practiceEl) practiceEl.style.display = mode === 'practice' ? 'block' : 'none';
  if (realEl)     realEl.style.display     = mode === 'real'     ? 'block' : 'none';

  if (mode === 'real') renderRealPortfolio();
}

// ── Real portfolio value ──────────────────────────────────────────
function getRealTotalValue(rp) {
  let total = rp.cash;
  Object.entries(rp.positions).forEach(([id, pos]) => {
    if (!pos.shares || pos.shares <= 0) return;
    const price = _priceCache[id] ? _priceCache[id].price : pos.avgCost;
    total += pos.shares * price;
  });
  return total;
}

// ── Render real portfolio screen ──────────────────────────────────
async function renderRealPortfolio() {
  const container = document.getElementById('pf-real-zone');
  if (!container) return;

  const rp = getRealP();

  // Fetch prices if stale
  if (Object.keys(_priceCache).length === 0) {
    container.innerHTML = `<div style="text-align:center;color:var(--muted);padding:40px 0;">
      <div style="font-size:2rem;margin-bottom:8px;">📡</div>
      <div>Chargement des prix réels…</div>
    </div>`;
    await fetchMarketPrices();
  }

  const totalValue = getRealTotalValue(rp);
  const invested   = totalValue - rp.cash;
  const pnl        = totalValue - REAL_START_CASH;
  const pnlPct     = ((pnl / REAL_START_CASH) * 100).toFixed(2);
  const pnlColor   = pnl >= 0 ? 'var(--green)' : 'var(--red)';
  const pnlSign    = pnl >= 0 ? '+' : '';

  container.innerHTML = `
    <!-- Hero stats -->
    <div class="rp-hero">
      <div class="rp-hero-main">
        <div class="rp-hero-label">💼 Portefeuille simulé</div>
        <div class="rp-hero-value">$${fmt(totalValue)}</div>
        <div class="rp-hero-pnl" style="color:${pnlColor}">${pnlSign}$${fmt(Math.abs(pnl))} (${pnlSign}${pnlPct}%) depuis le début</div>
      </div>
      <div class="rp-stats-row">
        <div class="rp-stat">
          <div class="rp-stat-val" style="color:var(--gold)">$${fmt(rp.cash)}</div>
          <div class="rp-stat-lbl">Liquidités</div>
        </div>
        <div class="rp-stat">
          <div class="rp-stat-val" style="color:var(--accent3)">$${fmt(invested)}</div>
          <div class="rp-stat-lbl">Investi</div>
        </div>
        <div class="rp-stat">
          <div class="rp-stat-val" style="color:${pnlColor}">${pnlSign}${pnlPct}%</div>
          <div class="rp-stat-lbl">Rendement</div>
        </div>
      </div>
      <button class="rp-reset-btn" onclick="confirmResetRealPortfolio()">↺ Réinitialiser ($${fmt(REAL_START_CASH)})</button>
    </div>

    <!-- Positions -->
    ${renderPositions(rp)}

    <!-- Buy panel -->
    <div class="rp-section-title">📊 Acheter / Vendre</div>
    <div class="rp-assets-grid" id="rp-assets-grid">
      ${REAL_ASSETS.map(a => renderRealAssetCard(a, rp)).join('')}
    </div>

    <!-- Transaction history -->
    ${rp.txHistory.length > 0 ? renderTxHistory(rp) : ''}
  `;
}

function renderPositions(rp) {
  const positions = Object.entries(rp.positions).filter(([,p]) => p.shares > 0);
  if (!positions.length) {
    return `<div class="rp-section-title">📂 Positions ouvertes</div>
    <div style="text-align:center;color:var(--muted);padding:20px;font-size:.85rem;">
      Aucune position — achète ton premier actif ci-dessous !
    </div>`;
  }

  const rows = positions.map(([id, pos]) => {
    const asset = REAL_ASSETS.find(a => a.id === id) || { name: id, icon: '?' };
    const price = _priceCache[id] ? _priceCache[id].price : pos.avgCost;
    const change = _priceCache[id] ? _priceCache[id].change : 0;
    const value  = pos.shares * price;
    const cost   = pos.shares * pos.avgCost;
    const pnl    = value - cost;
    const pnlPct = cost > 0 ? ((pnl / cost) * 100).toFixed(2) : '0.00';
    const pnlColor = pnl >= 0 ? 'var(--green)' : 'var(--red)';
    const chgColor = change >= 0 ? 'var(--green)' : 'var(--red)';

    return `
    <div class="rp-position-row">
      <div class="rp-pos-icon">${asset.icon}</div>
      <div class="rp-pos-info">
        <div class="rp-pos-name">${asset.name} <span style="color:var(--muted);font-size:.72rem;">${asset.ticker}</span></div>
        <div class="rp-pos-shares">${fmtShares(pos.shares)} parts · px moy. $${fmt(pos.avgCost)}</div>
      </div>
      <div class="rp-pos-right">
        <div class="rp-pos-value">$${fmt(value)}</div>
        <div class="rp-pos-pnl" style="color:${pnlColor}">${pnl>=0?'+':''}$${fmt(Math.abs(pnl))} (${pnl>=0?'+':''}${pnlPct}%)</div>
        <div style="font-size:.68rem;color:${chgColor}">${change>=0?'+':''}${change.toFixed(2)}% auj.</div>
      </div>
    </div>`;
  }).join('');

  return `<div class="rp-section-title">📂 Positions ouvertes</div>
  <div class="rp-positions">${rows}</div>`;
}

function renderRealAssetCard(a, rp) {
  const cache = _priceCache[a.id];
  const price = cache ? cache.price : null;
  const change = cache ? cache.change : null;
  const chgColor = change === null ? 'var(--muted)' : (change >= 0 ? 'var(--green)' : 'var(--red)');
  const pos = rp.positions[a.id];
  const owned = pos && pos.shares > 0;
  const priceStr = price ? '$' + fmt(price) : 'Chargement…';
  const chgStr = change !== null ? `(${change >= 0 ? '+' : ''}${change.toFixed(2)}%)` : '';

  return `
  <div class="rp-asset-card">
    <div class="rp-ac-header">
      <span class="rp-ac-icon">${a.icon}</span>
      <div class="rp-ac-title">
        <div class="rp-ac-name">${a.name}</div>
        <div class="rp-ac-ticker" style="color:var(--muted)">${a.ticker}</div>
      </div>
      <div class="rp-ac-price-block">
        <div class="rp-ac-price">${priceStr}</div>
        <div class="rp-ac-change" style="color:${chgColor}">${chgStr}</div>
      </div>
    </div>
    ${owned ? `<div class="rp-ac-position">
      Positon: ${fmtShares(pos.shares)} parts · $${fmt(pos.shares * (price || pos.avgCost))}
    </div>` : ''}
    <div class="rp-ac-trade">
      <div class="rp-trade-tabs">
        <button class="rp-trade-tab active" id="tab-buy-${a.id}" onclick="rpSetTradeTab('${a.id}','buy')">Acheter</button>
        <button class="rp-trade-tab" id="tab-sell-${a.id}" onclick="rpSetTradeTab('${a.id}','sell')"  ${!owned?'disabled':''}>Vendre</button>
      </div>
      <div class="rp-trade-inputs" id="trade-inputs-${a.id}">
        <div class="rp-input-row">
          <span class="rp-input-label">Montant $</span>
          <input type="number" class="rp-amount-input" id="amt-${a.id}" placeholder="ex: 500"
            min="1" step="1" oninput="rpUpdateShares('${a.id}')">
          <span class="rp-input-label">ou</span>
          <input type="number" class="rp-shares-input" id="shr-${a.id}" placeholder="parts"
            min="${a.minFrac}" step="${a.minFrac}" oninput="rpUpdateAmount('${a.id}')">
        </div>
        <div class="rp-trade-info" id="trade-info-${a.id}" style="color:var(--muted);font-size:.72rem;"></div>
        <button class="rp-execute-btn" id="exec-${a.id}" onclick="rpExecute('${a.id}')" disabled>
          Valider
        </button>
      </div>
    </div>
  </div>`;
}

function renderTxHistory(rp) {
  const recent = [...rp.txHistory].reverse().slice(0, 10);
  const rows = recent.map(tx => {
    const asset = REAL_ASSETS.find(a => a.id === tx.id) || { icon: '?', ticker: tx.id };
    const color = tx.type === 'buy' ? 'var(--green)' : 'var(--red)';
    const sign  = tx.type === 'buy' ? '−' : '+';
    return `<div class="rp-tx-row">
      <span>${asset.icon}</span>
      <span style="font-size:.78rem;color:var(--text)">${tx.type==='buy'?'Achat':'Vente'} ${fmtShares(tx.shares)} ${asset.ticker}</span>
      <span style="font-size:.72rem;color:var(--muted)">${tx.date}</span>
      <span style="font-size:.8rem;color:${color};font-weight:800;">${sign}$${fmt(tx.total)}</span>
    </div>`;
  }).join('');
  return `<div class="rp-section-title">🧾 Transactions récentes</div>
  <div class="rp-tx-list">${rows}</div>`;
}

// ── Trade interactions ────────────────────────────────────────────
let _rpTradeMode = {}; // { assetId: 'buy'|'sell' }

function rpSetTradeTab(id, mode) {
  _rpTradeMode[id] = mode;
  document.getElementById(`tab-buy-${id}`)?.classList.toggle('active', mode === 'buy');
  document.getElementById(`tab-sell-${id}`)?.classList.toggle('active', mode === 'sell');
  // Reset inputs
  const amt = document.getElementById(`amt-${id}`);
  const shr = document.getElementById(`shr-${id}`);
  if (amt) amt.value = '';
  if (shr) shr.value = '';
  _rpUpdateInfo(id);
}

function rpUpdateShares(id) {
  const amtEl = document.getElementById(`amt-${id}`);
  const shrEl = document.getElementById(`shr-${id}`);
  if (!amtEl || !shrEl) return;
  const price = _priceCache[id]?.price;
  if (!price || !amtEl.value) { shrEl.value = ''; _rpUpdateInfo(id); return; }
  const shares = parseFloat(amtEl.value) / price;
  shrEl.value = shares > 0 ? parseFloat(shares.toFixed(6)) : '';
  _rpUpdateInfo(id);
}

function rpUpdateAmount(id) {
  const amtEl = document.getElementById(`amt-${id}`);
  const shrEl = document.getElementById(`shr-${id}`);
  if (!amtEl || !shrEl) return;
  const price = _priceCache[id]?.price;
  if (!price || !shrEl.value) { amtEl.value = ''; _rpUpdateInfo(id); return; }
  const amount = parseFloat(shrEl.value) * price;
  amtEl.value = amount > 0 ? parseFloat(amount.toFixed(2)) : '';
  _rpUpdateInfo(id);
}

function _rpUpdateInfo(id) {
  const infoEl = document.getElementById(`trade-info-${id}`);
  const execBtn = document.getElementById(`exec-${id}`);
  if (!infoEl || !execBtn) return;

  const rp = getRealP();
  const mode = _rpTradeMode[id] || 'buy';
  const amtEl = document.getElementById(`amt-${id}`);
  const amount = parseFloat(amtEl?.value || 0);
  const price = _priceCache[id]?.price;

  if (!amount || amount <= 0 || !price) {
    infoEl.textContent = '';
    execBtn.disabled = true;
    execBtn.textContent = 'Valider';
    return;
  }

  const shares = amount / price;
  const asset = REAL_ASSETS.find(a => a.id === id);

  if (mode === 'buy') {
    const canAfford = rp.cash >= amount;
    infoEl.textContent = `≈ ${fmtShares(shares)} parts · Solde après: $${fmt(rp.cash - amount)}`;
    infoEl.style.color = canAfford ? 'var(--green)' : 'var(--red)';
    execBtn.disabled = !canAfford;
    execBtn.textContent = canAfford ? `✓ Acheter $${fmt(amount)}` : '❌ Solde insuffisant';
    execBtn.style.background = canAfford ? '' : 'rgba(239,68,68,.2)';
  } else {
    const pos = rp.positions[id];
    const ownedShares = pos?.shares || 0;
    const ownedVal = ownedShares * price;
    const canSell = shares <= ownedShares + 0.000001;
    infoEl.textContent = `Tu possèdes ${fmtShares(ownedShares)} parts ($${fmt(ownedVal)})`;
    infoEl.style.color = canSell ? 'var(--accent3)' : 'var(--red)';
    execBtn.disabled = !canSell || ownedShares <= 0;
    execBtn.textContent = canSell && ownedShares > 0 ? `✓ Vendre $${fmt(amount)}` : '❌ Pas assez';
    execBtn.style.background = '';
  }
}

function rpExecute(id) {
  const rp = getRealP();
  const mode = _rpTradeMode[id] || 'buy';
  const amtEl = document.getElementById(`amt-${id}`);
  const amount = parseFloat(amtEl?.value || 0);
  const price = _priceCache[id]?.price;
  if (!amount || !price) return;

  const shares = amount / price;
  const now = new Date().toLocaleDateString('fr-FR');

  if (mode === 'buy') {
    if (rp.cash < amount) { toast('❌ Solde insuffisant'); return; }
    rp.cash -= amount;
    if (!rp.positions[id]) rp.positions[id] = { shares: 0, avgCost: 0 };
    const p = rp.positions[id];
    p.avgCost = (p.shares * p.avgCost + shares * price) / (p.shares + shares);
    p.shares += shares;
    rp.txHistory.push({ date: now, type: 'buy', id, shares, price, total: amount });
    const asset = REAL_ASSETS.find(a => a.id === id);
    toast(`✅ Acheté ${fmtShares(shares)} ${asset?.ticker || id} pour $${fmt(amount)}`);
  } else {
    const p = rp.positions[id];
    if (!p || p.shares < shares - 0.000001) { toast('❌ Pas assez de parts'); return; }
    rp.cash += amount;
    p.shares -= shares;
    if (p.shares < 0.000001) { p.shares = 0; p.avgCost = 0; }
    rp.txHistory.push({ date: now, type: 'sell', id, shares, price, total: amount });
    const asset = REAL_ASSETS.find(a => a.id === id);
    toast(`✅ Vendu ${fmtShares(shares)} ${asset?.ticker || id} · +$${fmt(amount)}`);
  }

  U.realPortfolio = rp;
  saveU();
  renderRealPortfolio();
}

function confirmResetRealPortfolio() {
  if (!confirm('Réinitialiser le portefeuille simulé ? Toutes les positions seront fermées.')) return;
  U.realPortfolio = defaultRealPortfolio();
  saveU();
  renderRealPortfolio();
  toast('↺ Portefeuille réinitialisé — $' + fmt(REAL_START_CASH) + ' disponibles');
}

// ── Formatters ────────────────────────────────────────────────────
function fmt(n) {
  if (n === undefined || n === null || isNaN(n)) return '0.00';
  return parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtShares(n) {
  if (!n) return '0';
  if (n >= 1)   return parseFloat(n.toFixed(4)).toLocaleString('en-US');
  if (n >= 0.01) return n.toFixed(4);
  return n.toFixed(6);
}

// ── Inject CSS ────────────────────────────────────────────────────
(function injectRealPortfolioCSS() {
  const s = document.createElement('style');
  s.textContent = `

/* ── MODE TOGGLE ── */
.pf-mode-toggle {
  display: flex;
  gap: 0;
  background: var(--card2);
  border-radius: 12px;
  padding: 4px;
  width: 100%;
  max-width: 340px;
  margin: 0 auto 18px;
}
.pf-mode-btn {
  flex: 1;
  padding: 9px 14px;
  border: none;
  border-radius: 9px;
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: .82rem;
  cursor: pointer;
  background: transparent;
  color: var(--muted);
  transition: all .2s;
  letter-spacing: .3px;
}
.pf-mode-btn.active {
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #fff;
  box-shadow: 0 2px 12px rgba(0,0,0,.25);
}
.pf-mode-btn.real-btn.active {
  background: linear-gradient(135deg, #16a34a, #15803d);
}

/* ── REAL PORTFOLIO HERO ── */
.rp-hero {
  background: linear-gradient(135deg, rgba(22,163,74,.12), rgba(21,128,61,.06));
  border: 1px solid rgba(22,163,74,.2);
  border-radius: 16px;
  padding: 18px;
  margin-bottom: 16px;
  text-align: center;
}
.rp-hero-label {
  font-size: .72rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 4px;
}
.rp-hero-value {
  font-size: 2rem;
  font-weight: 900;
  color: var(--text);
  margin-bottom: 4px;
}
.rp-hero-pnl {
  font-size: .82rem;
  font-weight: 700;
  margin-bottom: 14px;
}
.rp-stats-row {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 14px;
}
.rp-stat { text-align: center; }
.rp-stat-val { font-weight: 900; font-size: 1rem; }
.rp-stat-lbl { font-size: .65rem; color: var(--muted); text-transform: uppercase; letter-spacing: .8px; }
.rp-reset-btn {
  background: none;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 8px;
  color: var(--muted);
  font-size: .72rem;
  padding: 5px 12px;
  cursor: pointer;
  font-family: 'Nunito', sans-serif;
  font-weight: 700;
  transition: all .2s;
}
.rp-reset-btn:hover { color: var(--text); border-color: rgba(255,255,255,.25); }

/* ── SECTION TITLES ── */
.rp-section-title {
  font-weight: 900;
  font-size: .9rem;
  margin: 16px 0 8px;
  color: var(--text);
}

/* ── POSITIONS ── */
.rp-positions { display: flex; flex-direction: column; gap: 8px; margin-bottom: 6px; }
.rp-position-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--card);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 12px;
  padding: 11px 14px;
}
.rp-pos-icon { font-size: 1.4rem; flex-shrink: 0; }
.rp-pos-info { flex: 1; min-width: 0; }
.rp-pos-name { font-weight: 800; font-size: .88rem; }
.rp-pos-shares { font-size: .72rem; color: var(--muted); margin-top: 1px; }
.rp-pos-right { text-align: right; flex-shrink: 0; }
.rp-pos-value { font-weight: 900; font-size: .95rem; }
.rp-pos-pnl { font-size: .72rem; font-weight: 700; margin-top: 1px; }

/* ── ASSET CARDS (real mode) ── */
.rp-assets-grid { display: flex; flex-direction: column; gap: 12px; }
.rp-asset-card {
  background: var(--card);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 14px;
  padding: 14px;
  transition: border-color .2s;
}
.rp-asset-card:hover { border-color: rgba(255,255,255,.15); }
.rp-ac-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.rp-ac-icon { font-size: 1.5rem; flex-shrink: 0; }
.rp-ac-title { flex: 1; }
.rp-ac-name { font-weight: 800; font-size: .9rem; }
.rp-ac-ticker { font-size: .72rem; }
.rp-ac-price-block { text-align: right; }
.rp-ac-price { font-weight: 900; font-size: .95rem; }
.rp-ac-change { font-size: .72rem; font-weight: 700; }
.rp-ac-position {
  font-size: .74rem;
  color: var(--accent3);
  background: rgba(224,123,57,.08);
  border-radius: 7px;
  padding: 5px 9px;
  margin-bottom: 10px;
  font-weight: 700;
}

/* ── TRADE UI ── */
.rp-trade-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}
.rp-trade-tab {
  flex: 1;
  padding: 6px;
  border: 1.5px solid rgba(255,255,255,.1);
  border-radius: 8px;
  background: none;
  color: var(--muted);
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: .78rem;
  cursor: pointer;
  transition: all .2s;
}
.rp-trade-tab.active {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(224,123,57,.08);
}
.rp-trade-tab:disabled { opacity: .35; cursor: not-allowed; }
.rp-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.rp-input-label { font-size: .72rem; color: var(--muted); flex-shrink: 0; font-weight: 700; }
.rp-amount-input, .rp-shares-input {
  flex: 1;
  min-width: 70px;
  background: rgba(255,255,255,.05);
  border: 1.5px solid rgba(255,255,255,.1);
  border-radius: 8px;
  padding: 7px 9px;
  font-family: 'Nunito', sans-serif;
  font-size: .82rem;
  font-weight: 700;
  color: var(--text);
  outline: none;
  transition: border-color .2s;
}
.rp-amount-input:focus, .rp-shares-input:focus { border-color: var(--accent); }
.rp-trade-info { min-height: 16px; margin-bottom: 6px; font-weight: 700; }
.rp-execute-btn {
  width: 100%;
  padding: 9px;
  border: none;
  border-radius: 9px;
  background: linear-gradient(135deg, #16a34a, #15803d);
  color: #fff;
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: .82rem;
  cursor: pointer;
  transition: all .2s;
}
.rp-execute-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
.rp-execute-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }

/* ── TRANSACTION HISTORY ── */
.rp-tx-list { display: flex; flex-direction: column; gap: 6px; }
.rp-tx-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: var(--card2);
  border-radius: 9px;
  font-size: .78rem;
}
.rp-tx-row > span:nth-child(2) { flex: 1; }
.rp-tx-row > span:nth-child(3) { color: var(--muted); }

  `;
  document.head.appendChild(s);
})();
