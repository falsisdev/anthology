/**
 * Anthology - TurkAnime Provider
 * Anime dizileri ve filmleri için doğrudan Sibnet MP4 ve ArtPlayer HLS akışları sunar.
 */

var BASE_URL = 'https://www.turkanime.tv';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Cookie': 'yasOnay=1'
};

function ultraClean(str) {
  if (!str) return '';
  return str.toString().toLowerCase()
    .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function toSlug(str) {
  if (!str) return '';
  return str.toString().toLowerCase()
    .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

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

async function resolveSibnet(iframeUrl) {
  try {
    const fullUrl = iframeUrl.startsWith('//') ? 'https:' + iframeUrl : iframeUrl;
    const res = await fetch(fullUrl, {
      headers: {
        'User-Agent': HEADERS['User-Agent'],
        'Referer': BASE_URL + '/'
      }
    });
    const html = await res.text();
    const m = html.match(/player\.src\(\[\{src:\s*["']([^"']+)["']/);
    if (m) {
      const videoPath = m[1];
      const videoUrl = videoPath.startsWith('http') ? videoPath : `https://video.sibnet.ru${videoPath}`;
      return {
        url: videoUrl,
        headers: {
          'Referer': 'https://video.sibnet.ru/',
          'User-Agent': HEADERS['User-Agent']
        }
      };
    }
  } catch (e) {}
  return null;
}

async function getCatalog(args) {
  try {
    const res = await fetch(BASE_URL + '/', { headers: HEADERS });
    if (!res.ok) return { metas: [] };
    const html = await res.text();

    const matches = [...html.matchAll(/<a\b([^>]*)data-title=["']([^"']+)["']([^>]*)>/gi)];
    const metas = [];
    const seen = new Set();

    for (const m of matches) {
      const hMatch = (m[1] + m[3]).match(/href=["']([^"']+)["']/);
      const title = m[2].trim();
      if (hMatch && title) {
        let href = hMatch[1];
        if (href.startsWith('//')) href = 'https:' + href;
        const slug = href.replace(/https?:\/\/www\.turkanime\.tv\/anime\//, '').replace(/^\//, '').replace(/\/$/, '');
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);

        metas.push({
          id: `turkanime:anime:${slug}`,
          type: 'tv',
          name: title,
          poster: 'https://www.google.com/s2/favicons?domain=turkanime.tv&sz=128',
          background: 'https://www.google.com/s2/favicons?domain=turkanime.tv&sz=128',
          genres: ['Anime', 'TurkAnime'],
          description: `${title} - TurkAnime TV`
        });
      }
    }

    return { metas };
  } catch (e) {
    return { metas: [] };
  }
}

async function getMeta(args) {
  try {
    const rawId = (typeof args === 'string') ? args : (args && args.id ? args.id : '');
    if (!rawId || !rawId.startsWith('turkanime:')) return { meta: null };

    const slug = rawId.replace(/^turkanime:(?:anime:|ep:)?/, '');
    const animeHref = `${BASE_URL}/anime/${slug}`;
    const detRes = await fetch(animeHref, { headers: HEADERS });
    if (!detRes.ok) return { meta: null };
    const detHtml = await detRes.text();

    const titleMatch = detHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || detHtml.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Anime';

    return {
      meta: {
        id: rawId,
        type: 'tv',
        name: title,
        poster: 'https://www.google.com/s2/favicons?domain=turkanime.tv&sz=128',
        background: 'https://www.google.com/s2/favicons?domain=turkanime.tv&sz=128',
        description: `${title} - TurkAnime TV`,
        genres: ['Anime', 'TurkAnime'],
        videos: [{ id: rawId, title: `${title} 1. Bölüm`, season: 1, episode: 1 }]
      }
    };
  } catch (e) {
    return { meta: null };
  }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  try {
    if (typeof tmdbId === 'object' && tmdbId && tmdbId.id) {
      return getStreams(tmdbId.id, mediaType || 'tv', seasonNum, episodeNum);
    }

    let finalSeason = parseInt(seasonNum) || 1;
    let finalEpisode = parseInt(episodeNum) || 1;

    let animeHref = null;

    if (typeof tmdbId === 'string' && tmdbId.startsWith('turkanime:')) {
      const slug = tmdbId.replace(/^turkanime:(?:anime:|ep:)?/, '');
      animeHref = `${BASE_URL}/anime/${slug}`;
    } else {
      if (typeof tmdbId === 'string' && tmdbId.includes(':')) {
        const parts = tmdbId.split(':');
        if (parts.length >= 3) {
          finalSeason = parseInt(parts[1]) || finalSeason;
          finalEpisode = parseInt(parts[2]) || finalEpisode;
        }
      }

      const info = await resolveTmdbInfo(tmdbId, mediaType);
      const targetTr = ultraClean(info.title);
      const targetEn = ultraClean(info.origTitle);

      // 1. Direct slug prediction (avoids /arama rate limit)
      const slugCandidates = [
        toSlug(info.origTitle),
        toSlug(info.title)
      ].filter(Boolean);

      for (const s of slugCandidates) {
        const testUrl = `${BASE_URL}/anime/${s}`;
        const tRes = await fetch(testUrl, { headers: HEADERS });
        if (tRes.ok) {
          const tHtml = await tRes.text();
          if (tHtml.includes('ajax/bolumler&animeId=')) {
            animeHref = testUrl;
            break;
          }
        }
      }

      // 2. Search fallback if slug did not match
      if (!animeHref) {
        const queries = [info.title, info.origTitle].filter(Boolean);
        for (const q of queries) {
          const searchRes = await fetch(`${BASE_URL}/arama`, {
            method: 'POST',
            headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
            body: `arama=${encodeURIComponent(q)}`
          });
          if (!searchRes.ok) continue;
          const searchHtml = await searchRes.text();

          const itemRegex = /<div[^>]*class=["'][^"']*panel-title[^"']*["'][^>]*>\s*<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
          let match;
          const candidates = [];
          while ((match = itemRegex.exec(searchHtml)) !== null) {
            const h = match[1];
            const t = match[2].replace(/<[^>]+>/g, '').trim();
            candidates.push({ href: h, title: t });
            const cClean = ultraClean(t);
            if (cClean === targetTr || cClean === targetEn ||
                (targetTr && cClean.includes(targetTr)) ||
                (targetEn && cClean.includes(targetEn))) {
              animeHref = h;
              break;
            }
          }

          if (animeHref) break;
          if (!animeHref && candidates.length > 0) {
            animeHref = candidates[0].href;
            break;
          }
        }
      }
    }

    if (!animeHref) return [];

    if (animeHref.startsWith('//')) animeHref = 'https:' + animeHref;
    else if (!animeHref.startsWith('http')) animeHref = `${BASE_URL}/${animeHref.replace(/^\//, '')}`;

    const detRes = await fetch(animeHref, { headers: HEADERS });
    if (!detRes.ok) return [];
    const detHtml = await detRes.text();

    const tokenMatch = detHtml.match(/<meta[^>]*name=["']_token["'][^>]*content=["']([^"']+)["']/i) ||
                       detHtml.match(/token\s*=\s*['"]([^'"]+)['"]/);
    const token = tokenMatch ? tokenMatch[1] : '';

    const ajaxMatch = detHtml.match(/ajax\/bolumler&animeId=(\d+)/i);
    if (!ajaxMatch) return [];

    const bolumlerUrl = `${BASE_URL}/${ajaxMatch[0]}`;
    const bRes = await fetch(bolumlerUrl, {
      headers: Object.assign({}, HEADERS, {
        'X-Requested-With': 'XMLHttpRequest',
        'token': token,
        'Referer': animeHref
      })
    });
    if (!bRes.ok) return [];
    const bHtml = await bRes.text();

    let epHref = null;
    const epRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
    let epMatch;
    const candidates = [];

    while ((epMatch = epRegex.exec(bHtml)) !== null) {
      const attrs = epMatch[1];
      const text = epMatch[2].replace(/<[^>]+>/g, '').trim();
      if (attrs.includes('/video/')) {
        const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
        if (hrefMatch) {
          const h = hrefMatch[1];
          candidates.push({ href: h, text });
          const epNumMatch = text.match(/\b(\d+)\b/) || h.match(/-(\d+)-bolum/);
          if (epNumMatch && parseInt(epNumMatch[1]) === finalEpisode) {
            epHref = h;
            break;
          }
        }
      }
    }

    if (!epHref && candidates.length > 0) {
      epHref = candidates[0].href;
    }

    if (!epHref) return [];

    if (epHref.startsWith('//')) epHref = 'https:' + epHref;
    else if (!epHref.startsWith('http')) epHref = `${BASE_URL}/${epHref.replace(/^\//, '')}`;

    const epRes = await fetch(epHref, { headers: HEADERS });
    if (!epRes.ok) return [];
    const epHtml = await epRes.text();

    const icerikRegex = /IndexIcerik\('([^']+)'/gi;
    let iMatch;
    const playerUrls = [];
    while ((iMatch = icerikRegex.exec(epHtml)) !== null) {
      const rel = iMatch[1];
      if (rel.includes('videosec')) {
        playerUrls.push(rel.startsWith('http') ? rel : `${BASE_URL}/${rel.replace(/^\//, '')}`);
      }
    }

    const streams = [];
    const seenUrls = new Set();

    for (const pUrl of playerUrls.slice(0, 5)) {
      try {
        const pRes = await fetch(pUrl, {
          headers: Object.assign({}, HEADERS, {
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': epHref
          })
        });
        if (!pRes.ok) continue;
        const pHtml = await pRes.text();

        // 1. Direct ArtPlayer M3U8
        const artMatch = pHtml.match(/class=["'][^"']*artplayer-app[^"']*["'][^>]*data-url=["']([^"']+)["']/i) ||
                         pHtml.match(/data-url=["']([^"']+\.m3u8[^"']*)["']/i);
        if (artMatch && !seenUrls.has(artMatch[1])) {
          seenUrls.add(artMatch[1]);
          streams.push({
            name: 'TurkAnime - HLS',
            title: 'TurkAnime | HLS [HD]',
            url: artMatch[1],
            quality: 'HD',
            headers: { 'Referer': pUrl }
          });
        }

        // 2. Direct Sibnet iframe
        const ifrMatch = pHtml.match(/<iframe[^>]*src=["']([^"']+)["']/i);
        if (ifrMatch) {
          const src = ifrMatch[1];
          if (src.includes('sibnet.ru') || src.includes('shell.php')) {
            const sib = await resolveSibnet(src);
            if (sib && sib.url && !seenUrls.has(sib.url)) {
              seenUrls.add(sib.url);
              streams.push({
                name: 'TurkAnime - Sibnet',
                title: 'TurkAnime | Sibnet [1080p MP4]',
                url: sib.url,
                quality: '1080p',
                headers: sib.headers
              });
            }
          }
        }

        // 3. Sub-buttons inside videosec (e.g. SIBNET buttons)
        const subIcerik = [...pHtml.matchAll(/IndexIcerik\('([^']+)'/gi)].map(m => m[1]);
        for (const subRel of subIcerik) {
          const subFull = `${BASE_URL}/${subRel.replace(/^\//, '')}`;
          const sRes = await fetch(subFull, {
            headers: Object.assign({}, HEADERS, {
              'X-Requested-With': 'XMLHttpRequest',
              'Referer': epHref
            })
          });
          if (!sRes.ok) continue;
          const sHtml = await sRes.text();
          const sIfr = sHtml.match(/<iframe[^>]*src=["']([^"']+)["']/i);
          if (sIfr && (sIfr[1].includes('sibnet.ru') || sIfr[1].includes('shell.php'))) {
            const sib = await resolveSibnet(sIfr[1]);
            if (sib && sib.url && !seenUrls.has(sib.url)) {
              seenUrls.add(sib.url);
              streams.push({
                name: 'TurkAnime - Sibnet',
                title: 'TurkAnime | Sibnet [1080p MP4]',
                url: sib.url,
                quality: '1080p',
                headers: sib.headers
              });
              break;
            }
          }
        }

        if (streams.length > 0) break;
      } catch (e) {}
    }

    return streams;
  } catch (err) {
    return [];
  }
}

if (typeof module !== 'undefined') module.exports = { getStreams, getCatalog, getMeta };
if (typeof globalThis !== 'undefined') {
  globalThis.getStreams = getStreams;
  globalThis.getCatalog = getCatalog;
  globalThis.getMeta = getMeta;
}
