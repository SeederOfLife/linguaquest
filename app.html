// ══════════════════════════════════════════════════════════════
// FRIENDS.JS — Friend requests, friend list, duel invite
//
// Supabase SQL (run once in dashboard):
// CREATE TABLE friendships (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   requester_email TEXT NOT NULL,
//   receiver_email  TEXT NOT NULL,
//   status TEXT DEFAULT 'pending',  -- 'pending' | 'accepted' | 'declined'
//   created_at TIMESTAMPTZ DEFAULT NOW(),
//   UNIQUE(requester_email, receiver_email)
// );
// ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "pub_read"   ON friendships FOR SELECT USING (true);
// CREATE POLICY "pub_insert" ON friendships FOR INSERT WITH CHECK (true);
// CREATE POLICY "pub_update" ON friendships FOR UPDATE USING (true);
// ══════════════════════════════════════════════════════════════

let _friendsSearchTimer = null;
let _friendsCache = null;
let _pendingCache  = null;

// ── RENDER MAIN SCREEN ────────────────────────────────────────
async function renderFriendsScreen() {
  await Promise.all([_loadFriends(), _loadPending()]);
  if (typeof loadUnreadCounts === 'function') loadUnreadCounts();
  if (typeof initRoomsRefresh === 'function') initRoomsRefresh();
}

// ── SEARCH ────────────────────────────────────────────────────
function friendsSearchDebounce() {
  clearTimeout(_friendsSearchTimer);
  _friendsSearchTimer = setTimeout(friendsSearch, 500);
}

async function friendsSearch() {
  const query = ($('friends-search-input')?.value || '').trim().toLowerCase();
  const el = $('friends-search-result');
  if (!el) return;
  if (!query || query.length < 3) { el.innerHTML = ''; return; }

  el.innerHTML = '<div style="color:var(--muted);font-size:.8rem;text-align:center;padding:10px;">Recherche…</div>';

  try {
    // Search by partial email match
    // Search by email OR pseudo
    const { data: byEmail } = await _SB.from('users').select('data').ilike('email', `%${query}%`).limit(3);
    const { data: byPseudo } = await _SB.from('users').select('data').ilike('pseudo', `%${query}%`).limit(3);
    const seen = new Set();
    const allData = [...(byEmail||[]), ...(byPseudo||[])].filter(r => {
      if (!r.data || seen.has(r.data.email)) return false;
      seen.add(r.data.email); return true;
    });
    const data = allData; const error = null;

    if (error || !data || !data.length) {
      el.innerHTML = '<div style="color:var(--muted);font-size:.8rem;text-align:center;padding:10px;">Aucun utilisateur trouvé</div>';
      return;
    }

    const users = data
      .map(r => r.data)
      .filter(u => u && u.email && u.email !== U.email && !u.isGuest);

    if (!users.length) {
      el.innerHTML = '<div style="color:var(--muted);font-size:.8rem;text-align:center;padding:10px;">Aucun résultat</div>';
      return;
    }

    // Check existing friendship status
    const emails = users.map(u => u.email);
    const { data: existing } = await _SB
      .from('friendships')
      .select('*')
      .or(`requester_email.in.(${emails.map(e=>`"${e}"`).join(',')}),receiver_email.in.(${emails.map(e=>`"${e}"`).join(',')})`);

    el.innerHTML = users.map(u => {
      const fs = (existing || []).find(f =>
        (f.requester_email === U.email && f.receiver_email === u.email) ||
        (f.requester_email === u.email && f.receiver_email === U.email)
      );
      return _userSearchCard(u, fs);
    }).join('');

  } catch(e) {
    el.innerHTML = '<div style="color:var(--muted);font-size:.8rem;text-align:center;padding:10px;">Erreur de recherche</div>';
    console.error('friendsSearch', e);
  }
}

function _userSearchCard(u, friendship) {
  const initial = (u.name || '?').charAt(0).toUpperCase();
  let btn = '';
  if (!friendship) {
    btn = `<button class="btn btn-primary btn-sm" onclick="sendFriendRequest('${u.email}')">➕ Ajouter</button>`;
  } else if (friendship.status === 'pending') {
    const sent = friendship.requester_email === U.email;
    btn = `<span style="font-size:.75rem;color:var(--muted);font-weight:700;">${sent ? '⏳ En attente' : '📬 Veut être ami'}</span>`;
  } else if (friendship.status === 'accepted') {
    btn = `<span style="font-size:.75rem;color:var(--green);font-weight:800;">✅ Ami</span>`;
  }
  return `
    <div class="friend-card">
      <div class="friend-avatar">${initial}</div>
      <div class="friend-info">
        <div class="friend-name">${u.name || u.email}</div>
        <div class="friend-meta">${u.email} · ${u.xp||0} XP</div>
      </div>
      <div>${btn}</div>
    </div>`;
}

