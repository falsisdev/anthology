// ============================================================
//  WebteIzle — Nuvio Provider
//  Film: /izle/dublaj/{slug}  /izle/altyazi/{slug}
//  Kaynak: dataAlternatif3.asp -> dataEmbed.asp -> VidMoly vb.
// ============================================================

var BASE_URL     = 'https://webteizle3.xyz';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer': BASE_URL + '/'
};

// ── TMDB ──────────────────────────────────────────────────────
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

// ── Slug ──────────────────────────────────────────────────────
function titleToSlug(title) {
  return (title || '').toLowerCase()
    .replace(/\u011f/g,'g').replace(/\u00fc/g,'u').replace(/\u015f/g,'s')
    .replace(/\u0131/g,'i').replace(/\u0130/g,'i').replace(/\u00f6/g,'o').replace(/\u00e7/g,'c')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

// ── Film sayfası bul ──────────────────────────────────────────
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

  console.log('[WebteIzle] Adaylar: ' + candidates.join(' | '));

  function tryNext(i) {
    if (i >= candidates.length) return searchFallback(titleTr, titleEn);
    var url = candidates[i];
    return fetch(url, { headers: HEADERS })
      .then(function(r) {
        if (!r.ok) { console.log('[WebteIzle] ' + r.status + ': ' + url); return tryNext(i + 1); }
        return r.text().then(function(html) {
          if (html.indexOf('data-id') === -1) {
            console.log('[WebteIzle] Gecersiz: ' + url);
            return tryNext(i + 1);
          }
          console.log('[WebteIzle] Bulundu: ' + url);
          return { url: url, html: html };
        });
      })
      .catch(function() { return tryNext(i + 1); });
  }
  return tryNext(0);
}

// ── Arama fallback ────────────────────────────────────────────
function searchFallback(titleTr, titleEn) {
  var query = titleTr || titleEn;
  console.log('[WebteIzle] Arama: ' + query);
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

    var normTr = titleToSlug(titleTr);
    var normEn = titleToSlug(titleEn);
    var best = null;
    for (var i = 0; i < items.length; i++) {
      if (!items[i].url) continue;
      var slug = items[i].url.replace(/.*\/(dublaj|altyazi)\//, '').replace(/\/$/, '');
      if (slug === normTr || slug === normEn) { best = items[i]; break; }
    }
    if (!best) best = items[0];

    var pageUrl = best.url.startsWith('http') ? best.url : BASE_URL + best.url;
    console.log('[WebteIzle] Arama sonucu: ' + pageUrl);
    return fetch(pageUrl, { headers: HEADERS })
      .then(function(r) { return r.text().then(function(html) { return { url: pageUrl, html: html }; }); });
  });
}

// ── Film ID parse ─────────────────────────────────────────────
function parseFilmId(html) {
  var m = html.match(/data-id="(\d+)"[^>]*id="wip"/)
       || html.match(/id="wip"[^>]*data-id="(\d+)"/)
       || html.match(/button[^>]+id="wip"[^>]+data-id="(\d+)"/)
       || html.match(/data-id="(\d+)"/);
  return m ? m[1] : null;
}

// ── Dil listesi parse ─────────────────────────────────────────
function parseDilList(html, pageUrl) {
  var diller = [];
  if (html.indexOf('/izle/dublaj/') !== -1 || pageUrl.indexOf('/izle/dublaj/') !== -1) {
    diller.push({ dil: '0', ad: 'TR Dublaj' });
  }
  if (html.indexOf('/izle/altyazi/') !== -1 || pageUrl.indexOf('/izle/altyazi/') !== -1) {
    diller.push({ dil: '1', ad: 'TR Altyazı' });
  }
  if (diller.length === 0) {
    diller.push({ dil: '0', ad: 'TR Dublaj' });
    diller.push({ dil: '1', ad: 'TR Altyazı' });
  }
  return diller;
}

