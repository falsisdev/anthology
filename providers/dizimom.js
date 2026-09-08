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
  // DiziMom sadece dizileri destekler
  if (mediaType === 'movie') return [];

  try {
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
        const patternText = `${season}.Sezon ${episode}.Bölüm`;
        const patternUrl = `-${season}-sezon-${episode}-bolum-`;
        if (t.includes(patternText) || h.includes(patternUrl)) {
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

if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
