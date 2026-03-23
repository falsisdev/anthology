// ============================================================
//  JetFilmizle — Nuvio Provider
//  Kaynak: jetfilmizle.net | Sadece Film
// ============================================================

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer': BASE_URL + '/'
};

// ── Yardımcı ─────────────────────────────────────────────────
function titleToSlug(title) {
  return (title || '').toLowerCase()
    .replace(/\u011f/g,'g').replace(/\u00fc/g,'u').replace(/\u015f/g,'s')
    .replace(/\u0131/g,'i').replace(/\u0130/g,'i').replace(/\u00f6/g,'o')
    .replace(/\u00e7/g,'c').replace(/\u00e2/g,'a').replace(/\u00fb/g,'u')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

// ── TMDB ─────────────────────────────────────────────────────
function fetchTmdbInfo(tmdbId) {
  return fetch(
    'https://api.themoviedb.org/3/movie/' + tmdbId +
    '?api_key=' + TMDB_API_KEY + '&language=tr-TR'
  )
  .then(function(r) {
    if (!r.ok) throw new Error('TMDB hata: ' + r.status);
    return r.json();
  })
  .then(function(d) {
    return {
      titleTr: d.title || '',
      titleEn: d.original_title || '',
      year:    (d.release_date || '').slice(0, 4)
    };
  });
}

// ── Arama: filmara.php POST (Kotlin ile aynı) ─────────────────
function searchFilm(query) {
  console.log('[JetFilmizle] Arama: ' + query);
  return fetch(BASE_URL + '/filmara.php', {
    method: 'POST',
    headers: Object.assign({}, HEADERS, {
      'Content-Type': 'application/x-www-form-urlencoded'
    }),
    body: 's=' + encodeURIComponent(query)
  })
  .then(function(r) { return r.text(); })
  .then(function(html) {
    // article.movie içindeki linkleri topla
    var re = /href="(https?:\/\/jetfilmizle\.net\/film\/[^"?#]+)"/g;
    var m, seen = {}, links = [];
    while ((m = re.exec(html)) !== null) {
      if (!seen[m[1]]) { seen[m[1]] = true; links.push(m[1]); }
    }
    console.log('[JetFilmizle] Arama sonucu: ' + links.length + ' film');
    return links;
  })
  .catch(function(e) {
    console.log('[JetFilmizle] Arama hata: ' + e.message);
    return [];
  });
}

// ── Film sayfasını bul ────────────────────────────────────────
function findFilmPage(titleTr, titleEn) {
  // Önce slug ile direkt dene
  var slugTr = titleToSlug(titleTr);
  var slugEn = titleToSlug(titleEn);
  var direct = [];
  if (slugTr) direct.push(BASE_URL + '/film/' + slugTr);
  if (slugEn && slugEn !== slugTr) direct.push(BASE_URL + '/film/' + slugEn);
  console.log('[JetFilmizle] Direkt deneme: ' + direct.join(', '));

  function tryDirect(i) {
    if (i >= direct.length) return trySearch();
    return fetch(direct[i], { headers: HEADERS })
      .then(function(r) {
        if (!r.ok) { console.log('[JetFilmizle] ' + direct[i] + ' -> ' + r.status); return tryDirect(i + 1); }
        return r.text().then(function(html) {
          // Geçerli film sayfası mı?
          if (html.indexOf('div#movie') !== -1 || html.indexOf('download-btn') !== -1 || html.indexOf('film_id') !== -1) {
            console.log('[JetFilmizle] Direkt bulundu: ' + direct[i]);
            return { url: direct[i], html: html };
          }
          return tryDirect(i + 1);
        });
      })
      .catch(function() { return tryDirect(i + 1); });
  }

  function trySearch() {
    // Önce TR title ile ara, bulamazsa EN ile
    return searchFilm(titleTr)
      .then(function(links) {
        if (links.length === 0 && titleEn && titleEn !== titleTr) {
          return searchFilm(titleEn);
        }
        return links;
      })
      .then(function(links) {
        if (links.length === 0) throw new Error('Film bulunamadi: ' + titleTr);
        // Slug eşleşmesi dene
        var normTr = slugTr, normEn = slugEn;
        var best = null;
        for (var i = 0; i < links.length; i++) {
          var slug = (links[i].split('/film/')[1] || '').replace(/\/$/, '');
          if (slug === normTr || slug === normEn) { best = links[i]; break; }
        }
        var target = best || links[0];
        console.log('[JetFilmizle] Arama sonucu seçildi: ' + target);
        return fetch(target, { headers: HEADERS })
          .then(function(r) { return r.text(); })
          .then(function(html) { return { url: target, html: html }; });
      });
  }

  return tryDirect(0);
}

// ── Film sayfasından iframe + pixeldrain linkleri çek ─────────
// Kotlin: div#movie iframe[data-litespeed-src|src] + a.download-btn[href*=pixeldrain]
function parseFilmPage(html, pageUrl) {
  var result = { iframeSrc: null, pixeldrains: [] };

  // iframe: önce data-litespeed-src, sonra src
  var iframeRe = /<iframe[^>]+(?:data-litespeed-src|src)="([^"]+)"/gi;
  var m;
  while ((m = iframeRe.exec(html)) !== null) {
    var src = m[1];
    // div#movie içindeki iframe (yaklaşık kontrol)
    if (!result.iframeSrc) {
      result.iframeSrc = src;
      console.log('[JetFilmizle] iframe: ' + src);
    }
  }

  // pixeldrain download linkleri: a.download-btn href
  var pdRe = /href="(https?:\/\/pixeldrain\.com\/u\/[^"]+)"/g;
  while ((m = pdRe.exec(html)) !== null) {
    result.pixeldrains.push(m[1]);
    console.log('[JetFilmizle] Pixeldrain: ' + m[1]);
  }

  return result;
}

