/**
 * NUVIO ŞABLON NOTU:
 * Üstte (name): TMDB Dizi İsmi
 * Altta (title): ⌜ SEZONLUKDIZI ⌟ | Kaynak | Dil Bilgisi
 */

var BASE_URL     = 'https://sezonlukdizi8.com';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer': BASE_URL + '/'
};

// ── Yardımcılar ───────────────────────────────────────────────

function fetchTmdbInfo(tmdbId) {
  return fetch('https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      return {
        title: d.name || d.original_name || 'Dizi',
        titleEn: d.original_name || '',
        titleTr: d.name || '',
        year: (d.first_air_date || '').slice(0, 4)
      };
    });
}

function fetchSessionCookie() {
  return fetch(BASE_URL + '/', { headers: HEADERS })
    .then(function(r) {
      var sc = r.headers.get('set-cookie');
      if (!sc) return '';
      return sc.split(',').map(function(c) { return c.trim().split(';')[0]; }).join('; ');
    })
    .catch(function() { return ''; });
}

function fetchAspData() {
  return fetch(BASE_URL + '/js/site.min.js', { headers: HEADERS })
    .then(function(r) { return r.text(); })
    .then(function(js) {
      var altM   = js.match(/dataAlternatif(.*?)\.asp/);
      var embedM = js.match(/dataEmbed(.*?)\.asp/);
      return { alternatif: altM ? altM[1] : '', embed: embedM ? embedM[1] : '' };
    })
    .catch(function() { return { alternatif: '', embed: '' }; });
}

function titleToSlug(t) {
  if(!t) return "";
  return t.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function validateShowPage(slug) {
  var url = BASE_URL + '/diziler/' + slug + '.html';
  return fetch(url, { headers: HEADERS })
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

function findShowSlug(slugEn, slugTr) {
  var candidates = [slugEn];
  if (slugTr && slugTr !== slugEn) candidates.push(slugTr);
  return new Promise(function(resolve) {
    var settled = false, done = 0;
    candidates.forEach(function(slug) {
      validateShowPage(slug).then(function(result) {
        done++;
        if (settled) return;
        if (result) { settled = true; resolve(result); }
        else if (done === candidates.length) resolve(null);
      });
    });
  });
}

function fetchBid(episodeUrl, cookie) {
  var hdrs = Object.assign({}, HEADERS);
  if (cookie) hdrs['Cookie'] = cookie;
  return fetch(episodeUrl, { headers: hdrs })
    .then(function(r) {
      var sc = r.headers.get('set-cookie'), newCookie = cookie || '';
      if (sc) {
        var extra = sc.split(',').map(function(c) { return c.trim().split(';')[0]; }).join('; ');
        newCookie = newCookie ? newCookie + '; ' + extra : extra;
      }
      return r.text().then(function(html) {
        var m = html.match(/data-id="([^"]+)"/);
        return { bid: m ? m[1] : null, cookies: newCookie };
      });
    });
}

function fetchAlternatifler(bid, dil, aspData, cookies, referer) {
  var hdrs = Object.assign({}, HEADERS, {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Origin': BASE_URL,
    'Referer': referer || BASE_URL + '/'
  });
  if (cookies) hdrs['Cookie'] = cookies;
  return fetch(BASE_URL + '/ajax/dataAlternatif' + aspData.alternatif + '.asp', {
    method: 'POST',
    headers: hdrs,
    body: 'bid=' + encodeURIComponent(bid) + '&dil=' + dil
  })
  .then(function(r) { return r.text(); })
  .then(function(text) {
    try {
      var j = JSON.parse(text);
      return (j.status === 'success' && Array.isArray(j.data)) ? j.data : (Array.isArray(j) ? j : []);
    } catch(e) { return []; }
  }).catch(function() { return []; });
}

function fetchEmbedIframe(embedId, aspData) {
  return fetch(BASE_URL + '/ajax/dataEmbed' + aspData.embed + '.asp', {
    method: 'POST',
    headers: Object.assign({}, HEADERS, { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/x-www-form-urlencoded' }),
    body: 'id=' + embedId
  })
  .then(function(r) { return r.text(); })
  .then(function(html) {
    var m = html.match(/<iframe[^>]+src="([^"]+)"/i);
    return m ? m[1] : null;
  }).catch(function() { return null; });
}

function processVeri(veri, dilTag, aspData) {
  var name = (veri.baslik || '').toLowerCase();
  if (name === 'pixel' || name === 'netu') return Promise.resolve(null);

  return fetchEmbedIframe(veri.id, aspData).then(function(src) {
    if (!src) return null;
    var provider = "Video";
    if (src.indexOf('sibnet.ru') !== -1) provider = "Sibnet";
    if (src.indexOf('vidmoly') !== -1) provider = "VidMoly";

    var streamData = { provider: provider, dil: dilTag, url: src, type: 'hls', headers: { 'Referer': src } };

    if (provider === "Sibnet") {
        var id = (src.match(/videoid=(\d+)/) || src.match(/video(\d+)/) || [])[1];
        if (!id) return null;
        var shell = 'https://video.sibnet.ru/shell.php?videoid=' + id;
        return fetch(shell, { headers: Object.assign({}, HEADERS, { 'Referer': 'https://video.sibnet.ru/' }) })
            .then(function(r) { return r.text(); })
            .then(function(html) {
                var m = html.match(/src\s*:\s*"(\/v\/[^"]+\.mp4[^"]*)"/i);
                if (!m) return null;
                streamData.url = 'https://video.sibnet.ru' + m[1];
                streamData.type = 'direct';
                streamData.headers = { 'Referer': shell };
                return streamData;
            });
    }

    if (provider === "VidMoly") {
        var full = src.startsWith('//') ? 'https:' + src : src;
        return fetch(full, { headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' }) })
            .then(function(r) { return r.text(); })
            .then(function(html) {
                var m = html.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i);
                if (!m) return null;
                streamData.url = m[1];
                streamData.headers = { 'Referer': full };
                return streamData;
            });
    }
    return null;
  }).catch(function() { return null; });
}

function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType !== 'tv') return Promise.resolve([]);

  return Promise.all([fetchTmdbInfo(tmdbId), fetchSessionCookie(), fetchAspData()])
    .then(function(init) {
      var info = init[0], cookie = init[1], aspData = init[2];
      return findShowSlug(titleToSlug(info.titleEn), titleToSlug(info.titleTr)).then(function(slug) {
        if (!slug) throw new Error('Dizi bulunamadı');
        var epUrl = BASE_URL + '/' + slug + '/' + season + '-sezon-' + episode + '-bolum.html';
        return fetchBid(epUrl, cookie).then(function(bd) {
            return Promise.all([
                fetchAlternatifler(bd.bid, '0', aspData, bd.cookies, epUrl),
                fetchAlternatifler(bd.bid, '1', aspData, bd.cookies, epUrl)
            ]).then(function(lists) {
                var prom = [];
                lists[0].forEach(function(v) { prom.push(processVeri(v, '🇹🇷 TR Dublaj', aspData)); });
                lists[1].forEach(function(v) { prom.push(processVeri(v, '🌐 TR Altyazı', aspData)); });
                return Promise.all(prom).then(function(results) {
                    return results.filter(Boolean).map(function(s) {
                        return {
                            name: info.title,
                            title: '⌜ SEZONLUKDIZI ⌟ | ' + s.provider + ' | ' + s.dil,
                            url: s.url,
                            quality: '1080p',
                            type: s.type,
                            headers: s.headers
                        };
                    });
                });
            });
        });
      });
    }).catch(function() { return []; });
}

module.exports = { getStreams: getStreams };
