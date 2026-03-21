// ══════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════
function goTo(sc){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $('screen-'+sc).classList.add('active');
  window.scrollTo(0,0);clearInterval(S.timer);
}
function navTo(tab){
  const screens={learn:'learn',portfolio:'portfolio',shop:'shop',profile:'profile',auth:'auth','theme-picker':'theme-picker',lesson:'lesson',rank:'rank',trophies:'trophies','compost-lobby':'compost-lobby','compost-game':'compost-game'};
  ['learn','portfolio','shop','profile','rank'].forEach(t=>{
    const n=$('nav-'+t); if(n) n.classList.toggle('active',t===tab);
  });
  if(tab==='portfolio'){ renderPortfolio(); }
  if(tab==='shop') renderShop();
  if(tab==='profile'){ renderProfile(); renderTrophiesPreview(); }
  if(tab==='rank'){
    // Show lb tab by default, ensure all zones correct
    switchRankTab('lb');
  }
  if(tab!=='rank' && typeof stopDuelRefresh==='function') stopDuelRefresh();
  if(tab==='trophies'){ renderTrophies(); }
  if(tab==='learn'){ renderSRSWidget(); }
  renderEventBanner();
  if(screens[tab]) goTo(screens[tab]);
}

// ══════════════════════════════════════════════
// TOP BAR
// ══════════════════════════════════════════════
// ══════════════════════════════════════════════
// TOP BAR
// ══════════════════════════════════════════════
function updateTopBar(){
  if(!U) return;
  $('tb-coins').textContent=Math.floor(U.coins);
  const ab=$('avatar-btn');ab.textContent=U.name.charAt(0).toUpperCase();
  if(U.owned.includes('avatar_diamond')) ab.style.background='linear-gradient(135deg,#3b82f6,#06b6d4)';
  else if(U.owned.includes('avatar_gold')) ab.style.background='linear-gradient(135deg,#d97706,#fbbf24)';
}

// ══════════════════════════════════════════════
// SHOP
// ══════════════════════════════════════════════
let _shopCat = 'all';
function renderShop(){
  if(!U) return;
  $('shop-coins').textContent=Math.floor(U.coins);

  // Build category tabs
  const tabs=$('shop-tabs');
  if(tabs){
    const cats=[
      {id:'all',   label:'Tout'},
      {id:'consumable', label:'⚡ Boosts'},
      {id:'cosmetic',   label:'💎 Style'},
      {id:'premium',    label:'🎁 Bonus'},
      {id:'duel',       label:'⚔️ Duels'},
    ];
    tabs.innerHTML=cats.map(c=>`<button class="topic-tab${_shopCat===c.id?' active':''}" onclick="_shopCat='${c.id}';renderShop()">${c.label}</button>`).join('');
  }

  const grid=$('shop-grid');grid.innerHTML='';
  const items=_shopCat==='all' ? SHOP_ITEMS : SHOP_ITEMS.filter(x=>x.type===_shopCat);
  items.forEach(item=>{
    const owned=U.owned?.includes(item.id);
    const stacks=item.stacks; // consumables can be re-bought
    const alreadyHas=owned&&!stacks;
    const canBuy=!alreadyHas&&Math.floor(U.coins)>=item.price;
    const uses=item.stacks?(U.shopUses?.[item.id]||0):null;
    const catColor={consumable:'var(--accent3)',cosmetic:'var(--gold)',premium:'var(--green)',duel:'var(--accent2)'}[item.type]||'var(--muted)';
    const div=document.createElement('div');
    div.className='shop-item'+(alreadyHas?' owned':'');
    div.innerHTML=`
      ${alreadyHas?'<div class="owned-badge">✓ Possédé</div>':''}
      <div style="margin-bottom:5px;"><span class="shop-cat-badge" style="background:${catColor}22;color:${catColor};">${{consumable:t('shop_cat_boost')||'Boost',cosmetic:t('shop_cat_style')||'Style',premium:'Bonus',duel:'Duel'}[item.type]||item.type}</span></div>
      <div class="shop-icon">${item.icon}</div>
      <div class="shop-name">${item.name}</div>
      <div class="shop-desc">${item.desc}</div>
      ${uses!==null?`<div style="font-size:.72rem;color:var(--accent3);margin-bottom:4px;">✓ ${uses} en stock</div>`:''}
      <div class="shop-price">${item.price>0?`<span class="coin"></span> ${item.price}`:'🎁 Gratuit'}</div>
      <button class="btn btn-sm ${alreadyHas?'btn-secondary':'btn-primary'}" style="margin-top:10px;width:100%;justify-content:center;" onclick="buyShop('${item.id}')" ${alreadyHas||(!canBuy&&item.price>0)?'disabled':''}>
        ${alreadyHas?t('shop_owned')||'Possédé ✓':item.price===0?t('shop_claim')||'Réclamer':t('level_buy_btn')}
      </button>
    `;
    grid.appendChild(div);
  });
  if(!items.length) grid.innerHTML='<div style="color:var(--muted);text-align:center;padding:30px;grid-column:1/-1;">Aucun article dans cette catégorie</div>';
}

