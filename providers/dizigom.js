/**
 * Anthology - Dizigom Provider
 * Sadece Dizi (TV) destekler
 */

var BASE_URL = 'https://www.dizigom1.com';
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

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  if (mediaType !== 'tv') return [];

  try {
    const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
    const d = await tmdbRes.json();
    const title = d.name || '';
    const origTitle = d.original_name || '';
    const s = parseInt(seasonNum) || 1;
    const e = parseInt(episodeNum) || 1;

    const slugs = [normalizeTurkish(origTitle), normalizeTurkish(title)].filter(Boolean);
    const streams = [];

    for (const slug of slugs) {
      const epUrl = `${BASE_URL}/${slug}-${s}-sezon-${e}-bolum-izle/`;
      try {
        const res = await fetch(epUrl, { headers: HEADERS });
        if (!res.ok) continue;
        const html = await res.text();

        const videoRe = /<iframe[^>]+src=["']([^"']+)["']/gi;
        let m;
        while ((m = videoRe.exec(html)) !== null) {
          let src = m[1];
          if (src.startsWith('//')) src = 'https:' + src;
          if (src.startsWith('http') && !src.includes('google') && !src.includes('disqus')) {
            streams.push({
              name: `${title || origTitle} S${s}E${e}`,
              title: `⌜ Anthology ⌟ | Dizigom [HD]`,
              url: src,
              quality: 'HD',
              headers: HEADERS
            });
          }
        }
        if (streams.length > 0) return streams;
      } catch (err) {}
    }
    return streams;
  } catch (err) {
    return [];
  }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
