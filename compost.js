// ══════════════════════════════════════════════════════════════
// COMPOST.JS — Worm word game
// Two worms eat the correct translation of displayed words
// Real-time multiplayer via Supabase broadcast channels
// ══════════════════════════════════════════════════════════════

// ── SKINS ────────────────────────────────────────────────────
const WORM_SKINS = [
  { id:'sprout',   name:'🌱 Sprout',   head:'#22c55e', body:'#16a34a', eye:'#fff', trail:'#86efac' },
  { id:'fire',     name:'🔥 Fire',     head:'#f97316', body:'#dc2626', eye:'#fff', trail:'#fbbf24' },
  { id:'crystal',  name:'💎 Crystal',  head:'#22d3ee', body:'#0891b2', eye:'#fff', trail:'#a5f3fc' },
  { id:'shadow',   name:'🌙 Shadow',   head:'#7c3aed', body:'#4c1d95', eye:'#e879f9', trail:'#c4b5fd' },
  { id:'compost',  name:'🪱 Compost',  head:'#a16207', body:'#78350f', eye:'#fef08a', trail:'#d97706' },
  { id:'lightning',name:'⚡ Lightning',head:'#eab308', body:'#ca8a04', eye:'#fff',    trail:'#fef9c3' },
  { id:'ocean',    name:'🌊 Ocean',    head:'#0ea5e9', body:'#0369a1', eye:'#fff',    trail:'#bae6fd' },
  { id:'cherry',   name:'🌸 Cherry',  head:'#ec4899', body:'#be185d', eye:'#fff',    trail:'#fbcfe8' },
];

// Word emojis for visual hints
const WORD_EMOJIS = {
  dog:'🐕', cat:'🐈', bird:'🐦', horse:'🐴', fish:'🐟', sun:'☀️', rain:'🌧️',
  snow:'❄️', cloud:'☁️', fire:'🔥', water:'💧', bread:'🍞', coffee:'☕',
  wine:'🍷', fruit:'🍎', cheese:'🧀', plane:'✈️', train:'🚂', hotel:'🏨',
  passport:'🛂', suitcase:'🧳', doctor:'👨‍⚕️', hospital:'🏥', book:'📚',
  house:'🏠', money:'💰', market:'🛒', shop:'🏪', hat:'🎩', shoes:'👟',
  head:'🙂', hand:'🤚', eye:'👁️', nose:'👃', mouth:'👄', star:'⭐',
  moon:'🌙', earth:'🌍', rocket:'🚀', tree:'🌳', flower:'🌸', heart:'❤️',
};

// ── GAME STATE ────────────────────────────────────────────────
let _compostGame = null;
let _compostChannel = null;
let _compostLobbyChannel = null;
let _compostRoom = null;
let _mySkin = WORM_SKINS[0];

const CELL = 20;
const COLS = 24;
const ROWS = 18;
const W = CELL * COLS; // 480
const H = CELL * ROWS; // 360

