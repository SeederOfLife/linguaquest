// COMPOST.JS — Iframe launcher for Compost snake.io game

function openCompostGame() {
  const nL   = S.nL   || 'fr';
  const tL   = S.tL   || 'en';
  const skin  = (U && U.compostSkin) || 'sprout';
  const name  = encodeURIComponent((U && U.name) || 'Joueur');
  const email = encodeURIComponent((U && U.email) || 'guest@local');

  const overlay = document.getElementById('compost-overlay');
  const iframe  = document.getElementById('compost-iframe');
  if (!overlay || !iframe) return;

  iframe.src = `compost-game.html?nL=${nL}&tL=${tL}&skin=${skin}&name=${name}&email=${email}`;
  overlay.style.display = 'flex';

  window._compostListener = function(e) {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'close')       closeCompostGame();
    if (e.data.type === 'getWordData') iframe.contentWindow.postMessage({ type:'wordData', words: typeof WD!=='undefined'?WD:{} }, '*');
    if (e.data.type === 'saveSkin'  && U && !U.isGuest) { U.compostSkin=e.data.skin; saveU(); }
    if (e.data.type === 'gameResult' && e.data.won && U && !U.isGuest) {
      U.coins=(U.coins||0)+150; U.duelsWon=(U.duelsWon||0)+1;
      saveU(); updateTopBar();
      if(typeof checkTrophies==='function') checkTrophies();
    }
  };
  window.addEventListener('message', window._compostListener);
}

function closeCompostGame() {
  const overlay = document.getElementById('compost-overlay');
  const iframe  = document.getElementById('compost-iframe');
  if (overlay) overlay.style.display = 'none';
  if (iframe)  iframe.src = '';
  if (window._compostListener) {
    window.removeEventListener('message', window._compostListener);
    window._compostListener = null;
  }
}