// ── dataAlternatif3.asp ───────────────────────────────────────
function fetchAlternatifler(filmId, dil, seasonNum, episodeNum) {
  var body = 'filmid=' + filmId
    + '&dil=' + dil
    + '&s=' + (seasonNum || '')
    + '&b=' + (episodeNum || '')
    + '&bot=0';

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
    if (data.status !== 'success' || !Array.isArray(data.data)) return [];
    console.log('[WebteIzle] Alternatif (dil=' + dil + '): ' + data.data.length + ' kaynak');
    return data.data;
  })
  .catch(function(e) {
    console.log('[WebteIzle] Alternatif hata: ' + e.message);
    return [];
  });
}

// ── dataEmbed.asp ─────────────────────────────────────────────
function fetchEmbedIframe(embedId) {
  return fetch(BASE_URL + '/ajax/dataEmbed.asp', {
    method: 'POST',
    headers: Object.assign({}, HEADERS, {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': BASE_URL
    }),
    body: 'id=' + embedId
  })
  .then(function(r) { return r.text(); })
  .then(function(html) {
    // iframe src direkt ara
    var m = html.match(/<iframe[^>]+src="([^"]+)"/i);
    if (m) return m[1];

    // JS fonksiyon cagrilari: vidmoly('id','...'), dzen('id','...') vs
    var sm = html.match(/(vidmoly|okru|filemoon|dzen)\s*\(\s*'([^']+)'/i);
    if (sm) {
      var platform = sm[1].toLowerCase();
      var vid = sm[2];
      if (platform === 'vidmoly')  return 'https://vidmoly.to/embed-' + vid + '.html';
      if (platform === 'okru')     return 'https://odnoklassniki.ru/videoembed/' + vid;
      if (platform === 'filemoon') return 'https://filemoon.sx/e/' + vid;
      if (platform === 'dzen')     return 'https://dzen.ru/video/watch/' + vid;
    }

    // Dzen URL direkt href/src icinde
    var dzenM = html.match(/https:\/\/dzen\.ru\/(?:video\/watch|embed)\/([a-f0-9]+)/i);
    if (dzenM) return 'https://dzen.ru/video/watch/' + dzenM[1];

    console.log('[WebteIzle] dataEmbed response: ' + html.slice(0, 300));
    return null;
  })
  .catch(function() { return null; });
}

// ── VidMoly extractor ─────────────────────────────────────────
function fetchVidMolyStream(iframeUrl) {
  var fullUrl = iframeUrl.startsWith('//') ? 'https:' + iframeUrl : iframeUrl;
  fullUrl = fullUrl.replace('vidmoly.to', 'vidmoly.net');
  return fetch(fullUrl, { headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' }) })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var m = html.match(/file\s*:\s*['"]?(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i);
      if (!m) { console.log('[WebteIzle] VidMoly m3u8 bulunamadi'); return null; }
      console.log('[WebteIzle] VidMoly m3u8: ' + m[1]);
      return { url: m[1], type: 'hls', referer: fullUrl };
    })
    .catch(function(e) { console.log('[WebteIzle] VidMoly hata: ' + e.message); return null; });
}

// ── Sibnet extractor ──────────────────────────────────────────
function fetchSibnetStream(sibnetUrl) {
  var videoId = (sibnetUrl.match(/videoid=(\d+)/) || sibnetUrl.match(/video(\d+)/) || [])[1];
  if (!videoId) return Promise.resolve(null);
  var shellUrl = 'https://video.sibnet.ru/shell.php?videoid=' + videoId;
  return fetch(shellUrl, { headers: Object.assign({}, HEADERS, { 'Referer': 'https://video.sibnet.ru/' }) })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var m = html.match(/src\s*:\s*"(\/v\/[^"]+\.mp4[^"]*)"/i);
      if (!m) return null;
      var vUrl = 'https://video.sibnet.ru' + m[1];
      console.log('[WebteIzle] Sibnet: ' + vUrl);
      return { url: vUrl, type: 'direct', referer: shellUrl };
    })
    .catch(function() { return null; });
}