// ── SKIN SELECTION ────────────────────────────────────────────
function renderSkinPicker() {
  const el = $('compost-skin-grid');
  if (!el) return;
  el.innerHTML = WORM_SKINS.map(s => `
    <div class="skin-card ${_mySkin.id === s.id ? 'selected' : ''}"
         style="--worm-color:${s.head}"
         onclick="selectSkin('${s.id}')">
      <canvas width="60" height="30" id="skin-preview-${s.id}"></canvas>
      <div class="skin-name">${s.name}</div>
    </div>`).join('');

  // Draw worm previews
  setTimeout(() => {
    WORM_SKINS.forEach(s => {
      const cv = document.getElementById(`skin-preview-${s.id}`);
      if (!cv) return;
      const ctx = cv.getContext('2d');
      ctx.clearRect(0,0,60,30);
      // Draw 3 body segments
      [50,38,26].forEach((x,i) => {
        ctx.fillStyle = i===0 ? s.head : s.body;
        ctx.beginPath();
        ctx.arc(x, 15, 8, 0, Math.PI*2);
        ctx.fill();
      });
      // Eyes on head
      ctx.fillStyle = s.eye;
      ctx.beginPath(); ctx.arc(53, 12, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(53, 18, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(54, 12, 1.2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(54, 18, 1.2, 0, Math.PI*2); ctx.fill();
    });
  }, 50);
}

function selectSkin(id) {
  _mySkin = WORM_SKINS.find(s => s.id === id) || WORM_SKINS[0];
  if (U) { U.compostSkin = id; saveU(); }
  renderSkinPicker();
}

// ── LOBBY ─────────────────────────────────────────────────────
async function openCompostLobby() {
  if (!S.nL || !S.tL) { toast('Choisis une langue d\'abord'); navTo('learn'); return; }
  if (U?.compostSkin) _mySkin = WORM_SKINS.find(s => s.id === U.compostSkin) || WORM_SKINS[0];
  goTo('compost-lobby');
  setTimeout(() => renderSkinPicker(), 50);
}

function startCompostSolo() {
  // Solo mode — AI-controlled opponent (simple bot)
  _compostRoom = {
    code: 'SOLO',
    host: U?.email || 'player',
    hostName: U?.name || 'Joueur',
    hostSkin: _mySkin.id,
    guest: 'bot',
    guestName: '🤖 Bot',
    guestSkin: 'fire',
    status: 'started',
    nL: S.nL, tL: S.tL,
    role: 'host', solo: true,
  };
  _launchCompost();
}

async function createCompostRoom() {
  if (!U || U.isGuest) { toast('❌ Connecte-toi pour jouer en multi'); startCompostSolo(); return; }
  const code = _randCompostCode();
  _compostRoom = {
    code, host: U.email, hostName: U.name,
    hostSkin: _mySkin.id,
    guest: null, guestName: null, guestSkin: null,
    status: 'waiting',
    nL: S.nL, tL: S.tL,
  };

  try {
    _compostLobbyChannel = _SB.channel(`compost-lobby-${code}`)
      .on('broadcast', { event: 'join' }, ({ payload }) => {
        _compostRoom.guest = payload.email;
        _compostRoom.guestName = payload.name;
        _compostRoom.guestSkin = payload.skin;
        _updateLobbyUI();
        toast(`🪱 ${payload.name} a rejoint !`);
      })
      .subscribe();
  } catch(e) {
    console.warn('Lobby channel failed, solo fallback', e);
  }

  _renderLobbyWaiting(code);
}

function _randCompostCode() {
  return 'COMP' + Math.floor(1000 + Math.random() * 9000);
}

function _renderLobbyWaiting(code) {
  const el = $('compost-lobby-content');
  if (!el) return;
  el.innerHTML = `
    <div class="lobby-room-card">
      <div style="font-size:2rem;margin-bottom:8px;">🪱</div>
      <div style="font-weight:900;font-size:1rem;margin-bottom:6px;">Salon Compost créé</div>
      <div class="compost-code-display">${code}</div>
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:14px;">Partage ce code à ton adversaire</div>
      <div class="lobby-players">
        <div class="lobby-player-slot filled">
          <div class="lobby-player-avatar" style="background:${_mySkin.head};">${U.name.charAt(0)}</div>
          <div class="lobby-player-name">${U.name}</div>
          <div class="lobby-player-skin">${_mySkin.name}</div>
          <div class="lobby-ready">👑 Hôte</div>
        </div>
        <div class="lobby-vs">VS</div>
        <div class="lobby-player-slot empty" id="lobby-guest-slot">
          <div class="lobby-player-avatar" style="background:var(--card2);color:var(--muted);">?</div>
          <div class="lobby-player-name" style="color:var(--muted);">En attente…</div>
          <div class="lobby-waiting-dots">
            <span>·</span><span>·</span><span>·</span>
          </div>
        </div>
      </div>
      <button class="btn btn-secondary" onclick="navigator.clipboard?.writeText('${code}').then(()=>toast('Code copié !'))" style="margin-bottom:8px;width:100%;">📋 Copier le code</button>
      <button class="btn btn-primary" id="btn-start-compost" onclick="startCompostGame()" style="width:100%;" disabled>▶ Lancer la partie</button>
    </div>`;
}

function _updateLobbyUI() {
  if (!_compostRoom) return;
  const slot = $('lobby-guest-slot');
  if (!slot) return;
  const guestSkin = WORM_SKINS.find(s => s.id === _compostRoom.guestSkin) || WORM_SKINS[1];
  slot.className = 'lobby-player-slot filled';
  slot.innerHTML = `
    <div class="lobby-player-avatar" style="background:${guestSkin.head};">${(_compostRoom.guestName||'?').charAt(0)}</div>
    <div class="lobby-player-name">${_compostRoom.guestName}</div>
    <div class="lobby-player-skin">${guestSkin.name}</div>
    <div class="lobby-ready" style="color:var(--green);">✅ Prêt</div>`;
  const btn = $('btn-start-compost');
  if (btn) btn.disabled = false;
}

async function joinCompostRoom() {
  if (!U || U.isGuest) { toast('❌ Connecte-toi'); return; }
  const code = ($('compost-join-input')?.value || '').trim().toUpperCase();
  if (!code) { toast('❌ Entre un code'); return; }

  // Broadcast join to host
  const ch = _SB.channel(`compost-lobby-${code}`);
  ch.subscribe(status => {
    if (status === 'SUBSCRIBED') {
      ch.send({ type: 'broadcast', event: 'join', payload: {
        email: U.email, name: U.name, skin: _mySkin.id,
      }});
    }
  });

  _compostRoom = {
    code, host: null, hostName: null, hostSkin: null,
    guest: U.email, guestName: U.name, guestSkin: _mySkin.id,
    status: 'waiting', nL: S.nL, tL: S.tL, role: 'guest',
  };
  _compostLobbyChannel = ch;

  // Wait for game start signal
  ch.on('broadcast', { event: 'start' }, ({ payload }) => {
    _compostRoom = { ..._compostRoom, ...payload, role: 'guest' };
    _launchCompost();
  });

  toast(`✅ Rejoint le salon ${code} !`);
  $('compost-join-input').value = '';
  const el = $('compost-lobby-content');
  if (el) el.innerHTML = `
    <div class="lobby-room-card" style="text-align:center;">
      <div style="font-size:2.5rem;margin-bottom:10px;">⏳</div>
      <div style="font-weight:900;">Code : ${code}</div>
      <div style="color:var(--muted);font-size:.85rem;margin-top:8px;">En attente que l'hôte lance la partie…</div>
    </div>`;
}

// ── GAME LAUNCH ───────────────────────────────────────────────
function startCompostGame() {
  if (!_compostRoom?.guest) {
    // No opponent — start solo vs bot
    startCompostSolo();
    return;
  }
  try {
    _compostLobbyChannel?.send({
      type: 'broadcast', event: 'start',
      payload: { ..._compostRoom, role: 'host' },
    });
  } catch(e) {}
  _compostRoom.role = 'host';
  _launchCompost();
}

function _launchCompost() {
  goTo('compost-game');
  setTimeout(() => _initCompostGame(), 100);
}

// ── GAME ENGINE ───────────────────────────────────────────────
function _initCompostGame() {
  const canvas = $('compost-canvas');
  if (!canvas) return;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const isHost = _compostRoom?.role === 'host';
  const mySkin = _mySkin;
  const opponentSkinId = isHost ? _compostRoom?.guestSkin : _compostRoom?.hostSkin;
  const opponentSkin = WORM_SKINS.find(s => s.id === opponentSkinId) || WORM_SKINS[1];

  // Build questions from WD
  const wordIds = Object.keys(WD).filter(id => WD[id][S.nL] && WD[id][S.tL]);
  const shuffled = wordIds.sort(() => Math.random() - .5).slice(0, 20);

  let qi = 0;
  let myScore = 0;
  let opScore = 0;
  let gameOver = false;

  // My worm state
  let myWorm = {
    body: isHost
      ? [{x:4,y:9},{x:3,y:9},{x:2,y:9}]
      : [{x:19,y:9},{x:20,y:9},{x:21,y:9}],
    dir: isHost ? {x:1,y:0} : {x:-1,y:0},
    nextDir: null,
    alive: true,
    growing: 0,
    skin: mySkin,
    score: 0,
  };

  // Opponent worm state (received via realtime)
  let opWorm = {
    body: isHost
      ? [{x:19,y:9},{x:20,y:9},{x:21,y:9}]
      : [{x:4,y:9},{x:3,y:9},{x:2,y:9}],
    dir: isHost ? {x:-1,y:0} : {x:1,y:0},
    alive: true,
    skin: opponentSkin,
    score: 0,
  };

  // Word bubbles on the map
  let bubbles = [];

  function getCurrentQuestion() {
    if (qi >= shuffled.length) return null;
    return { id: shuffled[qi], word: WD[shuffled[qi]][S.nL], answer: WD[shuffled[qi]][S.tL] };
  }

  function spawnBubbles() {
    const q = getCurrentQuestion();
    if (!q) return;
    bubbles = [];
    // Correct answer
    const allAnswers = shuffled.map(id => WD[id][S.tL]).filter(a => a !== q.answer);
    const wrongs = allAnswers.sort(() => Math.random() - .5).slice(0, 4);
    const all = [q.answer, ...wrongs].sort(() => Math.random() - .5);

    const positions = [];
    all.forEach(word => {
      let pos;
      let tries = 0;
      do {
        pos = { x: 1 + Math.floor(Math.random() * (COLS-2)), y: 4 + Math.floor(Math.random() * (ROWS-6)) };
        tries++;
      } while (tries < 30 && positions.some(p => Math.abs(p.x-pos.x) < 3 && Math.abs(p.y-pos.y) < 2));
      positions.push(pos);
      const emoji = WORD_EMOJIS[shuffled[qi]] || '';
      bubbles.push({ word, pos, correct: word === q.answer, emoji });
    });
  }

  spawnBubbles();

  // Bot AI for solo mode
  const isSolo = _compostRoom?.solo === true || _compostRoom?.guest === 'bot';
  let botMoveTimer = 0;

  function botUpdate(ts) {
    if (!isSolo || gameOver) return;
    if (ts - botMoveTimer < 600) return; // bot moves every 600ms
    botMoveTimer = ts;
    if (!opWorm.alive) return;

    // Bot tries to move toward the correct bubble
    const q = getCurrentQuestion();
    if (!q) return;
    const target = bubbles.find(b => b.correct);
    if (!target) return;

    const head = opWorm.body[0];
    const dx = target.pos.x - head.x;
    const dy = target.pos.y - head.y;

    // Pick direction toward target, avoid reversing
    let newDir = opWorm.dir;
    if (Math.abs(dx) > Math.abs(dy)) {
      const d = { x: dx > 0 ? 1 : -1, y: 0 };
      if (!(d.x === -opWorm.dir.x)) newDir = d;
    } else {
      const d = { x: 0, y: dy > 0 ? 1 : -1 };
      if (!(d.y === -opWorm.dir.y)) newDir = d;
    }
    opWorm.dir = newDir;

    // Move bot worm
    const newHead = {
      x: (opWorm.body[0].x + opWorm.dir.x + COLS) % COLS,
      y: (opWorm.body[0].y + opWorm.dir.y + ROWS) % ROWS,
    };
    if (!opWorm.body.some(s => s.x === newHead.x && s.y === newHead.y)) {
      opWorm.body.unshift(newHead);
      opWorm.body.pop();

      // Bot eats bubble
      const eaten = bubbles.find(b => b.pos.x === newHead.x && b.pos.y === newHead.y);
      if (eaten) {
        if (eaten.correct) {
          opWorm.score += 10; opScore = opWorm.score;
          sT('compost-op-score', opScore);
          qi++; if (qi < shuffled.length) spawnBubbles();
          else { gameOver = true; _endCompost(myScore, opScore, ctx); }
        } else {
          opWorm.score = Math.max(0, opWorm.score - 5); opScore = opWorm.score;
          sT('compost-op-score', opScore);
        }
      }
    }
  }

  // Realtime sync (multiplayer only)
  let gameChannel = null;
  if (!isSolo) {
    try {
      gameChannel = _SB.channel(`compost-game-${_compostRoom?.code || 'local'}`)
        .on('broadcast', { event: 'move' }, ({ payload }) => {
          if (payload.email !== U?.email) {
            opWorm.body = payload.body;
            opWorm.dir = payload.dir;
            opWorm.alive = payload.alive;
            opWorm.score = payload.score;
            opScore = payload.score;
            sT('compost-op-score', opWorm.score);
          }
        })
        .on('broadcast', { event: 'eat' }, ({ payload }) => {
          if (payload.email !== U?.email && payload.qi === qi) {
            qi++; spawnBubbles();
          }
        })
        .subscribe();
      _compostChannel = gameChannel;
    } catch(e) { console.warn('Game channel failed, solo mode', e); }
  }

  // Input
  const keyMap = { ArrowUp:{x:0,y:-1}, ArrowDown:{x:0,y:1}, ArrowLeft:{x:-1,y:0}, ArrowRight:{x:1,y:0},
    w:{x:0,y:-1}, s:{x:0,y:1}, a:{x:-1,y:0}, d:{x:1,y:0} };
  function onKey(e) {
    const d = keyMap[e.key];
    if (d && !(d.x === -myWorm.dir.x && d.y === -myWorm.dir.y)) {
      myWorm.nextDir = d;
      e.preventDefault();
    }
  }
  document.addEventListener('keydown', onKey);

  // Touch controls (D-pad)
  function bindDpad() {
    [['btn-up',{x:0,y:-1}],['btn-down',{x:0,y:1}],['btn-left',{x:-1,y:0}],['btn-right',{x:1,y:0}]].forEach(([id,d]) => {
      const el = $(id);
      if (!el) return;
      const go = () => { if(!(d.x===-myWorm.dir.x && d.y===-myWorm.dir.y)) myWorm.nextDir=d; };
      el.addEventListener('touchstart', go, {passive:true});
      el.addEventListener('mousedown', go);
    });
  }
  bindDpad();

  let lastMove = 0;
  const SPEED = 150; // ms per move

  function update(ts) {
    if (gameOver) return;
    botUpdate(ts);
    if (ts - lastMove < SPEED) { requestAnimationFrame(update); return; }
    lastMove = ts;

    if (myWorm.alive) {
      if (myWorm.nextDir) { myWorm.dir = myWorm.nextDir; myWorm.nextDir = null; }
      const head = myWorm.body[0];
      const newHead = {
        x: (head.x + myWorm.dir.x + COLS) % COLS,
        y: (head.y + myWorm.dir.y + ROWS) % ROWS,
      };

      // Self collision
      if (myWorm.body.some(s => s.x === newHead.x && s.y === newHead.y)) {
        myWorm.alive = false;
      } else {
        myWorm.body.unshift(newHead);
        if (myWorm.growing > 0) { myWorm.growing--; }
        else myWorm.body.pop();

        // Check bubble eating
        const eaten = bubbles.find(b => b.pos.x === newHead.x && b.pos.y === newHead.y);
        if (eaten) {
          if (eaten.correct) {
            myWorm.score += 10;
            myWorm.growing += 2;
            myScore = myWorm.score;
            sT('compost-my-score', myScore);
            qi++;
            if (!isSolo && gameChannel) { try { gameChannel.send({ type:'broadcast', event:'eat', payload:{ email:U?.email, qi: qi-1 }}); } catch(e) {} }
            if (qi < shuffled.length) spawnBubbles();
            else { gameOver = true; _endCompost(myScore, opScore, ctx); return; }
          } else {
            myWorm.score = Math.max(0, myWorm.score - 5);
            myScore = myWorm.score;
            sT('compost-my-score', myScore);
            if (myWorm.body.length > 3) { myWorm.body.pop(); myWorm.body.pop(); }
          }
        }

        // Broadcast position (multiplayer only)
        if (!isSolo && gameChannel) {
          try {
            gameChannel.send({ type:'broadcast', event:'move', payload:{
              email: U?.email, body: myWorm.body, dir: myWorm.dir,
              alive: myWorm.alive, score: myWorm.score,
            }});
          } catch(e) {}
        }
      }
    }

    draw(ctx, myWorm, opWorm, bubbles, getCurrentQuestion());
    requestAnimationFrame(update);
  }

  function drawWorm(ctx, worm) {
    if (!worm.alive) return;
    worm.body.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? worm.skin.head : worm.skin.body;
      const x = seg.x * CELL, y = seg.y * CELL;
      ctx.beginPath();
      ctx.roundRect(x+2, y+2, CELL-4, CELL-4, 6);
      ctx.fill();
      // Trail glow on last segments
      if (i > 0 && i < 4) {
        ctx.fillStyle = worm.skin.trail + '33';
        ctx.beginPath();
        ctx.roundRect(x+1, y+1, CELL-2, CELL-2, 7);
        ctx.fill();
      }
      // Eyes on head
      if (i === 0) {
        ctx.fillStyle = worm.skin.eye;
        const ex1 = worm.dir.x !== 0 ? x + CELL - 7 : x + 5;
        const ey1 = worm.dir.y !== 0 ? y + 5 : y + 5;
        const ex2 = worm.dir.x !== 0 ? x + CELL - 7 : x + CELL - 7;
        const ey2 = worm.dir.y !== 0 ? y + CELL - 7 : y + 5;
        ctx.beginPath(); ctx.arc(ex1+1, ey1+1, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex2+1, ey2+1, 3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(ex1+2, ey1+1, 1.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex2+2, ey2+1, 1.5, 0, Math.PI*2); ctx.fill();
      }
    });
  }

  function drawBubble(ctx, b) {
    const x = b.pos.x * CELL, y = b.pos.y * CELL;
    // Bubble background
    ctx.fillStyle = b.correct ? 'rgba(16,185,129,0.2)' : 'rgba(30,30,60,0.85)';
    ctx.strokeStyle = b.correct ? '#10b981' : 'rgba(124,58,237,0.4)';
    ctx.lineWidth = b.correct ? 1.5 : 1;
    ctx.beginPath();
    const w = Math.max(b.word.length * 7 + 12, CELL*2);
    ctx.roundRect(x - (w/2 - CELL/2), y - 2, w, CELL + 4, 8);
    ctx.fill(); ctx.stroke();
    // Emoji
    if (b.emoji) {
      ctx.font = '12px serif';
      ctx.fillText(b.emoji, x - (w/2 - CELL/2) + 3, y + 13);
    }
    // Word text
    ctx.fillStyle = b.correct ? '#6ee7b7' : '#c4b5fd';
    ctx.font = `bold 11px Nunito, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(b.word, x + CELL/2, y + 14);
    ctx.textAlign = 'left';
  }

  function draw(ctx, me, op, bubbles, q) {
    // Background
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, W, H);
    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) { ctx.beginPath(); ctx.moveTo(i*CELL,0); ctx.lineTo(i*CELL,H); ctx.stroke(); }
    for (let j = 0; j <= ROWS; j++) { ctx.beginPath(); ctx.moveTo(0,j*CELL); ctx.lineTo(W,j*CELL); ctx.stroke(); }
    // Question banner
    if (q) {
      ctx.fillStyle = 'rgba(124,58,237,0.25)';
      ctx.fillRect(0, 0, W, CELL * 2);
      ctx.strokeStyle = 'rgba(124,58,237,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, W, CELL * 2);
      const emoji = WORD_EMOJIS[q.id] || '';
      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 14px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${emoji} ${q.word} = ?`, W/2, CELL + 5);
      ctx.textAlign = 'left';
    }
    // Bubbles
    bubbles.forEach(b => drawBubble(ctx, b));
    // Worms
    drawWorm(ctx, me);
    drawWorm(ctx, op);
  }

  requestAnimationFrame(update);

  // Cleanup on exit
  window._compostCleanup = () => {
    gameOver = true;
    document.removeEventListener('keydown', onKey);
    _SB.removeChannel(gameChannel);
    _compostChannel = null;
  };
}

