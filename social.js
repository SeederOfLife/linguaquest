// ══════════════════════════════════════════════════════════════
// SOCIAL.JS — Pseudo, Online presence, Messaging, Practice rooms
//
// ── NEW SUPABASE SQL (run in dashboard) ──────────────────────
//
// -- Messages table
// CREATE TABLE messages (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   from_email TEXT NOT NULL,
//   to_email   TEXT NOT NULL,
//   content    TEXT NOT NULL,
//   read       BOOLEAN DEFAULT false,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
// ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "pub_all" ON messages FOR ALL USING (true) WITH CHECK (true);
//
// -- Practice rooms table
// CREATE TABLE practice_rooms (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   code TEXT UNIQUE NOT NULL,
//   host_email TEXT NOT NULL,
//   host_name  TEXT NOT NULL,
//   lang_native  TEXT,
//   lang_target  TEXT,
//   topic TEXT DEFAULT 'any',
//   max_players INT DEFAULT 4,
//   status TEXT DEFAULT 'open',  -- 'open' | 'started' | 'closed'
//   players JSONB DEFAULT '[]',
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
// ALTER TABLE practice_rooms ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "pub_all" ON practice_rooms FOR ALL USING (true) WITH CHECK (true);
//
// ══════════════════════════════════════════════════════════════

// ── PSEUDO SYSTEM ─────────────────────────────────────────────
let _pseudoCheckTimer = null;
let _pseudoAvailable = false;

function openPseudoModal() {
  const el = $('pseudo-modal');
  if (!el) return;
  const inp = $('pseudo-input');
  if (inp) inp.value = U.pseudo || '';
  const msg = $('pseudo-check-msg');
  if (msg) msg.textContent = U.pseudo ? `@${U.pseudo} · pseudo actuel` : '';
  el.style.display = 'flex';
  setTimeout(() => inp?.focus(), 80);
}
function closePseudoModal() { const el=$('pseudo-modal');if(el)el.style.display='none'; }

function pseudoCheckDebounce() {
  clearTimeout(_pseudoCheckTimer);
  _pseudoCheckTimer = setTimeout(checkPseudoAvailability, 400);
}

async function checkPseudoAvailability() {
  const val = ($('pseudo-input')?.value||'').trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
  const msg = $('pseudo-check-msg');
  if (!msg) return;
  if (!val || val.length < 3) { msg.textContent = 'Minimum 3 caractères'; msg.style.color='var(--muted)'; _pseudoAvailable=false; return; }
  if (val.length > 20)        { msg.textContent = 'Maximum 20 caractères'; msg.style.color='var(--accent2)'; _pseudoAvailable=false; return; }
  if (val === U.pseudo)       { msg.textContent = '✅ C\'est ton pseudo actuel'; msg.style.color='var(--green)'; _pseudoAvailable=true; return; }

  msg.textContent = 'Vérification…'; msg.style.color='var(--muted)';
  try {
    const { data } = await _SB.from('users').select('email').eq('pseudo', val).maybeSingle();
    if (data) {
      msg.textContent = `❌ @${val} déjà pris`; msg.style.color='var(--accent2)'; _pseudoAvailable=false;
    } else {
      msg.textContent = `✅ @${val} disponible !`; msg.style.color='var(--green)'; _pseudoAvailable=true;
    }
  } catch(e) { msg.textContent = 'Erreur de vérification'; }
}

async function savePseudo() {
  const val = ($('pseudo-input')?.value||'').trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
  if (!_pseudoAvailable && val !== U.pseudo) { toast('❌ Pseudo non disponible'); return; }
  U.pseudo = val;
  await saveU();
  const el = $('prof-pseudo');
  if (el) el.textContent = val ? `@${val}` : '+ Ajouter un pseudo';
  closePseudoModal();
  toast(`✅ Pseudo @${val} enregistré !`);
}

function initPseudoDisplay() {
  const el = $('prof-pseudo');
  if (el) el.textContent = U.pseudo ? `@${U.pseudo}` : '+ Ajouter un pseudo';
}

// ── ONLINE PRESENCE ────────────────────────────────────────────
let _presenceInterval = null;
const ONLINE_THRESHOLD = 3 * 60 * 1000; // 3 min

