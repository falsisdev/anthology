// ============================================================
//  SezonlukDizi — Nuvio Provider
// ============================================================

var BASE_URL     = 'https://sezonlukdizi8.com';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer': BASE_URL + '/'
};

function fetchTmdbInfo(tmdbId) {
  return fetch('https://api.themoviedb.org/3/tv/' + tmdbId
      + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
    .then(function(r) {
      if (!r.ok) throw new Error('TMDB hata: ' + r.status);
      return r.json();
    })
    .then(function(data) {
      return {
        titleTr: data.name || '',
        titleEn: data.original_name || '',
        year:    data.first_air_date ? data.first_air_date.slice(0,4) : ''
      };
    });
}

function fetchSessionCookie() {
  return fetch(BASE_URL + '/', { headers: HEADERS })
    .then(function(r) {
      var cookies = '';
      var sc = r.headers.get('set-cookie');
      if (sc) {
        cookies = sc.split(',').map(function(c) {
          return c.trim().split(';')[0];
        }).join('; ');
      }
      console.log('[SezonlukDizi] Session cookie: ' + (cookies || '(yok)'));
      return cookies;
    })
    .catch(function() { return ''; });
}

function fetchAspData() {
  return fetch(BASE_URL + '/js/site.min.js', { headers: HEADERS })
    .then(function(r) { return r.text(); })
    .then(function(js) {
      var altMatch   = js.match(/dataAlternatif(.*?)\.asp/);
      var embedMatch = js.match(/dataEmbed(.*?)\.asp/);
      var alt   = altMatch   ? altMatch[1]   : '';
      var embed = embedMatch ? embedMatch[1] : '';
      console.log('[SezonlukDizi] ASP: alternatif=' + alt + ' embed=' + embed);
      return { alternatif: alt, embed: embed };
    });
}

function stripPrefix(title) {
  return (title || '')
    .replace(/^marvel's\s+/i, '')
    .replace(/^marvel\s+/i, '')
    .replace(/^dc's\s+/i, '')
    .trim();
}

function titleToSlug(title) {
  title = stripPrefix(title);
  return (title || '').toLowerCase()
    .replace(/\u011f/g,'g').replace(/\u00fc/g,'u').replace(/\u015f/g,'s')
    .replace(/\u0131/g,'i').replace(/\u0130/g,'i').replace(/\u00f6/g,'o').replace(/\u00e7/g,'c')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');
}

function validateShowPage(slug) {
  var url = BASE_URL + '/diziler/' + slug + '.html';
  return fetch(url, { headers: HEADERS })
    .then(function(r) {
      console.log('[SezonlukDizi] Slug dene: ' + url + ' -> ' + r.status);
      if (r.status === 404) return null;
      return r.text().then(function(html) {
        if (html.indexOf('Sayfa Bulunamad') !== -1 || html.indexOf('Haydaaa') !== -1) {
          console.log('[SezonlukDizi] 404 icerigi: ' + slug);
          return null;
        }
        var m = html.match(/href="\/([^\/]+)\/\d+-sezon-\d+-bolum\.html"/i);
        if (m) {
          console.log('[SezonlukDizi] Gercek slug: ' + m[1]);
          return m[1];
        }
        console.log('[SezonlukDizi] Dizi sayfasi dogrulandi: ' + slug);
        return slug;
      });
    })
    .catch(function(e) {
      console.log('[SezonlukDizi] validateShowPage hata: ' + e.message);
      return null;
    });
}

function fetchBid(episodeUrl, sessionCookie) {
  var hdrs = Object.assign({}, HEADERS);
  if (sessionCookie) hdrs['Cookie'] = sessionCookie;

  return fetch(episodeUrl, { headers: hdrs })
    .then(function(r) {
      var newCookie = sessionCookie || '';
      var sc = r.headers.get('set-cookie');
      if (sc) {
        var extra = sc.split(',').map(function(c) { return c.trim().split(';')[0]; }).join('; ');
        newCookie = newCookie ? newCookie + '; ' + extra : extra;
      }
      return r.text().then(function(html) { return { html: html, cookies: newCookie }; });
    })
    .then(function(res) {
      var html = res.html;
      var m = html.match(/data-id="([^"]+)"[^>]+id="dilsec"/);
      if (!m) m = html.match(/id="dilsec"[^>]+data-id="([^"]+)"/);
      if (!m) m = html.match(/data-id="([^"]+)"/);
      var bid = m ? m[1] : null;
      if (bid) console.log('[SezonlukDizi] bid: ' + bid);
      else console.log('[SezonlukDizi] bid bulunamadi');
      return { bid: bid, cookies: res.cookies };
    });
}

