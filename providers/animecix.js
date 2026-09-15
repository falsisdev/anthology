/**
 * Anthology - AnimeciX Provider
 * Anime dizi ve filmleri için doğrudan TauVideo MP4 akışları sunar.
 */

var CONFIG = (typeof require !== 'undefined' ? (function(){ try { return require('./config'); } catch(e) { return require('./urls'); } })() : null) || (typeof globalThis !== 'undefined' ? (globalThis.CONFIG || globalThis.URLS) : null) || {};
var URLS = CONFIG.urls || CONFIG;
var BASE_URL = (URLS.animecix && URLS.animecix.base) || 'https://animecix.tv';
var XEH_KEY = (CONFIG.api_keys && CONFIG.api_keys.animecix_xeh) || '7Y2ozlO+QysR5w9Q6Tupmtvl9jJp7ThFH8SB+Lo7NvZjgjqRSqOgcT2v4ISM9sP10LmnlYI8WQ==.xrlyOBFS5BHjQ2Lk';
var TMDB_API_KEY = (CONFIG.api_keys && CONFIG.api_keys.tmdb) || '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referer': BASE_URL + '/',
  'x-e-h': XEH_KEY
};

function timeoutSignal(ms) {
  try {
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) return AbortSignal.timeout(ms);
  } catch (e) {}
  return undefined;
}

// String.prototype.normalize olmayan ortamlar icin ascii fold (NFD yoksa TF-FR-de yoksa duz)
var tkNormalizeMap = { a: 0xE0 | 0, e: 0xE8 | 0, i: 0xEC | 0, o: 0xF2 | 0, u: 0xF9 | 0, n: 0xF1 | 0 };
function asciiFold(str) {
  if (!str) return '';
  var s = str.toString();
  if (typeof s.normalize === 'function') {
    try { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, ''); } catch (e) {}
  }
  var out = '';
  for (var i = 0; i < s.length; i++) {
    var ch = s[i];
    var lower = ch.toLowerCase();
    if (/[\u00E0-\u00FF]/.test(lower)) {
      var code = lower.charCodeAt(0);
      var base = lower;
      if (code >= 0xE0 && code <= 0xE5) base = 'a';
      else if (code >= 0xE8 && code <= 0xEB) base = 'e';
      else if (code >= 0xEC && code <= 0xEF) base = 'i';
      else if (code >= 0xF2 && code <= 0xF6) base = 'o';
      else if (code >= 0xF9 && code <= 0xFC) base = 'u';
      else if (code === 0xF1) base = 'n';
      else if (code === 0xE7) base = 'c';
      out += base;
    } else if (/[a-z0-9]/.test(lower)) {
      out += lower;
    }
  }
  return out;
}

function ultraClean(str) {
  return asciiFold(str).replace(/[^a-z0-9]/g, '');
}

function formatTauStreams(urls, displayTitle, headers) {
  if (!Array.isArray(urls) || urls.length === 0) return [];
  var qualityWeight = function(q) {
    if (!q) return 100;
    var s = String(q).toLowerCase();
    if (s.includes('2160') || s.includes('4k')) return 4000;
    if (s.includes('1080')) return 1080;
    if (s.includes('720')) return 720;
    if (s.includes('480')) return 480;
    return 100;
  };

  // Filter out dead/blocked domains like yhwach.icu (returns 404)
  var valid = urls.filter(function(u) {
    return u && u.url && !u.url.includes('yhwach.icu');
  });
  var list = valid.length > 0 ? valid : urls;

  var mapped = list.map(function(u) {
    return {
      name: displayTitle,
      title: '⌜ AnimeciX ⌟ | TauVideo [' + (u.label || 'HD') + ']',
      url: u.url,
      quality: u.label || '1080p',
      provider: 'animecix',
      headers: headers,
      behaviorHints: {
        notWebReady: true,
        proxyHeaders: {
          request: headers
        }
      }
    };
  });

  return mapped.sort(function(a, b) {
    return qualityWeight(b.quality) - qualityWeight(a.quality);
  });
}

