const { loadConfig, val, wrapAll } = require("../shared/config.js");
const { sortStreamsByQuality } = require("../shared/quality.js");

var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function () {
      var v;
      v = val('urls.series.ddizibox.base');
      if (v) BASE_URL = String(v).replace(/\/+$/, '');
      if (HEADERS) HEADERS.Referer = BASE_URL + '/';
    });
  }
  return _cfgReady;
}

/**
 * Anthology - DDiziBox Provider
 * https://ddizibox.com üzerinden yerli/yabancı dizi ve film arşivini tarar;
 * Pilavyer oynatıcısından doğrudan 1080p adaptif HLS master akışları ve WebVTT altyazıları sunar.
 */

var cheerio = (function() {
  try { return require('cheerio-without-node-native'); } catch (e) {
    try { return require('cheerio'); } catch (e2) { return null; }
  }
})();

var PROVIDER_NAME = 'DDiziBox';
var BASE_URL = 'https://ddizibox.com';
var DEFAULT_PLAYER_HOST = 'https://play2.pilavyerplay.top';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer': BASE_URL + '/'
};

// ── Güvenli Zaman Aşımı Sinyali (QuickJS & Tarayıcı Uyumlu) ──────────────
function timeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  var controller = new AbortController();
  setTimeout(function() { controller.abort(); }, ms);
  return controller.signal;
}

// ── Aksan Katlama ve Başlık Temizleme ─────────────────────────────────────
function asciiFold(str) {
  if (!str) return '';
  return String(str)
    .replace(/[ıİ]/g, 'i')
    .replace(/[öÖ]/g, 'o')
    .replace(/[üÜ]/g, 'u')
    .replace(/[çÇ]/g, 'c')
    .replace(/[şŞ]/g, 's')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[âîûÂÎÛ]/g, function(m) {
      return { 'â': 'a', 'î': 'i', 'û': 'u', 'Â': 'a', 'Î': 'i', 'Û': 'u' }[m] || m;
    })
    .toLowerCase();
}