function fetchAlternatifler(bid, dil, aspData, cookies, refererUrl) {
  var url  = BASE_URL + '/ajax/dataAlternatif' + aspData.alternatif + '.asp';
  var body = 'bid=' + encodeURIComponent(bid) + '&dil=' + dil;
  var hdrs = Object.assign({}, HEADERS, {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type':     'application/x-www-form-urlencoded',
    'Origin':           BASE_URL,
    'Referer':          refererUrl || (BASE_URL + '/')
  });
  if (cookies) hdrs['Cookie'] = cookies;

  return fetch(url, { method: 'POST', headers: hdrs, body: body })
    .then(function(r) {
      console.log('[SezonlukDizi] Alternatif status (dil=' + dil + '): ' + r.status);
      return r.text();
    })
    .then(function(text) {
      console.log('[SezonlukDizi] Alternatif yanit (dil=' + dil + '): ' + (text || '(bos)').slice(0, 300));
      try {
        var json = JSON.parse(text);
        if (json.status === 'success' && Array.isArray(json.data)) return json.data;
        if (Array.isArray(json)) return json;
      } catch(e) {}
      return [];
    });
}

function fetchEmbedIframe(embedId, aspData) {
  var url  = BASE_URL + '/ajax/dataEmbed' + aspData.embed + '.asp';
  var body = 'id=' + encodeURIComponent(embedId);
  return fetch(url, {
    method: 'POST',
    headers: Object.assign({}, HEADERS, {
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type':     'application/x-www-form-urlencoded'
    }),
    body: body
  })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var m = html.match(/<iframe[^>]+src="([^"]+)"/i);
      return m ? m[1] : null;
    });
}

function fetchSibnetStream(sibnetUrl) {
  var videoId = (sibnetUrl.match(/videoid=(\d+)/) || sibnetUrl.match(/video(\d+)/) || [])[1];
  if (!videoId) {
    console.log('[SezonlukDizi] Sibnet videoId bulunamadi: ' + sibnetUrl);
    return Promise.resolve(null);
  }
  var shellUrl = 'https://video.sibnet.ru/shell.php?videoid=' + videoId;
  console.log('[SezonlukDizi] Sibnet shell: ' + shellUrl);

  return fetch(shellUrl, {
    headers: Object.assign({}, HEADERS, { 'Referer': 'https://video.sibnet.ru/' })
  })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var m = html.match(/player\.src\s*\(\s*\[\s*\{\s*src\s*:\s*"(\/v\/[^"]+\.mp4[^"]*)"/i);
      if (!m) m = html.match(/src\s*:\s*"(\/v\/[^"]+\.mp4[^"]*)"/i);
      if (!m) {
        console.log('[SezonlukDizi] Sibnet /v/ URL bulunamadi');
        return null;
      }
      var vUrl = 'https://video.sibnet.ru' + m[1];
      console.log('[SezonlukDizi] Sibnet stream: ' + vUrl);
      return { url: vUrl, type: 'mp4', quality: '1080p', referer: shellUrl };
    })
    .catch(function(e) {
      console.log('[SezonlukDizi] Sibnet hata: ' + e.message);
      return null;
    });
}

function fetchVidMolyStream(iframeUrl) {
  var fullUrl = iframeUrl.startsWith('//') ? 'https:' + iframeUrl : iframeUrl;
  return fetch(fullUrl, {
    headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' })
  })
  .then(function(r) { return r.text(); })
  .then(function(html) {
    var m = html.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i);
    if (!m) { console.log('[SezonlukDizi] VidMoly m3u8 bulunamadi'); return null; }
    console.log('[SezonlukDizi] VidMoly m3u8: ' + m[1]);
    return { url: m[1], type: 'hls', referer: fullUrl };
  })
  .catch(function(e) { console.log('[SezonlukDizi] VidMoly hata: ' + e.message); return null; });
}

