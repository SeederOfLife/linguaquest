// ══════════════════════════════════════════════════════════════
// DUELS.JS — Async duels + Practice sessions
// ══════════════════════════════════════════════════════════════

let _currentDuel = null;
let _duelCreateOpts = { type: 'mixed', mode: 'classic', level: 'any', bet: 0 };
let _openDuelsInterval = null;

const DUEL_MODES = [
  { id:'classic',   icon:'⚔️',  name:'Classique', desc:'10 questions · Score total',         color:'#7c3aed', qCount:10 },
  { id:'lightning', icon:'⚡',  name:'Éclair',    desc:'5 questions · 5 secondes chacune',   color:'#f59e0b', qCount:5,  timePerQ:5 },
  { id:'accuracy',  icon:'🎯',  name:'Précision', desc:'Pas de chrono · Erreur = −50 pts',   color:'#06b6d4', qCount:8,  penalty:50 },
  { id:'survival',  icon:'💀',  name:'Survie',    desc:'1 seule erreur = game over',          color:'#e94560', qCount:20, oneLife:true },
  { id:'blitz',     icon:'🌀',  name:'Blitz',     desc:'15 questions · 3s chacune',           color:'#10b981', qCount:15, timePerQ:3 },
];

const PRACTICE_MODES = [
  { id:'free',      icon:'🎮', name:'Pratique libre',  desc:'Choisis ton niveau et joue',              color:'#7c3aed' },
  { id:'sprint',    icon:'🏃', name:'Sprint vocab',    desc:'20 mots en rafale · Mémorisation rapide', color:'#06b6d4' },
  { id:'endurance', icon:'🏋️', name:'Endurance',       desc:'50 questions · Tous les niveaux',         color:'#f59e0b' },
  { id:'custom',    icon:'✏️', name:'Pratique perso',  desc:'Crée ta session avec tes propres mots',   color:'#ec4899' },
];

function _randCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:6}, ()=>chars[Math.floor(Math.random()*chars.length)]).join('');
}

function _buildDuelQuestions(gameType, levelFilter, count) {
  const allIds = Object.keys(WD);
  let pool = allIds;
  if (levelFilter && levelFilter !== 'any') {
    const lc = (CHAPTERS[levelFilter]||[]).flatMap(c=>c.wids||[]);
    if (lc.length >= 6) pool = allIds.filter(id=>lc.includes(id));
  }
  const ids = pool.sort(()=>Math.random()-.5).slice(0, count||10);
  let qs = [];
  if (gameType==='quiz')       qs = ids.map(id=>mkQQ(id,pool));
  else if (gameType==='fill')  qs = ids.map(id=>mkFQ(id));
  else if (gameType==='match') qs = [{type:'match',pairs:ids.slice(0,6).map(id=>({a:WD[id]?.[S.nL]||id,b:WD[id]?.[S.tL]||id}))}];
  else qs = ids.flatMap((id,i)=>i%3===0?[mkFQ(id)]:[mkQQ(id,pool)]).slice(0,count||10);
  return { ids, qs };
}

// ── DUELS SCREEN ─────────────────────────────────────────────
function renderDuelsScreen() {
  _renderDuelSubTab('duel');
  loadOpenDuels();
  clearInterval(_openDuelsInterval);
  _openDuelsInterval = setInterval(loadOpenDuels, 30000);
}

let _duelSubTab = 'duel';
function _renderDuelSubTab(tab) {
  _duelSubTab = tab;
  const isDuel = tab==='duel';
  $('duel-sub-duels').style.display    = isDuel?'':'none';
  $('duel-sub-practice').style.display = isDuel?'none':'';
  $('duel-subtab-duel').classList.toggle('active', isDuel);
  $('duel-subtab-practice').classList.toggle('active', !isDuel);
  if (!isDuel) _renderPracticeTab();
}

// ── PRACTICE ─────────────────────────────────────────────────
let _practiceOpts = { mode:'free', level:'any', type:'mixed' };

