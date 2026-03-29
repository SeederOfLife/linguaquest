<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>LinguaRace</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#111;font-family:'Nunito',system-ui,sans-serif;color:#f1f5f9;
  display:flex;flex-direction:column;align-items:center;height:100vh;overflow:hidden;}
canvas{display:block;max-width:100%;}
.scr{display:none;position:absolute;inset:0;align-items:center;justify-content:center;
  flex-direction:column;gap:10px;padding:24px;text-align:center;pointer-events:all;background:rgba(0,0,0,.7);}
.scr.on{display:flex;}
.title{font-size:2rem;font-weight:900;}
.subtitle{color:#94a3b8;font-size:.85rem;margin-bottom:8px;}
.btn{padding:13px 28px;border:none;border-radius:14px;font-family:inherit;font-weight:900;
  font-size:1rem;cursor:pointer;width:100%;max-width:280px;transition:transform .12s;}
.btn:active{transform:scale(.96);}
.btn-primary{background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;}
.btn-green{background:linear-gradient(135deg,#dc2626,#ea580c);color:#fff;}
.btn-gray{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);color:#f1f5f9;}
.skin-grid{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:12px;}
.car-btn{background:rgba(255,255,255,.07);border:2px solid transparent;border-radius:12px;
  padding:8px 12px;cursor:pointer;transition:all .18s;font-size:.75rem;font-weight:800;min-width:70px;}
.car-btn.sel{border-color:var(--c,#ef4444);background:rgba(239,68,68,.15);}
#hud{position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;
  align-items:center;padding:8px 14px;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);}
#hud-q{font-weight:900;font-size:1rem;color:#fbbf24;text-align:center;flex:1;padding:0 8px;cursor:pointer;}
#btn-close{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;
  border-radius:8px;padding:5px 12px;font-family:inherit;font-weight:800;cursor:pointer;font-size:.78rem;}
/* D-pad */
#dpad{position:absolute;bottom:16px;right:16px;display:flex;flex-direction:column;gap:3px;}
.dp-row{display:flex;gap:3px;}
.dp-btn{width:50px;height:50px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);
  border-radius:10px;color:#fff;font-size:1.1rem;cursor:pointer;
  -webkit-tap-highlight-color:transparent;user-select:none;}
.dp-btn:active{background:rgba(255,255,255,.3);}
@media(min-width:600px){#dpad{display:none;}}
/* Score */
#result-scr .big{font-size:3rem;font-weight:900;color:#fbbf24;margin:6px 0;}
#result-scr .medal{font-size:3.5rem;}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="ui" style="position:absolute;inset:0;pointer-events:none;">
  <div id="hud" style="display:none;pointer-events:all;">
    <div id="score-disp" style="font-weight:900;font-size:.9rem;min-width:60px;">⭐ 0</div>
    <div id="hud-q" onclick="speak(currentQ.native,nL)">—</div>
    <button id="btn-close" onclick="window.parent.postMessage('close','*')">✕</button>
  </div>
  <div id="dpad" style="pointer-events:all;">
    <div class="dp-row"><button class="dp-btn" id="up">▲</button></div>
    <div class="dp-row">
      <button class="dp-btn" id="left">◀</button>
      <div style="width:50px;"></div>
      <button class="dp-btn" id="right">▶</button>
    </div>
    <div class="dp-row"><button class="dp-btn" id="down">▼</button></div>
  </div>
</div>

<!-- START -->
<div class="scr on" id="start-scr">
  <div style="font-size:2.5rem;">🏎️</div>
  <div class="title">LinguaRace</div>
  <div class="subtitle">Conduis vers la bonne traduction !</div>
  <div style="font-size:.73rem;color:#94a3b8;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Choisis ta voiture</div>
  <div class="skin-grid" id="car-grid"></div>
  <button class="btn btn-green" onclick="startGame()">🏁 Démarrer</button>
  <button class="btn btn-gray" style="margin-top:6px;" onclick="window.parent.postMessage('close','*')">← Retour</button>
</div>

<!-- RESULT -->
<div class="scr" id="result-scr">
  <div class="medal" id="res-medal">🏆</div>
  <div class="title" id="res-title">Bien joué !</div>
  <div class="big" id="res-pts">0 pts</div>
  <div id="res-sub" style="color:#94a3b8;font-size:.82rem;margin-bottom:14px;"></div>
  <button class="btn btn-primary" onclick="restartGame()">🔄 Rejouer</button>
  <button class="btn btn-gray" id="btn-car-study" style="margin-top:6px;display:none;" onclick="goStudyChapter()">📚 Réviser le chapitre →</button>
  <button class="btn btn-gray" style="margin-top:6px;" onclick="window.parent.postMessage('close','*')">← Menu</button>
</div>

<script>
const CAR_SKINS=[
  {id:'red',    name:'🔴 Turbo',  body:'#dc2626',top:'#991b1b',trim:'#fca5a5'},
  {id:'blue',   name:'🔵 Nitro',  body:'#2563eb',top:'#1d4ed8',trim:'#93c5fd'},
  {id:'gold',   name:'🏆 Champ',  body:'#d97706',top:'#92400e',trim:'#fcd34d'},
  {id:'green',  name:'🟢 Eco',    body:'#16a34a',top:'#14532d',trim:'#86efac'},
  {id:'purple', name:'💜 Cyber',  body:'#7c3aed',top:'#4c1d95',trim:'#c4b5fd'},
  {id:'black',  name:'⚫ Shadow', body:'#1e293b',top:'#0f172a',trim:'#94a3b8'},
];
let mySkin=CAR_SKINS[0];

function renderCarGrid(){
  document.getElementById('car-grid').innerHTML=CAR_SKINS.map(s=>
    `<div class="car-btn ${s.id===mySkin.id?'sel':''}" style="--c:${s.body}" onclick="pickCar('${s.id}')">
      ${s.name}
    </div>`).join('');
}
function pickCar(id){
  mySkin=CAR_SKINS.find(s=>s.id===id)||CAR_SKINS[0];
  window.parent.postMessage({type:'saveCarSkin',skin:id},'*');
  renderCarGrid();
}
const sc=new URLSearchParams(location.search).get('carSkin');
if(sc){const s=CAR_SKINS.find(x=>x.id===sc);if(s)mySkin=s;}
renderCarGrid();

// Words
let WD={}, CHAPTERS=null;
const _cp=new URLSearchParams(location.search);
const nL=_cp.get('nL')||'fr';
const tL=_cp.get('tL')||'en';
const _carChapId=decodeURIComponent(_cp.get('chapId')||'');
const _carLevel=decodeURIComponent(_cp.get('level')||'');
let _currentChapId=_carChapId||null;
let _carFilterLevel=_carLevel||'any';

window.addEventListener('message',e=>{
  if(e.data?.type==='wordData'){
    WD=e.data.words||{};
    CHAPTERS=e.data.chapters||null;
    if(e.data.currentChap) _currentChapId=e.data.currentChap;
    if(e.data.currentLevel&&!_carLevel) _carFilterLevel=e.data.currentLevel;
    // Show "study chapter" button if we have a chapter context
    if(_currentChapId){
      const sb=document.getElementById('btn-car-study');
      if(sb) sb.style.display='';
    }
  }
});
window.parent.postMessage({type:'getWordData'},'*');

function goStudyChapter(){
  window.parent.postMessage({type:'goStudyChapter',chapId:_currentChapId||''},'*');
}
const FALLBACK={hello:{fr:'Bonjour',en:'Hello',es:'Hola',de:'Hallo',cs:'Ahoj'},
  dog:{fr:'Chien',en:'Dog',es:'Perro',de:'Hund',cs:'Pes'},
  cat:{fr:'Chat',en:'Cat',es:'Gato',de:'Katze',cs:'Kočka'},
  water:{fr:'Eau',en:'Water',es:'Agua',de:'Wasser',cs:'Voda'},
  house:{fr:'Maison',en:'House',es:'Casa',de:'Haus',cs:'Dům'},
  love:{fr:'Amour',en:'Love',es:'Amor',de:'Liebe',cs:'Láska'},
  book:{fr:'Livre',en:'Book',es:'Libro',de:'Buch',cs:'Kniha'},
  red:{fr:'Rouge',en:'Red',es:'Rojo',de:'Rot',cs:'Červená'},
  music:{fr:'Musique',en:'Music',es:'Música',de:'Musik',cs:'Hudba'},
};
const SPEECH={fr:'fr-FR',en:'en-GB',es:'es-ES',de:'de-DE',cs:'cs-CZ'};
function speak(t,l){if(!t||!window.speechSynthesis)return;window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(t);u.lang=SPEECH[l]||'en-GB';u.rate=0.85;
  const v=window.speechSynthesis.getVoices().find(x=>x.lang.toLowerCase().startsWith(u.lang.split('-')[0]));
  if(v)u.voice=v;window.speechSynthesis.speak(u);}

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
    if(ids.size>=4) allowed=ids;
  }

  // Priority 2: level filter
  if(!allowed&&CHAPTERS&&_carFilterLevel!=='any'){
    const ids=new Set();
    const chs=CHAPTERS[_carFilterLevel]||[];
    chs.forEach(ch=>(ch.wids||[]).forEach(id=>ids.add(id)));
    if(ids.size>=5) allowed=ids;
  }

  return Object.entries(src)
    .filter(([id,w])=>w[nL]&&w[tL]&&(!allowed||allowed.has(id)))
    .map(([id,w])=>({id,native:w[nL],target:w[tL]}));
}

