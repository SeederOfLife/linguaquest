// ── Lesson i18n helpers ──────────────────────────────────────────────────────
function getLessonT(lesson){
  if(!lesson) return {};
  const lang = (typeof _uiLang !== 'undefined' && _uiLang) || 'fr';
  return (lesson.t && (lesson.t[lang] || lesson.t['fr'])) || lesson.t && Object.values(lesson.t)[0] || {};
}
function s_(key, vars){
  const lang = (typeof _uiLang !== 'undefined' && _uiLang) || 'fr';
  const strings = (typeof UI_STRINGS !== 'undefined' && UI_STRINGS) || {};
  const s = strings[lang] || strings['fr'] || {};
  let str = s[key] || key;
  if(vars) Object.entries(vars).forEach(([k,v])=>{ str=str.split('{'+k+'}').join(v); });
  return str;
}

// ══════════════════════════════════════════════
// DIVIDEND ENGINE
// ══════════════════════════════════════════════
function calcDividends(){
  if(!U) return;
  const now=Date.now();
  const elapsedDays=(now-U.lastDivTime)/(1000*60*60*24);
  let total=0;
  ASSET_DEFS.forEach(a=>{
    const owned=U.assets[a.id]||0;
    if(owned>0){
      const invested=a.cost*owned;
      total+=invested*a.divRate*elapsedDays;
      U.assetValues[a.id]=(U.assetValues[a.id]||0)+invested*a.growthRate*elapsedDays;
    }
  });
  U.pendingDiv=(U.pendingDiv||0)+total;
  U.lastDivTime=now;
  saveU();
}

function collectDividends(){
  if(!U||U.pendingDiv<0.5) return;
  const amount=Math.floor(U.pendingDiv);
  U.coins+=amount; U.pendingDiv-=amount;
  saveU(); updateTopBar();
  floatCoin($('collect-btn'),`+${amount} <span class="coin"></span>`);
  renderPortfolio();
  toast(`🌱 +${amount} dividendes collectés !`);
}

function getAssetWealth(){
  if(!U) return 0;
  return ASSET_DEFS.reduce((s,a)=>{
    const owned=U.assets[a.id]||0;
    if(!owned) return s;
    return s+a.cost*owned+(U.assetValues[a.id]||0);
  },0);
}
function getTotalWealth(){return Math.floor(U.coins+getAssetWealth());}
function getDailyDividend(){
  if(!U) return 0;
  return ASSET_DEFS.reduce((s,a)=>s+(a.cost*(U.assets[a.id]||0)*a.divRate),0);
}

// ══════════════════════════════════════════════
// INVESTOR LEVEL SYSTEM
// ══════════════════════════════════════════════
function getInvestorLevel(){
  const invested=U.totalInvested||0;
  let cur=INVESTOR_LEVELS[0];
  for(const lv of INVESTOR_LEVELS){ if(invested>=lv.min) cur=lv; }
  return cur;
}

