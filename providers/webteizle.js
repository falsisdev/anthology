// ============================================================
//  WebteIzle — Nuvio Provider (V32 Precision & Clean)
//  Özellikler: 
//  - Üstte Film Adı, Altta Kaynak/Bayrak
//  - Kalite bilgisi sadece veride varsa görünür
// ============================================================

var BASE_URL     = 'https://webteizle3.xyz';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer': BASE_URL + '/'
};

// ── TMDB Verisi ──────────────────────────────────────────────
function fetchTmdbInfo(tmdbId, mediaType) {
  var endpoint = (mediaType === 'tv') ? 'tv' : 'movie';
  return fetch('https://api.themoviedb.org/3/' + endpoint + '/' + tmdbId
      + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      return {
        titleTr: d.title  || d.name  || '',
        titleEn: d.original_title || d.original_name || '',
        year:    (d.release_date || d.first_air_date || '').slice(0, 4)
      };
    });
}

// ── Slug Dönüştürücü ──────────────────────────────────────────
function titleToSlug(title) {
  return (title || '').toLowerCase()
    .replace(/\u011f/g,'g').replace(/\u00fc/g,'u').replace(/\u015f/g,'s')
    .replace(/\u0131/g,'i').replace(/\u0130/g,'i').replace(/\u00f6/g,'o').replace(/\u00e7/g,'c')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

// ── Sayfa Bulma ───────────────────────────────────────────────
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

  function tryNext(i) {
    if (i >= candidates.length) return searchFallback(titleTr, titleEn);
    var url = candidates[i];
    return fetch(url, { headers: HEADERS })
      .then(function(r) {
        if (!r.ok) return tryNext(i + 1);
        return r.text().then(function(html) {
          if (html.indexOf('data-id') === -1) return tryNext(i + 1);
          return { url: url, html: html };
        });
      })
      .catch(function() { return tryNext(i + 1); });
  }
  return tryNext(0);
}

// ── Arama Fallback ────────────────────────────────────────────
function searchFallback(titleTr, titleEn) {
  var query = titleTr || titleEn;
  return fetch(BASE_URL + '/ajax/arama.asp', {
    method: 'POST',
    headers: Object.assign({}, HEADERS, {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest'
    }),
    body: 'q=' + encodeURIComponent(query)
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.status !== 'success') throw new Error('Arama basarisiz');
    var items = (data.results && data.results.filmler && data.results.filmler.results) || [];
    if (!items.length) throw new Error('Film bulunamadi');

    var best = items[0];
    var pageUrl = best.url.startsWith('http') ? best.url : BASE_URL + best.url;
    return fetch(pageUrl, { headers: HEADERS })
      .then(function(r) { return r.text().then(function(html) { return { url: pageUrl, html: html }; }); });
  });
}

// ── Parsers ───────────────────────────────────────────────────
function parseFilmId(html) {
  var m = html.match(/data-id="(\d+)"[^>]*id="wip"/)
       || html.match(/id="wip"[^>]*data-id="(\d+)"/)
       || html.match(/button[^>]+id="wip"[^>]+data-id="(\d+)"/)
       || html.match(/data-id="(\d+)"/);
  return m ? m[1] : null;
}

function parseDilList(html, pageUrl) {
  var diller = [];
  if (html.indexOf('/izle/dublaj/') !== -1 || pageUrl.indexOf('/izle/dublaj/') !== -1) diller.push({ dil: '0', ad: 'TR Dublaj' });
  if (html.indexOf('/izle/altyazi/') !== -1 || pageUrl.indexOf('/izle/altyazi/') !== -1) diller.push({ dil: '1', ad: 'TR Altyazı' });
  if (diller.length === 0) { diller.push({ dil: '0', ad: 'TR Dublaj' }); diller.push({ dil: '1', ad: 'TR Altyazı' }); }
  return diller;
}

// ── Alternatifleri Getir ──────────────────────────────────────
function fetchAlternatifler(filmId, dil, seasonNum, episodeNum) {
  var body = 'filmid=' + filmId + '&dil=' + dil + '&s=' + (seasonNum || '') + '&b=' + (episodeNum || '') + '&bot=0';
  return fetch(BASE_URL + '/ajax/dataAlternatif3.asp', {
    method: 'POST',
    headers: Object.assign({}, HEADERS, { 
        'Content-Type': 'application/x-www-form-urlencoded', 
        'X-Requested-With': 'XMLHttpRequest', 
        'Origin': BASE_URL 
    }),
    body: body
  })
  .then(function(r) { return r.json(); })
  .then(function(data) { 
      return (data.status === 'success' && Array.isArray(data.data)) ? data.data : []; 
  });
}

