// ══════════════════════════════════════════════════════════════
// DUELS.JS — Async word duels via Supabase
// One player creates → shares code → other player accepts
//
// Supabase table needed (run once in SQL editor):
// CREATE TABLE duels (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   code TEXT UNIQUE NOT NULL,
//   creator_email TEXT, creator_name TEXT,
//   lang_native TEXT, lang_target TEXT,
//   word_ids JSONB, questions JSONB,
//   creator_score INT DEFAULT 0,
//   creator_correct INT DEFAULT 0,
//   challenger_email TEXT, challenger_name TEXT,
//   challenger_score INT,
//   challenger_correct INT,
//   status TEXT DEFAULT 'open',
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
// ALTER TABLE duels ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "public read" ON duels FOR SELECT USING (true);
// CREATE POLICY "public insert" ON duels FOR INSERT WITH CHECK (true);
// CREATE POLICY "public update" ON duels FOR UPDATE USING (true);
// ══════════════════════════════════════════════════════════════

let _currentDuel = null;

function _randCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:6}, ()=>chars[Math.floor(Math.random()*chars.length)]).join('');
}

// ── CREATE DUEL ──────────────────────────────────────────────
async function createDuel() {
  if (!U || U.isGuest) { toast(t('duel_login')); return; }
  if (!S.nL || !S.tL)  { toast(t('duel_no_lang')); navTo('learn'); return; }

  const allIds = Object.keys(WD);
  const ids    = allIds.sort(()=>Math.random()-.5).slice(0, 8);
  const qs     = ids.flatMap(id => [mkQQ(id, allIds), mkFQ(id)]).slice(0, 10);
  const code   = _randCode();

  try {
    const { error } = await _SB.from('duels').insert({
      code,
      creator_email:  U.email,
      creator_name:   U.name,
      lang_native:    S.nL,
      lang_target:    S.tL,
      word_ids:       ids,
      questions:      qs,
      creator_score:  0,
      creator_correct:0,
      status:         'open',
    });
    if (error) throw error;

    _currentDuel = { code, qs, role:'creator' };
    renderDuelLobby(code, 'creator');
  } catch(e) {
    toast(t('duel_error'));
    console.error(e);
  }
}

// ── JOIN DUEL ────────────────────────────────────────────────
async function joinDuel() {
  if (!U || U.isGuest) { toast(t('duel_join_login')); return; }
  const input = document.getElementById('duel-code-input');
  const code  = (input?.value || '').trim().toUpperCase();
  if (code.length !== 6) { toast(t('duel_code_len')); return; }

  try {
    const { data, error } = await _SB.from('duels').select('*').eq('code', code).single();
    if (error || !data) { toast(t('duel_not_found')); return; }
    if (data.status !== 'open') { toast(t('duel_done')); return; }
    if (data.creator_email === U.email) { toast(t('duel_self')); return; }

    S.nL = data.lang_native;
    S.tL = data.lang_target;
    _currentDuel = { code, qs: data.questions, role:'challenger', data };
    startDuelGame();
  } catch(e) {
    toast(t('duel_conn_error'));
    console.error(e);
  }
}

// ── PLAY DUEL ────────────────────────────────────────────────
function startDuelGame() {
  if (!_currentDuel) return;
  const { qs, role } = _currentDuel;
  S.qs = qs;
  S.isDuel = true;
  S.qi = 0; S.score = 0; S.cor = 0; S.wr = 0;
  S.ts = { quiz:{c:0,w:0}, fill:{c:0,w:0}, sort:{c:0,w:0}, match:{c:0,w:0} };
  S.gType = 'duel';
  goTo('game');
  setTypePill('quiz');
  sT('g-score', 0);
  $('g-progress').style.width = '0%';
  renderQ();
  const banner = document.createElement('div');
  banner.className = 'duel-banner';
  banner.innerHTML = `⚔️ DUEL EN COURS · Code : <b>${_currentDuel.code}</b>`;
  document.getElementById('game-inner')?.prepend(banner);
  toast(role==='creator' ? t('duel_go_creator') : t('duel_go_challenger'));
}