function renderInvestorLevel(){
  const bar=$('inv-level-bar'); if(!bar) return;
  const invested=U.totalInvested||0;
  const cur=getInvestorLevel();
  const next=INVESTOR_LEVELS.find(l=>l.level===cur.level+1);
  const pct=next ? Math.min(100,Math.round((invested-cur.min)/(next.min-cur.min)*100)) : 100;

  // Only trigger level-up if user actually crossed a threshold THIS session
  // (not just because they logged in with a higher level than the saved value)
  const prevLevel = U.investorLevel || 1;
  if(cur.level > prevLevel){
    U.investorLevel = cur.level;
    if(cur.reward > 0){ U.coins += cur.reward; saveU(); updateTopBar(); }
    // Only show modal if we're already past the login/init phase
    if(typeof _appReady !== 'undefined' && _appReady){
      setTimeout(()=>showLevelUpModal(cur), 400);
    }
  } else {
    U.investorLevel = cur.level;
  }

  // Build level chips for all 8 levels
  const chips=INVESTOR_LEVELS.map(lv=>{
    const unlocked=invested>=lv.min;
    const lvTitle=(_uiLang==='en'?lv.titleEn:lv.title)||lv.title;
    return `<div class="inv-unlock-chip ${unlocked?'done':'locked'}" title="Lv.${lv.level}: ${lvTitle}">
      ${lv.icon} ${lvTitle}${lv.unlocksAsset&&!unlocked?' 🔒':''}
    </div>`;
  }).join('');

  bar.innerHTML=`
    <div class="inv-level-header">
      <div class="inv-level-badge">${cur.icon}</div>
      <div class="inv-level-info">
        <div class="inv-level-title">${cur.icon} ${s_('inv_level_label',{title:(_uiLang==='en'?cur.titleEn:cur.title)||cur.title})}</div>
        <div class="inv-level-sub">${invested.toLocaleString()} · ${next?s_('inv_next_unlock',{n:next.min.toLocaleString()}):s_('inv_max')}</div>
      </div>
      <div class="inv-level-num">Niv. ${cur.level}/8</div>
    </div>
    <div class="inv-xp-row">
      <div class="inv-xp-bar-wrap"><div class="inv-xp-bar" style="width:${pct}%;background:${cur.color}"></div></div>
      <div class="inv-xp-pct">${pct}%</div>
    </div>
    ${next&&next.unlocksAsset?`<div style="font-size:.7rem;color:var(--muted);margin-bottom:6px;">${s_('inv_next_asset',{asset:(ASSET_DEFS.find(a=>a.id===next.unlocksAsset)||{name:'?'}).name,n:next.min.toLocaleString()})}${next.reward>0?' · '+s_('inv_reward',{n:next.reward}):''}</div>`:''}
    <div class="inv-unlock-row">${chips}</div>
  `;
}

function showLevelUpModal(lv){
  toast(`🎉 Niveau ${lv.level} débloqué ! ${lv.icon} ${lv.title} +${lv.reward} pièces !`);
  confetti();
}

// ══════════════════════════════════════════════
// FINANCE ACADEMY
// ══════════════════════════════════════════════
let _lessonState={lessonId:null,qi:-1,score:0,answered:false};

function isLessonUnlocked(lesson, completed){
  if(!lesson.prereq) return true;
  return !!completed[lesson.prereq];
}

function renderAcademy(){
  const grid=$('lesson-grid'); if(!grid) return;
  const completed=U.lessonsCompleted||{};
  const lang=(typeof _uiLang!=='undefined'&&_uiLang)||'fr';
  grid.innerHTML='';

  // Group lessons by topic
  const topicOrder=['bases','bourse','risque','macro','avance'];
  const byTopic={};
  FINANCE_LESSONS.forEach(l=>{
    const t=l.topic||'bases';
    if(!byTopic[t]) byTopic[t]=[];
    byTopic[t].push(l);
  });

  topicOrder.forEach(topicId=>{
    const lessons=byTopic[topicId]; if(!lessons||!lessons.length) return;
    const topicDef=(typeof LESSON_TOPICS!=='undefined'&&LESSON_TOPICS)?
      LESSON_TOPICS.find(t=>t.id===topicId):null;
    const topicLabel=topicDef?(topicDef.label[lang]||topicDef.label.fr||topicId):topicId;

    const doneCount=lessons.filter(l=>!!completed[l.id]).length;
    const header=document.createElement('div');
    header.className='academy-topic-header';
    header.innerHTML=`<span class="academy-topic-label">${topicLabel}</span><span class="academy-topic-progress">${doneCount}/${lessons.length}</span>`;
    grid.appendChild(header);

    lessons.forEach(lesson=>{
      const lt=getLessonT(lesson);
      const done=!!completed[lesson.id];
      const unlocked=isLessonUnlocked(lesson,completed);
      const card=document.createElement('div');
      card.className=`lesson-card${done?' lesson-done':''}${!unlocked?' lesson-locked':''}`;
      card.innerHTML=`
        <div class="lesson-icon">${lesson.icon}</div>
        <div class="lesson-title">${lt.title||''}</div>
        <div class="lesson-diff">${lt.difficulty||''}</div>
        <div class="lesson-reward">🪙 +${lesson.reward}</div>
        ${done?'<div class="lesson-done-badge">✅</div>':''}
        ${!unlocked?'<div class="lesson-lock-info">🔒</div>':''}
      `;
      if(unlocked) card.onclick=()=>openLesson(lesson.id);
      grid.appendChild(card);
    });
  });
}

