// ══════════════════════════════════════════════════════════════
// NEWS.JS — Market & Financial News for Portfolio screen
// Uses rss2json (free) to pull Yahoo Finance RSS headlines
// ══════════════════════════════════════════════════════════════

const NEWS_CACHE_MS = 10 * 60 * 1000; // 10min
let _newsCache = null;
let _newsCacheTime = 0;

// Curated finance RSS feeds (public, no key needed via rss2json free tier)
const NEWS_FEEDS = [
  'https://finance.yahoo.com/news/rssindex',
  'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
];

// Fallback tips if API is unavailable
const NEWS_FALLBACK = [
  { emoji:'📈', title:'La diversification réduit le risque',     sub:'Ne jamais tout mettre dans un seul actif', tag:'bull' },
  { emoji:'🏦', title:'Les banques centrales contrôlent les taux', sub:'La Fed et BCE influencent tous les marchés', tag:'neutral' },
  { emoji:'₿',  title:'Bitcoin : actif de diversification',       sub:'Faible corrélation avec les actions', tag:'bull' },
  { emoji:'📉', title:'Les marchés corrigent parfois de 20%+',    sub:'Les baisses sont normales — c\'est une opportunité', tag:'bear' },
  { emoji:'🛢️', title:'Le pétrole influence toute l\'économie',    sub:'OPEC+ décide des quotas de production', tag:'neutral' },
  { emoji:'🪙', title:'L\'or : valeur refuge en temps de crise',  sub:'Historiquement stable lors des turbulences', tag:'neutral' },
  { emoji:'💡', title:'Les ETF permettent de tout posséder',       sub:'S&P 500 ETF = 500 entreprises en 1 achat', tag:'bull' },
  { emoji:'🔄', title:'Réinvestir les dividendes accélère la croissance', sub:'Intérêts composés = la 8e merveille du monde', tag:'bull' },
];

async function fetchMarketNews() {
  const now = Date.now();
  if (_newsCache && now - _newsCacheTime < NEWS_CACHE_MS) return _newsCache;

  try {
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(NEWS_FEEDS[0])}&api_key=public&count=6`;
    const res  = await fetch(url);
    const json = await res.json();
    if (json.status === 'ok' && json.items?.length) {
      const items = json.items.slice(0, 5).map(item => ({
        emoji:   '📰',
        title:   item.title.substring(0, 80),
        sub:     item.pubDate ? new Date(item.pubDate).toLocaleDateString('fr-FR', {day:'numeric',month:'short'}) : '',
        link:    item.link,
        tag:     _classifyNews(item.title),
      }));
      _newsCache = items;
      _newsCacheTime = now;
      return items;
    }
  } catch(e) {}

  // Fallback: curated finance tips (always valuable)
  _newsCache = NEWS_FALLBACK.sort(()=>Math.random()-.5).slice(0, 5);
  _newsCacheTime = now;
  return _newsCache;
}

function _classifyNews(title) {
  const t = title.toLowerCase();
  if (/rise|gain|high|bull|rally|up|surges?|jump|growth/.test(t)) return 'bull';
  if (/fall|drop|loss|bear|crash|down|plunge|decline|fear/.test(t)) return 'bear';
  return 'neutral';
}

async function renderMarketNews() {
  const el = document.getElementById('market-news-strip');
  if (!el) return;

  el.innerHTML = `<div class="news-strip"><div class="news-header">${t('news_title')} <span style="color:var(--muted);font-weight:400;font-size:.7rem;">10 min</span></div><div style="padding:10px 14px;font-size:.75rem;color:var(--muted);">${t('news_loading')}</div></div>`;

  const news = await fetchMarketNews();

  el.innerHTML = `<div class="news-strip">
    <div class="news-header">📰 Actualités marché <span style="color:var(--muted);font-weight:400;font-size:.7rem;">• mis à jour 10min</span></div>
    ${news.map(n => `
      <div class="news-item" onclick="${n.link ? `window.open('${n.link}','_blank')` : ''}">
        <div class="news-emoji">${n.emoji}</div>
        <div class="news-body">
          <div class="news-title">${n.title}<span class="news-tag news-${n.tag}">${n.tag==='bull'?t('news_bull'):n.tag==='bear'?t('news_bear'):t('news_neutral')}</span></div>
          ${n.sub ? `<div class="news-sub">${n.sub}</div>` : ''}
        </div>
      </div>`).join('')}
  </div>`;
}
