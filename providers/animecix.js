/**
 * Anthology - AnimeciX Provider
 * Anime dizi ve filmleri için doğrudan TauVideo MP4 akışları sunar.
 */

var BASE_URL = 'https://animecix.tv';
var XEH_KEY = '7Y2ozlO+QysR5w9Q6Tupmtvl9jJp7ThFH8SB+Lo7NvZjgjqRSqOgcT2v4ISM9sP10LmnlYI8WQ==.xrlyOBFS5BHjQ2Lk';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referer': BASE_URL + '/',
  'x-e-h': XEH_KEY
};

async function resolveTmdbInfo(id, mediaType) {
  try {
    let cleanId = String(id || '').trim();
    if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];

    let numericId = null;
    let title = '';
    let origTitle = '';

    if (cleanId.startsWith('tt')) {
      const findRes = await fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
      if (findRes.ok) {
        const fData = await findRes.json();
        const item = (mediaType === 'tv' || mediaType === 'series')
          ? (fData.tv_results && fData.tv_results[0])
          : (fData.movie_results && fData.movie_results[0]);
        if (item) {
          numericId = item.id;
          title = item.name || item.title || '';
          origTitle = item.original_name || item.original_title || '';
        }
      }
    } else {
      numericId = cleanId;
    }

    if (numericId && (!title || !origTitle)) {
      const type = (mediaType === 'tv' || mediaType === 'series') ? 'tv' : 'movie';
      const tRes = await fetch(`https://api.themoviedb.org/3/${type}/${numericId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
      if (tRes.ok) {
        const tData = await tRes.json();
        title = tData.name || tData.title || title;
        origTitle = tData.original_name || tData.original_title || origTitle;
      }
    }

    return { title, origTitle, numericId };
  } catch (e) {
    return { title: '', origTitle: '', numericId: id };
  }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  try {
    const isTv = (mediaType === 'tv' || mediaType === 'series');
    const season = parseInt(seasonNum) || 1;
    const episode = parseInt(episodeNum) || 1;

    const info = await resolveTmdbInfo(tmdbId, mediaType);
    const queries = [info.title, info.origTitle].filter(Boolean);
    if (queries.length === 0) return [];

    let matchedItem = null;

    for (const q of queries) {
      const searchRes = await fetch(`${BASE_URL}/secure/search/${encodeURIComponent(q)}?limit=10`, { headers: HEADERS });
      if (!searchRes.ok) continue;
      const sData = await searchRes.json();
      if (sData.results && sData.results.length > 0) {
        // Find closest match or exact ID match
        for (const item of sData.results) {
          if (info.numericId && String(item.tmdb_id) === String(info.numericId)) {
            matchedItem = item;
            break;
          }
        }
        if (!matchedItem) matchedItem = sData.results[0];
        break;
      }
    }

    if (!matchedItem) return [];

    let videoUrl = isTv
      ? `${BASE_URL}/secure/best-video?titleId=${matchedItem.id}&episode=${episode}&season=${season}`
      : `${BASE_URL}/secure/best-video?titleId=${matchedItem.id}&episode=1&season=1`;

    const bestRes = await fetch(videoUrl, { headers: HEADERS, redirect: 'follow' });
    const finalUrl = bestRes.url || '';

    const m = finalUrl.match(/tau-video\.xyz\/embed\/([a-zA-Z0-9_-]+)/);
    if (!m) return [];

    const tauId = m[1];
    const tauRes = await fetch(`https://tau-video.xyz/api/video/${tauId}`, {
      headers: {
        'User-Agent': HEADERS['User-Agent'],
        'Referer': BASE_URL + '/'
      }
    });
    if (!tauRes.ok) return [];

    const tauData = await tauRes.json();
    if (!tauData.urls || tauData.urls.length === 0) return [];

    const displayTitle = isTv ? `${matchedItem.name} S${season}E${episode}` : matchedItem.name;

    return tauData.urls.map(u => ({
      name: displayTitle,
      title: `⌜ AnimeciX ⌟ | TauVideo [${u.label || 'HD'}]`,
      url: u.url,
      quality: u.label || '1080p',
      provider: 'animecix',
      headers: {
        'User-Agent': HEADERS['User-Agent'],
        'Referer': BASE_URL + '/'
      }
    }));
  } catch (err) {
    return [];
  }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
