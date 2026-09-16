/**
 * Anthology - JetFilmizle Provider
 * jetfilmizle.now üzerinden videopark (Google Drive Cloudflare Worker MP4)
 * ve playerx.info (Çoklu Dil HLS M3U8) akışlarını doğrudan çeker.
 */

var cheerio = require('cheerio-without-node-native');

const PROVIDER_NAME = 'JetFilmizle';
const BASE_URL = 'https://jetfilmizle.now';
const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

const WORKING_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

async function searchOnSite(query, year) {
  if (!query || query.length < 2) return null;
  const cleanQuery = query.toLowerCase().trim();
  const searchUrl = `${BASE_URL}/arama?q=` + encodeURIComponent(cleanQuery);

  try {
    const res = await fetch(searchUrl, { headers: WORKING_HEADERS });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];

    const stopWords = new Set(['the', 'a', 'an', 've', 'ile', 'der', 'die', 'das', 'le', 'la']);
    const significantWords = cleanQuery.split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));

    $('a').each(function() {
      const url = $(this).attr('href') || '';
      if (!url.includes('/film/')) return;
      const rawTitle = $(this).text().trim().replace(/\s+/g, ' ');
      const titleLower = rawTitle.toLowerCase();
      if (titleLower.length < 2) return;

      let score = 0;
      let matchedWordCount = 0;
      significantWords.forEach(w => {
        if (titleLower.includes(w) || url.includes(w)) {
          score += 8;
          matchedWordCount++;
        }
      });

      if (matchedWordCount === significantWords.length && significantWords.length > 0) {
        score += 15;
      }

      if (year && (titleLower.includes(year) || url.includes(year))) score += 10;
      if (url.includes(cleanQuery.replace(/\s+/g, '-'))) score += 10;

      // Penalize sequel numbers if we didn't search them
      const hasSequel = /[\s\-_]([2-9]|ii|iii|iv|v)($|[\s\-_])/i.test(titleLower) || /[\s\-_]([2-9]|ii|iii|iv|v)($|[\s\-_])/i.test(url);
      if (hasSequel && !/[\s\-_]([2-9]|ii|iii|iv|v)/i.test(cleanQuery)) {
        score -= 20;
      }

      if (score > 5) {
        results.push({ url: url, siteTitle: rawTitle, score: score });
      }
    });

    if (results.length > 0) {
      results.sort((a, b) => b.score - a.score);
      return results[0];
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function extractVideoparkStreams(embedUrl, displayTitle, langLabel) {
  try {
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': WORKING_HEADERS['User-Agent'],
        'Referer': BASE_URL + '/'
      }
    });
    if (!res.ok) return [];
    const html = await res.text();

    const workerMatch = html.match(/const\s+WORKER_BASE\s*=\s*["']([^"']+)["']/);
    const videoIdMatch = html.match(/const\s+VIDEO_ID\s*=\s*(\d+)/);
    if (!workerMatch || !videoIdMatch) return [];

    const workerBase = workerMatch[1].replace(/\\\//g, '/').replace(/\/$/, '');
    const videoId = videoIdMatch[1];

    let info = null;
    try {
      const infoRes = await fetch(`${workerBase}/v/${videoId}/info`, {
        headers: { 'User-Agent': WORKING_HEADERS['User-Agent'] }
      });
      if (infoRes.ok) info = await infoRes.json();
    } catch (_) {}

    const streams = [];
    if (info && Array.isArray(info.qualities) && info.qualities.length > 0) {
      for (const q of info.qualities) {
        streams.push({
          name: displayTitle,
          title: `⌜ JetFilmizle ⌟ | ${langLabel} (${q}p Direct MP4)`,
          url: `${workerBase}/v/${videoId}?q=${q}`,
          quality: `${q}p`,
          type: 'mp4',
          provider: 'jetfilmizle',
          headers: {
            'User-Agent': WORKING_HEADERS['User-Agent']
          }
        });
      }
    } else {
      streams.push({
        name: displayTitle,
        title: `⌜ JetFilmizle ⌟ | ${langLabel} (Direct MP4)`,
        url: `${workerBase}/v/${videoId}`,
        quality: '1080p',
        type: 'mp4',
        provider: 'jetfilmizle',
        headers: {
          'User-Agent': WORKING_HEADERS['User-Agent']
        }
      });
    }

    return streams;
  } catch (e) {
    return [];
  }
}

