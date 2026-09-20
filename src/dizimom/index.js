const { sortStreamsByQuality } = require("../shared/quality.js");
const { loadConfig, val, wrapAll } = require("../shared/config.js");

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v;
            v = val('urls.series.dizimom.base'); if (v) BASE_URL = String(v).replace(/\/+$/, '');
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

var BASE_URL = 'https://www.dizimom.diy';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': BASE_URL + '/'
};

async function resolveTmdbInfo(id, mediaType) {
  try {
    let cleanId = String(id || '').trim();
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

async function extractFromHDPlayer(embedUrl, referer) {
  try {
    const u = new URL(embedUrl);
    let dataId = u.searchParams.get('data') || '';
    if (!dataId) {
      const parts = u.pathname.replace(/\/$/, '').split('/');
      dataId = parts.pop() || '';
    }
    if (!dataId) return null;

    const host = u.host.toLowerCase();
    const apiUrl = `https://${host}/player/index.php?data=${dataId}&do=getVideo`;
    const postData = new URLSearchParams({
      hash: dataId,
      r: referer || `https://${host}/`
    });

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': embedUrl,
        'User-Agent': HEADERS['User-Agent']
      },
      body: postData.toString()
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.securedLink || data.videoSource || (data.videoSources && data.videoSources[0] && data.videoSources[0].file) || null;
  } catch (e) {
    return null;
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
    if (!mediaType) mediaType = 'tv';

    if (typeof tmdbId === 'string' && tmdbId.startsWith('dizimom:show:')) {
      const showMeta = await getMeta(tmdbId);
      if (showMeta && showMeta.meta && Array.isArray(showMeta.meta.videos) && showMeta.meta.videos.length > 0) {
        return await getStreams(showMeta.meta.videos[0].id);
      }
    }

    if (typeof tmdbId === 'string' && tmdbId.startsWith('dizimom:ep:')) {
      const slug = tmdbId.replace('dizimom:ep:', '');
      const epUrl = `${BASE_URL}/${slug}/`;
      const epRes = await fetch(epUrl, { headers: HEADERS });
      if (!epRes.ok) return [];
      const epHtml = await epRes.text();
      const $ep = cheerio.load(epHtml);

      const iframes = [];
      $ep('div.video p iframe, iframe').each((i, el) => {
        const src = $ep(el).attr('src') || $ep(el).attr('data-src');
        if (src && !src.includes('facebook') && !src.includes('disqus')) {
          iframes.push(src.startsWith('//') ? 'https:' + src : src);
        }
      });

      const streams = [];
      for (const iframe of iframes) {
        if (iframe.includes('hdplayersystem') || iframe.includes('hdstreamable') || iframe.includes('filmizle.in')) {
          const directM3u8 = await extractFromHDPlayer(iframe, epUrl);
          if (directM3u8) {
            streams.push({
              name: '⌜ DiziMom ⌟',
              title: '⌜ DiziMom ⌟ | HDPlayer (1080p HLS)',
              url: directM3u8,
              quality: '1080p',
              type: 'hls',
              provider: 'dizimom',
              headers: {
                'Referer': iframe,
                'User-Agent': HEADERS['User-Agent']
              }
            });
          }
        }
      }
      return streams;
    }

    const season = parseInt(seasonNum) || 1;
    const episode = parseInt(episodeNum) || 1;

    const info = await resolveTmdbInfo(tmdbId, mediaType);
    const queries = [info.title, info.origTitle].filter(Boolean);
    if (queries.length === 0) return [];

    let showPages = [];

    for (const q of queries) {
      const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(q)}`;
      const sRes = await fetch(searchUrl, { headers: HEADERS });
      if (!sRes.ok) continue;
      const sHtml = await sRes.text();
      const $ = cheerio.load(sHtml);

      const normQ = normalizeTitle(q);
      $('div.single-item').each((i, el) => {
        const itemTitle = $(el).find('div.categorytitle a').text().replace(/ izle.*$/i, '').trim();
        const href = $(el).find('div.cat-img a').attr('href');
        if (!href) return;

        const normItem = normalizeTitle(itemTitle);
        if (normItem.includes(normQ) || normQ.includes(normItem)) {
          showPages.push({
            title: itemTitle,
            url: href,
            isDubbed: itemTitle.toLowerCase().includes('dublaj')
          });
        }
      });

      if (showPages.length > 0) break;
    }

    if (showPages.length === 0) return [];

    const streams = [];

    for (const show of showPages.slice(0, 2)) {
      const showRes = await fetch(show.url, { headers: HEADERS });
      if (!showRes.ok) continue;
      const showHtml = await showRes.text();
      const $ = cheerio.load(showHtml);

      let episodeUrl = '';
      $('a').each((i, el) => {
        const h = $(el).attr('href') || '';
        const t = $(el).text().trim();
        // Eşleşme: "1.Sezon 1.Bölüm" veya URL içinde "-1-sezon-1-bolum-"
        const sRegex = new RegExp(`(?:^|\\s|\\.)${season}\\.?\\s*(?:Sezon|sezon)`, 'i');
        const eRegex = new RegExp(`(?:^|\\s|\\.)${episode}\\.?\\s*(?:Bölüm|bolum|bölüm)`, 'i');
        const patternUrl = `-${season}-sezon-${episode}-bolum`;
        if (sRegex.test(t) && eRegex.test(t)) {
          episodeUrl = h;
          return false;
        }
        if (h.includes(patternUrl)) {
          episodeUrl = h;
          return false;
        }
      });

      if (!episodeUrl) continue;

      const epRes = await fetch(episodeUrl, { headers: HEADERS });
      if (!epRes.ok) continue;
      const epHtml = await epRes.text();
      const $ep = cheerio.load(epHtml);

      const iframes = [];
      $ep('div.video p iframe, iframe').each((i, el) => {
        const src = $ep(el).attr('src') || $ep(el).attr('data-src');
        if (src && !src.includes('facebook') && !src.includes('disqus')) {
          iframes.push(src.startsWith('//') ? 'https:' + src : src);
        }
      });

      for (const iframe of iframes) {
        if (iframe.includes('hdplayersystem') || iframe.includes('hdstreamable') || iframe.includes('filmizle.in')) {
          const directM3u8 = await extractFromHDPlayer(iframe, episodeUrl);
          if (directM3u8) {
            const langLabel = show.isDubbed ? '🇹🇷 TR Dublaj' : '🌐 TR Altyazı';
            streams.push({
              name: `${show.title} S${season}E${episode}`,
              title: `⌜ DiziMom ⌟ | HDPlayer | ${langLabel}`,
              url: directM3u8,
              quality: '1080p',
              type: 'hls',
              provider: 'dizimom',
              headers: {
                'Referer': iframe,
                'User-Agent': HEADERS['User-Agent']
              },
              behaviorHints: {
                notWebReady: true,
                proxyHeaders: {
                  request: {
                    'Referer': iframe,
                    'User-Agent': HEADERS['User-Agent']
                  }
                }
              }
            });
          }
        }
      }
    }

    return streams;
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
      const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
      const sRes = await fetch(searchUrl, { headers: HEADERS });
      if (!sRes.ok) return { metas: [] };
      const sHtml = await sRes.text();
      const $ = cheerio.load(sHtml);

      $('div.categorytitle').each((i, el) => {
        const a = $(el).find('a');
        const href = a.attr('href') || '';
        const title = a.text().replace(/\s*izle\s*$/i, '').trim();
        const slug = href.replace(`${BASE_URL}/diziler/`, '').replace(`${BASE_URL}/`, '').replace(/^\//, '').replace(/\/$/, '');
        if (!slug || seen.has(slug) || title.length < 2) return;
        seen.add(slug);

        const parent = $(el).closest('.cat-container').parent();
        const img = parent.find('div.cat-img img[data-src]').attr('data-src') || parent.find('div.cat-img noscript img').attr('src') || parent.find('div.cat-img img').attr('src') || '';
        const poster = img.startsWith('http') ? img : 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';

        metas.push({
          id: `dizimom:show:${slug}`,
          type: 'tv',
          name: title,
          poster: poster,
          background: poster,
          genres: ['Yabancı Dizi', 'DiziMom'],
          description: `${title} - DiziMom Arşivi`
        });
      });

      return { metas };
    }

    // Default: Popular yabancı diziler
    const targetUrls = [
      `${BASE_URL}/yabanci-dizi-izle/`,
      `${BASE_URL}/tum-diziler-hd1/`
    ];

    for (const url of targetUrls) {
      try {
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) continue;
        const html = await res.text();
        const $ = cheerio.load(html);

        $('div.categorytitle').each((i, el) => {
          const a = $(el).find('a');
          const href = a.attr('href') || '';
          const title = a.text().replace(/\s*izle\s*$/i, '').trim();
          const slug = href.replace(`${BASE_URL}/diziler/`, '').replace(`${BASE_URL}/`, '').replace(/^\//, '').replace(/\/$/, '');
          if (!slug || seen.has(slug) || title.length < 2) return;
          seen.add(slug);

          const parent = $(el).closest('.cat-container').parent();
          const img = parent.find('div.cat-img img[data-src]').attr('data-src') || parent.find('div.cat-img noscript img').attr('src') || parent.find('div.cat-img img').attr('src') || '';
          const desc = parent.find('div.cat_ozet').text().trim() || `${title} - DiziMom`;
          const poster = img.startsWith('http') ? img : 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';

          metas.push({
            id: `dizimom:show:${slug}`,
            type: 'tv',
            name: title,
            poster: poster,
            background: poster,
            genres: ['Yabancı Dizi', 'DiziMom'],
            description: desc
          });
        });
      } catch (err) {}
    }

    return { metas };
  } catch (e) {
    return { metas: [] };
  }
}

async function getMeta(args) {
  try {
    const rawId = (typeof args === 'string') ? args : (args && args.id ? args.id : '');
    if (!rawId) return { meta: null };

    if (rawId.startsWith('dizimom:ep:')) {
      const epSlug = rawId.replace('dizimom:ep:', '');
      const epUrl = `${BASE_URL}/${epSlug}/`;
      const res = await fetch(epUrl, { headers: HEADERS });
      if (!res.ok) return { meta: null };
      const html = await res.text();

      const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
      const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'DiziMom Bölüm';
      const title = rawTitle.replace(/\s*izle\s*$/i, '').trim();

      const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      const poster = ogImg ? ogImg[1] : 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';

      const epNumMatch = title.match(/(\d+)\s*\.?\s*bölüm/i);
      const seasonNumMatch = title.match(/(\d+)\s*\.?\s*sezon/i);
      const epNum = epNumMatch ? parseInt(epNumMatch[1]) : 1;
      const seasonNum = seasonNumMatch ? parseInt(seasonNumMatch[1]) : 1;

      return {
        meta: {
          id: rawId,
          type: 'tv',
          name: title,
          poster: poster,
          background: poster,
          description: `${title} - DiziMom`,
          genres: ['Yabancı Dizi', 'DiziMom'],
          videos: [{
            id: rawId,
            title,
            season: seasonNum,
            episode: epNum
          }]
        }
      };
    }

    if (rawId.startsWith('dizimom:show:')) {
      const showSlug = rawId.replace('dizimom:show:', '');
      const showUrl = `${BASE_URL}/diziler/${showSlug}/`;
      const res = await fetch(showUrl, { headers: HEADERS });
      if (!res.ok) return { meta: null };
      const html = await res.text();
      const $ = cheerio.load(html);

      const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
      const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'DiziMom';
      const title = rawTitle.replace(/\s*izle\s*$/i, '').trim();

      const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      const poster = ogImg ? ogImg[1] : 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';

      const desc = $('div.cat_ozet').text().trim() || $('meta[name="description"]').attr('content') || `${title} - DiziMom Arşivi`;

      const videos = [];
      const seen = new Set();

      $('a').each((i, el) => {
        const href = $(el).attr('href') || '';
        const epText = $(el).text().trim();

        if (href.includes('-sezon-') && href.includes('-bolum-')) {
          const epSlug = href.replace(BASE_URL, '').replace(/^\//, '').replace(/\/$/, '');
          if (!epSlug || seen.has(epSlug)) return;
          seen.add(epSlug);

          const sMatch = href.match(/-(\d+)-sezon-/i) || epText.match(/(\d+)\s*\.?\s*sezon/i);
          const eMatch = href.match(/-(\d+)-bolum-/i) || epText.match(/(\d+)\s*\.?\s*bölüm/i);
          const sNum = sMatch ? parseInt(sMatch[1]) : 1;
          const eNum = eMatch ? parseInt(eMatch[1]) : 1;

          videos.push({
            id: `dizimom:ep:${epSlug}`,
            title: epText || `${sNum}. Sezon ${eNum}. Bölüm`,
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
          poster: poster,
          background: poster,
          description: desc,
          genres: ['Yabancı Dizi', 'DiziMom'],
          videos: videos
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
