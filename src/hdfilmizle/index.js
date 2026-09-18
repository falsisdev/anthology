const { sortStreamsByQuality } = require("../shared/quality.js");
/**
 * Anthology - HDFilmIzle Provider (Vip + Ink)
 * https://www.hdfilmizle.vip / https://www.hdfilmizle.ink
 * Film arşivi; Vidrame, Vidmoxy ve FastPlay 1080p HLS master akışları (TR/EN altyazı).
 */

var BASES = ['https://www.hdfilmizle.vip', 'https://www.hdfilmizle.ink'];
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

function base64Decode(str) {
    try {
        if (typeof atob === 'function') return atob(str);
        if (typeof Buffer !== 'undefined') return Buffer.from(str, 'base64').toString('binary');
    } catch (e) {}
    return '';
}

function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function(c) {
        var code = c.charCodeAt(0);
        if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + 13) % 26) + 65);
        if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + 13) % 26) + 97);
        return c;
    });
}

function decodeVidmoxy(encoded) {
    try {
        var b64 = base64Decode(encoded);
        if (!b64) return null;
        var reversed = b64.split('').reverse().join('');
        return rot13(reversed);
    } catch (e) {
        return null;
    }
}

function decodeVidrameXor(d, k) {
    try {
        var o = '';
        for (var i = 0; i < d.length; i++) {
            o += String.fromCharCode(d[i] ^ k.charCodeAt(i % k.length) ^ ((i * 17 + 13) & 255));
        }
        return o;
    } catch (e) {
        return null;
    }
}


async function resolveTmdbInfo(id) {
    try {
        var cleanId = String(id || '').trim();
        if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];
        var title = '';
        var origTitle = '';
        var year = null;
        if (cleanId.startsWith('tt')) {
            var findRes = await fetchWithTimeout('https://api.themoviedb.org/3/find/' + cleanId + '?api_key=' + TMDB_API_KEY + '&external_source=imdb_id', {}, 10000);
            if (findRes.ok) {
                var fd = await findRes.json();
                var match = (fd.movie_results && fd.movie_results[0]) || (fd.tv_results && fd.tv_results[0]);
                if (match) {
                    title = match.title || match.name || '';
                    origTitle = match.original_title || match.original_name || '';
                    var rDate = match.release_date || match.first_air_date || '';
                    if (rDate) year = parseInt(rDate.split('-')[0], 10);
                }
            }
        } else {
            var tRes = await fetchWithTimeout('https://api.themoviedb.org/3/movie/' + cleanId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR', {}, 10000);
            if (tRes.ok) {
                var td = await tRes.json();
                title = td.title || '';
                origTitle = td.original_title || '';
                var rd = td.release_date || '';
                if (rd) year = parseInt(rd.split('-')[0], 10);
            }
        }
        return { title: title, origTitle: origTitle, year: year };
    } catch (e) {
        return { title: '', origTitle: '', year: null };
    }
}

