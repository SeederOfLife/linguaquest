// ═══════════════════════════════════════════
// UI.JS — Navigation, Rendu, Profil, Boutique
// ═══════════════════════════════════════════


function $(id){ return document.getElementById(id); }


function sT(id,v){const e=$(id);if(e)e.textContent=v;}


function goTo(screenId){// ═══════════════════════════════════════════
// UI.JS — Navigation, Rendu, Profil, Boutique
// ═══════════════════════════════════════════


function $(id){ return document.getElementById(id); }


function sT(id,v){const e=$(id);if(e)e.textContent=v;}


function goTo(screenId){
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  var el = document.getElementById('screen-'+screenId);
  if(el) el.classList.add('active');
  window.scrollTo(0,0);
}


function navTo(tab){
  goTo(tab);
  document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
  var navEl = document.getElementById('nav-'+tab);
  if(navEl) navEl.classList.add('active');
  if(tab==='portfolio') renderPortfolio();
  else if(tab==='shop') renderShop();
  else if(tab==='profile') renderProfile();
  else if(tab==='learn') buildGrids();
}


function showChrome(){
  document.getElementById('top-bar').style.display='flex';
  document.getElementById('nav-bar').style.display='flex';
}


function hideChrome(){
  document.getElementById('top-bar').style.display='none';
  document.getElementById('nav-bar').style.display='none';
}


function afterLogin(){
  showChrome();
  calcDividends();
  updateTopBar();
  navTo('learn');
}


function updateTopBar(){
  if(!U) return;
  if($('tb-coins')) $('tb-coins').textContent = Math.floor(U.coins);
  var ab = $('avatar-btn');
  if(ab){
    ab.textContent = U.name.charAt(0).toUpperCase();
    if(U.owned && U.owned.includes('avatar_diamond'))
      ab.style.background='linear-gradient(135deg,#3b82f6,#06b6d4)';
    else if(U.owned && U.owned.includes('avatar_gold'))
      ab.style.background='linear-gradient(135deg,#d97706,#fbbf24)';
  }
}


function toast(msg){const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),3000);}


function floatCoin(anchor,text){
  const el=document.createElement('div');el.className='float-coin';el.innerHTML=text;
  const rect=anchor?.getBoundingClientRect?anchor.getBoundingClientRect():{top:window.innerHeight/2,left:window.innerWidth/2};
  el.style.cssText=`top:${rect.top}px;left:${rect.left}px;`;
  document.body.appendChild(el);setTimeout(()=>el.remove(),1300);
}


function confetti(){const cols=['#7c3aed','#ec4899','#06b6d4','#f59e0b','#10b981'];for(let i=0;i<55;i++){const el=document.createElement('div');el.className='confetti-piece';const s=5+Math.random()*9;el.style.cssText=`left:${Math.random()*100}%;width:${s}px;height:${s*1.4}px;background:${cols[i%5]};animation-duration:${1.3+Math.random()*1.3}s;animation-delay:${Math.random()*.4}s;border-radius:${Math.random()>.5?'50%':'3px'};`;document.body.appendChild(el);setTimeout(()=>el.remove(),3200);}}


function mkStars(){
  const c=$('stars');
  for(let i=0;i<160;i++){
    const s=document.createElement('div');
    s.className='star';
    const z=Math.random()*2.4+.4;
    s.style.cssText=`width:${z}px;height:${z}px;top:${Math.random()*100}%;left:${Math.random()*100}%;--d:${2+Math.random()*4}s;--o:${.06+Math.random()*.5};`;
    c.appendChild(s);
  }
}


function readParams(){
  const p=new URLSearchParams(location.search);
  const n=p.get('n'),t=p.get('t'),l=p.get('l'),c=p.get('c');
  if(n&&t&&l&&c&&LANGS[n]&&LANGS[t]&&n!==t&&CHAPTERS[l]){
    S.nL=n;S.tL=t;S.level=l;S.chap=c;
  }
}


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