function processVeri(veri, dilAd, aspData) {
  var baslik = (veri.baslik || '').toLowerCase();

  // Pixel ve Netu atliyoruz
  if (baslik === 'pixel' || baslik === 'netu') return Promise.resolve(null);

  return fetchEmbedIframe(veri.id, aspData)
    .then(function(src) {
      if (!src) return null;
      console.log('[SezonlukDizi] iframe (' + veri.baslik + '): ' + src);

      if (src.indexOf('sibnet.ru') !== -1) {
        return fetchSibnetStream(src).then(function(stream) {
          if (!stream) return null;
          return {
            url:     stream.url,
            name:    dilAd,
            title:   'Sibnet',
            quality: '1080p',
            type:    'hls',
            headers: { 'Referer': stream.referer || 'https://video.sibnet.ru/' }
          };
        });
      }

      if (src.indexOf('vidmoly') !== -1) {
        return fetchVidMolyStream(src).then(function(stream) {
          if (!stream) return null;
          return {
            url:     stream.url,
            name:    dilAd,
            title:   'VidMoly',
            quality: 'Auto',
            type:    'hls',
            headers: { 'Referer': 'https://vidmoly.net/' }
          };
        });
      }

      return null;
    })
    .catch(function() { return null; });
}

function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType !== 'tv') return Promise.resolve([]);
  console.log('[SezonlukDizi] getStreams -> tmdbId=' + tmdbId + ' S' + season + 'E' + episode);

  return Promise.all([fetchTmdbInfo(tmdbId), fetchSessionCookie(), fetchAspData()])
    .then(function(init) {
      var info    = init[0];
      var cookie  = init[1];
      var aspData = init[2];
      console.log('[SezonlukDizi] TMDB: "' + info.titleEn + '" / "' + info.titleTr + '"');

      var slugEn = titleToSlug(info.titleEn);
      var slugTr = titleToSlug(info.titleTr);
      console.log('[SezonlukDizi] Slug EN: ' + slugEn + ' | TR: ' + slugTr);

      return validateShowPage(slugEn)
        .then(function(found) {
          if (found) return found;
          if (slugTr !== slugEn) return validateShowPage(slugTr);
          return null;
        })
        .then(function(slug) {
          if (!slug) throw new Error('Dizi bulunamadi: ' + slugEn);
          var epUrl = BASE_URL + '/' + slug + '/' + season + '-sezon-' + episode + '-bolum.html';
          console.log('[SezonlukDizi] Bolum URL: ' + epUrl);
          return fetchBid(epUrl, cookie).then(function(bidData) {
            return { bidData: bidData, aspData: aspData, epUrl: epUrl };
          });
        });
    })
    .then(function(ctx) {
      var bidData = ctx.bidData;
      var aspData = ctx.aspData;
      var epUrl   = ctx.epUrl;

      if (!bidData || !bidData.bid) return [];

      return Promise.all([
        fetchAlternatifler(bidData.bid, '0', aspData, bidData.cookies, epUrl).then(function(list) {
          console.log('[SezonlukDizi] Dublaj alternatif: ' + list.length);
          return Promise.all(list.map(function(v) { return processVeri(v, 'TR Dublaj', aspData); }));
        }),
        fetchAlternatifler(bidData.bid, '1', aspData, bidData.cookies, epUrl).then(function(list) {
          console.log('[SezonlukDizi] Altyazi alternatif: ' + list.length);
          return Promise.all(list.map(function(v) { return processVeri(v, 'TR Altyazi', aspData); }));
        })
      ]).then(function(all) {
        return all[0].concat(all[1]).filter(Boolean);
      });
    })
    .then(function(streams) {
      console.log('[SezonlukDizi] Toplam stream: ' + streams.length);
      return streams;
    })
    .catch(function(err) {
      console.log('[SezonlukDizi] Hata: ' + err.message);
      return [];
    });
}

module.exports = { getStreams: getStreams };
