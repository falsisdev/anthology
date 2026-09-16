/**
 * Anthology - DiziYou Provider
 * diziyou.one arşivi ve storage.diziyou.one üzerinden
 * doğrudan play.m3u8 HLS akışları ve Türkçe VTT altyazıları sunar.
 */

var cheerio = require('cheerio-without-node-native');

const PROVIDER_NAME = 'DiziYou';
const BASE_URL = 'https://www.diziyou.one'; 
const STORAGE_URL = 'https://storage.diziyou.one';
const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

const WORKING_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': BASE_URL + '/',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
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
        const item = fData.tv_results && fData.tv_results[0];
        if (item) {
          numericId = item.id;
          title = item.name || '';
          origTitle = item.original_name || '';
        }
      }
    } else {
      numericId = cleanId;
    }

    if (numericId && (!title || !origTitle)) {
      const tRes = await fetch(`https://api.themoviedb.org/3/tv/${numericId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
      if (tRes.ok) {
        const tData = await tRes.json();
        title = tData.name || title;
        origTitle = tData.original_name || origTitle;
      }
    }

    return { title, origTitle, numericId };
  } catch (e) {
    return { title: '', origTitle: '', numericId: id };
  }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  try {
    if (mediaType !== 'tv' && mediaType !== 'series') return [];

    const info = await resolveTmdbInfo(tmdbId, mediaType);
    const trTitle = (info.title || '').trim();
    const orgTitle = (info.origTitle || '').trim();
    const displayTitle = trTitle || orgTitle || 'Dizi';

    const searchCandidates = [trTitle];
    if (orgTitle && orgTitle !== trTitle) searchCandidates.push(orgTitle);

    let foundLink = null;
    let matchedQuery = displayTitle;

    for (const q of searchCandidates) {
      if (!q) continue;
      const searchUrl = `${BASE_URL}/?s=` + encodeURIComponent(q);
      const res = await fetch(searchUrl, { headers: WORKING_HEADERS });
      if (!res.ok) continue;
      const html = await res.text();
      const $ = cheerio.load(html);

      const searchTitleLower = q.toLowerCase().trim();
      const orgTitleLower = (orgTitle || '').toLowerCase().trim();

      const results = $('.list-series a, .post-title a, #categorytitle a, .entry-title a');

      results.each(function() {
        const currentTitle = $(this).text().toLowerCase().replace('izle', '').trim();
        const currentHref = $(this).attr('href');
        if (!currentHref || currentHref.includes('/kategori/')) return;

        const isExact = (currentTitle === searchTitleLower || currentTitle === orgTitleLower);
        const isBrackets = (currentTitle.includes(searchTitleLower + ' (') || currentTitle.includes(orgTitleLower + ' ('));
        const isDiziSuffix = (currentTitle.includes(searchTitleLower + ' dizi') || currentTitle.includes(orgTitleLower + ' dizi'));

        if (isExact || isBrackets || isDiziSuffix) {
          foundLink = currentHref;
          matchedQuery = q;
          return false;
        }
      });

      if (foundLink) break;
      if (!foundLink && results.length > 0 && results.length < 5) {
        foundLink = results.first().attr('href');
        matchedQuery = q;
        break;
      }
    }

    if (!foundLink) return [];

    const slug = foundLink.split('/').filter(Boolean).pop();
    const epUrl = `${BASE_URL}/${slug}-${seasonNum}-sezon-${episodeNum}-bolum/`;

    const epRes = await fetch(epUrl, { headers: WORKING_HEADERS });
    if (!epRes.ok) return [];
    const epHtml = await epRes.text();

    const $ = cheerio.load(epHtml);
    const playerSrc = $('#diziyouPlayer').attr('src');
    if (!playerSrc) return [];

    const itemId = playerSrc.split('/').pop().replace('.html', '').split('?')[0];
    const streams = [];

    const hasSub = epHtml.indexOf('turkceAltyazili') !== -1;
    const hasDub = epHtml.indexOf('turkceDublaj') !== -1;

    const dyHeaders = { 'Referer': BASE_URL + '/' };

    if (hasSub) {
      streams.push({
        name: displayTitle,
        title: '⌜ DiziYou ⌟ | 🌐 Türkçe Altyazılı',
        url: `${STORAGE_URL}/episodes/${itemId}/play.m3u8`,
        quality: '1080p',
        type: 'hls',
        provider: 'diziyou',
        headers: dyHeaders,
        behaviorHints: {
          notWebReady: true,
          proxyHeaders: { request: dyHeaders }
        },
        subtitles: [{ label: 'Turkish', url: `${STORAGE_URL}/subtitles/${itemId}/tr.vtt` }]
      });
    }

    if (hasDub) {
      streams.push({
        name: displayTitle,
        title: '⌜ DiziYou ⌟ | 🇹🇷 Türkçe Dublaj',
        url: `${STORAGE_URL}/episodes/${itemId}_tr/play.m3u8`,
        quality: '1080p',
        type: 'hls',
        provider: 'diziyou',
        headers: dyHeaders,
        behaviorHints: {
          notWebReady: true,
          proxyHeaders: { request: dyHeaders }
        },
        subtitles: [{ label: 'Turkish', url: `${STORAGE_URL}/subtitles/${itemId}/tr.vtt` }]
      });
    }

    if (streams.length === 0) {
      streams.push({
        name: displayTitle,
        title: '⌜ DiziYou ⌟ | 🌐 Video',
        url: `${STORAGE_URL}/episodes/${itemId}/play.m3u8`,
        quality: '1080p',
        type: 'hls',
        provider: 'diziyou',
        headers: dyHeaders,
        behaviorHints: {
          notWebReady: true,
          proxyHeaders: { request: dyHeaders }
        }
      });
    }

    return streams;
  } catch (err) {
    return [];
  }
}

// ── Universal Quality Sorter ──────────────────────────────────────────
function sortStreamsByQuality(streams) {
    if (!Array.isArray(streams) || streams.length <= 1) return streams || [];
    function getQualityScore(s) {
        if (!s) return 0;
        var score = 0;
        if (s.quality) {
            var q = String(s.quality).toLowerCase().trim();
            if (/\b(4k|2160p?|uhd)\b/.test(q)) score = 2160;
            else if (/\b(2k|1440p?|qhd)\b/.test(q)) score = 1440;
            else if (/\b(1080p?|fhd|full[\s-]?hd)\b/.test(q)) score = 1080;
            else if (/\b(720p?|hd)\b/.test(q)) score = 720;
            else if (/\b(540p?)\b/.test(q)) score = 540;
            else if (/\b(480p?|sd)\b/.test(q)) score = 480;
            else if (/\b(360p?)\b/.test(q)) score = 360;
            else if (/\b(240p?)\b/.test(q)) score = 240;
        }
        if (!score) {
            var text = [s.title, s.name, s.resolution].filter(Boolean).join(" ").toLowerCase();
            if (/\b(4k|2160p|uhd)\b/.test(text)) score = 2160;
            else if (/\b(2k|1440p|qhd)\b/.test(text)) score = 1440;
            else if (/\b(1080p|fhd|full[\s-]?hd)\b/.test(text)) score = 1080;
            else if (/\b(720p)\b/.test(text)) score = 720;
            else if (/\b(540p)\b/.test(text)) score = 540;
            else if (/\b(480p)\b/.test(text)) score = 480;
            else if (/\b(360p)\b/.test(text)) score = 360;
            else if (/\b(240p)\b/.test(text)) score = 240;
            else if (/\b(hd)\b/.test(text) && !/\b(full[\s-]?hd)\b/.test(text)) score = 720;
            else if (/\b(sd)\b/.test(text)) score = 480;
        }
        if (!score && s.url) {
            var u = String(s.url).toLowerCase();
            if (/[\/_.-](2160p?|4k)[\/_.-]/.test(u)) score = 2160;
            else if (/[\/_.-](1440p?|2k)[\/_.-]/.test(u)) score = 1440;
            else if (/[\/_.-](1080p?|fhd)[\/_.-]/.test(u)) score = 1080;
            else if (/[\/_.-](720p?|hd)[\/_.-]/.test(u)) score = 720;
            else if (/[\/_.-](480p?|sd)[\/_.-]/.test(u)) score = 480;
            else if (/[\/_.-](360p?)[\/_.-]/.test(u)) score = 360;
        }
        var isDirectMp4 = s.format === "mp4" || s.type === "mp4" || (!s.isHls && s.url && (s.url.endsWith(".mp4") || s.url.includes(".mp4?")));
        if (isDirectMp4 && score > 0) score += 1;
        return score;
    }
    return streams.slice().sort(function(a, b) {
        return getQualityScore(b) - getQualityScore(a);
    });
}

if (typeof getStreams === "function") {
    var _origGetStreams = getStreams;
    getStreams = async function() {
        var res = await _origGetStreams.apply(this, arguments);
        return sortStreamsByQuality(res);
    };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams: getStreams };
}
if (typeof globalThis !== 'undefined') {
  globalThis.getStreams = getStreams;
}