function goToLevels(){if(!S.nL||!S.tL)return;const N=LANGS[S.nL],T=LANGS[S.tL],pair=`${N.flag} → ${T.flag} ${T.name}`;sT('bc-pair',pair);sT('bc-pair2',pair);sT('levels-title',`${T.flag} ${T.name} — Niveaux`);renderLevels();goTo('levels');}


function renderLevels(){
  const g=$('levels-grid');g.innerHTML='';
  LEVELS.forEach((lv,i)=>{
    const has=!!CHAPTERS[lv.id],prevOk=i===0||lvDone(LEVELS[i-1].id),locked=!has||(!prevOk&&i>0),done=lvDone(lv.id),stars=lvStars(lv.id);
    const d=document.createElement('div');d.className=`level-card ${lv.id} ${locked?'locked':done?'completed':'available'}`;
    d.innerHTML=`${locked?'<span style="position:absolute;top:9px;right:9px;">🔒</span>':''}<span class="level-badge">${lv.id}</span><div class="level-title">${lv.label.split('—')[1].trim()}</div><div class="level-desc">${lv.desc}</div><div class="level-stars">${stHTML(stars)}</div>`;
    if(!locked) d.onclick=()=>goToChaps(lv.id);
    g.appendChild(d);
  });
}


function lvDone(id){const cs=CHAPTERS[id]||[];return cs.length>0&&cs.every(c=>U?.progress[pk(c.id)]?.completed);}


function lvStars(id){const cs=CHAPTERS[id]||[];if(!cs.length)return 0;return Math.round(cs.reduce((a,c)=>a+(U?.progress[pk(c.id)]?.stars||0),0)/cs.length);}


function pk(cid){return`${S.nL}-${S.tL}-${cid}`;}


function stHTML(n){return[0,1,2].map(i=>`<span style="color:${i<n?'var(--accent4)':'rgba(255,255,255,.1)'}">★</span>`).join('');}


function goToChaps(lvId){S.level=lvId;const T=LANGS[S.tL],lv=LEVELS.find(l=>l.id===lvId);sT('bc-level2',lvId);sT('chapters-title',`${T.flag} ${lvId} — Chapitres`);sT('chapters-sub',lv.desc);renderChaps();goTo('chapters');}


function renderChaps(){
  const list=$('chapters-list');list.innerHTML='';
  const cs=CHAPTERS[S.level]||[];
  cs.forEach((ch,i)=>{
    const p=U?.progress[pk(ch.id)],done=p?.completed,locked=i>0&&!U?.progress[pk(cs[i-1].id)]?.completed;
    const title=ch.title[S.nL]||ch.title.fr,sub=ch.subtitle[S.nL]||ch.subtitle.fr;
    const d=document.createElement('div');d.className=`chapter-item ${locked?'locked':done?'done':'available'}`;
    d.innerHTML=`<div class="chapter-num">${locked?'🔒':done?'✓':(i+1)}</div>
      <div style="flex:1"><div style="font-weight:800;margin-bottom:2px;font-size:.92rem;">${title}</div><div style="font-size:.74rem;color:var(--muted);">${sub}</div><div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;"><span class="game-chip">🎲 Mixte</span><span class="game-chip">⚡ Quiz</span><span class="game-chip">✏️ Fill</span><span class="game-chip">🔗 Match</span></div></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
        <div>${stHTML(p?.stars||0)}</div>
        ${!locked?`<button class="btn-qr" onclick="event.stopPropagation();openQR('${ch.id}')">📱 QR</button>`:''}
      </div>`;
    if(!locked) d.onclick=()=>goToSel(ch.id);
    list.appendChild(d);
  });
  if(!cs.length) list.innerHTML='<div style="color:var(--muted);text-align:center;padding:36px;">Contenu à venir… 🚧</div>';
}


function goToSel(cid){S.chap=cid;const cs=CHAPTERS[S.level]||[],ch=cs.find(c=>c.id===cid);const N=LANGS[S.nL],T=LANGS[S.tL];sT('bc-p3',`${N.flag}→${T.flag}`);sT('bc-l3',S.level);sT('bc-c3',ch?.title?.[S.nL]||cid);sT('gsel-title',ch?.title?.[S.nL]||cid);sT('gsel-sub',ch?.subtitle?.[S.nL]||'');goTo('game-select');}


