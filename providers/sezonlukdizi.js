// ============================================================
//  SezonlukDizi — Nuvio Provider (v2 — Optimize)
//
//  OPT 1: TMDB + cookie + asp data üçü PARALEL başlıyor
//  OPT 2: EN ve TR slug denemesi sıralı yerine PARALEL (race)
//  OPT 3: Dublaj + altyazı alternatifleri PARALEL çekiliyor (zaten vardı)
//  OPT 4: Her embed için iframe+extractor PARALEL işleniyor
// ============================================================

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
  return fetch('https://api.themoviedb.org/3/tv/' + tmdbId
    + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      return {
        titleTr: d.name || '',
        titleEn: d.original_name || '',
        year:    (d.first_air_date || '').slice(0, 4)
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
      return {
        alternatif: altM   ? altM[1]   : '',
        embed:      embedM ? embedM[1] : ''
      };
    })
    .catch(function() { return { alternatif: '', embed: '' }; });
}

function stripPrefix(t) {
  return (t||'').replace(/^marvel's\s+/i,'').replace(/^marvel\s+/i,'').replace(/^dc's\s+/i,'').trim();
}

function titleToSlug(t) {
  t = stripPrefix(t);
  return t.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

// ── OPT: Slug denemesi — race (paralel) ───────────────────────

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

// OPT: EN ve TR'yi aynı anda dene, ilk geçerli kazanır
function findShowSlug(slugEn, slugTr) {
  var candidates = [slugEn];
  if (slugTr && slugTr !== slugEn) candidates.push(slugTr);

  return new Promise(function(resolve) {
    var settled = false;
    var done = 0;
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

// ── Episode & Fetch ───────────────────────────────────────────

function fetchBid(episodeUrl, cookie) {
  var hdrs = Object.assign({}, HEADERS);
  if (cookie) hdrs['Cookie'] = cookie;
  return fetch(episodeUrl, { headers: hdrs })
    .then(function(r) {
      var newCookie = cookie || '';
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

function fetchAlternatifler(bid, dil, aspData, cookies, referer) {
  var hdrs = Object.assign({}, HEADERS, {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type':     'application/x-www-form-urlencoded',
    'Origin':           BASE_URL,
    'Referer':          referer || BASE_URL + '/'
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
      if (j.status === 'success' && Array.isArray(j.data)) return j.data;
      if (Array.isArray(j)) return j;
    } catch(e) {}
    return [];
  })
  .catch(function() { return []; });
}

function fetchEmbedIframe(embedId, aspData) {
  return fetch(BASE_URL + '/ajax/dataEmbed' + aspData.embed + '.asp', {
    method: 'POST',
    headers: Object.assign({}, HEADERS, {
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type':     'application/x-www-form-urlencoded'
    }),
    body: 'id=' + embedId
  })
  .then(function(r) { return r.text(); })
  .then(function(html) {
    var m = html.match(/<iframe[^>]+src="([^"]+)"/i);
    return m ? m[1] : null;
  })
  .catch(function() { return null; });
}

// ── Extractors ────────────────────────────────────────────────

function fetchSibnetStream(url) {
  var id = (url.match(/videoid=(\d+)/) || url.match(/video(\d+)/) || [])[1];
  if (!id) return Promise.resolve(null);
  var shell = 'https://video.sibnet.ru/shell.php?videoid=' + id;
  return fetch(shell, { headers: Object.assign({}, HEADERS, { 'Referer': 'https://video.sibnet.ru/' }) })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var m = html.match(/src\s*:\s*"(\/v\/[^"]+\.mp4[^"]*)"/i);
      if (!m) return null;
      return { url: 'https://video.sibnet.ru' + m[1], referer: shell };
    })
    .catch(function() { return null; });
}

function fetchVidMolyStream(url) {
  var full = url.startsWith('//') ? 'https:' + url : url;
  return fetch(full, { headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' }) })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var m = html.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i);
      return m ? { url: m[1], referer: full } : null;
    })
    .catch(function() { return null; });
}

function processVeri(veri, dilAd, aspData) {
  var name = (veri.baslik || '').toLowerCase();
  if (name === 'pixel' || name === 'netu') return Promise.resolve(null);

  return fetchEmbedIframe(veri.id, aspData)
    .then(function(src) {
      if (!src) return null;

      if (src.indexOf('sibnet.ru') !== -1) {
        return fetchSibnetStream(src).then(function(s) {
          if (!s) return null;
          return { url: s.url, name: dilAd, title: 'Sibnet', quality: '1080p', type: 'direct',
                   headers: { 'Referer': s.referer } };
        });
      }

      if (src.indexOf('vidmoly') !== -1) {
        return fetchVidMolyStream(src).then(function(s) {
          if (!s) return null;
          return { url: s.url, name: dilAd, title: 'VidMoly', quality: 'Auto', type: 'hls',
                   headers: { 'Referer': s.referer || 'https://vidmoly.net/' } };
        });
      }

      return null;
    })
    .catch(function() { return null; });
}

// ── Ana fonksiyon ─────────────────────────────────────────────

function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType !== 'tv') return Promise.resolve([]);
  console.log('[SezonlukDizi] TMDB:' + tmdbId + ' S' + season + 'E' + episode);

  // OPT: TMDB + cookie + asp data üçü paralel
  return Promise.all([fetchTmdbInfo(tmdbId), fetchSessionCookie(), fetchAspData()])
    .then(function(init) {
      var info    = init[0];
      var cookie  = init[1];
      var aspData = init[2];

      var slugEn = titleToSlug(info.titleEn);
      var slugTr = titleToSlug(info.titleTr);

      // OPT: EN + TR slug race
      return findShowSlug(slugEn, slugTr).then(function(slug) {
        if (!slug) throw new Error('Dizi bulunamadı: ' + slugEn);
        var epUrl = BASE_URL + '/' + slug + '/' + season + '-sezon-' + episode + '-bolum.html';
        console.log('[SezonlukDizi] Bölüm: ' + epUrl);
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

      // OPT: Dublaj (0) + Altyazı (1) paralel
      return Promise.all([
        fetchAlternatifler(bid, '0', aspData, cookies, epUrl),
        fetchAlternatifler(bid, '1', aspData, cookies, epUrl)
      ]).then(function(lists) {
        var allPromises = [];
        lists[0].forEach(function(v) { allPromises.push(processVeri(v, 'TR Dublaj', aspData)); });
        lists[1].forEach(function(v) { allPromises.push(processVeri(v, 'TR Altyazı', aspData)); });
        return Promise.all(allPromises);
      });
    })
    .then(function(results) {
      var streams = results.filter(Boolean);
      console.log('[SezonlukDizi] Streams: ' + streams.length);
      return streams;
    })
    .catch(function(e) { console.log('[SezonlukDizi] Hata: ' + e.message); return []; });
}

if (typeof module !== 'undefined') module.exports = { getStreams: getStreams };
else global.getStreams = getStreams;
