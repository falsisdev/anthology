const { sortStreamsByQuality } = require("../shared/quality.js");
const { loadConfig, val, wrapAll } = require("../shared/config.js");

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v;
            v = val('urls.movies.filmmodu.base'); if (v) BASE_URL = String(v).replace(/\/+$/, '');
            v = val('urls.movies.filmmodu.live'); if (v) LIVE_URL = String(v).replace(/\/+$/, '');
            v = val('urls.movies.filmmodu.player'); if (v) PLAYER_HOST = String(v).replace(/\/+$/, '');
            if (HEADERS) HEADERS.Referer = BASE_URL + '/';
        });
    }
    return _cfgReady;
}

// ============================================================
//  FilmModu — Nuvio Provider
//  CloudStream (Kotlin) → Nuvio (JavaScript) port
//  Sadece Film (movie) destekler
//  Gelişmiş akış doğrulama (playability validation) ve
//  FilmModu ağı yedekleme (filmmodu.live) entegrasyonu
// ============================================================

var BASE_URL = 'https://www.filmmodu.one';
var LIVE_URL = 'https://filmmodu.live';
var PLAYER_HOST = 'https://play2.pilavyerplay.top';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer': BASE_URL + '/'
};

// ── Güvenli Cheerio Yükleyici (QuickJS uyumlu) ────────────────
var cheerio = (function() {
  try { if (typeof require !== 'undefined') return require('cheerio-without-node-native'); } catch (e) {}
  try { if (typeof require !== 'undefined') return require('cheerio'); } catch (e2) {}
  return null;
})();

// ── Yardımcı: Zaman aşımı sinyali (QuickJS uyumlu) ───────────
function timeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    try { return AbortSignal.timeout(ms); } catch (e) {}
  }
  if (typeof AbortController !== 'undefined') {
    var c = new AbortController();
    setTimeout(function() { try { c.abort(); } catch (e) {} }, ms);
    return c.signal;
  }
  return null;
}

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