async function resolveVidmoly(embedUrl, referer) {
  try {
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': HEADERS['User-Agent'],
        'Referer': referer || 'https://vidmoly.biz/'
      }
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/file\s*:\s*['"](https?:\/\/[^'"<>]+\.m3u8[^'"<>]*)['"]/i);
    if (m) {
      return {
        url: m[1],
        headers: {
          'User-Agent': HEADERS['User-Agent'],
          'Referer': 'https://vidmoly.biz/'
        }
      };
    }
  } catch (e) {}
  return null;
}

async function resolveKitsu(kitsuId) {
  try {
    const cleanId = String(kitsuId).replace(/^kitsu:/, '').split(':')[0];
    const res = await fetch(`https://kitsu.io/api/edge/anime/${cleanId}`);
    if (!res.ok) return null;
    const data = await res.json();
    const attr = data && data.data && data.data.attributes;
    if (!attr) return null;
    const titles = [];
    if (attr.titles) {
      if (attr.titles.en_jp) titles.push(attr.titles.en_jp);
      if (attr.titles.en) titles.push(attr.titles.en);
      if (attr.titles.en_us) titles.push(attr.titles.en_us);
    }
    if (attr.canonicalTitle && !titles.includes(attr.canonicalTitle)) {
      titles.push(attr.canonicalTitle);
    }
    if (Array.isArray(attr.abbreviatedTitles)) {
      titles.push(...attr.abbreviatedTitles);
    }
    return {
      title: attr.canonicalTitle || titles[0] || '',
      origTitle: (attr.titles && attr.titles.en_jp) || titles[0] || '',
      queries: [...new Set(titles.filter(Boolean))]
    };
  } catch (e) {
    return null;
  }
}

