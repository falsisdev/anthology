/**
 * Anthology - AnimeciX Provider
 * Anime Dizi ve Film destekler
 */

var BASE_URL = 'https://animecix.tv';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
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
  const isTV = mediaType === 'tv' || mediaType === 'series';
  const tmdbType = isTV ? 'tv' : 'movie';

  try {
    const tmdbRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
    const d = await tmdbRes.json();
    const title = d.name || d.title || '';
    const origTitle = d.original_name || d.original_title || '';
    const s = parseInt(seasonNum) || 1;
    const e = parseInt(episodeNum) || 1;

    const searchQuery = origTitle || title;
    const searchUrl = `${BASE_URL}/secure/search/${encodeURIComponent(searchQuery)}?type=all&limit=5`;
    const searchRes = await fetch(searchUrl, { headers: HEADERS });
    if (!searchRes.ok) return [];

    const searchData = await searchRes.json();
    const results = searchData.results || [];
    if (results.length === 0) return [];

    const best = results[0];
    const detailUrl = `${BASE_URL}/secure/titles/${best.id}?title_id=${best.id}`;
    const detailRes = await fetch(detailUrl, { headers: HEADERS });
    if (!detailRes.ok) return [];

    const detailData = await detailRes.json();
    const videos = (detailData.title && detailData.title.videos) || [];
    const streams = [];

    for (const v of videos) {
      if (isTV) {
        if (parseInt(v.season_num) !== s || parseInt(v.episode_num) !== e) continue;
      }
      if (v.url) {
        streams.push({
          name: `${title || origTitle}${isTV ? ` S${s}E${e}` : ''}`,
          title: `⌜ Anthology ⌟ | AnimeciX [${v.quality || 'HD'}] (${v.name || 'Video'})`,
          url: v.url,
          quality: v.quality || 'HD',
          headers: HEADERS
        });
      }
    }
    return streams;
  } catch (err) {
    return [];
  }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