function startPresence() {
  _updateLastSeen();
  clearInterval(_presenceInterval);
  _presenceInterval = setInterval(_updateLastSeen, 60000);
  // Update on user activity
  ['click','keydown','touchstart'].forEach(ev =>
    document.addEventListener(ev, _debouncePresence, { passive: true })
  );
}

let _presenceDebounce = null;
function _debouncePresence() {
  clearTimeout(_presenceDebounce);
  _presenceDebounce = setTimeout(_updateLastSeen, 5000);
}

async function _updateLastSeen() {
  if (!U || U.isGuest) return;
  U.lastSeen = Date.now();
  // Lightweight update — just save lastSeen
  try {
    await _SB.from('users').update({ data: U, updated_at: new Date().toISOString() })
      .eq('email', U.email);
  } catch(e) {}
}

function isOnline(lastSeen) {
  if (!lastSeen) return false;
  return Date.now() - lastSeen < ONLINE_THRESHOLD;
}

function onlineDot(lastSeen) {
  const online = isOnline(lastSeen);
  if (!online) return '';
  return `<div style="position:absolute;bottom:0;right:0;width:10px;height:10px;background:var(--green);border-radius:50%;border:2px solid var(--card);z-index:1;"></div>`;
}

function onlineLabel(lastSeen) {
  if (!lastSeen) return '';
  if (isOnline(lastSeen)) return '<span style="color:var(--green);font-size:.68rem;font-weight:800;">● En ligne</span>';
  const diff = Math.floor((Date.now() - lastSeen) / 60000);
  if (diff < 60)   return `<span style="color:var(--muted);font-size:.68rem;">vu il y a ${diff}min</span>`;
  if (diff < 1440) return `<span style="color:var(--muted);font-size:.68rem;">vu il y a ${Math.floor(diff/60)}h</span>`;
  return `<span style="color:var(--muted);font-size:.68rem;">vu il y a ${Math.floor(diff/1440)}j</span>`;
}

// ── MESSAGING ─────────────────────────────────────────────────
let _activeChatEmail = null;
let _msgSubscription = null;
let _unreadCache = {};

function openChat(friendEmail, friendName) {
  _activeChatEmail = friendEmail;
  const modal = $('chat-modal');
  if (!modal) return;
  $('chat-friend-name').textContent = friendName || friendEmail;
  $('chat-messages').innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:.8rem;">Chargement…</div>';
  modal.style.display = 'flex';
  loadMessages(friendEmail);
  markMessagesRead(friendEmail);
  // Subscribe to real-time new messages
  _subscribeToMessages(friendEmail);
  setTimeout(() => $('chat-input')?.focus(), 100);
}

function closeChat() {
  $('chat-modal').style.display = 'none';
  _activeChatEmail = null;
  if (_msgSubscription) { _SB.removeChannel(_msgSubscription); _msgSubscription = null; }
}

async function loadMessages(friendEmail) {
  const el = $('chat-messages');
  if (!el) return;
  try {
    const { data } = await _SB.from('messages')
      .select('*')
      .or(`and(from_email.eq.${U.email},to_email.eq.${friendEmail}),and(from_email.eq.${friendEmail},to_email.eq.${U.email})`)
      .order('created_at', { ascending: true })
      .limit(50);

    if (!data || !data.length) {
      el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:.8rem;">Aucun message — dis bonjour ! 👋</div>';
      return;
    }
    el.innerHTML = data.map(m => _msgBubble(m)).join('');
    el.scrollTop = el.scrollHeight;
  } catch(e) { console.error('loadMessages', e); }
}

function _msgBubble(m) {
  const mine = m.from_email === U.email;
  const time = new Date(m.created_at).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'});
  return `<div class="msg-bubble-wrap ${mine ? 'mine' : 'theirs'}">
    <div class="msg-bubble ${mine ? 'msg-mine' : 'msg-theirs'}">${_escapeHtml(m.content)}</div>
    <div class="msg-time">${time}</div>
  </div>`;
}

function _escapeHtml(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function _subscribeToMessages(friendEmail) {
  if (_msgSubscription) _SB.removeChannel(_msgSubscription);
  _msgSubscription = _SB
    .channel('messages-' + U.email)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: `to_email=eq.${U.email}`
    }, payload => {
      if (payload.new.from_email === _activeChatEmail) {
        const el = $('chat-messages');
        if (el) {
          el.insertAdjacentHTML('beforeend', _msgBubble(payload.new));
          el.scrollTop = el.scrollHeight;
        }
        markMessagesRead(_activeChatEmail);
      } else {
        // Notification for message from someone else
        _unreadCache[payload.new.from_email] = (_unreadCache[payload.new.from_email]||0)+1;
        _updateUnreadBadge();
      }
    })
    .subscribe();
}

