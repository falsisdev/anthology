// WebteIzle — Nuvio Provider (Optimized)
// Orijinale göre değişiklikler:
//  1. fetchWithTimeout: 8s — takılan embed/iframe isteği bekletmiyor
//  2. findFilmPage: slug adayları PARALEL denenir (orijinalde sıralı: tryNext(0) → tryNext(1) → ...)
//  3. fetchAlternatifler: TR Dublaj + TR Altyazı PARALEL (orijinalde Promise.all vardı — korundu)
//  4. processEmbed: her embed için ayrı timeout — bir embed takılınca diğerleri devam eder
//  5. VidMoly URL: vidmoly.to → vidmoly.net (daha kararlı)

var BASE_URL         = 'https://webteizle3.xyz';
var TMDB_API_KEY     = '500330721680edb6d5f7f12ba7cd9023';
var FETCH_TIMEOUT_MS = 8000;

var HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer':         BASE_URL + '/'
};

function fetchWithTimeout(url, options) {
  return new Promise(function(resolve, reject) {
    var t = setTimeout(function() { reject(new Error('Timeout: ' + url)); }, FETCH_TIMEOUT_MS);
    fetch(url, options)
      .then(function(r) { clearTimeout(t); resolve(r); })
      .catch(function(e) { clearTimeout(t); reject(e); });
  });
}

function fetchTmdbInfo(tmdbId, mediaType) {
  var ep = mediaType === 'tv' ? 'tv' : 'movie';
  return fetchWithTimeout('https://api.themoviedb.org/3/' + ep + '/' + tmdbId
    + '?api_key=' + TMDB_API_KEY + '&language=tr-TR', {})
    .then(function(r) { return r.json(); })
    .then(function(d) {
      return {
        titleTr: d.title  || d.name  || '',
        titleEn: d.original_title || d.original_name || '',
        year:    (d.release_date || d.first_air_date || '').slice(0, 4)
      };
    });
}

function titleToSlug(t) {
  return (t || '').toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

// OPT: Tüm slug adaylarını paralel dene — ilk başarılı olanı al
function findFilmPage(titleTr, titleEn) {
  var slugTr = titleToSlug(titleTr);
  var slugEn = titleToSlug(titleEn);
  var candidates = [];
  if (slugTr) {
    candidates.push(BASE_URL + '/izle/dublaj/' + slugTr);
    candidates.push(BASE_URL + '/izle/altyazi/' + slugTr);
  }
  if (slugEn && slugEn !== slugTr) {
    candidates.push(BASE_URL + '/izle/dublaj/' + slugEn);
    candidates.push(BASE_URL + '/izle/altyazi/' + slugEn);
  }

  // Paralel fetch — hepsi aynı anda başlar, ilk geçerli olanı döndür
  return new Promise(function(resolve) {
    var resolved = false;
    var done = 0;

    function tryCandidate(url) {
      return fetchWithTimeout(url, { headers: HEADERS })
        .then(function(r) {
          if (!r.ok) return null;
          return r.text().then(function(html) {
            if (html.indexOf('data-id') === -1) return null;
            return { url: url, html: html };
          });
        })
        .catch(function() { return null; });
    }

    if (candidates.length === 0) {
      return searchFallback(titleTr, titleEn).then(resolve).catch(function() { resolve(null); });
    }

    candidates.forEach(function(url) {
      tryCandidate(url).then(function(result) {
        done++;
        if (result && !resolved) {
          resolved = true;
          resolve(result);
        } else if (done === candidates.length && !resolved) {
          // Hiçbiri çalışmadı → arama fallback
          searchFallback(titleTr, titleEn)
            .then(resolve)
            .catch(function() { resolve(null); });
        }
      });
    });
  });
}

function searchFallback(titleTr, titleEn) {
  var query = titleTr || titleEn;
  return fetchWithTimeout(BASE_URL + '/ajax/arama.asp', {
    method: 'POST',
    headers: Object.assign({}, HEADERS, {
      'Content-Type':     'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest'
    }),
    body: 'q=' + encodeURIComponent(query)
  })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.status !== 'success') throw new Error('Arama basarisiz');
      var items = (data.results && data.results.filmler && data.results.filmler.results) || [];
      if (!items.length) throw new Error('Bulunamadi');

      var normTr = titleToSlug(titleTr), normEn = titleToSlug(titleEn);
      var best = items.find(function(i) {
        if (!i.url) return false;
        var slug = i.url.replace(/.*\/(dublaj|altyazi)\//, '').replace(/\/$/, '');
        return slug === normTr || slug === normEn;
      }) || items[0];

      var pageUrl = best.url.startsWith('http') ? best.url : BASE_URL + best.url;
      return fetchWithTimeout(pageUrl, { headers: HEADERS })
        .then(function(r) { return r.text().then(function(html) { return { url: pageUrl, html: html }; }); });
    });
}

