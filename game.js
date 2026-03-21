
// ══════════════════════════════════════════════════════════════
// TTS ENGINE — multi-language, robust voice loading
// ══════════════════════════════════════════════════════════════

const _LANG_BCP = {fr:'fr-FR', en:'en-US', es:'es-ES', de:'de-DE', cs:'cs-CZ'};

// Extended voice name fragments — covers macOS, iOS, Windows, Android, Chrome
const _LANG_VOICES = {
  fr: ['Thomas','Amelie','Marie','Julie','Nicolas','Audrey','Virginie',
       'Google français','Google French','fr-FR','Français'],
  en: ['Daniel','Karen','Samantha','Alex','Moira','Veena','Fiona',
       'Google US English','Google UK English Female','Google UK English Male',
       'Microsoft Zira','Microsoft David','Microsoft Mark',
       'en-US','en-GB','English'],
  es: ['Monica','Paulina','Diego','Jorge','Juan','Soledad','Rosa',
       'Google español','Google español de Estados Unidos',
       'Microsoft Helena','Microsoft Sabina','Microsoft Raul',
       'es-ES','es-MX','Spanish'],
  de: ['Anna','Markus','Petra','Yannick','Hedda',
       'Google Deutsch','Microsoft Hedda','Microsoft Stefan',
       'de-DE','Deutsch','German'],
  cs: ['Zuzana','Google Czech','cs-CZ','Czech'],
};

let _voiceCache = [];
let _voiceLoadAttempts = 0;

function _getVoices() {
  if (_voiceCache.length) return _voiceCache;
  if (window.speechSynthesis) {
    const v = window.speechSynthesis.getVoices();
    if (v.length) { _voiceCache = v; }
  }
  return _voiceCache;
}

// Robust init: Chrome needs onvoiceschanged; Safari/Firefox load sync
if (window.speechSynthesis) {
  const _initVoices = () => {
    const v = window.speechSynthesis.getVoices();
    if (v.length) _voiceCache = v;
  };
  _initVoices();
  window.speechSynthesis.onvoiceschanged = _initVoices;
  // Retry a few times in case Chrome is slow
  [100, 300, 600, 1200].forEach(ms =>
    setTimeout(() => { if (!_voiceCache.length) _initVoices(); }, ms)
  );
}

function _pickVoice(lang) {
  const bcp    = _LANG_BCP[lang] || 'en-US';
  const prefix = bcp.split('-')[0];   // e.g. 'en', 'fr'
  const prefs  = _LANG_VOICES[lang] || [];
  const voices = _getVoices();
  if (!voices.length) return null;

  // 1. Preferred name fragments (most specific)
  for (const pref of prefs) {
    const v = voices.find(v => v.name.toLowerCase().includes(pref.toLowerCase()));
    if (v) return v;
  }
  // 2. Exact BCP-47 match (e.g. 'fr-FR')
  const exact = voices.find(v => v.lang === bcp);
  if (exact) return exact;
  // 3. Language prefix match (e.g. 'fr-CA' when 'fr-FR' absent)
  const byPrefix = voices.find(v => v.lang.toLowerCase().startsWith(prefix));
  if (byPrefix) return byPrefix;
  // 4. Nothing found — let browser decide via utt.lang
  return null;
}

// ── TTS SPEAK ─────────────────────────────────────────────────
// For fr/en: use best native OS voice (always installed)
// For cs/de/es: set lang ONLY — Chrome uses its cloud TTS (correct accent)
// Never assign a voice for cs/de/es — wrong voice is worse than no voice

function _speak(text, lang, rate, onEnd) {
  if (!text || !window.speechSynthesis) { if (onEnd) onEnd(); return; }
  window.speechSynthesis.cancel();

  const utt    = new SpeechSynthesisUtterance(text);
  const bcp    = _LANG_BCP[lang] || 'fr-FR';
  utt.lang     = bcp;
  utt.rate     = rate || 0.82;
  utt.volume   = 1.0;

  // Only assign a voice for fr/en — for cs/de/es just set lang and
  // let Chrome/Safari pick the correct cloud voice automatically
  if (lang === 'fr' || lang === 'en') {
    const v = _pickVoice(lang);
    if (v) utt.voice = v;
  }
  // For cs/de/es: utt.lang = 'cs-CZ'/'de-DE'/'es-ES' with no utt.voice
  // → browser uses its built-in cloud TTS for that language

  if (onEnd) { utt.onend = onEnd; utt.onerror = onEnd; }
  window.speechSynthesis.speak(utt);
}

