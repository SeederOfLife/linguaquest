// ══════════════════════════════════════════════════════════════
// LEADERBOARD.JS — Global rankings via Supabase
// ══════════════════════════════════════════════════════════════

let _lbCache = null;
let _lbCacheTime = 0;
let _lbTab = 'xp'; // 'xp' | 'coins' | 'streak'

async function fetchLeaderboard(force) {
  const now = Date.now();
  if (!force && _lbCache && now - _lbCacheTime < 5 * 60 * 1000) return _lbCache;

  try {
    const { data, error } = await _SB.from('users').select('data').limit(200);
    if (error || !data) return [];
    const players = data
      .map(r => r.data)
      .filter(u => u && u.name && !u.isGuest)
      .map(u => ({
        name:   u.name,
        xp:     u.xp     || 0,
        coins:  u.coins  || 0,
        streak: u.streak || 0,
        trophies: (u.trophies||[]).length,
        level:  u.investorLevel || 1,
        email:  u.email,
      }));
    _lbCache = players;
    _lbCacheTime = now;
    return players;
  } catch(e) { return []; }
}

async function renderLeaderboard() {
  const el = document.getElementById('lb-list');
  const myRank = document.getElementById('lb-my-rank');
  if (!el) return;

  el.innerHTML = `<div style="text-align:center;padding:30px;color:var(--muted);">${t('lb_loading')}</div>`;

  const players = await fetchLeaderboard();
  if (!players.length) {
    el.innerHTML = `<div style="text-align:center;padding:30px;color:var(--muted);">${t('lb_error')}</div>`;
    return;
  }

  const sorted = [...players].sort((a,b) => b[_lbTab] - a[_lbTab]);
  const myIdx  = sorted.findIndex(p => p.email === U?.email);

  const medals = ['🥇','🥈','🥉'];
  el.innerHTML = sorted.slice(0, 50).map((p, i) => {
    const isMe = p.email === U?.email;
    const medal = medals[i] || `${i+1}`;
    return `<div class="lb-row ${isMe ? 'lb-me' : ''}">
      <div class="lb-rank">${medal}</div>
      <div class="lb-avatar">${p.name.charAt(0).toUpperCase()}</div>
      <div class="lb-info">
        <div class="lb-name">${isMe ? '👤 ' + p.name : p.name} ${p.trophies > 0 ? `<span style="font-size:.65rem;color:var(--gold)">🏆${p.trophies}</span>` : ''}</div>
        <div class="lb-sub">Niv.${p.level} · Streak ${p.streak}🔥</div>
      </div>
      <div class="lb-score">${p[_lbTab].toLocaleString()} ${_lbTab === 'xp' ? 'XP' : _lbTab === 'coins' ? '🪙' : '🔥'}</div>
    </div>`;
  }).join('');

  if (myRank) {
    if (myIdx >= 0) {
      myRank.textContent = myIdx < 50 ? t('lb_rank_top',{r:myIdx+1,t:sorted.length}) : t('lb_rank_climb',{r:myIdx+1});
    } else {
      myRank.textContent = t('lb_rank_play');
    }
  }
}

function setLbTab(tab) {
  _lbTab = tab;
  ['lb-tab-xp','lb-tab-coins','lb-tab-streak'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', id === 'lb-tab-' + tab);
  });
  renderLeaderboard();
}