// ── ENGINE ────────────────────────────────────────────────────
const canvas=document.getElementById('c');
const ctx=canvas.getContext('2d');
let W,H,animId,running=false,frameN=0;

// Road
const LANES=4, ROAD_W=280;
let roadOffset=0,roadSpeed=4;

// Player car
let car={lane:1,x:0,y:0,targetX:0,score:0,alive:true,invincible:0,tilt:0};

// Word targets (cars on road)
let targets=[],wordList=[],currentQ=null,totalAnswered=0,combo=0;
let particles=[];

// Keys
let keys={};
let lastKey=0;

function resize(){
  W=canvas.parentElement.clientWidth;
  H=canvas.parentElement.clientHeight;
  canvas.width=W;canvas.height=H;
}

function laneX(lane){return (W-ROAD_W)/2+30+lane*(ROAD_W-60)/Math.max(1,LANES-1);}

function pickQuestion(){
  currentQ=wordList[Math.floor(Math.random()*wordList.length)];
  document.getElementById('hud-q').textContent=currentQ.native+' → ?';
  speak(currentQ.native,nL);
}

function spawnTarget(){
  const usedLanes = targets.map(t=>t.lane);
  let lane;
  do { lane = Math.floor(Math.random()*LANES) } while(usedLanes.includes(lane) && usedLanes.length < LANES);

  const others=wordList.filter(w=>w.id!==currentQ?.id);
  const wrong=others[Math.floor(Math.random()*others.length)];

  const hasCorrect = targets.some(t=>t.correct && !t.passed);
  const isCorrect = !hasCorrect && Math.random()>0.45;

  targets.push({
    lane, x:laneX(lane), y:-60,
    label:isCorrect?currentQ?.target:wrong?.target,
    correct:isCorrect, speed:2+Math.random()*1.5,
    color:isCorrect?`hsl(${Math.floor(Math.random()*360)},60%,40%)`:
      `hsl(${Math.floor(Math.random()*360)},45%,35%)`,
    passed:false
  });
}