function buyShop(id){
  const item=SHOP_ITEMS.find(x=>x.id===id);
  if(!item) return;
  if(!item.stacks && U.owned?.includes(id)){toast('Déjà possédé');return;}
  if(item.price>0&&Math.floor(U.coins)<item.price){toast('❌ Pas assez de pièces !');return;}
  U.coins-=item.price;
  if(item.stacks){
    if(!U.shopUses) U.shopUses={};
    U.shopUses[id]=(U.shopUses[id]||0)+1;
  } else {
    if(!U.owned) U.owned=[];
    U.owned.push(id);
  }
  // Apply instant effects
  if(id==='bonus_coins'){ U.coins+=(item.bonus||50); toast('🎁 +'+item.bonus+' pièces !'); }
  if(id==='xp_boost')   { U.xpBoostSessions=3; toast('⚡ XP x2 pendant 3 sessions !'); }
  if(id==='streak_shield'){ U.streakShield=true; toast('🛡️ Bouclier série actif !'); }
  if(id==='hint_pack')  { U.hints=(U.hints||0)+5; toast('💡 +5 indices ajoutés !'); }
  if(id==='duel_token') { U.duelTokens=(U.duelTokens||0)+1; toast('⚔️ Jeton duel +1 !'); }
  if(id==='coin_magnet'){ U.coinMagnet=true; toast('🧲 Aimant à pièces actif !'); }
  saveU();updateTopBar();renderShop();
  toast(`${item.icon} ${item.name} acheté !`);
}

// ══════════════════════════════════════════════
// PROFILE
// ══════════════════════════════════════════════
function renderProfile(){
  if(!U) return;
  $('prof-name').textContent=U.name;
  $('prof-email').textContent=U.email;
  $('prof-joined').textContent=t('joined')+new Date(U.joined).toLocaleDateString('fr');
  const pseudoEl=$('prof-pseudo');
  if(pseudoEl){
    if(U.pseudo){ pseudoEl.textContent='@'+U.pseudo; pseudoEl.style.opacity='1'; }
    else{ pseudoEl.textContent='+ Choisir un pseudo'; pseudoEl.style.opacity='.5'; }
  }
  $('prof-avatar').textContent=U.name.charAt(0).toUpperCase();
  if(U.owned.includes('avatar_diamond')) $('prof-avatar').style.background='linear-gradient(135deg,#3b82f6,#06b6d4)';
  else if(U.owned.includes('avatar_gold')) $('prof-avatar').style.background='linear-gradient(135deg,#d97706,#fbbf24)';
  $('ps-xp').textContent=U.xp||0;
  $('ps-coins').textContent=Math.floor(U.coins);
  $('ps-sessions').textContent=U.sessions||0;
  $('ps-streak').textContent=U.streak||0;
  $('ps-chapters').textContent=U.chaptersCompleted||0;
  $('ps-wealth').textContent=getTotalWealth();
  // Theme buttons
  const savedTheme = localStorage.getItem('lq_theme') || 'dark';
  ['dark','light','claude'].forEach(m => {
    const b = document.getElementById('theme-btn-'+m);
    if(b) b.classList.toggle('active', m === savedTheme);
  });
  // UI Language grid
  renderUILangGrid();
}

// ══════════════════════════════════════════════
// LANG GRIDS & LEARNING NAV
// ══════════════════════════════════════════════
let S={nL:null,tL:null,level:null,chap:null,gType:null,qs:[],qi:0,score:0,cor:0,wr:0,ts:{quiz:{c:0,w:0},fill:{c:0,w:0},match:{c:0,w:0},sort:{c:0,w:0}},timer:null,tLeft:0,mPairs:[],mSel:null,mDone:0,mTotal:0,mEmbed:false,sortArr:[],curType:null,curQ:null};