function openLesson(id){
  const lesson=FINANCE_LESSONS.find(l=>l.id===id);
  if(!lesson) return;
  _lessonState={lessonId:id,qi:-1,score:0,answered:false};
  const lt=getLessonT(lesson);
  $('lesson-bc').textContent=lt.title;
  $('lesson-intro-zone').textContent=lt.intro;
  $('lesson-intro-zone').style.display='block';
  $('lesson-q-card').style.display='none';
  $('lesson-complete').style.display='none';
  $('lesson-btn-start').style.display='inline-flex';
  $('lesson-btn-start').textContent=`${lesson.icon} ${s_('lesson_start')} (${lt.questions.length})`;
  $('lesson-btn-next').style.display='none';
  $('lesson-prog-fill').style.width='0%';
  goTo('lesson');
}

function lessonStartQuestions(){
  $('lesson-intro-zone').style.display='none';
  $('lesson-btn-start').style.display='none';
  _lessonState.qi=0;
  renderLessonQuestion();
}

function renderLessonQuestion(){
  const lesson=FINANCE_LESSONS.find(l=>l.id===_lessonState.lessonId);
  if(!lesson) return;
  const qi=_lessonState.qi;
  const lt2=getLessonT(lesson);
  if(qi>=lt2.questions.length){ lessonComplete(); return; }
  const q=lt2.questions[qi];
  const total=lt2.questions.length;
  $('lesson-prog-fill').style.width=`${(qi/total)*100}%`;
  $('lesson-q-num').textContent=s_('lesson_q_label',{i:qi+1,n:total});
  $('lesson-q-text').textContent=q.q;
  $('lesson-explain').textContent='';
  $('lesson-explain').className='lesson-explain-bar';
  _lessonState.answered=false;

  const choicesDiv=$('lesson-choices');
  choicesDiv.innerHTML='';
  q.choices.forEach((choice,i)=>{
    const btn=document.createElement('button');
    btn.className='lesson-choice';
    btn.textContent=choice;
    btn.onclick=()=>pickLessonChoice(i,btn,q);
    choicesDiv.appendChild(btn);
  });

  $('lesson-q-card').style.display='block';
  $('lesson-btn-next').style.display='none';
}

function pickLessonChoice(idx,btn,q){
  if(_lessonState.answered) return;
  _lessonState.answered=true;
  const correct=idx===q.correct;
  if(correct) _lessonState.score++;
  // Colour all choices
  document.querySelectorAll('.lesson-choice').forEach((b,i)=>{
    b.disabled=true;
    if(i===q.correct) b.classList.add('choice-correct');
    else if(i===idx&&!correct) b.classList.add('choice-wrong');
  });
  // Show explanation
  const exp=$('lesson-explain');
  exp.textContent=(correct?'✅ ':'❌ ')+q.explain;
  exp.className='lesson-explain-bar show';
  $('lesson-btn-next').style.display='inline-flex';
  const _l2=FINANCE_LESSONS.find(l=>l.id===_lessonState.lessonId);
  const _lt2=getLessonT(_l2);
  $('lesson-btn-next').textContent=_lessonState.qi+1>=_lt2.questions.length?s_('lesson_finish'):s_('lesson_next');
}

function lessonNext(){
  _lessonState.qi++;
  renderLessonQuestion();
}

function lessonComplete(){
  const lesson=FINANCE_LESSONS.find(l=>l.id===_lessonState.lessonId);
  if(!lesson) return;
  const score=_lessonState.score;
  const lt3=getLessonT(lesson);
  const total=lt3.questions.length;
  const pct=Math.round(score/total*100);
  const alreadyDone=(U.lessonsCompleted||{})[lesson.id];

  // Award coins only first time
  let earned=0;
  if(!alreadyDone){
    earned=Math.round(lesson.reward*(pct/100));
    U.coins+=earned;
    if(!U.lessonsCompleted) U.lessonsCompleted={};
    U.lessonsCompleted[lesson.id]=true;
    saveU(); updateTopBar();
  }

  $('lesson-q-card').style.display='none';
  $('lesson-btn-next').style.display='none';
  $('lesson-btn-start').style.display='none';
  $('lesson-prog-fill').style.width='100%';
  $('lesson-done-title').textContent=pct>=80?s_('lesson_done_great'):pct>=50?s_('lesson_done_good'):s_('lesson_done_keep');
  $('lesson-done-sub').textContent=s_('lesson_done_score',{s:score,t:total,p:pct})+(alreadyDone?' '+s_('lesson_done_already'):'');
  $('lesson-done-reward').innerHTML=earned>0?`+${earned} <span class="coin"></span>`:`🏆 ${pct}%`;
  $('lesson-complete').style.display='block';
  if(earned>0) confetti();
}