function startGame(){
  // Fix speech synthesis on iOS
  speak('', nL);

  wordList=getWords().sort(()=>Math.random()-.5).slice(0,15);
  if(!wordList.length){alert('Pas de mots !');return;}
  car={lane:Math.floor(LANES/2),score:0,alive:true,invincible:0,tilt:0};
  car.x=laneX(car.lane);car.targetX=car.x;car.y=H*0.75;
  targets=[];particles=[];totalAnswered=0;combo=0;roadSpeed=4;frameN=0;
  running=true;
  document.getElementById('start-scr').classList.remove('on');
  document.getElementById('hud').style.display='flex';
  document.getElementById('dpad').style.display='flex';
  document.getElementById('score-disp').textContent='⭐ 0';
  pickQuestion();
  for(let i=0;i<2;i++) spawnTarget();
  cancelAnimationFrame(animId);
  animId=requestAnimationFrame(loop);

  // Input
  document.addEventListener('keydown',onKey);
  bindDpad();
}

function onKey(e){
  const now=Date.now();if(now-lastKey<85)return;lastKey=now;
  if(e.key==='ArrowLeft'||e.key==='a'){moveLeft();e.preventDefault();}
  if(e.key==='ArrowRight'||e.key==='d'){moveRight();e.preventDefault();}
  if(e.key==='ArrowUp'||e.key==='w'){roadSpeed=Math.min(8,roadSpeed+1);e.preventDefault();}
  if(e.key==='ArrowDown'||e.key==='s'){roadSpeed=Math.max(2,roadSpeed-1);e.preventDefault();}
}
function bindDpad(){
  [['left',moveLeft],['right',moveRight]].forEach(([id,fn])=>{
    const el=document.getElementById(id);
    if(el){el.addEventListener('touchstart',e=>{fn();e.preventDefault();},{passive:false});
      el.addEventListener('mousedown',fn);}
  });
  const u=document.getElementById('up'),dn=document.getElementById('down');
  if(u){u.addEventListener('touchstart',e=>{roadSpeed=Math.min(8,roadSpeed+1);e.preventDefault();},{passive:false});
    u.addEventListener('mousedown',()=>roadSpeed=Math.min(8,roadSpeed+1));}
  if(dn){dn.addEventListener('touchstart',e=>{roadSpeed=Math.max(2,roadSpeed-1);e.preventDefault();},{passive:false});
    dn.addEventListener('mousedown',()=>roadSpeed=Math.max(2,roadSpeed-1));}
}
function moveLeft(){if(car.lane>0){car.lane--;car.targetX=laneX(car.lane);car.tilt=-0.12;}}
function moveRight(){if(car.lane<LANES-1){car.lane++;car.targetX=laneX(car.lane);car.tilt=0.12;}}

