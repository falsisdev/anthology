// SezonlukDizi — Nuvio Provider (Optimized)
// Orijinale göre değişiklikler:
//  1. fetchWithTimeout: 8s — takılan istek beklemiyor
//  2. fetchSessionCookie + fetchAspData + fetchTmdbInfo PARALEL (orijinalde Promise.all vardı — korundu, timeout eklendi)
//  3. validateShowPage: EN ve TR slug paralel denenir (orijinalde sıralıydı)
//  4. Dublaj + Altyazı alternatifleri paralel fetch (orijinalde de Promise.all vardı — korundu)
//  5. fetchVidMolyStream regex genişletildi — daha güvenilir m3u8 tespiti

var BASE_URL         = 'https://sezonlukdizi8.com';
var TMDB_API_KEY     = '500330721680edb6d5f7f12ba7cd9023';
var FETCH_TIMEOUT_MS = 8000;

var HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
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

function fetchTmdbInfo(tmdbId) {
  return fetchWithTimeout('https://api.themoviedb.org/3/tv/' + tmdbId
    + '?api_key=' + TMDB_API_KEY + '&language=tr-TR', {})
    .then(function(r) { return r.json(); })
    .then(function(d) {
      return {
        titleTr: d.name || '',
        titleEn: d.original_name || '',
        year:    d.first_air_date ? d.first_air_date.slice(0,4) : ''
      };
    });
}

function fetchSessionCookie() {
  return fetchWithTimeout(BASE_URL + '/', { headers: HEADERS })
    .then(function(r) {
      var sc = r.headers.get('set-cookie');
      if (!sc) return '';
      return sc.split(',').map(function(c) { return c.trim().split(';')[0]; }).join('; ');
    })
    .catch(function() { return ''; });
}

function fetchAspData() {
  return fetchWithTimeout(BASE_URL + '/js/site.min.js', { headers: HEADERS })
    .then(function(r) { return r.text(); })
    .then(function(js) {
      var alt   = (js.match(/dataAlternatif(.*?)\.asp/) || ['',''])[1];
      var embed = (js.match(/dataEmbed(.*?)\.asp/)      || ['',''])[1];
      return { alternatif: alt, embed: embed };
    })
    .catch(function() { return { alternatif: '', embed: '' }; });
}

function stripPrefix(t) {
  return (t || '').replace(/^marvel's\s+/i,'').replace(/^marvel\s+/i,'').replace(/^dc's\s+/i,'').trim();
}

function titleToSlug(t) {
  return stripPrefix(t).toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function validateShowPage(slug) {
  if (!slug) return Promise.resolve(null);
  var url = BASE_URL + '/diziler/' + slug + '.html';
  return fetchWithTimeout(url, { headers: HEADERS })
    .then(function(r) {
      if (r.status === 404) return null;
      return r.text().then(function(html) {
        if (html.indexOf('Sayfa Bulunamad') !== -1 || html.indexOf('Haydaaa') !== -1) return null;
        var m = html.match(/href="\/([^\/]+)\/\d+-sezon-\d+-bolum\.html"/i);
        return m ? m[1] : slug;
      });
    })
    .catch(function() { return null; });
}

function fetchBid(episodeUrl, sessionCookie) {
  var hdrs = Object.assign({}, HEADERS);
  if (sessionCookie) hdrs['Cookie'] = sessionCookie;
  return fetchWithTimeout(episodeUrl, { headers: hdrs })
    .then(function(r) {
      var newCookie = sessionCookie || '';
      var sc = r.headers.get('set-cookie');
      if (sc) {
        var extra = sc.split(',').map(function(c) { return c.trim().split(';')[0]; }).join('; ');
        newCookie = newCookie ? newCookie + '; ' + extra : extra;
      }
      return r.text().then(function(html) {
        var m = html.match(/data-id="([^"]+)"[^>]+id="dilsec"/)
             || html.match(/id="dilsec"[^>]+data-id="([^"]+)"/)
             || html.match(/data-id="([^"]+)"/);
        return { bid: m ? m[1] : null, cookies: newCookie };
      });
    });
}

function fetchAlternatifler(bid, dil, aspData, cookies, refererUrl) {
  var hdrs = Object.assign({}, HEADERS, {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type':     'application/x-www-form-urlencoded',
    'Origin':           BASE_URL,
    'Referer':          refererUrl || (BASE_URL + '/')
  });
  if (cookies) hdrs['Cookie'] = cookies;
  return fetchWithTimeout(BASE_URL + '/ajax/dataAlternatif' + aspData.alternatif + '.asp', {
    method: 'POST', headers: hdrs,
    body: 'bid=' + encodeURIComponent(bid) + '&dil=' + dil
  })
    .then(function(r) { return r.text(); })
    .then(function(text) {
      try {
        var json = JSON.parse(text);
        if (json.status === 'success' && Array.isArray(json.data)) return json.data;
        if (Array.isArray(json)) return json;
      } catch(e) {}
      return [];
    })
    .catch(function() { return []; });
}