// ══════════════════════════════════════════════
// PORTFOLIO SCREEN
// ══════════════════════════════════════════════
function renderPortfolio(){
  if(!U) return;
  // Safety: ensure all required fields exist (in case of old saved data)
  if(!U.assets)      U.assets = {};
  if(!U.assetValues) U.assetValues = {};
  if(!U.lessonsCompleted) U.lessonsCompleted = {};
  if(U.investorLevel === undefined) U.investorLevel = 1;
  if(!U.totalInvested) U.totalInvested = 0;
  calcDividends();
  const wealth=getTotalWealth();
  const daily=getDailyDividend();
  const invested=U.totalInvested||0;
  $('wealth-total').innerHTML=`${wealth.toLocaleString()} <span class="coin"></span>`;
  $('wealth-sub').innerHTML=`+${daily.toFixed(1)} <span class="coin"></span>/j · Patrimoine en croissance constante`;
  $('pf-coins').innerHTML=Math.floor(U.coins).toLocaleString()+' <span class="coin"></span>';
  $('pf-div-total').innerHTML=daily.toFixed(1)+' <span class="coin"></span>/j';
  $('pf-invested').innerHTML=invested.toLocaleString()+' <span class="coin"></span>';

  // Dividend banner
  const pending=U.pendingDiv||0;
  const db=$('div-banner');
  if(pending>=1){
    db.style.display='flex';
    $('div-amount').innerHTML=`+${Math.floor(pending)} <span class="coin"></span>`;
    $('div-banner-sub').innerHTML=`Dividendes accumulés · Taux journalier : ${daily.toFixed(1)} <span class="coin"></span>`;
    $('collect-btn').disabled=false;
  } else { db.style.display='none'; }

  // Investor level bar
  renderInvestorLevel();

  // Finance Academy
  renderAcademy();

  // Assets grid
  const investorLv=getInvestorLevel().level;
  const grid=$('assets-grid'); grid.innerHTML='';
  ASSET_DEFS.forEach(a=>{
    const owned=U.assets[a.id]||0;
    const unlocked=a.unlockLevel<=investorLv;
    const base=a.cost*owned;
    const appreciated=base+(U.assetValues[a.id]||0);
    const scaledCost=Math.round(a.cost*(1+owned*0.1));
    const canBuy=U.coins>=scaledCost&&unlocked;
    const pct=Math.min(100,owned*10);
    const dailyEarn=(a.cost*owned*a.divRate).toFixed(1);
    const growthPct=owned>0?((U.assetValues[a.id]||0)/Math.max(base,1)*100).toFixed(1):0;
    const reqLv=INVESTOR_LEVELS.find(l=>l.level===a.unlockLevel);

    const div=document.createElement('div');
    div.className=`asset-card ${a.class}${!unlocked?' asset-locked':''}`;
    div.innerHTML=`
      ${!unlocked?`<div class="asset-locked-overlay">
        <div class="asset-locked-icon">🔒</div>
        <div class="asset-locked-msg">Niveau Investisseur ${a.unlockLevel} requis</div>
      </div>`:''}
      <div class="asset-card-header">
        <div class="asset-card-icon">${a.icon}</div>
        <div class="asset-card-info">
          <div class="asset-card-name">${a.name} <span class="asset-card-ticker">${a.type}</span></div>
          <div class="asset-card-real" id="rp-${a.id}">${unlocked?'Chargement…':'—'}</div>
        </div>
        <div class="asset-card-right">
          <div class="asset-card-value">${Math.floor(appreciated).toLocaleString()} <span class="coin"></span></div>
          <div class="asset-card-sub">${owned>0?`${owned} unité${owned!==1?'s':''} · +${growthPct}%`:`Niv. ${a.unlockLevel}`}</div>
        </div>
      </div>
      ${owned>0?`<div class="asset-card-divbar"><div class="asset-card-divbar-fill ${a.class}" style="width:${pct}%"></div></div>`:''}
      <div class="asset-card-meta">
        <span>🌱 ${a.divRate*100}%/j</span>
        ${owned>0?`<span class="asset-meta-earn">+${dailyEarn} <span class="coin"></span>/j</span>`:''}
        <span>📈 +${(a.growthRate*100).toFixed(2)}%/j</span>
      </div>
      <div class="asset-card-actions">
        <button class="asset-buy-btn" onclick="buyAsset('${a.id}')" ${!canBuy?'disabled':''}>
          ${owned===0?'Acheter':'+1 unité'} <span class="asset-btn-cost">${scaledCost} <span class="coin"></span></span>
        </button>
        ${owned>0?`<button class="asset-sell-btn" onclick="sellAsset('${a.id}')">Vendre</button>`:''}
        <button class="asset-info-btn-sm" onclick="openAssetInfo('${a.id}')">📊</button>
      </div>
    `;
    grid.appendChild(div);
  });

  // Fetch live prices
  setTimeout(()=>{ fetchMarketPrices(); updateTarget(); }, 0);
}