// ── Dzen.ru extractor ─────────────────────────────────────────
// Kaynak: https://dzen.ru/video/watch/{videoKey}
// Akis:   /embed/{videoKey} -> HTML icinde vdN.okcdn.ru DASH URL
function fetchDzenStream(dzenUrl) {
  // watch URL'yi embed URL'ye cevir
  var videoKey = dzenUrl.split('/').pop().split('?')[0];
  var embedUrl = 'https://dzen.ru/embed/' + videoKey;
  console.log('[WebteIzle] Dzen embed: ' + embedUrl);

  return fetch(embedUrl, {
    headers: Object.assign({}, HEADERS, {
      'Referer': 'https://dzen.ru/',
      'Origin':  'https://dzen.ru'
    })
  })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      // vdN.okcdn.ru DASH manifest URL'lerini bul
      var re = /https:\/\/vd\d+\.okcdn\.ru\/\?[^"'\\\s]+/g;
      var matches = [];
      var seen = {};
      var m;
      while ((m = re.exec(html)) !== null) {
        var u = m[0];
        if (!seen[u]) { seen[u] = true; matches.push(u); }
      }
      if (matches.length === 0) {
        // Fallback: genel m3u8 ara
        var m2 = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
        if (m2) {
          console.log('[WebteIzle] Dzen m3u8 fallback: ' + m2[0]);
          return { url: m2[0], type: 'hls', referer: 'https://dzen.ru/' };
        }
        console.log('[WebteIzle] Dzen stream bulunamadi');
        return null;
      }
      // Ilk DASH URL'yi kullan
      console.log('[WebteIzle] Dzen DASH: ' + matches[0]);
      return { url: matches[0], type: 'direct', referer: 'https://dzen.ru/' };
    })
    .catch(function(e) { console.log('[WebteIzle] Dzen hata: ' + e.message); return null; });
}


// ── FileMoon extractor ────────────────────────────────────────
// Akis: filemoon.sx/e/{id} -> iframe -> p,a,c,k,e,d unpack -> sources:[{file:"..."}]
function jsUnpack(packed) {
  // p,a,c,k,e,d manuel unpack - Hermes uyumlu (new Function yok)
  var mArr = packed.match(/\.replace\(.*?\)\)\)$/) ? null :
    packed.match(/,([0-9]+),([0-9]+),'([^']+)'\.(split|\w+)\('\|'\)/);
  // Genel pattern: function(p,a,c,k,e,{d}) icindeki p stringi al
  var pMatch = packed.match(/return p}\('([\s\S]+?)',([0-9]+),([0-9]+),'([^']*)'\./);
  if (!pMatch) pMatch = packed.match(/\(function\(p,a,c,k,e,[^)]+\)\{[^}]+return p}\('([\s\S]+?)',([0-9]+),([0-9]+),'([^']*)'\./);
  if (!pMatch) return null;
  var p = pMatch[1], a = parseInt(pMatch[2]), c = parseInt(pMatch[3]);
  var k = pMatch[4].split('|');
  function e(n) {
    return (n < a ? '' : e(Math.floor(n / a))) +
      ((n = n % a) > 35 ? String.fromCharCode(n + 29) : n.toString(36));
  }
  while (c--) {
    if (k[c]) p = p.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), k[c]);
  }
  return p;
}

function fetchFileMoonStream(iframeUrl) {
  var fullUrl = iframeUrl.startsWith('//') ? 'https:' + iframeUrl : iframeUrl;
  var origin  = fullUrl.match(/(https?:\/\/[^\/]+)/)[1];
  var fmHeaders = Object.assign({}, HEADERS, {
    'Referer':          BASE_URL + '/',
    'Sec-Fetch-Dest':   'iframe',
    'Sec-Fetch-Mode':   'navigate',
    'Sec-Fetch-Site':   'cross-site'
  });

  return fetch(fullUrl, { headers: fmHeaders })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      // Once iframe ara
      var iframeM = html.match(/<iframe[^>]+src=['"](https?:\/\/[^'"]+)['"]/i);
      if (iframeM) {
        return fetch(iframeM[1], { headers: Object.assign({}, fmHeaders, { 'Referer': fullUrl }) })
          .then(function(r2) { return r2.text(); });
      }
      return html;
    })
    .then(function(html) {
      // p,a,c,k,e,d script bul
      var packM = html.match(/(eval\(function\(p,a,c,k,e,[^)]*\)[\s\S]+?\)\))/);
      var unpacked = packM ? jsUnpack(packM[1]) : null;
      var src = unpacked || html;

      // sources:[{file:"URL"}]
      var m = src.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/i);
      if (!m) m = src.match(/file\s*:\s*['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/i);
      if (!m) { console.log('[WebteIzle] FileMoon m3u8 bulunamadi'); return null; }

      console.log('[WebteIzle] FileMoon m3u8: ' + m[1]);
      return { url: m[1], type: 'hls', referer: origin + '/' };
    })
    .catch(function(e) { console.log('[WebteIzle] FileMoon hata: ' + e.message); return null; });
}

