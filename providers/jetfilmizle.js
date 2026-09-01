// JetFilmizle — Nuvio Provider (Optimized)
// Orijinale göre değişiklikler:
//  1. fetchWithTimeout: 8s
//  2. findFilmPage: direkt URL adayları PARALEL denenir (orijinalde tryDirect sıralıydı)
//  3. fetchPixeldrainStream: info endpoint timeout'u düşürüldü
//  4. TMDB + arama sıralı zinciri korundu (TMDB olmadan arama yapılamaz)

var BASE_URL         = 'https://jetfilmizle.net';
var TMDB_API_KEY     = '500330721680edb6d5f7f12ba7cd9023';
var FETCH_TIMEOUT_MS = 8000;

var HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer':         BASE_URL + '/'
};

function fetchWithTimeout(url, options, ms) {
  var timeout = ms || FETCH_TIMEOUT_MS;
  return new Promise(function(resolve, reject) {
    var t = setTimeout(function() { reject(new Error('Timeout: ' + url)); }, timeout);
    fetch(url, options)
      .then(function(r) { clearTimeout(t); resolve(r); })
      .catch(function(e) { clearTimeout(t); reject(e); });
  });
}

function titleToSlug(t) {
  return (t || '').toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
    .replace(/ç/g,'c').replace(/â/g,'a').replace(/û/g,'u')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function fetchTmdbInfo(tmdbId) {
  return fetchWithTimeout('https://api.themoviedb.org/3/movie/' + tmdbId
    + '?api_key=' + TMDB_API_KEY + '&language=tr-TR', {})
    .then(function(r) { return r.json(); })
    .then(function(d) {
      return {
        titleTr: d.title || '',
        titleEn: d.original_title || '',
        year:    (d.release_date || '').slice(0, 4)
      };
    });
}

function searchFilm(query) {
  return fetchWithTimeout(BASE_URL + '/filmara.php', {
    method: 'POST',
    headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
    body: 's=' + encodeURIComponent(query)
  })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var re = /href="(https?:\/\/jetfilmizle\.net\/film\/[^"?#]+)"/g;
      var m, seen = {}, links = [];
      while ((m = re.exec(html)) !== null) {
        if (!seen[m[1]]) { seen[m[1]] = true; links.push(m[1]); }
      }
      return links;
    })
    .catch(function() { return []; });
}

// OPT: Direkt URL adaylarını paralel dene — ilk geçerli olanı al
function findFilmPage(titleTr, titleEn) {
  var slugTr = titleToSlug(titleTr);
  var slugEn = titleToSlug(titleEn);
  var direct = [];
  if (slugTr) direct.push(BASE_URL + '/film/' + slugTr);
  if (slugEn && slugEn !== slugTr) direct.push(BASE_URL + '/film/' + slugEn);

  function isValidFilmPage(html) {
    return html.indexOf('div#movie') !== -1
        || html.indexOf('download-btn') !== -1
        || html.indexOf('film_id') !== -1;
  }

  return new Promise(function(resolve, reject) {
    if (direct.length === 0) return trySearch().then(resolve).catch(reject);

    var resolved = false;
    var done = 0;

    direct.forEach(function(url) {
      fetchWithTimeout(url, { headers: HEADERS })
        .then(function(r) {
          if (!r.ok) throw new Error(r.status + '');
          return r.text();
        })
        .then(function(html) {
          done++;
          if (!resolved && isValidFilmPage(html)) {
            resolved = true;
            resolve({ url: url, html: html });
          } else if (done === direct.length && !resolved) {
            trySearch().then(resolve).catch(reject);
          }
        })
        .catch(function() {
          done++;
          if (done === direct.length && !resolved) {
            trySearch().then(resolve).catch(reject);
          }
        });
    });
  });

  function trySearch() {
    return searchFilm(titleTr)
      .then(function(links) {
        if (!links.length && titleEn && titleEn !== titleTr) return searchFilm(titleEn);
        return links;
      })
      .then(function(links) {
        if (!links.length) throw new Error('Film bulunamadi: ' + titleTr);
        var normTr = slugTr, normEn = slugEn;
        var best = null;
        for (var i = 0; i < links.length; i++) {
          var slug = (links[i].split('/film/')[1] || '').replace(/\/$/, '');
          if (slug === normTr || slug === normEn) { best = links[i]; break; }
        }
        var target = best || links[0];
        return fetchWithTimeout(target, { headers: HEADERS })
          .then(function(r) { return r.text(); })
          .then(function(html) { return { url: target, html: html }; });
      });
  }
}