function cleanTitle(str) {
  if (!str) return '';
  return asciiFold(str)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleToSlug(str) {
  if (!str) return '';
  return asciiFold(str)
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// ── TMDB & IMDb Metadata Çözümleme ───────────────────────────────────────
async function resolveTmdbInfo(id, mediaType) {
  try {
    var cleanId = String(id || '').trim();
    if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];

    var numericId = null;
    var title = '';
    var origTitle = '';
    var year = '';

    var isTv = (mediaType === 'tv' || mediaType === 'series');

    if (cleanId.startsWith('tt')) {
      var findUrl = 'https://api.themoviedb.org/3/find/' + cleanId + '?api_key=' + TMDB_API_KEY + '&external_source=imdb_id';
      var findRes = await fetch(findUrl, { signal: timeoutSignal(7000) });
      if (findRes.ok) {
        var fData = await findRes.json();
        var item = isTv ? (fData.tv_results && fData.tv_results[0]) : (fData.movie_results && fData.movie_results[0]);
        if (item) {
          numericId = item.id;
          title = item.name || item.title || '';
          origTitle = item.original_name || item.original_title || '';
          var dateStr = item.first_air_date || item.release_date || '';
          year = dateStr.slice(0, 4);
        }
      }
    } else {
      numericId = cleanId;
    }

    if (numericId && (!title || !origTitle)) {
      var tType = isTv ? 'tv' : 'movie';
      var tUrl = 'https://api.themoviedb.org/3/' + tType + '/' + numericId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR';
      var tRes = await fetch(tUrl, { signal: timeoutSignal(7000) });
      if (tRes.ok) {
        var tData = await tRes.json();
        title = tData.name || tData.title || title;
        origTitle = tData.original_name || tData.original_title || origTitle;
        var dateStr2 = tData.first_air_date || tData.release_date || '';
        if (!year && dateStr2) year = dateStr2.slice(0, 4);
      }
    }

    return {
      titleTr: (title || '').trim(),
      titleEn: (origTitle || '').trim(),
      year: year || '',
      numericId: numericId || id
    };
  } catch (e) {
    return { titleTr: '', titleEn: '', year: '', numericId: id };
  }
}

// ── Canlı JSON Arama (Live Search) ────────────────────────────────────────
async function liveSearch(query) {
  if (!query || !query.trim()) return { movies: [], series: [] };
  try {
    var searchUrl = BASE_URL + '/ara/oneri?q=' + encodeURIComponent(query.trim());
    var sOpts = {
      headers: {
        'User-Agent': HEADERS['User-Agent'],
        'Accept': 'application/json, text/plain, */*',
        'Referer': BASE_URL + '/'
      },
      signal: timeoutSignal(6000)
    };
    var res = await fetch(searchUrl, sOpts);
    if (!res.ok) return { movies: [], series: [] };
    var data = await res.json();
    return {
      movies: Array.isArray(data.movies) ? data.movies : [],
      series: Array.isArray(data.series) ? data.series : []
    };
  } catch (e) {
    return { movies: [], series: [] };
  }
}

// ── Sayfa Tabanlı Arama Yedekleme (HTML Fallback) ──────────────────────────
async function htmlSearch(query) {
  if (!query || !query.trim()) return [];
  try {
    var url = BASE_URL + '/ara?q=' + encodeURIComponent(query.trim());
    var res = await fetch(url, { headers: HEADERS, signal: timeoutSignal(7000) });
    if (!res.ok) return [];
    var html = await res.text();
    if (!cheerio) return [];
    var $ = cheerio.load(html);
    var results = [];

    $('a[href*="/film/"], a[href*="/dizi/"]').each(function(i, el) {
      var href = $(el).attr('href') || '';
      var text = $(el).text().trim().replace(/\s+/g, ' ');
      var poster = $(el).find('img').attr('src') || '';
      var isMovie = href.includes('/film/');
      var isSeries = href.includes('/dizi/') && !href.includes('/sezon-');
      if ((isMovie || isSeries) && href && !results.some(function(r) { return r.url === href; })) {
        results.push({
          type: isMovie ? 'movie' : 'series',
          title: text,
          url: href.startsWith('http') ? href : (BASE_URL + href),
          poster: poster,
          meta: text
        });
      }
    });

    return results;
  } catch (e) {
    return [];
  }
}

// ── Medya Adayını Bulma ve Eşleştirme Motoru ──────────────────────────────
async function findMediaUrl(tmdbInfo, isTv) {
  var candidates = [];
  var queries = [];

  if (tmdbInfo.titleTr) queries.push(tmdbInfo.titleTr);
  if (tmdbInfo.titleEn && tmdbInfo.titleEn !== tmdbInfo.titleTr) queries.push(tmdbInfo.titleEn);

  for (var i = 0; i < queries.length; i++) {
    var q = queries[i];
    var lData = await liveSearch(q);
    var list = isTv ? lData.series : lData.movies;
    if (list && list.length > 0) {
      list.forEach(function(item) {
        if (item && item.url && !candidates.some(function(c) { return c.url === item.url; })) {
          candidates.push(item);
        }
      });
    }

    // Yeterli aday bulunduysa devam et
    if (candidates.length >= 3) break;
  }

  // Canlı arama sonuç vermediyse HTML aramasını dene
  if (candidates.length === 0) {
    for (var j = 0; j < queries.length; j++) {
      var hList = await htmlSearch(queries[j]);
      var filtered = hList.filter(function(item) {
        return isTv ? (item.type === 'series') : (item.type === 'movie');
      });
      filtered.forEach(function(item) {
        if (!candidates.some(function(c) { return c.url === item.url; })) {
          candidates.push(item);
        }
      });
      if (candidates.length > 0) break;
    }
  }

  if (candidates.length === 0) return null;

  var targetCleanTr = cleanTitle(tmdbInfo.titleTr);
  var targetCleanEn = cleanTitle(tmdbInfo.titleEn);
  var targetSlugTr = titleToSlug(tmdbInfo.titleTr);
  var targetSlugEn = titleToSlug(tmdbInfo.titleEn);
  var targetYear = parseInt(tmdbInfo.year, 10) || 0;

  var bestCandidate = null;
  var bestScore = -1;

  for (var k = 0; k < candidates.length; k++) {
    var cand = candidates[k];
    var candTitleClean = cleanTitle(cand.title);
    var candSlug = (cand.url.split('/').pop() || '').toLowerCase();
    var score = 0;

    // Slug tam eşleşmesi
    if (candSlug && (candSlug === targetSlugEn || candSlug === targetSlugTr)) {
      score += 60;
    }

    // Başlık tam eşleşmesi
    if (candTitleClean === targetCleanTr || candTitleClean === targetCleanEn) {
      score += 50;
    } else {
      // Kelime bazlı örtüşme
      var targetWords = (targetCleanTr + ' ' + targetCleanEn).split(' ').filter(function(w) { return w.length > 2; });
      var candWords = candTitleClean.split(' ').filter(function(w) { return w.length > 2; });
      var matchCount = 0;
      targetWords.forEach(function(tw) {
        if (candWords.indexOf(tw) !== -1) matchCount++;
      });
      score += matchCount * 12;
    }

    // Yıl kontrolü
    var candYear = 0;
    var metaYearMatch = String(cand.meta || '').match(/\b(19\d\d|20\d\d)\b/);
    if (metaYearMatch) candYear = parseInt(metaYearMatch[1], 10);
    if (!candYear) {
      var titleYearMatch = String(cand.title || '').match(/\b(19\d\d|20\d\d)\b/);
      if (titleYearMatch) candYear = parseInt(titleYearMatch[1], 10);
    }

    if (targetYear && candYear) {
      if (Math.abs(targetYear - candYear) === 0) score += 25;
      else if (Math.abs(targetYear - candYear) <= 1) score += 10;
      else score -= 30; // Farklı yıl yapımları cezalandır
    }

    if (score > bestScore && score >= 20) {
      bestScore = score;
      bestCandidate = cand;
    }
  }

  return bestCandidate;
}

// ── Pilavyer Oynatıcı ve Akış Çözücü ──────────────────────────────────────
async function extractStreamsFromPlayer(pageUrl) {
  try {
    var pageRes = await fetch(pageUrl, { headers: HEADERS, signal: timeoutSignal(8000) });
    if (!pageRes.ok) return [];
    var pHtml = await pageRes.text();
    if (!pHtml) return [];

    // data-pv özniteliği çıkar
    var pvMatch = pHtml.match(/data-pv="([^"]+)"/);
    if (!pvMatch) return [];
    var pv = pvMatch[1];

    // Player host tespiti (play2.pilavyerplay.top / pilavyerplay.top vb.)
    var hostMatch = pHtml.match(/src="(https?:\/\/[^\/]+)\/assets\/js\/core\.js"/i);
    var playerHost = hostMatch ? hostMatch[1] : DEFAULT_PLAYER_HOST;

    var sUrl = playerHost + '/assets/js/s.php?s=' + encodeURIComponent(pv);
    var pRes = await fetch(sUrl, {
      headers: {
        'User-Agent': HEADERS['User-Agent'],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': BASE_URL + '/'
      },
      signal: timeoutSignal(8000)
    });
    if (!pRes.ok) return [];
    var pDataHtml = await pRes.text();
    if (!pDataHtml) return [];

    var jsonMatch = pDataHtml.match(/window\.__PLAYER__\s*=\s*(\{[\s\S]*?\});/);
    if (!jsonMatch) return [];

    var pData = null;
    try {
      pData = JSON.parse(jsonMatch[1]);
    } catch (e) {
      return [];
    }

    if (!pData || !pData.stream) return [];

    // Altyazıları standart formata dönüştür
    var subtitles = [];
    if (Array.isArray(pData.subs)) {
      pData.subs.forEach(function(sub) {
        if (sub && sub.src) {
          var langCode = (sub.lang || '').toLowerCase();
          var isTr = langCode === 'tr' || (sub.label && /türkçe|turkce/i.test(sub.label));
          subtitles.push({
            id: sub.sid || (isTr ? 'tur' : 'eng'),
            url: sub.src,
            file: sub.src,
            link: sub.src,
            lang: isTr ? 'tur' : 'eng',
            language: isTr ? 'tr' : 'en',
            label: sub.label || (isTr ? 'Türkçe' : 'English'),
            name: sub.label || (isTr ? 'Türkçe' : 'English'),
            title: sub.label || (isTr ? 'Türkçe Altyazı' : 'English Subtitle'),
            format: 'vtt',
            type: 'text/vtt',
            headers: {
              'Referer': playerHost + '/',
              'User-Agent': HEADERS['User-Agent']
            }
          });
        }
      });
    }

    var streamHeaders = {
      'Referer': playerHost + '/',
      'User-Agent': HEADERS['User-Agent']
    };

    var streams = [];
    var audios = Array.isArray(pData.audios) && pData.audios.length > 0 ? pData.audios : [{ label: 'Orijinal' }];

    audios.forEach(function(aud) {
      var rawLabel = (aud.label || aud.name || 'Orijinal').trim();
      var displayLabel = rawLabel;
      if (/türkçe|turkce|tr\b/i.test(rawLabel)) {
        displayLabel = 'Türkçe Dublaj';
      } else if (/ingilizce|english|en\b/i.test(rawLabel)) {
        displayLabel = 'İngilizce (Orijinal)';
      } else if (/orijinal|original/i.test(rawLabel)) {
        displayLabel = 'Orijinal (TR Altyazılı)';
      }

      var sObj = {
        name: PROVIDER_NAME,
        title: PROVIDER_NAME + ' • ' + displayLabel + ' • 1080p FHD',
        url: pData.stream,
        quality: '1080p',
        resolution: '1080p',
        type: 'hls',
        format: 'hls',
        isHls: true,
        headers: streamHeaders,
        behaviorHints: {
          notWebReady: true,
          proxyHeaders: {
            request: streamHeaders
          }
        }
      };

      if (subtitles.length > 0) {
        sObj.subtitles = subtitles;
      }

      streams.push(sObj);
    });

    return streams;
  } catch (e) {
    return [];
  }
}