function _endCompost(myScore, opScore, ctx) {
  if (window._compostCleanup) { window._compostCleanup(); window._compostCleanup = null; }

  const won = myScore > opScore;
  const el = $('duel-result-modal');
  if (!el) return;

  if (won) {
    U.coins = (U.coins||0) + 150;
    U.duelsWon = (U.duelsWon||0) + 1;
    saveU(); updateTopBar();
    if (typeof confetti === 'function') confetti();
  }

  el.innerHTML = `
    <div class="duel-result-card ${won ? 'duel-win' : 'duel-lose'}" onclick="event.stopPropagation()">
      <div class="duel-result-emoji">${won ? '🏆' : '🪱'}</div>
      <div class="duel-result-title">${won ? 'Victoire !' : 'Bien joué !'}</div>
      <div class="duel-result-mode">🪱 Compost</div>
      <div class="duel-scores-wrap">
        <div class="duel-score-block ${won?'winner':''}">
          <div class="duel-score-label">👤 Toi</div>
          <div class="duel-score-pts">${myScore}</div>
        </div>
        <div class="duel-vs">VS</div>
        <div class="duel-score-block ${!won?'winner':''}">
          <div class="duel-score-label">Adversaire</div>
          <div class="duel-score-pts">${opScore}</div>
        </div>
      </div>
      ${won ? '<div style="color:var(--green);font-size:.8rem;font-weight:800;">+150 🪙 bonus victoire !</div>' : ''}
      <button class="btn btn-primary" onclick="closeDuelResult();navTo(\'learn\')" style="margin-top:16px;width:100%;">Retour</button>
    </div>`;
  el.style.display = 'flex';
}

function closeCompostGame() {
  if (window._compostCleanup) { window._compostCleanup(); window._compostCleanup = null; }
  if (_compostLobbyChannel) { _SB.removeChannel(_compostLobbyChannel); _compostLobbyChannel = null; }
  navTo('learn');
}
