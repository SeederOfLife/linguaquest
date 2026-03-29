// COMPOST.JS — Launcher for Compost snake.io game

function openCompostGame(opts) {
  opts = opts || {};
  const nL    = S.nL   || 'fr';
  const tL    = S.tL   || 'en';
  const skin  = (U && U.compostSkin) || 'sprout';
  const name  = encodeURIComponent((U && U.name)  || 'Joueur');
  const email = encodeURIComponent((U && U.email) || 'guest@local');
  const level = encodeURIComponent(opts.level || 'any');
  const topic = encodeURIComponent(opts.topic || 'any');
  const chap  = encodeURIComponent(opts.chap  || '');

  const overlay = document.getElementById('compost-overlay');
  const iframe  = document.getElementById('compost-iframe');
  if (!overlay || !iframe) { console.error('Compost overlay missing'); return; }

  iframe.src = `compost-game.html?nL=${nL}&tL=${tL}&skin=${skin}&name=${name}&email=${email}&level=${level}&topic=${topic}&chap=${chap}`;
  overlay.style.display = 'flex';

  window._compostListener = function(e) {
    // Handle both string 'close' and {type:'close'}
    if (e.data === 'close' || e.data?.type === 'close') { closeCompostGame(); return; }
    if (!e.data || typeof e.data !== 'object') return;

    if (e.data.type === 'getWordData') {
      // Send WD + CHAPTERS to iframe
      iframe.contentWindow.postMessage({
        type: 'wordData',
        words: typeof WD !== 'undefined' ? WD : {},
        chapters: typeof CHAPTERS !== 'undefined' ? CHAPTERS : null,
      }, '*');
    }

    if (e.data.type === 'saveSkin' && U && !U.isGuest) {
      U.compostSkin = e.data.skin; saveU();
    }

    if (e.data.type === 'gameResult' && e.data.won && U && !U.isGuest) {
      const bonus = opts.level && opts.level !== 'any' ? 100 : 50;
      U.coins = (U.coins || 0) + bonus;
      U.duelsWon = (U.duelsWon || 0) + 1;
      saveU(); updateTopBar();
      if (typeof checkTrophies === 'function') checkTrophies();
      toast(`🪱 Victoire ! +${bonus} 🪙`);
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

// Called from game-select screen (uses current chapter context)
function openCompostFromLesson() {
  openCompostGame({
    level: S.level || 'any',
    topic: S._activeTopic || 'any',
    chap:  S.chap  || '',
  });
}

// Called from chapters screen (uses current level + topic filter)
function openCompostFromChapter() {
  openCompostGame({
    level: S.level || 'any',
    topic: S._activeTopic || 'any',
  });
}