function _speakThenUnlock(text, lang) {
  const btn = $('btn-next');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.45'; }
  if (!window.speechSynthesis || !text) {
    setTimeout(() => { if(btn){btn.disabled=false;btn.style.opacity='';} }, 400);
    return;
  }
  let unlocked = false;
  const unlock = () => {
    if (unlocked) return; unlocked = true;
    if (btn) { btn.disabled=false; btn.style.opacity=''; btn.classList.add('voice-ready'); setTimeout(()=>btn.classList.remove('voice-ready'),600); }
  };
  setTimeout(unlock, 3500);
  _speak(text, lang, 0.78, unlock);
}

function _speakClick(text, lang) {
  _speak(text, lang, 0.85, null);
}

// ══════════════════════════════════════════════
// GAME ENGINE
// ══════════════════════════════════════════════
function wt(id,lang){return WD[id]?.[lang]||id;}
function getCh(){
  // DIY lesson path
  if(S._diyLesson){
    const d=S._diyLesson;
    const wids=d.pairs.map((p,i)=>{
      const id='_diy_'+i;
      // Inject into WD so wt() can find it
      if(!WD[id]) WD[id]={};
      WD[id][S.nL]=p.native;
      WD[id][S.tL]=p.target;
      if(p.imgUrl) WD[id]._img=p.imgUrl;
      return id;
    });
    return {id:'_diy',title:{},wids,sents:{fr:[],en:[],es:[],de:[],cs:[]}};
  }
  return (CHAPTERS[S.level]||[]).find(c=>c.id===S.chap);
}

function startGame(type){
  S.gType=type;S.score=0;S.cor=0;S.wr=0;S.qi=0;
  S.ts={quiz:{c:0,w:0},fill:{c:0,w:0},match:{c:0,w:0},sort:{c:0,w:0}};
  const ch=getCh();if(!ch)return;
  if(type==='match'){startMatchSA(ch);return;}
  S.qs=type==='mixed'?buildMixed(ch):type==='quiz'?buildQuizOnly(ch):buildFillOnly(ch);
  S.qi=0;goTo('game');renderQ();
  if(U){U.sessions=(U.sessions||0)+1;saveU();}
}
function buildMixed(ch){const ids=shuf([...ch.wids]),sents=ch.sents[S.tL]||[],nSents=ch.sents[S.nL]||ch.sents.fr||[],qs=[],pat=['quiz','fill','sort','quiz','fill','match4','quiz','fill','sort','quiz'];ids.slice(0,8).forEach((id,i)=>{const tp=pat[i%pat.length];if(tp==='quiz')qs.push(mkQQ(id,ch.wids));else if(tp==='fill')qs.push(mkFQ(id));else if(tp==='match4')qs.push(mkMQ(ch.wids.slice(0,4)));else if(tp==='sort'&&sents.length)qs.push(mkSQ(sents[i%sents.length],nSents[i%nSents.length]||sents[i%sents.length]));else qs.push(mkQQ(id,ch.wids));});if(sents.length)qs.push(mkSQ(sents[0],nSents[0]||sents[0]));return qs;}
function buildQuizOnly(ch){return shuf([...ch.wids]).slice(0,8).map(id=>mkQQ(id,ch.wids));}
function buildFillOnly(ch){return shuf([...ch.wids]).slice(0,6).map(id=>mkFQ(id));}
function mkQQ(id,all){const q=wt(id,S.nL),cor=wt(id,S.tL),wr=shuf(all.filter(x=>x!==id)).slice(0,3).map(x=>wt(x,S.tL));const imgUrl=WD[id]?._img||undefined;return{type:'quiz',q,correct:cor,choices:shuf([cor,...wr]),imgUrl};}
function mkFQ(id){const imgUrl=WD[id]?._img||undefined;return{type:'fill',q:wt(id,S.nL),correct:wt(id,S.tL),imgUrl};}
function mkSQ(sent,nSent){return{type:'sort',q:nSent,correct:sent,words:sent.split(' ')};}
function mkMQ(ids){return{type:'match',ids};}