function openQR(cid){
  const ch=(CHAPTERS[S.level]||[]).find(x=>x.id===cid)||{};
  const title=ch.title?.[S.nL]||cid;
  const N=LANGS[S.nL]||{flag:'',name:''};
  const T=LANGS[S.tL]||{flag:'',name:''};
  const base=location.origin+location.pathname;
  const url=base+'?n='+S.nL+'&t='+S.tL+'&l='+S.level+'&c='+cid;
  const qrUrl='https://api.qrserver.com/v1/create-qr-code/?size=220x220&color=f59e0b&bgcolor=0a0a14&margin=12&data='+encodeURIComponent(url);
  if(document.getElementById('qr-title')) sT('qr-title', title);
  if(document.getElementById('qr-sub')) sT('qr-sub', N.flag+' '+N.name+' → '+T.flag+' '+T.name);
  const imgEl=document.getElementById('qr-img');
  if(imgEl){
    imgEl.innerHTML='<img src="'+qrUrl+'" width="220" height="220" style="border-radius:12px;" onerror="this.parentNode.style.padding=\'20px\';this.parentNode.textContent=this.src">';
  }
  const linkEl=document.getElementById('qr-link');
  if(linkEl){linkEl.textContent=url;linkEl.href=url;}
  const modal=document.getElementById('qr-modal');
  if(modal) modal.style.display='flex';
}


function closeQR(e){
  if(!e || e.target===e.currentTarget || e.currentTarget.id==='qr-modal'){
    $('qr-modal').style.display='none';
  }
}


function copyUrl(){
  const url = S._shareUrl || location.href;
  navigator.clipboard.writeText(url).then(()=>toast('Lien copié !')).catch(()=>toast(url));
}


function wt(id,lang){return WD[id]?.[lang]||id;}


function getCh(){return(CHAPTERS[S.level]||[]).find(c=>c.id===S.chap);}


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
    el.textContent='Choisis deux langues différentes';
    el.style.color='var(--red)';
  } else {
    el.textContent='';
  }
}


