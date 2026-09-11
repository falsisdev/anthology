/**
 * Anthology - ÇizgiMax Provider
 * Çizgi diziler, animeler ve animasyon filmleri için doğrudan TauVideo & Sibnet akışları sağlar.
 */

var BASE_URL = 'https://cizgimax.online';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referer': BASE_URL + '/'
};

function ultraClean(str) {
  if (!str) return '';
  return str.toString().toLowerCase()
    .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, function(match, dec) { return String.fromCharCode(dec); })
    .trim();
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

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  try {
    const isTv = (mediaType === 'tv' || mediaType === 'series');
    let finalSeason = parseInt(seasonNum) || 1;
    let finalEpisode = parseInt(episodeNum) || 1;

    // cizgimax:ep:slug:season:episode veya cizgimax:show:slug formatı
    if (typeof tmdbId === 'string' && tmdbId.startsWith('cizgimax:ep:')) {
      const rest = tmdbId.replace('cizgimax:ep:', '');
      // Son iki segment :season:episode olabilir
      const lastColonIdx2 = rest.lastIndexOf(':');
      if (lastColonIdx2 > 0) {
        const maybeEp = parseInt(rest.substring(lastColonIdx2 + 1));
        const beforeEp = rest.substring(0, lastColonIdx2);
        const lastColonIdx1 = beforeEp.lastIndexOf(':');
        if (lastColonIdx1 > 0 && !isNaN(maybeEp)) {
          const maybeSeason = parseInt(beforeEp.substring(lastColonIdx1 + 1));
          if (!isNaN(maybeSeason)) {
            finalSeason = maybeSeason;
            finalEpisode = maybeEp;
          }
        }
      }
    } else if (typeof tmdbId === 'string' && !tmdbId.startsWith('cizgimax:')) {
      // TMDB/IMDb ID — season:episode positional parse
      if (typeof tmdbId === 'string' && tmdbId.includes(':')) {
        const parts = tmdbId.split(':');
        if (parts.length >= 3) {
          const s = parseInt(parts[parts.length - 2]);
          const e = parseInt(parts[parts.length - 1]);
          if (!isNaN(s)) finalSeason = s;
          if (!isNaN(e)) finalEpisode = e;
        }
      }
    }

    // cizgimax:show: fallback — resolve episode 1 via getMeta
    if (typeof tmdbId === 'string' && tmdbId.startsWith('cizgimax:show:')) {
      const showMeta = await getMeta(tmdbId);
      if (showMeta && showMeta.meta && Array.isArray(showMeta.meta.videos) && showMeta.meta.videos.length > 0) {
        return await getStreams(showMeta.meta.videos[0].id, mediaType, seasonNum, episodeNum);
      }
    }

    let matchedHref = null;

    if (typeof tmdbId === 'string' && tmdbId.startsWith('cizgimax:')) {
      const slug = tmdbId.replace(/^cizgimax:(?:show:|ep:)?/, '').replace(/^diziler\//, '');
      matchedHref = tmdbId.startsWith('cizgimax:ep:') ? `/${slug.replace(/^\//, '')}` : `/diziler/${slug.replace(/^\//, '')}`;
    } else {
      const info = await resolveTmdbInfo(tmdbId, mediaType);
      const queries = [info.title, info.origTitle].filter(Boolean);
      if (!queries.length) return [];

      const targetTr = ultraClean(info.title);
      const targetEn = ultraClean(info.origTitle);

      for (const q of queries) {
        const searchRes = await fetch(`${BASE_URL}/ara/?q=${encodeURIComponent(q)}`, { headers: HEADERS });
        if (!searchRes.ok) continue;
      const searchHtml = await searchRes.text();

      // Robust link parsing
      const items = [];
      const linkRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
      let m;
      while ((m = linkRegex.exec(searchHtml)) !== null) {
        const attrs = m[1];
        const text = m[2].replace(/<[^>]+>/g, '').trim();
        if (/class=["'][^"']*film-name[^"']*["']/i.test(attrs)) {
          const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
          if (hrefMatch) {
            items.push({ href: hrefMatch[1], title: text });
          }
        }
      }

      for (const item of items) {
        const itemClean = ultraClean(item.title);
        if (itemClean === targetTr || itemClean === targetEn ||
            (targetTr && itemClean.includes(targetTr)) ||
            (targetEn && itemClean.includes(targetEn))) {
          matchedHref = item.href;
          break;
        }
      }

      if (matchedHref) break;
    }
  }

    if (!matchedHref) return [];

    const detailUrl = matchedHref.startsWith('http') ? matchedHref : `${BASE_URL}${matchedHref}`;
    let targetPageUrl = detailUrl;

    const isDirectEpisode = (typeof tmdbId === 'string' && tmdbId.startsWith('cizgimax:ep:')) || matchedHref.includes('/episode-');

    if (isTv && !isDirectEpisode) {
      const detailRes = await fetch(detailUrl, { headers: HEADERS });
      if (!detailRes.ok) return [];
      const detailHtml = await detailRes.text();

      // Look for episode links
      let epHref = null;
      const btnRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
      let bMatch;
      const candidates = [];
      while ((bMatch = btnRegex.exec(detailHtml)) !== null) {
        const attrs = bMatch[1];
        const text = bMatch[2].replace(/<[^>]+>/g, '').trim();
        if (/ep-num-btn/i.test(attrs)) {
          const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
          if (hrefMatch) {
            const h = hrefMatch[1];
            candidates.push({ href: h, text });
            // Check season & episode in href or text
            const seasonRegex = new RegExp(`[/-]${finalSeason}-sezon[-/]|s0*${finalSeason}e`, 'i');
            const epRegex = new RegExp(`[/-]${finalEpisode}-bolum[-/]|e0*${finalEpisode}(?:/|$)`, 'i');
            if (seasonRegex.test(h) && epRegex.test(h)) {
              epHref = h;
              break;
            }
          }
        }
      }

      if (!epHref && candidates.length > 0) {
        // Find by text matching episode number
        for (const c of candidates) {
          const epNum = parseInt(c.text);
          if (epNum === finalEpisode) {
            epHref = c.href;
            break;
          }
        }
      }



      if (!epHref) return [];
      targetPageUrl = epHref.startsWith('http') ? epHref : `${BASE_URL}${epHref}`;
    }

    // Now fetch player page
    const pageRes = await fetch(targetPageUrl, { headers: HEADERS });
    if (!pageRes.ok) return [];
    const pageHtml = await pageRes.text();

    const serverList = [];
    const serversMatch = pageHtml.match(/servers\s*=\s*JSON\.parse\(atob\((["'])(.*?)\1\)\)/);
    const serversByLangMatch = pageHtml.match(/serversByLang\s*=\s*JSON\.parse\(atob\((["'])(.*?)\1\)\)/);

    if (serversMatch) {
      let b64 = serversMatch[2].replace(/\\/g, '');
      while (b64.length % 4 !== 0) b64 += '=';
      try {
        const json = Buffer.from(b64, 'base64').toString('utf-8');
        serverList.push(...JSON.parse(json));
      } catch (e) {}
    }

    if (serversByLangMatch) {
      let b64 = serversByLangMatch[2].replace(/\\/g, '');
      while (b64.length % 4 !== 0) b64 += '=';
      try {
        const json = Buffer.from(b64, 'base64').toString('utf-8');
        const parsedMap = JSON.parse(json);
        Object.values(parsedMap).forEach(list => {
          if (Array.isArray(list)) serverList.push(...list);
        });
      } catch (e) {}
    }

    const streams = [];
    const seenUrls = new Set();

    for (const server of serverList) {
      const label = server.label || server.type || 'ÇizgiMax';

      // 1. Resolve URL -> TauVideo
      if (server.resolveUrl) {
        try {
          const rUrl = server.resolveUrl.startsWith('http') ? server.resolveUrl : `${BASE_URL}${server.resolveUrl}`;
          const rRes = await fetch(rUrl, {
            headers: {
              'User-Agent': HEADERS['User-Agent'],
              'Referer': targetPageUrl
            }
          });
          if (rRes.ok) {
            const rData = await rRes.json();
            if (rData && rData.id) {
              const tauRes = await fetch(`https://tau-video.xyz/api/video/${rData.id}`);
              if (tauRes.ok) {
                const tauData = await tauRes.json();
                if (tauData && Array.isArray(tauData.urls)) {
                  for (const u of tauData.urls) {
                    if (u.url && !seenUrls.has(u.url)) {
                      seenUrls.add(u.url);
                      const quality = u.label || '1080p';
                      const strHeaders = {
                        'Referer': `${BASE_URL}/`,
                        'User-Agent': HEADERS['User-Agent']
                      };
                      streams.push({
                        name: `ÇizgiMax - ${label} [${quality}]`,
                        title: `ÇizgiMax | ${label} (${quality})`,
                        url: u.url,
                        quality: quality,
                        headers: strHeaders,
                        behaviorHints: {
                          notWebReady: true,
                          proxyHeaders: {
                            request: strHeaders
                          }
                        }
                      });
                    }
                  }
                }
              }
            }
          }
        } catch (e) {}
      }

      // 2. Stream URL -> 302 Redirect (Sibnet or direct video)
      if (server.streamUrl) {
        try {
          const stUrl = server.streamUrl.startsWith('http') ? server.streamUrl : `${BASE_URL}${server.streamUrl}`;
          const headRes = await fetch(stUrl, {
            headers: {
              'User-Agent': HEADERS['User-Agent'],
              'Referer': `${BASE_URL}/`
            },
            redirect: 'manual'
          });
          const loc = headRes.headers.get('location');
          if (loc && !seenUrls.has(loc)) {
            seenUrls.add(loc);
            const isSib = loc.includes('sibnet.ru');
            const locHeaders = {
              'Referer': isSib ? 'https://video.sibnet.ru/' : `${BASE_URL}/`,
              'User-Agent': HEADERS['User-Agent']
            };
            streams.push({
              name: `ÇizgiMax - ${label}`,
              title: `ÇizgiMax | ${label}`,
              url: loc,
              quality: 'HD',
              headers: locHeaders,
              behaviorHints: {
                notWebReady: true,
                proxyHeaders: {
                  request: locHeaders
                }
              }
            });
          }
        } catch (e) {}
      }

      // 3. Iframe src -> Sibnet resolver
      if (server.src && (server.src.includes('sibnet.ru') || server.src.includes('shell.php'))) {
        try {
          const sibRes = await resolveSibnet(server.src);
          if (sibRes && sibRes.url && !seenUrls.has(sibRes.url)) {
            seenUrls.add(sibRes.url);
            streams.push({
              name: `ÇizgiMax - Sibnet`,
              title: `ÇizgiMax | Sibnet [HD]`,
              url: sibRes.url,
              quality: 'HD',
              headers: sibRes.headers,
              behaviorHints: {
                notWebReady: true,
                proxyHeaders: {
                  request: sibRes.headers
                }
              }
            });
          }
        } catch (e) {}
      }
    }

    return streams;
  } catch (err) {
    return [];
  }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;

// ── Catalog & Meta Entegrasyonu ──────────────────────────────
async function getCatalog(args) {
  try {
    const query = (args && args.search) || (args && args.extra && args.extra.search) || (args && args.query) || '';
    const targetUrl = query ? `${BASE_URL}/ara/?q=${encodeURIComponent(query)}` : `${BASE_URL}/diziler/`;

    const res = await fetch(targetUrl, { headers: HEADERS });
    if (!res.ok) return { metas: [] };
    const html = await res.text();

    const metas = [];
    const seen = new Set();

    // 1. Primary parser: parse .film-item cards with high-res poster and decoded title
    const itemRegex = /<div class=["'][^"']*film-item[^"']*["'][\s\S]*?<\/div>\s*<\/div>/gi;
    let m;
    while ((m = itemRegex.exec(html)) !== null) {
      const block = m[0];
      const hrefMatch = block.match(/href=["']([^"']+)["']/i);
      const nameMatch = block.match(/class=["'][^"']*film-name[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
      const imgMatch = block.match(/<img\b[^>]*src=["']([^"']+)["']/i) || block.match(/<img\b[^>]*data-src=["']([^"']+)["']/i);
      if (hrefMatch && nameMatch) {
        const href = hrefMatch[1];
        const slug = href.replace(BASE_URL, '').replace(/^\//, '').replace(/\/$/, '').replace(/^diziler\//, '');
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);

        const title = decodeHtmlEntities(nameMatch[1].replace(/<[^>]+>/g, '').trim());
        let poster = imgMatch ? imgMatch[1] : '';
        if (poster.startsWith('//')) poster = 'https:' + poster;
        else if (poster.startsWith('/')) poster = `${BASE_URL}${poster}`;
        if (!poster) poster = 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';

        metas.push({
          id: `cizgimax:show:${slug}`,
          type: 'tv',
          name: title,
          poster: poster,
          background: poster,
          genres: ['Çizgi Dizi', 'ÇizgiMax'],
          description: `${title} - ÇizgiMax Arşivi`
        });
      }
    }

    // 2. Fallback parser (for search results or alternate layouts)
    if (metas.length === 0) {
      const linkRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
      let m2;
      while ((m2 = linkRegex.exec(html)) !== null) {
        const attrs = m2[1];
        const text = decodeHtmlEntities(m2[2].replace(/<[^>]+>/g, '').trim());
        if (/class=["'][^"']*film-name[^"']*["']/i.test(attrs)) {
          const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
          if (hrefMatch) {
            const href = hrefMatch[1];
            const slug = href.replace(BASE_URL, '').replace(/^\//, '').replace(/\/$/, '').replace(/^diziler\//, '');
            if (!slug || seen.has(slug) || text.length < 2) continue;
            seen.add(slug);

            metas.push({
              id: `cizgimax:show:${slug}`,
              type: 'tv',
              name: text,
              poster: 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
              background: 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
              genres: ['Çizgi Dizi', 'ÇizgiMax'],
              description: `${text} - ÇizgiMax Arşivi`
            });
          }
        }
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
    if (!rawId || !rawId.startsWith('cizgimax:')) return { meta: null };

    const slug = rawId.replace(/^cizgimax:(?:show:|ep:)?/, '').replace(/^diziler\//, '');
    const showUrl = `${BASE_URL}/diziler/${slug}/`;
    const res = await fetch(showUrl, { headers: HEADERS });
    if (!res.ok) return { meta: null };
    const html = await res.text();

    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
    const title = decodeHtmlEntities(titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'ÇizgiMax');

    const ogImg = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i);
    let poster = ogImg ? ogImg[1] : '';
    if (poster.startsWith('//')) poster = 'https:' + poster;
    else if (poster.startsWith('/')) poster = `${BASE_URL}${poster}`;
    if (!poster) poster = 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';

    const epMatches = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
    const videos = [];
    const seen = new Set();

    for (const ep of epMatches) {
      const attrs = ep[1];
      const epText = decodeHtmlEntities(ep[2].replace(/<[^>]+>/g, '').trim());
      if (/class=["'][^"']*ep-num-btn[^"']*["']/i.test(attrs)) {
        const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
        if (hrefMatch) {
          const epSlug = hrefMatch[1].replace(BASE_URL, '').replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '').replace(/\/$/, '');
          if (!epSlug || seen.has(epSlug)) continue;
          seen.add(epSlug);

          const seMatch = epSlug.match(/-s(\d+)e(\d+)/i);
          const trMatch = epSlug.match(/-(\d+)-sezon[^/]*-(\d+)-bolum/i);
          let season = 1;
          let episode = 1;
          if (seMatch) {
            season = parseInt(seMatch[1]);
            episode = parseInt(seMatch[2]);
          } else if (trMatch) {
            season = parseInt(trMatch[1]);
            episode = parseInt(trMatch[2]);
          } else {
            const numMatch = ep[2].match(/class=["']ep-num-label["']>(\d+)</i) || attrs.match(/title=["'](?:Bölüm\s*)?(\d+)["']/i) || epSlug.match(/-(\d+)-bolum/i);
            episode = numMatch ? parseInt(numMatch[1]) : (videos.length + 1);
          }

          videos.push({
            id: `cizgimax:ep:${epSlug}`,
            title: `${season}. Sezon ${episode}. Bölüm`,
            season: season,
            episode: episode
          });
        }
      }
    }
    
    videos.sort((a, b) => (a.season - b.season) || (a.episode - b.episode));

    return {
      meta: {
        id: rawId,
        type: 'tv',
        name: title,
        poster: poster,
        background: poster,
        description: `${title} - ÇizgiMax`,
        genres: ['Çizgi Dizi', 'ÇizgiMax'],
        videos: videos.length > 0 ? videos : [{ id: rawId, title: `${title} 1. Bölüm`, season: 1, episode: 1 }]
      }
    };
  } catch (e) {
    return { meta: null };
  }
}

if (typeof module !== 'undefined') {
  module.exports = { getStreams, getCatalog, getMeta };
}
if (typeof globalThis !== 'undefined') {
  globalThis.getStreams = getStreams;
  globalThis.getCatalog = getCatalog;
  globalThis.getMeta = getMeta;
}