function parseCards(html, base) {
    var out = [];
    var seen = new Set();
    var vipRe = /<a[^>]+href="(\/[^"\/]+\/)"[^>]+title="([^"]+)"[^>]+class="[^"]*poster[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    var vm;
    while ((vm = vipRe.exec(html)) !== null) {
        var href = base + vm[1];
        if (seen.has(href)) continue;
        var title = vm[2].trim();
        var imgM = vm[3].match(/data-src="([^"]+)"/i) || vm[3].match(/data-srcset="([^",\s]+)/i) || vm[3].match(/src="([^"]+)"/i);
        var poster = imgM ? (imgM[1].startsWith('http') ? imgM[1] : (base + imgM[1])) : '';
        seen.add(href);
        out.push({ title: title, href: href, poster: poster, base: base });
    }
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

async function searchVip(query) {
    try {
        var base = 'https://www.hdfilmizle.vip';
        var form = new URLSearchParams();
        form.append('query', query);
        var res = await fetchWithTimeout(base + '/search/', {
            method: 'POST',
            headers: {
                'User-Agent': UA,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': base + '/'
            },
            body: form.toString()
        }, 15000);
        if (!res.ok) return [];
        var items = await res.json();
        if (!Array.isArray(items)) return [];
        var out = [];
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (!item || !item.slug) continue;
            var href = base + '/' + item.slug.replace(/^\/+|\/+$/g, '') + '/';
            var poster = item.thumb_url ? (item.thumb_url.startsWith('http') ? item.thumb_url : (base + item.thumb_url)) : '';
            out.push({
                title: item.name || '',
                href: href,
                poster: poster,
                base: base,
                year: item.year ? parseInt(item.year, 10) : null
            });
        }
        return out;
    } catch (e) {
        return [];
    }
}

async function searchAll(query) {
    var vipCards = await searchVip(query);
    if (vipCards && vipCards.length > 0) return vipCards;
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

function pickBest(cards, title, year) {
    if (!cards || cards.length === 0) return null;
    var cleanTarget = ultraClean(title);
    if (year) {
        for (var y = 0; y < cards.length; y++) {
            if (cards[y].year && cards[y].year === year) {
                var cy = ultraClean(cards[y].title);
                if (cy === cleanTarget || cy.includes(cleanTarget) || cleanTarget.includes(cy)) {
                    return cards[y];
                }
            }
        }
    }
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

async function resolveVidrame(vidrameUrl, ref) {
    try {
        var vRes = await fetchWithTimeout(vidrameUrl, {
            headers: { 'User-Agent': UA, 'Referer': ref || 'https://www.hdfilmizle.vip/' }
        }, 15000);
        if (!vRes.ok) return null;
        var vHtml = await vRes.text();

        var streamUrl = '';
        var srcMatch = vHtml.match(/sources\s*:\s*\[\{\s*file\s*:\s*\(function[\s\S]*?\)\((\[[^\]]+\])\s*,\s*["']([^"']+)["']\)/i);
        if (srcMatch) {
            try {
                var d = JSON.parse(srcMatch[1]);
                var k = srcMatch[2];
                streamUrl = decodeVidrameXor(d, k);
            } catch (e) {}
        }
        if (!streamUrl) {
            var anySrc = vHtml.match(/\(\s*(\[[0-9,\s]+\])\s*,\s*["']([a-zA-Z0-9]+)["']\s*\)/);
            if (anySrc) {
                try {
                    streamUrl = decodeVidrameXor(JSON.parse(anySrc[1]), anySrc[2]);
                } catch (e) {}
            }
        }
        if (!streamUrl || !streamUrl.startsWith('http')) return null;

        var subs = [];
        var trMatch = vHtml.match(/configs\.tracks\s*=\s*(\[[\s\S]*?\]);/);
        if (trMatch) {
            try {
                var trList = JSON.parse(trMatch[1]);
                for (var ti = 0; ti < trList.length; ti++) {
                    var t = trList[ti];
                    if (t && t.fx && t.fx.d && t.fx.k) {
                        var sUrl = decodeVidrameXor(t.fx.d, t.fx.k);
                        if (sUrl && sUrl.startsWith('http')) {
                            var lCode = t.language === 'tur' ? 'tr' : (t.language === 'eng' ? 'en' : (t.language || 'tr'));
                            subs.push({
                                id: t.language || 'sub_' + ti,
                                url: sUrl,
                                file: sUrl,
                                link: sUrl,
                                lang: t.language || 'tur',
                                language: lCode,
                                label: t.label || (lCode === 'tr' ? 'Türkçe' : 'English'),
                                name: t.label || (lCode === 'tr' ? 'Türkçe' : 'English'),
                                title: t.label || (lCode === 'tr' ? 'Türkçe' : 'English'),
                                format: 'vtt',
                                type: 'text/vtt',
                                mimeType: 'text/vtt'
                            });
                        }
                    }
                }
            } catch (e) {}
        }
        return { streamUrl: streamUrl, subtitles: subs };
    } catch (e) {
        return null;
    }
}

async function resolveVidmoxy(vidmoxyUrl, ref) {
    try {
        var mRes = await fetchWithTimeout(vidmoxyUrl, {
            headers: { 'User-Agent': UA, 'Referer': ref || 'https://www.hdfilmizle.vip/' }
        }, 15000);
        if (!mRes.ok) return null;
        var mHtml = await mRes.text();

        var streamUrl = '';
        var eeMatch = mHtml.match(/EE\.dd\s*\(\s*["']([^"']+)["']\s*\)/i);
        if (eeMatch) {
            streamUrl = decodeVidmoxy(eeMatch[1]);
        }
        if (!streamUrl || !streamUrl.startsWith('http')) return null;

        var subs = [];
        var trMatch = mHtml.match(/tracks\s*:\s*(\[[\s\S]*?\])/);
        if (trMatch) {
            try {
                var trList = JSON.parse(trMatch[1]);
                for (var ti = 0; ti < trList.length; ti++) {
                    var t = trList[ti];
                    if (t && t.file && typeof t.file === 'string' && t.file.indexOf('.vtt') !== -1) {
                        var sUrl = t.file.startsWith('http') ? t.file : ('https://vidmoxy.net' + (t.file.startsWith('/') ? '' : '/') + t.file);
                        var lCode = t.language === 'tur' ? 'tr' : (t.language === 'eng' ? 'en' : (t.language || 'tr'));
                        subs.push({
                            id: t.language || 'sub_' + ti,
                            url: sUrl,
                            file: sUrl,
                            link: sUrl,
                            lang: t.language || 'tur',
                            language: lCode,
                            label: t.label || (lCode === 'tr' ? 'Türkçe' : 'English'),
                            name: t.label || (lCode === 'tr' ? 'Türkçe' : 'English'),
                            title: t.label || (lCode === 'tr' ? 'Türkçe' : 'English'),
                            format: 'vtt',
                            type: 'text/vtt',
                            mimeType: 'text/vtt'
                        });
                    }
                }
            } catch (e) {}
        }
        return { streamUrl: streamUrl, subtitles: subs };
    } catch (e) {
        return null;
    }
}

async function resolveFastplay(fastplayUrl, fastplayRef) {
    try {
        var fpRes = await fetchWithTimeout(fastplayUrl, {
            headers: { 'User-Agent': UA, 'Referer': fastplayRef }
        }, 15000);
        if (!fpRes.ok) return null;
        var fpHtml = await fpRes.text();
        var manMatch = fpHtml.match(/(?:src|stream)\s*:\s*"(\/manifests\/[^"]+)"/);
        if (!manMatch) return null;
        var fpOrigin = fastplayUrl.match(/^(https?:\/\/[^/]+)/)[1];
        var manifestUrl = fpOrigin + manMatch[1].replace(/&amp;/g, '&');

        var subs = [];
        var subMatch = fpHtml.match(/subtitles\s*:\s*(\[[\s\S]*?\])/);
        if (subMatch) {
            try {
                var arr = JSON.parse(subMatch[1]);
                for (var si = 0; si < arr.length; si++) {
                    var item = arr[si];
                    if (item && item.file && item.file.indexOf('.vtt') !== -1) {
                        var lCode = item.lang === 'tur' ? 'tr' : (item.lang === 'eng' ? 'en' : (item.lang || 'tr'));
                        subs.push({
                            id: item.lang || 'sub_' + si,
                            url: item.file,
                            file: item.file,
                            link: item.file,
                            lang: item.lang || 'tur',
                            language: lCode,
                            label: item.label || (lCode === 'tr' ? 'Türkçe' : 'English'),
                            name: item.label || (lCode === 'tr' ? 'Türkçe' : 'English'),
                            title: item.label || (lCode === 'tr' ? 'Türkçe' : 'English'),
                            format: 'vtt',
                            type: 'text/vtt',
                            mimeType: 'text/vtt'
                        });
                    }
                }
            } catch (e) {}
        }
        if (subs.length === 0) {
            var subRe = /"file"\s*:\s*"(https?:[^"]+\.vtt)"\s*,\s*"label"\s*:\s*"([^"]+)"\s*,\s*"lang"\s*:\s*"([^"]+)"/gi;
            var sm;
            while ((sm = subRe.exec(fpHtml)) !== null) {
                var langCode = sm[3] === 'tur' ? 'tr' : (sm[3] === 'eng' ? 'en' : sm[3]);
                subs.push({
                    id: sm[3],
                    url: sm[1].replace(/\\\//g, '/'),
                    file: sm[1].replace(/\\\//g, '/'),
                    link: sm[1].replace(/\\\//g, '/'),
                    lang: sm[3],
                    language: langCode,
                    label: sm[2],
                    name: sm[2],
                    title: sm[2],
                    format: 'vtt',
                    type: 'text/vtt',
                    mimeType: 'text/vtt'
                });
            }
        }
        return { manifestUrl: manifestUrl, subtitles: subs, referer: fpRes.url || fastplayUrl };
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

        // 1. Check for `let parts = [...]` on hdfilmizle.vip
        var partsMatch = html.match(/let\s+parts\s*=\s*(\[[\s\S]*?\]);/);
        if (partsMatch) {
            try {
                var parts = JSON.parse(partsMatch[1]);
                if (Array.isArray(parts) && parts.length > 0) {
                    for (var pi = 0; pi < parts.length; pi++) {
                        var part = parts[pi];
                        if (!part || !part.data) continue;
                        var ifm = part.data.match(/src=["']([^"']+)["']/i);
                        if (!ifm) continue;
                        var iframeUrl = ifm[1].replace(/\\\//g, '/');
                        var pLang = part.lang === 'tr' ? 'TR Dublaj' : (part.lang === 'dual' ? 'Dual (TR/EN)' : 'TR Altyazı');

                        if (iframeUrl.indexOf('vidrame.') !== -1) {
                            var vr = await resolveVidrame(iframeUrl, pageUrl);
                            if (vr && vr.streamUrl) {
                                var vrHeaders = { 'User-Agent': 'ExoPlayerLib/2.19.1', 'Referer': 'https://vidrame.pro/' };
                                streams.push({
                                    name: 'HDFilmIzle',
                                    title: '⌜ HDFilmIzle ⌟ | Vidrame (' + pLang + ' - 1080p HLS)',
                                    url: vr.streamUrl + (vr.streamUrl.indexOf('.m3u8') !== -1 ? '' : '#.m3u8'),
                                    quality: '1080p',
                                    provider: 'hdfilmizle',
                                    headers: vrHeaders,
                                    format: 'hls',
                                    isHls: true,
                                    behaviorHints: { notWebReady: true, proxyHeaders: { request: vrHeaders } },
                                    subtitles: vr.subtitles || []
                                });
                            }
                        } else if (iframeUrl.indexOf('vidmoxy.') !== -1) {
                            var vm = await resolveVidmoxy(iframeUrl, pageUrl);
                            if (vm && vm.streamUrl) {
                                var vmHeaders = { 'User-Agent': 'ExoPlayerLib/2.19.1', 'Referer': 'https://vidmoxy.net/' };
                                streams.push({
                                    name: 'HDFilmIzle',
                                    title: '⌜ HDFilmIzle ⌟ | Vidmoxy (' + pLang + ' - 1080p HLS)',
                                    url: vm.streamUrl + (vm.streamUrl.indexOf('.m3u8') !== -1 ? '' : '#.m3u8'),
                                    quality: '1080p',
                                    provider: 'hdfilmizle',
                                    headers: vmHeaders,
                                    format: 'hls',
                                    isHls: true,
                                    behaviorHints: { notWebReady: true, proxyHeaders: { request: vmHeaders } },
                                    subtitles: vm.subtitles || []
                                });
                            }
                        } else if (iframeUrl.indexOf('fastplay.') !== -1 || iframeUrl.indexOf('setplay.') !== -1) {
                            var fastUrl = iframeUrl;
                            if (iframeUrl.indexOf('setplay.') !== -1) {
                                var spRes = await fetchWithTimeout(iframeUrl, { headers: { 'User-Agent': UA, 'Referer': pageUrl } }, 15000);
                                if (spRes.ok) {
                                    var spHtml = await spRes.text();
                                    var cerMatch = spHtml.match(/SPG\.cerceve\(\s*"[^"]*"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/);
                                    fastUrl = cerMatch ? spgDecode(cerMatch[1], cerMatch[2]) : null;
                                }
                            }
                            if (fastUrl) {
                                var fp = await resolveFastplay(fastUrl, pageUrl);
                                if (fp && fp.manifestUrl) {
                                    var sHeaders = { 'User-Agent': 'ExoPlayerLib/2.19.1', 'Referer': fp.referer };
                                    streams.push({
                                        name: 'HDFilmIzle',
                                        title: '⌜ HDFilmIzle ⌟ | FastPlay (' + pLang + ' - 1080p HLS)',
                                        url: fp.manifestUrl + '#.m3u8',
                                        quality: '1080p',
                                        provider: 'hdfilmizle',
                                        headers: sHeaders,
                                        format: 'hls',
                                        isHls: true,
                                        behaviorHints: { notWebReady: true, proxyHeaders: { request: sHeaders } },
                                        subtitles: fp.subtitles || []
                                    });
                                }
                            }
                        }
                    }
                }
            } catch (e) {}
        }

        if (streams.length > 0) return streams;

        // 2. Legacy / WordPress admin-ajax fallback (e.g. hdfilmizle.ink)
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
                        'Origin': base,
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

                var sHeaders = { 'User-Agent': 'ExoPlayerLib/2.19.1', 'Referer': fp.referer };
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
        var cards = [];
        if (query) {
            cards = await searchAll(query);
        } else {
            var base = BASES[0];
            var url = base.indexOf('vip') !== -1 ? (base + '/') : (base + '/film/');
            var res = await fetchWithTimeout(url, { headers: headersFor(base) }, 15000);
            if (res.ok) {
                cards = parseCards(await res.text(), base);
            }
            if (cards.length === 0 && BASES[1]) {
                var b2 = BASES[1];
                var u2 = b2.indexOf('vip') !== -1 ? (b2 + '/') : (b2 + '/film/');
                var r2 = await fetchWithTimeout(u2, { headers: headersFor(b2) }, 15000);
                if (r2.ok) cards = parseCards(await r2.text(), b2);
            }
        }
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
            var best = pickBest(cards, searchTitles[t], info.year);
            if (!best) continue;
            var streams = await extractStreamsFromFilmPage(best.href, best.base);
            if (streams.length > 0) return streams;
        }
        return [];
    } catch (e) {
        return [];
    }
}

// ── Universal Quality Sorter ──────────────────────────────────────────
if (typeof getStreams === "function") {
    var _origGetStreams = getStreams;
    getStreams = async function() {
        var res = await _origGetStreams.apply(this, arguments);
        return sortStreamsByQuality(res);
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams, getMeta, getCatalog };
}
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
    globalThis.getMeta = getMeta;
    globalThis.getCatalog = getCatalog;
}