function buildGrids(){
  ['native-grid','target-grid'].forEach(gid=>{
    const g=$(gid);g.innerHTML='';
    Object.entries(LANGS).forEach(([code,l])=>{
      const d=document.createElement('div');d.className='lang-card';d.dataset.code=code;
      d.innerHTML=`<span class="flag">${l.flag}</span><span class="lname">${l.name}</span><span class="lnative">${l.native}</span>`;
      d.onclick=()=>pickLang(gid,code);g.appendChild(d);
    });
  });
}
function pickLang(gid,code){
  const nat=gid==='native-grid';
  if(nat&&code===S.tL){S.tL=null;clrSel('target-grid');}
  if(!nat&&code===S.nL){S.nL=null;clrSel('native-grid');}
  if(nat) S.nL=code; else S.tL=code;
  document.querySelectorAll(`#${gid} .lang-card`).forEach(c=>c.classList.toggle('selected',c.dataset.code===code));
  if(nat){$('target-section').style.opacity='1';$('lang-arrow').style.opacity='1';}
  syncPair();syncDots();
}
function clrSel(gid){document.querySelectorAll(`#${gid} .lang-card`).forEach(c=>c.classList.remove('selected'));}
function swapLangs(){const t=S.nL;S.nL=S.tL;S.tL=t;clrSel('native-grid');clrSel('target-grid');if(S.nL)document.querySelector(`#native-grid [data-code="${S.nL}"]`)?.classList.add('selected');if(S.tL)document.querySelector(`#target-grid [data-code="${S.tL}"]`)?.classList.add('selected');syncPair();}
function syncPair(){const ok=S.nL&&S.tL&&S.nL!==S.tL;$('pair-summary').style.display=ok?'flex':'none';if(ok){const N=LANGS[S.nL],T=LANGS[S.tL];$('pair-native').innerHTML=`<span style="font-size:1.2rem">${N.flag}</span> ${N.name}`;$('pair-target').innerHTML=`<span style="font-size:1.2rem">${T.flag}</span> ${T.name}`;}$('btn-start').disabled=!ok;}
function syncDots(){const s1=!!S.nL,s2=!!(S.nL&&S.tL&&S.nL!==S.tL);$('dot1').className='step-dot '+(s1?'done':'active');$('dot2').className='step-dot '+(s2?'done':s1?'active':'pending');$('dot3').className='step-dot '+(s2?'active':'pending');$('line1').className='step-line'+(s1?' done':'');$('line2').className='step-line'+(s2?' done':'');}

function goToLevels(){
  if(!S.nL||!S.tL){navTo('learn');return;}
  if(!LANGS[S.nL]||!LANGS[S.tL]){navTo('learn');return;}
  // Save language pair
  if(U && !U.isGuest){ U.lastNL=S.nL; U.lastTL=S.tL; saveU(); }
  const N=LANGS[S.nL], T=LANGS[S.tL];
  const pair=`${N.flag} → ${T.flag} ${T.name}`;
  sT('bc-pair',pair); sT('bc-pair2',pair);
  sT('levels-title',`${T.flag} ${T.name} — Niveaux`);
  // Update XP bar
  if(typeof updateXPBar==='function') updateXPBar();
  renderLevels();
  goTo('levels');
}
function renderLevels(){
  const g=$('levels-grid');g.innerHTML='';
  if(!U.unlockedLevels) U.unlockedLevels=['A1'];
  LEVELS.forEach((lv,i)=>{
    const has=!!CHAPTERS[lv.id];
    const unlocked=U.unlockedLevels.includes(lv.id)||(i===0);
    const done=lvDone(lv.id),stars=lvStars(lv.id);
    const canAfford=Math.floor(U.coins)>=(lv.price||0);
    const d=document.createElement('div');
    d.className=`level-card ${lv.id} ${!unlocked?'locked':done?'completed':'available'}`;
    if(!unlocked){
      d.innerHTML=`
        <span class="level-badge">${lv.id}</span>
        <div class="level-title">${lv.label.split('—')[1].trim()}</div>
        <div class="level-desc">${lv.desc}</div>
        <button class="btn-unlock-level ${canAfford?'can-afford':'cant-afford'}"
          onclick="event.stopPropagation();buyLevel('${lv.id}')">
          ${canAfford?'🔓':'🔒'} ${lv.price} 🪙
        </button>`;
    } else {
      d.innerHTML=`
        <span class="level-badge">${lv.id}</span>
        <div class="level-title">${lv.label.split('—')[1].trim()}</div>
        <div class="level-desc">${lv.desc}</div>
        <div class="level-stars">${stHTML(stars)}</div>`;
      d.onclick=()=>goToChaps(lv.id);
    }
    g.appendChild(d);
  });
}
function buyLevel(lvId){
  if(!U.unlockedLevels) U.unlockedLevels=['A1'];
  if(U.unlockedLevels.includes(lvId)) return;
  const lv=LEVELS.find(l=>l.id===lvId);
  if(!lv) return;
  if(Math.floor(U.coins)<lv.price){ toast('❌ Pas assez de pièces !'); return; }
  if(!confirm(t('level_unlock_confirm').replace('{id}',lvId).replace('{n}',lv.price))) return;
  U.coins-=lv.price;
  U.unlockedLevels.push(lvId);
  saveU();
  toast(t('level_unlocked').replace('{id}',lvId));
  renderLevels();
  updateTopBar();
}
function lvDone(id){const cs=CHAPTERS[id]||[];return cs.length>0&&cs.every(c=>U?.progress[pk(c.id)]?.completed);}
function lvStars(id){const cs=CHAPTERS[id]||[];if(!cs.length)return 0;return Math.round(cs.reduce((a,c)=>a+(U?.progress[pk(c.id)]?.stars||0),0)/cs.length);}
function pk(cid){return`${S.nL}-${S.tL}-${cid}`;}
function stHTML(n){return[0,1,2].map(i=>`<span style="color:${i<n?'var(--accent4)':'rgba(255,255,255,.1)'}">★</span>`).join('');}