// ── Ana getStreams Fonksiyonu ─────────────────────────────────────────────
async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  try {
    if (typeof tmdbId === 'object' && tmdbId !== null) {
      mediaType = tmdbId.type || mediaType;
      seasonNum = tmdbId.season || seasonNum;
      episodeNum = tmdbId.episode || episodeNum;
      tmdbId = tmdbId.id;
    }

    var isTv = (mediaType === 'tv' || mediaType === 'series');
    var sNum = parseInt(seasonNum, 10) || 1;
    var eNum = parseInt(episodeNum, 10) || 1;

    var cleanId = String(tmdbId || '').trim();
    if (cleanId.indexOf(':') !== -1 && !cleanId.startsWith('ddizibox:')) {
      var cParts = cleanId.split(':');
      if (cParts.length >= 3) {
        var s = parseInt(cParts[cParts.length - 2], 10);
        var e = parseInt(cParts[cParts.length - 1], 10);
        if (!isNaN(s)) sNum = s;
        if (!isNaN(e)) eNum = e;
        isTv = true;
        cleanId = cParts[0];
      }
    }

    var contentUrl = null;

    // Doğrudan DDiziBox slug formatı kontrolü
    if (cleanId.startsWith('ddizibox:ep:')) {
      var epParts = cleanId.split(':');
      var slug = epParts[2];
      if (epParts[3]) sNum = parseInt(epParts[3], 10) || sNum;
      if (epParts[4]) eNum = parseInt(epParts[4], 10) || eNum;
      contentUrl = BASE_URL + '/dizi/' + slug + '/sezon-' + sNum + '/bolum-' + eNum;
    } else if (cleanId.startsWith('ddizibox:movie:')) {
      var mSlug = cleanId.split(':')[2];
      contentUrl = BASE_URL + '/film/' + mSlug;
    } else if (cleanId.startsWith('ddizibox:show:')) {
      var sSlug = cleanId.split(':')[2];
      contentUrl = BASE_URL + '/dizi/' + sSlug + '/sezon-' + sNum + '/bolum-' + eNum;
    } else {
      // TMDB / IMDb ID çözümleme ve arama
      var tmdbInfo = await resolveTmdbInfo(cleanId, isTv ? 'tv' : 'movie');
      var mediaMatch = await findMediaUrl(tmdbInfo, isTv);
      if (!mediaMatch || !mediaMatch.url) return [];

      var matchSlug = (mediaMatch.url.split('/').pop() || '').trim();
      if (isTv) {
        contentUrl = BASE_URL + '/dizi/' + matchSlug + '/sezon-' + sNum + '/bolum-' + eNum;
      } else {
        contentUrl = BASE_URL + '/film/' + matchSlug;
      }
    }

    if (!contentUrl) return [];

    var streams = await extractStreamsFromPlayer(contentUrl);
    return streams;
  } catch (e) {
    return [];
  }
}

// ── Evrensel Kalite Sıralaması Sarmalama ──────────────────────────────────
if (typeof getStreams === 'function') {
  var _origGetStreams = getStreams;
  getStreams = async function() {
    var res = await _origGetStreams.apply(this, arguments);
    return sortStreamsByQuality(res);
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = wrapAll({
    getStreams: getStreams
  }, cfgReady);
}
if (typeof globalThis !== 'undefined') {
  globalThis.getStreams = getStreams;
}