// ── Pixeldrain stream ─────────────────────────────────────────
function fetchPixeldrainStream(pdUrl) {
  var fileId = pdUrl.split('/u/').pop().split('?')[0];
  return fetch('https://pixeldrain.com/api/file/' + fileId + '/info')
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(info) {
      var name = (info && info.name) || '';
      var size = (info && info.size) || 0;
      var quality;
      if      (/2160p|4k/i.test(name))  quality = '4K';
      else if (/1080p/i.test(name))      quality = '1080p';
      else if (/720p/i.test(name))       quality = '720p';
      else if (/480p/i.test(name))       quality = '480p';
      else                               quality = 'Auto';
      console.log('[JetFilmizle] Pixeldrain info: ' + quality + ' ' + Math.round(size/1024/1024) + 'MB');
      return {
        url:     'https://pixeldrain.com/api/file/' + fileId + '?download',
        name:    'TR Dublaj',
        title:   'Pixeldrain',
        quality: quality,
        headers: { 'Referer': 'https://pixeldrain.com/' }
      };
    })
    .catch(function() {
      return {
        url:     'https://pixeldrain.com/api/file/' + fileId + '?download',
        name:    'TR Dublaj',
        title:   'Pixeldrain',
        quality: 'Auto',
        headers: { 'Referer': 'https://pixeldrain.com/' }
      };
    });
}

// ── jetv.xyz / d2rs.com iframe işleme ────────────────────────
function fetchJetvStream(iframeUrl) {
  var fullUrl = iframeUrl.startsWith('//') ? 'https:' + iframeUrl : iframeUrl;
  console.log('[JetFilmizle] Jetv fetch: ' + fullUrl);
  return fetch(fullUrl, { headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' }) })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      // "sources": [{file:"...", type:"...", label:"..."}]
      var srcMatch = html.match(/"sources"\s*:\s*\[\s*\{[^}]+\}/);
      if (srcMatch) {
        var fileM  = srcMatch[0].match(/"file"\s*:\s*"([^"]+)"/);
        var labelM = srcMatch[0].match(/"label"\s*:\s*"([^"]+)"/);
        if (fileM) {
          var streamUrl = fileM[1];
          var label     = labelM ? labelM[1] : 'Auto';
          console.log('[JetFilmizle] Jetv m3u8: ' + streamUrl);
          return {
            url:     streamUrl,
            name:    'TR Dublaj',
            title:   'Jetv',
            quality: label,
            type:    'hls',
            headers: { 'Referer': fullUrl }
          };
        }
      }
      // d2rs: iç iframe ara
      var innerM = html.match(/<iframe[^>]+src="([^"]+)"/i);
      if (innerM) {
        return fetchJetvStream(innerM[1]);
      }
      return null;
    })
    .catch(function(e) { console.log('[JetFilmizle] Jetv hata: ' + e.message); return null; });
}

// ── Ana akış ─────────────────────────────────────────────────
function getStreams(tmdbId, mediaType, season, episode) {
  console.log('[JetFilmizle] getStreams -> tmdbId=' + tmdbId + ' type=' + mediaType);

  return fetchTmdbInfo(tmdbId)
    .then(function(info) {
      console.log('[JetFilmizle] TMDB: "' + info.titleEn + '" / "' + info.titleTr + '" (' + info.year + ')');
      return findFilmPage(info.titleTr, info.titleEn);
    })
    .then(function(result) {
      console.log('[JetFilmizle] Sayfa: ' + result.url);
      var parsed = parseFilmPage(result.html, result.url);
      var streams = [];
      var promises = [];

      // 1. Pixeldrain linkleri
      if (parsed.pixeldrains.length > 0) {
        var pdPromise = Promise.all(parsed.pixeldrains.map(fetchPixeldrainStream))
          .then(function(pdStreams) {
            // Hash'e göre deduplicate
            var seen = {};
            pdStreams.forEach(function(s) {
              var key = s.url;
              if (!seen[key]) { seen[key] = true; streams.push(s); }
            });
          });
        promises.push(pdPromise);
      }

      // 2. iframe (jetv.xyz veya d2rs.com)
      if (parsed.iframeSrc) {
        var src = parsed.iframeSrc;
        if (src.indexOf('jetv.xyz') !== -1 || src.indexOf('d2rs.com') !== -1 || src.indexOf('d2rs') !== -1) {
          promises.push(
            fetchJetvStream(src).then(function(s) { if (s) streams.push(s); })
          );
        }
        // Diğer iframe türleri eklenebilir
      }

      return Promise.all(promises).then(function() { return streams; });
    })
    .then(function(streams) {
      console.log('[JetFilmizle] Toplam stream: ' + streams.length);
      return streams;
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