function goToChaps(lvId){S.level=lvId;S._activeTopic='conv';const T=LANGS[S.tL],lv=LEVELS.find(l=>l.id===lvId);sT('bc-level2',lvId);sT('chapters-title',`${T.flag} ${lvId}`);renderTopicTabs();renderChaps();goTo('chapters');}
function renderTopicTabs(){
  const wrap=$('topic-tabs'); if(!wrap) return;
  const lang=S.nL||'fr';
  // Count chapters per topic (include DIY)
  const allCs=CHAPTERS[S.level]||[];
  const diyCs=(U.diyLessons||[]).filter(d=>d.level===S.level);
  const counts={};
  allCs.forEach(c=>{ counts[c.topic]=(counts[c.topic]||0)+1; });
  if(diyCs.length) counts['diy']=diyCs.length;
  wrap.innerHTML='';
  (typeof TOPIC_DEFS!=='undefined'?TOPIC_DEFS:[]).forEach(t=>{
    const n=counts[t.id]||0;
    const btn=document.createElement('button');
    btn.className='topic-tab'+(S._activeTopic===t.id?' active':'')+(n===0?' empty':'');
    btn.innerHTML=`${t.icon} ${t.label[lang]||t.label.fr}${n?` <span class="topic-count">${n}</span>`:''}`;
    btn.onclick=()=>{ S._activeTopic=t.id; renderTopicTabs(); renderChaps(); };
    wrap.appendChild(btn);
  });
}

function renderChaps(){
  const list=$('chapters-list'); list.innerHTML='';
  const topic=S._activeTopic||'conv';
  const lang=S.nL||'fr';

  // DIY tab
  if(topic==='diy'){
    const diys=(U.diyLessons||[]).filter(d=>d.level===S.level);
    if(!diys.length){
      list.innerHTML=`<div style="color:var(--muted);text-align:center;padding:36px;font-size:.88rem;">${t('diy_no_lessons')}</div>`;
      return;
    }
    diys.forEach((d,i)=>{
      const el=document.createElement('div');
      el.className='chapter-item available diy-chapter';
      el.innerHTML=`<div class="chapter-num">✨</div>
        <div style="flex:1">
          <div style="font-weight:800;margin-bottom:2px;font-size:.92rem;">${d.title}</div>
          <div style="font-size:.74rem;color:var(--muted);">${d.pairs.length} paires · Ma leçon</div>
        </div>
        <button class="diy-del-btn" onclick="event.stopPropagation();deleteDIY(${i})" title=""+t('diy_delete_btn')+"">🗑</button>`;
      el.onclick=()=>startDIYLesson(d);
      list.appendChild(el);
    });
    return;
  }

  // Normal chapters filtered by topic
  const allCs=CHAPTERS[S.level]||[];
  const cs=allCs.filter(c=>c.topic===topic);
  if(!cs.length){
    list.innerHTML=`<div style="color:var(--muted);text-align:center;padding:36px;font-size:.88rem;">${t('content_coming')}</div>`;
    return;
  }
  cs.forEach((ch,i)=>{
    const p=U?.progress[pk(ch.id)],done=p?.completed;
    // unlock: first of topic always open, then sequential within topic
    const locked=i>0&&!U?.progress[pk(cs[i-1].id)]?.completed;
    const title=ch.title[lang]||ch.title.fr,sub=ch.subtitle[lang]||ch.subtitle.fr;
    const d=document.createElement('div');d.className=`chapter-item ${locked?'locked':done?'done':'available'}`;
    d.innerHTML=`<div class="chapter-num">${locked?'🔒':done?'✓':(i+1)}</div>
      <div style="flex:1">
        <div style="font-weight:800;margin-bottom:2px;font-size:.92rem;">${title}</div>
        <div style="font-size:.74rem;color:var(--muted);">${sub}</div>
        <div style="display:flex;gap:4px;margin-top:5px;flex-wrap:wrap;">
          <span class="game-chip">🎲 Mixte</span><span class="game-chip">⚡ Quiz</span><span class="game-chip">✏️ Fill</span><span class="game-chip">🔗 Match</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
        <div>${stHTML(p?.stars||0)}</div>
        ${!locked?`<button class="btn-qr" onclick="event.stopPropagation();openQR('${ch.id}')">📱 QR</button>`:''}
      </div>`;
    if(!locked) d.onclick=()=>goToSel(ch.id);
    list.appendChild(d);
  });
}

// ── DIY Lessons ──────────────────────────────────
// ── DIY LESSON WITH IMAGES ────────────────────────────────────
let _diyPairs = []; // [{native, target, imgUrl}]

function openDIY(){
  _diyPairs = [{native:'',target:'',imgUrl:''}];
  $('diy-title').value = '';
  renderDIYPairs();
  $('diy-modal').style.display = 'flex';
  setTimeout(()=>$('diy-title').focus(), 50);
}

function closeDIY(){ $('diy-modal').style.display='none'; }

