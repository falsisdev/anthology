/**
 * Anthology - KultFilmler Provider
 * https://kultfilmler.net
 * Film + dizi arşivi; VidMoly / Vidpapi (securedLink API) üzerinden HLS akışları.
 * Kaynak: Cloudstream KultFilmler mantığının Nuvio JS uyarlaması.
 */

var BASE_URL = 'https://kultfilmler.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
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

function fetchWithTimeout(url, options, ms) {
    var opts = options || {};
    try {
        if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
            opts.signal = AbortSignal.timeout(ms || 15000);
        }
    } catch (e) {}
    return fetch(url, opts);
}

async function resolveTmdbInfo(id, mediaType) {
    try {
        var cleanId = String(id || '').trim();
        if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];
        var numericId = null;
        var title = '';
        var origTitle = '';
        if (cleanId.startsWith('tt')) {
            var findRes = await fetchWithTimeout('https://api.themoviedb.org/3/find/' + cleanId + '?api_key=' + TMDB_API_KEY + '&external_source=imdb_id', {}, 10000);
            if (findRes.ok) {
                var fd = await findRes.json();
                var match = (mediaType === 'tv' || mediaType === 'series')
                    ? (fd.tv_results && fd.tv_results[0])
                    : (fd.movie_results && fd.movie_results[0]);
                if (!match) match = (fd.movie_results && fd.movie_results[0]) || (fd.tv_results && fd.tv_results[0]);
                if (match) {
                    title = match.name || match.title || '';
                    origTitle = match.original_name || match.original_title || '';
                    numericId = match.id;
                }
            }
        } else {
            numericId = cleanId;
            var type = (mediaType === 'tv' || mediaType === 'series') ? 'tv' : 'movie';
            var tRes = await fetchWithTimeout('https://api.themoviedb.org/3/' + type + '/' + numericId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR', {}, 10000);
            if (tRes.ok) {
                var td = await tRes.json();
                title = td.name || td.title || '';
                origTitle = td.original_name || td.original_title || '';
            }
        }
        return { title: title, origTitle: origTitle, numericId: numericId };
    } catch (e) {
        return { title: '', origTitle: '', numericId: id };
    }
}

function absUrl(href) {
    if (!href) return null;
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    if (href.startsWith('/')) return BASE_URL + href;
    return BASE_URL + '/' + href;
}

function parseCards(html) {
    var out = [];
    var seen = new Set();
    var re = /<a[^>]+class="[^"]*\bmcard\b[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
        var href = absUrl(m[1]);
        if (!href || seen.has(href)) continue;
        var inner = m[2];
        var titleMatch = inner.match(/<div[^>]+class="[^"]*\bmtx\b[^"]*"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/i);
        var imgAlt = inner.match(/<img[^>]+class="[^"]*\bpimg\b[^"]*"[^>]*alt="([^"]*)"/i) || inner.match(/<img[^>]+alt="([^"]*)"[^>]*class="[^"]*\bpimg\b[^"]*"/i);
        var imgSrc = inner.match(/<img[^>]+class="[^"]*\bpimg\b[^"]*"[^>]*(?:src|data-src)="([^"]+)"/i) || inner.match(/<img[^>]*(?:src|data-src)="([^"]+)"[^>]*class="[^"]*\bpimg\b[^"]*"/i);
        var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : (imgAlt ? imgAlt[1].trim() : '');
        if (!title) continue;
        seen.add(href);
        out.push({
            title: title,
            href: href,
            poster: imgSrc ? absUrl(imgSrc[1]) : '',
            isTv: href.includes('/dizi/')
        });
    }
    return out;
}

async function searchSite(query) {
    try {
        var res = await fetchWithTimeout(BASE_URL + '/?s=' + encodeURIComponent(query), { headers: HEADERS }, 15000);
        if (!res.ok) return [];
        return parseCards(await res.text());
    } catch (e) {
        return [];
    }
}

function pickBest(cards, title) {
    if (!cards || cards.length === 0) return null;
    var cleanTarget = ultraClean(title);
    for (var i = 0; i < cards.length; i++) {
        if (ultraClean(cards[i].title) === cleanTarget) return cards[i];
    }
    for (var j = 0; j < cards.length; j++) {
        var c = ultraClean(cards[j].title);
        if (c.includes(cleanTarget) || cleanTarget.includes(c)) return cards[j];
    }
    return cards[0];
}