function startMatchSA(ch){S.mPairs=shuf([...ch.wids]).slice(0,6);S.mSel=null;S.mDone=0;S.mTotal=S.mPairs.length;S.mEmbed=false;goTo('game');setTypePill('match');showZone('match');sT('g-text',t('game_match_title'));sT('g-dir',dirLbl());sT('g-num','');sT('g-hint',t('game_match_hint'));sT('mcl-l',LANGS[S.nL].native);sT('mcl-r',LANGS[S.tL].native);renderMatchCols(S.mPairs);sT('match-prog-txt',`0/${S.mTotal}`);$('g-progress').style.width='0%';sT('g-score',0);hideFB();hideAllBtns();showBtn('btn-skip');startTimer(60);}

function renderQ(){if(S.qi>=S.qs.length){showResults();return;}const q=S.qs[S.qi];S.curQ=q;S.curType=q.type;const tot=S.qs.length;$('g-progress').style.width=`${(S.qi/tot)*100}%`;sT('g-dir',dirLbl());sT('g-num',`${S.qi+1} / ${tot}`);sT('g-hint','');hideFB();hideAllBtns();setTypePill(q.type);showZone(q.type);$('fuzzy-note').style.display='none';
// Show image if available (DIY lessons with imgUrl)
const imgWrap=$('g-img-wrap'),imgEl=$('g-img');
if(imgWrap&&imgEl){if(q.imgUrl){imgEl.src=q.imgUrl;imgWrap.style.display='block';imgEl.onerror=()=>{imgWrap.style.display='none';};}else{imgWrap.style.display='none';imgEl.src='';}}
if(q.type==='quiz')renderQuiz(q);else if(q.type==='fill')renderFill(q);else if(q.type==='match')renderEmbMatch(q);else if(q.type==='sort')renderSort(q);}
function renderQuiz(q){sT('g-text',q.q);setTimeout(()=>_speakClick(q.q,S.nL),200);const grid=$('answers-grid');grid.innerHTML='';['A','B','C','D'].forEach((l,i)=>{if(!q.choices[i])return;const btn=document.createElement('button');btn.className='answer-btn';btn.innerHTML=`<span class="al">${l}</span><span>${q.choices[i]}</span>`;btn.onclick=()=>{pickQ(q.choices[i],btn,q);};grid.appendChild(btn);});startTimer(15);}
function renderFill(q){sT('g-text',q.q);setTimeout(()=>_speakClick(q.q,S.nL),200);const inp=$('fill-input');inp.value='';inp.className='fill-input';inp.disabled=false;setTimeout(()=>inp.focus(),70);showBtn('btn-check');startTimer(20);}
function renderEmbMatch(q){S.mPairs=q.ids;S.mSel=null;S.mDone=0;S.mTotal=q.ids.length;S.mEmbed=true;sT('g-text',t('game_match_title'));sT('mcl-l',LANGS[S.nL].native);sT('mcl-r',LANGS[S.tL].native);renderMatchCols(q.ids);sT('match-prog-txt',`0/${S.mTotal}`);showBtn('btn-skip');startTimer(40);}
function renderSort(q){sT('g-text',q.q);setTimeout(()=>_speakClick(q.q,S.nL),200);S.sortArr=[];const bank=$('word-bank');bank.innerHTML='';shuf([...q.words]).forEach(w=>{const t=document.createElement('div');t.className='word-token';t.textContent=w;t.onclick=()=>{_speakClick(w,S.tL);addSort(w,t);};bank.appendChild(t);});$('sentence-slots').innerHTML='<span class="slot-placeholder">'+t('slot_placeholder')+'</span>';showBtn('btn-check');showBtn('btn-reset');startTimer(30);}