function renderDIYPairs(){
  const el = $('diy-pairs-list');
  if(!el) return;
  el.innerHTML = _diyPairs.map((p,i) => `
    <div style="border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;margin-bottom:10px;">
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:6px;margin-bottom:8px;align-items:center;">
        <input class="diy-input" placeholder="Mot natif" value="${(p.native||'').replace(/"/g,'&quot;')}"
          oninput="_diyPairs[${i}].native=this.value" style="font-size:.85rem;">
        <input class="diy-input" placeholder="Traduction" value="${(p.target||'').replace(/"/g,'&quot;')}"
          oninput="_diyPairs[${i}].target=this.value" style="font-size:.85rem;">
        <button class="diy-del-btn" onclick="_diyPairs.splice(${i},1);renderDIYPairs()">✕</button>
      </div>
      <div style="display:flex;gap:6px;align-items:center;">
        ${p.imgUrl
          ? `<img src="${p.imgUrl}" style="width:48px;height:48px;object-fit:cover;border-radius:8px;flex-shrink:0;" onerror="this.style.display='none'">`
          : `<div style="width:48px;height:48px;border-radius:8px;background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;">🖼️</div>`}
        <input class="diy-input" placeholder="URL image (ou cherche ci-dessous)"
          value="${(p.imgUrl||'').replace(/"/g,'&quot;')}"
          oninput="_diyPairs[${i}].imgUrl=this.value;renderDIYPairs()"
          style="font-size:.74rem;flex:1;">
        <button onclick="searchImgFor(${i})" style="background:rgba(6,182,212,.15);border:1px solid rgba(6,182,212,.3);
          border-radius:8px;padding:6px 10px;color:#22d3ee;font-family:inherit;font-weight:800;
          font-size:.72rem;cursor:pointer;white-space:nowrap;flex-shrink:0;">🔍 Chercher</button>
      </div>
      <div id="img-results-${i}" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;min-height:0;"></div>
    </div>`).join('');
}

