// ══════════════════════════════════════════════════════════════
// /api/tts — Vercel serverless TTS proxy
// Proxies Google Translate TTS server-side so no CORS issues
// Usage: /api/tts?text=Ahoj&lang=cs
// ══════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  const { text, lang } = req.query;

  if (!text || !lang) {
    res.status(400).json({ error: 'Missing text or lang' });
    return;
  }

  // Sanitise
  const safeLang = String(lang).replace(/[^a-z-]/gi, '').slice(0, 10);
  const safeText = String(text).slice(0, 300);

  const url =
    'https://translate.google.com/translate_tts' +
    '?ie=UTF-8' +
    '&q='       + encodeURIComponent(safeText) +
    '&tl='      + encodeURIComponent(safeLang) +
    '&client=gtx' +
    '&ttsspeed=0.8';

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer':    'https://translate.google.com/',
        'Accept':     'audio/mpeg, audio/*',
      },
    });

    if (!upstream.ok) {
      res.status(upstream.status).end();
      return;
    }

    const audio = await upstream.arrayBuffer();

    res.setHeader('Content-Type',  'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24h
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from(audio));

  } catch (e) {
    console.error('TTS proxy error:', e);
    res.status(500).end();
  }
}
