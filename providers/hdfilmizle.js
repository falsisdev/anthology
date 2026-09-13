/**
 * Anthology - HDFilmIzle Provider (Ink + Vip)
 * https://www.hdfilmizle.ink / https://www.hdfilmizle.vip
 * Film arşivi; admin-ajax get_video_url köprüsü üzerinden setplay/fastplay
 * 1080p HLS master akışları (TR/EN altyazı).
 * Kaynak: Cloudstream HDFilmIzle (SetPlay) mantığının Nuvio JS uyarlaması.
 */

var CONFIG = (typeof require !== 'undefined' ? (function(){ try { return require('./config'); } catch(e) { return require('./urls'); } })() : null) || (typeof globalThis !== 'undefined' ? (globalThis.CONFIG || globalThis.URLS) : null) || {};
var URLS = CONFIG.urls || CONFIG;
var BASES = (URLS.hdfilmizle && URLS.hdfilmizle.bases) || ['https://www.hdfilmizle.ink', 'https://www.hdfilmizle.vip'];
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36';

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

function headersFor(base) {
    return {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
        'Referer': base + '/'
    };
}

async function resolveTmdbInfo(id) {
    try {
        var cleanId = String(id || '').trim();
        if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];
        var title = '';
        var origTitle = '';
        if (cleanId.startsWith('tt')) {
            var findRes = await fetchWithTimeout('https://api.themoviedb.org/3/find/' + cleanId + '?api_key=' + TMDB_API_KEY + '&external_source=imdb_id', {}, 10000);
            if (findRes.ok) {
                var fd = await findRes.json();
                var match = (fd.movie_results && fd.movie_results[0]) || (fd.tv_results && fd.tv_results[0]);
                if (match) {
                    title = match.title || match.name || '';
                    origTitle = match.original_title || match.original_name || '';
                }
            }
        } else {
            var tRes = await fetchWithTimeout('https://api.themoviedb.org/3/movie/' + cleanId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR', {}, 10000);
            if (tRes.ok) {
                var td = await tRes.json();
                title = td.title || '';
                origTitle = td.original_title || '';
            }
        }
        return { title: title, origTitle: origTitle };
    } catch (e) {
        return { title: '', origTitle: '' };
    }
}

function parseCards(html, base) {
    var out = [];
    var seen = new Set();
    var re = /<article[^>]+class="[^"]*\bitem\b[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
        var inner = m[1];
        var hrefMatch = inner.match(/<div[^>]+class="[^"]*poster[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"/i) ||
                        inner.match(/<a[^>]+href="([^"]+\/film\/[^"]+)"[^>]*>/i);
        if (!hrefMatch) continue;
        var href = hrefMatch[1];
        if (href.startsWith('/')) href = base + href;
        if (!href.startsWith('http') || seen.has(href)) continue;
        var titleMatch = inner.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i);
        var imgMatch = inner.match(/<img[^>]+data-src="([^"]+)"/i) || inner.match(/<img[^>]+src="(https?:[^"]+)"/i);
        var altMatch = inner.match(/<img[^>]+alt="([^"]*)"/i);
        var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : (altMatch ? altMatch[1].trim() : '');
        if (!title) continue;
        seen.add(href);
        out.push({ title: title, href: href, poster: imgMatch ? imgMatch[1] : '', base: base });
    }
    return out;
}