async function sendMessage() {
  const inp = $('chat-input');
  const content = (inp?.value||'').trim();
  if (!content || !_activeChatEmail) return;
  inp.value = '';
  try {
    const msg = { from_email: U.email, to_email: _activeChatEmail, content };
    const { data } = await _SB.from('messages').insert(msg).select().single();
    if (data) {
      const el = $('chat-messages');
      if (el) { el.insertAdjacentHTML('beforeend', _msgBubble(data)); el.scrollTop = el.scrollHeight; }
    }
  } catch(e) { toast('❌ Erreur envoi message'); inp.value = content; }
}

async function markMessagesRead(fromEmail) {
  try {
    await _SB.from('messages').update({ read: true })
      .eq('to_email', U.email).eq('from_email', fromEmail).eq('read', false);
    delete _unreadCache[fromEmail];
    _updateUnreadBadge();
  } catch(e) {}
}

async function loadUnreadCounts() {
  if (!U || U.isGuest) return;
  try {
    const { data } = await _SB.from('messages')
      .select('from_email').eq('to_email', U.email).eq('read', false);
    _unreadCache = {};
    (data||[]).forEach(m => { _unreadCache[m.from_email] = (_unreadCache[m.from_email]||0)+1; });
    _updateUnreadBadge();
  } catch(e) {}
}

function getUnread(email) { return _unreadCache[email] || 0; }

function _updateUnreadBadge() {
  const total = Object.values(_unreadCache).reduce((s,n)=>s+n,0);
  const tab = $('rank-tab-friends');
  if (!tab) return;
  if (total > 0) {
    tab.innerHTML = `👥 Amis <span style="background:var(--accent2);color:#fff;border-radius:10px;padding:1px 7px;font-size:.65rem;margin-left:4px;">${total}</span>`;
  } else {
    tab.innerHTML = '👥 Amis';
  }
}

// ── PRACTICE ROOMS ────────────────────────────────────────────
let _roomsInterval = null;

function _randRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:5}, ()=>chars[Math.floor(Math.random()*chars.length)]).join('');
}

async function createPracticeRoom() {
  if (!U || U.isGuest) { toast('❌ Connecte-toi d\'abord'); return; }
  if (!S.nL || !S.tL) { toast('Choisis une langue d\'abord'); navTo('learn'); return; }
  const code = _randRoomCode();
  const topicEl = $('room-topic-select');
  const topic = topicEl?.value || 'any';
  try {
    const { error } = await _SB.from('practice_rooms').insert({
      code, host_email: U.email, host_name: U.name,
      lang_native: S.nL, lang_target: S.tL, topic,
      players: JSON.stringify([{ email: U.email, name: U.name, ready: false }]),
      status: 'open',
    });
    if (error) throw error;
    toast(`🏠 Salon créé ! Code: ${code}`);
    navigator.clipboard?.writeText(code).catch(()=>{});
    loadPracticeRooms();
    renderMyRoom(code);
  } catch(e) { toast('❌ Erreur création salon'); console.error(e); }
}

async function joinPracticeRoom() {
  const code = ($('room-code-input')?.value||'').trim().toUpperCase();
  if (code.length !== 5) { toast('❌ Code à 5 caractères'); return; }
  try {
    const { data, error } = await _SB.from('practice_rooms').select('*').eq('code',code).single();
    if (error || !data) { toast('❌ Salon introuvable'); return; }
    if (data.status !== 'open') { toast('❌ Ce salon est fermé'); return; }

    const players = JSON.parse(data.players||'[]');
    if (players.length >= data.max_players) { toast('❌ Salon complet'); return; }
    if (players.find(p=>p.email===U.email)) { toast('Tu es déjà dans ce salon !'); renderMyRoom(code); return; }

    players.push({ email: U.email, name: U.name, ready: false });
    await _SB.from('practice_rooms').update({ players: JSON.stringify(players) }).eq('code', code);

    S.nL = data.lang_native;
    S.tL = data.lang_target;
    toast(`✅ Rejoint le salon ${code} !`);
    renderMyRoom(code);
  } catch(e) { toast('❌ Erreur'); console.error(e); }
}