// ── SEND REQUEST ──────────────────────────────────────────────
async function sendFriendRequest(receiverEmail) {
  if (!U || U.isGuest) { toast('❌ Connecte-toi pour ajouter des amis'); return; }
  if (receiverEmail === U.email) { toast('❌ Tu ne peux pas t\'ajouter toi-même !'); return; }

  try {
    // Check not already friends
    const { data: existing } = await _SB
      .from('friendships')
      .select('id, status')
      .or(`and(requester_email.eq.${U.email},receiver_email.eq.${receiverEmail}),and(requester_email.eq.${receiverEmail},receiver_email.eq.${U.email})`)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'accepted') { toast('✅ Vous êtes déjà amis !'); return; }
      if (existing.status === 'pending')  { toast('⏳ Demande déjà envoyée'); return; }
    }

    const { error } = await _SB.from('friendships').insert({
      requester_email: U.email,
      receiver_email:  receiverEmail,
      status: 'pending',
    });
    if (error) throw error;

    toast('✅ Demande d\'ami envoyée !');
    // Refresh search results
    friendsSearch();
  } catch(e) {
    toast('❌ Erreur — réessaie');
    console.error('sendFriendRequest', e);
  }
}

// ── ACCEPT / DECLINE ─────────────────────────────────────────
async function acceptFriend(id) {
  try {
    const { error } = await _SB
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', id);
    if (error) throw error;
    toast('🎉 Ami accepté !');
    _pendingCache = null;
    _friendsCache = null;
    renderFriendsScreen();
  } catch(e) { toast('❌ Erreur'); console.error(e); }
}

async function declineFriend(id) {
  try {
    const { error } = await _SB
      .from('friendships')
      .delete()
      .eq('id', id);
    if (error) throw error;
    toast('Demande refusée');
    _pendingCache = null;
    renderFriendsScreen();
  } catch(e) { toast('❌ Erreur'); console.error(e); }
}

async function removeFriend(id) {
  if (!confirm('Supprimer cet ami ?')) return;
  try {
    await _SB.from('friendships').delete().eq('id', id);
    toast('Ami supprimé');
    _friendsCache = null;
    _loadFriends();
  } catch(e) { toast('❌ Erreur'); }
}

// ── LOAD PENDING REQUESTS ─────────────────────────────────────
async function _loadPending() {
  const wrap = $('friends-pending-wrap');
  const list = $('friends-pending-list');
  if (!list) return;

  try {
    const { data } = await _SB
      .from('friendships')
      .select('*')
      .eq('receiver_email', U.email)
      .eq('status', 'pending');

    if (!data || !data.length) {
      if (wrap) wrap.style.display = 'none';
      return;
    }

    if (wrap) wrap.style.display = '';

    // Fetch requester names
    const emails = data.map(f => f.requester_email);
    const { data: userData } = await _SB
      .from('users')
      .select('data')
      .in('email', emails);

    const userMap = {};
    (userData || []).forEach(r => { if (r.data) userMap[r.data.email] = r.data; });

    list.innerHTML = data.map(f => {
      const u = userMap[f.requester_email] || { name: f.requester_email, xp: 0 };
      const initial = (u.name || '?').charAt(0).toUpperCase();
      return `
        <div class="friend-card">
          <div class="friend-avatar" style="background:linear-gradient(135deg,var(--accent2),var(--accent));">${initial}</div>
          <div class="friend-info">
            <div class="friend-name">${u.name || f.requester_email}</div>
            <div class="friend-meta">${f.requester_email} · ${u.xp||0} XP</div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-primary btn-sm" onclick="acceptFriend('${f.id}')">✓ Accepter</button>
            <button class="btn btn-secondary btn-sm" onclick="declineFriend('${f.id}')">✕</button>
          </div>
        </div>`;
    }).join('');

    // Show badge on tab
    const tab = $('rank-tab-friends');
    if (tab && data.length > 0) {
      tab.innerHTML = `👥 Amis <span style="background:var(--accent2);color:#fff;border-radius:10px;padding:1px 7px;font-size:.65rem;margin-left:4px;">${data.length}</span>`;
    }

  } catch(e) { console.error('_loadPending', e); }
}