function parseFilmId(html) {
  var m = html.match(/data-id="(\d+)"[^>]*id="wip"/)
       || html.match(/id="wip"[^>]*data-id="(\d+)"/)
       || html.match(/data-id="(\d+)"/);
  return m ? m[1] : null;
}

function parseDilList(html, pageUrl) {
  var diller = [];
  if (html.indexOf('/izle/dublaj/')  !== -1 || pageUrl.indexOf('/izle/dublaj/')  !== -1) diller.push({ dil: '0', ad: 'TR Dublaj' });
  if (html.indexOf('/izle/altyazi/') !== -1 || pageUrl.indexOf('/izle/altyazi/') !== -1) diller.push({ dil: '1', ad: 'TR Altyazı' });
  if (!diller.length) {
    diller.push({ dil: '0', ad: 'TR Dublaj' });
    diller.push({ dil: '1', ad: 'TR Altyazı' });
  }
  return diller;
}

function fetchAlternatifler(filmId, dil, season, episode) {
  var body = 'filmid=' + filmId + '&dil=' + dil
           + '&s=' + (season  || '') + '&b=' + (episode || '') + '&bot=0';
  return fetchWithTimeout(BASE_URL + '/ajax/dataAlternatif3.asp', {
    method: 'POST',
    headers: Object.assign({}, HEADERS, {
      'Content-Type':     'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'Origin':           BASE_URL
    }),
    body: body
  })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.status !== 'success' || !Array.isArray(data.data)) return [];
      return data.data;
    })
    .catch(function() { return []; });
}

function fetchEmbedIframe(embedId) {
  return fetchWithTimeout(BASE_URL + '/ajax/dataEmbed.asp', {
    method: 'POST',
    headers: Object.assign({}, HEADERS, {
      'Content-Type':     'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'Origin':           BASE_URL
    }),
    body: 'id=' + embedId
  })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var m = html.match(/<iframe[^>]+src="([^"]+)"/i);
      if (m) return m[1];
      var sm = html.match(/(vidmoly|okru|filemoon|dzen)\s*\(\s*'([^']+)'/i);
      if (sm) {
        var pl = sm[1].toLowerCase(), vid = sm[2];
        if (pl === 'vidmoly')  return 'https://vidmoly.net/embed-' + vid + '.html';
        if (pl === 'okru')     return 'https://odnoklassniki.ru/videoembed/' + vid;
        if (pl === 'filemoon') return 'https://filemoon.sx/e/' + vid;
        if (pl === 'dzen')     return 'https://dzen.ru/video/watch/' + vid;
      }
      var dzenM = html.match(/https:\/\/dzen\.ru\/(?:video\/watch|embed)\/([a-f0-9]+)/i);
      if (dzenM) return 'https://dzen.ru/video/watch/' + dzenM[1];
      return null;
    })
    .catch(function() { return null; });
}

function fetchVidMolyStream(iframeUrl) {
  var fullUrl = (iframeUrl.startsWith('//') ? 'https:' + iframeUrl : iframeUrl)
    .replace('vidmoly.to', 'vidmoly.net'); // OPT: daha kararlı domain
  return fetchWithTimeout(fullUrl, {
    headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' })
  })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var m = html.match(/file\s*:\s*['"]?(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i);
      if (!m) return null;
      return { url: m[1], type: 'hls', referer: fullUrl };
    })
    .catch(function() { return null; });
}

function fetchSibnetStream(sibnetUrl) {
  var videoId = (sibnetUrl.match(/videoid=(\d+)/) || sibnetUrl.match(/video(\d+)/) || [])[1];
  if (!videoId) return Promise.resolve(null);
  var shellUrl = 'https://video.sibnet.ru/shell.php?videoid=' + videoId;
  return fetchWithTimeout(shellUrl, {
    headers: Object.assign({}, HEADERS, { 'Referer': 'https://video.sibnet.ru/' })
  })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var m = html.match(/src\s*:\s*"(\/v\/[^"]+\.mp4[^"]*)"/i);
      if (!m) return null;
      return { url: 'https://video.sibnet.ru' + m[1], type: 'direct', referer: shellUrl };
    })
    .catch(function() { return null; });
}

function fetchDzenStream(dzenUrl) {
  var videoKey = dzenUrl.split('/').pop().split('?')[0];
  var embedUrl = 'https://dzen.ru/embed/' + videoKey;
  return fetchWithTimeout(embedUrl, {
    headers: Object.assign({}, HEADERS, { 'Referer': 'https://dzen.ru/', 'Origin': 'https://dzen.ru' })
  })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var re = /https:\/\/vd\d+\.okcdn\.ru\/\?[^"'\\\s]+/g;
      var m, seen = {}, matches = [];
      while ((m = re.exec(html)) !== null) {
        if (!seen[m[0]]) { seen[m[0]] = true; matches.push(m[0]); }
      }
      if (matches.length) return { url: matches[0], type: 'direct', referer: 'https://dzen.ru/' };
      var m2 = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
      if (m2) return { url: m2[0], type: 'hls', referer: 'https://dzen.ru/' };
      return null;
    })
    .catch(function() { return null; });
}

