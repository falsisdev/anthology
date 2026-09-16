/**
 * Anthology - DiziWatch Provider
 * diziwatch8.com arşivi ve videoplay.vip embed üzerinden
 * doğrudan HLS master akışları sunar (token'lı play.m3u8).
 * Not: diziwatch.ac player'ı (pichive.online) Cloudflare JS challenge
 * kullandığından bu sağlayıcı diziwatch8.com altyapısı üzerinden çalışır.
 */

var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var BASE_URL = 'https://diziwatch8.com';
var EMBED_BASE = 'https://videoplay.vip';
var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function getHtml(url, headers) {
  var res = await fetch(url, { headers: Object.assign({ 'User-Agent': UA }, headers || {}) });
  if (!res.ok) return '';
  return res.text();
}

async function resolveTmdbInfo(id, mediaType) {
  try {
    var cleanId = String(id || '').trim();
    if (cleanId.indexOf(':') !== -1) cleanId = cleanId.split(':')[0];

    var numericId = null;
    var title = '';
    var origTitle = '';

    if (cleanId.indexOf('tt') === 0) {
      var findRes = await fetch('https://api.themoviedb.org/3/find/' + cleanId + '?api_key=' + TMDB_API_KEY + '&external_source=imdb_id');
      if (findRes.ok) {
        var fData = await findRes.json();
        var item = (mediaType === 'tv' || mediaType === 'series')
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
      var type = (mediaType === 'tv' || mediaType === 'series') ? 'tv' : 'movie';
      var tRes = await fetch('https://api.themoviedb.org/3/' + type + '/' + numericId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR');
      if (tRes.ok) {
        var tData = await tRes.json();
        title = tData.name || tData.title || title;
        origTitle = tData.original_name || tData.original_title || origTitle;
      }
    }

    return { title: title, origTitle: origTitle, numericId: numericId };
  } catch (e) {
    return { title: '', origTitle: '', numericId: id };
  }
}

function normalizeTitle(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function searchApi(query) {
  try {
    var html = await getHtml(BASE_URL + '/api/search.php?q=' + encodeURIComponent(query));
    if (!html) return [];
    var json = JSON.parse(html);
    return (json && json.results) || [];
  } catch (e) {
    return [];
  }
}

// videoplay.vip embed sayfasından token'lı play.m3u8 URL'ini çıkar
async function extractPlayUrl(videoUrl) {
  var html = await getHtml(videoUrl, { 'Referer': BASE_URL + '/' });
  if (!html) return '';
  var m = html.match(/play\.m3u8\?id=\d+&t=\w&token=[A-Za-z0-9_-]+&expires=\d+/);
  return m ? m[0] : '';
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  try {
    if (typeof tmdbId === 'object' && tmdbId && tmdbId.id) {
      return getStreams(tmdbId.id, mediaType, seasonNum, episodeNum);
    }
    if (mediaType === 'movie') return [];
    if (typeof tmdbId === 'string' && tmdbId.indexOf('diziwatch:ep:') === 0) {
      return resolveEpisodeById(tmdbId.replace('diziwatch:ep:', ''));
    }

    var season = parseInt(seasonNum) || 1;
    var episode = parseInt(episodeNum) || 1;

    var info = await resolveTmdbInfo(tmdbId, mediaType);
    var queries = [info.title, info.origTitle].filter(Boolean);
    if (queries.length === 0) return [];

    var chosen = null;
    for (var qi = 0; qi < queries.length; qi++) {
      if (chosen) break;
      var normQ = normalizeTitle(queries[qi]);
      var results = await searchApi(queries[qi]);
      for (var ri = 0; ri < results.length; ri++) {
        var item = results[ri];
        var normTitle = normalizeTitle(item.title || '');
        if (normTitle === normQ || normTitle.indexOf(normQ) !== -1 || normQ.indexOf(normTitle) !== -1) {
          chosen = item;
          break;
        }
      }
    }
    if (!chosen) return [];

    var slug = chosen.slug || '';
    var epUrl = BASE_URL + '/bolum/' + slug + '-' + season + '-sezon-' + episode + '-bolum';
    var html = await getHtml(epUrl);
    if (!html) return [];

    var encM = html.match(/encodedContent\s*=\s*'([^']+)'/);
    if (!encM) return [];
    var decoded = '';
    try { decoded = decodeURIComponent(escape(atob(encM[1]))); } catch (e) { return []; }
    var ifrM = decoded.match(/https?:\/\/videoplay\.vip\/dizi\/\d+\/\d+\/\d+\?sid=[^"'\s]+/);
    var videoUrl = ifrM ? ifrM[0] : '';

    if (!videoUrl) return [];
    var playPath = await extractPlayUrl(videoUrl);
    if (!playPath) return [];

    var m3u8 = EMBED_BASE + '/' + playPath;

    return [{
      name: 'DiziWatch S' + season + 'E' + episode,
      title: '⌜ DiziWatch ⌟ | 720p HLS',
      url: m3u8,
      quality: '720p',
      type: 'hls',
      provider: 'diziwatch',
      headers: {
        'Referer': EMBED_BASE + '/',
        'User-Agent': UA
      },
      behaviorHints: {
        notWebReady: true,
        proxyHeaders: {
          request: {
            'Referer': EMBED_BASE + '/',
            'User-Agent': UA
          }
        }
      }
    }];
  } catch (err) {
    return [];
  }
}

async function resolveEpisodeById(epSlug) {
  var m = epSlug.match(/-(\d+)-sezon-(\d+)-bolum/);
  if (!m) return [];
  return getStreams(null, 'tv', m[1], m[2]);
}

// ── Catalog & Meta Entegrasyonu ──────────────────────────────
async function getCatalog(args) {
  try {
    var query = (args && args.search) || (args && args.extra && args.extra.search) || (args && args.query) || '';
    var metas = [];

    if (query) {
      var results = await searchApi(query);
      for (var i = 0; i < results.length; i++) {
        var item = results[i];
        var title = (item.title || '').trim();
        if (!title) continue;
        var poster = item.poster;
        if (poster && poster.indexOf('http') !== 0) poster = BASE_URL + poster;
        metas.push({
          id: 'diziwatch:show:' + item.slug,
          type: 'tv',
          name: title,
          poster: poster || 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
          background: poster || '',
          genres: ['Anime', 'DiziWatch'],
          description: title + ' - DiziWatch'
        });
      }
      return { metas: metas };
    }

    return { metas: metas };
  } catch (e) {
    return { metas: [] };
  }
}

async function getMeta(args) {
  try {
    var rawId = (typeof args === 'string') ? args : (args && args.id ? args.id : '');
    if (!rawId) return { meta: null };

    var showMatch = rawId.match(/^diziwatch:(show|ep):(.+)$/);
    if (!showMatch) return { meta: null };

    var kind = showMatch[1];
    var rest = showMatch[2];
    if (kind === 'ep') {
      var m = rest.match(/-(\d+)-sezon-(\d+)-bolum/);
      var epName = m ? m[1] + '. Sezon ' + m[2] + '. Bölüm' : 'Bölüm';
      return {
        meta: {
          id: rawId,
          type: 'tv',
          name: epName,
          poster: 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
          genres: ['Anime', 'DiziWatch'],
          description: epName + ' - DiziWatch',
          videos: [{
            id: rawId,
            title: epName,
            season: m ? parseInt(m[1]) : 1,
            episode: m ? parseInt(m[2]) : 1
          }]
        }
      };
    }

    var res = await searchApi(rest.split('-').join(' '));
    var info = res.find(function (x) { return x.slug === rest; }) || res[0];
    if (!info) return { meta: null };

    var poster = info.poster;
    if (poster && poster.indexOf('http') !== 0) poster = BASE_URL + poster;

    return {
      meta: {
        id: rawId,
        type: 'tv',
        name: info.title,
        poster: poster || 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
        background: poster || '',
        genres: ['Anime', 'DiziWatch'],
        description: info.title + ' - DiziWatch'
      }
    };
  } catch (e) {
    return { meta: null };
  }
}

// ── Universal Quality Sorter ──────────────────────────────────────────
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
            var text = [s.title, s.name, s.resolution].filter(Boolean).join(" ").toLowerCase();
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
        var isDirectMp4 = s.format === "mp4" || s.type === "mp4" || (!s.isHls && s.url && (s.url.endsWith(".mp4") || s.url.includes(".mp4?")));
        if (isDirectMp4 && score > 0) score += 1;
        return score;
    }
    return streams.slice().sort(function(a, b) {
        return getQualityScore(b) - getQualityScore(a);
    });
}

if (typeof getStreams === "function") {
    var _origGetStreams = getStreams;
    getStreams = async function() {
        var res = await _origGetStreams.apply(this, arguments);
        return sortStreamsByQuality(res);
    };
}

if (typeof module !== 'undefined') {
  module.exports = { getStreams, getCatalog, getMeta };
}
if (typeof globalThis !== 'undefined') {
  globalThis.getStreams = getStreams;
  globalThis.getCatalog = getCatalog;
  globalThis.getMeta = getMeta;
}