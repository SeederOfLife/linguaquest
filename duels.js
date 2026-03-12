// ══════════════════════════════════════════════════════════════
// DUELS.JS — Async word duels with betting + exercise choice
//
// Supabase table (run once):
// CREATE TABLE duels (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   code TEXT UNIQUE NOT NULL,
//   creator_email TEXT, creator_name TEXT,
//   lang_native TEXT, lang_target TEXT,
//   game_type TEXT DEFAULT 'mixed',
//   level_filter TEXT DEFAULT 'any',
//   word_ids JSONB, questions JSONB,
//   bet_amount INT DEFAULT 0,
//   creator_score INT DEFAULT 0, creator_correct INT DEFAULT 0,
//   challenger_email TEXT, challenger_name TEXT,
//   challenger_score INT, challenger_correct INT,
//   status TEXT DEFAULT 'open',
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
// ALTER TABLE duels ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "pub_read"   ON duels FOR SELECT USING (true);
// CREATE POLICY "pub_insert" ON duels FOR INSERT WITH CHECK (true);
// CREATE POLICY "pub_update" ON duels FOR UPDATE USING (true);
// ══════════════════════════════════════════════════════════════

let _currentDuel = null;
let _duelCreateOpts = { type: 'mixed', level: 'any', bet: 0 };
let _openDuelsInterval = null;

function _randCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:6}, ()=>chars[Math.floor(Math.random()*chars.length)]).join('');
}

// ─── BUILD QUESTIONS from level filter ───────────────────────
function _buildDuelQuestions(gameType, levelFilter) {
  const allIds = Object.keys(WD);
  let pool = allIds;

  // filter by level if a specific one chosen
  if (levelFilter && levelFilter !== 'any') {
    const levelChaps = (CHAPTERS[levelFilter] || []).map(c => c.wids || []).flat();
    const levelPool = allIds.filter(id => levelChaps.includes(id));
    if (levelPool.length >= 6) pool = levelPool;
  }

  const ids = pool.sort(() => Math.random() - .5).slice(0, 10);

  let qs = [];
  if (gameType === 'quiz') {
    qs = ids.map(id => mkQQ(id, pool));
  } else if (gameType === 'fill') {
    qs = ids.map(id => mkFQ(id));
  } else if (gameType === 'match') {
    // build pairs for match — pack into one match question
    qs = [{ type:'match', pairs: ids.slice(0,6).map(id => {
      const w = WD[id];
      return { a: w?.[S.nL] || id, b: w?.[S.tL] || id };
    })}];
  } else {
    // mixed
    qs = ids.flatMap((id, i) => {
      if (i % 3 === 0) return [mkFQ(id)];
      return [mkQQ(id, pool)];
    }).slice(0, 10);
  }
  return { ids, qs };
}

// ─── CREATE DUEL MODAL ───────────────────────────────────────
function openCreateDuel() {
  if (!U || U.isGuest) { toast('❌ Connecte-toi pour créer un duel'); return; }
  if (!S.nL || !S.tL)  { toast('Choisis une langue d\'abord'); navTo('learn'); return; }
  _duelCreateOpts = { type: 'mixed', level: 'any', bet: 0 };
  $('duel-create-modal').style.display = 'flex';
  $('duel-bet-input').value = 0;
}
function closeCreateDuel() { $('duel-create-modal').style.display = 'none'; }

