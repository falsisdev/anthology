// ============================================================
//  FilmModu — Nuvio Provider
//  CloudStream (Kotlin) → Nuvio (JavaScript) port
//  Kaynak: FilmModu.kt by @keyiflerolsun / @KekikAkademi
//  Sadece Film (movie) destekler
// ============================================================

var BASE_URL = 'https://www.filmmodu.one';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer': BASE_URL + '/'
};

// ── Yardımcı: TMDB'den film bilgisi çek ─────────────────────
async function fetchTmdbInfo(tmdbId) {
  let cleanId = String(tmdbId || '').trim();
  if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];

  let numericId = cleanId;
  if (cleanId.startsWith('tt')) {
    try {
      const fRes = await fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
      if (fRes.ok) {
        const fData = await fRes.json();
        if (fData.movie_results && fData.movie_results.length > 0) {
          numericId = fData.movie_results[0].id;
        }
      }
    } catch (e) {}
  }

  var url = 'https://api.themoviedb.org/3/movie/' + numericId
    + '?api_key=' + TMDB_API_KEY
    + '&language=tr-TR';

  const r = await fetch(url);
  if (!r.ok) throw new Error('TMDB yanıt vermedi: ' + r.status);
  const data = await r.json();
  return {
    titleTr:  data.title || '',
    titleEn:  data.original_title || '',
    year:     data.release_date ? data.release_date.slice(0, 4) : ''
  };
}