function applyLangChange(){
  if(!_lpNative||!_lpTarget||_lpNative===_lpTarget){
    toast('Choisis deux langues différentes !');
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
      tEl.textContent="Investis d'abord";
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


function renderShop(){
  if(!U) return;
  $('shop-coins').textContent=Math.floor(U.coins);
  const grid=$('shop-grid');grid.innerHTML='';
  SHOP_ITEMS.forEach(item=>{
    const owned=U.owned.includes(item.id);
    const canBuy=!owned&&U.coins>=item.price;
    const div=document.createElement('div');
    div.className='shop-item'+(owned?' owned':'');
    div.innerHTML=`
      ${owned?'<div class="owned-badge">✓ Possédé</div>':''}
      <div class="shop-icon">${item.icon}</div>
      <div class="shop-name">${item.name}</div>
      <div class="shop-desc">${item.desc}</div>
      <div class="shop-price">${item.price>0?`<span class="coin"></span> ${item.price}`:'🎁 Gratuit'}</div>
      <button class="btn btn-sm ${owned?'btn-secondary':'btn-primary'}" style="margin-top:10px;width:100%;justify-content:center;" onclick="buyShop('${item.id}')" ${owned||(!canBuy&&item.price>0)?'disabled':''}>
        ${owned?'Possédé ✓':item.price===0?'Réclamer':'Acheter'}
      </button>
    `;
    grid.appendChild(div);
  });
}


function buyShop(id){
  const item=SHOP_ITEMS.find(x=>x.id===id);
  if(!item||U.owned.includes(id)) return;
  if(item.price>0&&U.coins<item.price){toast('❌ Pas assez de pièces !');return;}
  U.coins-=item.price;
  U.owned.push(id);
  saveU();updateTopBar();renderShop();
  toast(`${item.icon} ${item.name} acheté !`);
}


function renderProfile(){
  if(!U) return;
  $('prof-name').textContent=U.name;
  $('prof-email').textContent=U.email;
  $('prof-joined').textContent='Membre depuis '+new Date(U.joined).toLocaleDateString('fr');
  $('prof-avatar').textContent=U.name.charAt(0).toUpperCase();
  if(U.owned.includes('avatar_diamond')) $('prof-avatar').style.background='linear-gradient(135deg,#3b82f6,#06b6d4)';
  else if(U.owned.includes('avatar_gold')) $('prof-avatar').style.background='linear-gradient(135deg,#d97706,#fbbf24)';
  $('ps-xp').textContent=U.xp||0;
  $('ps-coins').textContent=Math.floor(U.coins);
  $('ps-sessions').textContent=U.sessions||0;
  $('ps-streak').textContent=U.streak||0;
  $('ps-chapters').textContent=U.chaptersCompleted||0;
  $('ps-wealth').textContent=getTotalWealth();

  // Sync theme buttons + UI lang grid
  var _saved = localStorage.getItem('lq_theme') || 'dark';
  ['light','dark','claude','auto'].forEach(function(m){
    var b = document.getElementById('theme-btn-'+m);
    if(b) b.classList.toggle('active', m===_saved);
  });
  renderUILangGrid();
}


function renderUILangGrid(){
  var grid = document.getElementById('ui-lang-grid');
  if(!grid) return;
  grid.innerHTML = '';
  // Hardcoded to avoid LANGS dependency order issues
  var uiLangs = [
    {code:'fr', flag:'🇫🇷', name:'Français'},
    {code:'en', flag:'🇬🇧', name:'English'},
    {code:'es', flag:'🇪🇸', name:'Español'},
    {code:'de', flag:'🇩🇪', name:'Deutsch'},
    {code:'cs', flag:'🇨🇿', name:'Čeština'}
  ];
  uiLangs.forEach(function(l){
    var btn = document.createElement('button');
    btn.className = 'theme-btn' + (l.code===_uiLang?' active':'');
    btn.style.cssText = 'flex:0 0 auto;padding:8px 16px;font-size:.88rem;';
    btn.innerHTML = l.flag + ' ' + l.name;
    btn.onclick = function(){ setUILang(l.code); renderUILangGrid(); };
    grid.appendChild(btn);
  });
}


function dirLbl(){const N=LANGS[S.nL],T=LANGS[S.tL];return`${N.flag} ${N.native}  →  ${T.flag} ${T.native}`;}


function shuf(a){return[...a].sort(()=>Math.random()-.5);}


  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  var el = document.getElementById('screen-'+screenId);
  if(el) el.classList.add('active');
  window.scrollTo(0,0);
}


function navTo(tab){
  goTo(tab);
  document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
  var navEl = document.getElementById('nav-'+tab);
  if(navEl) navEl.classList.add('active');
  if(tab==='portfolio') renderPortfolio();
  else if(tab==='shop') renderShop();
  else if(tab==='profile') renderProfile();
  else if(tab==='learn') buildGrids();
}


function showChrome(){
  document.getElementById('top-bar').style.display='flex';
  document.getElementById('nav-bar').style.display='flex';
}


function hideChrome(){
  document.getElementById('top-bar').style.display='none';
  document.getElementById('nav-bar').style.display='none';
}


function afterLogin(){
  showChrome();
  calcDividends();
  updateTopBar();
  navTo('learn');
}


function updateTopBar(){
  if(!U) return;
  if($('tb-coins')) $('tb-coins').textContent = Math.floor(U.coins);
  var ab = $('avatar-btn');
  if(ab){
    ab.textContent = U.name.charAt(0).toUpperCase();
    if(U.owned && U.owned.includes('avatar_diamond'))
      ab.style.background='linear-gradient(135deg,#3b82f6,#06b6d4)';
    else if(U.owned && U.owned.includes('avatar_gold'))
      ab.style.background='linear-gradient(135deg,#d97706,#fbbf24)';
  }
}


function toast(msg){const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),3000);}


function floatCoin(anchor,text){
  const el=document.createElement('div');el.className='float-coin';el.innerHTML=text;
  const rect=anchor?.getBoundingClientRect?anchor.getBoundingClientRect():{top:window.innerHeight/2,left:window.innerWidth/2};
  el.style.cssText=`top:${rect.top}px;left:${rect.left}px;`;
  document.body.appendChild(el);setTimeout(()=>el.remove(),1300);
}


