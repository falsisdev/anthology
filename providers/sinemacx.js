/**
 * Anthology - SinemaCX Provider
 * Sinema.gg arşivi ve player.filmizle.in API üzerinden
 * doğrudan master.m3u8 HLS akışları sunar.
 */

var cheerio = require('cheerio-without-node-native');

const PROVIDER_NAME = 'SinemaCX';
var CONFIG = (typeof require !== 'undefined' ? (function(){ try { return require('./config'); } catch(e) { return require('./urls'); } })() : null) || (typeof globalThis !== 'undefined' ? (globalThis.CONFIG || globalThis.URLS) : null) || {};
var URLS = CONFIG.urls || CONFIG;
const BASE_URL = (URLS.sinemacx && URLS.sinemacx.base) || 'https://www.sinema.gg';
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
  const searchUrl = `${BASE_URL}/?s=` + encodeURIComponent(cleanQuery);

  try {
    const res = await fetch(searchUrl, { headers: WORKING_HEADERS });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];

    const stopWords = new Set(['the', 'a', 'an', 've', 'ile', 'der', 'die', 'das', 'le', 'la']);
    const significantWords = cleanQuery.split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));

    $('a.baslik, a.resim').each(function() {
      const url = $(this).attr('href') || '';
      const rawTitle = $(this).attr('title') || $(this).find('span').first().text().trim() || $(this).text().trim();
      const titleLower = rawTitle.toLowerCase();
      if (!url.includes('sinema.gg') || url.includes('/category/') || url.includes('/search/') || url.includes('/tag/') || rawTitle.length < 2) return;

      let score = 0;
      let matchedWordCount = 0;
      significantWords.forEach(w => {
        if (titleLower.includes(w) || url.includes(w)) {
          score += 10;
          matchedWordCount++;
        }
      });

      if (matchedWordCount === significantWords.length && significantWords.length > 0) {
        score += 15;
      }

      if (year && (titleLower.includes(year) || url.includes(year))) score += 10;
      if (url.includes(cleanQuery.replace(/\s+/g, '-'))) score += 8;

      // Penalize sequels/extra words if we didn't search for them
      const extraWords = titleLower.split(/\s+/).filter(w => !stopWords.has(w) && !significantWords.includes(w));
      // Sequel numbers like 2, 3, 4 when we didn't search them
      const hasSequel = /[\s\-_]([2-9]|ii|iii|iv|v)($|[\s\-_])/i.test(titleLower) || /[\s\-_]([2-9]|ii|iii|iv|v)($|[\s\-_])/i.test(url);
      if (hasSequel && !/[\s\-_]([2-9]|ii|iii|iv|v)/i.test(cleanQuery)) {
        score -= 25;
      }
      score -= extraWords.length * 2;

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

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  try {
    if (mediaType === 'tv' || mediaType === 'series') return [];

    const info = await resolveTmdbInfo(tmdbId, mediaType);
    const trTitle = (info.title || '').trim();
    const orgTitle = (info.origTitle || '').trim();
    const displayTitle = trTitle || orgTitle || 'Film';
    const releaseYear = info.year;

    let result = null;
    const searchCandidates = [];
    if (orgTitle) {
      searchCandidates.push(orgTitle);
      const withoutThe = orgTitle.replace(/^the\s+/i, '').trim();
      if (withoutThe && withoutThe !== orgTitle) searchCandidates.push(withoutThe);
    }
    if (trTitle && trTitle !== orgTitle) {
      searchCandidates.push(trTitle);
      const withoutTheTr = trTitle.replace(/^the\s+/i, '').trim();
      if (withoutTheTr && withoutTheTr !== trTitle) searchCandidates.push(withoutTheTr);
    }

    for (const cand of searchCandidates) {
      result = await searchOnSite(cand, releaseYear);
      if (result && result.score >= 10) break;
    }

    if (!result || !result.url) return [];

    const pageRes = await fetch(result.url, { headers: WORKING_HEADERS });
    if (!pageRes.ok) return [];
    const html = await pageRes.text();
    const $page = cheerio.load(html);

    const pageText = $page('body').text().toLowerCase();
    let langInfo = '1080p';
    if (pageText.includes('dublaj')) {
      langInfo = '🇹🇷 TR Dublaj';
    } else if (pageText.includes('altyazı')) {
      langInfo = '🌐 TR Altyazı';
    }

    let iframeUrl = '';
    $page('iframe').each(function() {
      const src = $page(this).attr('data-vsrc') || $page(this).attr('src') || '';
      if (src.toLowerCase().includes('filmizle.in')) {
        iframeUrl = src.split('?img=')[0];
        return false;
      }
    });

    if (!iframeUrl) return [];

    const videoId = iframeUrl.split('/').pop().split('?')[0];
    const apiURL = 'https://player.filmizle.in/player/index.php?data=' + videoId + '&do=getVideo';

    const params = new URLSearchParams();
    params.append('hash', videoId);
    params.append('r', result.url);

    const r = await fetch(apiURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': iframeUrl.toLowerCase(),
        'User-Agent': WORKING_HEADERS['User-Agent']
      },
      body: params.toString()
    });

    if (!r.ok) return [];
    const json = await r.json();

    if (json && json.securedLink) {
      return [{
        name: displayTitle,
        title: `⌜ SinemaCX ⌟ | ${langInfo}`,
        url: json.securedLink,
        quality: '1080p',
        type: 'hls',
        provider: 'sinemacx',
        headers: {
          'Referer': 'https://player.filmizle.in/',
          'User-Agent': WORKING_HEADERS['User-Agent']
        }
      }];
    }

    return [];
  } catch (err) {
    return [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams: getStreams };
}
if (typeof globalThis !== 'undefined') {
  globalThis.getStreams = getStreams;
}