// ── Yardımcı: Başlığı URL karşılaştırması için normalize et ─
function normalizeForUrl(str) {
  return str
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

// ── Yardımcı: Sonuçlar arasından en iyi eşleşmeyi bul ───────
function findBestMatch(results, searchTitle, year) {
  var normalizedSearch = normalizeForUrl(searchTitle);

  // 1. Hem başlık hem yıl URL'de eşleşiyor mu?
  if (year) {
    for (var i = 0; i < results.length; i++) {
      var normalizedHref = normalizeForUrl(results[i].href);
      if (normalizedHref.indexOf(normalizedSearch) !== -1 && results[i].href.indexOf(year) !== -1) {
        console.log('[FilmModu] Başlık+yıl eşleşti: ' + results[i].href);
        return results[i].href;
      }
    }
  }

  // 2. Sadece başlık URL'de eşleşiyor mu?
  for (var j = 0; j < results.length; j++) {
    var normalizedHref2 = normalizeForUrl(results[j].href);
    if (normalizedHref2.indexOf(normalizedSearch) !== -1) {
      console.log('[FilmModu] Başlık eşleşti: ' + results[j].href);
      return results[j].href;
    }
  }

  // 3. Sadece yıl URL'de eşleşiyor mu?
  if (year) {
    for (var k = 0; k < results.length; k++) {
      if (results[k].href.indexOf(year) !== -1) {
        console.log('[FilmModu] Yıl eşleşti: ' + results[k].href);
        return results[k].href;
      }
    }
  }

  // 4. Hiçbiri eşleşmediyse null döndür (yanlış film seçme)
  console.log('[FilmModu] Güvenilir eşleşme bulunamadı, atlanıyor');
  return null;
}

// ── Yardımcı: FilmModu'nda arama yap ────────────────────────
function searchFilmModu(title, year) {
  var searchUrl = BASE_URL + '/film-ara?term=' + encodeURIComponent(title);
  console.log('[FilmModu] Aranıyor: ' + searchUrl);

  return fetch(searchUrl, { headers: HEADERS, redirect: 'follow' })
    .then(function(r) {
      if (!r.ok) throw new Error('Arama başarısız: ' + r.status);
      // Redirect olduysa zaten film sayfasındayız
      var finalUrl = r.url;
      if (finalUrl && finalUrl !== searchUrl && finalUrl.indexOf('/film-ara') === -1) {
        console.log('[FilmModu] Direkt film sayfasına yönlendirildi: ' + finalUrl);
        return { redirectUrl: finalUrl, html: null };
      }
      return r.text().then(function(html) { return { redirectUrl: null, html: html }; });
    })
    .then(function(result) {
      // Redirect ile direkt film sayfasına geldik
      if (result.redirectUrl) return result.redirectUrl;

      var cheerio = require('cheerio-without-node-native');
      var $ = cheerio.load(result.html);

      // Sayfa zaten bir film sayfası mı? (div.alternates varsa)
      if ($('div.alternates').length > 0) {
        var canonical = $('link[rel="canonical"]').attr('href') || '';
        if (canonical) {
          console.log('[FilmModu] Sayfa film sayfası, canonical: ' + canonical);
          return canonical;
        }
        // canonical yoksa mevcut URL'i döndür
        return searchUrl;
      }

      var results = [];
      $('div.movie').each(function() {
        var a    = $(this).find('a').first();
        var href = a.attr('href') || '';
        var text = a.text().trim();
        if (href) results.push({ href: href, text: text });
      });

      console.log('[FilmModu] Bulunan sonuç sayısı: ' + results.length);
      if (results.length === 0) return null;

      return findBestMatch(results, title, year);
    });
}

// ── Yardımcı: Film sayfasından kaynak linklerini çek ────────
function fetchAlternateLinks(filmUrl) {
  console.log('[FilmModu] Film sayfası: ' + filmUrl);

  return fetch(filmUrl, { headers: HEADERS })
    .then(function(r) {
      if (!r.ok) throw new Error('Film sayfası yüklenemedi: ' + r.status);
      return r.text();
    })
    .then(function(html) {
      var cheerio = require('cheerio-without-node-native');
      var $ = cheerio.load(html);
      var links = [];

      $('div.alternates a').each(function() {
        var href = $(this).attr('href') || '';
        var name = $(this).text().trim();
        // Fragman ve Türkçe Dublaj linklerini atla, sadece Türkçe Altyazılı al
        if (name && name !== 'Fragman' && name !== 'Türkçe Altyazılı' && href) {
          links.push({ href: href, name: name });
        }
      });

      console.log('[FilmModu] Kaynak linki sayısı: ' + links.length);
      return links;
    });
}

// ── Yardımcı: Tek bir kaynak linkinden stream çek ───────────
function fetchStreamsFromAlt(altLink, filmUrl) {
  var altHeaders = Object.assign({}, HEADERS, { 'Referer': filmUrl });

  return fetch(altLink.href, { headers: altHeaders })
    .then(function(r) {
      if (!r.ok) return [];
      return r.text();
    })
    .then(function(altHtml) {
      var videoIdMatch   = altHtml.match(/var videoId\s*=\s*'([^']+)'/);
      var videoTypeMatch = altHtml.match(/var videoType\s*=\s*'([^']+)'/);

      if (!videoIdMatch || !videoTypeMatch) {
        console.log('[FilmModu] videoId/videoType bulunamadı: ' + altLink.href);
        return [];
      }

      var videoId   = videoIdMatch[1];
      var videoType = videoTypeMatch[1];
      var sourceUrl = BASE_URL + '/get-source?movie_id=' + videoId + '&type=' + videoType;

      console.log('[FilmModu] get-source isteği: ' + sourceUrl);

      var sourceHeaders = Object.assign({}, HEADERS, {
        'Referer':          altLink.href,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept':           'application/json, text/javascript, */*'
      });

      return fetch(sourceUrl, { headers: sourceHeaders })
        .then(function(r) {
          if (!r.ok) return [];
          return r.json();
        })
        .then(function(data) {
          var streams = [];

          if (!data || !data.sources || data.sources.length === 0) {
            console.log('[FilmModu] Kaynak bulunamadı: ' + altLink.name);
            return streams;
          }

          // Altyazı varsa logla (Nuvio subtitle desteği için ileride kullanılabilir)
          if (data.subtitle) {
            console.log('[FilmModu] Altyazı mevcut: ' + data.subtitle);
          }

          // Altyazı URL'ini tam adrese çevir
          var subtitleUrl = null;
          if (data.subtitle) {
            subtitleUrl = data.subtitle.startsWith('http')
              ? data.subtitle
              : BASE_URL + data.subtitle;
          }

          data.sources.forEach(function(source) {
            if (!source.src) return;
            var qualityLabel = source.label || source.res ? (source.res + 'p') : 'HD';
            // m3u8 uzantısı yoksa ekle
            var srcUrl = source.src;
            if (srcUrl.indexOf('.m3u8') === -1) srcUrl = srcUrl + '.m3u8';
            var streamObj = {
              name:    'FilmModu',
              title:   altLink.name + ' • ' + qualityLabel,
              url:     srcUrl,
              quality: qualityLabel,
              type:    'hls',
              headers: {
                'Referer':    BASE_URL + '/',
                'User-Agent': HEADERS['User-Agent']
              }
            };
            if (subtitleUrl) {
              streamObj.subtitles = [{
                url:      subtitleUrl,
                language: 'Türkçe',
                label:    'Türkçe'
              }];
            }
            streams.push(streamObj);
            console.log('[FilmModu] Stream: ' + qualityLabel + ' | ' + source.src);
          });
          return streams;
        })
        .catch(function(err) {
          console.error('[FilmModu] get-source hatası (' + altLink.name + '): ' + err.message);
          return [];
        });
    })
    .catch(function(err) {
      console.error('[FilmModu] Alt link hatası (' + altLink.href + '): ' + err.message);
      return [];
    });
}

// ── Ana fonksiyon ────────────────────────────────────────────
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  if (typeof tmdbId === 'object' && tmdbId && tmdbId.id) {
    return getStreams(tmdbId.id, mediaType || 'movie', seasonNum, episodeNum);
  }
  if (typeof tmdbId === 'string' && tmdbId.startsWith('filmmodu:')) {
    var slug = tmdbId.replace('filmmodu:', '');
    var filmUrl = BASE_URL + '/' + slug;
    return fetchAlternateLinks(filmUrl).then(function(altLinks) {
      return Promise.all(altLinks.map(function(alt) { return fetchStreamsFromAlt(alt, filmUrl); }))
        .then(function(results) {
          var allStreams = [];
          results.forEach(function(arr) { if (arr) arr.forEach(function(s) { allStreams.push(s); }); });
          return allStreams;
        });
    });
  }
  // FilmModu sadece film içeriği sunar
  if (mediaType && mediaType !== 'movie') {
    console.log('[FilmModu] Sadece film destekleniyor, mediaType: ' + mediaType);
    return Promise.resolve([]);
  }

  console.log('[FilmModu] === Başlıyor | TMDB ID: ' + tmdbId + ' ===');

  return fetchTmdbInfo(tmdbId)
    .then(function(info) {
      if (!info.titleEn && !info.titleTr) {
        console.log('[FilmModu] TMDB başlık bulunamadı');
        return [];
      }

      console.log('[FilmModu] Film: ' + info.titleEn + ' / ' + info.titleTr + ' (' + info.year + ')');

      // Önce orijinal (İngilizce) başlıkla ara, bulamazsa Türkçeyle dene
      return searchFilmModu(info.titleEn, info.year)
        .then(function(filmUrl) {
          if (!filmUrl && info.titleTr && info.titleTr !== info.titleEn) {
            console.log('[FilmModu] Orijinal başlıkla bulunamadı, Türkçe deneniyor: ' + info.titleTr);
            return searchFilmModu(info.titleTr, info.year);
          }
          return filmUrl;
        })
        .then(function(filmUrl) {
          if (!filmUrl) {
            console.log('[FilmModu] Film sitede bulunamadı');
            return [];
          }

          return fetchAlternateLinks(filmUrl)
            .then(function(altLinks) {
              if (altLinks.length === 0) {
                console.log('[FilmModu] Hiç kaynak linki yok');
                return [];
              }

              // Tüm kaynak linklerini paralel işle
              var promises = altLinks.map(function(alt) {
                return fetchStreamsFromAlt(alt, filmUrl);
              });

              return Promise.all(promises).then(function(results) {
                var allStreams = [];
                results.forEach(function(arr) {
                  if (arr && arr.length > 0) {
                    arr.forEach(function(s) { allStreams.push(s); });
                  }
                });
                console.log('[FilmModu] Toplam stream: ' + allStreams.length);
                return allStreams;
              });
            });
        });
    })
    .catch(function(err) {
      console.error('[FilmModu] Genel hata: ' + err.message);
      return [];
    });
}

// ── Export ───────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
                    }

// ── Catalog & Meta Entegrasyonu ──────────────────────────────
function getCatalog(args) {
  var query = (args && args.search) || (args && args.extra && args.extra.search) || (args && args.query) || '';
  var targetUrl = query ? (BASE_URL + '/film-ara?term=' + encodeURIComponent(query)) : (BASE_URL + '/');

  return fetch(targetUrl, { headers: HEADERS })
    .then(function(res) { return res.text(); })
    .then(function(html) {
      var cheerio = require('cheerio-without-node-native');
      var $ = cheerio.load(html);
      var metas = [];
      var seen = new Set();

      $('div.movie').each(function() {
        var a = $(this).find('a').first();
        var img = $(this).find('img').first();
        var href = a.attr('href') || '';
        var title = a.text().trim() || img.attr('alt') || '';
        var poster = img.attr('data-src') || img.attr('src') || '';
        var slug = href.replace(BASE_URL, '').replace(/^\//, '').replace(/\/$/, '');

        if (slug && !seen.has(slug) && title) {
          seen.add(slug);
          metas.push({
            id: 'filmmodu:' + slug,
            type: 'movie',
            name: title,
            poster: poster,
            background: poster,
            genres: ['FilmModu', 'Film'],
            description: title + ' - FilmModu HD Film'
          });
        }
      });

      return { metas: metas };
    })
    .catch(function() { return { metas: [] }; });
}

function getMeta(args) {
  var rawId = (typeof args === 'string') ? args : (args && args.id ? args.id : '');
  if (!rawId || !rawId.startsWith('filmmodu:')) return Promise.resolve({ meta: null });

  var slug = rawId.replace('filmmodu:', '');
  var filmUrl = BASE_URL + '/' + slug;

  return fetch(filmUrl, { headers: HEADERS })
    .then(function(res) { return res.text(); })
    .then(function(html) {
      var cheerio = require('cheerio-without-node-native');
      var $ = cheerio.load(html);
      var title = $('h1').first().text().trim() || $('title').first().text().replace(/film izle.*/i, '').trim();
      var poster = $('div.poster img').first().attr('src') || $('div.poster img').first().attr('data-src') || '';
      var desc = $('div.description, div.summary, p').first().text().trim();

      return {
        meta: {
          id: rawId,
          type: 'movie',
          name: title,
          poster: poster,
          background: poster,
          description: desc,
          genres: ['FilmModu', 'Film'],
          videos: [{ id: rawId, title: title }]
        }
      };
    })
    .catch(function() { return { meta: null }; });
}

// ── Export Güncellemesi ───────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams: getStreams, getCatalog: getCatalog, getMeta: getMeta };
} else {
  global.getStreams = getStreams;
  global.getCatalog = getCatalog;
  global.getMeta = getMeta;
}