// ── LOAD FRIENDS LIST ─────────────────────────────────────────
async function _loadFriends() {
  const el = $('friends-list');
  if (!el) return;

  try {
    // Get all accepted friendships involving me
    const { data: friendships } = await _SB
      .from('friendships')
      .select('*')
      .eq('status', 'accepted')
      .or(`requester_email.eq.${U.email},receiver_email.eq.${U.email}`);

    if (!friendships || !friendships.length) {
      el.innerHTML = `
        <div style="text-align:center;padding:32px;color:var(--muted);">
          <div style="font-size:2.5rem;margin-bottom:10px;">👥</div>
          <div style="font-weight:800;margin-bottom:6px;">Aucun ami pour l'instant</div>
          <div style="font-size:.8rem;">Cherche un ami par email ci-dessus !</div>
        </div>`;
      return;
    }

    // Get friend emails
    const friendEmails = friendships.map(f =>
      f.requester_email === U.email ? f.receiver_email : f.requester_email
    );

    const { data: userData } = await _SB
      .from('users')
      .select('data')
      .in('email', friendEmails);

    const userMap = {};
    (userData || []).forEach(r => { if (r.data) userMap[r.data.email] = r.data; });

    el.innerHTML = friendships.map(f => {
      const friendEmail = f.requester_email === U.email ? f.receiver_email : f.requester_email;
      const u = userMap[friendEmail] || { name: friendEmail, xp: 0, streak: 0, coins: 0 };
      return _friendCard(u, f.id);
    }).join('');

  } catch(e) {
    el.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;font-size:.85rem;">Erreur de chargement</div>';
    console.error('_loadFriends', e);
  }
}

function _friendCard(u, friendshipId) {
  const unread = typeof getUnread === 'function' ? getUnread(u.email) : 0;
  const unreadBadge = unread > 0 ? ` <span style="background:var(--accent2);color:#fff;border-radius:8px;padding:0 5px;font-size:.6rem;">${unread}</span>` : '';
  const onlineStatus = typeof onlineLabel === 'function' ? onlineLabel(u.lastSeen) : '';
  const initial   = (u.name || '?').charAt(0).toUpperCase();
  const dotHtml   = typeof onlineDot === 'function' ? onlineDot(u.lastSeen) : '';
  const streak    = u.streak  || 0;
  const xp        = u.xp     || 0;
  const coins     = Math.floor(u.coins || 0);
  const lvl       = u.investorLevel || 1;

  // XP bar for level (rough estimate)
  const xpPct = Math.min(100, Math.round((xp % 500) / 500 * 100));

  return `
    <div class="friend-card friend-card-full">
      <div class="friend-avatar-wrap">
        ${dotHtml}<div class="friend-avatar friend-avatar-lg">${initial}</div>
        ${streak >= 3 ? `<div class="friend-streak-badge">🔥${streak}</div>` : ''}
      </div>
      <div class="friend-info" style="flex:1;">
        <div class="friend-name">${u.name || u.email}</div>
        <div class="friend-meta">${u.email} ${onlineStatus}</div>
        <div class="friend-stats">
          <span class="friend-stat">⭐ ${xp.toLocaleString()} XP</span>
          <span class="friend-stat">🪙 ${coins.toLocaleString()}</span>
          <span class="friend-stat">📈 Niv.${lvl}</span>
        </div>
        <div class="friend-xp-bar">
          <div class="friend-xp-fill" style="width:${xpPct}%"></div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">
        <button class="btn btn-primary btn-sm" onclick="openChat('${u.email}','${(u.name||'Ami').replace(/'/g,'')}')" >💬 Message</button>
        <button class="btn btn-secondary btn-sm" onclick="inviteFriendToDuel('${u.email}')">⚔️ Duel</button>
        <button class="btn btn-secondary btn-sm" onclick="removeFriend('${friendshipId}')" style="font-size:.7rem;padding:4px 8px;opacity:.6;">Retirer</button>
      </div>
    </div>`;
}

// ── INVITE FRIEND TO DUEL ─────────────────────────────────────
function inviteFriendToDuel(friendEmail) {
  if (!S.nL || !S.tL) { toast('Choisis une langue d\'abord'); navTo('learn'); return; }
  // Open create duel modal — friend email shown for sharing
  openCreateDuel();
  // Show a hint in the modal
  setTimeout(() => {
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:.75rem;color:var(--accent3);font-weight:700;margin-bottom:10px;text-align:center;';
    hint.textContent = `⚔️ Duel contre ${friendEmail} — crée et partage le code !`;
    const modal = $('duel-create-modal');
    if (modal) {
      const box = modal.querySelector('.modal-box');
      if (box) box.insertBefore(hint, box.children[1]);
    }
    // Store email for auto-fill after creation
    window._duelFriendEmail = friendEmail;
  }, 100);
}
