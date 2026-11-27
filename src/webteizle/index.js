const { sortStreamsByQuality } = require("../shared/quality.js");
const { loadConfig, val, wrapAll } = require("../shared/config.js");
const { cleanTitle } = require("../shared/helpers.js");
const { extractByEmbedUrl } = require("../shared/extractors.js");

var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function () {
      var v = val('urls.movies.webteizle.base');
      if (v) BASE_URL = String(v).replace(/\/+$/, '');
      if (HEADERS) HEADERS.Referer = BASE_URL + '/';
    });
  }
  return _cfgReady;
}

/**
 * Anthology - Webteİzle Provider
 * Webteizle.info üzerinden Türkçe dublaj ve Türkçe altyazılı
 * Bysezo/FileMoon, VidMoly, OK.ru, Sibnet ve Mail.ru 1080p akışları sunar.
 */

var PROVIDER_NAME = 'Webteİzle';
var BASE_URL = 'https://webteizle.info';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer': BASE_URL + '/'
};

async function fetchTmdbInfo(tmdbId, mediaType) {
  var cleanId = String(tmdbId || '').trim().replace(/^(?:movie|tv|series|tmdb|imdb):+/i, '');
  if (cleanId.indexOf(':') !== -1) cleanId = cleanId.split(':')[0];
  var isTV = (mediaType === 'tv' || mediaType === 'series');
  var endpoint = isTV ? 'tv' : 'movie';

  if (cleanId.indexOf('tt') === 0) {
    var fRes = await fetch('https://api.themoviedb.org/3/find/' + cleanId + '?api_key=' + TMDB_API_KEY + '&external_source=imdb_id');
    if (fRes.ok) {
      var fData = await fRes.json();
      var match = isTV ? (fData.tv_results && fData.tv_results[0]) : (fData.movie_results && fData.movie_results[0]);
      if (match) {
        return {
          titleTr: match.title || match.name || '',
          titleEn: match.original_title || match.original_name || '',
          year: (match.release_date || match.first_air_date || '').slice(0, 4)
        };
      }
    }
  }

  var res = await fetch('https://api.themoviedb.org/3/' + endpoint + '/' + cleanId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR');
  if (!res.ok) return { titleTr: '', titleEn: '', year: '' };
  var d = await res.json();
  return {
    titleTr: d.title || d.name || '',
    titleEn: d.original_title || d.original_name || '',
    year: (d.release_date || d.first_air_date || '').slice(0, 4)
  };
}

function titleToSlug(title) {
  return (title || '').toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function findFilmPage(titleTr, titleEn) {
  var slugTr = titleToSlug(titleTr);
  var slugEn = titleToSlug(titleEn);
  var candidates = [];
  if (slugTr) {
    candidates.push(BASE_URL + '/hakkinda/' + slugTr);
    candidates.push(BASE_URL + '/izle/dublaj/' + slugTr);
    candidates.push(BASE_URL + '/izle/altyazi/' + slugTr);
  }
  if (slugEn && slugEn !== slugTr) {
    candidates.push(BASE_URL + '/hakkinda/' + slugEn);
    candidates.push(BASE_URL + '/izle/dublaj/' + slugEn);
    candidates.push(BASE_URL + '/izle/altyazi/' + slugEn);
  }

  for (var i = 0; i < candidates.length; i++) {
    try {
      var r = await fetch(candidates[i], { headers: HEADERS });
      if (r.ok) {
        var html = await r.text();
        if (/data-id=["']?\d+/i.test(html) && html.indexOf('wip') !== -1) {
          return { url: candidates[i], html: html };
        }
      }
    } catch (e) {}
  }

  var queries = [cleanTitle(titleTr), cleanTitle(titleEn), titleTr, titleEn].filter(Boolean);
  for (var qi = 0; qi < queries.length; qi++) {
    try {
      var ar = await fetch(BASE_URL + '/ajax/arama.asp', {
        method: 'POST',
        headers: Object.assign({}, HEADERS, {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest'
        }),
        body: 'q=' + encodeURIComponent(queries[qi])
      });
      if (!ar.ok) continue;
      var data = await ar.json();
      var items = (data && data.status === 'success' && data.results && data.results.filmler && Array.isArray(data.results.filmler.results))
        ? data.results.filmler.results.filter(function (x) { return x && x.url && x.url.indexOf('/fragman/') === -1; })
        : [];
      if (items.length > 0) {
        var best = items[0];
        var pageUrl = best.url.indexOf('http') === 0 ? best.url : (BASE_URL + (best.url.charAt(0) === '/' ? '' : '/') + best.url);
        var pRes = await fetch(pageUrl, { headers: HEADERS });
        if (pRes.ok) {
          return { url: pageUrl, html: await pRes.text() };
        }
      }
    } catch (e) {}
  }
  return null;
}

function parseFilmId(html) {
  var m = html.match(/data-id="(\d+)"[^>]*id="wip"/)
       || html.match(/id="wip"[^>]*data-id="(\d+)"/)
       || html.match(/data-id="(\d+)"/);
  return m ? m[1] : null;
}

function resolveEmbedToken(embedHtml) {
  var m = embedHtml.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (m && m[1] && m[1].indexOf('reCAPTCHADATA') === -1) return m[1];

  var sm = embedHtml.match(/(vidmoly|okru|sibnet|mailru|filemoon)\s*\(\s*'([^']+)'/i);
  if (!sm) return null;
  var p = sm[1].toLowerCase();
  var vid = sm[2];
  if (p === 'vidmoly') return 'https://vidmoly.biz/embed-' + vid + '.html';
  if (p === 'okru') return 'https://ok.ru/videoembed/' + vid;
  if (p === 'sibnet') return 'https://video.sibnet.ru/shell.php?videoid=' + vid;
  if (p === 'filemoon') return 'https://bysezoxexe.com/e/' + vid;
  if (p === 'mailru') {
    var norm = vid.replace(/^\/+/, '').replace(/^([^/]+\/[^/]+)\/(.+)$/, '$1/video/embed/$2');
    return 'https://my.mail.ru/' + norm;
  }
  return null;
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    if (typeof tmdbId === 'object' && tmdbId !== null) {
      mediaType = tmdbId.type || mediaType;
      season = tmdbId.season || season;
      episode = tmdbId.episode || episode;
      tmdbId = tmdbId.id;
    }
    var info = await fetchTmdbInfo(tmdbId, mediaType);
    var movieName = info.titleTr || info.titleEn;
    if (!movieName) return [];

    var pageResult = await findFilmPage(info.titleTr, info.titleEn);
    if (!pageResult || !pageResult.html) return [];

    var filmId = parseFilmId(pageResult.html);
    if (!filmId) return [];

    var diller = [];
    if (pageResult.html.indexOf('/izle/dublaj/') !== -1 || pageResult.url.indexOf('/izle/dublaj/') !== -1) diller.push({ dil: '0', audioType: 'dub' });
    if (pageResult.html.indexOf('/izle/altyazi/') !== -1 || pageResult.url.indexOf('/izle/altyazi/') !== -1) diller.push({ dil: '1', audioType: 'sub' });
    if (diller.length === 0) { diller.push({ dil: '0', audioType: 'dub' }); diller.push({ dil: '1', audioType: 'sub' }); }

    var streams = [];
    var seen = {};
    for (var di = 0; di < diller.length; di++) {
      var d = diller[di];
      var altRes = await fetch(BASE_URL + '/ajax/dataAlternatif3.asp', {
        method: 'POST',
        headers: Object.assign({}, HEADERS, {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': pageResult.url,
          'Origin': BASE_URL
        }),
        body: 'filmid=' + filmId + '&dil=' + d.dil + '&s=' + (season || '') + '&b=' + (episode || '') + '&bot=0'
      });
      if (!altRes.ok) continue;
      var altJson = await altRes.json().catch(function () { return null; });
      var list = (altJson && altJson.status === 'success' && Array.isArray(altJson.data)) ? altJson.data : [];
      var filtered = list.filter(function (it) {
        var b = (it.baslik || '').toLowerCase();
        return b !== 'pixel' && b !== 'netu';
      }).slice(0, 6);

      var nested = await Promise.all(filtered.map(async function (item) {
        try {
          var er = await fetch(BASE_URL + '/ajax/dataEmbed.asp', {
            method: 'POST',
            headers: Object.assign({}, HEADERS, {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'X-Requested-With': 'XMLHttpRequest',
              'Referer': pageResult.url,
              'Origin': BASE_URL
            }),
            body: 'id=' + item.id
          });
          if (!er.ok) return [];
          var embedSrc = resolveEmbedToken(await er.text());
          if (!embedSrc) return [];
          return await extractByEmbedUrl(embedSrc, {
            sourceLabel: 'Webteİzle',
            streamName: movieName,
            audioType: d.audioType,
            provider: 'webteizle',
            referer: BASE_URL + '/'
          });
        } catch (e) { return []; }
      }));

      nested.forEach(function (arr) {
        (arr || []).forEach(function (s) {
          if (s && s.url && !seen[s.url]) {
            seen[s.url] = true;
            streams.push(s);
          }
        });
      });
    }

    return sortStreamsByQuality(streams);
  } catch (err) {
    return [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = wrapAll({ getStreams: getStreams }, cfgReady);
}
if (typeof globalThis !== 'undefined') {
  globalThis.getStreams = getStreams;
}