function parseFilmPage(html) {
  var result = { iframeSrc: null, pixeldrains: [] };
  var iframeRe = /<iframe[^>]+(?:data-litespeed-src|src)="([^"]+)"/gi;
  var m;
  while ((m = iframeRe.exec(html)) !== null) {
    if (!result.iframeSrc) result.iframeSrc = m[1];
  }
  var pdRe = /href="(https?:\/\/pixeldrain\.com\/u\/[^"]+)"/g;
  while ((m = pdRe.exec(html)) !== null) result.pixeldrains.push(m[1]);
  return result;
}

function fetchPixeldrainStream(pdUrl) {
  var fileId = pdUrl.split('/u/').pop().split('?')[0];
  // OPT: info endpoint timeout 4s (küçük meta isteği, hızlı olmalı)
  return fetchWithTimeout('https://pixeldrain.com/api/file/' + fileId + '/info', {}, 4000)
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(info) {
      var name = (info && info.name) || '';
      var size = (info && info.size) || 0;
      var quality = /2160p|4k/i.test(name) ? '4K'
                  : /1080p/i.test(name)    ? '1080p'
                  : /720p/i.test(name)     ? '720p'
                  : /480p/i.test(name)     ? '480p' : 'Auto';
      return {
        url:     'https://pixeldrain.com/api/file/' + fileId + '?download',
        name:    'TR Dublaj',
        title:   'Pixeldrain ' + quality + (size ? ' · ' + Math.round(size/1024/1024) + 'MB' : ''),
        quality: quality,
        headers: { 'Referer': 'https://pixeldrain.com/' }
      };
    })
    .catch(function() {
      return {
        url:     'https://pixeldrain.com/api/file/' + fileId + '?download',
        name:    'TR Dublaj', title: 'Pixeldrain', quality: 'Auto',
        headers: { 'Referer': 'https://pixeldrain.com/' }
      };
    });
}

function fetchJetvStream(iframeUrl) {
  var fullUrl = iframeUrl.startsWith('//') ? 'https:' + iframeUrl : iframeUrl;
  return fetchWithTimeout(fullUrl, {
    headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' })
  })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var srcMatch = html.match(/"sources"\s*:\s*\[\s*\{[^}]+\}/);
      if (srcMatch) {
        var fileM  = srcMatch[0].match(/"file"\s*:\s*"([^"]+)"/);
        var labelM = srcMatch[0].match(/"label"\s*:\s*"([^"]+)"/);
        if (fileM) return {
          url: fileM[1], name: 'TR Dublaj', title: 'Jetv',
          quality: labelM ? labelM[1] : 'Auto', type: 'hls',
          headers: { 'Referer': fullUrl }
        };
      }
      var innerM = html.match(/<iframe[^>]+src="([^"]+)"/i);
      if (innerM) return fetchJetvStream(innerM[1]);
      return null;
    })
    .catch(function() { return null; });
}

function getStreams(tmdbId, mediaType) {
  return fetchTmdbInfo(tmdbId)
    .then(function(info) {
      return findFilmPage(info.titleTr, info.titleEn);
    })
    .then(function(result) {
      var parsed   = parseFilmPage(result.html);
      var streams  = [];
      var promises = [];

      if (parsed.pixeldrains.length > 0) {
        promises.push(
          Promise.all(parsed.pixeldrains.map(fetchPixeldrainStream))
            .then(function(pdStreams) {
              var seen = {};
              pdStreams.forEach(function(s) {
                if (!seen[s.url]) { seen[s.url] = true; streams.push(s); }
              });
            })
        );
      }

      if (parsed.iframeSrc) {
        var src = parsed.iframeSrc;
        if (src.indexOf('jetv.xyz') !== -1 || src.indexOf('d2rs.com') !== -1 || src.indexOf('d2rs') !== -1) {
          promises.push(
            fetchJetvStream(src).then(function(s) { if (s) streams.push(s); })
          );
        }
      }

      return Promise.all(promises).then(function() { return streams; });
    })
    .catch(function(err) {
      console.log('[JetFilmizle] Hata: ' + err.message);
      return [];
    });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams: getStreams };
} else {
  global.getStreams = getStreams;
}
