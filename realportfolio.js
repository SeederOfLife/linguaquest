<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>FlappyLingo</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:100%;height:100%;overflow:hidden;background:#0a0a18;
  font-family:'Nunito',system-ui,sans-serif;color:#f1f5f9;display:flex;
  align-items:center;justify-content:center;}
/* Game container - fixed max size */
#game-wrap{position:relative;width:min(480px,100vw);height:min(680px,100vh);
  flex-shrink:0;overflow:hidden;border-radius:0;box-shadow:0 0 60px rgba(124,58,237,.25);}
@media(min-width:520px){#game-wrap{border-radius:18px;}}

/* The whole page is one game canvas */
#game-canvas{position:absolute;inset:0;display:block;width:100%;height:100%;}

/* Overlay screens sit on top */
.scr{display:none;position:absolute;inset:0;flex-direction:column;align-items:center;
  justify-content:center;gap:10px;padding:24px;text-align:center;
  background:rgba(6,6,20,.93);z-index:20;}
.scr.on{display:flex;}

/* HUD */
#hud{display:none;position:absolute;top:0;left:0;right:0;z-index:15;
  background:rgba(0,0,0,.55);backdrop-filter:blur(6px);
  padding:8px 16px;align-items:center;justify-content:space-between;}
.hud-on{display:flex!important;}

/* Buttons */
.btn{padding:12px 26px;border:none;border-radius:14px;font-family:inherit;
  font-weight:900;font-size:1rem;cursor:pointer;transition:transform .12s;
  width:100%;max-width:280px;}
.btn:active{transform:scale(.97);}
.btn-green{background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;}
.btn-primary{background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;}
.btn-gray{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);color:#f1f5f9;}

/* Skin picker */
.skin-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:12px;}
.skin-btn{background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.15);
  border-radius:12px;padding:8px;cursor:pointer;font-size:.72rem;font-weight:800;
  transition:all .15s;min-width:62px;text-align:center;}
.skin-btn:hover{border-color:rgba(255,255,255,.4);}
.skin-btn.sel{border-color:#7c3aed;background:rgba(124,58,237,.25);
  box-shadow:0 0 0 2px rgba(124,58,237,.5);}
.skin-emoji{font-size:1.6rem;display:block;margin-bottom:3px;}

/* Filter buttons */
.filter-row{display:flex;gap:5px;flex-wrap:wrap;justify-content:center;margin-bottom:6px;}
.fb{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);
  border-radius:8px;padding:5px 10px;cursor:pointer;font-family:inherit;
  font-weight:800;font-size:.72rem;color:#94a3b8;transition:all .15s;}
