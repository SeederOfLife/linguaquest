// ══════════════════════════════════════════════════════════════
// COMPOST.JS — Launcher for the Compost worm game
// The game runs in compost-game.html inside an iframe overlay
// ══════════════════════════════════════════════════════════════

function openCompostGame() {
  // Use current language pair or defaults
  const nL = S.nL || 'fr';
  const tL = S.tL || 'en';
  const skin = (U && U.compostSkin) || 'sprout';

  // Show overlay
  const overlay = document.getElementById('compost-overlay');
  const iframe  = document.getElementById('compost-iframe');
  if (!overlay || !iframe) { console.error('Compost overlay not found'); return; }

  // Load the game page with params
  iframe.src = `compost-game.html?nL=${nL}&tL=${tL}&skin=${skin}`;
  overlay.style.display = 'flex';

  // Listen for messages from the game iframe
  window._compostListener = function(e) {
    if (!e.data || typeof e.data !== 'object') return;

    if (e.data.type === 'close') {
      closeCompostGame();
    }

    if (e.data.type === 'getWordData') {
      // Send word dictionary to the iframe
      iframe.contentWindow.postMessage({
        type: 'wordData',
        words: typeof WD !== 'undefined' ? WD : {}
      }, '*');
    }

    if (e.data.type === 'saveSkin') {
      if (U && !U.isGuest) {
        U.compostSkin = e.data.skin;
        saveU();
      }
    }

    if (e.data.type === 'gameResult') {
      if (e.data.won && U && !U.isGuest) {
        U.coins = (U.coins || 0) + 150;
        U.duelsWon = (U.duelsWon || 0) + 1;
        saveU();
        updateTopBar();
        if (typeof checkTrophies === 'function') checkTrophies();
      }
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
