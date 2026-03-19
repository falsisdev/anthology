// ============================================================
//  JetFilmizle — Nuvio Provider
// ============================================================

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer': BASE_URL + '/'
};

function fetchTmdbInfo(tmdbId, mediaType) {
  // Nuvio bazen film icin 'tv' gonderebilir, once movie dene, 404'te tv dene
  var mtype = (mediaType || '').toLowerCase();
  var endpoint = (mtype === 'tv' || mtype === 'series') ? 'tv' : 'movie';
  var url = 'https://api.themoviedb.org/3/' + endpoint + '/' + tmdbId
    + '?api_key=' + TMDB_API_KEY + '&language=tr-TR';
  return fetch(url)
    .then(function(r) {
      if (!r.ok && endpoint === 'movie') {
        // movie 404 verdi, tv olarak dene
        return fetch('https://api.themoviedb.org/3/tv/' + tmdbId
          + '?api_key=' + TMDB_API_KEY + '&language=tr-TR');
      }
      return r;
    })
    .then(function(r) {
      if (!r.ok) throw new Error('TMDB hata: ' + r.status);
      return r.json();
    })
    .then(function(data) {
      return {
        titleTr: data.title || data.name || '',
        titleEn: data.original_title || data.original_name || '',
        year:    (data.release_date || data.first_air_date || '').slice(0, 4)
      };
    });
}

function titleToSlug(title) {
  return (title || '').toLowerCase()
    .replace(/\u011f/g,'g').replace(/\u00fc/g,'u').replace(/\u015f/g,'s')
    .replace(/\u0131/g,'i').replace(/\u0130/g,'i').replace(/\u00f6/g,'o').replace(/\u00e7/g,'c')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function isFilmPage(html) {
  return html.indexOf('film_id') !== -1 ||
         html.indexOf('pixeldrain.com') !== -1 ||
         html.indexOf('player-source-btn') !== -1;
}

function findFilmUrl(titleTr, titleEn) {
  var slugTr = titleToSlug(titleTr);
  var slugEn = titleToSlug(titleEn);
  var candidates = [];
  if (slugTr) candidates.push(BASE_URL + '/film/' + slugTr);
  if (slugEn && slugEn !== slugTr) candidates.push(BASE_URL + '/film/' + slugEn);
  console.log('[JetFilmizle] Slug adayları: ' + candidates.join(', '));

  function tryNext(i) {
    if (i >= candidates.length) return searchFallback(titleTr, titleEn);
    var url = candidates[i];
    return fetch(url, { headers: HEADERS })
      .then(function(r) {
        if (!r.ok) { console.log('[JetFilmizle] ' + url + ' -> ' + r.status); return tryNext(i + 1); }
        return r.text().then(function(html) {
          var valid = isFilmPage(html);
          console.log('[JetFilmizle] ' + url + ' -> 200, gecerli: ' + valid);
          if (valid) return { url: url, html: html };
          return tryNext(i + 1);
        });
      })
      .catch(function() { return tryNext(i + 1); });
  }
  return tryNext(0);
}

function searchFallback(titleTr, titleEn) {
  var query = titleTr || titleEn;
  console.log('[JetFilmizle] Arama: ' + query);
  return fetch(BASE_URL + '/arama?q=' + encodeURIComponent(query), { headers: HEADERS })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var cardRe = /href="(https?:\/\/jetfilmizle\.net\/film\/[^"?#]+)"/g;
      var m, seen = {}, links = [];
      while ((m = cardRe.exec(html)) !== null) {
        if (!seen[m[1]]) { seen[m[1]] = true; links.push(m[1]); }
      }
      if (links.length === 0) throw new Error('Film bulunamadi');
      var normTr = titleToSlug(titleTr), normEn = titleToSlug(titleEn);
      for (var i = 0; i < links.length; i++) {
        var s = (links[i].split('/film/')[1] || '').split('/')[0];
        if (s === normTr || s === normEn) return fetch(links[i], { headers: HEADERS }).then(function(r) { return r.text().then(function(h) { return { url: links[i], html: h }; }); });
      }
      return fetch(links[0], { headers: HEADERS }).then(function(r) { return r.text().then(function(h) { return { url: links[0], html: h }; }); });
    });
}