.fb.on{background:rgba(34,211,238,.2);border-color:#22d3ee;color:#22d3ee;}

/* Result */
.big-score{font-size:3rem;font-weight:900;color:#fbbf24;margin:6px 0;}
.word-log{width:100%;max-width:300px;background:rgba(255,255,255,.05);
  border-radius:12px;padding:10px;margin:8px 0;max-height:140px;overflow-y:auto;}
.log-row{display:flex;justify-content:space-between;font-size:.76rem;
  padding:3px 0;border-bottom:1px solid rgba(255,255,255,.06);}
.ok{color:#22c55e;}.ko{color:#ef4444;}
</style>
</head>
<body>

<div id="game-wrap">
<canvas id="game-canvas"></canvas>

<!-- HUD -->
<div id="hud">
  <span id="score-disp" style="font-weight:900;">⭐ 0</span>
  <span id="q-disp" style="font-size:.85rem;font-weight:900;color:#c4b5fd;"></span>
  <button onclick="quitToLobby()" style="background:rgba(255,255,255,.1);border:none;
    color:#fff;border-radius:8px;padding:5px 12px;font-family:inherit;
    font-weight:800;cursor:pointer;font-size:.78rem;">✕</button>
</div>

<!-- START SCREEN -->
<div class="scr on" id="start-scr">
  <div style="font-size:1.8rem;font-weight:900;margin-bottom:4px;">🐦 FlappyLingo</div>
  <div style="color:#94a3b8;font-size:.82rem;margin-bottom:14px;">Vole vers la bonne traduction !</div>

  <div style="font-size:.7rem;color:#64748b;font-weight:800;text-transform:uppercase;
    letter-spacing:1px;margin-bottom:6px;">Oiseau</div>
  <div class="skin-row" id="skin-row"></div>

  <div style="font-size:.7rem;color:#64748b;font-weight:800;text-transform:uppercase;
    letter-spacing:1px;margin-bottom:5px;">Niveau</div>
  <div class="filter-row" id="level-row"></div>

  <div style="font-size:.7rem;color:#64748b;font-weight:800;text-transform:uppercase;
    letter-spacing:1px;margin:5px 0;">Thème</div>
  <div class="filter-row" id="topic-row"></div>

  <button class="btn btn-green" onclick="startGame()" style="margin-top:14px;">▶ Jouer</button>
  <button class="btn btn-gray" style="margin-top:6px;"
    onclick="window.parent.postMessage('close','*')">← Retour</button>
</div>

<!-- RESULT SCREEN -->
<div class="scr" id="result-scr">
  <div style="font-size:3rem;" id="res-medal">🏆</div>
  <div style="font-size:1.6rem;font-weight:900;" id="res-title">Super !</div>
  <div class="big-score" id="res-pts">0 pts</div>
  <div class="word-log" id="word-log"></div>
  <button class="btn btn-primary" onclick="backToLobby()">🔄 Rejouer</button>
  <button class="btn btn-gray" id="btn-study-chap" style="margin-top:6px;display:none;"
    onclick="goStudyChapter()">📚 Réviser le chapitre →</button>
  <button class="btn btn-gray" style="margin-top:6px;"
    onclick="window.parent.postMessage('close','*')">← Menu</button>
</div>


</div><!-- /game-wrap -->

<script>
// ── WORD DATA ─────────────────────────────────────────────────
const _P=new URLSearchParams(location.search);
const nL=_P.get('nL')||'fr', tL=_P.get('tL')||'en';
const pName=decodeURIComponent(_P.get('name')||'Joueur');
const _chapId=decodeURIComponent(_P.get('chapId')||'');
const _chapLevel=decodeURIComponent(_P.get('level')||'');
let WD={}, CHAPTERS=null;
let _flappyLevel=_chapLevel||'any', _flappyTopic='any';
let _currentChapId=_chapId||null;

window.addEventListener('message',e=>{
  if(e.data?.type==='wordData'){
    WD=e.data.words||{};
    CHAPTERS=e.data.chapters||null;
    if(e.data.currentChap) _currentChapId=e.data.currentChap;
    if(e.data.currentLevel&&_chapLevel==='') _flappyLevel=e.data.currentLevel;
    // If launched from a specific chapter, show its study button
    if(_currentChapId){
      const btn=document.getElementById('btn-study-chap');
      if(btn) btn.style.display='';
    }
    renderFilters();
  }
});
window.parent.postMessage({type:'getWordData'},'*');

function goStudyChapter(){
  window.parent.postMessage({type:'goStudyChapter',chapId:_currentChapId||''},'*');
}

const FALLBACK={
  hello:{fr:'Bonjour',en:'Hello',es:'Hola',de:'Hallo',cs:'Ahoj'},
  dog:{fr:'Chien',en:'Dog',es:'Perro',de:'Hund',cs:'Pes'},
  cat:{fr:'Chat',en:'Cat',es:'Gato',de:'Katze',cs:'Kočka'},
  water:{fr:'Eau',en:'Water',es:'Agua',de:'Wasser',cs:'Voda'},
  house:{fr:'Maison',en:'House',es:'Casa',de:'Haus',cs:'Dům'},
  love:{fr:'Amour',en:'Love',es:'Amor',de:'Liebe',cs:'Láska'},
  book:{fr:'Livre',en:'Book',es:'Libro',de:'Buch',cs:'Kniha'},
  red:{fr:'Rouge',en:'Red',es:'Rojo',de:'Rot',cs:'Červená'},
  blue:{fr:'Bleu',en:'Blue',es:'Azul',de:'Blau',cs:'Modrá'},
  sun:{fr:'Soleil',en:'Sun',es:'Sol',de:'Sonne',cs:'Slunce'},
  music:{fr:'Musique',en:'Music',es:'Música',de:'Musik',cs:'Hudba'},
  friend:{fr:'Ami',en:'Friend',es:'Amigo',de:'Freund',cs:'Přítel'},
};

function getWords(){
  const src=Object.keys(WD).length>5?WD:FALLBACK;
  let allowed=null;

  // Priority 1: specific chapter (launched from exercise)
  if(CHAPTERS&&_currentChapId){
    const ids=new Set();
    Object.values(CHAPTERS).forEach(chs=>{
      const ch=chs.find(c=>c.id===_currentChapId);
      if(ch)(ch.wids||[]).forEach(id=>ids.add(id));
    });
    if(ids.size>=4)allowed=ids;
  }

  // Priority 2: level + topic filter from buttons
  if(!allowed&&CHAPTERS&&(_flappyLevel!=='any'||_flappyTopic!=='any')){
    const ids=new Set();
    Object.entries(CHAPTERS).forEach(([lv,chs])=>{
      if(_flappyLevel!=='any'&&lv!==_flappyLevel)return;
      chs.forEach(ch=>{
        if(_flappyTopic!=='any'&&ch.topic!==_flappyTopic)return;
        (ch.wids||[]).forEach(id=>ids.add(id));
      });
    });
    if(ids.size>=5)allowed=ids;
  }

  return Object.entries(src)
    .filter(([id,w])=>w[nL]&&w[tL]&&(!allowed||allowed.has(id)))
    .map(([id,w])=>({id,native:w[nL],target:w[tL]}));
}

// ── SPEECH ─────────────────────────────────────────────────────
const LANG_CODES={fr:'fr-FR',en:'en-GB',es:'es-ES',de:'de-DE',cs:'cs-CZ'};
function speak(text,lang){
  try{
    if(!text||!window.speechSynthesis)return;
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.lang=LANG_CODES[lang]||'en-GB';u.rate=0.85;
    const v=window.speechSynthesis.getVoices()
      .find(x=>x.lang.toLowerCase().startsWith(u.lang.split('-')[0]));
    if(v)u.voice=v;
    window.speechSynthesis.speak(u);
  }catch(e){}
}

// ── SKINS ─────────────────────────────────────────────────────
const SKINS=[
  {id:'blue',   e:'🐦', name:'Blue',    col:'#3b82f6',wing:'#1d4ed8',beak:'#fbbf24'},
  {id:'parrot', e:'🦜', name:'Parrot',  col:'#22c55e',wing:'#16a34a',beak:'#f97316'},
  {id:'owl',    e:'🦉', name:'Hibou',   col:'#8b5cf6',wing:'#6d28d9',beak:'#fbbf24'},
  {id:'chick',  e:'🐥', name:'Poussin', col:'#fbbf24',wing:'#f59e0b',beak:'#f97316'},
  {id:'fire',   e:'🔥', name:'Phoenix', col:'#f97316',wing:'#dc2626',beak:'#fcd34d'},
  {id:'penguin',e:'🐧', name:'Pingouin',col:'#94a3b8',wing:'#475569',beak:'#f97316'},
];
let mySkin=SKINS[0];
const savedSkin=_P.get('flappySkin');
if(savedSkin){const s=SKINS.find(x=>x.id===savedSkin);if(s)mySkin=s;}

function renderSkins(){
  document.getElementById('skin-row').innerHTML=SKINS.map(s=>
    `<div class="skin-btn${s.id===mySkin.id?' sel':''}" onclick="event.stopPropagation();pickSkin('${s.id}')">
      <span class="skin-emoji">${s.e}</span>${s.name}
    </div>`).join('');
}
function pickSkin(id){
  mySkin=SKINS.find(s=>s.id===id)||SKINS[0];
  window.parent.postMessage({type:'saveFlappySkin',skin:id},'*');
  renderSkins();
}
renderSkins();

// ── FILTERS ──────────────────────────────────────────────────
function buildFilters(){
  const levels=['any','A1','A2','B1','B2','C1'];
  const topics=['any','conv','vocab','gram','culture'];
  const lLabels={any:'🔀 Tout',A1:'A1',A2:'A2',B1:'B1',B2:'B2',C1:'C1'};
  const tLabels={any:'🔀 Tout',conv:'💬 Conv.',vocab:'📚 Vocab',gram:'✏️ Gram.',culture:'🌍 Culture'};
  document.getElementById('level-row').innerHTML=levels.map(l=>
    `<button class="fb${l===_flappyLevel?' on':''}" onclick="setFilter('level','${l}',this)">${lLabels[l]}</button>`
  ).join('');
  document.getElementById('topic-row').innerHTML=topics.map(t=>
    `<button class="fb${t===_flappyTopic?' on':''}" onclick="setFilter('topic','${t}',this)">${tLabels[t]}</button>`
  ).join('');
}
function setFilter(type,val,btn){
  if(type==='level')_flappyLevel=val; else _flappyTopic=val;
  const row=btn.parentElement;
  row.querySelectorAll('.fb').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
}
buildFilters();

// ── CANVAS ────────────────────────────────────────────────────
const canvas=document.getElementById('game-canvas');
const ctx=canvas.getContext('2d');
let W=0,H=0,animId=0,gameActive=false,frameN=0;

function resize(){
  W=420; H=560;
  canvas.width=W; canvas.height=H;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
}
resize();

// ── GAME STATE ────────────────────────────────────────────────
const GRAV=0.36,JUMP=-6.5,PIPE_SPEED=1.4,PW=60;
let HOLE_H=100,HOLE_GAP=80;
let bird={x:0,y:0,vy:0,rot:0,alive:true};
let pipes=[],bgStars=[];
let score=0,totalQ=0,wordLog=[],wordList=[],scoreParticles=[];

// ── START ─────────────────────────────────────────────────────
function startGame(){
  resize();
  HOLE_H=Math.round(H*0.30); // large holes
  HOLE_GAP=Math.round(H*0.22); // large gap
  wordList=getWords().sort(()=>Math.random()-.5).slice(0,15);
  if(!wordList.length){alert('Pas de mots disponibles — vérifie la langue choisie.');return;}
  score=0;totalQ=0;wordLog=[];pipes=[];scoreParticles=[];frameN=0;
  bird={x:Math.round(W*0.22),y:Math.round(H*0.45),vy:-2,rot:0,alive:true};
  gameActive=true;

  // Init stars
  bgStars=Array.from({length:50},()=>({
    x:Math.random()*W,y:Math.random()*H,
    r:Math.random()*1.5+0.3,twink:Math.random()*Math.PI*2
  }));

  // Show/hide screens
  document.getElementById('start-scr').classList.remove('on');
  document.getElementById('result-scr').classList.remove('on');
  document.getElementById('hud').style.display='flex';
  document.getElementById('score-disp').textContent='⭐ 0';

  spawnPipe();

  cancelAnimationFrame(animId);
  animId=requestAnimationFrame(loop);

  // Input — delay to avoid the click that started the game
  setTimeout(()=>{
    document.onclick=()=>{if(gameActive&&bird.alive)bird.vy=JUMP;};
    canvas.ontouchstart=e=>{e.preventDefault();if(gameActive&&bird.alive)bird.vy=JUMP;};
  },250);
  document.onkeydown=e=>{if(e.code==='Space'&&gameActive&&bird.alive){bird.vy=JUMP;e.preventDefault();}};
}

// ── PIPE ──────────────────────────────────────────────────────
function spawnPipe(){
  if(!wordList.length)return;
  const q=wordList[Math.floor(Math.random()*wordList.length)];
  const others=wordList.filter(w=>w.id!==q.id);
  const wrong=others[Math.floor(Math.random()*others.length)]||wordList[0];
  const topCorrect=Math.random()>.5;
  const minTop=60,maxTop=H-HOLE_H*2-HOLE_GAP-100;
  const topY=minTop+Math.random()*Math.max(20,maxTop);
  const midY=topY+HOLE_H;
  const botY=midY+HOLE_GAP;
  const hue=Math.floor(Math.random()*360);
  pipes.push({
    x:W+10, topY, midY, botY, question:q,
    topLabel:topCorrect?q.target:wrong.target,
    botLabel:topCorrect?wrong.target:q.target,
    topCorrect, botCorrect:!topCorrect,
    scored:false,
    color:`hsl(${hue},55%,28%)`
  });
  // Show question in HUD
  document.getElementById('q-disp').textContent=q.native+' → ?';
  speak(q.native,nL);
}

// ── LOOP ──────────────────────────────────────────────────────
function loop(){
  frameN++;
  if(gameActive) update();
  draw();
  animId=requestAnimationFrame(loop);
}

function update(){
  if(!bird.alive)return;
  bird.vy+=GRAV;
  bird.y+=bird.vy;
  bird.rot=Math.min(Math.PI/2,Math.max(-0.5,bird.vy*0.07));

  if(bird.y<8){bird.y=8;bird.vy=0;}
  if(bird.y>H-8){die();return;}

  // Move pipes
  for(let i=0;i<pipes.length;i++){
    const p=pipes[i];
    p.x-=PIPE_SPEED;

    // Check collision only when bird is in pipe's X range
    if(bird.x+10>p.x && bird.x-10<p.x+PW){
      const inTop=bird.y-10>p.topY && bird.y+10<p.topY+HOLE_H;
      const inBot=bird.y-10>p.botY && bird.y+10<p.botY+HOLE_H;
      if(!inTop&&!inBot){ die(); return; }
      if(!p.scored){
        p.scored=true;
        const correct=(inTop&&p.topCorrect)||(inBot&&p.botCorrect);
        const label=inTop?p.topLabel:p.botLabel;
        if(correct){
          score+=10;totalQ++;
          document.getElementById('score-disp').textContent='⭐ '+score;
          speak(p.question.target,tL);
          wordLog.push({w:p.question.native,a:label,ok:true});
          boom(bird.x,bird.y,'#22c55e');
          window.parent.postMessage({type:'gameResult',won:totalQ>=10,myScore:score,game:'flappy'},'*');
          if(totalQ>=12){endGame();return;}
        } else {
          score=Math.max(0,score-3);
          document.getElementById('score-disp').textContent='⭐ '+score;
          wordLog.push({w:p.question.native,a:label,ok:false});
          boom(bird.x,bird.y,'#ef4444');
        }
      }
    }
  }

  // Spawn next pipe when last one is past center
  if(pipes.length===0||pipes[pipes.length-1].x<W*0.45) spawnPipe();
  // Remove off-screen pipes
  pipes=pipes.filter(p=>p.x+PW>-10);

  // Particles
  scoreParticles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.12;p.life-=0.035;p.size*=0.95;});
  scoreParticles=scoreParticles.filter(p=>p.life>0);
}

function boom(x,y,color){
  for(let i=0;i<12;i++){
    const a=Math.random()*Math.PI*2,s=1+Math.random()*4;
    scoreParticles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,
      life:1,color,size:3+Math.random()*4});
  }
}