async function resolveMediaInfo(idOrObj, mediaType, defaultSeason, defaultEpisode) {
  let id = idOrObj;
  let type = mediaType || 'tv';
  let season = parseInt(defaultSeason) || 1;
  let episode = parseInt(defaultEpisode) || 1;

  if (typeof idOrObj === 'object' && idOrObj !== null) {
    id = idOrObj.id || idOrObj.imdbId || idOrObj.tmdbId || '';
    type = idOrObj.type || type;
    if (idOrObj.season !== undefined) season = parseInt(idOrObj.season) || season;
    if (idOrObj.episode !== undefined) episode = parseInt(idOrObj.episode) || episode;
  }

  id = String(id || '').trim();
  const isTv = (type === 'tv' || type === 'series');

  if (id.includes(':')) {
    const parts = id.split(':');
    if (id.startsWith('kitsu:')) {
      season = 1;
      episode = parts.length >= 3 ? (parseInt(parts[2]) || 1) : (parseInt(parts[1]) || 1);
    } else {
      if (parts.length >= 3) {
        season = parseInt(parts[parts.length - 2]) || season;
        episode = parseInt(parts[parts.length - 1]) || episode;
      } else if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
        episode = parseInt(parts[1]) || episode;
      }
    }
  }

  if (id.startsWith('kitsu:')) {
    const kitsuData = await resolveKitsu(id);
    if (kitsuData) {
      return {
        numericId: null,
        title: kitsuData.title,
        origTitle: kitsuData.origTitle,
        queries: kitsuData.queries,
        season,
        episode,
        isTv
      };
    }
  }

  let cleanId = id;
  if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];

  let numericId = null;
  let title = '';
  let origTitle = '';
  const queries = [];

  if (cleanId.startsWith('tt')) {
    try {
      const fRes = await fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
      if (fRes.ok) {
        const fData = await fRes.json();
        const item = isTv ? (fData.tv_results && fData.tv_results[0]) : (fData.movie_results && fData.movie_results[0]);
        if (item) {
          numericId = item.id;
          title = item.name || item.title || '';
          origTitle = item.original_name || item.original_title || '';
        } else {
          const revItem = isTv ? (fData.movie_results && fData.movie_results[0]) : (fData.tv_results && fData.tv_results[0]);
          if (revItem) {
            numericId = revItem.id;
            title = revItem.name || revItem.title || '';
            origTitle = revItem.original_name || revItem.original_title || '';
          }
        }
      }
    } catch (e) {}
  } else if (!isNaN(parseInt(cleanId))) {
    numericId = parseInt(cleanId);
  }

  if (numericId) {
    const endpointType = isTv ? 'tv' : 'movie';
    try {
      const [resEn, resTr] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/${endpointType}/${numericId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=alternative_titles`),
        fetch(`https://api.themoviedb.org/3/${endpointType}/${numericId}?api_key=${TMDB_API_KEY}&language=tr-TR`)
      ]);

      let dataEn = resEn.ok ? await resEn.json() : null;
      let dataTr = resTr.ok ? await resTr.json() : null;

      if (!dataEn && !dataTr && isTv) {
        const mRes = await fetch(`https://api.themoviedb.org/3/movie/${numericId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=alternative_titles`);
        if (mRes.ok) dataEn = await mRes.json();
      }

      if (dataEn) {
        const normalizeTitle = (str) => {
          if (!str) return '';
          return asciiFold(str).trim();
        };

        const nameEn = dataEn.name || dataEn.title || '';
        if (nameEn) queries.push(nameEn);
        const origName = dataEn.original_name || dataEn.original_title || '';
        if (origName) {
          const cleanOrig = normalizeTitle(origName);
          if (cleanOrig && /^[a-zA-Z0-9\s:;.,'\"!?-]+$/.test(cleanOrig) && !queries.includes(cleanOrig)) {
            queries.push(cleanOrig);
          }
        }
        title = nameEn || title;
        origTitle = origName || origTitle;

        const alts = dataEn.alternative_titles ? (dataEn.alternative_titles.results || dataEn.alternative_titles.titles || []) : [];
        for (const a of alts) {
          const rawT = a.title || a.name || '';
          if (!rawT) continue;
          const t = normalizeTitle(rawT);
          if (t && /^[a-zA-Z0-9\s:;.,'\"!?-]+$/.test(t) && !queries.includes(t)) {
            queries.push(t);
          }
        }
      }

      if (dataTr) {
        const nameTr = dataTr.name || dataTr.title || '';
        if (nameTr && !queries.includes(nameTr)) {
          queries.push(nameTr);
        }
      }
    } catch (e) {}
  }

  return {
    numericId,
    title,
    origTitle,
    queries: [...new Set(queries.filter(Boolean))],
    season,
    episode,
    isTv
  };
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  try {
    if (typeof tmdbId === 'object' && tmdbId !== null) {
      const obj = tmdbId;
      return getStreams(
        obj.id || obj.imdbId || obj.tmdbId,
        mediaType || obj.type,
        seasonNum !== undefined ? seasonNum : obj.season,
        episodeNum !== undefined ? episodeNum : obj.episode
      );
    }

    if (typeof tmdbId === 'string' && tmdbId.startsWith('animecix:title:')) {
      const showMeta = await getMeta(tmdbId);
      if (showMeta && showMeta.meta && Array.isArray(showMeta.meta.videos) && showMeta.meta.videos.length > 0) {
        return await getStreams(showMeta.meta.videos[0].id);
      }
    }

    if (typeof tmdbId === 'string' && tmdbId.startsWith('animecix:ep:')) {
      const parts = tmdbId.replace('animecix:ep:', '').split(':');
      const titleId = parts[0];
      const targetSeason = parseInt(parts[1]) || 1;
      const targetEp = parseInt(parts[2]) || 1;
      const videoUrl = `${BASE_URL}/secure/best-video?titleId=${titleId}&episode=${targetEp}&season=${targetSeason}`;
      const bestRes = await fetch(videoUrl, { headers: HEADERS, redirect: 'follow', signal: timeoutSignal(5000) });
      const finalUrl = bestRes.url || '';
      const m = finalUrl.match(/tau-video\.xyz\/embed\/([a-zA-Z0-9_-]+)/);
      if (!m) return [];
      const tauId = m[1];
      const tauRes = await fetch(`https://tau-video.xyz/api/video/${tauId}`, {
        headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': BASE_URL + '/' },
        signal: timeoutSignal(5000)
      });
      if (!tauRes.ok) return [];
      let tauData;
      try { tauData = await tauRes.json(); } catch(e) { return []; }
      if (!tauData || !tauData.urls || tauData.urls.length === 0) return [];
      return formatTauStreams(tauData.urls, 'AnimeciX', { 'User-Agent': HEADERS['User-Agent'], 'Referer': BASE_URL + '/' });
    }

    const info = await resolveMediaInfo(tmdbId, mediaType, seasonNum, episodeNum);
    const queries = info.queries;
    if (!queries || queries.length === 0) return [];

    let matchedItem = null;

    for (const q of queries.slice(0, 10)) {
      try {
        const searchRes = await fetch(`${BASE_URL}/secure/search/${encodeURIComponent(q)}?limit=15`, { headers: HEADERS, signal: timeoutSignal(5000) });
        if (!searchRes.ok) continue;
        const sData = await searchRes.json();
        const results = sData.results || [];
        if (!results.length) continue;

        // 1. Exact numeric TMDB ID match
        if (info.numericId) {
          const exact = results.find(r => String(r.tmdb_id) === String(info.numericId));
          if (exact) {
            matchedItem = exact;
            break;
          }
        }

        // 2. Exact clean title match (romanji/english dahil; Live Action hariç)
        const qClean = ultraClean(q);
        const exactTitle = results.find(r => {
          const rClean = ultraClean(r.name || '');
          const rjClean = ultraClean(r.name_romanji || '');
          const enClean = ultraClean(r.name_english || '');
          if (/liveaction/i.test(rClean + rjClean + enClean)) return false;
          return rClean === qClean || rjClean === qClean || enClean === qClean;
        });
        if (exactTitle) {
          matchedItem = exactTitle;
          break;
        }

        // 3. Substring match — aynı tmdb_id öncelikli, sonra ana-başlık (en kısa) aday önde
        const subTitle = results
          .filter(r => {
            const rClean = ultraClean(r.name || '');
            const rjClean = ultraClean(r.name_romanji || '');
            const enClean = ultraClean(r.name_english || '');
            if (/liveaction/i.test(rClean + rjClean + enClean)) return false;
            return qClean.length >= 4 &&
              (rClean.includes(qClean) || rjClean.includes(qClean) || enClean.includes(qClean) || qClean.includes(rClean));
          })
          .sort((a, b) => {
            const aIdMatch = info.numericId && String(a.tmdb_id) === String(info.numericId) ? 0 : 1;
            const bIdMatch = info.numericId && String(b.tmdb_id) === String(info.numericId) ? 0 : 1;
            if (aIdMatch !== bIdMatch) return aIdMatch - bIdMatch;
            const aClean = ultraClean(a.name || '');
            const bClean = ultraClean(b.name || '');
            return Math.abs(aClean.length - qClean.length) - Math.abs(bClean.length - qClean.length);
          })[0];
        if (subTitle) {
          matchedItem = subTitle;
          break;
        }
      } catch (e) {}
    }

    if (!matchedItem) return [];

    const displayTitle = info.isTv ? `${matchedItem.name} S${info.season}E${info.episode}` : matchedItem.name;
    const aHeaders = {
      'User-Agent': HEADERS['User-Agent'],
      'Referer': BASE_URL + '/'
    };

    const isMovie = !info.isTv || matchedItem.title_type === 'movie' || matchedItem.type === 'movie';

    // MOVIE EXTRACTION: AnimeciX movie video embeds reside in /secure/titles/{id}
    if (isMovie) {
      try {
        const dRes = await fetch(`${BASE_URL}/secure/titles/${matchedItem.id}`, { headers: HEADERS, signal: timeoutSignal(5000) });
        if (dRes.ok) {
          const dData = await dRes.json();
          const titleObj = dData.title || {};
          const videos = titleObj.videos || [];
          for (const v of videos) {
            if (v.url) {
              const tauM = v.url.match(/tau-video\.xyz\/embed\/([a-zA-Z0-9_-]+)/);
              if (tauM) {
                try {
                  const tauRes = await fetch(`https://tau-video.xyz/api/video/${tauM[1]}`, {
                    headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': BASE_URL + '/' },
                    signal: timeoutSignal(5000)
                  });
                  if (tauRes.ok) {
                    const tauData = await tauRes.json();
                    if (tauData && Array.isArray(tauData.urls) && tauData.urls.length > 0) {
                      const streams = formatTauStreams(tauData.urls, displayTitle, aHeaders);
                      if (streams.length > 0) return streams;
                    }
                  }
                } catch(e) {}
              }
              if (v.url.includes('vidmoly')) {
                const vm = await resolveVidmoly(v.url, BASE_URL + '/');
                if (vm) {
                  return [{
                    name: displayTitle,
                    title: '⌜ AnimeciX ⌟ | VidMoly [1080p HLS]',
                    url: vm.url,
                    quality: '1080p',
                    provider: 'animecix',
                    headers: vm.headers,
                    behaviorHints: { notWebReady: true, proxyHeaders: { request: vm.headers } }
                  }];
                }
              }
            }
          }
        }
      } catch (e) {}
    }

    // SERIES EXTRACTION: Use secure/best-video
    const videoUrl = `${BASE_URL}/secure/best-video?titleId=${matchedItem.id}&episode=${info.episode}&season=${info.season}`;
    const bestRes = await fetch(videoUrl, { headers: HEADERS, redirect: 'follow', signal: timeoutSignal(5000) });
    if (bestRes.ok) {
      const finalUrl = bestRes.url || '';
      const m = finalUrl.match(/tau-video\.xyz\/embed\/([a-zA-Z0-9_-]+)/);
      if (m) {
        const tauId = m[1];
        const tauRes = await fetch(`https://tau-video.xyz/api/video/${tauId}`, {
          headers: {
            'User-Agent': HEADERS['User-Agent'],
            'Referer': BASE_URL + '/'
          },
          signal: timeoutSignal(5000)
        });
        if (tauRes.ok) {
          try {
            const tauData = await tauRes.json();
            if (tauData && tauData.urls && tauData.urls.length > 0) {
              return formatTauStreams(tauData.urls, displayTitle, aHeaders);
            }
          } catch(e) {}
        }
      }
    }

    // Fallback: If best-video failed or returned non-tau, check titles/{id} videos
    try {
      const dRes = await fetch(`${BASE_URL}/secure/titles/${matchedItem.id}`, { headers: HEADERS, signal: timeoutSignal(5000) });
      if (dRes.ok) {
        const dData = await dRes.json();
        const titleObj = dData.title || {};
        const videos = titleObj.videos || [];
        for (const v of videos) {
          const epNum = parseInt(v.episode_num);
          const sNum = parseInt(v.season_num) || 1;
          if ((!isNaN(epNum) && epNum === info.episode && sNum === info.season) || videos.length === 1) {
            const tauM = v.url && v.url.match(/tau-video\.xyz\/embed\/([a-zA-Z0-9_-]+)/);
            if (tauM) {
              const tauRes = await fetch(`https://tau-video.xyz/api/video/${tauM[1]}`, {
                headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': BASE_URL + '/' },
                signal: timeoutSignal(5000)
              });
              if (tauRes.ok) {
                const tauData = await tauRes.json();
                if (tauData && Array.isArray(tauData.urls) && tauData.urls.length > 0) {
                  return formatTauStreams(tauData.urls, displayTitle, aHeaders);
                }
              }
            }
          }
        }
      }
    } catch(e) {}

    return [];
  } catch (err) {
    return [];
  }
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
  module.exports = { getStreams, getCatalog, getMeta };
}
if (typeof globalThis !== 'undefined') {
  globalThis.getStreams = getStreams;
  globalThis.getCatalog = getCatalog;
  globalThis.getMeta = getMeta;
}