function renderMatchCols(ids){const ls=shuf(ids.map(id=>({id,text:wt(id,S.nL)}))),rs=shuf(ids.map(id=>({id,text:wt(id,S.tL)})));const lc=$('match-left'),rc=$('match-right');lc.innerHTML='';rc.innerHTML='';ls.forEach(it=>{lc.appendChild(mkMI(it,'left'));});rs.forEach(it=>{rc.appendChild(mkMI(it,'right'));});}
function mkMI(it,side){const d=document.createElement('div');d.className='match-item';d.textContent=it.text;d.dataset.id=it.id;d.dataset.side=side;d.onclick=()=>{_speakClick(it.text,side==='left'?S.nL:S.tL);clickMatch(d);};return d;}
function clickMatch(el){if(el.classList.contains('matched'))return;const sel=S.mSel;if(!sel){S.mSel=el;el.classList.add('selected');return;}if(sel===el){el.classList.remove('selected');S.mSel=null;return;}if(sel.dataset.side===el.dataset.side){sel.classList.remove('selected');S.mSel=el;el.classList.add('selected');return;}if(sel.dataset.id===el.dataset.id){sel.classList.remove('selected');sel.classList.add('matched');el.classList.add('matched');S.mDone++;S.cor++;S.ts.match.c++;S.score+=10;sT('g-score',S.score);sT('match-prog-txt',`${S.mDone}/${S.mTotal}`);$('g-progress').style.width=`${(S.mDone/S.mTotal)*100}%`;
  // Speak native then target with a gap
  const _nText=wt(sel.dataset.id||el.dataset.id,S.nL);const _tText=wt(sel.dataset.id||el.dataset.id,S.tL);
  _speakClick(_nText,S.nL);setTimeout(()=>_speakClick(_tText,S.tL),700);
  if(S.mDone>=S.mTotal){clearInterval(S.timer);setTimeout(()=>S.mEmbed?nextQ():showResults(),1400);}}else{sel.classList.remove('selected');el.classList.add('wrong-match');setTimeout(()=>el.classList.remove('wrong-match'),360);S.wr++;S.ts.match.w++;}S.mSel=null;}
function skipMatch(){S.mEmbed?nextQ():showResults();}

function pickQ(choice,btn,q){clearInterval(S.timer);const ok=choice===q.correct;document.querySelectorAll('#answers-grid .answer-btn').forEach(b=>{b.disabled=true;if(b.querySelector('span:last-child').textContent===q.correct)b.classList.add('correct');});if(!ok)btn.classList.add('wrong');ok?(S.score+=10,S.cor++,S.ts.quiz.c++,showFB(true,t('game_perfect'),q.correct)):(S.wr++,S.ts.quiz.w++,showFB(false,t('game_wrong'),t('game_answer')+q.correct));sT('g-score',S.score);showBtn('btn-next');
  // Speak: native word first (short), then TARGET word with gating
  const _nw=wt(Object.keys(WD).find(id=>WD[id][S.tL]===q.correct)||'',S.nL)||'';
  if(_nw) { setTimeout(()=>_speakClick(_nw,S.nL),150); setTimeout(()=>_speakThenUnlock(q.correct,S.tL),800); }
  else { setTimeout(()=>_speakThenUnlock(q.correct,S.tL),200); }}
function checkCurrentQ(){const q=S.curQ;if(q.type==='fill')doFill(q);else if(q.type==='sort')doSort(q);}