function die(){
  if(!bird.alive)return;
  bird.alive=false;
  bird.vy=4;
  setTimeout(()=>{gameActive=false;endGame();},600);
}

// ── DRAW ──────────────────────────────────────────────────────
function draw(){
  // Sky
  const sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#04040f');sky.addColorStop(1,'#0a0a1f');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);

  // Stars
  bgStars.forEach(s=>{
    s.twink+=0.03;
    ctx.globalAlpha=0.15+Math.abs(Math.sin(s.twink))*0.3;
    ctx.fillStyle='#c4b5fd';
    ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();
  });
  ctx.globalAlpha=1;

  // Pipes
  pipes.forEach(drawPipe);

  // Particles
  scoreParticles.forEach(p=>{
    ctx.globalAlpha=p.life;ctx.fillStyle=p.color;
    ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
  });
  ctx.globalAlpha=1;

  // Bird
  if(bird.y>-30&&bird.y<H+30) drawBird();
}

function drawPipe(p){
  ctx.fillStyle=p.color;
  ctx.fillRect(p.x,0,PW,p.topY);
  ctx.fillRect(p.x,p.midY,PW,HOLE_GAP);
  const botEnd=p.botY+HOLE_H;
  ctx.fillRect(p.x,botEnd,PW,H-botEnd);
  // Shine
  ctx.fillStyle='rgba(255,255,255,.12)';
  ctx.fillRect(p.x,0,5,p.topY);
  ctx.fillRect(p.x,p.midY,5,HOLE_GAP);
  ctx.fillRect(p.x,botEnd,5,H-botEnd);
  // Rims
  ctx.fillStyle='rgba(255,255,255,.2)';
  ctx.fillRect(p.x-4,p.topY-7,PW+8,7);
  ctx.fillRect(p.x-4,p.midY,PW+8,7);
  ctx.fillRect(p.x-4,p.botY-7,PW+8,7);
  ctx.fillRect(p.x-4,botEnd,PW+8,7);
  // Labels (to the right of pipe)
  const lx=p.x+PW+8;
  ctx.font='bold 13px system-ui,sans-serif';
  ctx.textAlign='left';ctx.textBaseline='middle';
  // Top hole label
  const tcy=p.topY+HOLE_H/2;
  const tlw=ctx.measureText(p.topLabel).width+14;
  ctx.fillStyle='rgba(0,0,0,.7)';
  ctx.beginPath();if(ctx.roundRect)ctx.roundRect(lx-2,tcy-14,tlw,28,7);else ctx.rect(lx-2,tcy-14,tlw,28);
  ctx.fill();
  ctx.fillStyle='#f1f5f9';ctx.fillText(p.topLabel,lx+5,tcy);
  // Bot hole label
  const bcy=p.botY+HOLE_H/2;
  const blw=ctx.measureText(p.botLabel).width+14;
  ctx.fillStyle='rgba(0,0,0,.7)';
  ctx.beginPath();if(ctx.roundRect)ctx.roundRect(lx-2,bcy-14,blw,28,7);else ctx.rect(lx-2,bcy-14,blw,28);
  ctx.fill();
  ctx.fillStyle='#f1f5f9';ctx.fillText(p.botLabel,lx+5,bcy);
}