function confetti(){const cols=['#7c3aed','#ec4899','#06b6d4','#f59e0b','#10b981'];for(let i=0;i<55;i++){const el=document.createElement('div');el.className='confetti-piece';const s=5+Math.random()*9;el.style.cssText=`left:${Math.random()*100}%;width:${s}px;height:${s*1.4}px;background:${cols[i%5]};animation-duration:${1.3+Math.random()*1.3}s;animation-delay:${Math.random()*.4}s;border-radius:${Math.random()>.5?'50%':'3px'};`;document.body.appendChild(el);setTimeout(()=>el.remove(),3200);}}


function mkStars(){
  const c=$('stars');
  for(let i=0;i<160;i++){
    const s=document.createElement('div');
    s.className='star';
    const z=Math.random()*2.4+.4;
    s.style.cssText=`width:${z}px;height:${z}px;top:${Math.random()*100}%;left:${Math.random()*100}%;--d:${2+Math.random()*4}s;--o:${.06+Math.random()*.5};`;
    c.appendChild(s);
  }
}


function readParams(){
  const p=new URLSearchParams(location.search);
  const n=p.get('n'),t=p.get('t'),l=p.get('l'),c=p.get('c');
  if(n&&t&&l&&c&&LANGS[n]&&LANGS[t]&&n!==t&&CHAPTERS[l]){
    S.nL=n;S.tL=t;S.level=l;S.chap=c;
  }
}


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


function goToLevels(){if(!S.nL||!S.tL)return;const N=LANGS[S.nL],T=LANGS[S.tL],pair=`${N.flag} → ${T.flag} ${T.name}`;sT('bc-pair',pair);sT('bc-pair2',pair);sT('levels-title',`${T.flag} ${T.name} — Niveaux`);renderLevels();goTo('levels');}


function renderLevels(){
  const g=$('levels-grid');g.innerHTML='';
  LEVELS.forEach((lv,i)=>{
    const has=!!CHAPTERS[lv.id],prevOk=i===0||lvDone(LEVELS[i-1].id),locked=!has||(!prevOk&&i>0),done=lvDone(lv.id),stars=lvStars(lv.id);
    const d=document.createElement('div');d.className=`level-card ${lv.id} ${locked?'locked':done?'completed':'available'}`;
    d.innerHTML=`${locked?'<span style="position:absolute;top:9px;right:9px;">🔒</span>':''}<span class="level-badge">${lv.id}</span><div class="level-title">${lv.label.split('—')[1].trim()}</div><div class="level-desc">${lv.desc}</div><div class="level-stars">${stHTML(stars)}</div>`;
    if(!locked) d.onclick=()=>goToChaps(lv.id);
    g.appendChild(d);
  });
}


function lvDone(id){const cs=CHAPTERS[id]||[];return cs.length>0&&cs.every(c=>U?.progress[pk(c.id)]?.completed);}


function lvStars(id){const cs=CHAPTERS[id]||[];if(!cs.length)return 0;return Math.round(cs.reduce((a,c)=>a+(U?.progress[pk(c.id)]?.stars||0),0)/cs.length);}


function pk(cid){return`${S.nL}-${S.tL}-${cid}`;}


function stHTML(n){return[0,1,2].map(i=>`<span style="color:${i<n?'var(--accent4)':'rgba(255,255,255,.1)'}">★</span>`).join('');}


function goToChaps(lvId){S.level=lvId;const T=LANGS[S.tL],lv=LEVELS.find(l=>l.id===lvId);sT('bc-level2',lvId);sT('chapters-title',`${T.flag} ${lvId} — Chapitres`);sT('chapters-sub',lv.desc);renderChaps();goTo('chapters');}