// ── Yardımcı: Başlık temizleme (noktalama ve özel karakterler)
function cleanTitle(str) {
  if (!str) return '';
  return str
    .replace(/[:"'\-_/\\,.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Yardımcı: Başlığı URL karşılaştırması için normalize et ─
function normalizeForUrl(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/â|á|à/g, 'a').replace(/î|í/g, 'i').replace(/û|ú/g, 'u')
    .replace(/[^a-z0-9]/g, '');
}

// ── Yardımcı: Sonuçlar arasından en iyi eşleşmeyi bul ───────
function slugFromHref(href) {
  try {
    var last = href.split('/').filter(Boolean).pop() || '';
    return last.replace(/-film-izle.*$/i, '').replace(/-izle.*$/i, '').trim();
  } catch (e) { return href; }
}

function findBestMatch(results, searchTitle, year) {
  var normalizedSearch = normalizeForUrl(searchTitle);
  var slugSearch = normalizeForUrl(slugFromHref(searchTitle));

  // 0. Slug tam eşleşme (en güvenilir) — ör. "the-matrix" vs "the-matrix-reloaded"
  for (var s = 0; s < results.length; s++) {
    var slugNorm = normalizeForUrl(slugFromHref(results[s].href));
    if (slugNorm === normalizedSearch || slugNorm === slugSearch) {
      console.log('[FilmModu] Slug tam eşleşti: ' + results[s].href);
      return results[s].href;
    }
  }
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

  // 2. Sadece başlık URL'de eşleşiyor mu? (slug içinde, en kısa eşleşmeyi tercih et)
  var best = null;
  var bestLen = Infinity;
  for (var j = 0; j < results.length; j++) {
    var normalizedHref2 = normalizeForUrl(results[j].href);
    if (normalizedHref2.indexOf(normalizedSearch) !== -1) {
      var len = normalizedHref2.length;
      if (len < bestLen) { best = results[j].href; bestLen = len; }
    }
  }
  if (best) {
    console.log('[FilmModu] Başlık eşleşti (en kısa): ' + best);
    return best;
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

  console.log('[FilmModu] Güvenilir eşleşme bulunamadı, atlanıyor');
  return null;
}

// ── Yardımcı: FilmModu.one'da arama yap (301/404 dayanıklı) ──
function searchFilmModu(rawTitle, year) {
  var title = cleanTitle(rawTitle);
  if (!title) return Promise.resolve(null);

  var searchUrl = BASE_URL + '/film-ara?term=' + encodeURIComponent(title);
  console.log('[FilmModu] Aranıyor: ' + searchUrl);

  return fetch(searchUrl, { headers: HEADERS, redirect: 'manual' })
    .then(function(r) {
      if (r.status === 301 || r.status === 302) {
        var loc = r.headers.get('location');
        if (loc && loc.indexOf('/film-ara') === -1) {
          return fetch(loc, { headers: HEADERS })
            .then(function(locRes) {
              if (locRes.ok) return { redirectUrl: loc, html: null };
              return { redirectUrl: null, html: null };
            })
            .catch(function() { return { redirectUrl: null, html: null }; });
        }
      }
      if (!r.ok && r.status !== 301 && r.status !== 302) {
        return { redirectUrl: null, html: null };
      }
      return r.text().then(function(html) { return { redirectUrl: null, html: html }; });
    })
    .then(function(result) {
      if (!result) return null;
      if (result.redirectUrl) return result.redirectUrl;
      if (!result.html) return null;

      
      var $ = cheerio.load(result.html);

      // Sayfa zaten bir film sayfası mı? (div.alternates varsa)
      if ($('div.alternates').length > 0) {
        var canonical = $('link[rel="canonical"]').attr('href') || '';
        if (canonical) {
          console.log('[FilmModu] Sayfa film sayfası, canonical: ' + canonical);
          return canonical;
        }
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
    })
    .catch(function(err) {
      console.log('[FilmModu] Arama hatası: ' + err.message);
      return null;
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
      
      var $ = cheerio.load(html);
      var links = [];

      $('div.alternates a').each(function() {
        var href = $(this).attr('href') || '';
        var name = $(this).text().trim();
        // Fragman linkini kesinlikle atla!
        if (name && !name.toLowerCase().includes('fragman') && href) {
          if (!links.some(function(l) { return l.href === href; })) {
            links.push({ href: href, name: name });
          }
        }
      });

      // Alternates boşsa ana sayfayı ekle
      if (links.length === 0) {
        links.push({ href: filmUrl, name: 'Ana Kaynak' });
      }

      console.log('[FilmModu] Kaynak linki sayısı: ' + links.length);
      return links;
    });
}

// ── Yardımcı: M3U8 Segment Canlılık Doğrulayıcı ─────────────
// Ölü/503 veren CDN düğümlerini (canvopics.life, ytconvertor.click vb.) tespit edip eler.
function verifySegmentPlayable(m3u8Url, headers) {
  var sig = timeoutSignal(3500);
  var opts = { headers: headers };
  if (sig) opts.signal = sig;

  return fetch(m3u8Url, opts)
    .then(function(res) {
      if (!res.ok) return false;
      return res.text().then(function(text) {
        var lines = text.split('\n');
        var firstSeg = null;
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (line && line.indexOf('#') !== 0 && line.indexOf('http') === 0) {
            firstSeg = line;
            break;
          }
        }
        if (!firstSeg) return false;

        var segSig = timeoutSignal(3500);
        var segHdrs = Object.assign({}, headers, { 'Range': 'bytes=0-1024' });
        var segOpts = { method: 'GET', headers: segHdrs };
        if (segSig) segOpts.signal = segSig;

        return fetch(firstSeg, segOpts)
          .then(function(segRes) {
            var ok = segRes.ok || segRes.status === 206;
            if (!ok) {
              console.log('[FilmModu] Segment oynatılamaz (HTTP ' + segRes.status + '): ' + firstSeg.slice(0, 60));
            }
            return ok;
          })
          .catch(function() {
            return false;
          });
      });
    })
    .catch(function() {
      return false;
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
      var videoTypeMatch = altHtml.match(/var videoType\s*=\s*'([^']*)'/);

      if (!videoIdMatch) {
        console.log('[FilmModu] videoId bulunamadı: ' + altLink.href);
        return [];
      }

      var videoId   = videoIdMatch[1];
      var videoType = (videoTypeMatch && videoTypeMatch[1]) || '';
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
          if (!data || !data.sources || data.sources.length === 0) {
            console.log('[FilmModu] Kaynak bulunamadı: ' + altLink.name);
            return [];
          }

          var subtitleUrl = null;
          if (data.subtitle) {
            subtitleUrl = data.subtitle.startsWith('http')
              ? data.subtitle
              : BASE_URL + data.subtitle;
          }

          var fmHeaders = {
            'Referer':    BASE_URL + '/',
            'User-Agent': HEADERS['User-Agent']
          };

          // İlk kaynağı test ederek CDN depolama düğümünün canlı olduğunu doğrula (503 filtresi)
          var probeSrc = data.sources[0].src;
          if (probeSrc.indexOf('.m3u8') === -1) probeSrc = probeSrc + '.m3u8';

          return verifySegmentPlayable(probeSrc, fmHeaders).then(function(isPlayable) {
            if (!isPlayable) {
              console.log('[FilmModu] ❌ Ölü CDN depolama filtresi: ' + altLink.name + ' akışları elendi.');
              return [];
            }

            var streams = [];
            data.sources.forEach(function(source) {
              if (!source.src) return;
              var qualityLabel = source.label || source.res ? (source.res + 'p') : 'HD';
              var srcUrl = source.src;
              if (srcUrl.indexOf('.m3u8') === -1) srcUrl = srcUrl + '.m3u8';

              var streamObj = {
                name:    'FilmModu',
                title:   altLink.name + ' • ' + qualityLabel,
                url:     srcUrl,
                quality: qualityLabel,
                type:    'hls',
                format:  'hls',
                isHls:   true,
                headers: fmHeaders,
                behaviorHints: {
                  notWebReady: true,
                  proxyHeaders: {
                    request: fmHeaders
                  }
                }
              };
              if (subtitleUrl) {
                streamObj.subtitles = [{
                  url:      subtitleUrl,
                  language: 'Türkçe',
                  label:    'Türkçe',
                  format:   'vtt',
                  type:     'text/vtt'
                }];
              }
              streams.push(streamObj);
            });
            return streams;
          });
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

// ── FilmModu Ağı Yedek Kaynağı (filmmodu.live / Pilavyer) ────
function fetchStreamsFromLive(rawTitle, year) {
  var q = cleanTitle(rawTitle);
  if (!q) return Promise.resolve([]);

  var searchUrl = LIVE_URL + '/ara?q=' + encodeURIComponent(q);
  console.log('[FilmModu.live] Aranıyor: ' + searchUrl);

  var liveHeaders = {
    'User-Agent': HEADERS['User-Agent'],
    'Referer':    LIVE_URL + '/'
  };

  var sig = timeoutSignal(5000);
  var opts = { headers: liveHeaders };
  if (sig) opts.signal = sig;

  return fetch(searchUrl, opts)
    .then(function(r) { return r.ok ? r.text() : ''; })
    .then(function(html) {
      if (!html) return [];
      
      var $ = cheerio.load(html);

      var filmHref = null;
      var normQ = normalizeForUrl(q);

      // Sadece 'Filmler' bölümündeki sonuçları tara
      var filmSection = null;
      $('section').each(function() {
        if ($(this).find('h2.section-title').text().indexOf('Filmler') !== -1) {
          filmSection = $(this);
        }
      });

      var container = filmSection || $('main');
      var candidates = [];
      container.find('a[href*="/film/"]').each(function() {
        var href = $(this).attr('href') || '';
        if (href.indexOf('https://') !== 0) href = LIVE_URL + href;
        var candTitle = $(this).find('h3').text().trim() || $(this).find('img').attr('alt') || '';
        var candYear = $(this).find('p').text().trim() || '';
        if (!candidates.some(function(c) { return c.href === href; })) {
          candidates.push({ href: href, title: candTitle, year: candYear });
        }
      });

      var stopWords = ['the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'bir', 've', 'ile', 'icin', 'de', 'da'];
      var meaningfulWords = q.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 2 && stopWords.indexOf(w) === -1; });
      var words = meaningfulWords.length > 0 ? meaningfulWords : q.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 2; });
      var bestScore = -1;
      for (var i = 0; i < candidates.length; i++) {
        var cand = candidates[i];
        var normH = normalizeForUrl(cand.href);
        var normT = normalizeForUrl(cand.title);
        var score = 0;

        var fullMatch = normH.indexOf(normQ) !== -1 || normT.indexOf(normQ) !== -1;
        if (fullMatch) {
          score += 10;
        }

        var matchedWords = words.filter(function(w) {
          var nw = normalizeForUrl(w);
          return normH.indexOf(nw) !== -1 || normT.indexOf(nw) !== -1;
        });

        if (!fullMatch && matchedWords.length === 0) {
          continue;
        }

        if (year && cand.year && cand.year === year) {
          score += 8;
        } else if (year && cand.href.indexOf(year) !== -1) {
          score += 5;
        }

        score += matchedWords.length * 3;

        if (score > bestScore && score >= 3) {
          bestScore = score;
          filmHref = cand.href;
        }
      }
      if (!filmHref) return [];

      console.log('[FilmModu.live] Film bulundu: ' + filmHref);
      var sigPage = timeoutSignal(5000);
      var pageOpts = { headers: liveHeaders };
      if (sigPage) pageOpts.signal = sigPage;

      return fetch(filmHref, pageOpts)
        .then(function(pr) { return pr.ok ? pr.text() : ''; })
        .then(function(pHtml) {
          if (!pHtml) return [];
          var pvMatch = pHtml.match(/data-pv="([^"]+)"/);
          if (!pvMatch) return [];
          var pv = pvMatch[1];
          var playerEmbedUrl = PLAYER_HOST + '/assets/js/s.php?s=' + encodeURIComponent(pv);

          var sigEmb = timeoutSignal(5000);
          var embOpts = { headers: { 'Referer': LIVE_URL + '/', 'User-Agent': HEADERS['User-Agent'] } };
          if (sigEmb) embOpts.signal = sigEmb;

          return fetch(playerEmbedUrl, embOpts)
            .then(function(er) { return er.ok ? er.text() : ''; })
            .then(function(eHtml) {
              if (!eHtml) return [];
              var jsonMatch = eHtml.match(/window\.__PLAYER__\s*=\s*(\{[\s\S]*?\});<\/script>/) || eHtml.match(/window\.__PLAYER__\s*=\s*(\{.*?\});/);
              if (!jsonMatch) return [];

              var pData = null;
              try { pData = JSON.parse(jsonMatch[1]); } catch (e) { return []; }
              if (!pData || !pData.stream) return [];

              var subtitles = [];
              if (Array.isArray(pData.subs)) {
                pData.subs.forEach(function(sub) {
                  if (sub && sub.src) {
                    subtitles.push({
                      id:       sub.sid || 'tr',
                      url:      sub.src,
                      file:     sub.src,
                      lang:     sub.lang === 'tr' ? 'tur' : 'eng',
                      language: sub.lang || 'tr',
                      label:    sub.label || 'Türkçe',
                      title:    sub.label || 'Türkçe',
                      format:   'vtt',
                      type:     'text/vtt'
                    });
                  }
                });
              }

              var liveStreams = [];
              var streamHeaders = {
                'Referer':    PLAYER_HOST + '/',
                'User-Agent': HEADERS['User-Agent']
              };

              var audios = Array.isArray(pData.audios) && pData.audios.length > 0
                ? pData.audios
                : [{ label: 'Türkçe Dublaj' }];

              audios.forEach(function(aud) {
                var sObj = {
                  name:    'FilmModu',
                  title:   (aud.label || 'Türkçe Dublaj') + ' • 1080p FHD',
                  url:     pData.stream,
                  quality: '1080p',
                  type:    'hls',
                  format:  'hls',
                  isHls:   true,
                  headers: streamHeaders,
                  behaviorHints: {
                    notWebReady: true,
                    proxyHeaders: { request: streamHeaders }
                  }
                };
                if (subtitles.length > 0) {
                  sObj.subtitles = subtitles;
                }
                liveStreams.push(sObj);
              });

              console.log('[FilmModu.live] Çözülen akış sayısı: ' + liveStreams.length);
              return liveStreams;
            });
        });
    })
    .catch(function(err) {
      console.log('[FilmModu.live] Arama hatası: ' + err.message);
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
          var seen = new Set();
          results.forEach(function(arr) {
            if (arr) {
              arr.forEach(function(s) {
                if (s && s.url && !seen.has(s.url)) {
                  seen.add(s.url);
                  allStreams.push(s);
                }
              });
            }
          });
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

      // Önce orijinal başlıkla ara, bulamazsa Türkçeyle dene
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
            console.log('[FilmModu] filmmodu.one üzerinde bulunamadı, filmmodu.live deneniyor...');
            return fetchStreamsFromLive(info.titleEn, info.year).then(function(lStreams) {
              if (lStreams && lStreams.length > 0) return lStreams;
              if (info.titleTr && info.titleTr !== info.titleEn) {
                return fetchStreamsFromLive(info.titleTr, info.year);
              }
              return [];
            });
          }

          return fetchAlternateLinks(filmUrl)
            .then(function(altLinks) {
              if (altLinks.length === 0) return [];
              return Promise.all(altLinks.map(function(alt) {
                return fetchStreamsFromAlt(alt, filmUrl);
              })).then(function(results) {
                var allStreams = [];
                var seen = new Set();
                results.forEach(function(arr) {
                  if (arr && arr.length > 0) {
                    arr.forEach(function(s) {
                      if (s && s.url && !seen.has(s.url)) {
                        seen.add(s.url);
                        allStreams.push(s);
                      }
                    });
                  }
                });
                return allStreams;
              });
            })
            .then(function(validStreams) {
              if (validStreams && validStreams.length > 0) {
                console.log('[FilmModu] Toplam doğrulanmış canlı stream: ' + validStreams.length);
                return validStreams;
              }
              // filmmodu.one üzerinde tüm stream'ler 503/ölü ise filmmodu.live yedek ağını dene
              console.log('[FilmModu] filmmodu.one üzerinde canlı stream bulunamadı, filmmodu.live deneniyor...');
              return fetchStreamsFromLive(info.titleEn, info.year).then(function(lStreams) {
                if (lStreams && lStreams.length > 0) return lStreams;
                if (info.titleTr && info.titleTr !== info.titleEn) {
                  return fetchStreamsFromLive(info.titleTr, info.year);
                }
                return [];
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
// ── Universal Quality Sorter ──────────────────────────────────────────
if (typeof getStreams === "function") {
    var _origGetStreams = getStreams;
    getStreams = async function() {
        var res = await _origGetStreams.apply(this, arguments);
        return sortStreamsByQuality(res);
    };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams: getStreams };
} else if (typeof globalThis !== 'undefined') {
  globalThis.getStreams = getStreams;
}

// ── Catalog & Meta Entegrasyonu ──────────────────────────────
function getCatalog(args) {
  var query = (args && args.search) || (args && args.extra && args.extra.search) || (args && args.query) || '';
  var targetUrl = query ? (BASE_URL + '/film-ara?term=' + encodeURIComponent(query)) : (BASE_URL + '/');

  return fetch(targetUrl, { headers: HEADERS })
    .then(function(res) { return res.text(); })
    .then(function(html) {
      
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
      
      var $ = cheerio.load(html);
      var title = $('h1').first().text().trim() || $('title').first().text().replace(/film izle.*/i, '').trim();
      var poster = $('img[itemprop="image"]').attr('src')
        || $('img[itemprop="image"]').attr('data-src')
        || $('picture source').attr('data-srcset')
        || $('div.poster img').first().attr('src')
        || $('div.poster img').first().attr('data-src')
        || $('meta[property="og:image"]').attr('content')
        || '';
      if (poster && poster.startsWith('data:')) {
        poster = $('meta[property="og:image"]').attr('content') || '';
      }
      var backdrop = $('meta[property="og:image"]').attr('content') || poster;
      var desc = $('div.description, div.summary, p').first().text().trim();

      return {
        meta: {
          id: rawId,
          type: 'movie',
          name: title,
          poster: poster,
          background: backdrop,
          description: desc,
          genres: ['FilmModu', 'Film'],
          videos: [{ id: rawId, title: title }]
        }
      };
    })
    .catch(function() { return { meta: null }; });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = wrapAll({ getStreams: getStreams, getCatalog: getCatalog, getMeta: getMeta }, cfgReady);
} else if (typeof globalThis !== 'undefined') {
  globalThis.getStreams = getStreams;
  globalThis.getCatalog = getCatalog;
  globalThis.getMeta = getMeta;
}
