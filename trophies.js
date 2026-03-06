// ══════════════════════════════════════════════════════════════
// TROPHIES.JS — Achievement system + Themed Events
// ══════════════════════════════════════════════════════════════

// ── TROPHY DEFINITIONS ──────────────────────────────────────────
const TROPHIES = [
  // Learning
  { id:'first_quiz',    icon:'🎯', name:'Premier pas',      desc:'Terminer ton premier quiz',                  coins:50,  xp:20,  check: u => (u.sessions||0) >= 1 },
  { id:'streak3',       icon:'🔥', name:'En feu',           desc:'3 jours de suite',                           coins:100, xp:50,  check: u => (u.streak||0) >= 3 },
  { id:'streak7',       icon:'⚡', name:'Semaine parfaite', desc:'7 jours de suite',                           coins:300, xp:150, check: u => (u.streak||0) >= 7 },
  { id:'streak30',      icon:'👑', name:'Indestructible',   desc:'30 jours de suite',                          coins:1000,xp:500, check: u => (u.streak||0) >= 30 },
  { id:'perfect10',     icon:'💎', name:'Perfectionniste',  desc:'10/10 dans un quiz',                         coins:200, xp:100, check: u => (u._lastPerfect||0) >= 10 },
  { id:'speed',         icon:'⚡', name:'Éclair',           desc:'Répondre en moins de 2 secondes',            coins:150, xp:75,  check: u => !!(u._speedUnlock) },
  { id:'chapters5',     icon:'📚', name:'Studieux',         desc:'Compléter 5 chapitres',                      coins:200, xp:100, check: u => (u.chaptersCompleted||0) >= 5 },
  { id:'chapters15',    icon:'🎓', name:'Diplômé',          desc:'Compléter 15 chapitres',                     coins:500, xp:300, check: u => (u.chaptersCompleted||0) >= 15 },
  { id:'xp1000',        icon:'⭐', name:'Montée en grade',  desc:'Atteindre 1000 XP',                          coins:300, xp:0,   check: u => (u.xp||0) >= 1000 },
  { id:'xp5000',        icon:'🌟', name:'Élite',            desc:'Atteindre 5000 XP',                          coins:1000,xp:0,   check: u => (u.xp||0) >= 5000 },
  { id:'srs50',         icon:'🧠', name:'Mémoire de fer',   desc:'Réviser 50 mots avec le SRS',                coins:250, xp:100, check: u => _srsReviewCount(u) >= 50 },
  { id:'srs_master',    icon:'🧬', name:'Scientifique',     desc:'Maîtriser 20 mots (niveau 3+)',               coins:400, xp:200, check: u => _srsMasteredCount(u) >= 20 },
  // Finance
  { id:'first_invest',  icon:'💰', name:'Premier investisseur', desc:'Acheter ton premier actif',              coins:100, xp:50,  check: u => Object.values(u.assets||{}).some(v=>v>0) },
  { id:'coins500',      icon:'🪙', name:'Épargnant',        desc:'Accumuler 500 pièces',                       coins:0,   xp:50,  check: u => (u.coins||0) >= 500 },
  { id:'coins5000',     icon:'💎', name:'Millionnaire',     desc:'Accumuler 5000 pièces',                      coins:0,   xp:200, check: u => (u.coins||0) >= 5000 },
  { id:'investor3',     icon:'📈', name:'Investisseur',     desc:'Atteindre le niveau investisseur 3',         coins:300, xp:150, check: u => (u.investorLevel||0) >= 3 },
  { id:'tycoon',        icon:'🏦', name:'Tycoon',           desc:'Atteindre le niveau investisseur maximum',   coins:2000,xp:1000,check: u => (u.investorLevel||0) >= 8 },
  { id:'academy',       icon:'🏛️', name:'Académicien',      desc:'Compléter 3 leçons Finance Academy',         coins:500, xp:250, check: u => Object.keys(u.lessonsCompleted||{}).length >= 3 },
  // Events
  { id:'event_win',     icon:'🎪', name:'Héros de l\'événement', desc:'Terminer un événement spécial',         coins:500, xp:300, check: u => (u._eventsWon||0) >= 1 },
  // Duel
  { id:'duel_first',    icon:'⚔️', name:'Duelliste',        desc:'Gagner un premier duel',                     coins:200, xp:100, check: u => (u.duelsWon||0) >= 1 },
  { id:'duel_10',       icon:'🗡️', name:'Champion des duels','desc':'Gagner 10 duels',                         coins:800, xp:400, check: u => (u.duelsWon||0) >= 10 },
  // Social
  { id:'shared',        icon:'🔗', name:'Ambassadeur',      desc:'Partager l\'app via QR',                     coins:100, xp:50,  check: u => !!(u._shared) },
  // Night owl / early bird
  { id:'night_owl',     icon:'🦉', name:'Chouette de nuit', desc:'Jouer après minuit',                         coins:100, xp:50,  check: u => !!(u._nightOwl) },
  { id:'early_bird',    icon:'🐦', name:'Lève-tôt',         desc:'Jouer avant 7h du matin',                    coins:100, xp:50,  check: u => !!(u._earlyBird) },
  // Meta
  { id:'collector',     icon:'🏆', name:'Collectionneur',   desc:'Débloquer 10 trophées',                      coins:500, xp:250, check: u => (u.trophies||[]).length >= 10 },
  { id:'legend',        icon:'🌈', name:'Légende',          desc:'Débloquer tous les trophées',                coins:5000,xp:2000,check: u => (u.trophies||[]).length >= TROPHIES.length - 1 },
];