function parseFilmLinks(filmUrl, html) {
  var filmIdMatch = html.match(/name=["']film_id["'][^>]*value=["'](\d+)["']/) ||
                    html.match(/value=["'](\d+)["'][^>]*name=["']film_id["']/);
  var filmId = filmIdMatch ? filmIdMatch[1] : null;
  console.log('[JetFilmizle] film_id: ' + filmId);

  var links = [];
  if (filmId) links.push({ type: 'gold', filmId: filmId });

  var dlRe = /href="(https?:\/\/pixeldrain\.com\/u\/[^"]+)"/g;
  var m;
  while ((m = dlRe.exec(html)) !== null) {
    links.push({ type: 'pixeldrain', url: m[1] });
    console.log('[JetFilmizle] Pixeldrain: ' + m[1]);
  }

  var ifRe = /<iframe[^>]+(?:src|data-src)="([^"]*(?:jetv|d2rs|vidmoly|mlycdn)[^"]*)"/gi;
  while ((m = ifRe.exec(html)) !== null) {
    links.push({ type: 'iframe', url: m[1] });
    console.log('[JetFilmizle] iframe: ' + m[1]);
  }

  console.log('[JetFilmizle] Toplam link: ' + links.length);
  return links;
}

function fetchJetplayerIndex(filmId, sourceIndex) {
  var body = 'film_id=' + filmId + '&source_index=' + sourceIndex + '&player_type=dublaj';
  var timeout = new Promise(function(resolve) { setTimeout(function() { resolve(null); }, 6000); });
  var req = fetch('https://jetfilmizle.net/jetplayer', {
    method: 'POST',
    headers: Object.assign({}, HEADERS, {
      'Content-Type':     'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer':          BASE_URL + '/'
    }),
    body: body
  })
  .then(function(r) { return r.text(); })
  .then(function(html) {
    var m = html.match(/<iframe[^>]+src=['"]([^'"]+)['"]/i);
    return m ? m[1].trim() : null;
  })
  .catch(function() { return null; });
  return Promise.race([req, timeout]);
}

function fetchAllJetplayers(filmId) {
  // Gold(3) + VidMoly(4) paralel dene
  return Promise.all([3, 4].map(function(idx) {
    return fetchJetplayerIndex(filmId, idx).then(function(src) {
      if (!src) return null;
      console.log('[JetFilmizle] jetplayer[' + idx + ']: ' + src);
      return src;
    });
  })).then(function(results) { return results.filter(Boolean); });
}

function fetchGoldStreams(goldIframeSrc) {
  var idMatch = goldIframeSrc.match(/[?&]id=(\d+)/);
  if (!idMatch) return Promise.resolve([]);
  var goldId = idMatch[1];
  var url = 'https://jetcdn.org/gold/stream.php?id=' + goldId + '&t=' + Date.now();
  console.log('[JetFilmizle] Gold stream: ' + url);
  return fetch(url, {
    headers: Object.assign({}, HEADERS, { 'Referer': goldIframeSrc, 'Origin': 'https://jetcdn.org' })
  })
  .then(function(r) { return r.ok ? r.json() : null; })
  .then(function(data) {
    if (!data || !data.success || !Array.isArray(data.formats)) return [];
    var streams = [];
    data.formats.forEach(function(f) {
      if (f.url && f.mimeType && f.mimeType.indexOf('mp4') !== -1) {
        streams.push({ url: f.url, name: 'TR Dublaj', title: 'Gold', quality: f.quality || 'Auto', headers: { 'Referer': 'https://jetcdn.org/' } });
        console.log('[JetFilmizle] Gold: ' + f.quality + ' | ' + f.size);
      }
    });
    return streams;
  })
  .catch(function(e) { console.log('[JetFilmizle] Gold hata: ' + e.message); return []; });
}

function fetchVidMolyStream(iframeUrl) {
  var fullUrl = iframeUrl.startsWith('//') ? 'https:' + iframeUrl : iframeUrl;
  return fetch(fullUrl, { headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' }) })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var m = html.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i);
      if (!m) { console.log('[JetFilmizle] VidMoly m3u8 bulunamadi'); return null; }
      console.log('[JetFilmizle] VidMoly m3u8: ' + m[1]);
      return { url: m[1], name: 'TR Dublaj', title: 'VidMoly', quality: 'Auto', type: 'hls', headers: { 'Referer': 'https://vidmoly.net/' } };
    })
    .catch(function() { return null; });
}

function fetchPixeldrainInfo(link) {
  var fileId = link.url.split('/u/').pop().split('?')[0];
  return fetch('https://pixeldrain.com/api/file/' + fileId + '/info')
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(info) {
      return { url: link.url, size: (info && info.size) || 0, name: (info && info.name) || '', hash: (info && info.hash_sha256) || fileId };
    })
    .catch(function() { return { url: link.url, size: 0, name: '', hash: fileId }; });
}

function getStreams(tmdbId, mediaType, season, episode) {
  console.log('[JetFilmizle] getStreams -> tmdbId=' + tmdbId + ' type=' + mediaType);

  return fetchTmdbInfo(tmdbId, mediaType)
    .then(function(info) {
      console.log('[JetFilmizle] TMDB: "' + info.titleEn + '" / "' + info.titleTr + '" (' + info.year + ')');
      return findFilmUrl(info.titleTr, info.titleEn);
    })
    .then(function(result) {
      console.log('[JetFilmizle] Film URL: ' + result.url);
      var links = parseFilmLinks(result.url, result.html);
      var pdLinks   = links.filter(function(l) { return l.type === 'pixeldrain'; });
      var goldLinks = links.filter(function(l) { return l.type === 'gold'; });
      var filmId    = goldLinks.length > 0 ? goldLinks[0].filmId : null;

      var streams = [];
      var promises = [];

      // Pixeldrain — paralel info çek
      promises.push(
        Promise.all(pdLinks.map(fetchPixeldrainInfo)).then(function(infos) {
          var seen = {}, unique = [];
          infos.forEach(function(i) { if (!seen[i.hash]) { seen[i.hash] = true; unique.push(i); } });
          unique.sort(function(a, b) { return b.size - a.size; });
          var qualities = ['1080p', '720p', '480p', '360p'];
          unique.forEach(function(info, idx) {
            var fileId = info.url.split('/u/').pop().split('?')[0];
            var quality;
            if      (/2160p|4k/i.test(info.name))  quality = '4K';
            else if (/1080p/i.test(info.name))      quality = '1080p';
            else if (/720p/i.test(info.name))       quality = '720p';
            else if (/480p/i.test(info.name))       quality = '480p';
            else quality = qualities[idx] || 'Auto';
            console.log('[JetFilmizle] Pixeldrain: ' + quality + ' | ' + Math.round(info.size/1024/1024) + 'MB');
            streams.push({ url: 'https://pixeldrain.com/api/file/' + fileId + '?download', name: 'TR Dublaj', title: 'Pixeldrain', quality: quality, headers: { 'Referer': 'https://pixeldrain.com/' } });
          });
        })
      );

      // Gold + VidMoly — paralel jetplayer
      if (filmId) {
        promises.push(
          fetchAllJetplayers(filmId).then(function(srcs) {
            return Promise.all(srcs.map(function(src) {
              if (src.indexOf('jetcdn.org') !== -1) {
                return fetchGoldStreams(src).then(function(ss) { ss.forEach(function(s) { streams.push(s); }); });
              }
              if (src.indexOf('vidmoly') !== -1 || src.indexOf('mlycdn') !== -1) {
                return fetchVidMolyStream(src).then(function(s) { if (s) streams.push(s); });
              }
              return Promise.resolve();
            }));
          })
        );
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

module.exports = { getStreams: getStreams };
