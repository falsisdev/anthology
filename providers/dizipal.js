// DiziPal — Nuvio Provider (Optimized)
// Orijinale göre değişiklikler:
//  1. TMDB + arama sıralı → TMDB alındıktan hemen sonra arama başlar (zaten öyleydi ama zincir düzeltildi)
//  2. fetchWithTimeout: 8s — takılan istek beklemiyor
//  3. parseMasterM3u8 — orijinalde her stream için ayrı fetch vardı, tek sefere indirildi
//  4. TR/EN başlık aramaları PARALEL (orijinalde sıralıydı: önce TR, bulamazsa EN)
//  5. Master m3u8 parse sonucu cache'lenir (aynı URL için ikinci kez fetch yapılmaz)

var BASE_URL = 'https://dizipal.bar';
var FETCH_TIMEOUT_MS = 8000;

var HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer':         BASE_URL + '/'
};

var STREAM_HEADERS = {
  'User-Agent':      HEADERS['User-Agent'],
  'Accept':          'video/webm,video/ogg,video/*;q=0.9,*/*;q=0.5',
  'Accept-Language': 'tr-TR,tr;q=0.9',
  'Accept-Encoding': 'identity',
  'Origin':          BASE_URL,
  'Referer':         BASE_URL + '/',
  'DNT':             '1'
};

function fetchWithTimeout(url, options) {
  return new Promise(function(resolve, reject) {
    var t = setTimeout(function() { reject(new Error('Timeout: ' + url)); }, FETCH_TIMEOUT_MS);
    fetch(url, options)
      .then(function(r) { clearTimeout(t); resolve(r); })
      .catch(function(e) { clearTimeout(t); reject(e); });
  });
}

function findAll(html, pattern) {
  var results = [], regex = new RegExp(pattern, 'gi'), m;
  while ((m = regex.exec(html)) !== null) results.push(m);
  return results;
}
function findFirst(html, pattern) {
  var m = new RegExp(pattern, 'i').exec(html);
  return m ? m : null;
}

// ── Arama ────────────────────────────────────────────────────
function searchDiziPal(title, mediaType) {
  var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(title);
  return fetchWithTimeout(searchUrl, { headers: HEADERS })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var results = [];
      var re = /<a[^>]+href="(https:\/\/dizipal\.bar\/(?:dizi|film|anime)\/[^"]+)"[^>]*title="([^"]+)"/gi;
      var m;
      while ((m = re.exec(html)) !== null) {
        var url  = m[1];
        var type = url.includes('/dizi/') || url.includes('/anime/') ? 'tv' : 'movie';
        if (mediaType === 'movie' && type !== 'movie') continue;
        if (mediaType === 'tv'    && type === 'movie') continue;
        if (!results.some(function(r) { return r.url === url; }))
          results.push({ title: m[2], url: url, type: type });
      }
      return results;
    });
}

function findBestMatch(results, query) {
  if (!results || !results.length) return null;
  var q = query.toLowerCase();
  for (var i = 0; i < results.length; i++)
    if (results[i].title.toLowerCase() === q) return results[i];
  for (var j = 0; j < results.length; j++)
    if (results[j].title.toLowerCase().includes(q)) return results[j];
  return results[0];
}

// ── İçerik sayfası ───────────────────────────────────────────
function loadContentPage(url) {
  return fetchWithTimeout(url, { headers: HEADERS })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var patterns = [
        '<iframe[^>]+src="([^"]+)"[^>]*class="[^"]*(?:responsive-player|series-player)[^"]*"',
        'class="[^"]*(?:responsive-player|series-player)[^"]*"[^>]*>[\\s\\S]*?<iframe[^>]+src="([^"]+)"',
        '<div[^>]*id="vast_new"[^>]*>[\\s\\S]*?<iframe[^>]+src="([^"]+)"',
        '<iframe[^>]+src="([^"]+)"'
      ];
      for (var i = 0; i < patterns.length; i++) {
        var m = findFirst(html, patterns[i]);
        if (m) return m[1];
      }
      return null;
    });
}

// ── m3u8 çek ─────────────────────────────────────────────────
function extractM3u8FromIframe(iframeSrc) {
  if (!iframeSrc) return Promise.resolve(null);
  var url = iframeSrc.startsWith('http') ? iframeSrc : BASE_URL + iframeSrc;
  return fetchWithTimeout(url, {
    headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' })
  })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var origin = url.split('/').slice(0, 3).join('/');
      var m = findFirst(html, 'file:"([^"]+\\.m3u8[^"]*)"')
           || findFirst(html, '"file"\\s*:\\s*"([^"]+\\.m3u8[^"]*)"');
      if (m) return { url: m[1], subtitle: extractSubtitle(html), iframeOrigin: origin };
      return null;
    });
}

function extractSubtitle(html) {
  var m = findFirst(html, '"subtitle"\\s*:\\s*"([^"]+)"');
  return m ? m[1] : null;
}