function selectDuelType(btn, type) {
  document.querySelectorAll('#duel-type-grid .duel-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _duelCreateOpts.type = type;
}
function selectDuelLevel(btn, lv) {
  document.querySelectorAll('#duel-level-grid .duel-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _duelCreateOpts.level = lv;
}
function setBet(n) {
  $('duel-bet-input').value = n;
  _duelCreateOpts.bet = n;
}

async function confirmCreateDuel() {
  const bet = parseInt($('duel-bet-input').value) || 0;
  if (bet < 0) { toast('❌ Mise invalide'); return; }
  if (bet > (U.coins || 0)) { toast('❌ Pas assez de pièces pour cette mise !'); return; }
  _duelCreateOpts.bet = bet;

  const { type, level } = _duelCreateOpts;
  const { ids, qs } = _buildDuelQuestions(type, level);
  const code = _randCode();

  try {
    const { error } = await _SB.from('duels').insert({
      code,
      creator_email:   U.email,
      creator_name:    U.name,
      lang_native:     S.nL,
      lang_target:     S.tL,
      game_type:       type,
      level_filter:    level,
      word_ids:        ids,
      questions:       qs,
      bet_amount:      bet,
      creator_score:   0,
      creator_correct: 0,
      status:          'open',
    });
    if (error) throw error;

    // Reserve coins if bet > 0
    if (bet > 0) {
      U.coins -= bet;
      U.reservedBet = (U.reservedBet || 0) + bet;
      saveU(); updateTopBar();
    }

    _currentDuel = { code, qs, role: 'creator', bet, type };
    closeCreateDuel();
    renderDuelLobby(code, 'creator', undefined, bet, type, level);
    switchRankTab('duels');
  } catch(e) {
    toast('❌ Erreur création duel');
    console.error(e);
  }
}

// ─── SHOW JOIN INPUT ─────────────────────────────────────────
function showJoinDuel() {
  const z = $('duel-join-zone');
  if (z) z.style.display = z.style.display === 'none' ? 'block' : 'none';
}

// ─── JOIN DUEL ────────────────────────────────────────────────
async function joinDuel() {
  if (!U || U.isGuest) { toast('❌ Connecte-toi pour rejoindre'); return; }
  const input = $('duel-code-input');
  const code  = (input?.value || '').trim().toUpperCase();
  if (code.length !== 6) { toast('❌ Code de 6 caractères requis'); return; }

  try {
    const { data, error } = await _SB.from('duels').select('*').eq('code', code).single();
    if (error || !data) { toast('❌ Duel introuvable'); return; }
    if (data.status !== 'open') { toast('Ce duel est déjà terminé'); return; }
    if (data.creator_email === U.email) { toast('Tu ne peux pas rejoindre ton propre duel'); return; }

    // Show bet modal if there's a bet
    if (data.bet_amount > 0) {
      showBetAcceptModal(data, code);
    } else {
      _acceptAndPlay(data, code, false);
    }
  } catch(e) {
    toast('❌ Connexion impossible');
    console.error(e);
  }
}

// ─── ACCEPT A DUEL FROM OPEN LIST ───────────────────────────
async function acceptOpenDuel(code) {
  if (!U || U.isGuest) { toast('❌ Connecte-toi d\'abord'); return; }
  try {
    const { data } = await _SB.from('duels').select('*').eq('code', code).single();
    if (!data || data.status !== 'open') { toast('Duel indisponible'); return; }
    if (data.creator_email === U.email)  { toast('C\'est ton duel !'); return; }
    if (data.bet_amount > 0) {
      showBetAcceptModal(data, code);
    } else {
      _acceptAndPlay(data, code, false);
    }
  } catch(e) { toast('❌ Erreur'); }
}

// ─── BET ACCEPT MODAL ────────────────────────────────────────
function showBetAcceptModal(data, code) {
  const canAfford = (U.coins || 0) >= data.bet_amount;
  const html = `
    <div class="modal-box" style="max-width:380px;width:94%;text-align:center;" onclick="event.stopPropagation()">
      <div style="font-size:2rem;margin-bottom:8px;">⚔️</div>
      <div style="font-weight:900;font-size:1rem;margin-bottom:6px;">Duel avec mise</div>
      <div style="font-size:.85rem;color:var(--muted);margin-bottom:14px;">
        <strong>${data.creator_name}</strong> propose une mise de
        <strong style="color:var(--gold);">${data.bet_amount} <span class="coin"></span></strong>
      </div>
      <div style="font-size:.78rem;color:var(--muted);background:var(--card2);border-radius:10px;padding:10px;margin-bottom:14px;line-height:1.7;">
        Si tu acceptes et gagnes : tu remportes <strong style="color:var(--green);">${data.bet_amount * 2} 🪙</strong><br>
        Si tu acceptes et perds : tu perds <strong style="color:var(--accent2);">${data.bet_amount} 🪙</strong><br>
        Tu as actuellement <strong>${Math.floor(U.coins || 0)} 🪙</strong>
      </div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
        ${canAfford ? `<button class="btn btn-primary" onclick="_acceptAndPlay(null,'${code}',true);closeBetModal()">✅ Accepter la mise</button>` : ''}
        <button class="btn btn-secondary" onclick="_acceptAndPlay(null,'${code}',false);closeBetModal()">Jouer sans mise</button>
        <button class="btn btn-secondary" onclick="closeBetModal()">Annuler</button>
      </div>
    </div>`;
  const overlay = document.getElementById('duel-result-modal');
  overlay.innerHTML = html;
  overlay.style.display = 'flex';
  // store data for reference
  overlay._pendingDuelData = data;
}
function closeBetModal() {
  const el = $('duel-result-modal');
  if (el) el.style.display = 'none';
}

async function _acceptAndPlay(data, code, acceptBet) {
  try {
    if (!data) {
      const { data: d } = await _SB.from('duels').select('*').eq('code', code).single();
      data = d;
    }
    if (!data) { toast('❌ Duel introuvable'); return; }

    S.nL = data.lang_native;
    S.tL = data.lang_target;

    const betPaid = acceptBet ? data.bet_amount : 0;
    if (betPaid > 0) {
      U.coins -= betPaid;
      U.reservedBet = (U.reservedBet || 0) + betPaid;
      saveU(); updateTopBar();
    }

    _currentDuel = {
      code,
      qs:       data.questions,
      role:     'challenger',
      bet:      betPaid,
      creatorBet: data.bet_amount,
      data,
    };
    startDuelGame();
  } catch(e) { toast('❌ Erreur'); console.error(e); }
}

// ─── PLAY DUEL ────────────────────────────────────────────────
function startDuelGame() {
  if (!_currentDuel) return;
  const { qs, role, data } = _currentDuel;
  S.qs   = qs;
  S.isDuel = true;
  S.qi = 0; S.score = 0; S.cor = 0; S.wr = 0;
  S.ts   = { quiz:{c:0,w:0}, fill:{c:0,w:0}, sort:{c:0,w:0}, match:{c:0,w:0} };
  S.gType = _currentDuel.data?.game_type || 'mixed';
  goTo('game');
  setTypePill(S.gType === 'mixed' ? 'quiz' : S.gType);
  sT('g-score', 0);
  $('g-progress').style.width = '0%';
  renderQ();

  const banner = document.createElement('div');
  banner.className = 'duel-banner';
  const opponent = role === 'creator'
    ? 'En attente d\'un adversaire…'
    : (data?.creator_name || 'Adversaire');
  const betInfo = _currentDuel.bet > 0
    ? ` · Mise: <strong style="color:var(--gold);">${_currentDuel.bet} 🪙</strong>`
    : '';
  banner.innerHTML = `⚔️ DUEL · ${opponent}${betInfo} · Code: <b>${_currentDuel.code}</b>`;
  document.getElementById('game-inner')?.prepend(banner);
}

// ─── SUBMIT SCORE ─────────────────────────────────────────────
async function submitDuelScore(score, correct) {
  if (!_currentDuel || !S.isDuel) return;
  const { code, role, bet, creatorBet } = _currentDuel;
  try {
    if (role === 'creator') {
      await _SB.from('duels').update({
        creator_score: score, creator_correct: correct, status: 'waiting'
      }).eq('code', code);
      toast(`Score envoyé ! Code: ${code} · En attente de l\'adversaire…`);
      renderDuelLobby(code, 'creator', score, bet);
    } else {
      const { data } = await _SB.from('duels')
        .select('creator_score,creator_name,creator_correct,bet_amount')
        .eq('code', code).single();
      await _SB.from('duels').update({
        challenger_email:   U.email,
        challenger_name:    U.name,
        challenger_score:   score,
        challenger_correct: correct,
        status: 'done'
      }).eq('code', code);
      _resolveBets(score, data?.creator_score || 0, bet, creatorBet || data?.bet_amount || 0);
      showDuelResult(score, correct, data);
    }
  } catch(e) { console.error('duel submit error', e); }
}

function _resolveBets(myScore, theirScore, myBet, theirBet) {
  const iWon = myScore > theirScore;
  // Return reserved bet regardless
  U.reservedBet = Math.max(0, (U.reservedBet || 0) - myBet);
  if (iWon) {
    // Win: get back own bet + opponent's bet (if they matched)
    const winnings = myBet + (myBet > 0 ? Math.min(myBet, theirBet) : 0);
    U.coins = (U.coins || 0) + winnings;
    if (winnings > 0) toast(`🏆 Tu gagnes ${winnings} 🪙 de mise !`);
  }
  // If lost, coins already deducted — nothing more to do
  U.duelsWon = (U.duelsWon || 0) + (iWon ? 1 : 0);
  saveU(); updateTopBar(); checkTrophies();
}

function showDuelResult(myScore, myCorrect, opponentData) {
  const won = myScore > (opponentData?.creator_score || 0);
  const el = $('duel-result-modal');
  if (!el) return;
  const betLine = _currentDuel?.bet > 0
    ? `<div style="margin-top:8px;font-size:.82rem;color:${won ? 'var(--green)' : 'var(--accent2)'};">
        ${won ? `🏆 +${_currentDuel.bet * 2} 🪙 de mise remportés` : `💸 Mise de ${_currentDuel.bet} 🪙 perdue`}
       </div>`
    : '';
  el.innerHTML = `
    <div class="duel-result ${won ? 'duel-win' : 'duel-lose'}" onclick="event.stopPropagation()">
      <div style="font-size:3rem;">${won ? '🏆' : '😤'}</div>
      <div class="duel-result-title">${won ? 'Victoire !' : 'Défaite…'}</div>
      <div class="duel-scores">
        <div class="duel-score-block">
          <div class="duel-score-name">👤 Toi</div>
          <div class="duel-score-val">${myScore} pts (${myCorrect}✓)</div>
        </div>
        <div style="font-size:1.4rem;color:var(--muted);">vs</div>
        <div class="duel-score-block">
          <div class="duel-score-name">${opponentData?.creator_name || 'Adversaire'}</div>
          <div class="duel-score-val">${opponentData?.creator_score || 0} pts (${opponentData?.creator_correct || 0}✓)</div>
        </div>
      </div>
      ${betLine}
      ${won ? '<div style="color:var(--green);font-size:.8rem;margin-top:6px;">+200 🪙 bonus victoire</div>' : ''}
      <button class="btn btn-primary" onclick="closeDuelResult()" style="margin-top:16px;">Fermer</button>
    </div>`;
  el.style.display = 'flex';
  if (won) {
    U.coins = (U.coins || 0) + 200;
    saveU(); updateTopBar();
    if (typeof confetti === 'function') confetti();
  }
}

function closeDuelResult() {
  const el = $('duel-result-modal');
  if (el) { el.style.display = 'none'; el.innerHTML = ''; }
  _currentDuel = null; S.isDuel = false;
}

// ─── RENDER LOBBY ──────────────────────────────────────────────
function renderDuelLobby(code, role, score, bet, type, level) {
  const el = $('duel-lobby-content');
  if (!el) return;
  const typeLabel = { mixed:'🎲 Mixte', quiz:'⚡ Quiz', fill:'✏️ Fill', match:'🔗 Match' }[type] || '🎲 Mixte';
  const levelLabel = level && level !== 'any' ? level : 'Aléatoire';
  el.innerHTML = `
    <div style="background:var(--card);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px;text-align:center;margin-bottom:14px;">
      <div style="font-size:2rem;margin-bottom:6px;">⚔️</div>
      <div style="font-weight:900;font-size:1rem;margin-bottom:4px;">Ton duel est prêt</div>
      <div class="duel-code-display">${code}</div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:10px 0;">
        <span style="background:rgba(124,58,237,.18);border-radius:8px;padding:4px 10px;font-size:.76rem;font-weight:700;">${typeLabel}</span>
        <span style="background:rgba(6,182,212,.12);border-radius:8px;padding:4px 10px;font-size:.76rem;font-weight:700;">Niveau ${levelLabel}</span>
        ${bet > 0 ? `<span style="background:rgba(251,191,36,.12);border-radius:8px;padding:4px 10px;font-size:.76rem;font-weight:700;color:var(--gold);">Mise ${bet} 🪙</span>` : ''}
      </div>
      ${score !== undefined ? `<div style="color:var(--green);font-weight:800;font-size:.9rem;margin-bottom:10px;">Ton score: ${score} pts · En attente…</div>` : ''}
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${code}');toast('Code copié !')">📋 Copier le code</button>
        ${score === undefined ? `<button class="btn btn-primary btn-sm" onclick="startDuelGame()">Jouer maintenant →</button>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="checkDuelResult('${code}')">🔄 Vérifier résultat</button>
      </div>
    </div>`;
}

// ─── CHECK IF OPPONENT HAS PLAYED ────────────────────────────
async function checkDuelResult(code) {
  try {
    const { data } = await _SB.from('duels').select('*').eq('code', code).single();
    if (!data) { toast('Duel introuvable'); return; }
    if (data.status === 'done') {
      const myScore    = data.creator_score;
      const theirScore = data.challenger_score || 0;
      const won        = myScore > theirScore;
      _resolveBets(myScore, theirScore, data.bet_amount || 0, data.bet_amount || 0);
      showDuelResult(myScore, data.creator_correct, {
        creator_score:   theirScore,
        creator_correct: data.challenger_correct,
        creator_name:    data.challenger_name || 'Adversaire',
      });
    } else if (data.status === 'waiting') {
      toast('L\'adversaire n\'a pas encore joué…');
    } else {
      toast('Duel encore ouvert');
    }
  } catch(e) { toast('❌ Erreur'); }
}

// ─── LOAD OPEN DUELS (waiting room) ──────────────────────────
async function loadOpenDuels() {
  const el = $('open-duels-list');
  if (!el) return;
  try {
    const { data } = await _SB.from('duels')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(20);
    if (!data || !data.length) {
      el.innerHTML = '<div style="color:var(--muted);font-size:.8rem;text-align:center;padding:16px;">Aucun duel ouvert pour l\'instant</div>';
      return;
    }
    const mine = data.filter(d => d.creator_email === U?.email);
    const others = data.filter(d => d.creator_email !== U?.email);

    let html = '';
    if (others.length) {
      html += `<div style="font-size:.75rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Défis ouverts</div>`;
      html += others.map(d => _duelCard(d, false)).join('');
    }
    if (mine.length) {
      html += `<div style="font-size:.75rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin:12px 0 8px;">Mes duels en attente</div>`;
      html += mine.map(d => _duelCard(d, true)).join('');
    }
    el.innerHTML = html;
  } catch(e) { console.error('loadOpenDuels', e); }
}