function loop(){
  frameN++;
  update();render();
  if(running)animId=requestAnimationFrame(loop);
}

function update(){
  if(!car.alive)return;
  if(car.invincible>0)car.invincible--;

  // Smooth lane change and tilt
  car.x+=(car.targetX-car.x)*0.18;
  car.tilt += (0 - car.tilt) * 0.12;

  // Road scroll
  roadOffset=(roadOffset+roadSpeed*1.8)%120;
  roadSpeed=Math.min(8,4+totalAnswered*0.2);

  // Move targets
  targets.forEach(t=>{
    t.y+=t.speed+(roadSpeed-4)*0.5;
    t.x+=(laneX(t.lane)-t.x)*0.1;
  });

  // Check if correct answer was missed
  const missed = targets.find(t=>t.correct && !t.passed && t.y > H + 20);
  if(missed){
    missed.passed = true;
    car.score = Math.max(0, car.score -5);
    combo = 0;
    document.getElementById('score-disp').textContent='⭐ '+car.score;
  }

  // Spawn
  if(targets.filter(t=>t.y<H).length<3) spawnTarget();

  // Collision detection
  targets.forEach(t=>{
    if(t.passed||t.y>H+80)return;
    const dx=Math.abs(car.x-t.x),dy=Math.abs(car.y-t.y);
    if(dx<32&&dy<50){
      t.passed=true;
      if(t.correct){
        combo++;
        car.score+=10 + Math.min(combo, 5);
        totalAnswered++;
        document.getElementById('score-disp').textContent='⭐ '+car.score;
        speak(currentQ.target,tL);
        spawnFX(t.x,t.y,'#22c55e');
        if(navigator.vibrate) navigator.vibrate(30);
        pickQuestion();
        if(totalAnswered>=12)endGame();
      } else {
        combo=0;
        car.score=Math.max(0,car.score-5);
        car.invincible=60;
        document.getElementById('score-disp').textContent='⭐ '+car.score;
        spawnFX(t.x,t.y,'#ef4444');
        if(navigator.vibrate) navigator.vibrate([100,50,100]);
      }
    }
  });
  targets=targets.filter(t=>t.y<H+100);

  // Particles
  particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.15;p.life-=0.03;p.size*=0.95;});
  particles=particles.filter(p=>p.life>0);
}