function fetchEmbedIframe(embedId, aspData) {
  return fetchWithTimeout(BASE_URL + '/ajax/dataEmbed' + aspData.embed + '.asp', {
    method: 'POST',
    headers: Object.assign({}, HEADERS, {
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type':     'application/x-www-form-urlencoded'
    }),
    body: 'id=' + encodeURIComponent(embedId)
  })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var m = html.match(/<iframe[^>]+src="([^"]+)"/i);
      return m ? m[1] : null;
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
      var m = html.match(/player\.src\s*\(\s*\[\s*\{\s*src\s*:\s*"(\/v\/[^"]+\.mp4[^"]*)"/i)
           || html.match(/src\s*:\s*"(\/v\/[^"]+\.mp4[^"]*)"/i);
      if (!m) return null;
      return { url: 'https://video.sibnet.ru' + m[1], type: 'mp4', referer: shellUrl };
    })
    .catch(function() { return null; });
}

function fetchVidMolyStream(iframeUrl) {
  var fullUrl = iframeUrl.startsWith('//') ? 'https:' + iframeUrl : iframeUrl;
  // OPT: vidmoly.to → vidmoly.net (daha kararlı)
  fullUrl = fullUrl.replace('vidmoly.to', 'vidmoly.net');
  return fetchWithTimeout(fullUrl, {
    headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' })
  })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      // OPT: Genişletilmiş regex — file: veya sources içindeki m3u8
      var m = html.match(/file\s*:\s*['"]?(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i)
           || html.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i);
      if (!m) return null;
      return { url: m[1], type: 'hls', referer: fullUrl };
    })
    .catch(function() { return null; });
}

function processVeri(veri, dilAd, aspData) {
  var baslik = (veri.baslik || '').toLowerCase();
  if (baslik === 'pixel' || baslik === 'netu') return Promise.resolve(null);

  return fetchEmbedIframe(veri.id, aspData)
    .then(function(src) {
      if (!src) return null;

      if (src.indexOf('sibnet.ru') !== -1) {
        return fetchSibnetStream(src).then(function(s) {
          if (!s) return null;
          return { url: s.url, name: dilAd, title: 'Sibnet', quality: '1080p', type: 'hls',
                   headers: { 'Referer': s.referer || 'https://video.sibnet.ru/' } };
        });
      }

      if (src.indexOf('vidmoly') !== -1) {
        return fetchVidMolyStream(src).then(function(s) {
          if (!s) return null;
          return { url: s.url, name: dilAd, title: 'VidMoly', quality: 'Auto', type: 'hls',
                   headers: { 'Referer': 'https://vidmoly.net/' } };
        });
      }

      return null;
    })
    .catch(function() { return null; });
}

function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType !== 'tv') return Promise.resolve([]);

  return Promise.all([fetchTmdbInfo(tmdbId), fetchSessionCookie(), fetchAspData()])
    .then(function(init) {
      var info    = init[0];
      var cookie  = init[1];
      var aspData = init[2];

      var slugEn = titleToSlug(info.titleEn);
      var slugTr = titleToSlug(info.titleTr);

      // OPT: EN ve TR slug doğrulaması paralel
      return Promise.all([
        validateShowPage(slugEn),
        slugTr !== slugEn ? validateShowPage(slugTr) : Promise.resolve(null)
      ]).then(function(slugs) {
        var slug = slugs[0] || slugs[1];
        if (!slug) throw new Error('Dizi bulunamadi');

        var epUrl = BASE_URL + '/' + slug + '/' + season + '-sezon-' + episode + '-bolum.html';
        return fetchBid(epUrl, cookie).then(function(bidData) {
          return { bidData: bidData, aspData: aspData, epUrl: epUrl };
        });
      });
    })
    .then(function(ctx) {
      if (!ctx.bidData || !ctx.bidData.bid) return [];
      var bid     = ctx.bidData.bid;
      var cookies = ctx.bidData.cookies;
      var aspData = ctx.aspData;
      var epUrl   = ctx.epUrl;

      return Promise.all([
        fetchAlternatifler(bid, '0', aspData, cookies, epUrl).then(function(list) {
          return Promise.all(list.map(function(v) { return processVeri(v, 'TR Dublaj', aspData); }));
        }),
        fetchAlternatifler(bid, '1', aspData, cookies, epUrl).then(function(list) {
          return Promise.all(list.map(function(v) { return processVeri(v, 'TR Altyazi', aspData); }));
        })
      ]).then(function(all) {
        return all[0].concat(all[1]).filter(Boolean);
      });
    })
    .catch(function(err) {
      console.error('[SezonlukDizi] Hata: ' + err.message);
      return [];
    });
}

module.exports = { getStreams: getStreams };