function buyAsset(id){
  const a=ASSET_DEFS.find(x=>x.id===id); if(!a) return;
  const investorLv=getInvestorLevel().level;
  if(a.unlockLevel>investorLv){ toast('🔒 Niveau investisseur insuffisant'); return; }
  const owned=U.assets[id]||0;
  const scaledCost=Math.round(a.cost*(1+owned*0.1));
  if(U.coins<scaledCost){ toast('❌ Pas assez de pièces'); return; }
  U.coins-=scaledCost;
  U.assets[id]=owned+1;
  U.totalInvested=(U.totalInvested||0)+scaledCost;
  saveU(); updateTopBar();
  floatCoin($('assets-grid'),`-${scaledCost} <span class="coin"></span>`);
  renderPortfolio();
  toast(`${a.icon} ${a.name} niv.${U.assets[id]} · +${(a.divRate*100).toFixed(1)}%/j`);
  setTimeout(()=>{ if(typeof checkTrophies==='function') checkTrophies(); }, 400);
}

function sellAsset(id){
  const a=ASSET_DEFS.find(x=>x.id===id); if(!a) return;
  const owned=U.assets[id]||0; if(owned<=0) return;
  const lastCost=Math.round(a.cost*(1+(owned-1)*0.1));
  const sellPrice=Math.round(lastCost*0.8);
  U.coins+=sellPrice;
  U.assets[id]=owned-1;
  U.totalInvested=Math.max(0,(U.totalInvested||0)-lastCost);
  if(U.assetValues[id]) U.assetValues[id]=Math.max(0,U.assetValues[id]-lastCost*0.05);
  saveU(); updateTopBar();
  floatCoin($('assets-grid'),`+${sellPrice} <span class="coin"></span>`);
  renderPortfolio();
  toast(`Vendu 1× ${a.name} → +${sellPrice} pièces (80%)`);
}

// ══════════════════════════════════════════════
// REAL MARKET DATA — 8 assets
// ══════════════════════════════════════════════
const MARKET_IDS = {
  gold:   {source:'yahoo',    ticker:'GC%3DF',  label:'Or / XAU',         unit:'USD/oz'},
  house:  {source:'yahoo',    ticker:'VNQ',     label:'REIT VNQ',          unit:'USD'},
  stock:  {source:'yahoo',    ticker:'SPY',     label:'S&P 500 ETF',       unit:'USD'},
  crypto: {source:'coingecko',cgId:'bitcoin',   label:'Bitcoin / USD',     unit:'USD'},
  etf:    {source:'yahoo',    ticker:'VT',      label:'ETF Monde VT',      unit:'USD'},
  bonds:  {source:'yahoo',    ticker:'TLT',     label:'Obligations TLT',   unit:'USD'},
  oil:    {source:'yahoo',    ticker:'CL%3DF',  label:'Pétrole WTI',       unit:'USD/baril'},
  nasdaq: {source:'yahoo',    ticker:'QQQ',     label:'Nasdaq 100 QQQ',    unit:'USD'},
};