// ── Embed Çözücü ──────────────────────────────────────────────
function fetchEmbedIframe(embedId) {
  return fetch(BASE_URL + '/ajax/dataEmbed.asp', {
    method: 'POST',
    headers: Object.assign({}, HEADERS, { 
        'Content-Type': 'application/x-www-form-urlencoded', 
        'X-Requested-With': 'XMLHttpRequest', 
        'Origin': BASE_URL 
    }),
    body: 'id=' + embedId
  }).then(function(r) { return r.text(); }).then(function(html) {
    var m = html.match(/<iframe[^>]+src="([^"]+)"/i);
    if (m) return m[1];
    var sm = html.match(/(vidmoly|okru|filemoon|dzen)\s*\(\s*'([^']+)'/i);
    if (sm) {
      var p = sm[1].toLowerCase(); var vid = sm[2];
      if (p === 'vidmoly') return 'https://vidmoly.to/embed-' + vid + '.html';
      if (p === 'okru') return 'https://odnoklassniki.ru/videoembed/' + vid;
      if (p === 'filemoon') return 'https://filemoon.sx/e/' + vid;
      if (p === 'dzen') return 'https://dzen.ru/video/watch/' + vid;
    }
    return null;
  });
}

// ── VidMoly M3U8 Çekici ───────────────────────────────────────
function fetchVidMolyStream(iframeUrl) {
  var fullUrl = iframeUrl.startsWith('//') ? 'https:' + iframeUrl : iframeUrl;
  fullUrl = fullUrl.replace('vidmoly.to', 'vidmoly.net');
  return fetch(fullUrl, { headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' }) })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var m = html.match(/file\s*:\s*['"]?(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i);
      return m ? { url: m[1], type: 'hls', referer: fullUrl } : null;
    });
}

// ── Embed İşleyici (UI Verisi Buradan Çıkar) ───────────────────
function processEmbed(embedData, dilAd, movieTitle) {
  var baslik = (embedData.baslik || '').toLowerCase();
  if (baslik === 'pixel' || baslik === 'netu') return Promise.resolve(null);

  return fetchEmbedIframe(embedData.id).then(function(src) {
    if (!src) return null;
    
    // Görsel Ayarlar
    var flag = dilAd.includes('Dublaj') ? '🇹🇷 ' : '🌐 ';
    var pName = (embedData.baslik || 'Kaynak');
    if (src.indexOf('vidmoly') !== -1) pName = "VidMoly";
    else if (src.indexOf('sibnet') !== -1) pName = "Sibnet";
    else if (src.indexOf('filemoon') !== -1) pName = "FileMoon";

    // Kalite Bilgisi: Uydurma değil, sadece varsa yaz
    var q = embedData.kalite || ''; 

    var streamPromise;
    if (src.indexOf('vidmoly') !== -1) {
      streamPromise = fetchVidMolyStream(src).then(function(s) {
        return s ? { 
          url: s.url, 
          name: movieTitle, 
          title: '⌜ WEBTEIZLE ⌟ | ' + pName + ' | ' + flag + dilAd, 
          quality: q, 
          type: 'hls', 
          headers: { 'Referer': s.referer } 
        } : null;
      });
    } else {
      streamPromise = fetch(src, { headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' }) })
        .then(function(r) { return r.text(); })
        .then(function(html) {
          var m = html.match(/file\s*:\s*['"]?(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i);
          return m ? { 
            url: m[1], 
            name: movieTitle, 
            title: '⌜ WEBTEIZLE ⌟ | ' + pName + ' | ' + flag + dilAd, 
            quality: q, 
            type: 'hls', 
            headers: { 'Referer': src } 
          } : null;
        });
    }
    return streamPromise;
  });
}

// ── Ana Fonksiyon ─────────────────────────────────────────────
function getStreams(tmdbId, mediaType, season, episode) {
  return fetchTmdbInfo(tmdbId, mediaType)
    .then(function(info) {
      var movieName = info.titleTr || info.titleEn;
      return findFilmPage(info.titleTr, info.titleEn).then(function(result) {
        var filmId = parseFilmId(result.html);
        if (!filmId) throw new Error('Film ID bulunamadi');
        
        var diller = parseDilList(result.html, result.url);
        var streams = [];
        return Promise.all(diller.map(function(d) {
          return fetchAlternatifler(filmId, d.dil, season, episode).then(function(embedList) {
            return Promise.all(embedList.map(function(e) { return processEmbed(e, d.ad, movieName); }));
          }).then(function(results) {
            results.forEach(function(s) { if (s) streams.push(s); });
          });
        })).then(function() { return streams; });
      });
    }).catch(function() { return []; });
}

module.exports = { getStreams: getStreams };