function drawBird(){
  ctx.save();
  ctx.translate(bird.x,bird.y);
  ctx.rotate(bird.rot);
  const sk=mySkin;
  const flap=Math.sin(frameN*0.22)*8*(bird.alive?1:0);
  ctx.shadowColor=sk.col; ctx.shadowBlur=bird.alive?12:0;

  if(sk.id==='blue'){
    ctx.fillStyle=sk.col;ctx.beginPath();ctx.ellipse(0,0,18,14,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle=sk.wing;ctx.beginPath();ctx.ellipse(-3,flap,11,6,0.2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.25)';ctx.beginPath();ctx.ellipse(4,4,8,6,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=sk.col;ctx.beginPath();ctx.moveTo(-4,-12);ctx.quadraticCurveTo(0,-20,4,-12);ctx.fill();
  } else if(sk.id==='parrot'){
    ctx.fillStyle=sk.col;ctx.beginPath();ctx.ellipse(0,0,20,12,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='#f97316';ctx.beginPath();ctx.ellipse(5,3,9,7,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#166534';ctx.beginPath();ctx.ellipse(-3,flap,12,5,-0.3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.ellipse(-4,-3,6,3,0.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=sk.beak;ctx.beginPath();ctx.moveTo(15,-2);ctx.lineTo(24,0);ctx.lineTo(18,5);ctx.quadraticCurveTo(14,4,15,-2);ctx.fill();
  } else if(sk.id==='owl'){
    ctx.fillStyle=sk.col;ctx.beginPath();ctx.ellipse(0,0,16,17,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,.3)';ctx.beginPath();ctx.ellipse(3,4,8,9,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=sk.wing;
    ctx.beginPath();ctx.ellipse(-10,flap,7,12,0.4,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(10,flap,7,12,-0.4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.arc(-5,-3,6,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(5,-3,6,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#111';ctx.beginPath();ctx.arc(-5,-3,4,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(5,-3,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-4,-4,1.5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(6,-4,1.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=sk.col;ctx.beginPath();ctx.moveTo(-7,-14);ctx.lineTo(-4,-22);ctx.lineTo(-1,-14);ctx.fill();
    ctx.beginPath();ctx.moveTo(1,-14);ctx.lineTo(4,-22);ctx.lineTo(7,-14);ctx.fill();
    ctx.fillStyle=sk.beak;ctx.beginPath();ctx.moveTo(0,1);ctx.lineTo(5,5);ctx.lineTo(0,7);ctx.fill();
    ctx.restore();return;
  } else if(sk.id==='chick'){
    ctx.fillStyle=sk.col;ctx.beginPath();ctx.arc(0,0,16,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(-12,flap-2,6,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(-8,flap+8,5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fb923c';ctx.globalAlpha=.5;ctx.beginPath();ctx.arc(6,4,5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    ctx.fillStyle=sk.wing;ctx.beginPath();ctx.ellipse(-4,flap,8,4,0.15,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#f59e0b';ctx.beginPath();ctx.moveTo(-2,-14);ctx.quadraticCurveTo(1,-22,4,-14);ctx.fill();
    ctx.beginPath();ctx.moveTo(-5,-13);ctx.quadraticCurveTo(-2,-19,1,-13);ctx.fill();
  } else if(sk.id==='fire'){
    ctx.fillStyle=sk.col;ctx.beginPath();ctx.ellipse(0,0,18,13,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='#fcd34d';ctx.beginPath();ctx.moveTo(-18,0);ctx.quadraticCurveTo(-28,flap-8,-22,-8+flap*0.5);ctx.quadraticCurveTo(-18,flap*0.3,-16,4);ctx.fill();
    ctx.fillStyle='#f97316';ctx.beginPath();ctx.moveTo(-16,2);ctx.quadraticCurveTo(-24,flap,-20,-4+flap*0.3);ctx.quadraticCurveTo(-17,flap*0.2,-14,4);ctx.fill();
    ctx.fillStyle=sk.wing;ctx.beginPath();ctx.ellipse(-2,flap,11,5,0.2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fcd34d';ctx.beginPath();ctx.moveTo(0,-12);ctx.quadraticCurveTo(4,-22,6,-12);ctx.fill();
    ctx.fillStyle='#f97316';ctx.beginPath();ctx.moveTo(-3,-11);ctx.quadraticCurveTo(0,-19,3,-11);ctx.fill();
    ctx.fillStyle='rgba(255,200,100,.15)';ctx.beginPath();ctx.ellipse(4,3,8,6,0,0,Math.PI*2);ctx.fill();
  } else if(sk.id==='penguin'){
    ctx.fillStyle=sk.col;ctx.beginPath();ctx.ellipse(0,0,14,18,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='#f1f5f9';ctx.beginPath();ctx.ellipse(3,3,8,12,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#334155';
    ctx.beginPath();ctx.ellipse(-11,flap,5,10,0.3,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(11,flap,5,10,-0.3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(7,-5,5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#111';ctx.beginPath();ctx.arc(8,-5,3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(9,-6,1.3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=sk.beak;ctx.beginPath();ctx.moveTo(13,-2);ctx.lineTo(20,0);ctx.lineTo(13,3);ctx.fill();
    ctx.restore();return;
  }

  ctx.shadowBlur=0;
  // Default eye
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(10,-4,5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(11,-4,3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(12,-5,1.3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=sk.beak;ctx.beginPath();ctx.moveTo(15,-1);ctx.lineTo(24,0);ctx.lineTo(15,4);ctx.closePath();ctx.fill();
  ctx.restore();
}
// ── END ───────────────────────────────────────────────────────
function endGame(){
  document.getElementById('hud').style.display='none';
  document.getElementById('result-scr').classList.add('on');
  document.getElementById('res-medal').textContent=score>80?'🏆':score>40?'🥈':'🥉';
  document.getElementById('res-title').textContent=score>80?'Excellent !':'Bien joué !';
  document.getElementById('res-pts').textContent=score+' pts · '+totalQ+' ✓';
  document.getElementById('word-log').innerHTML=wordLog.slice(-8).map(r=>
    `<div class="log-row"><span>${r.w}</span><span class="${r.ok?'ok':'ko'}">${r.a} ${r.ok?'✓':'✗'}</span></div>`
  ).join('');
  document.onclick=null;document.onkeydown=null;
}

function quitToLobby(){
  gameActive=false;cancelAnimationFrame(animId);
  document.onclick=null;document.onkeydown=null;
  document.getElementById('hud').style.display='none';
  document.getElementById('start-scr').classList.add('on');
}

function backToLobby(){
  document.getElementById('result-scr').classList.remove('on');
  document.getElementById('start-scr').classList.add('on');
  gameActive=false;
}
</script>
</body>
</html>