async function loadPracticeRooms() {
  const el = $('rooms-list');
  if (!el) return;
  try {
    const { data } = await _SB.from('practice_rooms')
      .select('*').eq('status','open')
      .order('created_at',{ascending:false}).limit(10);

    if (!data || !data.length) {
      el.innerHTML = '<div style="color:var(--muted);font-size:.8rem;text-align:center;padding:16px;">Aucun salon ouvert — crée le premier !</div>';
      return;
    }
    el.innerHTML = data.map(r => _roomCard(r)).join('');
  } catch(e) { console.error('loadPracticeRooms',e); }
}

function _roomCard(r) {
  const players = JSON.parse(r.players||'[]');
  const nFlag = LANGS[r.lang_native]?.flag || r.lang_native || '?';
  const tFlag = LANGS[r.lang_target]?.flag || r.lang_target || '?';
  const isMine = r.host_email === U?.email;
  return `
    <div class="room-card">
      <div class="room-card-left">
        <div class="room-card-host">${r.host_name}</div>
        <div class="room-card-meta">${nFlag} → ${tFlag} · ${players.length}/${r.max_players} joueurs</div>
        <div class="room-players">${players.map(p=>`<span class="room-player-chip">${p.name.charAt(0).toUpperCase()}</span>`).join('')}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
        <div class="room-code-badge">${r.code}</div>
        ${isMine
          ? `<button class="btn btn-sm btn-primary" onclick="startRoomGame('${r.code}')">▶ Lancer</button>`
          : `<button class="btn btn-sm btn-primary" onclick="joinRoomDirectly('${r.code}')">Rejoindre</button>`}
      </div>
    </div>`;
}

async function joinRoomDirectly(code) {
  if ($('room-code-input')) $('room-code-input').value = code;
  await joinPracticeRoom();
}

async function startRoomGame(code) {
  try {
    await _SB.from('practice_rooms').update({ status: 'started' }).eq('code', code);
    // Launch a practice game with current lang pair
    if (typeof startPractice === 'function') startPractice();
    toast('🎮 La session commence !');
    switchRankTab('duels');
  } catch(e) { toast('❌ Erreur'); }
}

function renderMyRoom(code) {
  const el = $('my-room-zone');
  if (!el) return;
  el.style.display = '';
  el.innerHTML = `
    <div class="room-card" style="border-color:rgba(16,185,129,.3);background:rgba(16,185,129,.05);">
      <div class="room-card-left">
        <div style="font-weight:900;font-size:.88rem;color:var(--green);">🏠 Mon salon actif</div>
        <div class="room-code-badge" style="margin-top:6px;font-size:1.1rem;letter-spacing:3px;">${code}</div>
        <div style="font-size:.72rem;color:var(--muted);margin-top:4px;">Partage ce code !</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <button class="btn btn-sm btn-primary" onclick="startRoomGame('${code}')">▶ Lancer</button>
        <button class="btn btn-sm btn-secondary" onclick="copyRoomCode('${code}')">📋 Copier</button>
      </div>
    </div>`;
}

function copyRoomCode(code) {
  navigator.clipboard?.writeText(code).then(()=>toast('Code copié !')).catch(()=>toast(code));
}

function stopRoomsRefresh() { clearInterval(_roomsInterval); }

function initRoomsRefresh() {
  loadPracticeRooms();
  clearInterval(_roomsInterval);
  _roomsInterval = setInterval(loadPracticeRooms, 15000);
}

// ── HELPERS ───────────────────────────────────────────────────
function chatKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function selectRoomTopic(btn) {
  document.querySelectorAll('#room-topic-select .duel-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ── BOOT HOOK ─────────────────────────────────────────────────
// Call this from afterLogin / boot.js
function initSocial() {
  if (!U || U.isGuest) return;
  initPseudoDisplay();
  startPresence();
  loadUnreadCounts();
  // Subscribe to incoming messages globally
  _SB.channel('inbox-' + U.email)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: `to_email=eq.${U.email}`
    }, payload => {
      if (payload.new.from_email !== _activeChatEmail) {
        _unreadCache[payload.new.from_email] = (_unreadCache[payload.new.from_email]||0)+1;
        _updateUnreadBadge();
        // Show a subtle toast
        toast(`💬 Nouveau message`);
      }
    })
    .subscribe();
}