// Called from showResults — submit score if it's a duel
async function submitDuelScore(score, correct) {
  if (!_currentDuel || !S.isDuel) return;
  const { code, role } = _currentDuel;
  try {
    if (role === 'creator') {
      await _SB.from('duels').update({ creator_score: score, creator_correct: correct, status:'waiting' }).eq('code', code);
      toast(t('duel_score_sent',{c:code}));
      renderDuelLobby(code, 'creator', score);
    } else {
      const { data } = await _SB.from('duels').select('creator_score,creator_name,creator_correct').eq('code', code).single();
      await _SB.from('duels').update({ challenger_email: U.email, challenger_name: U.name, challenger_score: score, challenger_correct: correct, status:'done' }).eq('code', code);
      showDuelResult(score, correct, data);
    }
  } catch(e) { console.error('duel submit error', e); }
}

function showDuelResult(myScore, myCorrect, opponentData) {
  const won = myScore > (opponentData?.creator_score || 0);
  if (won) {
    U.duelsWon = (U.duelsWon || 0) + 1;
    saveU();
    checkTrophies();
  }
  const el = document.getElementById('duel-result-modal');
  if (!el) { toast(won ? '🏆 '+t('duel_win') : '😤 '+t('duel_lose')); return; }
  el.innerHTML = `
    <div class="duel-result ${won?'duel-win':'duel-lose'}">
      <div style="font-size:3rem;">${won?'🏆':'😤'}</div>
      <div class="duel-result-title">${won ? t('duel_win') : t('duel_lose')}</div>
      <div class="duel-scores">
        <div class="duel-score-block">
          <div class="duel-score-name">👤 Toi</div>
          <div class="duel-score-val">${myScore} pts (${myCorrect}✓)</div>
        </div>
        <div style="font-size:1.4rem;color:var(--muted);">vs</div>
        <div class="duel-score-block">
          <div class="duel-score-name">${opponentData?.creator_name||t('duel_opponent')}</div>
          <div class="duel-score-val">${opponentData?.creator_score||0} pts (${opponentData?.creator_correct||0}✓)</div>
        </div>
      </div>
      ${won?'<div style="color:var(--green);font-size:.8rem;margin-top:8px;">+200 🪙 · Trophée peut-être débloqué !</div>':''}
      <button class="btn btn-primary" onclick="closeDuelResult()" style="margin-top:14px;">Fermer</button>
    </div>`;
  el.style.display = 'flex';
  if (won) { U.coins = (U.coins||0) + 200; saveU(); updateTopBar(); if(typeof confetti==='function') confetti(); }
}

function closeDuelResult() {
  const el = document.getElementById('duel-result-modal');
  if (el) el.style.display = 'none';
  _currentDuel = null; S.isDuel = false;
}

function renderDuelLobby(code, role, score) {
  const el = document.getElementById('screen-duels');
  if (!el) return;
  el.querySelector('#duel-lobby-content').innerHTML = `
    <div style="text-align:center;padding:20px;">
      <div style="font-size:3rem;margin-bottom:8px;">⚔️</div>
      <div style="font-size:1.4rem;font-weight:900;">Code du duel</div>
      <div class="duel-code-display">${code}</div>
      <div style="color:var(--muted);font-size:.8rem;margin-bottom:16px;">${t('duel_share_code')}</div>
      ${score !== undefined ? `<div style="color:var(--green);font-weight:800;margin-bottom:12px;">${t('duel_your_score',{s:score})} ${t('duel_wait')}</div>` : ''}
      <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${code}');toast('Code copié !')">📋 Copier le code</button>
      <button class="btn btn-secondary" onclick="startDuelGame()" style="margin-left:8px;">Jouer maintenant →</button>
    </div>`;
}

function renderDuelsScreen() {
  const myDuels = document.getElementById('my-duels-list');
  if (myDuels) myDuels.innerHTML = '<div style="color:var(--muted);font-size:.8rem;text-align:center;padding:12px;">Crée un duel pour commencer !</div>';
}