// ── Master m3u8 parse ─────────────────────────────────────────
// OPT: Sonuç cache'lenir — aynı master URL için ikinci kez fetch yapılmaz
var m3u8Cache = {};
function parseMasterM3u8(masterUrl, streamHeaders) {
  if (m3u8Cache[masterUrl]) return Promise.resolve(m3u8Cache[masterUrl]);
  return fetchWithTimeout(masterUrl, { headers: streamHeaders })
    .then(function(r) { return r.text(); })
    .then(function(m3u8) {
      var lines = m3u8.split('\n');
      var turkishAudioUrl = null;
      var streams = [];
      for (var i = 0; i < lines.length; i++) {
        var l = lines[i].trim();
        if (l.includes('TYPE=AUDIO') && l.includes('LANGUAGE="tr"')) {
          var um = l.match(/URI="([^"]+)"/);
          if (um) turkishAudioUrl = um[1];
        }
        if (l.startsWith('#EXT-X-STREAM-INF:')) {
          var next = (lines[i+1] || '').trim();
          if (!next || next.startsWith('#')) continue;
          var rm = l.match(/RESOLUTION=(\d+x\d+)/);
          var res = rm ? rm[1] : '';
          var quality = res.includes('1920') ? '1080p'
                      : res.includes('1280') ? '720p'
                      : res.includes('854')  ? '480p'
                      : res.includes('640')  ? '360p' : '720p';
          var su = next.startsWith('http') ? next : masterUrl.split('/').slice(0,-1).join('/') + '/' + next;
          streams.push({ url: su, quality: quality });
        }
      }
      var result = { streams: streams, turkishAudioUrl: turkishAudioUrl };
      m3u8Cache[masterUrl] = result;
      return result;
    })
    .catch(function() { return { streams: [], turkishAudioUrl: null }; });
}

function getEpisodeUrl(contentUrl, s, e) {
  var slug = contentUrl.replace(/\/$/, '').split('/dizi/')[1] || '';
  return BASE_URL + '/bolum/' + slug.replace(/\/$/, '') + '-' + s + '-sezon-' + e + '-bolum-izle/';
}

// ── Ana fonksiyon ─────────────────────────────────────────────
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
  var tmdbUrl  = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId
               + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

  return fetchWithTimeout(tmdbUrl, {})
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var title    = data.title || data.name || '';
      var year     = (data.release_date || data.first_air_date || '').substring(0, 4);
      var origTitle = data.original_title || data.original_name || '';
      if (!title) return [];

      // OPT: TR ve EN aramaları paralel başlat
      var searches = [searchDiziPal(title, mediaType)];
      if (origTitle && origTitle !== title)
        searches.push(searchDiziPal(origTitle, mediaType));

      return Promise.all(searches).then(function(allResults) {
        var results = allResults[0];
        if ((!results || !results.length) && allResults[1]) results = allResults[1];

        var best = findBestMatch(results, title)
                || (origTitle ? findBestMatch(results, origTitle) : null);
        if (!best) return [];

        var targetUrl = best.url;
        if (mediaType === 'tv' && seasonNum && episodeNum)
          targetUrl = getEpisodeUrl(best.url, seasonNum, episodeNum);

        return loadContentPage(targetUrl)
          .then(function(iframeSrc) { return extractM3u8FromIframe(iframeSrc); })
          .then(function(result) {
            if (!result || !result.url) return [];

            var subtitles = [];
            if (result.subtitle) {
              result.subtitle.split(',').forEach(function(sub) {
                sub = sub.trim();
                if (!sub) return;
                var sl = findFirst(sub, '\\[([^\\]]+)\\]');
                var su = sub.replace(/\[[^\]]+\]/, '').trim() || sub;
                var label = sl ? sl[1] : (sub.includes('_tur') ? 'Türkçe' : 'İngilizce');
                if (su) subtitles.push({ label: label, url: su });
              });
            }

            var sh = Object.assign({}, STREAM_HEADERS, {
              'Referer': (result.iframeOrigin || BASE_URL) + '/',
              'Origin':  result.iframeOrigin || BASE_URL
            });

            return parseMasterM3u8(result.url, sh).then(function(parsed) {
              var streams = [];
              if (parsed.turkishAudioUrl && parsed.streams.length > 0) {
                parsed.streams.forEach(function(s) {
                  streams.push({
                    name: '⌜ DiziPal ⌟ | TR Dublaj | ' + s.quality,
                    title: title + (year ? ' (' + year + ')' : '') + ' · ' + s.quality,
                    url: s.url, quality: s.quality,
                    headers: sh, subtitles: subtitles
                  });
                });
              }
              streams.push({
                name: '⌜ DiziPal ⌟ | Altyazılı',
                title: title + (year ? ' (' + year + ')' : ''),
                url: result.url, quality: '720p',
                headers: sh, subtitles: subtitles
              });
              return streams;
            });
          });
      });
    })
    .catch(function(err) {
      console.error('[DiziPal] Hata: ' + err.message);
      return [];
    });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams: getStreams };
} else {
  global.getStreams = getStreams;
}
