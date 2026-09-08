/**
 * Anthology - DiziPal Provider
 * DiziPalOriginal port: ajax-search, data-cfg decode, Imagestoo API ve
 * doğrudan master.m3u8 HLS akışları sunar.
 */

var BASE_URL = 'https://dizipal2127.com';
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
    let year = '';

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
          year = (item.first_air_date || item.release_date || '').slice(0, 4);
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
        year = (tData.first_air_date || tData.release_date || '').slice(0, 4);
      }
    }

    return { title, origTitle, year, numericId };
  } catch (e) {
    return { title: '', origTitle: '', year: '', numericId: id };
  }
}

function normalizeTitle(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function extractFromImagestoo(embedUrl) {
  try {
    const videoId = embedUrl.trim().replace(/\/$/, '').split('/').pop();
    const apiUrl = `https://imagestoo.com/player/index.php?data=${videoId}&do=getVideo`;
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'User-Agent': HEADERS['User-Agent'],
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': embedUrl,
        'Accept': '*/*'
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.securedLink || data.videoSource || null;
  } catch (e) {
    return null;
  }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  try {
    const isTv = (mediaType === 'tv' || mediaType === 'series');
    const season = parseInt(seasonNum) || 1;
    const episode = parseInt(episodeNum) || 1;

    const info = await resolveTmdbInfo(tmdbId, mediaType);
    const queries = [info.title, info.origTitle].filter(Boolean);
    if (queries.length === 0) return [];

    let matchedItem = null;

    for (const q of queries) {
      const searchUrl = `${BASE_URL}/ajax-search?q=${encodeURIComponent(q)}`;
      const sRes = await fetch(searchUrl, {
        headers: Object.assign({}, HEADERS, {
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest'
        })
      });
      if (!sRes.ok) continue;
      const sData = await sRes.json();
      if (!sData.results || sData.results.length === 0) continue;

      const normQ = normalizeTitle(q);

      // 1. Aşama: Tam başlık ve yıl eşleşmesi
      for (const item of sData.results) {
        const itemType = (item.type || '').toLowerCase();
        if (isTv && !itemType.includes('dizi')) continue;
        if (!isTv && itemType.includes('dizi')) continue;

        const normTitle = normalizeTitle(item.title);
        if (normTitle === normQ) {
          if (!info.year || String(item.year) === String(info.year)) {
            matchedItem = item;
            break;
          }
        }
      }

      // 2. Aşama: Tam başlık eşleşmesi
      if (!matchedItem) {
        for (const item of sData.results) {
          const itemType = (item.type || '').toLowerCase();
          if (isTv && !itemType.includes('dizi')) continue;
          if (!isTv && itemType.includes('dizi')) continue;

          const normTitle = normalizeTitle(item.title);
          if (normTitle === normQ) {
            matchedItem = item;
            break;
          }
        }
      }

      // 3. Aşama: Başlık içerme kontrolü
      if (!matchedItem) {
        for (const item of sData.results) {
          const itemType = (item.type || '').toLowerCase();
          if (isTv && !itemType.includes('dizi')) continue;
          if (!isTv && itemType.includes('dizi')) continue;

          const normTitle = normalizeTitle(item.title);
          if (normTitle.includes(normQ) || normQ.includes(normTitle)) {
            matchedItem = item;
            break;
          }
        }
      }

      if (matchedItem) break;
    }

    if (!matchedItem || !matchedItem.url) return [];

    let targetUrl = matchedItem.url;
    if (isTv) {
      const slug = matchedItem.url.replace(/\/$/, '').split('/').pop();
      targetUrl = `${BASE_URL}/bolum/${slug}-${season}-sezon-${episode}-bolum`;
    }

    let pageRes = await fetch(targetUrl, { headers: HEADERS });
    if (!pageRes.ok && isTv) {
      const showRes = await fetch(matchedItem.url, { headers: HEADERS });
      if (showRes.ok) {
        const showHtml = await showRes.text();
        const epRegex = new RegExp(`href=["']([^"']*${season}-sezon-${episode}-bolum[^"']*)["']`, 'i');
        const epMatch = showHtml.match(epRegex);
        if (epMatch) {
          targetUrl = epMatch[1].startsWith('http') ? epMatch[1] : `${BASE_URL}${epMatch[1]}`;
          pageRes = await fetch(targetUrl, { headers: HEADERS });
        }
      }
    }

    if (!pageRes.ok) return [];
    const html = await pageRes.text();

    const mCfg = html.match(/id=["']videoContainer["'][^>]*data-cfg=["']([^"']+)["']/i)
             || html.match(/data-cfg=["']([^"']+)["']/i);
    if (!mCfg) return [];

    const padded = mCfg[1] + '='.repeat((4 - mCfg[1].length % 4) % 4);
    let decodedJson;
    try {
      decodedJson = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    } catch (e) {
      return [];
    }

    let embedUrl = decodedJson.v;
    if (!embedUrl) return [];
    embedUrl = embedUrl.replace(/\\\//g, '/');

    const streams = [];
    const displayTitle = isTv ? `${matchedItem.title} S${season}E${episode}` : matchedItem.title;

    if (embedUrl.includes('imagestoo')) {
      const securedLink = await extractFromImagestoo(embedUrl);
      if (securedLink) {
        streams.push({
          name: displayTitle,
          title: `⌜ DiziPal ⌟ | Imagestoo [1080p]`,
          url: securedLink,
          quality: '1080p',
          type: 'hls',
          provider: 'dizipal',
          headers: {
            'Referer': embedUrl,
            'User-Agent': HEADERS['User-Agent']
          }
        });
      }
    } else {
      // Embed fetch with root referer
      try {
        const embRes = await fetch(embedUrl, {
          headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': BASE_URL + '/' }
        });
        if (embRes.ok) {
          const embHtml = await embRes.text();
          const mFile = embHtml.match(/file:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i)
                     || embHtml.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/i);
          if (mFile) {
            const streamUrl = mFile[1] || mFile[0];
            streams.push({
              name: displayTitle,
              title: `⌜ DiziPal ⌟ | HLS [1080p]`,
              url: streamUrl,
              quality: '1080p',
              type: 'hls',
              provider: 'dizipal',
              headers: {
                'Referer': embedUrl,
                'User-Agent': HEADERS['User-Agent']
              }
            });
          }
        }
      } catch (e) {}
    }

    return streams;
  } catch (err) {
    return [];
  }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
