/**
 * Anthology - FilmMakinesi Provider
 * Sadece Film destekler
 */

var BASE_URL = 'https://filmmakinesi.to';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Referer': BASE_URL + '/'
};

function normalizeTurkish(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function getStreams(tmdbId, mediaType) {
  if (mediaType === 'tv' || mediaType === 'series') return [];

  try {
    const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
    const d = await tmdbRes.json();
    const title = d.title || '';
    const origTitle = d.original_title || '';

    const slugs = [normalizeTurkish(title), normalizeTurkish(origTitle)].filter(Boolean);
    const streams = [];

    for (const slug of slugs) {
      const filmUrls = [`${BASE_URL}/${slug}-izle/`, `${BASE_URL}/${slug}/`];
      for (const filmUrl of filmUrls) {
        try {
          const res = await fetch(filmUrl, { headers: HEADERS });
          if (!res.ok) continue;
          const html = await res.text();

          const videoRe = /<iframe[^>]+src=["']([^"']+)["']/gi;
          let m;
          while ((m = videoRe.exec(html)) !== null) {
            let src = m[1];
            if (src.startsWith('//')) src = 'https:' + src;
            if (src.startsWith('http') && !src.includes('google') && !src.includes('disqus')) {
              streams.push({
                name: title || origTitle,
                title: `⌜ Anthology ⌟ | FilmMakinesi [1080p]`,
                url: src,
                quality: '1080p',
                headers: HEADERS
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