function _srsReviewCount(u) {
  if (!u.srs) return 0;
  return Object.values(u.srs).reduce((s,v)=>(s + (v.reviews||0)), 0);
}
function _srsMasteredCount(u) {
  if (!u.srs) return 0;
  return Object.values(u.srs).filter(v=>(v.interval||0) >= 3).length;
}

// Check and award any new trophies — called after each game + on key events
function checkTrophies() {
  if (!U || U.isGuest) return;
  if (!U.trophies) U.trophies = [];
  const now = new Date();
  const h = now.getHours();
  if (h === 0 || h === 1) U._nightOwl = true;
  if (h < 7) U._earlyBird = true;

  let newOnes = [];
  for (const t of TROPHIES) {
    if (U.trophies.includes(t.id)) continue;
    try {
      if (t.check(U)) {
        U.trophies.push(t.id);
        U.coins = (U.coins||0) + t.coins;
        U.xp   = (U.xp||0)   + t.xp;
        newOnes.push(t);
      }
    } catch(e) {}
  }
  if (newOnes.length) {
    saveU();
    updateTopBar();
    // Show sequentially
    newOnes.forEach((t, i) => setTimeout(() => showTrophyUnlock(t), i * 2500));
  }
}

function showTrophyUnlock(t) {
  const el = document.createElement('div');
  el.className = 'trophy-popup';
  el.innerHTML = `
    <div class="trophy-pop-icon">${t.icon}</div>
    <div class="trophy-pop-body">
      <div class="trophy-pop-title">🏆 Trophée débloqué !</div>
      <div class="trophy-pop-name">${t.name}</div>
      <div class="trophy-pop-desc">${t.desc}</div>
      ${t.coins>0?`<div class="trophy-pop-reward">+${t.coins} 🪙 · +${t.xp} XP</div>`:''}
    </div>
  `;
  document.body.appendChild(el);
  setTimeout(()=>el.classList.add('trophy-pop-in'), 50);
  setTimeout(()=>{ el.classList.remove('trophy-pop-in'); el.classList.add('trophy-pop-out'); setTimeout(()=>el.remove(),500); }, 4000);
  if (typeof confetti === 'function') confetti();
}

// Render trophy screen
function renderTrophies() {
  const el = document.getElementById('trophies-grid');
  if (!el) return;
  const earned = U?.trophies || [];
  const sorted = [...TROPHIES].sort((a,b) => {
    const ae = earned.includes(a.id), be = earned.includes(b.id);
    return ae===be ? 0 : ae ? -1 : 1;
  });
  el.innerHTML = sorted.map(t => {
    const done = earned.includes(t.id);
    return `<div class="trophy-card ${done?'trophy-earned':'trophy-locked'}">
      <div class="trophy-icon">${done ? t.icon : '🔒'}</div>
      <div class="trophy-name">${t.name}</div>
      <div class="trophy-desc">${t.desc}</div>
      ${done && t.coins > 0 ? `<div class="trophy-reward">+${t.coins}🪙</div>` : ''}
    </div>`;
  }).join('');
  const pct = Math.round(earned.length / TROPHIES.length * 100);
  const prog = document.getElementById('trophy-progress');
  if (prog) prog.innerHTML = `
    <div style="font-size:.8rem;color:var(--muted);margin-bottom:6px;">${earned.length} / ${TROPHIES.length} — ${pct}%</div>
    <div style="background:var(--card2);border-radius:8px;height:8px;overflow:hidden;">
      <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:8px;transition:width .6s;"></div>
    </div>`;
}