async function searchAll(query) {
    var all = [];
    for (var i = 0; i < BASES.length; i++) {
        try {
            var base = BASES[i];
            var res = await fetchWithTimeout(base + '/?s=' + encodeURIComponent(query), { headers: headersFor(base) }, 15000);
            if (!res.ok) continue;
            var cards = parseCards(await res.text(), base);
            for (var j = 0; j < cards.length; j++) all.push(cards[j]);
            if (all.length > 0) break;
        } catch (e) {}
    }
    return all;
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

function spgDecode(n, o) {
    try {
        var a, b;
        if (typeof Buffer !== 'undefined') {
            a = Buffer.from(n, 'base64').toString('binary');
            b = Buffer.from(o, 'base64').toString('binary');
        } else if (typeof atob === 'function') {
            a = atob(n);
            b = atob(o);
        } else {
            return null;
        }
        var s = '';
        for (var i = 0; i < a.length; i++) {
            s += String.fromCharCode(a.charCodeAt(i) ^ b.charCodeAt(i % b.length));
        }
        return s.split('|')[0];
    } catch (e) {
        return null;
    }
}

function makeXSp(sp, spT) {
    try {
        var rnd = Math.floor(Math.random() * 2176782336).toString(36);
        var proof = sp + '|' + spT + '|' + rnd;
        var h = 0x811c9dc5 >>> 0;
        for (var i = 0; i < proof.length; i++) {
            h ^= proof.charCodeAt(i);
            h = Math.imul(h, 0x01000193) >>> 0;
        }
        return spT + '.' + rnd + '.' + h.toString(16);
    } catch (e) {
        return '';
    }
}

async function resolveFastplay(fastplayUrl, fastplayRef) {
    try {
        var fpRes = await fetchWithTimeout(fastplayUrl, {
            headers: { 'User-Agent': UA, 'Referer': fastplayRef }
        }, 15000);
        if (!fpRes.ok) return null;
        var fpHtml = await fpRes.text();
        var spMatch = fpHtml.match(/"sp"\s*:\s*"([^"]+)"/);
        var spTMatch = fpHtml.match(/"spT"\s*:\s*(\d+)/);
        var manMatch = fpHtml.match(/(?:src|stream)\s*:\s*"(\/manifests\/[^"]+)"/);
        if (!spMatch || !spTMatch || !manMatch) return null;
        var fpOrigin = fastplayUrl.match(/^(https?:\/\/[^/]+)/)[1];
        var manifestUrl = fpOrigin + manMatch[1].replace(/&amp;/g, '&');
        var subs = [];
        var subRe = /"file"\s*:\s*"(https?:[^"]+\.vtt)"\s*,\s*"label"\s*:\s*"([^"]+)"\s*,\s*"lang"\s*:\s*"([^"]+)"/gi;
        var sm;
        while ((sm = subRe.exec(fpHtml)) !== null) {
            subs.push({ id: sm[3], lang: sm[3], url: sm[1].replace(/\\\//g, '/') });
        }
        return { manifestUrl: manifestUrl, sp: spMatch[1], spT: spTMatch[1], subtitles: subs, referer: fpRes.url || fastplayUrl };
    } catch (e) {
        return null;
    }
}

async function extractStreamsFromFilmPage(pageUrl, base) {
    var streams = [];
    try {
        var res = await fetchWithTimeout(pageUrl, { headers: headersFor(base) }, 15000);
        if (!res.ok) return [];
        var html = await res.text();

        var ajaxMatch = html.match(/["'](https?:[^"']*wp-admin\/admin-ajax\.php)["']/);
        var ajaxUrl = ajaxMatch ? ajaxMatch[1].replace(/\\\//g, '/') : (base + '/wp-admin/admin-ajax.php');
        var nonceMatches = [...html.matchAll(/data-nonce="([a-z0-9]+)"/gi)].map(function(m){return m[1];});
        var ajaxVideoNonce = (html.match(/window\.STF_AJAX[\s\S]*?video\s*:\s*"([a-z0-9]+)"/)||[])[1] || '';
        var nonces = [];
        if (ajaxVideoNonce) nonces.push(ajaxVideoNonce);
        for (var _ni=0; _ni<nonceMatches.length; _ni++) if (nonces.indexOf(nonceMatches[_ni])===-1) nonces.push(nonceMatches[_ni]);
        if (nonces.length===0) return [];

        var players = [];
        var seenP = new Set();
        var postIds = [];
        var piRe = /data-post-id="([^"]+)"/gi;
        var pim;
        while ((pim = piRe.exec(html)) !== null) {
            if (pim[1] && pim[1].indexOf('event') === -1 && pim[1].indexOf('$') === -1 && postIds.indexOf(pim[1]) === -1) postIds.push(pim[1]);
        }
        var btnRe = /data-player-name="([^"]+)"[^>]*data-part-key="([^"]*)"/gi;
        var bm;
        var btns = [];
        while ((bm = btnRe.exec(html)) !== null) {
            if (bm[1].indexOf('$') !== -1) continue;
            btns.push({ name: bm[1], key: bm[2] || '' });
        }
        postIds.forEach(function(pid) {
            btns.forEach(function(b) {
                var k = pid + '|' + b.name + '|' + b.key;
                if (!seenP.has(k)) {
                    seenP.add(k);
                    players.push({ id: pid, name: b.name, key: b.key });
                }
            });
        });
        if (players.length === 0) return [];

        var seenUrls = new Set();
        for (var i = 0; i < Math.min(players.length, 4); i++) {
            var gotStreamForPlayer = false;
            for (var nIdx=0; nIdx<nonces.length && !gotStreamForPlayer; nIdx++) {
            try {
                var pl = players[i];
                var form = new URLSearchParams();
                form.append('action', 'get_video_url');
                form.append('nonce', nonces[nIdx]);
                form.append('post_id', pl.id);
                form.append('player_name', pl.name);
                form.append('part_key', pl.key);
                var aRes = await fetchWithTimeout(ajaxUrl, {
                    method: 'POST',
                    headers: {
                        'User-Agent': UA,
                        'Referer': pageUrl,
                        'X-Requested-With': 'XMLHttpRequest',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: form.toString()
                }, 15000);
                if (!aRes.ok) continue;
                var aj = await aRes.json();
                if (!aj || aj.success===false) continue;
                var setplayUrl = aj && aj.data && ((aj.data.stream && aj.data.stream.url) || aj.data.url);
                if (!setplayUrl) continue;
                setplayUrl = setplayUrl.replace(/\\\//g, '/');
                if (seenUrls.has(setplayUrl)) { gotStreamForPlayer=true; continue; }
                seenUrls.add(setplayUrl);

                var spRes = await fetchWithTimeout(setplayUrl, {
                    headers: { 'User-Agent': UA, 'Referer': pageUrl }
                }, 15000);
                if (!spRes.ok) continue;
                var spHtml = await spRes.text();
                var cerMatch = spHtml.match(/SPG\.cerceve\(\s*"[^"]*"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/);
                var fastplayUrl = cerMatch ? spgDecode(cerMatch[1], cerMatch[2]) : null;
                if (!fastplayUrl) {
                    var fMatch = spHtml.match(/https?:\/\/fastplay\.[a-z]+\/stfplay\.php\?[^"'<>\s\\]+/i);
                    if (fMatch) fastplayUrl = fMatch[0].replace(/\\+/g, '');
                }
                if (!fastplayUrl || !fastplayUrl.startsWith('http')) continue;

                var fp = await resolveFastplay(fastplayUrl, spRes.url || setplayUrl);
                if (!fp || !fp.manifestUrl) continue;

                var xsp = makeXSp(fp.sp, fp.spT);
                var sHeaders = { 'User-Agent': UA, 'Referer': fp.referer, 'X-Sp': xsp };
                streams.push({
                    name: 'HDFilmIzle',
                    title: '⌜ HDFilmIzle ⌟ | FastPlay (1080p HLS)',
                    url: fp.manifestUrl + '#.m3u8',
                    quality: '1080p',
                    provider: 'hdfilmizle',
                    headers: sHeaders,
                    format: 'hls',
                    isHls: true,
                    behaviorHints: { notWebReady: true, proxyHeaders: { request: sHeaders } },
                    subtitles: fp.subtitles || []
                });
                gotStreamForPlayer=true;
                if (streams.length > 0) break;
            } catch (e) {}
            }
        }
    } catch (e) {}
    return streams;
}

async function getCatalog(args) {
    try {
        var query = (args && args.search) || (args && args.extra && args.extra.search) || (args && args.query) || '';
        var base = BASES[0];
        var url = query ? (base + '/?s=' + encodeURIComponent(query)) : (base + '/film/');
        var res = await fetchWithTimeout(url, { headers: headersFor(base) }, 15000);
        if (!res.ok) return { metas: [] };
        var cards = parseCards(await res.text(), base);
        var metas = cards.slice(0, 30).map(function(c) {
            return {
                id: 'hdfilmizle:movie:' + encodeURIComponent(c.href),
                type: 'movie',
                name: c.title,
                poster: c.poster || 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
                background: c.poster || 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
                genres: ['Film', 'HDFilmIzle'],
                description: c.title + ' - HDFilmIzle'
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
        if (!rawId || !rawId.startsWith('hdfilmizle:')) return { meta: null };
        var href = decodeURIComponent(rawId.split(':').slice(2).join(':'));
        var base = BASES[0];
        for (var i = 0; i < BASES.length; i++) {
            if (href.indexOf(BASES[i]) === 0) { base = BASES[i]; break; }
        }
        var res = await fetchWithTimeout(href, { headers: headersFor(base) }, 15000);
        if (!res.ok) return { meta: null };
        var html = await res.text();
        var titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'HDFilmIzle';
        var ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        var poster = ogImg ? ogImg[1] : 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';
        return {
            meta: {
                id: rawId, type: 'movie', name: title, poster: poster, background: poster,
                description: title + ' - HDFilmIzle',
                genres: ['Film', 'HDFilmIzle'],
                videos: [{ id: rawId, title: title, released: new Date().toISOString().split('T')[0] }]
            }
        };
    } catch (e) {
        return { meta: null };
    }
}

async function getStreams(tmdbIdOrArgs, mediaType) {
    try {
        if (typeof tmdbIdOrArgs === 'object' && tmdbIdOrArgs && tmdbIdOrArgs.id) {
            return getStreams(tmdbIdOrArgs.id, mediaType);
        }
        if (typeof tmdbIdOrArgs === 'string' && tmdbIdOrArgs.startsWith('hdfilmizle:movie:')) {
            var href = decodeURIComponent(tmdbIdOrArgs.split(':').slice(2).join(':'));
            var b = BASES[0];
            for (var i = 0; i < BASES.length; i++) {
                if (href.indexOf(BASES[i]) === 0) { b = BASES[i]; break; }
            }
            return await extractStreamsFromFilmPage(href, b);
        }

        var info = await resolveTmdbInfo(tmdbIdOrArgs);
        var searchTitles = [info.title, info.origTitle].filter(Boolean);
        if (searchTitles.length === 0) return [];

        for (var t = 0; t < searchTitles.length; t++) {
            var cards = await searchAll(searchTitles[t]);
            if (!cards || cards.length === 0) continue;
            var best = pickBest(cards, searchTitles[t]);
            if (!best) continue;
            var streams = await extractStreamsFromFilmPage(best.href, best.base);
            if (streams.length > 0) return streams;
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