function renderChaps(){
  const list=$('chapters-list');list.innerHTML='';
  const cs=CHAPTERS[S.level]||[];
  cs.forEach((ch,i)=>{
    const p=U?.progress[pk(ch.id)],done=p?.completed,locked=i>0&&!U?.progress[pk(cs[i-1].id)]?.completed;
    const title=ch.title[S.nL]||ch.title.fr,sub=ch.subtitle[S.nL]||ch.subtitle.fr;
    const d=document.createElement('div');d.className=`chapter-item ${locked?'locked':done?'done':'available'}`;
    d.innerHTML=`<div class="chapter-num">${locked?'🔒':done?'✓':(i+1)}</div>
      <div style="flex:1"><div style="font-weight:800;margin-bottom:2px;font-size:.92rem;">${title}</div><div style="font-size:.74rem;color:var(--muted);">${sub}</div><div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;"><span class="game-chip">🎲 Mixte</span><span class="game-chip">⚡ Quiz</span><span class="game-chip">✏️ Fill</span><span class="game-chip">🔗 Match</span></div></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
        <div>${stHTML(p?.stars||0)}</div>
        ${!locked?`<button class="btn-qr" onclick="event.stopPropagation();openQR('${ch.id}')">📱 QR</button>`:''}
      </div>`;
    if(!locked) d.onclick=()=>goToSel(ch.id);
    list.appendChild(d);
  });
  if(!cs.length) list.innerHTML='<div style="color:var(--muted);text-align:center;padding:36px;">Contenu à venir… 🚧</div>';
}


function goToSel(cid){S.chap=cid;const cs=CHAPTERS[S.level]||[],ch=cs.find(c=>c.id===cid);const N=LANGS[S.nL],T=LANGS[S.tL];sT('bc-p3',`${N.flag}→${T.flag}`);sT('bc-l3',S.level);sT('bc-c3',ch?.title?.[S.nL]||cid);sT('gsel-title',ch?.title?.[S.nL]||cid);sT('gsel-sub',ch?.subtitle?.[S.nL]||'');goTo('game-select');}


function openQR(cid){
  const ch=(CHAPTERS[S.level]||[]).find(x=>x.id===cid)||{};
  const title=ch.title?.[S.nL]||cid;
  const N=LANGS[S.nL]||{flag:'',name:''};
  const T=LANGS[S.tL]||{flag:'',name:''};
  const base=location.origin+location.pathname;
  const url=base+'?n='+S.nL+'&t='+S.tL+'&l='+S.level+'&c='+cid;
  const qrUrl='https://api.qrserver.com/v1/create-qr-code/?size=220x220&color=f59e0b&bgcolor=0a0a14&margin=12&data='+encodeURIComponent(url);
  if(document.getElementById('qr-title')) sT('qr-title', title);
  if(document.getElementById('qr-sub')) sT('qr-sub', N.flag+' '+N.name+' → '+T.flag+' '+T.name);
  const imgEl=document.getElementById('qr-img');
  if(imgEl){
    imgEl.innerHTML='<img src="'+qrUrl+'" width="220" height="220" style="border-radius:12px;" onerror="this.parentNode.innerHTML='<div style=padding:20px;word-break:break-all;font-size:.7rem>'+url+'</div>'">';
  }
  const linkEl=document.getElementById('qr-link');
  if(linkEl){linkEl.textContent=url;linkEl.href=url;}
  const modal=document.getElementById('qr-modal');
  if(modal) modal.style.display='flex';
}


function closeQR(e){
  if(!e || e.target===e.currentTarget || e.currentTarget.id==='qr-modal'){
    $('qr-modal').style.display='none';
  }
}


function copyUrl(){
  const url = S._shareUrl || location.href;
  navigator.clipboard.writeText(url).then(()=>toast('Lien copié !')).catch(()=>toast(url));
}


function wt(id,lang){return WD[id]?.[lang]||id;}


function getCh(){return(CHAPTERS[S.level]||[]).find(c=>c.id===S.chap);}


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
    el.textContent='Choisis deux langues différentes';
    el.style.color='var(--red)';
  } else {
    el.textContent='';
  }
}


