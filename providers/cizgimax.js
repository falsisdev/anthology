/**
 * Anthology - ÇizgiMax Provider
 * Çizgi diziler, animeler ve animasyon filmleri için doğrudan TauVideo & Sibnet akışları sağlar.
 */

var CONFIG = (typeof require !== 'undefined' ? (function(){ try { return require('./config'); } catch(e) { return require('./urls'); } })() : null) || (typeof globalThis !== 'undefined' ? (globalThis.CONFIG || globalThis.URLS) : null) || {};
var URLS = CONFIG.urls || CONFIG;
var BASE_URL = (URLS.cizgimax && URLS.cizgimax.base) || 'https://cizgimax.online';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referer': BASE_URL + '/'
};

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const opts = Object.assign({}, options);
  if (!opts.signal) {
    try {
      opts.signal = AbortSignal.timeout(timeoutMs);
    } catch (e) {}
  }
  return fetch(url, opts);
}

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

function qualityWeight(q) {
  if (!q) return 100;
  var s = String(q).toLowerCase();
  if (s.includes('2160') || s.includes('4k')) return 4000;
  if (s.includes('1080')) return 1080;
  if (s.includes('720')) return 720;
  if (s.includes('480')) return 480;
  if (s.includes('hd')) return 500;
  return 100;
}

