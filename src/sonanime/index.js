/**
 * Anthology - SonAnime Provider
 * 1080p, 720p, 480p Doğrudan Türkçe Altyazılı Anime Akışları
 * API: https://api.sonanime.com
 * CDN: video.konununuzmani.com (Backblaze B2 / Cloudflare CDN Doğrudan MP4)
 */

var BASE_URL = 'https://sonanime.com';
var API_BASE = 'https://api.sonanime.com';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://sonanime.com/',
  'Accept': 'application/json, text/plain, */*'
};

function timeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  var controller = new AbortController();
  setTimeout(function() { controller.abort(); }, ms);
  return controller.signal;
}

/**
 * QuickJS uyumlu harf katlama ve temizleme
 */
function cleanStr(str) {
  if (!str) return '';
  var s = str.toString().toLowerCase();
  try {
    if (typeof s.normalize === 'function') {
      s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
  } catch (e) {}

  return s
    .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
    .replace(/[âîûÂÎÛ]/g, function(c) {
      return { 'â': 'a', 'î': 'i', 'û': 'u', 'Â': 'a', 'Î': 'i', 'Û': 'u' }[c] || c;
    })
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * JSON fetch yardımcısı
 */
async function fetchJson(url, timeoutMs) {
  try {
    var res = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal: timeoutSignal(timeoutMs || 8000)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

/**
 * TMDB / IMDb ID'den çok dilli başlıkları ve sayısal ID'yi çözer
 */
async function resolveTmdbInfo(id, mediaType) {
  try {
    var cleanId = String(id || '').trim();
    if (cleanId.indexOf(':') !== -1) cleanId = cleanId.split(':')[0];

    var numericId = null;
    var titles = [];

    if (cleanId.indexOf('tt') === 0) {
      var findData = await fetchJson('https://api.themoviedb.org/3/find/' + cleanId + '?api_key=' + TMDB_API_KEY + '&external_source=imdb_id', 6000);
      if (findData) {
        var item = (mediaType === 'tv' || mediaType === 'series')
          ? (findData.tv_results && findData.tv_results[0])
          : (findData.movie_results && findData.movie_results[0]);
        if (item) {
          numericId = item.id;
          if (item.name) titles.push(item.name);
          if (item.title) titles.push(item.title);
          if (item.original_name) titles.push(item.original_name);
          if (item.original_title) titles.push(item.original_title);
        }
      }
    } else {
      numericId = cleanId;
    }

    if (numericId) {
      var type = (mediaType === 'tv' || mediaType === 'series') ? 'tv' : 'movie';
      
      // İngilizce / ana başlık
      var enData = await fetchJson('https://api.themoviedb.org/3/' + type + '/' + numericId + '?api_key=' + TMDB_API_KEY, 6000);
      if (enData) {
        if (enData.name) titles.push(enData.name);
        if (enData.title) titles.push(enData.title);
        if (enData.original_name) titles.push(enData.original_name);
        if (enData.original_title) titles.push(enData.original_title);
      }

      // Türkçe başlık
      var trData = await fetchJson('https://api.themoviedb.org/3/' + type + '/' + numericId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR', 6000);
      if (trData) {
        if (trData.name) titles.push(trData.name);
        if (trData.title) titles.push(trData.title);
      }

      // Alternatif başlıklar
      var altData = await fetchJson('https://api.themoviedb.org/3/' + type + '/' + numericId + '/alternative_titles?api_key=' + TMDB_API_KEY, 6000);
      if (altData) {
        var alts = altData.titles || altData.results || [];
        for (var i = 0; i < Math.min(alts.length, 8); i++) {
          if (alts[i].title) titles.push(alts[i].title);
        }
      }
    }

    var uniqueTitles = [];
    for (var j = 0; j < titles.length; j++) {
      var t = titles[j].trim();
      if (t && uniqueTitles.indexOf(t) === -1) {
        uniqueTitles.push(t);
      }
    }

    return { numericId: numericId ? parseInt(numericId) : null, titles: uniqueTitles };
  } catch (e) {
    return { numericId: null, titles: [] };
  }
}

/**
 * SonAnime API üzerinde anime arayıp en iyi eşleşmeyi bulur
 */
async function searchSonAnime(titles, targetTmdb, isMovie) {
  if (!titles || !titles.length) return null;

  var seenSlugs = {};
  var candidateList = [];

  for (var i = 0; i < titles.length; i++) {
    var q = titles[i];
    var searchRes = await fetchJson(API_BASE + '/api/anime/search?q=' + encodeURIComponent(q), 6000);
    if (searchRes && Array.isArray(searchRes) && searchRes.length > 0) {
      for (var k = 0; k < searchRes.length; k++) {
        var item = searchRes[k];
        if (!item || !item.anime_link) continue;

        // Birebir TMDB ID eşleşmesi bulunduysa derhal döndür
        if (targetTmdb && item.tmdb_id && parseInt(item.tmdb_id) === targetTmdb) {
          return item;
        }

        if (!seenSlugs[item.anime_link]) {
          seenSlugs[item.anime_link] = true;
          candidateList.push({ item: item, query: q });
        }
      }
    }
  }

  if (candidateList.length === 0) return null;

  // Başlık benzerliği ve tip filtrelemesi
  var bestItem = null;
  var bestScore = -1;

  for (var j = 0; j < candidateList.length; j++) {
    var cand = candidateList[j];
    var a = cand.item;
    var cleanTarget = cleanStr(cand.query);
    var name1 = cleanStr(a.anime_name || '');
    var name2 = cleanStr(a.anime_name_en || '');

    var score = 0;
    if (name1 === cleanTarget || name2 === cleanTarget) score += 100;
    else if (name1.indexOf(cleanTarget) !== -1 || cleanTarget.indexOf(name1) !== -1) score += 50;
    else if (name2 && (name2.indexOf(cleanTarget) !== -1 || cleanTarget.indexOf(name2) !== -1)) score += 40;

    var itemIsMovie = a.anime_type === 'movie';
    if (isMovie && itemIsMovie) score += 20;
    else if (!isMovie && !itemIsMovie) score += 20;

    if (score > bestScore) {
      bestScore = score;
      bestItem = a;
    }
  }

  return bestItem || candidateList[0].item;
}

/**
 * Slug üzerinden bölüm akışlarını çeker
 */
async function fetchStreamsBySlug(slug, sNum, eNum, isMovie) {
  var detail = await fetchJson(API_BASE + '/api/anime/link/' + encodeURIComponent(slug), 8000);
  if (!detail || !detail.episodes || !detail.episodes.length) return [];

  var ep = null;
  if (isMovie) {
    ep = detail.episodes[0];
  } else {
    // 1. İlgili sezon ve bölüm numarası ile ara
    ep = detail.episodes.find(function(e) {
      return parseInt(e.anime_season) === sNum && parseInt(e.episode_number) === eNum;
    });
    // 2. Bulunamazsa sadece bölüm numarası ile ara (uzun soluklu diziler tek sezonda tutulabiliyor)
    if (!ep) {
      ep = detail.episodes.find(function(e) {
        return parseInt(e.episode_number) === eNum;
      });
    }
  }

  if (!ep) return [];

  var streams = [];
  var qualities = [
    { key: 'episode_link_1080', q: '1080p' },
    { key: 'episode_link_720', q: '720p' },
    { key: 'episode_link_480', q: '480p' },
    { key: 'episode_link_360', q: '360p' }
  ];

  for (var k = 0; k < qualities.length; k++) {
    var item = qualities[k];
    var url = ep[item.key];
    if (url && typeof url === 'string' && url.trim().length > 0) {
      streams.push({
        name: 'SonAnime',
        title: '⌜ SonAnime ⌟ | Türkçe Altyazılı [' + item.q + ']',
        url: url.trim(),
        quality: item.q,
        format: 'mp4',
        isHls: false,
        contentLanguage: 'ja',
        provider: 'sonanime',
        headers: {
          'Referer': 'https://sonanime.com/'
        },
        behaviorHints: {
          notWebReady: false
        }
      });
    }
  }

  return streams;
}

/**
 * getStreams: Stremio ve Nuvio uyumlu video akış fonksiyonu
 */
async function getStreams(id, mediaType, season, episode) {
  try {
    var rawId = id;
    var finalMediaType = mediaType;
    var finalSeason = season;
    var finalEpisode = episode;

    // Nuvio tekli nesne argümanı ({ id, type, season, episode })
    if (typeof id === 'object' && id !== null) {
      finalMediaType = id.type || id.mediaType || finalMediaType;
      finalSeason = id.season !== undefined ? id.season : finalSeason;
      finalEpisode = id.episode !== undefined ? id.episode : finalEpisode;
      rawId = id.id;
    }

    if (!rawId) return [];

    // Dahili ID veya colon formatı desteği
    if (typeof rawId === 'string' && rawId.indexOf(':') !== -1) {
      var parts = rawId.split(':');
      if (rawId.indexOf('sonanime:ep:') === 0) {
        // sonanime:ep:slug:season:episode
        var epSlug = parts[2];
        var epS = parseInt(parts[3]) || 1;
        var epE = parseInt(parts[4]) || 1;
        return await fetchStreamsBySlug(epSlug, epS, epE, false);
      } else if (rawId.indexOf('sonanime:movie:') === 0) {
        var movieSlug = parts[2];
        return await fetchStreamsBySlug(movieSlug, 1, 1, true);
      } else if (parts[0].indexOf('tt') === 0 || !isNaN(parseInt(parts[0]))) {
        rawId = parts[0];
        if (parts[1]) finalSeason = parseInt(parts[1]) || finalSeason;
        if (parts[2]) finalEpisode = parseInt(parts[2]) || finalEpisode;
      }
    }

    // Dahili düz ID
    if (typeof rawId === 'string' && rawId.indexOf('sonanime:') === 0) {
      var directSlug = rawId.replace(/^sonanime:(?:show:|anime:|movie:)?/, '');
      var isDirectMovie = (finalMediaType === 'movie' || rawId.indexOf('sonanime:movie:') === 0);
      return await fetchStreamsBySlug(directSlug, parseInt(finalSeason) || 1, parseInt(finalEpisode) || 1, isDirectMovie);
    }

    var isTv = (finalMediaType === 'tv' || finalMediaType === 'series');
    var sNum = parseInt(finalSeason) || 1;
    var eNum = parseInt(finalEpisode) || 1;

    // TMDB / IMDb ID çözümleme
    var tmdbInfo = await resolveTmdbInfo(rawId, finalMediaType);
    if (!tmdbInfo.titles || !tmdbInfo.titles.length) return [];

    var matchedAnime = await searchSonAnime(tmdbInfo.titles, tmdbInfo.numericId, !isTv);
    if (!matchedAnime || !matchedAnime.anime_link) return [];

    return await fetchStreamsBySlug(matchedAnime.anime_link, sNum, eNum, !isTv);
  } catch (e) {
    return [];
  }
}

/**
 * getCatalog: SonAnime vitrin kataloğu
 */
async function getCatalog(args) {
  try {
    var searchExtra = args && args.extra && args.extra.search;
    if (searchExtra) {
      var sList = await fetchJson(API_BASE + '/api/anime/search?q=' + encodeURIComponent(searchExtra), 6000);
      if (!sList || !Array.isArray(sList)) return { metas: [] };

      var searchMetas = [];
      for (var i = 0; i < sList.length; i++) {
        var a = sList[i];
        if (!a || !a.anime_link) continue;
        var isMov = a.anime_type === 'movie';
        searchMetas.push({
          id: isMov ? ('sonanime:movie:' + a.anime_link) : ('sonanime:show:' + a.anime_link),
          type: isMov ? 'movie' : 'series',
          name: a.anime_name || a.anime_name_en || 'Anime',
          poster: a.anime_photo || undefined,
          description: a.anime_description || (a.anime_name + ' - SonAnime Türkçe Anime'),
          genres: ['Anime', 'SonAnime']
        });
      }
      return { metas: searchMetas };
    }

    // Popüler Seriler
    var browse = await fetchJson(API_BASE + '/api/anime/browse?type=series&sortBy=rating&sortDir=desc', 8000);
    if (!browse || !Array.isArray(browse)) return { metas: [] };

    var metas = [];
    var limit = Math.min(browse.length, 50);
    for (var j = 0; j < limit; j++) {
      var item = browse[j];
      if (!item || !item.anime_link) continue;
      metas.push({
        id: 'sonanime:show:' + item.anime_link,
        type: 'series',
        name: item.anime_name || item.anime_name_en || 'Anime',
        poster: item.anime_photo || undefined,
        description: item.anime_description || (item.anime_name + ' - SonAnime'),
        genres: (item.anime_genres && Array.isArray(item.anime_genres) && item.anime_genres.length > 0) ? item.anime_genres : ['Anime', 'SonAnime']
      });
    }

    return { metas: metas };
  } catch (e) {
    return { metas: [] };
  }
}

/**
 * getMeta: Anime detay sayfası ve sezon/bölüm listesi
 */
async function getMeta(args) {
  try {
    var rawId = (typeof args === 'object' && args !== null) ? args.id : args;
    if (!rawId || rawId.indexOf('sonanime:') !== 0) return { meta: null };

    var slug = rawId.replace(/^sonanime:(?:show:|anime:|movie:)?/, '').replace(/\/$/, '');
    var detail = await fetchJson(API_BASE + '/api/anime/link/' + encodeURIComponent(slug), 8000);
    if (!detail) return { meta: null };

    var isMovie = detail.anime_type === 'movie' || rawId.indexOf('sonanime:movie:') === 0;
    var name = detail.anime_name || detail.anime_name_en || slug;
    var poster = detail.anime_photo || '';
    var desc = detail.anime_description || (name + ' - SonAnime');

    var genres = ['Anime', 'SonAnime'];
    if (detail.anime_genres) {
      if (Array.isArray(detail.anime_genres)) genres = detail.anime_genres;
      else if (typeof detail.anime_genres === 'string') {
        try { genres = JSON.parse(detail.anime_genres); } catch (e) {}
      }
    }

    var videos = [];
    if (!isMovie && detail.episodes && Array.isArray(detail.episodes)) {
      var sortedEps = detail.episodes.slice().sort(function(a, b) {
        var sDiff = (parseInt(a.anime_season) || 1) - (parseInt(b.anime_season) || 1);
        if (sDiff !== 0) return sDiff;
        return (parseInt(a.episode_number) || 1) - (parseInt(b.episode_number) || 1);
      });

      for (var k = 0; k < sortedEps.length; k++) {
        var ep = sortedEps[k];
        var sNum = parseInt(ep.anime_season) || 1;
        var eNum = parseInt(ep.episode_number) || (k + 1);
        videos.push({
          id: 'sonanime:ep:' + slug + ':' + sNum + ':' + eNum,
          title: sNum + '. Sezon ' + eNum + '. Bölüm',
          season: sNum,
          episode: eNum,
          released: ep.upload_date || undefined
        });
      }
    }

    return {
      meta: {
        id: rawId,
        type: isMovie ? 'movie' : 'series',
        name: name,
        poster: poster,
        background: poster,
        description: desc,
        genres: genres,
        videos: videos.length > 0 ? videos : undefined
      }
    };
  } catch (e) {
    return { meta: null };
  }
}

// ==================== EVRENSEL KALİTE SIRALAMASI ====================

function sortStreamsByQuality(streams) {
  if (!Array.isArray(streams) || streams.length <= 1) return streams || [];

  function getQualityScore(s) {
    if (!s) return 0;
    var score = 0;
    if (s.quality) {
      var q = String(s.quality).toLowerCase().trim();
      if (/\b(4k|2160p?|uhd)\b/.test(q)) score = 2160;
      else if (/\b(2k|1440p?|qhd)\b/.test(q)) score = 1440;
      else if (/\b(1080p?|fhd|full[\s-]?hd)\b/.test(q)) score = 1080;
      else if (/\b(720p?|hd)\b/.test(q)) score = 720;
      else if (/\b(540p?)\b/.test(q)) score = 540;
      else if (/\b(480p?|sd)\b/.test(q)) score = 480;
      else if (/\b(360p?)\b/.test(q)) score = 360;
      else if (/\b(240p?)\b/.test(q)) score = 240;
    }
    if (!score) {
      var text = [s.title, s.name, s.resolution].filter(Boolean).join(' ').toLowerCase();
      if (/\b(4k|2160p|uhd)\b/.test(text)) score = 2160;
      else if (/\b(2k|1440p|qhd)\b/.test(text)) score = 1440;
      else if (/\b(1080p|fhd|full[\s-]?hd)\b/.test(text)) score = 1080;
      else if (/\b(720p)\b/.test(text)) score = 720;
      else if (/\b(540p)\b/.test(text)) score = 540;
      else if (/\b(480p)\b/.test(text)) score = 480;
      else if (/\b(360p)\b/.test(text)) score = 360;
      else if (/\b(240p)\b/.test(text)) score = 240;
      else if (/\b(hd)\b/.test(text) && !/\b(full[\s-]?hd)\b/.test(text)) score = 720;
      else if (/\b(sd)\b/.test(text)) score = 480;
    }
    if (!score && s.url) {
      var u = String(s.url).toLowerCase();
      if (/[\/_.-](2160p?|4k)[\/_.-]/.test(u)) score = 2160;
      else if (/[\/_.-](1440p?|2k)[\/_.-]/.test(u)) score = 1440;
      else if (/[\/_.-](1080p?|fhd)[\/_.-]/.test(u)) score = 1080;
      else if (/[\/_.-](720p?|hd)[\/_.-]/.test(u)) score = 720;
      else if (/[\/_.-](480p?|sd)[\/_.-]/.test(u)) score = 480;
      else if (/[\/_.-](360p?)[\/_.-]/.test(u)) score = 360;
    }
    var isDirectMp4 = s.format === 'mp4' || s.type === 'mp4' || (!s.isHls && s.url && (s.url.endsWith('.mp4') || s.url.includes('.mp4?')));
    if (isDirectMp4 && score > 0) score += 1;
    return score;
  }

  return streams.slice().sort(function(a, b) {
    return getQualityScore(b) - getQualityScore(a);
  });
}

if (typeof getStreams === 'function') {
  var _origGetStreams = getStreams;
  getStreams = async function() {
    var res = await _origGetStreams.apply(this, arguments);
    return sortStreamsByQuality(res);
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    getStreams: getStreams,
    getCatalog: getCatalog,
    getMeta: getMeta
  };
}
if (typeof globalThis !== 'undefined') {
  globalThis.getStreams = getStreams;
  globalThis.getCatalog = getCatalog;
  globalThis.getMeta = getMeta;
}
