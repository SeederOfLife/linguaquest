// ══════════════════════════════════════════════════════════════
// SRS.JS — Spaced Repetition System (SM-2 simplified)
// Tracks per-word performance, schedules reviews
// ══════════════════════════════════════════════════════════════

// Review intervals in minutes: again, hard, good, easy
const SRS_INTERVALS = [1, 10, 1440, 4320, 10080, 20160, 43200];
// U.srs = { 'fr-en-wordId': { interval, due, fails, reviews } }

function srsKey(wid) { return `${S.nL}-${S.tL}-${wid}`; }

function initSRS() {
  if (!U.srs) U.srs = {};
}

// Called after each quiz answer
function srsUpdate(wid, correct) {
  if (!U || !wid || !S.nL || !S.tL) return;
  initSRS();
  const k = srsKey(wid);
  const card = U.srs[k] || { interval: 0, due: 0, fails: 0, reviews: 0 };
  const now = Date.now();

  if (correct) {
    // Advance interval
    const next = SRS_INTERVALS[Math.min(card.interval + 1, SRS_INTERVALS.length - 1)];
    card.interval = Math.min(card.interval + 1, SRS_INTERVALS.length - 1);
    card.due = now + next * 60000;
    card.reviews = (card.reviews || 0) + 1;
  } else {
    // Reset to beginning, due in 1 min
    card.interval = 0;
    card.due = now + 60000;
    card.fails = (card.fails || 0) + 1;
  }
  U.srs[k] = card;
}

// Returns word IDs due for review (up to limit)
function srsDueWords(limit) {
  if (!U || !U.srs || !S.nL || !S.tL) return [];
  const now = Date.now();
  return Object.entries(U.srs)
    .filter(([k, v]) => k.startsWith(`${S.nL}-${S.tL}-`) && v.due <= now)
    .sort((a, b) => a[1].due - b[1].due)
    .slice(0, limit || 8)
    .map(([k]) => k.replace(`${S.nL}-${S.tL}-`, ''));
}

function srsDueCount() {
  if (!U || !U.srs || !S.nL || !S.tL) return 0;
  const now = Date.now();
  return Object.entries(U.srs)
    .filter(([k, v]) => k.startsWith(`${S.nL}-${S.tL}-`) && v.due <= now).length;
}

// Build a review quiz from due words
function startSRSReview() {
  if (!S.nL || !S.tL) { toast('❗ Choisis une langue d\'abord'); navTo('learn'); return; }
  const due = srsDueWords(10);
  if (!due.length) { toast('✅ Aucune révision en attente !'); return; }

  // Build questions from due words — use all word IDs for wrong answers
  const allWids = Object.keys(WD);
  S.qs = due.flatMap(id => {
    if (!WD[id]) return [];
    return [mkQQ(id, allWids), mkFQ(id)];
  }).slice(0, 12);
  S.isSRSReview = true;
  S.qi = 0; S.score = 0; S.cor = 0; S.wr = 0;
  S.ts = { quiz:{c:0,w:0}, fill:{c:0,w:0}, sort:{c:0,w:0}, match:{c:0,w:0} };
  S.gType = 'mixed';
  goTo('game');
  setTypePill(S.qs[0]?.type || 'quiz');
  sT('g-score', 0); sT('xp-count', (U.xp||0)+' XP');
  $('g-progress').style.width = '0%';
  renderQ();
  toast(`🧠 ${due.length} mots à réviser`);
}

// Render the SRS widget (injected into learn screen)
function renderSRSWidget() {
  const el = document.getElementById('srs-widget');
  if (!el || !U || !S.nL || !S.tL) return;
  const due = srsDueCount();
  const total = U.srs ? Object.keys(U.srs).filter(k => k.startsWith(`${S.nL}-${S.tL}-`)).length : 0;
  const learned = U.srs ? Object.entries(U.srs)
    .filter(([k,v]) => k.startsWith(`${S.nL}-${S.tL}-`) && v.interval >= 3).length : 0;

  el.innerHTML = `
    <div class="srs-card" onclick="startSRSReview()">
      <div class="srs-icon">🧠</div>
      <div class="srs-info">
        <div class="srs-title">Révision intelligente</div>
        <div class="srs-sub">${learned} mots maîtrisés · ${total} suivis</div>
      </div>
      <div class="srs-badge ${due > 0 ? 'srs-due' : 'srs-ok'}">
        ${due > 0 ? `${due} à réviser` : '✓ À jour'}
      </div>
    </div>
  `;
}