// Fuzzy
function deacc(s){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
function lev(a,b){const m=a.length,n=b.length;if(!m)return n;if(!n)return m;const d=[];for(let i=0;i<=m;i++){d[i]=[i];for(let j=1;j<=n;j++)d[i][j]=i?0:j;}for(let j=1;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=a[i-1]===b[j-1]?d[i-1][j-1]:1+Math.min(d[i-1][j],d[i][j-1],d[i-1][j-1]);return d[m][n];}
function fuzzy(inp,cor){const clean=s=>deacc(s.replace(/[^\w\s]/gi,''));const a=clean(inp),b=clean(cor);if(a===b||deacc(inp)===deacc(cor))return'exact';const dist=lev(a,b);return dist<=(b.length<=3?1:b.length<=7?2:3)?'close':'wrong';}

function doFill(q){clearInterval(S.timer);const inp=$('fill-input'),res=fuzzy(inp.value,q.correct);inp.disabled=true;if(res==='exact'){inp.className='fill-input correct';S.score+=10;S.cor++;S.ts.fill.c++;showFB(true,t('game_perfect'),q.correct);}else if(res==='close'){inp.className='fill-input close';S.score+=5;S.cor++;S.ts.fill.c++;const fn=$('fuzzy-note');fn.textContent=t('game_close')+' '+t('game_exact_answer')+q.correct;fn.style.display='block';showFB('close',t('game_close'),t('game_exact_answer')+q.correct);}else{inp.className='fill-input wrong';S.wr++;S.ts.fill.w++;showFB(false,t('game_wrong'),t('game_answer')+q.correct);}sT('g-score',S.score);hideBtn('btn-check');showBtn('btn-next');
  const _nwf=wt(Object.keys(WD).find(id=>WD[id][S.tL]===q.correct)||'',S.nL)||'';
  if(_nwf) { setTimeout(()=>_speakClick(_nwf,S.nL),150); setTimeout(()=>_speakThenUnlock(q.correct,S.tL),800); }
  else { setTimeout(()=>_speakThenUnlock(q.correct,S.tL),200); } }
function doSort(q){clearInterval(S.timer);const built=S.sortArr.join(' '),res=fuzzy(built,q.correct);if(res==='exact'){S.score+=10;S.cor++;S.ts.sort.c++;showFB(true,t('game_perfect'),q.correct);}else if(res==='close'){S.score+=5;S.cor++;S.ts.sort.c++;showFB('close',t('game_close'),q.correct);}else{S.wr++;S.ts.sort.w++;showFB(false,t('game_wrong'),t('game_answer')+q.correct);}sT('g-score',S.score);hideBtn('btn-check');hideBtn('btn-reset');showBtn('btn-next');setTimeout(()=>_speakThenUnlock(q.correct,S.tL),300);}

function addSort(word,el){if(el.style.opacity==='0.3')return;S.sortArr.push(word);el.style.opacity='0.3';el.style.pointerEvents='none';renderSlots();}
function renderSlots(){const slots=$('sentence-slots');if(!S.sortArr.length){slots.innerHTML='<span class="slot-placeholder">'+t('slot_placeholder')+'</span>';return;}slots.innerHTML='';S.sortArr.forEach((w,i)=>{const t=document.createElement('div');t.className='word-token in-sentence';t.textContent=w;t.onclick=()=>{S.sortArr.splice(i,1);reEnable(w);renderSlots();};slots.appendChild(t);});}
function reEnable(w){for(const t of $('word-bank').children)if(t.textContent===w&&t.style.opacity==='0.3'){t.style.opacity='1';t.style.pointerEvents='auto';break;}}
function resetSort(){S.sortArr=[];renderSlots();document.querySelectorAll('#word-bank .word-token').forEach(t=>{t.style.opacity='1';t.style.pointerEvents='auto';});}
function nextQ(){S.qi++;S.qi>=S.qs.length?showResults():renderQ();}

function startTimer(secs){clearInterval(S.timer);S.tLeft=secs;const el=$('g-timer');tickT(el,secs);S.timer=setInterval(()=>{S.tLeft--;tickT(el,S.tLeft);if(S.tLeft<=0){clearInterval(S.timer);onTimeout();}},1000);}
function tickT(el,t){if(!el)return;el.textContent=`⏱ ${t}`;el.className='timer-badge'+(t<=5?' urgent':'');}
function onTimeout(){const q=S.curQ;if(S.curType==='quiz'){S.wr++;S.ts.quiz.w++;showFB(false,'⏱ Temps écoulé !','');document.querySelectorAll('#answers-grid .answer-btn').forEach(b=>b.disabled=true);showBtn('btn-next');}else if(S.curType==='fill')doFill(q);else if(S.curType==='sort')doSort(q);else if(S.curType==='match'){S.mEmbed?nextQ():showResults();}}

function showFB(ok,title,detail){const b=$('g-fb'),cls=ok===true?'correct-fb':ok==='close'?'close-fb':'wrong-fb';b.className=`feedback-banner show ${cls}`;sT('g-fb-icon',ok===true?'✅':ok==='close'?'✨':'❌');sT('g-fb-title',title);sT('g-fb-detail',detail);}
function hideFB(){const b=$('g-fb');if(b)b.className='feedback-banner';}
function showZone(type){['quiz','fill','match','sort'].forEach(z=>{const el=document.getElementById('zone-'+z);if(el)el.style.display=z===type?'block':'none';});}
function setTypePill(type){const labels={quiz:'⚡ Quiz',fill:t('game_type_fill'),match:t('game_type_match'),sort:t('game_type_sort')};const p=$('g-type-pill');p.className=`type-pill ${type}`;p.textContent=labels[type]||type;}
function hideAllBtns(){['btn-check','btn-reset','btn-next','btn-skip'].forEach(id=>hideBtn(id));}
function showBtn(id){const e=$(id);if(e)e.style.display='inline-flex';}
function hideBtn(id){const e=$(id);if(e)e.style.display='none';}

// ══════════════════════════════════════════════
// RESULTS + COIN REWARD
// ══════════════════════════════════════════════
function showResults(){
  clearInterval(S.timer);
  const tot=S.cor+S.wr||1,pct=Math.round(S.cor/tot*100);
  const stars=pct>=90?3:pct>=60?2:pct>=30?1:0;
  const xpE=S.cor*15;
  const coinMultipliers={mixed:3,quiz:1.5,fill:2,match:1,duel:2};
  const baseCoin=Math.floor(S.cor*(coinMultipliers[S.gType]||1));
  let coinsEarned=Math.min(baseCoin,{mixed:30,quiz:15,fill:20,match:10,duel:25}[S.gType]||20);
  let xpBonus=1;
  if(S.isEventQuiz&&typeof getCurrentEvent==='function') xpBonus=getCurrentEvent().bonusXP||1;
  const xpTotal=xpE*xpBonus;

  if(U){
    const key=pk(S.chap),prev=U.progress[key]||{};
    U.progress[key]={completed:stars>0,stars:Math.max(prev.stars||0,stars)};
    U.xp=(U.xp||0)+xpTotal; U.coins+=coinsEarned;
    if(stars>0&&!prev.completed) U.chaptersCompleted=(U.chaptersCompleted||0)+1;
    if(S.wr===0&&S.cor>=5) U._lastPerfect=S.cor;
    const h=new Date().getHours();
    if(h===0||h===1) U._nightOwl=true;
    if(h<7) U._earlyBird=true;
    if(S.isEventQuiz&&pct>=60) U._eventsWon=(U._eventsWon||0)+1;
    const today=new Date().toDateString();
    if(U.lastDay!==today){U.streak=(U.lastDay===new Date(Date.now()-86400000).toDateString()?U.streak:0)+1;U.lastDay=today;}
    if(typeof srsUpdate==='function'&&S.qs){
      S.qs.forEach((q,i)=>{
        const wid=Object.keys(WD).find(id=>WD[id][S.tL]===q.correct);
        if(wid) srsUpdate(wid, i<S.cor);
      });
    }
    saveU(); updateTopBar();
    $('xp-bar').style.width=((U.xp%500)/7)+'%'; sT('xp-count',U.xp+' XP');
    setTimeout(()=>{ if(typeof checkTrophies==='function') checkTrophies(); },600);
    if(S.isDuel&&typeof submitDuelScore==='function') submitDuelScore(S.score,S.cor);
    S.isEventQuiz=false; S.isSRSReview=false; S.isDuel=false; S.isPractice=false;
  }
  const msgs=[t('game_result_0'),t('game_result_1'),t('game_result_2'),t('game_result_3')];
  sT('r-stars',['☆☆☆','★☆☆','★★☆','★★★'][stars]);
  sT('r-title',msgs[stars]);
  sT('r-score',pct+'%');
  sT('r-sub', t('game_r_sub',{c:S.cor, s:S.cor>1?'s':'', t:tot}));
  sT('r-correct',S.cor); sT('r-wrong',S.wr);
  sT('r-xp',xpBonus>1?`+${xpTotal} ✨×${xpBonus}`:`+${xpTotal}`);
  sT('coin-reward-amount','+'+coinsEarned);
  const bd=$('r-breakdown'); bd.innerHTML='';
  const tdef={quiz:{i:'⚡',l:'Quiz'},fill:{i:'✏️',l:'Fill'},match:{i:'🔗',l:'Match'},sort:{i:'🧩',l:'Ordre'}};
  Object.entries(S.ts).forEach(([k,v])=>{if(v.c+v.w===0)return;const p2=Math.round(v.c/(v.c+v.w)*100);const d=document.createElement('div');d.style.cssText='background:var(--card2);border-radius:9px;padding:7px 12px;text-align:center;min-width:56px;';d.innerHTML=`<div style="font-size:.95rem">${tdef[k].i}</div><div style="font-weight:800;font-size:.76rem;">${tdef[k].l}</div><div style="font-size:.74rem;color:${p2>=70?'var(--green)':'var(--red)'};">${p2}%</div>`;bd.appendChild(d);});
  goTo('results');
  if(stars>=2) confetti();
  if(coinsEarned>0) floatCoin($('coin-reward-amount'),`+${coinsEarned} <span class="coin"></span>`);
  // result speech removed
}
function playAgain(){startGame(S.gType);}