function jsUnpack(packed) {
  var pMatch = packed.match(/return p}\('([\s\S]+?)',(\d+),(\d+),'([^']*)'\./);
  if (!pMatch) pMatch = packed.match(/\(function\(p,a,c,k,e,[^)]+\)\{[^}]+return p}\('([\s\S]+?)',(\d+),(\d+),'([^']*)'\./);
  if (!pMatch) return null;
  var p = pMatch[1], a = parseInt(pMatch[2]), c = parseInt(pMatch[3]);
  var k = pMatch[4].split('|');
  function e(n) { return (n<a?'':e(Math.floor(n/a))) + ((n=n%a)>35?String.fromCharCode(n+29):n.toString(36)); }
  while (c--) { if (k[c]) p = p.replace(new RegExp('\\b'+e(c)+'\\b','g'), k[c]); }
  return p;
}

function fetchFileMoonStream(iframeUrl) {
  var fullUrl = iframeUrl.startsWith('//') ? 'https:' + iframeUrl : iframeUrl;
  var origin  = fullUrl.match(/(https?:\/\/[^\/]+)/)[1];
  return fetchWithTimeout(fullUrl, {
    headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/', 'Sec-Fetch-Dest': 'iframe' })
  })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var packM   = html.match(/(eval\(function\(p,a,c,k,e,[^)]*\)[\s\S]+?\)\))/);
      var unpacked = packM ? jsUnpack(packM[1]) : null;
      var src = unpacked || html;
      var m = src.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/i)
           || src.match(/file\s*:\s*['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/i);
      if (!m) return null;
      return { url: m[1], type: 'hls', referer: origin + '/' };
    })
    .catch(function() { return null; });
}

function processEmbed(embedData, dilAd) {
  var baslik = (embedData.baslik || '').toLowerCase();
  if (baslik === 'pixel' || baslik === 'netu') return Promise.resolve(null);

  return fetchEmbedIframe(embedData.id)
    .then(function(src) {
      if (!src) return null;

      if (src.indexOf('vidmoly') !== -1)
        return fetchVidMolyStream(src).then(function(s) {
          if (!s) return null;
          return { url: s.url, name: dilAd, title: 'VidMoly', quality: 'Auto', type: 'hls',
                   headers: { 'Referer': s.referer || 'https://vidmoly.net/' } };
        });

      if (src.indexOf('sibnet.ru') !== -1)
        return fetchSibnetStream(src).then(function(s) {
          if (!s) return null;
          return { url: s.url, name: dilAd, title: 'Sibnet', quality: '1080p', type: 'direct',
                   headers: { 'Referer': s.referer || 'https://video.sibnet.ru/' } };
        });

      if (src.indexOf('dzen.ru') !== -1)
        return fetchDzenStream(src).then(function(s) {
          if (!s) return null;
          return { url: s.url, name: dilAd, title: 'Dzen', quality: 'Auto', type: s.type,
                   headers: { 'Referer': 'https://dzen.ru/' } };
        });

      if (src.indexOf('filemoon') !== -1 || src.indexOf('moonfiles') !== -1 || src.indexOf('bysezoxexe') !== -1)
        return fetchFileMoonStream(src).then(function(s) {
          if (!s) return null;
          return { url: s.url, name: dilAd, title: 'FileMoon', quality: 'Auto', type: 'hls',
                   headers: { 'Referer': s.referer || 'https://filemoon.sx/' } };
        });

      // Genel fallback
      return fetchWithTimeout(src, { headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' }) })
        .then(function(r) { return r.text(); })
        .then(function(html) {
          var m = html.match(/file\s*:\s*['"]?(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i);
          if (!m) return null;
          return { url: m[1], name: dilAd, title: embedData.baslik || 'Stream',
                   quality: 'Auto', type: 'hls', headers: { 'Referer': src } };
        })
        .catch(function() { return null; });
    })
    .catch(function() { return null; });
}

function getStreams(tmdbId, mediaType, season, episode) {
  return fetchTmdbInfo(tmdbId, mediaType)
    .then(function(info) {
      return findFilmPage(info.titleTr, info.titleEn);
    })
    .then(function(result) {
      if (!result) throw new Error('Film sayfası bulunamadı');
      var filmId = parseFilmId(result.html);
      if (!filmId) throw new Error('Film ID bulunamadi');

      var diller = parseDilList(result.html, result.url);
      var streams = [];

      return Promise.all(diller.map(function(d) {
        return fetchAlternatifler(filmId, d.dil, season, episode)
          .then(function(embedList) {
            return Promise.all(embedList.map(function(e) { return processEmbed(e, d.ad); }));
          })
          .then(function(results) {
            results.forEach(function(s) { if (s) streams.push(s); });
          });
      })).then(function() { return streams; });
    })
    .catch(function(err) {
      console.log('[WebteIzle] Hata: ' + err.message);
      return [];
    });
}

module.exports = { getStreams: getStreams };