async function resolveVidmoly(embedUrl, referer) {
  try {
    const fullUrl = embedUrl.startsWith('//') ? 'https:' + embedUrl : embedUrl;
    const res = await fetchWithTimeout(fullUrl, {
      headers: {
        'User-Agent': HEADERS['User-Agent'],
        'Referer': referer || 'https://vidmoly.biz/'
      }
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/file\s*:\s*['"](https?:\/\/[^'"<>]+\.m3u8[^'"<>]*)['"]/i);
    if (m) {
      return {
        url: m[1],
        headers: {
          'User-Agent': HEADERS['User-Agent'],
          'Referer': 'https://vidmoly.biz/'
        }
      };
    }
  } catch (e) {}
  return null;
}

async function resolveSibnet(iframeUrl) {
  try {
    const fullUrl = iframeUrl.startsWith('//') ? 'https:' + iframeUrl : iframeUrl;
    const res = await fetchWithTimeout(fullUrl, {
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

async function resolveKitsu(kitsuId) {
  try {
    const cleanId = String(kitsuId).replace(/^kitsu:/, '').split(':')[0];
    const res = await fetchWithTimeout(`https://kitsu.io/api/edge/anime/${cleanId}`);
    if (!res.ok) return null;
    const data = await res.json();
    const attr = data && data.data && data.data.attributes;
    if (!attr) return null;
    const titles = [];
    if (attr.titles) {
      if (attr.titles.en_jp) titles.push(attr.titles.en_jp);
      if (attr.titles.en) titles.push(attr.titles.en);
      if (attr.titles.en_us) titles.push(attr.titles.en_us);
    }
    if (attr.canonicalTitle && !titles.includes(attr.canonicalTitle)) {
      titles.push(attr.canonicalTitle);
    }
    if (Array.isArray(attr.abbreviatedTitles)) {
      titles.push(...attr.abbreviatedTitles);
    }
    return {
      title: attr.canonicalTitle || titles[0] || '',
      origTitle: (attr.titles && attr.titles.en_jp) || titles[0] || '',
      queries: [...new Set(titles.filter(Boolean))]
    };
  } catch (e) {
    return null;
  }
}

async function resolveMediaInfo(idOrObj, mediaType, defaultSeason, defaultEpisode) {
  let id = idOrObj;
  let type = mediaType || 'tv';
  let season = parseInt(defaultSeason) || 1;
  let episode = parseInt(defaultEpisode) || 1;

  if (typeof idOrObj === 'object' && idOrObj !== null) {
    id = idOrObj.id || idOrObj.imdbId || idOrObj.tmdbId || '';
    type = idOrObj.type || type;
    if (idOrObj.season !== undefined) season = parseInt(idOrObj.season) || season;
    if (idOrObj.episode !== undefined) episode = parseInt(idOrObj.episode) || episode;
  }

  id = String(id || '').trim();
  const isTv = (type === 'tv' || type === 'series');

  if (id.includes(':')) {
    const parts = id.split(':');
    if (id.startsWith('kitsu:')) {
      season = 1;
      episode = parts.length >= 3 ? (parseInt(parts[2]) || 1) : (parseInt(parts[1]) || 1);
    } else {
      if (parts.length >= 3) {
        season = parseInt(parts[parts.length - 2]) || season;
        episode = parseInt(parts[parts.length - 1]) || episode;
      } else if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
        episode = parseInt(parts[1]) || episode;
      }
    }
  }

  if (id.startsWith('kitsu:')) {
    const kitsuData = await resolveKitsu(id);
    if (kitsuData) {
      return {
        numericId: null,
        title: kitsuData.title,
        origTitle: kitsuData.origTitle,
        queries: kitsuData.queries,
        season,
        episode,
        isTv
      };
    }
  }

  let cleanId = id;
  if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];

  let numericId = null;
  let title = '';
  let origTitle = '';
  const queries = [];

  if (cleanId.startsWith('tt')) {
    try {
      const fRes = await fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
      if (fRes.ok) {
        const fData = await fRes.json();
        const item = isTv ? (fData.tv_results && fData.tv_results[0]) : (fData.movie_results && fData.movie_results[0]);
        if (item) {
          numericId = item.id;
          title = item.name || item.title || '';
          origTitle = item.original_name || item.original_title || '';
        } else {
          const revItem = isTv ? (fData.movie_results && fData.movie_results[0]) : (fData.tv_results && fData.tv_results[0]);
          if (revItem) {
            numericId = revItem.id;
            title = revItem.name || revItem.title || '';
            origTitle = revItem.original_name || revItem.original_title || '';
          }
        }
      }
    } catch (e) {}
  } else if (!isNaN(parseInt(cleanId))) {
    numericId = parseInt(cleanId);
  }

  if (numericId) {
    const endpointType = isTv ? 'tv' : 'movie';
    try {
      const [resEn, resTr] = await Promise.all([
        fetchWithTimeout(`https://api.themoviedb.org/3/${endpointType}/${numericId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=alternative_titles`),
        fetchWithTimeout(`https://api.themoviedb.org/3/${endpointType}/${numericId}?api_key=${TMDB_API_KEY}&language=tr-TR`)
      ]);

      let dataEn = resEn.ok ? await resEn.json() : null;
      let dataTr = resTr.ok ? await resTr.json() : null;

      if (!dataEn && !dataTr && isTv) {
        const mRes = await fetchWithTimeout(`https://api.themoviedb.org/3/movie/${numericId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=alternative_titles`);
        if (mRes.ok) dataEn = await mRes.json();
      }

      if (dataTr) {
        const nameTr = dataTr.name || dataTr.title || '';
        if (nameTr && !queries.includes(nameTr)) {
          queries.push(nameTr);
        }
      }

      if (dataEn) {
        const normalizeTitle = (str) => {
          if (!str) return '';
          // String.prototype.normalize her yerde (QuickJS) yok; ascii fold fallback'li
          if (typeof str.normalize === 'function') {
            try { return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); } catch (e) {}
          }
          return str.replace(/[\u00E0-\u00E5]/gi, 'a')
            .replace(/[\u00E8-\u00EB]/gi, 'e')
            .replace(/[\u00EC-\u00EF]/gi, 'i')
            .replace(/[\u00F2-\u00F6]/gi, 'o')
            .replace(/[\u00F9-\u00FC]/gi, 'u')
            .replace(/\u00F1/gi, 'n').replace(/\u00E7/gi, 'c')
            .replace(/[\u0300-\u036f]/g, '').trim();
        };

        const nameEn = dataEn.name || dataEn.title || '';
        if (nameEn && !queries.includes(nameEn)) queries.push(nameEn);
        const origName = dataEn.original_name || dataEn.original_title || '';
        if (origName) {
          const cleanOrig = normalizeTitle(origName);
          if (cleanOrig && /^[a-zA-Z0-9\s:;.,'\"!?-]+$/.test(cleanOrig) && !queries.includes(cleanOrig)) {
            queries.push(cleanOrig);
          }
        }
        title = nameEn || title;
        origTitle = origName || origTitle;

        const alts = dataEn.alternative_titles ? (dataEn.alternative_titles.results || dataEn.alternative_titles.titles || []) : [];
        for (const a of alts) {
          const rawT = a.title || a.name || '';
          if (!rawT) continue;
          const t = normalizeTitle(rawT);
          if (t && /^[a-zA-Z0-9\s:;.,'\"!?-]+$/.test(t) && !queries.includes(t)) {
            queries.push(t);
          }
        }
      }
    } catch (e) {}
  }

  return {
    numericId,
    title,
    origTitle,
    queries: [...new Set(queries.filter(Boolean))],
    season,
    episode,
    isTv
  };
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  try {
    if (typeof tmdbId === 'object' && tmdbId !== null) {
      const obj = tmdbId;
      return getStreams(
        obj.id || obj.imdbId || obj.tmdbId,
        mediaType || obj.type,
        seasonNum !== undefined ? seasonNum : obj.season,
        episodeNum !== undefined ? episodeNum : obj.episode
      );
    }

    const mediaInfo = await resolveMediaInfo(tmdbId, mediaType, seasonNum, episodeNum);
    const isTv = mediaInfo.isTv;
    let finalSeason = mediaInfo.season;
    let finalEpisode = mediaInfo.episode;

    // cizgimax:ep:slug or cizgimax:show:slug format
    let rawId = typeof tmdbId === 'string' ? tmdbId : '';
    if (rawId.startsWith('cizgimax:show:')) {
      const showMeta = await getMeta(rawId);
      if (showMeta && showMeta.meta && Array.isArray(showMeta.meta.videos) && showMeta.meta.videos.length > 0) {
        return await getStreams(showMeta.meta.videos[0].id, mediaType, seasonNum, episodeNum);
      }
    }

    let matchedHref = null;

    if (rawId.startsWith('cizgimax:')) {
      const slug = rawId.replace(/^cizgimax:(?:show:|ep:)?/, '').replace(/^diziler\//, '');
      matchedHref = rawId.startsWith('cizgimax:ep:') ? `/${slug.replace(/^\//, '')}` : `/diziler/${slug.replace(/^\//, '')}`;
    } else {
      // 1. For movies with TMDB numeric ID, test direct movie URL
      if (!isTv && mediaInfo.numericId) {
        try {
          const probeRes = await fetchWithTimeout(`${BASE_URL}/film/film-${mediaInfo.numericId}-izle/`, { headers: HEADERS });
          if (probeRes.ok) {
            matchedHref = `/film/film-${mediaInfo.numericId}-izle/`;
          }
        } catch (e) {}
      }

      // 2. Search ÇizgiMax using queries
      if (!matchedHref) {
        const searchQueries = mediaInfo.queries.length > 0
          ? mediaInfo.queries
          : [mediaInfo.title, mediaInfo.origTitle].filter(Boolean);

        const targetCleans = searchQueries.map(q => ultraClean(q)).filter(Boolean);
        const seenCleanQueries = new Set();
        const deduplicatedQueries = [];
        for (const q of searchQueries) {
          const c = ultraClean(q);
          if (c && !seenCleanQueries.has(c) && deduplicatedQueries.length < 3) {
            seenCleanQueries.add(c);
            deduplicatedQueries.push(q);
          }
        }

        const allItems = [];

        for (const q of deduplicatedQueries) {
          try {
            let searchRes = await fetchWithTimeout(`${BASE_URL}/ara/?q=${encodeURIComponent(q)}`, { headers: HEADERS });
            if (searchRes.status === 429) {
              await new Promise(r => setTimeout(r, 1000));
              searchRes = await fetchWithTimeout(`${BASE_URL}/ara/?q=${encodeURIComponent(q)}`, { headers: HEADERS });
            }
            if (!searchRes.ok) continue;
            const searchHtml = await searchRes.text();

            const linkRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
            let m;
            while ((m = linkRegex.exec(searchHtml)) !== null) {
              const attrs = m[1];
              const text = m[2].replace(/<[^>]+>/g, '').trim();
              if (/class=["'][^"']*film-name[^"']*["']/i.test(attrs)) {
                const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
                if (hrefMatch) {
                  allItems.push({ href: hrefMatch[1], title: text });
                }
              }
            }

            // Early break if an exact title match is already found
            if (allItems.some(it => targetCleans.includes(ultraClean(it.title)))) {
              break;
            }
          } catch (e) {}
        }

        // Phase 1: Exact clean title match
        for (const item of allItems) {
          const itemClean = ultraClean(item.title);
          if (targetCleans.includes(itemClean)) {
            matchedHref = item.href;
            break;
          }
        }

        // Phase 2: Exact clean slug match
        if (!matchedHref) {
          for (const item of allItems) {
            const itemClean = ultraClean(item.title);
            for (const tc of targetCleans) {
              if (item.href.includes(`/${tc}-izle/`)) {
                matchedHref = item.href;
                break;
              }
            }
            if (matchedHref) break;
          }
        }

        // Phase 3: Prefix or partial match
        if (!matchedHref) {
          for (const item of allItems) {
            const itemClean = ultraClean(item.title);
            for (const tc of targetCleans) {
              if (itemClean.includes(tc) || tc.includes(itemClean)) {
                if (tc === 'attackontitan' && (itemClean.includes('chibi') || itemClean.includes('junior'))) continue;
                if (finalSeason === 1 && (itemClean.includes('season2') || itemClean.includes('season3') || itemClean.includes('season4') || itemClean.includes('finalseason'))) continue;
                matchedHref = item.href;
                break;
              }
            }
            if (matchedHref) break;
          }
        }
      }
    }

    if (!matchedHref) return [];

    let detailUrl = matchedHref.startsWith('http') ? matchedHref : `${BASE_URL}${matchedHref.endsWith('/') ? matchedHref : matchedHref + '/'}`;
    let targetPageUrl = detailUrl;

    const isDirectEpisode = rawId.startsWith('cizgimax:ep:') || matchedHref.includes('/episode-') || matchedHref.includes('-bolum');

    if (isTv && !isDirectEpisode) {
      let detailRes = await fetchWithTimeout(detailUrl, { headers: HEADERS });
      if (!detailRes.ok) {
        await new Promise(r => setTimeout(r, 400));
        detailRes = await fetchWithTimeout(detailUrl, { headers: HEADERS });
      }
      if (!detailRes.ok) return [];
      const detailHtml = await detailRes.text();

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
        for (const c of candidates) {
          const sMatch = c.href.match(/(\d+)-sezon/i) || c.href.match(/s(\d+)/i);
          const eMatch = c.href.match(/(\d+)-bolum/i) || c.href.match(/e(\d+)/i);
          const sNum = sMatch ? parseInt(sMatch[1]) : 1;
          const eNum = eMatch ? parseInt(eMatch[1]) : parseInt(c.text);
          if (sNum === finalSeason && eNum === finalEpisode) {
            epHref = c.href;
            break;
          }
        }
      }

      if (!epHref) return [];
      targetPageUrl = epHref.startsWith('http') ? epHref : `${BASE_URL}${epHref.endsWith('/') ? epHref : epHref + '/'}`;
    }

    // Now fetch player page
    let pageRes = await fetchWithTimeout(targetPageUrl, { headers: HEADERS });
    if (!pageRes.ok) {
      await new Promise(r => setTimeout(r, 400));
      pageRes = await fetchWithTimeout(targetPageUrl, { headers: HEADERS });
    }
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

    const uniqueServers = [];
    const seenServerKeys = new Set();
    for (const s of serverList) {
      const key = s.resolveUrl || s.streamUrl || s.src || `${s.label}_${s.type}_${s.embedId}`;
      if (!seenServerKeys.has(key)) {
        seenServerKeys.add(key);
        uniqueServers.push(s);
      }
    }

    const streams = [];
    const seenUrls = new Set();

    for (const server of uniqueServers) {
      let label = server.label || server.type || 'ÇizgiMax';
      if (server.lang === 'dub' && !label.toLowerCase().includes('dub')) label += ' [TR Dublaj]';
      else if (server.lang === 'sub' && !label.toLowerCase().includes('alty')) label += ' [TR Altyazı]';

      // 1. Resolve URL -> TauVideo
      if (server.resolveUrl) {
        try {
          const rUrl = server.resolveUrl.startsWith('http') ? server.resolveUrl : `${BASE_URL}${server.resolveUrl}`;
          const rRes = await fetchWithTimeout(rUrl, {
            headers: {
              'User-Agent': HEADERS['User-Agent'],
              'Referer': targetPageUrl
            }
          });
          if (rRes.ok) {
            let rData = null;
            try { rData = await rRes.json(); } catch(e) {}
            if (rData && rData.id) {
              const tauRes = await fetchWithTimeout(`https://tau-video.xyz/api/video/${rData.id}`);
              if (tauRes.ok) {
                let tauData = null;
                try { tauData = await tauRes.json(); } catch(e) {}
                if (tauData && Array.isArray(tauData.urls)) {
                  for (const u of tauData.urls) {
                    if (u.url && !seenUrls.has(u.url) && !u.url.includes('yhwach.icu')) {
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
                        provider: 'cizgimax',
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

      // 2. Stream URL -> 302 Redirect (Sibnet, VidMoly or direct video)
      if (server.streamUrl) {
        try {
          const stUrl = server.streamUrl.startsWith('http') ? server.streamUrl : `${BASE_URL}${server.streamUrl}`;
          const headRes = await fetchWithTimeout(stUrl, {
            headers: {
              'User-Agent': HEADERS['User-Agent'],
              'Referer': targetPageUrl
            },
            redirect: 'manual'
          });
          const loc = headRes.headers.get('location');
          if (loc) {
            if (loc.includes('vidmoly')) {
              const vRes = await resolveVidmoly(loc, BASE_URL + '/');
              if (vRes && vRes.url && !seenUrls.has(vRes.url)) {
                seenUrls.add(vRes.url);
                streams.push({
                  name: `ÇizgiMax - ${label} [1080p]`,
                  title: `ÇizgiMax | ${label} (1080p)`,
                  url: vRes.url,
                  quality: '1080p',
                  provider: 'cizgimax',
                  headers: vRes.headers,
                  behaviorHints: {
                    notWebReady: true,
                    proxyHeaders: {
                      request: vRes.headers
                    }
                  }
                });
              }
            } else if (!seenUrls.has(loc)) {
              seenUrls.add(loc);
              const isSib = loc.includes('sibnet.ru');
              const locHeaders = {
                'Referer': isSib ? 'https://video.sibnet.ru/' : `${BASE_URL}/`,
                'User-Agent': HEADERS['User-Agent']
              };
              streams.push({
                name: `ÇizgiMax - ${label}`,
                title: `ÇizgiMax | ${label} [HD]`,
                url: loc,
                quality: 'HD',
                provider: 'cizgimax',
                headers: locHeaders,
                behaviorHints: {
                  notWebReady: true,
                  proxyHeaders: {
                    request: locHeaders
                  }
                }
              });
            }
          }
        } catch (e) {}
      }

      // 3. Iframe src -> VidMoly, Sibnet resolver
      if (server.src) {
        try {
          if (server.src.includes('/oynat/')) {
            const oynatUrl = server.src.startsWith('http') ? server.src : `${BASE_URL}${server.src}`;
            const oRes = await fetch(oynatUrl, {
              headers: {
                'User-Agent': HEADERS['User-Agent'],
                'Referer': targetPageUrl
              },
              redirect: 'manual'
            });
            const loc = oRes.headers.get('location');
            if (loc) {
              if (loc.includes('vidmoly')) {
                const vRes = await resolveVidmoly(loc, BASE_URL + '/');
                if (vRes && vRes.url && !seenUrls.has(vRes.url)) {
                  seenUrls.add(vRes.url);
                  streams.push({
                    name: `ÇizgiMax - ${label} [1080p]`,
                    title: `ÇizgiMax | ${label} (1080p)`,
                    url: vRes.url,
                    quality: '1080p',
                    provider: 'cizgimax',
                    headers: vRes.headers,
                    behaviorHints: {
                      notWebReady: true,
                      proxyHeaders: {
                        request: vRes.headers
                      }
                    }
                  });
                }
              } else if (loc.includes('sibnet')) {
                const sRes = await resolveSibnet(loc);
                if (sRes && sRes.url && !seenUrls.has(sRes.url)) {
                  seenUrls.add(sRes.url);
                  streams.push({
                    name: `ÇizgiMax - ${label}`,
                    title: `ÇizgiMax | ${label} [HD]`,
                    url: sRes.url,
                    quality: 'HD',
                    provider: 'cizgimax',
                    headers: sRes.headers,
                    behaviorHints: {
                      notWebReady: true,
                      proxyHeaders: {
                        request: sRes.headers
                      }
                    }
                  });
                }
              }
            }
          } else if (server.src.includes('vidmoly')) {
            const vRes = await resolveVidmoly(server.src, BASE_URL + '/');
            if (vRes && vRes.url && !seenUrls.has(vRes.url)) {
              seenUrls.add(vRes.url);
              streams.push({
                name: `ÇizgiMax - ${label} [1080p]`,
                title: `ÇizgiMax | ${label} (1080p)`,
                url: vRes.url,
                quality: '1080p',
                provider: 'cizgimax',
                headers: vRes.headers,
                behaviorHints: {
                  notWebReady: true,
                  proxyHeaders: {
                    request: vRes.headers
                  }
                }
              });
            }
          } else if (server.src.includes('sibnet.ru') || server.src.includes('shell.php')) {
            const sibRes = await resolveSibnet(server.src);
            if (sibRes && sibRes.url && !seenUrls.has(sibRes.url)) {
              seenUrls.add(sibRes.url);
              streams.push({
                name: `ÇizgiMax - ${label}`,
                title: `ÇizgiMax | ${label} [HD]`,
                url: sibRes.url,
                quality: 'HD',
                provider: 'cizgimax',
                headers: sibRes.headers,
                behaviorHints: {
                  notWebReady: true,
                  proxyHeaders: {
                    request: sibRes.headers
                  }
                }
              });
            }
          }
        } catch (e) {}
      }

      // 4. Fallback for Sibnet videoId if streamUrl didn't fire
      if (server.videoId && (server.type === 'sibnet' || (server.label && server.label.toLowerCase().includes('sibnet')))) {
        try {
          const sibRes = await resolveSibnet(`https://video.sibnet.ru/shell.php?videoid=${server.videoId}`);
          if (sibRes && sibRes.url && !seenUrls.has(sibRes.url)) {
            seenUrls.add(sibRes.url);
            streams.push({
              name: `ÇizgiMax - ${label}`,
              title: `ÇizgiMax | ${label} [HD]`,
              url: sibRes.url,
              quality: 'HD',
              provider: 'cizgimax',
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

    return streams.sort((a, b) => qualityWeight(b.quality) - qualityWeight(a.quality));
  } catch (err) {
    return [];
  }
}

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
