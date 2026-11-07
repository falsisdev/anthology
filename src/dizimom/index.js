const { sortStreamsByQuality } = require("../shared/quality.js");
const { loadConfig, val, wrapAll } = require("../shared/config.js");

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v;
            v = val('urls.series.dizimom.base'); if (v && String(v).indexOf('dizidad.com') === -1) BASE_URL = String(v).replace(/\/+$/, '');
            if (HEADERS) HEADERS.Referer = BASE_URL + '/';
        });
    }
    return _cfgReady;
}

/**
 * Anthology - DiziMom Provider
 * DiziMom arşivi ve HDPlayerSystem / HDStreamable API üzerinden
 * doğrudan master.m3u8 HLS akışları sunar.
 */

var cheerio = require('cheerio-without-node-native');

var BASE_URL = 'https://ddizimom.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://ddizimom.net/'
};

async function resolveTmdbInfo(id, mediaType) {
  try {
    let cleanId = String(id || '').trim().replace(/^(?:movie|tv|series|tmdb|imdb):+/i, '');
    if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];

    let numericId = null;
    let title = '';
    let origTitle = '';

    if (cleanId.startsWith('tt')) {
      const findRes = await fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
      if (findRes.ok) {
        const fData = await findRes.json();
        const item = (mediaType === 'tv' || mediaType === 'series')
          ? (fData.tv_results && fData.tv_results[0])
          : (fData.movie_results && fData.movie_results[0]);
        if (item) {
          numericId = item.id;
          title = item.name || item.title || '';
          origTitle = item.original_name || item.original_title || '';
        }
      }
    } else {
      numericId = cleanId;
    }

    if (numericId && (!title || !origTitle)) {
      const type = (mediaType === 'tv' || mediaType === 'series') ? 'tv' : 'movie';
      const tRes = await fetch(`https://api.themoviedb.org/3/${type}/${numericId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
      if (tRes.ok) {
        const tData = await tRes.json();
        title = tData.name || tData.title || title;
        origTitle = tData.original_name || tData.original_title || origTitle;
      }
    }

    return { title, origTitle, numericId };
  } catch (e) {
    return { title: '', origTitle: '', numericId: id };
  }
}

function normalizeTitle(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function resolvePilavyerStream(epUrl, titlePrefix) {
  try {
    var epRes = await fetch(epUrl, { headers: HEADERS });
    if (!epRes.ok) return [];
    var epHtml = await epRes.text();
    var pvMatch = epHtml.match(/data-pv=["']([^"']+)["']/i);
    if (!pvMatch) return [];
    var pv = pvMatch[1];
    var sPhpUrl = 'https://pilavyerplay.top/assets/js/s.php?s=' + encodeURIComponent(pv);
    var pRes = await fetch(sPhpUrl, {
      headers: {
        'User-Agent': HEADERS['User-Agent'],
        'Referer': 'https://ddizimom.net/'
      }
    });
    if (!pRes.ok) return [];
    var pHtml = await pRes.text();
    var playerMatch = pHtml.match(/window\.__PLAYER__\s*=\s*(\{[\s\S]*?\});/);
    if (!playerMatch) return [];
    var pData = JSON.parse(playerMatch[1]);
    if (!pData || !pData.stream) return [];
    var subs = [];
    if (Array.isArray(pData.subs)) {
      subs = pData.subs.map(function(s) {
        return {
          id: s.lang || 'tr',
          lang: s.lang === 'tr' ? 'tur' : s.lang === 'en' ? 'eng' : (s.lang || 'tur'),
          language: s.lang || 'tr',
          label: s.label || (s.lang === 'tr' ? 'Türkçe' : 'İngilizce'),
          url: s.src,
          format: 'vtt',
          type: 'text/vtt',
          headers: {
            'User-Agent': HEADERS['User-Agent'],
            'Referer': 'https://pilavyerplay.top/'
          }
        };
      });
    }
    var streamTitle = titlePrefix ? ('⌜ DiziMom ⌟ | ' + titlePrefix + ' (1080p HLS)') : '⌜ DiziMom ⌟ | Pilavyer • [TR Altyazılı] (1080p HLS)';
    return [{
      name: 'DiziMom',
      title: streamTitle,
      url: pData.stream,
      quality: '1080p',
      format: 'hls',
      isHls: true,
      headers: {
        'User-Agent': HEADERS['User-Agent'],
        'Referer': 'https://pilavyerplay.top/'
      },
      behaviorHints: {
        notWebReady: true,
        proxyHeaders: {
          request: {
            'User-Agent': HEADERS['User-Agent'],
            'Referer': 'https://pilavyerplay.top/'
          }
        }
      },
      provider: 'dizimom',
      subtitles: subs
    }];
  } catch (e) {
    return [];
  }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  try {
    if (typeof tmdbId === 'object' && tmdbId !== null) {
      mediaType = tmdbId.type || mediaType;
      seasonNum = tmdbId.season || seasonNum;
      episodeNum = tmdbId.episode || episodeNum;
      tmdbId = tmdbId.id;
    }
    if (typeof tmdbId === 'string' && tmdbId.indexOf(':') !== -1 && !tmdbId.startsWith('dizimom:')) {
      var parts = tmdbId.split(':');
      if (parts.length >= 3) {
        var s = parseInt(parts[parts.length - 2]);
        var e = parseInt(parts[parts.length - 1]);
        if (!isNaN(s)) seasonNum = s;
        if (!isNaN(e)) episodeNum = e;
        tmdbId = parts[0];
      }
    }
    if (!mediaType) {
      mediaType = (seasonNum !== undefined && episodeNum !== undefined) ? 'tv' : 'movie';
    }

    if (typeof tmdbId === 'string' && tmdbId.startsWith('dizimom:ep:')) {
      var epSlug = tmdbId.replace('dizimom:ep:', '').replace(/^\//, '');
      var targetEpUrl = epSlug.startsWith('http') ? epSlug : (`${BASE_URL}/` + (epSlug.startsWith('dizi/') || epSlug.startsWith('film/') ? '' : 'dizi/') + epSlug);
      return await resolvePilavyerStream(targetEpUrl);
    }
    if (typeof tmdbId === 'string' && tmdbId.startsWith('dizimom:show:')) {
      var showSlug = tmdbId.replace('dizimom:show:', '').replace(/^\//, '');
      var sNum = parseInt(seasonNum) || 1;
      var eNum = parseInt(episodeNum) || 1;
      var directEpUrl = `${BASE_URL}/dizi/${showSlug}/sezon-${sNum}/bolum-${eNum}`;
      var directRes = await resolvePilavyerStream(directEpUrl);
      if (directRes && directRes.length > 0) return directRes;
    }

    var info = await resolveTmdbInfo(tmdbId, mediaType);
    var queries = [info.title, info.origTitle].filter(Boolean);
    if (queries.length === 0) return [];

    var season = parseInt(seasonNum) || 1;
    var episode = parseInt(episodeNum) || 1;
    var isMovie = (mediaType === 'movie');

    for (var q of queries) {
      var searchUrl = `${BASE_URL}/ara?q=${encodeURIComponent(q)}`;
      var sRes = await fetch(searchUrl, { headers: HEADERS });
      if (!sRes.ok) continue;
      var sHtml = await sRes.text();
      var $ = cheerio.load(sHtml);
      var normQ = normalizeTitle(q);

      var matchedItems = [];
      $('a').each((i, el) => {
        var href = $(el).attr('href') || '';
        var isDiziLink = href.includes('/dizi/') && !href.includes('/sezon-');
        var isFilmLink = href.includes('/film/');
        if ((!isMovie && isDiziLink) || (isMovie && isFilmLink)) {
          var rawText = $(el).text().trim().replace(/\s+/g, ' ');
          var normText = normalizeTitle(rawText);
          if (normText.includes(normQ) || normQ.includes(normText)) {
            matchedItems.push({ href: href, title: rawText });
          }
        }
      });

      for (var item of matchedItems.slice(0, 3)) {
        var targetPageUrl = '';
        if (isMovie) {
          targetPageUrl = item.href.startsWith('http') ? item.href : `${BASE_URL}${item.href.startsWith('/') ? '' : '/'}${item.href}`;
        } else {
          var slug = item.href.split('/dizi/')[1].replace(/\/$/, '');
          targetPageUrl = `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`;
        }

        var label = item.title.replace(/^Dizi\s+HD\s+(\d+\.\d+\s+)?/i, '').replace(/^Film\s+HD\s+(\d+\.\d+\s+)?/i, '').trim();
        var streams = await resolvePilavyerStream(targetPageUrl, label);
        if (streams && streams.length > 0) {
          return streams;
        }
      }
    }
    return [];
  } catch (err) {
    return [];
  }
}

// ── Catalog & Meta Entegrasyonu ──────────────────────────────
async function getCatalog(args) {
  try {
    const query = (args && args.search) || (args && args.extra && args.extra.search) || (args && args.query) || '';
    const metas = [];
    const seen = new Set();

    if (query) {
      const searchUrl = `${BASE_URL}/ara?q=${encodeURIComponent(query)}`;
      const sRes = await fetch(searchUrl, { headers: HEADERS });
      if (!sRes.ok) return { metas: [] };
      const sHtml = await sRes.text();
      const $ = cheerio.load(sHtml);

      $('a').each((i, el) => {
        const href = $(el).attr('href') || '';
        if (href.includes('/dizi/') && !href.includes('/sezon-')) {
          const slug = href.split('/dizi/')[1].replace(/\/$/, '');
          if (!slug || seen.has(slug)) return;
          seen.add(slug);
          const rawTitle = $(el).text().trim().replace(/\s+/g, ' ');
          const title = rawTitle.replace(/^Dizi\s+HD\s+(\d+\.\d+\s+)?/i, '').replace(/\s+\d{4}$/, '').trim() || slug;
          const img = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
          const poster = img.startsWith('http') ? img : 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';
          metas.push({
            id: `dizimom:show:${slug}`,
            type: 'tv',
            name: title,
            poster,
            background: poster,
            genres: ['Yabancı Dizi', 'DiziMom'],
            description: `${title} - DiziMom Arşivi`
          });
        }
      });

      return { metas };
    }

    const res = await fetch(`${BASE_URL}/diziler`, { headers: HEADERS });
    if (!res.ok) return { metas: [] };
    const html = await res.text();
    const $ = cheerio.load(html);

    $('a').each((i, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('/dizi/') && !href.includes('/sezon-')) {
        const slug = href.split('/dizi/')[1].replace(/\/$/, '');
        if (!slug || seen.has(slug)) return;
        seen.add(slug);
        const rawTitle = $(el).text().trim().replace(/\s+/g, ' ');
        const title = rawTitle.replace(/^Dizi\s+HD\s+(\d+\.\d+\s+)?/i, '').replace(/\s+\d{4}$/, '').trim() || slug;
        const img = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
        const poster = img.startsWith('http') ? img : 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';
        metas.push({
          id: `dizimom:show:${slug}`,
          type: 'tv',
          name: title,
          poster,
          background: poster,
          genres: ['Yabancı Dizi', 'DiziMom'],
          description: `${title} - DiziMom Arşivi`
        });
      }
    });

    return { metas };
  } catch (e) {
    return { metas: [] };
  }
}

async function getMeta(args) {
  try {
    const rawId = (typeof args === 'string') ? args : (args && args.id ? args.id : '');
    if (!rawId) return { meta: null };

    if (rawId.startsWith('dizimom:show:')) {
      const showSlug = rawId.replace('dizimom:show:', '');
      const showUrl = `${BASE_URL}/dizi/${showSlug}`;
      const res = await fetch(showUrl, { headers: HEADERS });
      if (!res.ok) return { meta: null };
      const html = await res.text();
      const $ = cheerio.load(html);

      const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
      const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : showSlug;
      const title = rawTitle.replace(/\s*izle\s*$/i, '').replace(/^Dizi\s+HD\s+(\d+\.\d+\s+)?/i, '').trim();

      const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      const poster = ogImg ? ogImg[1] : 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';

      const desc = $('meta[name="description"]').attr('content') || `${title} - DiziMom Arşivi`;

      const videos = [];
      const seen = new Set();

      $('a').each((i, el) => {
        const href = $(el).attr('href') || '';
        const m = href.match(/\/sezon-(\d+)\/bolum-(\d+)/);
        if (m) {
          const sNum = parseInt(m[1]);
          const eNum = parseInt(m[2]);
          const epKey = `${sNum}:${eNum}`;
          if (seen.has(epKey)) return;
          seen.add(epKey);
          const epText = $(el).text().trim().replace(/\s+/g, ' ') || `${sNum}. Sezon ${eNum}. Bölüm`;
          videos.push({
            id: `dizimom:ep:${showSlug}/sezon-${sNum}/bolum-${eNum}`,
            title: epText,
            season: sNum,
            episode: eNum
          });
        }
      });

      videos.sort((a, b) => (a.season - b.season) || (a.episode - b.episode));

      return {
        meta: {
          id: rawId,
          type: 'tv',
          name: title,
          poster,
          background: poster,
          description: desc,
          genres: ['Yabancı Dizi', 'DiziMom'],
          videos
        }
      };
    }

    if (rawId.startsWith('dizimom:ep:')) {
      const epSlug = rawId.replace('dizimom:ep:', '').replace(/^\//, '');
      const epUrl = `${BASE_URL}/dizi/${epSlug}`;
      const res = await fetch(epUrl, { headers: HEADERS });
      if (!res.ok) return { meta: null };
      const html = await res.text();
      const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'DiziMom Bölüm';
      const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      const poster = ogImg ? ogImg[1] : 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';
      const sMatch = epSlug.match(/sezon-(\d+)/i);
      const eMatch = epSlug.match(/bolum-(\d+)/i);
      const sNum = sMatch ? parseInt(sMatch[1]) : 1;
      const eNum = eMatch ? parseInt(eMatch[1]) : 1;
      return {
        meta: {
          id: rawId,
          type: 'tv',
          name: title,
          poster,
          background: poster,
          description: `${title} - DiziMom`,
          genres: ['Yabancı Dizi', 'DiziMom'],
          videos: [{
            id: rawId,
            title,
            season: sNum,
            episode: eNum
          }]
        }
      };
    }

    return { meta: null };
  } catch (e) {
    return { meta: null };
  }
}

// ── Universal Quality Sorter ──────────────────────────────────────────
if (typeof getStreams === "function") {
    var _origGetStreams = getStreams;
    getStreams = async function() {
        var res = await _origGetStreams.apply(this, arguments);
        return sortStreamsByQuality(res);
    };
}

if (typeof module !== 'undefined') {
  module.exports = wrapAll({ getStreams, getCatalog, getMeta }, cfgReady);
}
if (typeof globalThis !== 'undefined') {
  globalThis.getStreams = getStreams;
  globalThis.getCatalog = getCatalog;
  globalThis.getMeta = getMeta;
}