function applyLangChange(){
  if(!_lpNative||!_lpTarget||_lpNative===_lpTarget){
    toast('Choisis deux langues différentes !');
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
      tEl.textContent="Investis d'abord";
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


function renderShop(){
  if(!U) return;
  $('shop-coins').textContent=Math.floor(U.coins);
  const grid=$('shop-grid');grid.innerHTML='';
  SHOP_ITEMS.forEach(item=>{
    const owned=U.owned.includes(item.id);
    const canBuy=!owned&&U.coins>=item.price;
    const div=document.createElement('div');
    div.className='shop-item'+(owned?' owned':'');
    div.innerHTML=`
      ${owned?'<div class="owned-badge">✓ Possédé</div>':''}
      <div class="shop-icon">${item.icon}</div>
      <div class="shop-name">${item.name}</div>
      <div class="shop-desc">${item.desc}</div>
      <div class="shop-price">${item.price>0?`<span class="coin"></span> ${item.price}`:'🎁 Gratuit'}</div>
      <button class="btn btn-sm ${owned?'btn-secondary':'btn-primary'}" style="margin-top:10px;width:100%;justify-content:center;" onclick="buyShop('${item.id}')" ${owned||(!canBuy&&item.price>0)?'disabled':''}>
        ${owned?'Possédé ✓':item.price===0?'Réclamer':'Acheter'}
      </button>
    `;
    grid.appendChild(div);
  });
}


function buyShop(id){
  const item=SHOP_ITEMS.find(x=>x.id===id);
  if(!item||U.owned.includes(id)) return;
  if(item.price>0&&U.coins<item.price){toast('❌ Pas assez de pièces !');return;}
  U.coins-=item.price;
  U.owned.push(id);
  saveU();updateTopBar();renderShop();
  toast(`${item.icon} ${item.name} acheté !`);
}


function renderProfile(){
  if(!U) return;
  $('prof-name').textContent=U.name;
  $('prof-email').textContent=U.email;
  $('prof-joined').textContent='Membre depuis '+new Date(U.joined).toLocaleDateString('fr');
  $('prof-avatar').textContent=U.name.charAt(0).toUpperCase();
  if(U.owned.includes('avatar_diamond')) $('prof-avatar').style.background='linear-gradient(135deg,#3b82f6,#06b6d4)';
  else if(U.owned.includes('avatar_gold')) $('prof-avatar').style.background='linear-gradient(135deg,#d97706,#fbbf24)';
  $('ps-xp').textContent=U.xp||0;
  $('ps-coins').textContent=Math.floor(U.coins);
  $('ps-sessions').textContent=U.sessions||0;
  $('ps-streak').textContent=U.streak||0;
  $('ps-chapters').textContent=U.chaptersCompleted||0;
  $('ps-wealth').textContent=getTotalWealth();

  // Sync theme buttons + UI lang grid
  var _saved = localStorage.getItem('lq_theme') || 'dark';
  ['light','dark','claude','auto'].forEach(function(m){
    var b = document.getElementById('theme-btn-'+m);
    if(b) b.classList.toggle('active', m===_saved);
  });
  renderUILangGrid();
}


function renderUILangGrid(){
  var grid = document.getElementById('ui-lang-grid');
  if(!grid) return;
  grid.innerHTML = '';
  // Hardcoded to avoid LANGS dependency order issues
  var uiLangs = [
    {code:'fr', flag:'🇫🇷', name:'Français'},
    {code:'en', flag:'🇬🇧', name:'English'},
    {code:'es', flag:'🇪🇸', name:'Español'},
    {code:'de', flag:'🇩🇪', name:'Deutsch'},
    {code:'cs', flag:'🇨🇿', name:'Čeština'}
  ];
  uiLangs.forEach(function(l){
    var btn = document.createElement('button');
    btn.className = 'theme-btn' + (l.code===_uiLang?' active':'');
    btn.style.cssText = 'flex:0 0 auto;padding:8px 16px;font-size:.88rem;';
    btn.innerHTML = l.flag + ' ' + l.name;
    btn.onclick = function(){ setUILang(l.code); renderUILangGrid(); };
    grid.appendChild(btn);
  });
}


function dirLbl(){const N=LANGS[S.nL],T=LANGS[S.tL];return`${N.flag} ${N.native}  →  ${T.flag} ${T.native}`;}


function shuf(a){return[...a].sort(()=>Math.random()-.5);}