async function extractPlayerxStreams(embedUrl, displayTitle, langLabel) {
  try {
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': WORKING_HEADERS['User-Agent'],
        'Referer': BASE_URL + '/'
      }
    });
    if (!res.ok) return [];
    const html = await res.text();

    const fileMatch = html.match(/file:\s*["'](watch\/[^"']+)["']/);
    if (!fileMatch) return [];

    const path = fileMatch[1];
    const streamUrl = `https://playerx.info/${path}`;

    return [{
      name: displayTitle,
      title: `⌜ JetFilmizle ⌟ | ${langLabel} (Çoklu Dil HLS)`,
      url: streamUrl,
      quality: '1080p',
      type: 'hls',
      provider: 'jetfilmizle',
      headers: {
        'User-Agent': WORKING_HEADERS['User-Agent'],
        'Referer': embedUrl
      }
    }];
  } catch (e) {
    return [];
  }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  try {
    if (mediaType === 'tv' || mediaType === 'series') return [];

    const info = await resolveTmdbInfo(tmdbId, mediaType);
    const trTitle = (info.title || '').trim();
    const orgTitle = (info.origTitle || '').trim();
    const displayTitle = trTitle || orgTitle || 'Film';
    const releaseYear = info.year;

    let match = null;
    const candidates = [];
    if (orgTitle) {
      candidates.push(orgTitle);
      const withoutThe = orgTitle.replace(/^the\s+/i, '').trim();
      if (withoutThe && withoutThe !== orgTitle) candidates.push(withoutThe);
    }
    if (trTitle && trTitle !== orgTitle) {
      candidates.push(trTitle);
      const withoutTheTr = trTitle.replace(/^the\s+/i, '').trim();
      if (withoutTheTr && withoutTheTr !== trTitle) candidates.push(withoutTheTr);
    }

    for (const cand of candidates) {
      match = await searchOnSite(cand, releaseYear);
      if (match && match.score >= 10) break;
    }

    if (!match || !match.url) return [];

    const filmRes = await fetch(match.url, { headers: WORKING_HEADERS });
    if (!filmRes.ok) return [];
    const filmHtml = await filmRes.text();
    const $film = cheerio.load(filmHtml);

    const filmId = $film('input[name=film_id]').val();
    if (!filmId) return [];

    const allStreams = [];
    const playerTypes = ['dublaj', 'altyazili'];

    for (const playerType of playerTypes) {
      const langLabel = (playerType === 'dublaj') ? '🇹🇷 TR Dublaj' : '🌐 TR Altyazı';

      for (let idx = 0; idx < 3; idx++) {
        try {
          const params = new URLSearchParams();
          params.append('film_id', filmId);
          params.append('source_index', idx.toString());
          params.append('player_type', playerType);

          const postRes = await fetch(`${BASE_URL}/jetplayer`, {
            method: 'POST',
            headers: {
              'User-Agent': WORKING_HEADERS['User-Agent'],
              'Referer': match.url,
              'X-Requested-With': 'XMLHttpRequest',
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
          });

          if (!postRes.ok) continue;
          const postText = await postRes.text();
          const iframeMatch = postText.match(/<iframe[^>]+src=[\x27"]([^\x27"]+)[\x27"]/i);
          if (!iframeMatch) continue;

          let iframeSrc = iframeMatch[1];
          if (iframeSrc.startsWith('//')) iframeSrc = 'https:' + iframeSrc;

          if (iframeSrc.includes('videopark.top')) {
            const vpStreams = await extractVideoparkStreams(iframeSrc, displayTitle, langLabel);
            allStreams.push(...vpStreams);
          } else if (iframeSrc.includes('playerx.info')) {
            const pxStreams = await extractPlayerxStreams(iframeSrc, displayTitle, langLabel);
            allStreams.push(...pxStreams);
          }
        } catch (_) {}
      }
    }

    // Deduplicate by URL
    const seen = new Set();
    return allStreams.filter(s => {
      if (seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });
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