function spawnFX(x,y,color){
  for(let i=0;i<14;i++){
    const a=Math.random()*Math.PI*2,s=1.5+Math.random()*4;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,
      life:1,color,size:3+Math.random()*4});
  }
}

function render(){
  const rx=(W-ROAD_W)/2;

  // Sky
  const gradient = ctx.createLinearGradient(0,0,0,H);
  gradient.addColorStop(0, '#070714');
  gradient.addColorStop(1, '#101025');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);

  // Far away hills
  ctx.fillStyle = '#0f0f22';
  for(let i=-1;i<12;i++){
    const off = (roadOffset * 0.15 + i * 160) % (160 * 11) - 160;
    ctx.beginPath();
    ctx.moveTo(i * 160 - 80, H);
    ctx.lineTo(i * 160, H - 70 + Math.sin(i * 1.7) * 25);
    ctx.lineTo(i * 160 + 80, H);
    ctx.fill();
  }

  // Far trees
  ctx.fillStyle='#132e1f';
  for(let i=-1;i<18;i++){
    const off = (roadOffset * 0.35 + i * 90) % (90 * 17) - 90;
    ctx.beginPath();
    ctx.arc(i * 70 + 25, off, 22 + Math.sin(i*3) * 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Road
  ctx.fillStyle='#1a1a2e';ctx.fillRect(rx,0,ROAD_W,H);

  // Road lines
  ctx.strokeStyle='#fbbf24';ctx.lineWidth=3;ctx.setLineDash([30,20]);
  ctx.lineDashOffset=-roadOffset;
  for(let l=1;l<LANES;l++){
    const lx=rx+l*(ROAD_W/LANES);
    ctx.beginPath();ctx.moveTo(lx,0);ctx.lineTo(lx,H);ctx.stroke();
  }
  ctx.setLineDash([]);
  // Road edges
  ctx.strokeStyle='#fff';ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(rx,0);ctx.lineTo(rx,H);ctx.stroke();
  ctx.beginPath();ctx.moveTo(rx+ROAD_W,0);ctx.lineTo(rx+ROAD_W,H);ctx.stroke();

  // Street poles right next to road
  ctx.fillStyle = '#333';
  for(let i=-1;i<12;i++){
    const y = (roadOffset * 1.2 + i * 130) % (130 * 11) - 130;
    ctx.fillRect(rx - 6, y, 3, 70);
    ctx.fillRect(rx + ROAD_W + 3, y, 3, 70);
  }

  // Target cars
  targets.forEach(drawTargetCar);

  // Player car
  drawPlayerCar();

  // Particles
  particles.forEach(p=>{
    ctx.globalAlpha=p.life;ctx.fillStyle=p.color;
    ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
  });
  ctx.globalAlpha=1;

  // Speed indicator
  ctx.fillStyle='rgba(255,255,255,.3)';ctx.font='bold 11px system-ui';
  ctx.textAlign='right';
  ctx.fillText(Math.round(roadSpeed*30)+' km/h',W-8,H-10);
  ctx.textAlign='left';

  if(combo > 1){
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('🔥 x'+combo, 8, H-10);
  }
}

function drawTargetCar(t){
  ctx.save();ctx.translate(t.x,t.y);
  if(car.invincible>0&&!t.passed)ctx.globalAlpha=0.7;
  drawCar(0,0,{body:t.color,top:shadeColor(t.color,-30),trim:'#fff'},false);
  // Word label on car
  ctx.fillStyle='rgba(0,0,0,.75)';ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=1;
  const lw=Math.max(64,ctx.measureText(t.label||'').width+16);
  ctx.beginPath();if(ctx.roundRect)ctx.roundRect(-lw/2,-52,lw,22,6);else ctx.rect(-lw/2,-52,lw,22);
  ctx.fill();ctx.stroke();
  ctx.fillStyle='#f1f5f9';ctx.font='bold 12px system-ui,sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t.label||'',0,-41);
  ctx.restore();
}

function drawPlayerCar(){
  ctx.save();
  ctx.translate(car.x,car.y);
  ctx.rotate(car.tilt);
  if(car.invincible>0&&Math.floor(car.invincible/6)%2===0)ctx.globalAlpha=0.4;
  drawCar(0,0,mySkin,true);
  ctx.restore();
}

function drawCar(x,y,sk,isPlayer){
  const w=40,h=60;
  // Shadow
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(x,y+h/2+5,w/2,8,0,0,Math.PI*2);ctx.fill();
  // Body
  ctx.shadowColor=sk.body;ctx.shadowBlur=isPlayer?16:8;
  ctx.fillStyle=sk.body;ctx.beginPath();
  if(ctx.roundRect)ctx.roundRect(x-w/2,y-h/2,w,h,8);else ctx.rect(x-w/2,y-h/2,w,h);ctx.fill();
  ctx.shadowBlur=0;
  // Top/cabin
  ctx.fillStyle=sk.top;ctx.beginPath();
  if(ctx.roundRect)ctx.roundRect(x-w/2+6,y-h/2+10,w-12,h/2,6);else ctx.rect(x-w/2+6,y-h/2+10,w-12,h/2);ctx.fill();
  // Windshield
  ctx.fillStyle='rgba(150,220,255,.5)';ctx.beginPath();
  if(ctx.roundRect)ctx.roundRect(x-w/2+9,y-h/2+12,w-18,14,3);else ctx.rect(x-w/2+9,y-h/2+12,w-18,14);ctx.fill();
  // Trim stripe
  ctx.strokeStyle=sk.trim;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(x-w/2,y);ctx.lineTo(x+w/2,y);ctx.stroke();
  // Wheels
  ctx.fillStyle='#111';
  [[-w/2-4,-h/3],[w/2+4,-h/3],[-w/2-4,h/4],[w/2+4,h/4]].forEach(([wx,wy])=>{
    ctx.beginPath();ctx.ellipse(x+wx,y+wy,7,10,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=1;ctx.stroke();
  });
  // Lights
  if(isPlayer){
    ctx.fillStyle='#fef9c3';
    [[-w/2+4,-h/2+2],[w/2-12,-h/2+2]].forEach(([lx,ly])=>{
      ctx.shadowColor='#fef9c3';ctx.shadowBlur=8;
      ctx.fillRect(x+lx,y+ly,8,5);ctx.shadowBlur=0;
    });
  } else {
    ctx.fillStyle='#ef4444';
    ctx.fillRect(x-w/2+6, y+h/2-7, 6,4);
    ctx.fillRect(x+w/2-12, y+h/2-7, 6,4);
  }
}

function shadeColor(hex,pct){
  const n=parseInt(hex.replace('#',''),16);
  const r=Math.min(255,Math.max(0,((n>>16)&0xff)+pct));
  const g=Math.min(255,Math.max(0,((n>>8)&0xff)+pct));
  const b=Math.min(255,Math.max(0,(n&0xff)+pct));
  return `rgb(${r},${g},${b})`;
}

function endGame(){
  running=false;document.removeEventListener('keydown',onKey);
  cancelAnimationFrame(animId);
  document.getElementById('hud').style.display='none';
  document.getElementById('dpad').style.display='none';
  document.getElementById('result-scr').classList.add('on');
  document.getElementById('res-medal').textContent=car.score>100?'🏆':car.score>50?'🥈':'🎖️';
  document.getElementById('res-title').textContent=car.score>80?'Champion !':'Bien joué !';
  document.getElementById('res-pts').textContent=car.score+' pts';
  document.getElementById('res-sub').textContent=totalAnswered+' bonnes réponses';
  if(car.score>60) window.parent.postMessage({type:'gameResult',won:true,myScore:car.score,game:'car'},'*');
}

function restartGame(){
  document.getElementById('result-scr').classList.remove('on');
  document.getElementById('start-scr').classList.add('on');
}

window.addEventListener('resize',resize);
resize();
</script>
</body>
</html>
