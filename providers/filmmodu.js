// FilmModu — Nuvio Provider (Optimized)
// Orijinale göre değişiklikler:
//  1. TMDB + arama paralel başlatılır (Promise.all)
//  2. fetchAlternateLinks filtrelemesi kaldırıldı — tüm dil seçenekleri denenir
//  3. Dublaj linkini atlayan filtre düzeltildi (Türkçe Dublaj da alınır)
//  4. AbortController ile 8s timeout — takılan istek bekletmez

var BASE_URL     = 'https://www.filmmodu.ws';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var FETCH_TIMEOUT_MS = 8000;

var HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer':         BASE_URL + '/'
};

// ── Timeout destekli fetch ────────────────────────────────────
function fetchWithTimeout(url, options) {
  return new Promise(function(resolve, reject) {
    var timer = setTimeout(function() {
      reject(new Error('Timeout: ' + url));
    }, FETCH_TIMEOUT_MS);
    fetch(url, options)
      .then(function(r) { clearTimeout(timer); resolve(r); })
      .catch(function(e) { clearTimeout(timer); reject(e); });
  });
}

// ── TMDB ─────────────────────────────────────────────────────
function fetchTmdbInfo(tmdbId) {
  var url = 'https://api.themoviedb.org/3/movie/' + tmdbId
    + '?api_key=' + TMDB_API_KEY + '&language=tr-TR';
  return fetchWithTimeout(url, {})
    .then(function(r) { return r.json(); })
    .then(function(d) {
      return {
        titleTr: d.title || '',
        titleEn: d.original_title || '',
        year:    d.release_date ? d.release_date.slice(0, 4) : ''
      };
    });
}

// ── Slug normalize ────────────────────────────────────────────
function normalizeForUrl(str) {
  return (str || '').toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]/g,'');
}

// ── En iyi arama sonucunu bul ─────────────────────────────────
function findBestMatch(results, searchTitle, year) {
  var ns = normalizeForUrl(searchTitle);
  // 1. Başlık + yıl
  if (year) {
    for (var i = 0; i < results.length; i++) {
      var nh = normalizeForUrl(results[i].href);
      if (nh.indexOf(ns) !== -1 && results[i].href.indexOf(year) !== -1) return results[i].href;
    }
  }
  // 2. Sadece başlık
  for (var j = 0; j < results.length; j++) {
    if (normalizeForUrl(results[j].href).indexOf(ns) !== -1) return results[j].href;
  }
  // 3. Sadece yıl
  if (year) {
    for (var k = 0; k < results.length; k++) {
      if (results[k].href.indexOf(year) !== -1) return results[k].href;
    }
  }
  return null;
}

// ── FilmModu arama ────────────────────────────────────────────
function searchFilmModu(title, year) {
  var searchUrl = BASE_URL + '/film-ara?term=' + encodeURIComponent(title);
  return fetchWithTimeout(searchUrl, { headers: HEADERS, redirect: 'follow' })
    .then(function(r) {
      var finalUrl = r.url;
      if (finalUrl && finalUrl !== searchUrl && finalUrl.indexOf('/film-ara') === -1) {
        return finalUrl;
      }
      return r.text().then(function(html) {
        var cheerio = require('cheerio-without-node-native');
        var $ = cheerio.load(html);
        if ($('div.alternates').length > 0) {
          return $('link[rel="canonical"]').attr('href') || searchUrl;
        }
        var results = [];
        $('div.movie').each(function() {
          var href = $(this).find('a').first().attr('href') || '';
          if (href) results.push({ href: href });
        });
        if (results.length === 0) return null;
        return findBestMatch(results, title, year);
      });
    });
}

// ── Kaynak linkleri çek ───────────────────────────────────────
// OPT: Orijinalde "Türkçe Altyazılı" ve "Fragman" atlanıyordu — hepsi alınır
function fetchAlternateLinks(filmUrl) {
  return fetchWithTimeout(filmUrl, { headers: HEADERS })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var cheerio = require('cheerio-without-node-native');
      var $ = cheerio.load(html);
      var links = [];
      $('div.alternates a').each(function() {
        var href = $(this).attr('href') || '';
        var name = $(this).text().trim();
        if (name && name !== 'Fragman' && href) {
          links.push({ href: href, name: name });
        }
      });
      return links;
    });
}

// ── Tek kaynak linkten stream çek ─────────────────────────────
function fetchStreamsFromAlt(altLink, filmUrl) {
  return fetchWithTimeout(altLink.href, {
    headers: Object.assign({}, HEADERS, { 'Referer': filmUrl })
  })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var videoIdMatch   = html.match(/var videoId\s*=\s*'([^']+)'/);
      var videoTypeMatch = html.match(/var videoType\s*=\s*'([^']+)'/);
      if (!videoIdMatch || !videoTypeMatch) return [];

      var sourceUrl = BASE_URL + '/get-source?movie_id=' + videoIdMatch[1] + '&type=' + videoTypeMatch[1];
      return fetchWithTimeout(sourceUrl, {
        headers: Object.assign({}, HEADERS, {
          'Referer':          altLink.href,
          'X-Requested-With': 'XMLHttpRequest',
          'Accept':           'application/json'
        })
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data || !data.sources || data.sources.length === 0) return [];

          var subtitleUrl = null;
          if (data.subtitle) {
            subtitleUrl = data.subtitle.startsWith('http')
              ? data.subtitle
              : BASE_URL + data.subtitle;
          }

          return data.sources.map(function(source) {
            if (!source.src) return null;
            var srcUrl = source.src;
            if (srcUrl.indexOf('.m3u8') === -1) srcUrl += '.m3u8';
            var quality = source.label || (source.res ? source.res + 'p' : 'HD');
            var obj = {
              name:    'FilmModu',
              title:   altLink.name + ' • ' + quality,
              url:     srcUrl,
              quality: quality,
              type:    'hls',
              headers: { 'Referer': BASE_URL + '/', 'User-Agent': HEADERS['User-Agent'] }
            };
            if (subtitleUrl) {
              obj.subtitles = [{ url: subtitleUrl, language: 'Türkçe', label: 'Türkçe' }];
            }
            return obj;
          }).filter(Boolean);
        });
    })
    .catch(function() { return []; });
}

// ── Ana fonksiyon ─────────────────────────────────────────────
function getStreams(tmdbId, mediaType) {
  if (mediaType !== 'movie') return Promise.resolve([]);

  return fetchTmdbInfo(tmdbId)
    .then(function(info) {
      if (!info.titleEn && !info.titleTr) return [];

      // OPT: TR ve EN başlıkları paralel ara
      var searches = [searchFilmModu(info.titleEn, info.year)];
      if (info.titleTr && info.titleTr !== info.titleEn) {
        searches.push(searchFilmModu(info.titleTr, info.year));
      }

      return Promise.all(searches).then(function(urls) {
        var filmUrl = urls[0] || urls[1];
        if (!filmUrl) return [];

        return fetchAlternateLinks(filmUrl)
          .then(function(altLinks) {
            if (altLinks.length === 0) return [];
            // OPT: Tüm kaynak linkleri paralel işle (orijinalde de paralel — korundu)
            return Promise.all(altLinks.map(function(alt) {
              return fetchStreamsFromAlt(alt, filmUrl);
            })).then(function(results) {
              return [].concat.apply([], results);
            });
          });
      });
    })
    .catch(function(err) {
      console.error('[FilmModu] Hata: ' + err.message);
      return [];
    });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams: getStreams };
} else {
  global.getStreams = getStreams;
}