function _renderPracticeTab() {
  const el = $('practice-modes-grid');
  if (!el) return;
  el.innerHTML = PRACTICE_MODES.map(m=>`
    <div class="duel-mode-card ${_practiceOpts.mode===m.id?'selected':''}" style="--mode-color:${m.color}" onclick="selectPracticeMode('${m.id}')">
      <div class="duel-mode-icon">${m.icon}</div>
      <div class="duel-mode-name">${m.name}</div>
      <div class="duel-mode-desc">${m.desc}</div>
    </div>`).join('');
}

function selectPracticeMode(id) {
  _practiceOpts.mode = id;
  if (id==='custom') { openCustomPracticeModal(); return; }
  _renderPracticeTab();
}

function selectPracticeLevel(btn, lv) {
  document.querySelectorAll('#practice-level-grid .duel-type-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  _practiceOpts.level = lv;
}

function startPractice() {
  if (!S.nL||!S.tL) { toast(t('choose_two_langs')); navTo('learn'); return; }
  const configs = {
    free:      { count:10, type:_practiceOpts.type, title:'🎮 Pratique libre' },
    sprint:    { count:20, type:'quiz',  title:'🏃 Sprint vocab' },
    endurance: { count:50, type:'mixed', title:'🏋️ Endurance' },
  };
  const cfg = configs[_practiceOpts.mode]||configs.free;
  const { qs } = _buildDuelQuestions(cfg.type, _practiceOpts.level, cfg.count);
  S.qs=qs; S.isPractice=true;
  S.qi=0; S.score=0; S.cor=0; S.wr=0;
  S.ts={quiz:{c:0,w:0},fill:{c:0,w:0},sort:{c:0,w:0},match:{c:0,w:0}};
  S.gType=cfg.type==='mixed'?'mixed':cfg.type;
  goTo('game'); setTypePill(S.gType==='mixed'?'quiz':S.gType);
  sT('g-score',0); $('g-progress').style.width='0%'; renderQ();
  const banner=document.createElement('div');
  banner.className='practice-banner';
  banner.innerHTML=`${cfg.title} · ${qs.length} questions`;
  document.getElementById('game-inner')?.prepend(banner);
}

// Custom Practice
function openCustomPracticeModal() {
  const el=$('custom-practice-modal'); if(el) el.style.display='flex';
  const saved=U.customPractices||[];
  const listEl=$('saved-practices-list');
  if (!listEl) return;
  if (!saved.length) {
    listEl.innerHTML='<div style="color:var(--muted);font-size:.8rem;text-align:center;padding:10px;">Aucune pratique sauvegardée</div>';
  } else {
    listEl.innerHTML=saved.map((p,i)=>`
      <div style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--card2);border-radius:11px;margin-bottom:7px;">
        <div style="flex:1;font-size:.85rem;font-weight:800;">✏️ ${p.title} <span style="color:var(--muted);font-weight:600;">(${p.pairs.length} paires)</span></div>
        <button class="btn btn-primary btn-sm" onclick="launchCustomPractice(${i})">▶ Jouer</button>
        <button class="btn btn-secondary btn-sm" onclick="deleteCustomPractice(${i})">🗑</button>
      </div>`).join('');
  }
}
function closeCustomPracticeModal() { const el=$('custom-practice-modal');if(el)el.style.display='none'; }

function saveCustomPractice() {
  const title=($('cp-title')?.value||'').trim();
  const raw=($('cp-words')?.value||'');
  if (!title) { toast(t('diy_title_required')); return; }
  const pairs=raw.split('\n').map(l=>l.trim()).filter(l=>l.includes('=')).map(l=>{
    const [a,b]=l.split('=').map(s=>s.trim()); return {native:a,target:b};
  }).filter(p=>p.native&&p.target);
  if (pairs.length<2) { toast(t('diy_min_pairs')); return; }
  if (!U.customPractices) U.customPractices=[];
  U.customPractices.push({title,pairs,created:Date.now()});
  saveU(); toast(`✅ "${title}" sauvegardée`);
  if ($('cp-title')) $('cp-title').value='';
  if ($('cp-words')) $('cp-words').value='';
  openCustomPracticeModal();
}

function launchCustomPractice(idx) {
  const p=(U.customPractices||[])[idx]; if(!p) return;
  if (!S.nL||!S.tL) { toast(t('choose_two_langs')); navTo('learn'); return; }
  const ids=p.pairs.map((pr,i)=>{ const id=`custom_${idx}_${i}`; WD[id]={[S.nL]:pr.native,[S.tL]:pr.target}; return id; });
  const qs=ids.flatMap(id=>[mkQQ(id,ids),mkFQ(id)]).slice(0,20);
  S.qs=qs; S.isPractice=true;
  S.qi=0; S.score=0; S.cor=0; S.wr=0;
  S.ts={quiz:{c:0,w:0},fill:{c:0,w:0},sort:{c:0,w:0},match:{c:0,w:0}};
  S.gType='mixed'; closeCustomPracticeModal();
  goTo('game'); setTypePill('quiz');
  sT('g-score',0); $('g-progress').style.width='0%'; renderQ();
  const banner=document.createElement('div'); banner.className='practice-banner';
  banner.innerHTML=`✏️ ${p.title} · ${qs.length} questions`;
  document.getElementById('game-inner')?.prepend(banner);
}

function deleteCustomPractice(idx) {
  if (!confirm(t('diy_delete_confirm'))) return;
  (U.customPractices||[]).splice(idx,1);
  saveU(); openCustomPracticeModal();
}

// ── CREATE DUEL ───────────────────────────────────────────────
function openCreateDuel() {
  if (!U||U.isGuest) { toast(t('duel_login')); return; }
  if (!S.nL||!S.tL)  { toast(t('choose_two_langs')); navTo('learn'); return; }
  _duelCreateOpts={type:'mixed',mode:'classic',level:'any',bet:0};
  const modesEl=$('duel-mode-grid');
  if (modesEl) modesEl.innerHTML=DUEL_MODES.map(m=>`
    <div class="duel-mode-card ${m.id==='classic'?'selected':''}" style="--mode-color:${m.color}" onclick="selectDuelMode(this,'${m.id}')">
      <div class="duel-mode-icon">${m.icon}</div>
      <div class="duel-mode-name">${m.name}</div>
      <div class="duel-mode-desc">${m.desc}</div>
    </div>`).join('');
  $('duel-create-modal').style.display='flex';
  const inp=$('duel-bet-input'); if(inp) inp.value=0;
}
function closeCreateDuel() { $('duel-create-modal').style.display='none'; }

function selectDuelMode(el, id) {
  _duelCreateOpts.mode=id;
  document.querySelectorAll('#duel-mode-grid .duel-mode-card').forEach(c=>c.classList.remove('selected'));
  el.classList.add('selected');
}
function selectDuelType(btn,type) {
  document.querySelectorAll('#duel-type-grid .duel-type-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); _duelCreateOpts.type=type;
}
function selectDuelLevel(btn,lv) {
  document.querySelectorAll('#duel-level-grid .duel-type-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); _duelCreateOpts.level=lv;
}
function setBet(n) { const inp=$('duel-bet-input');if(inp)inp.value=n; _duelCreateOpts.bet=n; }

async function confirmCreateDuel() {
  const bet=parseInt($('duel-bet-input')?.value)||0;
  if (bet<0)             { toast('❌ Mise invalide'); return; }
  if (bet>(U.coins||0))  { toast('❌ Pas assez de pièces !'); return; }
  _duelCreateOpts.bet=bet;
  const {type,mode,level}=_duelCreateOpts;
  const modeConf=DUEL_MODES.find(m=>m.id===mode)||DUEL_MODES[0];
  const {ids,qs}=_buildDuelQuestions(type,level,modeConf.qCount);
  const code=_randCode();
  try {
    // Store mode inside questions metadata (avoids needing extra DB column)
    const questionsWithMeta = { mode, items: qs };
    const {error}=await _SB.from('duels').insert({
      code, creator_email:U.email, creator_name:U.name,
      lang_native:S.nL, lang_target:S.tL, game_type:type,
      level_filter:level, word_ids:ids, questions:questionsWithMeta,
      bet_amount:bet, creator_score:0, creator_correct:0,
      status:'open',
    });
    if (error) throw error;
    if (bet>0) { U.coins-=bet; U.reservedBet=(U.reservedBet||0)+bet; saveU(); updateTopBar(); }
    _currentDuel={code,qs,role:'creator',bet,type,mode};
    closeCreateDuel();
    renderDuelLobby(code,'creator',undefined,bet,type,level,mode);
    switchRankTab('duels');
  } catch(e) {
    const msg = e?.message || e?.details || JSON.stringify(e) || 'unknown';
    console.error('DUEL CREATE ERROR:', msg, e);
    toast('❌ Erreur: ' + msg.substring(0,60));
  }
}

// ── JOIN ─────────────────────────────────────────────────────
function showJoinDuel() {
  const z=$('duel-join-zone');
  if(z) z.style.display=z.style.display==='none'?'':'none';
}

async function joinDuel() {
  if (!U||U.isGuest) { toast(t('duel_join_login')); return; }
  const code=($('duel-code-input')?.value||'').trim().toUpperCase();
  if (code.length!==6) { toast(t('duel_code_len')); return; }
  try {
    const {data,error}=await _SB.from('duels').select('*').eq('code',code).single();
    if (error||!data) { toast(t('duel_not_found')); return; }
    if (data.status!=='open') { toast(t('duel_done')); return; }
    if (data.creator_email===U.email) { toast(t('duel_self')); return; }
    data.bet_amount>0?showBetAcceptModal(data,code):_acceptAndPlay(data,code,false);
  } catch(e) { toast(t('duel_conn_error')); }
}

async function acceptOpenDuel(code) {
  if (!U||U.isGuest) { toast(t('duel_join_login')); return; }
  try {
    const {data}=await _SB.from('duels').select('*').eq('code',code).single();
    if (!data||data.status!=='open') { toast('Duel indisponible'); return; }
    if (data.creator_email===U.email) { toast('C\'est ton duel !'); return; }
    data.bet_amount>0?showBetAcceptModal(data,code):_acceptAndPlay(data,code,false);
  } catch(e) { toast(t('duel_conn_error')); }
}

function showBetAcceptModal(data, code) {
  const canAfford=(U.coins||0)>=data.bet_amount;
  const html=`
    <div class="modal-box" style="max-width:360px;width:94%;text-align:center;" onclick="event.stopPropagation()">
      <div style="font-size:2.5rem;margin-bottom:8px;">⚔️</div>
      <div style="font-weight:900;font-size:1rem;margin-bottom:6px;">Duel avec mise</div>
      <div style="font-size:.85rem;color:var(--muted);margin-bottom:12px;">
        <strong>${data.creator_name}</strong> propose <strong style="color:var(--gold);">${data.bet_amount} 🪙</strong>
      </div>
      <div style="font-size:.78rem;background:var(--card2);border-radius:10px;padding:10px;margin-bottom:14px;line-height:1.8;">
        ${canAfford?`Gagner : <strong style="color:var(--green);">+${data.bet_amount*2} 🪙</strong><br>`:''}
        Perdre : <strong style="color:var(--accent2);">-${data.bet_amount} 🪙</strong><br>
        Tu as : <strong>${Math.floor(U.coins||0)} 🪙</strong>
      </div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
        ${canAfford?`<button class="btn btn-primary" onclick="_acceptAndPlay(null,'${code}',true);closeBetModal()">✅ Accepter</button>`:''}
        <button class="btn btn-secondary" onclick="_acceptAndPlay(null,'${code}',false);closeBetModal()">Sans mise</button>
        <button class="btn btn-secondary" onclick="closeBetModal()">Annuler</button>
      </div>
    </div>`;
  const overlay=$('duel-result-modal');
  overlay.innerHTML=html; overlay.style.display='flex';
}
function closeBetModal() { const el=$('duel-result-modal');if(el){el.style.display='none';el.innerHTML='';} }

async function _acceptAndPlay(data, code, acceptBet) {
  try {
    if (!data) { const {data:d}=await _SB.from('duels').select('*').eq('code',code).single(); data=d; }
    if (!data) { toast(t('duel_not_found')); return; }
    S.nL=data.lang_native; S.tL=data.lang_target;
    const betPaid=acceptBet?data.bet_amount:0;
    if (betPaid>0) { U.coins-=betPaid; U.reservedBet=(U.reservedBet||0)+betPaid; saveU(); updateTopBar(); }
    const rawQs = data.questions;
    const resolvedMode = (rawQs && rawQs.mode) ? rawQs.mode : (data.duel_mode||'classic');
    const resolvedQs  = (rawQs && rawQs.items) ? rawQs.items : (Array.isArray(rawQs) ? rawQs : []);
    _currentDuel={code,qs:resolvedQs,role:'challenger',bet:betPaid,creatorBet:data.bet_amount,data,mode:resolvedMode};
    startDuelGame();
  } catch(e) { toast(t('duel_conn_error')); }
}

// ── PLAY ─────────────────────────────────────────────────────
function startDuelGame() {
  if (!_currentDuel) return;
  const {qs,role,data,mode}=_currentDuel;
  const modeConf=DUEL_MODES.find(m=>m.id===mode)||DUEL_MODES[0];
  S.qs=qs; S.isDuel=true; S._duelMode=modeConf;
  S.qi=0; S.score=0; S.cor=0; S.wr=0;
  S.ts={quiz:{c:0,w:0},fill:{c:0,w:0},sort:{c:0,w:0},match:{c:0,w:0}};
  S.gType=_currentDuel.data?.game_type||'mixed';
  goTo('game'); setTypePill(S.gType==='mixed'?'quiz':S.gType);
  sT('g-score',0); $('g-progress').style.width='0%'; renderQ();
  const opponent=role==='creator'?'En attente…':(data?.creator_name||'Adversaire');
  const betInfo=_currentDuel.bet>0?` · <span style="color:var(--gold);">Mise ${_currentDuel.bet} 🪙</span>`:'';
  const banner=document.createElement('div');
  banner.className='duel-banner';
  banner.style.setProperty('--mode-color',modeConf.color);
  banner.innerHTML=`${modeConf.icon} ${modeConf.name} · vs ${opponent}${betInfo} · <span style="font-family:monospace;letter-spacing:2px;">${_currentDuel.code}</span>`;
  document.getElementById('game-inner')?.prepend(banner);
}

// ── SUBMIT ───────────────────────────────────────────────────
async function submitDuelScore(score, correct) {
  if (!_currentDuel||!S.isDuel) return;
  const {code,role,bet,creatorBet}=_currentDuel;
  try {
    if (role==='creator') {
      await _SB.from('duels').update({creator_score:score,creator_correct:correct,status:'waiting'}).eq('code',code);
      toast(t('duel_score_sent').replace('{c}',code));
      renderDuelLobby(code,'creator',score,bet);
    } else {
      const {data}=await _SB.from('duels').select('creator_score,creator_name,creator_correct,bet_amount').eq('code',code).single();
      await _SB.from('duels').update({challenger_email:U.email,challenger_name:U.name,challenger_score:score,challenger_correct:correct,status:'done'}).eq('code',code);
      _resolveBets(score,data?.creator_score||0,bet,creatorBet||data?.bet_amount||0);
      showDuelResult(score,correct,data);
    }
  } catch(e) { console.error('duel submit error',e); }
}

function _resolveBets(myScore,theirScore,myBet,theirBet) {
  const iWon=myScore>theirScore;
  U.reservedBet=Math.max(0,(U.reservedBet||0)-myBet);
  if (iWon) { const w=myBet+(myBet>0?Math.min(myBet,theirBet):0); U.coins=(U.coins||0)+w; if(w>0)toast(`🏆 +${w} 🪙 de mise !`); }
  U.duelsWon=(U.duelsWon||0)+(iWon?1:0);
  saveU(); updateTopBar(); checkTrophies();
}

function showDuelResult(myScore, myCorrect, opponentData) {
  const won=myScore>(opponentData?.creator_score||0);
  const modeConf=DUEL_MODES.find(m=>m.id===(_currentDuel?.mode||'classic'))||DUEL_MODES[0];
  const el=$('duel-result-modal'); if(!el) return;
  const betLine=_currentDuel?.bet>0
    ?`<div style="margin:10px 0;font-size:.85rem;font-weight:800;color:${won?'var(--green)':'var(--accent2);'}">
        ${won?`🏆 +${_currentDuel.bet*2} 🪙 remportés`:`💸 -${_currentDuel.bet} 🪙`}
      </div>`:'' ;
  el.innerHTML=`
    <div class="duel-result-card ${won?'duel-win':'duel-lose'}" onclick="event.stopPropagation()">
      <div class="duel-result-emoji">${won?'🏆':'😤'}</div>
      <div class="duel-result-title">${won?'Victoire !':'Défaite…'}</div>
      <div class="duel-result-mode">${modeConf.icon} ${modeConf.name}</div>
      <div class="duel-scores-wrap">
        <div class="duel-score-block ${won?'winner':''}">
          <div class="duel-score-label">👤 Toi</div>
          <div class="duel-score-pts">${myScore}</div>
          <div class="duel-score-sub">${myCorrect} bonnes</div>
        </div>
        <div class="duel-vs">VS</div>
        <div class="duel-score-block ${!won?'winner':''}">
          <div class="duel-score-label">${opponentData?.creator_name||'Adversaire'}</div>
          <div class="duel-score-pts">${opponentData?.creator_score||0}</div>
          <div class="duel-score-sub">${opponentData?.creator_correct||0} bonnes</div>
        </div>
      </div>
      ${betLine}
      ${won?'<div style="color:var(--green);font-size:.78rem;font-weight:800;">+200 🪙 bonus victoire</div>':''}
      <button class="btn btn-primary" onclick="closeDuelResult()" style="margin-top:16px;width:100%;">Fermer</button>
    </div>`;
  el.style.display='flex';
  if (won) { U.coins=(U.coins||0)+200; saveU(); updateTopBar(); if(typeof confetti==='function') confetti(); }
}

function closeDuelResult() {
  const el=$('duel-result-modal');
  if(el){el.style.display='none';el.innerHTML='';}
  _currentDuel=null; S.isDuel=false; S.isPractice=false;
}

// ── LOBBY ────────────────────────────────────────────────────
function renderDuelLobby(code, role, score, bet, type, level, mode) {
  const el=$('duel-lobby-content'); if(!el) return;
  const modeConf=DUEL_MODES.find(m=>m.id===mode)||DUEL_MODES[0];
  const typeLabel={mixed:'🎲 Mixte',quiz:'⚡ Quiz',fill:'✏️ Fill',match:'🔗 Match'}[type]||'🎲';
  el.innerHTML=`
    <div class="duel-lobby-card">
      <div class="duel-lobby-mode-row" style="background:${modeConf.color}18;border:1px solid ${modeConf.color}40;border-radius:14px;padding:12px;display:flex;align-items:center;gap:12px;margin-bottom:14px;">
        <span style="font-size:1.8rem;">${modeConf.icon}</span>
        <div><div style="font-weight:900;">${modeConf.name}</div><div style="font-size:.75rem;color:var(--muted);">${modeConf.desc}</div></div>
      </div>
      <div class="duel-code-display">${code}</div>
      <div style="font-size:.76rem;color:var(--muted);margin-bottom:10px;">Partage ce code à ton adversaire</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:12px;">
        <span class="duel-badge">${typeLabel}</span>
        ${level&&level!=='any'?`<span class="duel-badge">Niv. ${level}</span>`:'<span class="duel-badge">Aléatoire</span>'}
        ${bet>0?`<span class="duel-badge" style="color:var(--gold);background:rgba(251,191,36,.12);border-color:rgba(251,191,36,.3);">Mise ${bet} 🪙</span>`:''}
      </div>
      ${score!==undefined?`<div style="color:var(--green);font-weight:800;font-size:.9rem;margin-bottom:10px;">✅ Score: ${score} pts · En attente…</div>`:''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
        <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${code}').then(()=>toast('Code copié !'))">📋 Copier</button>
        ${score===undefined?`<button class="btn btn-primary btn-sm" onclick="startDuelGame()">▶ Jouer →</button>`:''}
        <button class="btn btn-secondary btn-sm" onclick="checkDuelResult('${code}')">🔄 Vérifier</button>
      </div>
    </div>`;
}

// ── OPEN DUELS ───────────────────────────────────────────────
async function loadOpenDuels() {
  const el=$('open-duels-list'); if(!el) return;
  try {
    const {data}=await _SB.from('duels').select('*').eq('status','open').order('created_at',{ascending:false}).limit(20);
    if (!data||!data.length) {
      el.innerHTML='<div style="color:var(--muted);font-size:.8rem;text-align:center;padding:20px;">Aucun duel ouvert<br><span style="font-size:.7rem;opacity:.6;">Sois le premier à créer un duel !</span></div>';
      return;
    }
    const mine=data.filter(d=>d.creator_email===U?.email);
    const others=data.filter(d=>d.creator_email!==U?.email);
    let html='';
    if (others.length) {
      html+=`<div class="duel-list-header">⚔️ Défis ouverts (${others.length})</div>`;
      html+=others.map(d=>_duelCard(d,false)).join('');
    }
    if (mine.length) {
      html+=`<div class="duel-list-header" style="margin-top:12px;">📤 Mes duels en attente</div>`;
      html+=mine.map(d=>_duelCard(d,true)).join('');
    }
    el.innerHTML=html;
  } catch(e) { console.error('loadOpenDuels',e); }
}

function _duelCard(d, isMine) {
  const duelMode = d.duel_mode || (d.questions && d.questions.mode) || 'classic';
  const modeConf=DUEL_MODES.find(m=>m.id===duelMode)||DUEL_MODES[0];
  const langLabel=d.lang_native&&d.lang_target?`${LANGS[d.lang_native]?.flag||d.lang_native} → ${LANGS[d.lang_target]?.flag||d.lang_target}`:'';
  const age=_timeAgo(d.created_at);
  return `
    <div class="duel-card-item" style="--mode-color:${modeConf.color}">
      <div class="duel-card-mode-dot">${modeConf.icon}</div>
      <div class="duel-card-info">
        <div class="duel-card-name">${d.creator_name||'Anonyme'}</div>
        <div class="duel-card-meta">${modeConf.name} · ${langLabel} · ${age}</div>
        ${d.bet_amount>0?`<span class="duel-badge" style="color:var(--gold);background:rgba(251,191,36,.1);font-size:.68rem;">Mise ${d.bet_amount} 🪙</span>`:''}
      </div>
      <div class="duel-card-code">${d.code}</div>
      <div style="display:flex;flex-direction:column;gap:5px;">
        ${isMine
          ?`<button class="btn btn-sm btn-primary" onclick="startDuelGame()">▶</button>
            <button class="btn btn-sm btn-secondary" onclick="checkDuelResult('${d.code}')">⏳</button>`
          :`<button class="btn btn-sm btn-primary" onclick="acceptOpenDuel('${d.code}')">Joindre</button>`}
      </div>
    </div>`;
}

async function checkDuelResult(code) {
  try {
    const {data}=await _SB.from('duels').select('*').eq('code',code).single();
    if (!data) { toast('Duel introuvable'); return; }
    if (data.status==='done') {
      const myScore=data.creator_score,theirScore=data.challenger_score||0;
      _resolveBets(myScore,theirScore,data.bet_amount||0,data.bet_amount||0);
      showDuelResult(myScore,data.creator_correct,{creator_score:theirScore,creator_correct:data.challenger_correct,creator_name:data.challenger_name||'Adversaire'});
    } else if (data.status==='waiting') { toast('L\'adversaire n\'a pas encore joué…'); }
    else { toast('Duel encore ouvert'); }
  } catch(e) { toast(t('duel_conn_error')); }
}

function _timeAgo(ts) {
  if (!ts) return '';
  const diff=Math.floor((Date.now()-new Date(ts).getTime())/1000);
  if (diff<60) return `${diff}s`;
  if (diff<3600) return `${Math.floor(diff/60)}min`;
  if (diff<86400) return `${Math.floor(diff/3600)}h`;
  return `${Math.floor(diff/86400)}j`;
}

function stopDuelRefresh() { clearInterval(_openDuelsInterval); }
