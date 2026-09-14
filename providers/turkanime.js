/**
 * Anthology - TurkAnime Provider
 * Anime dizileri ve filmleri için doğrudan Sibnet MP4 ve ArtPlayer HLS akışları sunar.
 */

var CONFIG = (typeof require !== 'undefined' ? (function(){ try { return require('./config'); } catch(e) { return require('./urls'); } })() : null) || (typeof globalThis !== 'undefined' ? (globalThis.CONFIG || globalThis.URLS) : null) || {};
var URLS = CONFIG.urls || CONFIG;
var BASE_URL = (URLS.turkanime && URLS.turkanime.base) || 'https://www.turkanime.tv';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/122.0.0.0 Safari/537.36',
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

async function resolveKitsu(kitsuId) {
  try {
    const cleanId = String(kitsuId).replace(/^kitsu:/, '').split(':')[0];
    const res = await fetch(`https://kitsu.io/api/edge/anime/${cleanId}`);
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
        fetch(`https://api.themoviedb.org/3/${endpointType}/${numericId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=alternative_titles`),
        fetch(`https://api.themoviedb.org/3/${endpointType}/${numericId}?api_key=${TMDB_API_KEY}&language=tr-TR`)
      ]);

      let dataEn = resEn.ok ? await resEn.json() : null;
      let dataTr = resTr.ok ? await resTr.json() : null;

      if (!dataEn && !dataTr && isTv) {
        const mRes = await fetch(`https://api.themoviedb.org/3/movie/${numericId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=alternative_titles`);
        if (mRes.ok) dataEn = await mRes.json();
      }

      if (dataEn) {
        const nameEn = dataEn.name || dataEn.title || '';
        if (nameEn) queries.push(nameEn);
        const origName = dataEn.original_name || dataEn.original_title || '';
        if (origName && /^[a-zA-Z0-9\s:;.,'\"!?-]+$/.test(origName)) {
          queries.push(origName);
        }
        title = nameEn || title;
        origTitle = origName || origTitle;

        const alts = dataEn.alternative_titles ? (dataEn.alternative_titles.results || dataEn.alternative_titles.titles || []) : [];
        for (const a of alts) {
          const t = a.title || a.name || '';
          if (t && /^[a-zA-Z0-9\s:;.,'\"!?-]+$/.test(t) && !queries.includes(t)) {
            queries.push(t);
          }
        }
      }

      if (dataTr) {
        const nameTr = dataTr.name || dataTr.title || '';
        if (nameTr && !queries.includes(nameTr)) {
          queries.push(nameTr);
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
    const query = (args && args.search) || (args && args.extra && args.extra.search) || (args && args.query) || '';
    const metas = [];
    const seen = new Set();

    if (query) {
      const searchRes = await fetch(`${BASE_URL}/arama`, {
        method: 'POST',
        headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
        body: `arama=${encodeURIComponent(query)}`
      });
      if (searchRes.ok) {
        const searchHtml = await searchRes.text();
        const itemRegex = /<div[^>]*class=["'][^"']*panel-title[^"']*["'][^>]*>\s*<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
        let match;
        while ((match = itemRegex.exec(searchHtml)) !== null) {
          const h = match[1];
          const t = match[2].replace(/<[^>]+>/g, '').trim();
          let cleanHref = h.startsWith('//') ? 'https:' + h : h;
          const slug = cleanHref.replace(/https?:\/\/www\.turkanime\.tv\/anime\//, '').replace(/^\//, '').replace(/\/$/, '');
          if (!slug || seen.has(slug)) continue;
          seen.add(slug);

          metas.push({
            id: `turkanime:anime:${slug}`,
            type: 'tv',
            name: t,
            poster: 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
            background: 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
            genres: ['Anime', 'TurkAnime'],
            description: `${t} - TurkAnime TV`
          });
        }
        return { metas };
      }
    }

    const res = await fetch(BASE_URL + '/', { headers: HEADERS });
    if (!res.ok) return { metas: [] };
    const html = await res.text();

    const matches = [...html.matchAll(/<a\b([^>]*)data-title=["']([^"']+)["']([^>]*)>/gi)];

    for (const m of matches) {
      const combinedAttrs = m[1] + m[3];
      const hMatch = combinedAttrs.match(/href=["']([^"']+)["']/i);
      const imgMatch = combinedAttrs.match(/data-img=["']([^"']+)["']/i);
      const title = m[2].trim();
      if (hMatch && title) {
        let href = hMatch[1];
        if (href.startsWith('//')) href = 'https:' + href;
        const slug = href.replace(/https?:\/\/www\.turkanime\.tv\/anime\//, '').replace(/^\//, '').replace(/\/$/, '');
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);

        let poster = imgMatch ? imgMatch[1] : '';
        if (poster.startsWith('//')) poster = 'https:' + poster;
        if (!poster) poster = 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';

        metas.push({
          id: `turkanime:anime:${slug}`,
          type: 'tv',
          name: title,
          poster: poster,
          background: poster,
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
    const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Anime';
    const title = rawTitle.replace(/\s*izle\s*\|.*$/i, '').trim();

    const posterMatch = detHtml.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i) ||
                        detHtml.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                        detHtml.match(/src=["']([^"']*serilerb\/[^"']+)["']/i);
    let poster = posterMatch ? posterMatch[1] : '';
    if (poster.startsWith('//')) poster = 'https:' + poster;
    if (!poster) poster = 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';

    const videos = [];
    const ajaxMatch = detHtml.match(/ajax\/bolumler&animeId=(\d+)/i);
    if (ajaxMatch) {
      try {
        const tokenMatch = detHtml.match(/<meta[^>]*name=["']_token["'][^>]*content=["']([^"']+)["']/i) ||
                           detHtml.match(/token\s*=\s*['"]([^'"]+)['"]/);
        const token = tokenMatch ? tokenMatch[1] : '';
        const bolumlerUrl = `${BASE_URL}/${ajaxMatch[0]}`;
        const bRes = await fetch(bolumlerUrl, {
          headers: Object.assign({}, HEADERS, {
            'X-Requested-With': 'XMLHttpRequest',
            'token': token,
            'Referer': animeHref
          })
        });
        if (bRes.ok) {
          const bHtml = await bRes.text();
          const epRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
          let m;
          const seen = new Set();
          while ((m = epRegex.exec(bHtml)) !== null) {
            const attrs = m[1];
            const text = m[2].replace(/<[^>]+>/g, '').trim();
            if (attrs.includes('/video/')) {
              const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
              if (hrefMatch) {
                const rawUrl = hrefMatch[1];
                const epSlug = rawUrl.replace(/^.*?\/video\//, '').replace(/\/$/, '');
                if (epSlug && !seen.has(epSlug)) {
                  seen.add(epSlug);
                  const bolumMatch = text.match(/(\d+)\s*\.?\s*(?:bölüm|bolum)/i) || epSlug.match(/-(\d+)-bolum/i);
                  const epNum = bolumMatch ? parseInt(bolumMatch[1]) : (videos.length + 1);
                  const sezonMatch = text.match(/(\d+)\s*\.?\s*(?:sezon|season)/i);
                  const seasonNum = sezonMatch ? parseInt(sezonMatch[1]) : 1;
                  videos.push({
                    id: `turkanime:ep:${epSlug}`,
                    title: `${epNum}. Bölüm`,
                    season: seasonNum,
                    episode: epNum
                  });
                }
              }
            }
          }
          videos.sort((a, b) => a.episode - b.episode);
        }
      } catch (e) {}
    }

    return {
      meta: {
        id: rawId,
        type: 'tv',
        name: title,
        poster: poster,
        background: poster,
        description: `${title} - TurkAnime TV`,
        genres: ['Anime', 'TurkAnime'],
        videos: videos
      }
    };
  } catch (e) {
    return { meta: null };
  }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  try {
    let epHref = null;
    let animeHref = null;

    if (typeof tmdbId === 'string' && tmdbId.startsWith('turkanime:ep:')) {
      const epSlug = tmdbId.replace(/^turkanime:ep:/, '').replace(/^\//, '');
      epHref = `${BASE_URL}/video/${epSlug}`;
    } else if (typeof tmdbId === 'string' && tmdbId.startsWith('turkanime:')) {
      const slug = tmdbId.replace(/^turkanime:(?:anime:|ep:)?/, '');
      animeHref = `${BASE_URL}/anime/${slug}`;
    }

    const info = await resolveMediaInfo(tmdbId, mediaType, seasonNum, episodeNum);
    const finalEpisode = info.episode;
    const finalSeason = info.season;

    if (!animeHref && !epHref) {
      const queries = info.queries;
      if (!queries || queries.length === 0) return [];

      // 1. Direct slug prediction across all queries (Romaji, English, etc.)
      const slugCandidates = [];
      for (const q of queries) {
        const s = toSlug(q);
        if (s && s.length >= 2 && !slugCandidates.includes(s)) {
          slugCandidates.push(s);
          if (q.includes(':') || q.includes('-')) {
            const base = toSlug(q.split(/[:\-]/)[0]);
            if (base && base.length >= 2 && !slugCandidates.includes(base)) {
              slugCandidates.push(base);
            }
          }
        }
      }

      for (const s of slugCandidates) {
        const testUrl = `${BASE_URL}/anime/${s}`;
        try {
          const tRes = await fetch(testUrl, { headers: HEADERS });
          if (tRes.ok) {
            const tHtml = await tRes.text();
            if (tHtml.includes('ajax/bolumler&animeId=')) {
              animeHref = testUrl;
              break;
            }
          }
        } catch (e) {}
      }

      // 2. Search fallback
      if (!animeHref) {
        for (const q of queries.slice(0, 6)) {
          try {
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
            const qClean = ultraClean(q);
            while ((match = itemRegex.exec(searchHtml)) !== null) {
              const h = match[1];
              const t = match[2].replace(/<[^>]+>/g, '').trim();
              candidates.push({ href: h, title: t });
              const cClean = ultraClean(t);
              if (cClean === qClean || (qClean && cClean.includes(qClean)) || (cClean && qClean.includes(cClean))) {
                animeHref = h;
                break;
              }
            }
            if (animeHref) break;
            if (!animeHref && candidates.length > 0) {
              animeHref = candidates[0].href;
              break;
            }
          } catch (e) {}
        }
      }
    }

    if (!epHref) {
      if (!animeHref) return [];
      if (animeHref.startsWith('//')) animeHref = 'https:' + animeHref;
      else if (!animeHref.startsWith('http')) animeHref = `${BASE_URL}/${animeHref.replace(/^\//, '')}`;

      const detRes = await fetch(animeHref, { headers: HEADERS });
      if (!detRes.ok) return [];
      const detHtml = await detRes.text();

      const ajaxMatch = detHtml.match(/ajax\/bolumler&animeId=(\d+)/i);
      if (!ajaxMatch) return [];

      const tokenMatch = detHtml.match(/<meta[^>]*name=["']_token["'][^>]*content=["']([^"']+)["']/i) ||
                         detHtml.match(/token\s*=\s*['"]([^'"]+)['"]/);
      const token = tokenMatch ? tokenMatch[1] : '';

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

      const epRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
      let epMatch;
      const candidates = [];

      while ((epMatch = epRegex.exec(bHtml)) !== null) {
        const attrs = epMatch[1];
        const text = epMatch[2].replace(/<[^>]+>/g, '').trim();
        if (attrs.includes('/video/')) {
          const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
          const titleMatch = attrs.match(/title=["']([^"']+)["']/i);
          if (hrefMatch) {
            const h = hrefMatch[1];
            const t = titleMatch ? titleMatch[1] : text;
            candidates.push({ href: h, text: t });

            const epNumMatch = t.match(/(\d+)\s*\.?\s*(?:bölüm|bolum)/i) ||
                               h.match(/-(\d+)-bolum/i) ||
                               text.match(/(\d+)\s*$/);
            if (epNumMatch && parseInt(epNumMatch[1]) === finalEpisode) {
              epHref = h;
              break;
            }
          }
        }
      }

      if (!epHref && candidates.length > 0) {
        if (!info.isTv || candidates.length === 1 || finalEpisode === 1) {
          epHref = candidates[0].href;
        }
      }
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
        if (ifrMatch && (ifrMatch[1].includes('sibnet.ru') || ifrMatch[1].includes('shell.php'))) {
          const sib = await resolveSibnet(ifrMatch[1]);
          if (sib && sib.url && !seenUrls.has(sib.url)) {
            seenUrls.add(sib.url);
            streams.push({
              name: 'TurkAnime - Sibnet',
              title: 'TurkAnime | Sibnet [1080p MP4]',
              url: sib.url,
              quality: '1080p',
              headers: sib.headers,
              behaviorHints: {
                notWebReady: true,
                proxyHeaders: {
                  request: sib.headers
                }
              }
            });
          }
        }

        // 3. SIBNET Button search directly inside pHtml
        const sibButtons = [...pHtml.matchAll(/IndexIcerik\(\s*['"]([^'"]+)['"][\s\S]*?SIBNET/gi)].map(m => m[1]);
        for (const sRel of sibButtons) {
          const sFull = `${BASE_URL}/${sRel.replace(/^\//, '')}`;
          const sRes = await fetch(sFull, {
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
                headers: sib.headers,
                behaviorHints: {
                  notWebReady: true,
                  proxyHeaders: {
                    request: sib.headers
                  }
                }
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
