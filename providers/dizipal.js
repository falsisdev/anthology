/**
 * Anthology - Dizipal Provider
 * Dizi ve Film destekler
 */

var CANDIDATE_DOMAINS = [
  'https://dizipal2124.com',
  'https://dizipal2123.com',
  'https://dizipal2125.com',
  'https://dizipal2122.com'
];
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

function normalizeTurkish(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  const isTV = mediaType === 'tv' || mediaType === 'series';
  const tmdbType = isTV ? 'tv' : 'movie';

  try {
    const tmdbRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
    const d = await tmdbRes.json();
    const title = d.name || d.title || '';
    const origTitle = d.original_name || d.original_title || '';
    const s = parseInt(seasonNum) || 1;
    const e = parseInt(episodeNum) || 1;

    const slugs = [normalizeTurkish(origTitle), normalizeTurkish(title)].filter(Boolean);
    const streams = [];

    for (const domain of CANDIDATE_DOMAINS) {
      for (const slug of slugs) {
        const targetUrl = isTV ? `${domain}/dizi/${slug}/sezon-${s}/bolum-${e}` : `${domain}/film/${slug}`;
        try {
          const res = await fetch(targetUrl, { headers: { ...HEADERS, 'Referer': domain + '/' } });
          if (!res.ok) continue;
          const html = await res.text();

          const videoRe = /<iframe[^>]+src=["']([^"']+)["']/gi;
          let m;
          while ((m = videoRe.exec(html)) !== null) {
            let src = m[1];
            if (src.startsWith('//')) src = 'https:' + src;
            if (src.startsWith('http') && !src.includes('google') && !src.includes('disqus')) {
              streams.push({
                name: `${title || origTitle}${isTV ? ` S${s}E${e}` : ''}`,
                title: `⌜ Anthology ⌟ | Dizipal [HD]`,
                url: src,
                quality: 'HD',
                headers: { ...HEADERS, 'Referer': domain + '/' }
              });
            }
          }
          if (streams.length > 0) return streams;
        } catch (err) {}
      }
    }
    return streams;
  } catch (err) {
    return [];
  }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