function pushHls(streams, seenUrls, url, label, referer, subs) {
    if (!url || seenUrls.has(url)) return;
    seenUrls.add(url);
    var sHeaders = { 'User-Agent': HEADERS['User-Agent'], 'Referer': referer || (BASE_URL + '/') };
    streams.push({
        name: 'KultFilmler',
        title: '⌜ KultFilmler ⌟ | ' + label,
        url: url,
        quality: '1080p',
        provider: 'kultfilmler',
        headers: sHeaders,
        format: 'hls',
        isHls: true,
        behaviorHints: { notWebReady: true, proxyHeaders: { request: sHeaders } },
        subtitles: subs || []
    });
}

function extractVttSubs(html, base) {
    var subs = [];
    var seen = new Set();
    var re = /https?:\/\/[^\s"'\\]+\.vtt/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
        var u = m[0];
        if (seen.has(u) || u.includes('thumbnails')) continue;
        seen.add(u);
        var lang = /tur/i.test(u) ? 'tur' : (/eng/i.test(u) ? 'eng' : 'tur');
        subs.push({ id: lang, lang: lang, url: u });
    }
    return subs;
}

async function resolveVidmoly(iframeUrl, pageUrl, streams, seenUrls) {
    try {
        var r = await fetchWithTimeout(iframeUrl, {
            headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': pageUrl, 'Sec-Fetch-Dest': 'iframe' }
        }, 15000);
        if (!r.ok) return;
        var t = await r.text();
        var m = t.match(/file\s*:\s*"([^"]+)"/);
        if (m && m[1].includes('.m3u8')) {
            pushHls(streams, seenUrls, m[1], 'VidMoly (HLS)', BASE_URL + '/', extractVttSubs(t));
        }
    } catch (e) {}
}

