/**
 * Anthology - Dizibox Provider
 * Sadece Dizi (TV) destekler
 */

var BASE_URL = 'https://www.dizibox.live';
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

async function extractEmbed(embedUrl, referer) {
  if (!embedUrl) return null;
  try {
    if (embedUrl.includes('vidmoly')) {
      const res = await fetch(embedUrl, { headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': referer } });
      const text = await res.text();
      const match = text.match(/file:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/i) || text.match(/sources:\s*\[\{\s*file:\s*["']([^"']+)["']/i);
      if (match) return { url: match[1], quality: 'HD' };
    } else if (embedUrl.includes('sibnet')) {
      const res = await fetch(embedUrl, { headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': referer } });
      const text = await res.text();
      const match = text.match(/["'](\/v\/[^"']+\.mp4)["']/i) || text.match(/src:\s*["']([^"']+\.mp4)["']/i);
      if (match) {
        const direct = match[1].startsWith('http') ? match[1] : 'https://video.sibnet.ru' + match[1];
        return { url: direct, quality: 'HD', headers: { 'Referer': embedUrl } };
      }
    }
  } catch (e) {}
  return { url: embedUrl, quality: 'Auto' };
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
      const epUrls = [
        `${BASE_URL}/${slug}-${s}-sezon-${e}-bolum-izle/`,
        `${BASE_URL}/${slug}-${s}-sezon-${e}-bolum/`
      ];

      for (const epUrl of epUrls) {
        try {
          const res = await fetch(epUrl, { headers: HEADERS });
          if (!res.ok) continue;
          const html = await res.text();

          const iframes = [];
          const iframeRe = /<iframe[^>]+src=["']([^"']+)["']/gi;
          let m;
          while ((m = iframeRe.exec(html)) !== null) {
            let src = m[1];
            if (src.startsWith('//')) src = 'https:' + src;
            if (src.startsWith('http') && !src.includes('google') && !src.includes('facebook') && !src.includes('disqus')) {
              iframes.push(src);
            }
          }

          for (const iframeSrc of iframes) {
            const extracted = await extractEmbed(iframeSrc, epUrl);
            if (extracted && extracted.url) {
              streams.push({
                name: `${title || origTitle} S${s}E${e}`,
                title: `⌜ Anthology ⌟ | Dizibox [${extracted.quality}]`,
                url: extracted.url,
                quality: extracted.quality,
                headers: extracted.headers || HEADERS
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
