/**
 * Anthology+ — Birleşik TMDB/IMDb Akış Motoru (Nuvio)
 * Vixolity, HDFilmDelisi, SinemaCX, AnimeciX, SeiCode ve SonAnime akışlarını
 * kesin TMDB/IMDb eşleşmesiyle paralel olarak birleştirir.
 */

const { sortStreamsByQuality } = require('../shared/quality.js');
const { loadConfig, val, wrapAll } = require('../shared/config.js');
const { timeoutSignal } = require('../shared/http.js');
const { extractVixolity } = require('../shared/extractors.js');

var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VIXOLITY_BASE = 'https://ha.vixolity.com';

var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function () {
      var vix = val('urls.vod.vixolity_base');
      if (vix) VIXOLITY_BASE = String(vix).replace(/\/+$/, '');
    });
  }
  return _cfgReady;
}

var hdfilmdelisiMod = require('../hdfilmdelisi/index.js');
var sinemacxMod = require('../sinemacx/index.js');
var animecixMod = require('../animecix/index.js');
var seicodeMod = require('../seicode/index.js');
var sonanimeMod = require('../sonanime/index.js');

async function resolveTmdbIdentity(rawId, mediaType) {
  try {
    var clean = String(rawId || '').trim().replace(/^(?:movie|tv|series|tmdb|imdb|anthology_plus):+/i, '');
    if (clean.indexOf(':') !== -1) clean = clean.split(':')[0];
    var isTv = (mediaType === 'tv' || mediaType === 'series' || mediaType === 'anime');
    var imdbId = clean.indexOf('tt') === 0 ? clean : '';
    var tmdbId = imdbId ? '' : clean;

    if (imdbId) {
      var fRes = await fetch('https://api.themoviedb.org/3/find/' + imdbId + '?api_key=' + TMDB_API_KEY + '&external_source=imdb_id', { signal: timeoutSignal(7000) });
      if (fRes.ok) {
        var fd = await fRes.json();
        var item = isTv ? (fd.tv_results && fd.tv_results[0]) : (fd.movie_results && fd.movie_results[0]);
        if (!item) item = (fd.movie_results && fd.movie_results[0]) || (fd.tv_results && fd.tv_results[0]);
        if (item) {
          tmdbId = String(item.id);
          isTv = Boolean(item.first_air_date && !item.release_date);
        }
      }
    }

    if (tmdbId) {
      var typePath = isTv ? 'tv' : 'movie';
      var tRes = await fetch('https://api.themoviedb.org/3/' + typePath + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR&append_to_response=external_ids', { signal: timeoutSignal(7000) });
      if (tRes.ok) {
        var td = await tRes.json();
        imdbId = imdbId || td.imdb_id || (td.external_ids && td.external_ids.imdb_id) || '';
        var genres = Array.isArray(td.genres) ? td.genres.map(function (g) { return g.id; }) : [];
        var isAnime = genres.indexOf(16) !== -1 || td.original_language === 'ja';
        return { tmdbId: tmdbId, imdbId: imdbId, isTv: isTv, isAnime: isAnime };
      }
    }
    return imdbId ? { tmdbId: tmdbId, imdbId: imdbId, isTv: isTv, isAnime: false } : null;
  } catch (e) {
    return null;
  }
}

async function getStreams(tmdbIdOrArgs, mediaType, seasonNum, episodeNum) {
  try {
    var id = tmdbIdOrArgs;
    var mType = mediaType || 'movie';
    var sNum = parseInt(seasonNum, 10) || 1;
    var eNum = parseInt(episodeNum, 10) || 1;
    if (typeof tmdbIdOrArgs === 'object' && tmdbIdOrArgs) {
      id = tmdbIdOrArgs.id || '';
      mType = tmdbIdOrArgs.type || mType;
      sNum = parseInt(tmdbIdOrArgs.season, 10) || sNum;
      eNum = parseInt(tmdbIdOrArgs.episode, 10) || eNum;
    }

    var rawStr = String(id || '').trim();
    var parts = rawStr.split(':');
    if (parts.length >= 3 && /^\d+$/.test(parts[parts.length - 1]) && /^\d+$/.test(parts[parts.length - 2])) {
      sNum = parseInt(parts[parts.length - 2], 10) || sNum;
      eNum = parseInt(parts[parts.length - 1], 10) || eNum;
      mType = 'tv';
    }

    var identity = await resolveTmdbIdentity(rawStr, mType);
    if (!identity) return [];

    var tasks = [];
    if (identity.imdbId) {
      tasks.push(extractVixolity({
        imdbId: identity.imdbId,
        season: identity.isTv ? sNum : undefined,
        episode: identity.isTv ? eNum : undefined,
        baseUrl: VIXOLITY_BASE,
        sourceLabel: 'Anthology+',
        provider: 'anthology_plus'
      }));
    }

    var reqId = identity.tmdbId || identity.imdbId;
    var reqType = identity.isTv ? 'tv' : 'movie';
    if (!identity.isTv) {
      tasks.push(hdfilmdelisiMod.getStreams(reqId, 'movie').catch(function () { return []; }));
      tasks.push(sinemacxMod.getStreams(reqId, 'movie').catch(function () { return []; }));
    }
    if (identity.isAnime) {
      tasks.push(animecixMod.getStreams(reqId, reqType, sNum, eNum).catch(function () { return []; }));
      tasks.push(seicodeMod.getStreams(reqId, reqType, sNum, eNum).catch(function () { return []; }));
      tasks.push(sonanimeMod.getStreams(reqId, reqType, sNum, eNum).catch(function () { return []; }));
    }

    var settled = await Promise.all(tasks);
    var out = [];
    var seen = {};
    for (var i = 0; i < settled.length; i++) {
      var arr = Array.isArray(settled[i]) ? settled[i] : [];
      for (var j = 0; j < arr.length; j++) {
        var s = arr[j];
        if (!s || !s.url || seen[s.url]) continue;
        seen[s.url] = true;
        out.push(Object.assign({}, s, {
          name: 'Anthology+',
          title: String(s.title || s.name || '').replace(/⌜\s*[^⌟]+\s*⌟/, '⌜ Anthology+ ⌟'),
          provider: 'anthology_plus'
        }));
      }
    }
    return sortStreamsByQuality(out);
  } catch (e) {
    return [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = wrapAll({ getStreams: getStreams }, cfgReady);
}
if (typeof globalThis !== 'undefined') {
  globalThis.getStreams = getStreams;
}
