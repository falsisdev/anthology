const { sortStreamsByQuality } = require("../shared/quality.js");
const { loadConfig, val, wrapAll } = require("../shared/config.js");

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v;
            v = val('urls.anime.animecix.base'); if (v) BASE_URL = String(v).replace(/\/+$/, '');
            if (HEADERS) HEADERS.Referer = BASE_URL + '/';
        });
    }
    return _cfgReady;
}

/**
 * Anthology - AnimeciX Provider
 * Anime dizi ve filmleri için doğrudan TauVideo MP4 akışları sunar.
 */

var BASE_URL = 'https://animecix.tv';
var XEH_KEY = '7Y2ozlO+QysR5w9Q6Tupmtvl9jJp7ThFH8SB+Lo7NvZjgjqRSqOgcT2v4ISM9sP10LmnlYI8WQ==.xrlyOBFS5BHjQ2Lk';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referer': BASE_URL + '/',
  'x-e-h': XEH_KEY
};

function ultraClean(str) {
  if (!str) return '';
  return str.toString().toLowerCase()
    .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

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
    if (typeof tmdbId === 'object' && tmdbId && tmdbId.id) {
      return getStreams(tmdbId.id, mediaType || 'tv', seasonNum, episodeNum);
    }
    const isTv = (mediaType === 'tv' || mediaType === 'series' || !mediaType);
    const season = parseInt(seasonNum) || 1;
    const episode = parseInt(episodeNum) || 1;

    if (typeof tmdbId === 'string' && tmdbId.startsWith('animecix:title:')) {
      const showMeta = await getMeta(tmdbId);
      if (showMeta && showMeta.meta && Array.isArray(showMeta.meta.videos) && showMeta.meta.videos.length > 0) {
        return await getStreams(showMeta.meta.videos[0].id);
      }
    }

    if (typeof tmdbId === 'string' && tmdbId.startsWith('animecix:ep:')) {
      const parts = tmdbId.replace('animecix:ep:', '').split(':');
      const titleId = parts[0];
      const targetSeason = parseInt(parts[1]) || season;
      const targetEp = parseInt(parts[2]) || episode;
      const videoUrl = `${BASE_URL}/secure/best-video?titleId=${titleId}&episode=${targetEp}&season=${targetSeason}`;
      const bestRes = await fetch(videoUrl, { headers: HEADERS, redirect: 'follow' });
      const finalUrl = bestRes.url || '';
      const m = finalUrl.match(/tau-video\.xyz\/embed\/([a-zA-Z0-9_-]+)/);
      if (!m) return [];
      const tauId = m[1];
      const tauRes = await fetch(`https://tau-video.xyz/api/video/${tauId}`, {
        headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': BASE_URL + '/' }
      });
      if (!tauRes.ok) return [];
      const tauData = await tauRes.json();
      if (!tauData.urls || tauData.urls.length === 0) return [];
      return tauData.urls.map(u => ({
        name: 'AnimeciX',
        title: `⌜ AnimeciX ⌟ | TauVideo [${u.label || 'HD'}]`,
        url: u.url,
        quality: u.label || '1080p',
        provider: 'animecix',
        headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': BASE_URL + '/' }
      }));
    }

    if (typeof tmdbId === 'string' && tmdbId.startsWith('animecix:title:')) {
      const titleId = tmdbId.replace('animecix:title:', '');
      const videoUrl = `${BASE_URL}/secure/best-video?titleId=${titleId}&episode=${episode}&season=${season}`;
      const bestRes = await fetch(videoUrl, { headers: HEADERS, redirect: 'follow' });
      const finalUrl = bestRes.url || '';
      const m = finalUrl.match(/tau-video\.xyz\/embed\/([a-zA-Z0-9_-]+)/);
      if (!m) return [];
      const tauId = m[1];
      const tauRes = await fetch(`https://tau-video.xyz/api/video/${tauId}`, {
        headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': BASE_URL + '/' }
      });
      if (!tauRes.ok) return [];
      const tauData = await tauRes.json();
      if (!tauData.urls || tauData.urls.length === 0) return [];
      return tauData.urls.map(u => ({
        name: 'AnimeciX',
        title: `⌜ AnimeciX ⌟ | TauVideo [${u.label || 'HD'}]`,
        url: u.url,
        quality: u.label || '1080p',
        provider: 'animecix',
        headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': BASE_URL + '/' }
      }));
    }

    const info = await resolveTmdbInfo(tmdbId, mediaType);
    const queries = [info.title, info.origTitle].filter(Boolean);
    if (queries.length === 0) return [];

    let matchedItem = null;

    for (const q of queries) {
      const searchRes = await fetch(`${BASE_URL}/secure/search/${encodeURIComponent(q)}?limit=10`, { headers: HEADERS });
      if (!searchRes.ok) continue;
      const sData = await searchRes.json();
      if (sData.results && sData.results.length > 0) {
        const qClean = ultraClean(q);
        for (const item of sData.results) {
          // Exact TMDB ID match — always accept
          if (info.numericId && String(item.tmdb_id) === String(info.numericId)) {
            matchedItem = item;
            break;
          }
          // Title similarity check — only accept if names actually match
          const itemClean = ultraClean(item.name || '');
          if (qClean && itemClean && (itemClean.includes(qClean) || qClean.includes(itemClean))) {
            matchedItem = item;
            break;
          }
        }
        if (matchedItem) break;
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

    const aHeaders = {
      'User-Agent': HEADERS['User-Agent'],
      'Referer': BASE_URL + '/'
    };
    return tauData.urls.map(u => ({
      name: displayTitle,
      title: `⌜ AnimeciX ⌟ | TauVideo [${u.label || 'HD'}]`,
      url: u.url,
      quality: u.label || '1080p',
      provider: 'animecix',
      headers: aHeaders,
      behaviorHints: {
        notWebReady: true,
        proxyHeaders: {
          request: aHeaders
        }
      }
    }));
  } catch (err) {
    return [];
  }
}

// ── Universal Quality Sorter ──────────────────────────────────────────
if (typeof getStreams === "function") {
    var _origGetStreams = getStreams;
    getStreams = async function() {
        var res = await _origGetStreams.apply(this, arguments);
        return sortStreamsByQuality(res);
    };
}

if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;

// ── Catalog & Meta Entegrasyonu ──────────────────────────────
async function getCatalog(args) {
  try {
    const query = (args && args.search) || (args && args.extra && args.extra.search) || (args && args.query) || '';
    let items = [];

    if (query) {
      const res = await fetch(`${BASE_URL}/secure/search/${encodeURIComponent(query)}?limit=20`, { headers: HEADERS });
      if (res.ok) {
        const data = await res.json();
        items = data.results || [];
      }
    } else {
      const res = await fetch(`${BASE_URL}/secure/titles?limit=20`, { headers: HEADERS });
      if (res.ok) {
        const data = await res.json();
        items = (data.pagination && data.pagination.data) || [];
      }
    }

    const metas = items.map(item => ({
      id: `animecix:title:${item.id}`,
      type: 'tv',
      name: item.name,
      poster: item.poster || 'https://www.google.com/s2/favicons?domain=animecix.tv&sz=128',
      background: item.backdrop || item.poster || 'https://www.google.com/s2/favicons?domain=animecix.tv&sz=128',
      description: item.description || `${item.name} - AnimeciX`,
      genres: ['Anime', 'AnimeciX']
    }));

    return { metas };
  } catch (e) {
    return { metas: [] };
  }
}

async function getMeta(args) {
  try {
    const rawId = (typeof args === 'string') ? args : (args && args.id ? args.id : '');
    if (!rawId || !rawId.startsWith('animecix:title:')) return { meta: null };

    const titleId = rawId.replace('animecix:title:', '');
    const dRes = await fetch(`${BASE_URL}/secure/titles/${titleId}`, { headers: HEADERS });
    if (!dRes.ok) return { meta: null };
    const dData = await dRes.json();
    const titleObj = dData.title || {};

    const name = titleObj.name || titleObj.name_english || 'Anime';
    const poster = titleObj.poster || 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';
    const bg = titleObj.backdrop || poster;
    const desc = titleObj.description || `${name} - AnimeciX`;

    const videos = [];
    const seasons = titleObj.seasons || [];

    if (seasons.length > 0) {
      seasons.forEach(s => {
        const sNum = (s.number !== undefined && s.number !== null && !isNaN(parseInt(s.number))) ? parseInt(s.number) : 1;
        const epCount = parseInt(s.episode_count) || 0;
        for (let ep = 1; ep <= epCount; ep++) {
          videos.push({
            id: `animecix:ep:${titleId}:${sNum}:${ep}`,
            title: `${name} ${sNum}. Sezon ${ep}. Bölüm`,
            season: sNum,
            episode: ep
          });
        }
      });
    }

    if (videos.length === 0) {
      const epCount = parseInt(titleObj.episode_count) || 1;
      for (let ep = 1; ep <= epCount; ep++) {
        videos.push({
          id: `animecix:ep:${titleId}:1:${ep}`,
          title: `${name} ${ep}. Bölüm`,
          season: 1,
          episode: ep
        });
      }
    }

    return {
      meta: {
        id: rawId,
        type: 'tv',
        name,
        poster,
        background: bg,
        description: desc,
        genres: ['Anime', 'AnimeciX'],
        videos
      }
    };
  } catch (e) {
    return { meta: null };
  }
}

if (typeof module !== 'undefined') {
  module.exports = wrapAll({ getStreams, getCatalog, getMeta }, cfgReady);
}
if (typeof globalThis !== 'undefined') {
  globalThis.getStreams = getStreams;
  globalThis.getCatalog = getCatalog;
  globalThis.getMeta = getMeta;
}