function _duelCard(d, isMine) {
  const typeLabel = { mixed:'🎲 Mixte', quiz:'⚡ Quiz', fill:'✏️ Fill', match:'🔗 Match' }[d.game_type] || '🎲';
  const langLabel = d.lang_native && d.lang_target
    ? `${LANGS[d.lang_native]?.flag || d.lang_native} → ${LANGS[d.lang_target]?.flag || d.lang_target}` : '';
  const betBadge = d.bet_amount > 0
    ? `<span style="color:var(--gold);font-weight:800;">Mise ${d.bet_amount} 🪙</span>` : '<span style="color:var(--muted);">Sans mise</span>';
  const age = _timeAgo(d.created_at);
  return `
    <div style="background:var(--card);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <div style="flex:1;min-width:120px;">
        <div style="font-weight:800;font-size:.88rem;">⚔️ ${d.creator_name || 'Anonyme'}</div>
        <div style="font-size:.74rem;color:var(--muted);margin-top:2px;">${typeLabel} · ${langLabel} · ${age}</div>
        <div style="font-size:.76rem;margin-top:3px;">${betBadge}</div>
      </div>
      <div style="font-family:monospace;font-weight:900;font-size:1rem;letter-spacing:2px;color:var(--accent);">${d.code}</div>
      ${isMine
        ? `<div style="display:flex;gap:6px;">
             <button class="btn btn-sm btn-primary" onclick="startDuelGame()">Jouer</button>
             <button class="btn btn-sm btn-secondary" onclick="checkDuelResult('${d.code}')">État</button>
           </div>`
        : `<button class="btn btn-sm btn-primary" onclick="acceptOpenDuel('${d.code}')">Rejoindre</button>`
      }
    </div>`;
}

function _timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff/60)}min`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h`;
  return `${Math.floor(diff/86400)}j`;
}

// ─── RENDER DUELS SCREEN (called on tab switch) ───────────────
function renderDuelsScreen() {
  loadOpenDuels();
  // Refresh every 30s while on this tab
  clearInterval(_openDuelsInterval);
  _openDuelsInterval = setInterval(loadOpenDuels, 30000);
}

// ─── CLEANUP on tab leave ─────────────────────────────────────
function stopDuelRefresh() {
  clearInterval(_openDuelsInterval);
}