const _priceCache={};
let _lastFetch=0;

async function fetchMarketPrices(){
  const now=Date.now();
  if(now-_lastFetch<5*60*1000&&Object.keys(_priceCache).length>0){ updatePriceDisplay(); return; }
  _lastFetch=now;

  // Bitcoin via CoinGecko
  try{
    const r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',{mode:'cors'});
    if(r.ok){const d=await r.json(); if(d.bitcoin) _priceCache.crypto={price:d.bitcoin.usd,change:d.bitcoin.usd_24h_change};}
  }catch(e){}

  // Yahoo Finance via allorigins proxy — all other tickers
  const yahooIds=['gold','house','stock','etf','bonds','oil','nasdaq'];
  for(const id of yahooIds){
    const info=MARKET_IDS[id]; if(!info||info.source!=='yahoo') continue;
    try{
      const url=`https://query1.finance.yahoo.com/v8/finance/chart/${info.ticker}?interval=1d&range=5d`;
      const proxy=`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const r=await fetch(proxy,{signal:AbortSignal.timeout(8000)});
      if(r.ok){
        const wrapper=await r.json();
        const d=JSON.parse(wrapper.contents);
        const res=d?.chart?.result?.[0];
        if(res){
          const price=res.meta.regularMarketPrice;
          const prev=res.meta.chartPreviousClose||res.meta.previousClose;
          _priceCache[id]={price, change:prev?((price-prev)/prev*100):0, history:res.indicators?.quote?.[0]?.close||[]};
        }
      }
    }catch(e){}
  }
  applyRealPriceGrowth();
  updatePriceDisplay();
}

// Drive practice asset appreciation from real market % change
function applyRealPriceGrowth(){
  if(!U) return;
  if(!U._lastRealPrice) U._lastRealPrice={};
  let changed=false;
  ASSET_DEFS.forEach(a=>{
    const owned=U.assets[a.id]||0;
    const cache=_priceCache[a.id];
    if(!cache) return;
    const last=U._lastRealPrice[a.id];
    if(!last){
      U._lastRealPrice[a.id]=cache.price;
      changed=true;
      return;
    }
    if(owned>0 && last!==cache.price){
      const pct=(cache.price-last)/last;
      const base=a.cost*owned;
      U.assetValues[a.id]=(U.assetValues[a.id]||0)+base*pct;
      changed=true;
    }
    U._lastRealPrice[a.id]=cache.price;
  });
  if(changed) saveU();
}

function updatePriceDisplay(){
  Object.entries(MARKET_IDS).forEach(([id,info])=>{
    const el=document.getElementById('rp-'+id); if(!el) return;
    const c=_priceCache[id];
    if(!c){el.innerHTML=`<span style="color:var(--muted);font-size:.7rem;">prix indisponible</span>`; return;}
    const chgColor=c.change>=0?'var(--green)':'var(--red)';
    const chgSign=c.change>=0?'+':'';
    el.innerHTML=`<span style="font-weight:800;color:var(--text);">$${c.price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</span> <span style="color:${chgColor};font-weight:700;">${chgSign}${c.change.toFixed(2)}% aujourd'hui</span>`;
  });
}

// ══════════════════════════════════════════════
// ASSET INFO MODAL
// ══════════════════════════════════════════════
let _currentAssetId=null;

function openAssetInfo(id){
  const a=ASSET_DEFS.find(x=>x.id===id); if(!a) return;
  _currentAssetId=id;
  const owned=U.assets[id]||0;
  const base=a.cost*owned;
  const appreciated=base+(U.assetValues[id]||0);
  const daily=(a.cost*owned*a.divRate).toFixed(1);
  const pv=appreciated-base;

  $('amod-icon').textContent=a.icon;
  $('amod-name').textContent=a.name;
  $('amod-type').textContent=a.type+' · '+(MARKET_IDS[id]?.label||'');
  $('amod-owned').textContent=owned+' unité'+(owned!==1?'s':'');
  $('amod-val').innerHTML=Math.floor(appreciated)+' <span class="coin"></span>';
  $('amod-daily').innerHTML=daily+' <span class="coin"></span>/j';
  $('amod-pv').innerHTML=`<span style="color:${pv>=0?'var(--green)':'var(--red)'}">${pv>=0?'+':''}${Math.floor(pv)} <span class="coin"></span></span>`;
  $('amod-explain').textContent=a.realWhat||a.explain;

  // Live price
  const c=_priceCache[id];
  if(c){
    $('amod-price').textContent='$'+c.price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
    $('amod-change').innerHTML=`<span style="color:${c.change>=0?'var(--green)':'var(--red)'}">${c.change>=0?'+':''}${c.change.toFixed(2)}% sur 24h</span>`;
    $('amod-ticker').textContent=MARKET_IDS[id]?.label||'';
    // Mini sparkline chart
    renderSparkline(id, c.history||[]);
  } else {
    $('amod-price').textContent='Chargement…';
    $('amod-change').textContent='';
    $('amod-ticker').textContent='';
    fetchMarketPrices().then(()=>{
      const fresh=_priceCache[id];
      if(fresh&&_currentAssetId===id){
        $('amod-price').textContent='$'+fresh.price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
        const cc=fresh.change>=0?'var(--green)':'var(--red)';
        $('amod-change').innerHTML=`<span style="color:${cc}">${fresh.change>=0?'+':''}${fresh.change.toFixed(2)}% sur 24h</span>`;
        renderSparkline(id,fresh.history||[]);
      }
    });
  }

  // Wire buy/sell
  const scaledCost=Math.round(a.cost*(1+owned*0.1));
  $('amod-buy-btn').innerHTML=`Acheter (${scaledCost})`;
  $('amod-buy-btn').onclick=()=>{buyAsset(id);openAssetInfo(id);};
  $('amod-buy-btn').disabled=U.coins<scaledCost||(a.unlockLevel>getInvestorLevel().level);
  const sellPrice=owned>0?Math.round(a.cost*(1+(owned-1)*0.1)*0.8):0;
  $('amod-sell-btn').innerHTML=owned>0?`Vendre (${sellPrice})`:'Vendre';
  $('amod-sell-btn').onclick=()=>{if(owned>0){sellAsset(id);closeAssetModal();}};
  $('amod-sell-btn').disabled=owned<=0;

  $('asset-modal').style.display='flex';
}

function renderSparkline(id, history){
  // Draw a tiny SVG sparkline inside the modal's price block
  const container=$('amod-price').parentElement;
  const existing=container.querySelector('.amod-sparkline');
  if(existing) existing.remove();
  const data=history.filter(v=>v!=null);
  if(data.length<2) return;
  const w=280,h=40;
  const min=Math.min(...data),max=Math.max(...data),range=max-min||1;
  const pts=data.map((v,i)=>{
    const x=Math.round(i/(data.length-1)*w);
    const y=Math.round(h-(v-min)/range*h);
    return `${x},${y}`;
  }).join(' ');
  const rising=data[data.length-1]>=data[0];
  const color=rising?'#10b981':'#ef4444';
  const svg=document.createElement('div');
  svg.className='amod-sparkline';
  svg.style='margin-top:8px;';
  svg.innerHTML=`<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="width:100%;height:${h}px">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${data.length>1?(data.length-1)/(data.length-1)*w:w}" cy="${h-(data[data.length-1]-min)/range*h}" r="3" fill="${color}"/>
    <text x="2" y="10" font-size="8" fill="var(--muted)">5j</text>
  </svg>`;
  container.appendChild(svg);
}

function closeAssetModal(e){
  if(!e||e.target===$('asset-modal')){
    $('asset-modal').style.display='none';
    _currentAssetId=null;
  }
}

// ══════════════════════════════════════════════
// GLOBAL ENTER KEY
// ══════════════════════════════════════════════
document.addEventListener('keydown',function(e){
  if(e.key!=='Enter') return;
  const active=document.querySelector('.screen.active');
  if(!active) return;
  if(active.id==='screen-game'){
    const nb=$('btn-next'),cb=$('btn-check');
    if(nb&&nb.style.display!=='none'){e.preventDefault();nextQ();return;}
    if(cb&&cb.style.display!=='none'&&S.curType!=='fill'){e.preventDefault();checkCurrentQ();}
  }
  if(active.id==='screen-lesson'){
    const nb=$('lesson-btn-next');
    if(nb&&nb.style.display!=='none'){e.preventDefault();lessonNext();}
  }
});