// ── Embed işle ────────────────────────────────────────────────
function processEmbed(embedData, dilAd) {
  var baslik = (embedData.baslik || '').toLowerCase();
  if (baslik === 'pixel' || baslik === 'netu') return Promise.resolve(null);

  return fetchEmbedIframe(embedData.id)
    .then(function(src) {
      if (!src) return null;
      console.log('[WebteIzle] iframe (' + embedData.baslik + '): ' + src);

      if (src.indexOf('vidmoly') !== -1) {
        return fetchVidMolyStream(src).then(function(s) {
          if (!s) return null;
          return { url: s.url, name: dilAd, title: 'VidMoly', quality: 'Auto', type: 'hls',
                   headers: { 'Referer': s.referer || 'https://vidmoly.net/' } };
        });
      }

      if (src.indexOf('sibnet.ru') !== -1) {
        return fetchSibnetStream(src).then(function(s) {
          if (!s) return null;
          return { url: s.url, name: dilAd, title: 'Sibnet', quality: '1080p', type: 'direct',
                   headers: { 'Referer': s.referer || 'https://video.sibnet.ru/' } };
        });
      }

      if (src.indexOf('dzen.ru') !== -1) {
        return fetchDzenStream(src).then(function(s) {
          if (!s) return null;
          return { url: s.url, name: dilAd, title: 'Dzen', quality: 'Auto', type: s.type,
                   headers: { 'Referer': 'https://dzen.ru/' } };
        });
      }

      if (src.indexOf('filemoon') !== -1 || src.indexOf('moonfiles') !== -1 || src.indexOf('bysezoxexe') !== -1) {
        return fetchFileMoonStream(src).then(function(s) {
          if (!s) return null;
          return { url: s.url, name: dilAd, title: 'FileMoon', quality: 'Auto', type: 'hls',
                   headers: { 'Referer': s.referer || 'https://filemoon.sx/' } };
        });
      }

      // Genel iframe m3u8 çekimi
      return fetch(src, { headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' }) })
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

// ── getStreams ────────────────────────────────────────────────
function getStreams(tmdbId, mediaType, season, episode) {
  console.log('[WebteIzle] getStreams -> tmdbId=' + tmdbId + ' type=' + mediaType
    + (season ? ' S' + season + 'E' + episode : ''));

  return fetchTmdbInfo(tmdbId, mediaType)
    .then(function(info) {
      console.log('[WebteIzle] TMDB: "' + info.titleEn + '" / "' + info.titleTr + '"');
      return findFilmPage(info.titleTr, info.titleEn);
    })
    .then(function(result) {
      var filmId = parseFilmId(result.html);
      console.log('[WebteIzle] Film ID: ' + filmId + ' | URL: ' + result.url);
      if (!filmId) throw new Error('Film ID bulunamadi');

      var diller = parseDilList(result.html, result.url);
      console.log('[WebteIzle] Diller: ' + diller.map(function(d) { return d.ad; }).join(', '));

      var streams = [];
      return Promise.all(diller.map(function(d) {
        return fetchAlternatifler(filmId, d.dil, season, episode)
          .then(function(embedList) {
            return Promise.all(embedList.map(function(e) { return processEmbed(e, d.ad); }));
          })
          .then(function(results) {
            results.forEach(function(s) { if (s) streams.push(s); });
          });
      }))
      .then(function() { return streams; });
    })
    .then(function(streams) {
      console.log('[WebteIzle] Toplam stream: ' + streams.length);
      return streams;
    })
    .catch(function(err) {
      console.log('[WebteIzle] Hata: ' + err.message);
      return [];
    });
}

module.exports = { getStreams: getStreams };
                                        