// ── THEMED EVENTS ────────────────────────────────────────────────
const EVENTS = [
  {
    id: 'ninja',
    name: '🥷 Ninja Academy',
    desc: 'Maîtrise le vocabulaire des guerriers de l\'ombre',
    color: '#1a1a2e',
    accent: '#e94560',
    endDate: null, // set dynamically (always active for demo)
    bonusXP: 2,
    words: {
      sword:    {fr:'Épée',    en:'Sword',    es:'Espada',  de:'Schwert',  cs:'Meč'},
      shield:   {fr:'Bouclier',en:'Shield',   es:'Escudo',  de:'Schild',   cs:'Štít'},
      shadow:   {fr:'Ombre',   en:'Shadow',   es:'Sombra',  de:'Schatten', cs:'Stín'},
      master:   {fr:'Maître',  en:'Master',   es:'Maestro', de:'Meister',  cs:'Mistr'},
      honor:    {fr:'Honneur', en:'Honor',    es:'Honor',   de:'Ehre',     cs:'Čest'},
      mission:  {fr:'Mission', en:'Mission',  es:'Misión',  de:'Mission',  cs:'Mise'},
      warrior:  {fr:'Guerrier',en:'Warrior',  es:'Guerrero',de:'Krieger',  cs:'Bojovník'},
      temple:   {fr:'Temple',  en:'Temple',   es:'Templo',  de:'Tempel',   cs:'Chrám'},
    },
    trophyId: 'event_win',
  },
  {
    id: 'space',
    name: '🚀 Space Station Omega',
    desc: 'Explore le vocabulaire de l\'espace et de la science',
    color: '#0a0a2a',
    accent: '#00d4ff',
    bonusXP: 2,
    words: {
      star:     {fr:'Étoile',  en:'Star',     es:'Estrella',de:'Stern',    cs:'Hvězda'},
      rocket:   {fr:'Fusée',   en:'Rocket',   es:'Cohete',  de:'Rakete',   cs:'Raketa'},
      planet:   {fr:'Planète', en:'Planet',   es:'Planeta', de:'Planet',   cs:'Planeta'},
      galaxy:   {fr:'Galaxie', en:'Galaxy',   es:'Galaxia', de:'Galaxie',  cs:'Galaxie'},
      gravity:  {fr:'Gravité', en:'Gravity',  es:'Gravedad',de:'Schwerkraft',cs:'Gravitace'},
      orbit:    {fr:'Orbite',  en:'Orbit',    es:'Órbita',  de:'Umlaufbahn',cs:'Oběžná dráha'},
      universe: {fr:'Univers', en:'Universe', es:'Universo',de:'Universum', cs:'Vesmír'},
      astronaut:{fr:'Astronaute',en:'Astronaut',es:'Astronauta',de:'Astronaut',cs:'Kosmonaut'},
    },
    trophyId: 'event_win',
  },
  {
    id: 'detective',
    name: '🕵️ Détective Agency',
    desc: 'Résous des affaires en apprenant le vocabulaire du mystère',
    color: '#1a0a0a',
    accent: '#f59e0b',
    bonusXP: 2,
    words: {
      clue:     {fr:'Indice',  en:'Clue',     es:'Pista',   de:'Hinweis',  cs:'Stopa'},
      mystery:  {fr:'Mystère', en:'Mystery',  es:'Misterio',de:'Geheimnis',cs:'Záhada'},
      suspect:  {fr:'Suspect', en:'Suspect',  es:'Sospechoso',de:'Verdächtiger',cs:'Podezřelý'},
      evidence: {fr:'Preuve',  en:'Evidence', es:'Evidencia',de:'Beweis',  cs:'Důkaz'},
      witness:  {fr:'Témoin',  en:'Witness',  es:'Testigo', de:'Zeuge',    cs:'Svědek'},
      crime:    {fr:'Crime',   en:'Crime',    es:'Crimen',  de:'Verbrechen',cs:'Zločin'},
      detective:{fr:'Détective',en:'Detective',es:'Detective',de:'Detektiv',cs:'Detektiv'},
      truth:    {fr:'Vérité',  en:'Truth',    es:'Verdad',  de:'Wahrheit', cs:'Pravda'},
    },
    trophyId: 'event_win',
  },
];

// Returns the current active event (rotates weekly)
function getCurrentEvent() {
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return EVENTS[week % EVENTS.length];
}

function startEventQuiz() {
  const ev = getCurrentEvent();
  if (!S.nL || !S.tL) { toast('❗ Choisis une langue d\'abord'); navTo('learn'); return; }
  // Temporarily add event words to WD
  const ids = Object.keys(ev.words);
  ids.forEach(id => { if (!WD[id]) WD[id] = ev.words[id]; });
  S.qs = ids.flatMap(id => [mkQQ(id, ids), mkFQ(id)]).slice(0, 12);
  S.isEventQuiz = true;
  S._eventId = ev.id;
  S.qi = 0; S.score = 0; S.cor = 0; S.wr = 0;
  S.ts = { quiz:{c:0,w:0}, fill:{c:0,w:0}, sort:{c:0,w:0}, match:{c:0,w:0} };
  S.gType = 'mixed';
  goTo('game');
  setTypePill('quiz');
  sT('g-score', 0); sT('xp-count', (U.xp||0)+' XP');
  $('g-progress').style.width = '0%';
  renderQ();
  toast(`${ev.name} — XP ×${ev.bonusXP} !`);
}

function renderEventBanner() {
  const el = document.getElementById('event-banner');
  if (!el) return;
  const ev = getCurrentEvent();
  el.innerHTML = `
    <div class="event-card" onclick="startEventQuiz()" style="--ev-accent:${ev.accent};--ev-bg:${ev.color};">
      <div class="event-badge">ÉVÉNEMENT</div>
      <div class="event-name">${ev.name}</div>
      <div class="event-desc">${ev.desc}</div>
      <div class="event-bonus">XP ×${ev.bonusXP} · Trophée exclusif</div>
      <div class="event-btn">Jouer →</div>
    </div>
  `;
}