async function resolveVidpapi(iframeUrl, pageUrl, streams, seenUrls) {
    try {
        var videoId = iframeUrl.split('/').filter(Boolean).pop();
        if (!videoId) return;
        var r = await fetchWithTimeout(iframeUrl, {
            headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': pageUrl }
        }, 15000);
        if (!r.ok) return;
        var setCookie = '';
        try {
            if (typeof r.headers.getSetCookie === 'function') {
                var cookies = r.headers.getSetCookie();
                for (var i = 0; i < cookies.length; i++) {
                    if (cookies[i].includes('fireplayer_player=')) {
                        setCookie = cookies[i].split(';')[0];
                        break;
                    }
                }
            } else {
                var sc = r.headers.get('set-cookie') || '';
                var cm = sc.match(/fireplayer_player=([^;]+)/);
                if (cm) setCookie = 'fireplayer_player=' + cm[1];
            }
        } catch (e) {}
        var iHtml = await r.text();
        var form = new URLSearchParams();
        form.append('data', videoId);
        form.append('do', 'getVideo');
        var apiHeaders = {
            'User-Agent': HEADERS['User-Agent'],
            'Referer': iframeUrl,
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        };
        if (setCookie) apiHeaders['Cookie'] = setCookie;
        var apiRes = await fetchWithTimeout('https://vidpapi.xyz/player/index.php?data=' + encodeURIComponent(videoId) + '&do=getVideo', {
            method: 'POST',
            headers: apiHeaders,
            body: form.toString()
        }, 15000);
        if (!apiRes.ok) return;
        var apiText = await apiRes.text();
        var secMatch = apiText.match(/securedLink"\s*:\s*"([^"]+)"/);
        if (secMatch) {
            var secured = secMatch[1].replace(/\\\//g, '/');
            pushHls(streams, seenUrls, secured, 'Vidpapi (HLS)', BASE_URL + '/', extractVttSubs(iHtml));
        }
    } catch (e) {}
}

async function resolveGeneric(iframeUrl, pageUrl, streams, seenUrls) {
    try {
        var r = await fetchWithTimeout(iframeUrl, {
            headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': pageUrl }
        }, 15000);
        if (!r.ok) return;
        var t = await r.text();
        var found = false;
        var m3u8Re = /https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/gi;
        var mm;
        while ((mm = m3u8Re.exec(t)) !== null) {
            var u = mm[0];
            if (/preview|thumb|sprite/i.test(u)) continue;
            pushHls(streams, seenUrls, u, 'Direct (HLS)', iframeUrl, extractVttSubs(t));
            found = true;
        }
        if (!found) {
            var fm = t.match(/file\s*:\s*["'](https?:[^"']+\.(?:m3u8|mp4)[^"']*)["']/i);
            if (fm) pushHls(streams, seenUrls, fm[1], 'Direct (HLS)', iframeUrl, extractVttSubs(t));
        }
    } catch (e) {}
}

async function extractStreamsFromContentPage(pageUrl) {
    var streams = [];
    try {
        var res = await fetchWithTimeout(pageUrl, { headers: HEADERS }, 15000);
        if (!res.ok) return [];
        var html = await res.text();
        var seenUrls = new Set();
        var iframes = [];

        var r1 = html.match(/<div[^>]+id="player"[^>]*>[\s\S]*?<iframe[^>]+src="([^"]+)"/i);
        if (r1) iframes.push(r1[1]);
        var r2 = html.match(/<div[^>]+class="[^"]*kf-embed[^"]*"[^>]*>[\s\S]*?<iframe[^>]+src="([^"]+)"/i);
        if (r2 && iframes.indexOf(r2[1]) === -1) iframes.push(r2[1]);
        var srcData = html.match(/<script[^>]+id="kf-srcdata"[^>]*>([\s\S]*?)<\/script>/i);
        if (srcData) {
            var sr = /src=\\?"([^"\\]+)"/g;
            var sm;
            while ((sm = sr.exec(srcData[1])) !== null) {
                var u = sm[1].replace(/\\\//g, '/');
                if (u.startsWith('//')) u = 'https:' + u;
                if (u.startsWith('http') && iframes.indexOf(u) === -1) iframes.push(u);
            }
        }

        for (var i = 0; i < iframes.length; i++) {
            var iframeUrl = iframes[i];
            if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;
            else if (iframeUrl.startsWith('/')) iframeUrl = BASE_URL + iframeUrl;
            if (iframeUrl.includes('vidmoly')) {
                await resolveVidmoly(iframeUrl, pageUrl, streams, seenUrls);
            } else if (iframeUrl.includes('vidpapi.xyz') || iframeUrl.includes('vidpapi.com')) {
                await resolveVidpapi(iframeUrl, pageUrl, streams, seenUrls);
            } else if (iframeUrl.includes('youtube.com') || iframeUrl.includes('youtu.be')) {
                continue;
            } else {
                await resolveGeneric(iframeUrl, pageUrl, streams, seenUrls);
            }
            if (streams.length > 0) break;
        }
    } catch (e) {}
    return streams;
}

async function getCatalog(args) {
    try {
        var query = (args && args.search) || (args && args.extra && args.extra.search) || (args && args.query) || '';
        var url = query ? (BASE_URL + '/?s=' + encodeURIComponent(query)) : (BASE_URL + '/category/aksiyon-filmleri-izle/');
        var res = await fetchWithTimeout(url, { headers: HEADERS }, 15000);
        if (!res.ok) return { metas: [] };
        var cards = parseCards(await res.text());
        var metas = cards.filter(function(c) { return !c.isTv; }).slice(0, 30).map(function(c) {
            return {
                id: 'kultfilmler:movie:' + encodeURIComponent(c.href),
                type: 'movie',
                name: c.title,
                poster: c.poster || 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
                background: c.poster || 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
                genres: ['Film', 'KultFilmler'],
                description: c.title + ' - KultFilmler'
            };
        });
        return { metas: metas };
    } catch (e) {
        return { metas: [] };
    }
}

async function getMeta(args) {
    try {
        var rawId = (typeof args === 'string') ? args : (args && args.id ? args.id : '');
        if (!rawId || !rawId.startsWith('kultfilmler:')) return { meta: null };
        var href = decodeURIComponent(rawId.split(':').slice(2).join(':'));
        var res = await fetchWithTimeout(href, { headers: HEADERS }, 15000);
        if (!res.ok) return { meta: null };
        var html = await res.text();
        var titleMatch = html.match(/<h1[^>]+class="[^"]*sec-h[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
                         html.match(/<h2[^>]+class="[^"]*sec-h[^"]*"[^>]*>([\s\S]*?)<\/h2>/i) ||
                         html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').replace(/İzle\s*$/i, '').trim() : 'KultFilmler';
        var ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        var poster = ogImg ? ogImg[1] : 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';

        if (href.includes('/dizi/')) {
            var videos = [];
            var seen = new Set();
            var epRe = /<a[^>]+class="[^"]*\bep\b[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
            var em;
            while ((em = epRe.exec(html)) !== null) {
                var epHref = absUrl(em[1]);
                if (!epHref || seen.has(epHref)) continue;
                var epTxt = em[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
                var sM = epTxt.match(/(\d+)\.\s*Sezon/i) || em[0].match(/data-season="(\d+)"/i);
                var eM = epTxt.match(/(\d+)\.\s*Bölüm/i);
                var sN = sM ? parseInt(sM[1]) : 1;
                var eN = eM ? parseInt(eM[1]) : (videos.length + 1);
                seen.add(epHref);
                videos.push({
                    id: 'kultfilmler:ep:' + encodeURIComponent(epHref),
                    title: epTxt || (sN + '. Sezon ' + eN + '. Bölüm'),
                    season: sN,
                    episode: eN
                });
            }
            videos.sort(function(a, b) { return (a.season - b.season) || (a.episode - b.episode); });
            return {
                meta: {
                    id: rawId, type: 'tv', name: title, poster: poster, background: poster,
                    description: title + ' - KultFilmler',
                    genres: ['Yabancı Dizi', 'KultFilmler'],
                    videos: videos
                }
            };
        }

        return {
            meta: {
                id: rawId, type: 'movie', name: title, poster: poster, background: poster,
                description: title + ' - KultFilmler',
                genres: ['Film', 'KultFilmler'],
                videos: [{ id: rawId, title: title, released: new Date().toISOString().split('T')[0] }]
            }
        };
    } catch (e) {
        return { meta: null };
    }
}

async function getStreams(tmdbIdOrArgs, mediaType, seasonNum, episodeNum) {
    try {
        if (typeof tmdbIdOrArgs === 'object' && tmdbIdOrArgs && tmdbIdOrArgs.id) {
            return getStreams(tmdbIdOrArgs.id, mediaType, seasonNum, episodeNum);
        }
        if (typeof tmdbIdOrArgs === 'string' && tmdbIdOrArgs.startsWith('kultfilmler:ep:')) {
            return await extractStreamsFromContentPage(decodeURIComponent(tmdbIdOrArgs.replace('kultfilmler:ep:', '')));
        }
        if (typeof tmdbIdOrArgs === 'string' && (tmdbIdOrArgs.startsWith('kultfilmler:show:') || tmdbIdOrArgs.startsWith('kultfilmler:movie:'))) {
            if (tmdbIdOrArgs.startsWith('kultfilmler:show:')) {
                var meta = await getMeta(tmdbIdOrArgs);
                var vids = (meta && meta.meta && meta.meta.videos) || [];
                var tgt = vids.find(function(v) {
                    return v.season === (parseInt(seasonNum) || 1) && v.episode === (parseInt(episodeNum) || 1);
                }) || vids[0];
                if (tgt) return await getStreams(tgt.id);
                return [];
            }
            return await extractStreamsFromContentPage(decodeURIComponent(tmdbIdOrArgs.split(':').slice(2).join(':')));
        }

        var season = parseInt(seasonNum) || 1;
        var episode = parseInt(episodeNum) || 1;
        var info = await resolveTmdbInfo(tmdbIdOrArgs, mediaType);
        var searchTitles = [info.title, info.origTitle].filter(Boolean);
        if (searchTitles.length === 0) return [];

        for (var t = 0; t < searchTitles.length; t++) {
            var cards = await searchSite(searchTitles[t]);
            if (!cards || cards.length === 0) continue;
            var wantTv = (mediaType === 'tv' || mediaType === 'series');
            var filtered = cards.filter(function(c) { return wantTv ? c.isTv : !c.isTv; });
            var best = pickBest(filtered.length > 0 ? filtered : cards, searchTitles[t]);
            if (!best) continue;
            if (best.isTv) {
                var showMeta = await getMeta('kultfilmler:show:' + encodeURIComponent(best.href));
                var vids2 = (showMeta && showMeta.meta && showMeta.meta.videos) || [];
                var match = vids2.find(function(v) { return v.season === season && v.episode === episode; });
                if (match) {
                    var epStreams = await getStreams(match.id);
                    if (epStreams.length > 0) return epStreams;
                }
            } else {
                var mStreams = await extractStreamsFromContentPage(best.href);
                if (mStreams.length > 0) return mStreams;
            }
        }
        return [];
    } catch (e) {
        return [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams, getMeta, getCatalog };
}
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
    globalThis.getMeta = getMeta;
    globalThis.getCatalog = getCatalog;
}