async function searchImgFor(idx){
  const p=_diyPairs[idx];
  const query=(p.native||p.target||'').trim();
  if(!query){toast('Entre un mot d'abord');return;}
  const el=document.getElementById('img-results-'+idx);
  if(!el)return;
  el.innerHTML='<span style="font-size:.74rem;color:var(--muted)">Recherche…</span>';

  try{
    // Wikimedia Commons — no API key, open license images
    const url='https://commons.wikimedia.org/w/api.php?action=query'
      +'&generator=search&gsrsearch='+encodeURIComponent(query)
      +'&gsrnamespace=6&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=120'
      +'&format=json&origin=*&gsrlimit=9';
    const r=await fetch(url);
    const d=await r.json();
    const pages=Object.values(d?.query?.pages||{});
    const imgs=pages.map(p=>p?.imageinfo?.[0]).filter(i=>i&&i.thumburl)
      .filter(i=>!/\.svg$/i.test(i.url))  // skip SVG
      .slice(0,6);

    if(!imgs.length){
      // Wikipedia thumbnail fallback
      const wr=await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(query));
      const wd=await wr.json();
      const thumb=wd?.thumbnail?.source;
      if(thumb) imgs.push({thumburl:thumb,url:wd?.originalimage?.source||thumb});
    }

    if(!imgs.length){el.innerHTML='<span style="font-size:.74rem;color:var(--muted)">Aucune image trouvée</span>';return;}

    el.innerHTML=imgs.map((img,j)=>
      `<img src="${img.thumburl}" title="Cliquer pour choisir"
        style="width:64px;height:64px;object-fit:cover;border-radius:8px;cursor:pointer;
          border:2px solid transparent;transition:border-color .15s;"
        onmouseover="this.style.borderColor='#22d3ee'"
        onmouseout="this.style.borderColor='transparent'"
        onclick="pickDIYImg(${idx},'${img.url||img.thumburl}')"
        onerror="this.style.display='none'">`
    ).join('');
  }catch(e){
    el.innerHTML='<span style="font-size:.74rem;color:var(--muted)">Erreur réseau — colle une URL manuellement</span>';
  }
}

function pickDIYImg(idx, url){
  _diyPairs[idx].imgUrl=url;
  renderDIYPairs();
}

function addDIYPair(){
  _diyPairs.push({native:'',target:'',imgUrl:''});
  renderDIYPairs();
}

function saveDIY(){
  const title = ($('diy-title').value||'').trim();
  if(!title){ toast(t('diy_title_required')); return; }
  const pairs = _diyPairs.filter(p=>p.native&&p.target).map(p=>({
    native:p.native.trim(), target:p.target.trim(),
    imgUrl:(p.imgUrl||'').trim()||undefined
  }));
  if(pairs.length<2){ toast(t('diy_min_pairs')); return; }
  if(!U.diyLessons) U.diyLessons=[];
  U.diyLessons.push({title, level:S.level||'A1', pairs, created:Date.now()});
  saveU();
  closeDIY();
  S._activeTopic='diy';
  renderTopicTabs();
  renderChaps();
  toast(`✨ "${title}" `+t('diy_created').replace('{n}',pairs.length));
}
function deleteDIY(idx){
  if(!confirm(t('diy_delete_confirm'))) return;
  U.diyLessons.splice(idx,1);
  saveU(); renderTopicTabs(); renderChaps();
}
function startDIYLesson(d){
  // Inject as temporary chapter and launch game select
  S._diyLesson=d;
  sT('gsel-title', d.title);
  sT('gsel-sub', `${d.pairs.length} paires · Ma leçon`);
  sT('bc-p3','DIY'); sT('bc-l3',d.level||''); sT('bc-c3',d.title);
  goTo('game-select');
}
function goToSel(cid){S._diyLesson=null;S.chap=cid;const cs=CHAPTERS[S.level]||[],ch=cs.find(c=>c.id===cid);const N=LANGS[S.nL],T=LANGS[S.tL];sT('bc-p3',`${N.flag}→${T.flag}`);sT('bc-l3',S.level);sT('bc-c3',ch?.title?.[S.nL]||cid);sT('gsel-title',ch?.title?.[S.nL]||cid);sT('gsel-sub',ch?.subtitle?.[S.nL]||'');goTo('game-select');}

// ══════════════════════════════════════════════
// QR
// ══════════════════════════════════════════════
function openQR(cid){const ch=(CHAPTERS[S.level]||[]).find(c=>c.id===cid)||{};const title=ch.title?.[S.nL]||cid;const N=LANGS[S.nL],T=LANGS[S.tL];const base=location.href.split('?')[0].split('#')[0];const url=`${base}?n=${S.nL}&t=${S.tL}&l=${S.level}&c=${cid}`;sT('qr-sub',`${N.flag} → ${T.flag} · ${S.level} · ${title}`);sT('qr-url',url);const cont=$('qr-container');cont.innerHTML='';try{new QRCode(cont,{text:url,width:180,height:180,colorDark:'#1e1e35',colorLight:'#fff',correctLevel:QRCode.CorrectLevel.M});}catch(e){cont.innerHTML=`<div style="padding:14px;font-size:.74rem;color:var(--muted)">${url}</div>`;}$('qr-modal').style.display='flex';S._shareUrl=url;}
function closeQR(e){if(!e||e.target===$('qr-modal'))$('qr-modal').style.display='none';}

function openFlappyQR(){
  const N=LANGS[S.nL],T=LANGS[S.tL];
  const base=location.href.split('?')[0].split('#')[0].replace('app.html','')+'flappy-game.html';
  const name=encodeURIComponent((U&&U.name)||'Joueur');
  const email=encodeURIComponent((U&&U.email)||'guest');
  const level=S.level||'any';
  const topic=S._activeTopic||'any';
  const url=`${base}?nL=${S.nL}&tL=${S.tL}&name=${name}&email=${email}&level=${level}&topic=${topic}`;
  sT('lbl-qr-title','🐦 FlappyLingo — Rejoins ma partie !');
  sT('qr-sub',`${N.flag} → ${T.flag} · Niveau ${level} · ${topic==='any'?'Tout':topic}`);
  sT('qr-url',url);
  const cont=$('qr-container');
  cont.innerHTML='';
  try{
    new QRCode(cont,{text:url,width:180,height:180,colorDark:'#16a34a',colorLight:'#fff',correctLevel:QRCode.CorrectLevel.M});
  }catch(e){
    cont.innerHTML=`<div style="padding:14px;font-size:.74rem;color:var(--muted);word-break:break-all;">${url}</div>`;
  }
  $('qr-modal').style.display='flex';
  S._shareUrl=url;
}
function copyUrl(){navigator.clipboard?.writeText(S._shareUrl||'').then(()=>{const btn=event.target;btn.textContent='✅ Copié !';setTimeout(()=>btn.textContent='📋 Copier',2000);}).catch(()=>prompt('Lien :',S._shareUrl));}

// ══════════════════════════════════════════════
// LANGUAGE CHANGE MODAL
// ══════════════════════════════════════════════
let _lpNative=null, _lpTarget=null;

function openLangModal(){
  _lpNative=S.nL||null;
  _lpTarget=S.tL||null;
  buildLangPicker();
  $('lang-modal').style.display='flex';
}

function closeLangModal(e){
  if(!e||e.target===$('lang-modal')) $('lang-modal').style.display='none';
}

function buildLangPicker(){
  ['lp-native','lp-target'].forEach((gid,side)=>{
    const g=$(gid); g.innerHTML='';
    Object.entries(LANGS).forEach(([code,l])=>{
      const active=side===0?(code===_lpNative):(code===_lpTarget);
      const d=document.createElement('div');
      d.className='lang-picker-item'+(active?' active':'');
      d.innerHTML=`<span class="lp-flag">${l.flag}</span><span class="lp-name">${l.name}</span>`;
      d.onclick=()=>{
        if(side===0){
          _lpNative=code;
          if(_lpTarget===code) _lpTarget=null;
        } else {
          _lpTarget=code;
          if(_lpNative===code) _lpNative=null;
        }
        buildLangPicker();
        updateLpPair();
      };
      g.appendChild(d);
    });
  });
  updateLpPair();
}

function updateLpPair(){
  const el=$('lp-pair');
  if(_lpNative&&_lpTarget&&_lpNative!==_lpTarget){
    const N=LANGS[_lpNative],T=LANGS[_lpTarget];
    el.innerHTML=`${N.flag} ${N.name} &rarr; ${T.flag} ${T.name}`;
    el.style.color='var(--accent3)';
  } else if(_lpNative===_lpTarget&&_lpNative){
    el.textContent=t('choose_two_langs');
    el.style.color='var(--red)';
  } else {
    el.textContent='';
  }
}

function applyLangChange(){
  if(!_lpNative||!_lpTarget||_lpNative===_lpTarget){
    toast(t('choose_two_langs')+'!');
    return;
  }
  S.nL=_lpNative; S.tL=_lpTarget;
  // Reset level/chapter selection
  S.level=null; S.chap=null;
  // Update native/target grids on learn screen
  clrSel('native-grid'); clrSel('target-grid');
  const nn=document.querySelector('#native-grid [data-code="'+S.nL+'"]');
  const tn=document.querySelector('#target-grid [data-code="'+S.tL+'"]');
  if(nn) nn.classList.add('selected');
  if(tn) tn.classList.add('selected');
  $('target-section').style.opacity='1';
  syncPair(); syncDots();
  $('lang-modal').style.display='none';
  const N=LANGS[S.nL],T=LANGS[S.tL];
  toast(N.flag+' '+N.name+' → '+T.flag+' '+T.name+' sélectionné !');
  navTo('learn');
}

// ══════════════════════════════════════════════
// TARGET / TIME SIMULATOR
// ══════════════════════════════════════════════
function updateTarget(){
  const slider=$('target-slider');
  if(!slider) return;
  const target=parseInt(slider.value);

  // Format target value
  $('target-val').innerHTML=target.toLocaleString()+' <span class="coin"></span>';

  const coins=Math.floor(U?U.coins:0);
  const daily=getDailyDividend();
  const wealth=getTotalWealth();
  const missing=Math.max(0, target-wealth);
  const pct=Math.min(100, Math.round(wealth/target*100));

  // Missing
  const misEl=$('tr-missing');
  if(misEl) misEl.innerHTML=(missing>0?missing.toLocaleString()+' <span class="coin"></span>':'<span style="color:var(--green)">Objectif atteint !</span>');

  // Daily
  const dEl=$('tr-daily');
  if(dEl) dEl.innerHTML=daily>0?daily.toFixed(1)+' <span class="coin"></span>':'<span style="color:var(--muted)">Aucun actif</span>';

  // Time
  const tEl=$('tr-time');
  if(tEl){
    if(missing<=0){
      tEl.innerHTML='<span style="color:var(--green)">&#10003; Atteint !</span>';
    } else if(daily<=0){
      tEl.textContent=t('invest_first');
      tEl.style.color='var(--muted)';
    } else {
      const days=missing/daily;
      if(days<1) tEl.textContent=Math.round(days*24)+'h';
      else if(days<30) tEl.textContent=Math.round(days)+' jours';
      else if(days<365) tEl.textContent=Math.round(days/30.4)+' mois';
      else tEl.textContent=(days/365).toFixed(1)+' ans';
      tEl.style.color='var(--accent3)';
    }
  }

  // Percent
  const pEl=$('tr-pct');
  if(pEl) pEl.textContent=pct+'%';

  // Timeline
  const fill=$('tl-fill');
  const cursor=$('tl-cursor');
  const nowLbl=$('tl-now');
  if(fill) fill.style.width=pct+'%';
  if(cursor){ cursor.style.left=pct+'%'; }
  if(nowLbl){ nowLbl.style.left=pct+'%'; }
}

// updateTarget is now called inside the market data wrapper below


// ══════════════════════════════════════════════
// RANK / LEADERBOARD TABS
// ══════════════════════════════════════════════

// ── Social tab switching ──────────────────────────────────────
function switchSocialTab(tab) {
  const isFriends = tab === 'friends';
  $('social-sub-friends').style.display = isFriends ? '' : 'none';
  $('social-sub-rooms').style.display   = isFriends ? 'none' : '';
  $('social-tab-friends').classList.toggle('active', isFriends);
  $('social-tab-rooms').classList.toggle('active', !isFriends);
  if (!isFriends && typeof loadPracticeRooms === 'function') loadPracticeRooms();
}

function selectRoomTopic(btn) {
  document.querySelectorAll('#room-topic-select .duel-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function switchRankTab(tab) {
  const zones = ['lb','duels','practice','friends','flappy','car','compost'];
  zones.forEach(z => {
    const el = $('rank-'+z+'-zone');
    if (el) el.style.display = z===tab ? '' : 'none';
    const btn = $('rank-tab-'+z);
    if (btn) btn.classList.toggle('active', z===tab);
  });
  if (tab==='lb')       renderLeaderboard();
  if (tab==='duels')    renderDuelsScreen();
  if (tab==='friends')  renderFriendsScreen();
  if (tab==='practice') { if(typeof renderPracticeModes==='function') renderPracticeModes(); }
}

// ══════════════════════════════════════════════
// TROPHIES PREVIEW (profile screen — top 5 earned)
// ══════════════════════════════════════════════
function renderTrophiesPreview() {
  const el = $('trophies-preview');
  const prog = $('trophy-progress');
  if (!el || !U) return;
  const earned = U.trophies || [];
  const total  = typeof TROPHIES !== 'undefined' ? TROPHIES.length : 0;
  const pct    = total ? Math.round(earned.length / total * 100) : 0;

  if (prog) prog.innerHTML = `
    <div style="font-size:.75rem;color:var(--muted);margin-bottom:5px;">${earned.length} / ${total} trophées — ${pct}%</div>
    <div style="background:var(--card2);border-radius:8px;height:7px;overflow:hidden;">
      <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,var(--gold),var(--accent));border-radius:8px;transition:width .6s;"></div>
    </div>`;

  if (!earned.length) { el.innerHTML = '<div style="font-size:.75rem;color:var(--muted);">Joue pour débloquer des trophées 🏆</div>'; return; }

  const recentTrophies = typeof TROPHIES !== 'undefined'
    ? TROPHIES.filter(t => earned.includes(t.id)).slice(-6)
    : [];
  el.innerHTML = recentTrophies.map(t =>
    `<div title="${t.name}: ${t.desc}" style="font-size:1.5rem;cursor:default;">${t.icon}</div>`
  ).join('') + (earned.length > 6 ? `<div style="font-size:.72rem;color:var(--muted);align-self:center;">+${earned.length-6} autres</div>` : '');
}

// ── COMPOST LEVEL/TOPIC SELECTORS ────────────────────────────
let _compostLevel = 'any';
let _compostTopic = 'any';

function selectCompostLevel(btn, lv) {
  _compostLevel = lv;
  document.querySelectorAll('#compost-level-btns .duel-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function selectCompostTopic(btn, topic) {
  _compostTopic = topic;
  document.querySelectorAll('#compost-topic-btns .duel-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function openCompostFromGames() {
  if (typeof openCompostGame === 'function') {
    openCompostGame({ level: _compostLevel, topic: _compostTopic });
  }
}

// ── MINI-GAME LAUNCHER ────────────────────────────────────────
function openGame(type) {
  const nL    = S.nL   || 'fr';
  const tL    = S.tL   || 'en';
  const name  = encodeURIComponent((U&&U.name) || 'Joueur');
  const email = encodeURIComponent((U&&U.email)|| 'guest@local');
  const skin  = encodeURIComponent((U&&U['compostSkin'])||'sprout');
  const fSkin = encodeURIComponent((U&&U['flappySkin'])||'bluebird');
  const cSkin = encodeURIComponent((U&&U['carSkin'])||'red');

  const overlay = document.getElementById('minigame-overlay');
  const iframe  = document.getElementById('minigame-iframe');
  if(!overlay||!iframe) return;

  const src = type==='flappy'
    ? `flappy-game.html?nL=${nL}&tL=${tL}&name=${name}&email=${email}&flappySkin=${fSkin}`
    : `car-game.html?nL=${nL}&tL=${tL}&name=${name}&email=${email}&carSkin=${cSkin}`;

  // Add listener BEFORE setting src so we don't miss getWordData
  window._minigameListener = function(e) {
    if(e.data==='close'||e.data?.type==='close'){closeMiniGame();return;}
    if(!e.data||typeof e.data!=='object') return;
    if(e.data.type==='getWordData') {
      iframe.contentWindow.postMessage({
        type:'wordData',
        words:typeof WD!=='undefined'?WD:{},
        chapters:typeof CHAPTERS!=='undefined'?CHAPTERS:null,
      },'*');
    }
    if(e.data.type==='saveFlappySkin'&&U&&!U.isGuest){U.flappySkin=e.data.skin;saveU();}
    if(e.data.type==='saveCarSkin'&&U&&!U.isGuest){U.carSkin=e.data.skin;saveU();}
    if(e.data.type==='gameResult'&&e.data.won&&U&&!U.isGuest){
      const bonus=e.data.game==='car'?80:60;
      U.coins=(U.coins||0)+bonus; saveU(); updateTopBar();
      if(typeof checkTrophies==='function') checkTrophies();
      toast('🎉 Victoire ! +'+bonus+' 🪙');
    }
  };
  window.addEventListener('message', window._minigameListener);
  // Set src after listener is ready
  iframe.src = src;
  overlay.style.display = 'flex';
}

function closeMiniGame() {
  const overlay=document.getElementById('minigame-overlay');
  const iframe=document.getElementById('minigame-iframe');
  if(overlay) overlay.style.display='none';
  if(iframe) iframe.src='';
  if(window._minigameListener){
    window.removeEventListener('message',window._minigameListener);
    window._minigameListener=null;
  }
}
