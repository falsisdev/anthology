/**
 * Anthology - SetFilmIzle Provider
 * https://www.setfilmizle.ltd
 * Film + yabancı dizi arşivi; admin-ajax get_video_url köprüsü üzerinden
 * setplay/fastplay 1080p HLS master akışları (TR/EN ses + altyazı).
 * Kaynak: Cloudstream SetFilmIzle mantığının Nuvio JS uyarlaması.
 */

var BASE_URL = 'https://www.setfilmizle.ltd';
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
    var re = /<a[^>]+class="[^"]*card-link[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
        var href = absUrl(m[1]);
        var inner = m[2];
        if (!href || seen.has(href)) continue;
        var titleMatch = inner.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i);
        var imgMatch = inner.match(/<img[^>]+(?:alt="([^"]*)")?[^>]*>/i);
        var srcMatch = inner.match(/<img[^>]+(?:src|data-src)="([^"]+)"/i);
        var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : (imgMatch && imgMatch[1] ? imgMatch[1].trim() : '');
        if (!title) continue;
        seen.add(href);
        out.push({
            title: title,
            href: href,
            poster: srcMatch ? absUrl(srcMatch[1]) : '',
            isTv: href.includes('/dizi/')
        });
    }
    return out;
}

async function searchSite(query) {
    try {
        var res = await fetchWithTimeout(BASE_URL + '/?s=' + encodeURIComponent(query), { headers: HEADERS }, 15000);
        if (!res.ok) return [];
        var html = await res.text();
        return parseCards(html);
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

/* SPG.cerceve(n, o): atob(n) XOR atob(o) -> split('|'), [0] alınır */
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

/* X-Sp kanıtı: FNV-1a32(sp|spT|rand) -> "spT.rand.hash" */
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
            headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': fastplayRef || (BASE_URL + '/') }
        }, 15000);
        if (!fpRes.ok) return null;
        var fpHtml = await fpRes.text();

        var spMatch = fpHtml.match(/"sp"\s*:\s*"([^"]+)"/);
        var spTMatch = fpHtml.match(/"spT"\s*:\s*(\d+)/);
        var manMatch = fpHtml.match(/(?:src|stream)\s*:\s*"(\/manifests\/[^"]+)"/);
        if (!manMatch) return null;

        var sp = spMatch ? spMatch[1] : '';
        var spT = spTMatch ? spTMatch[1] : 0;
        var manPath = manMatch[1].replace(/&amp;/g, '&');
        var fpOrigin = fastplayUrl.match(/^(https?:\/\/[^/]+)/)[1];
        var manifestUrl = manPath.startsWith('http') ? manPath : (fpOrigin + manPath);

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

        return { manifestUrl: manifestUrl, sp: sp, spT: spT, subtitles: subs, referer: fpRes.url || fastplayUrl };
    } catch (e) {
        return null;
    }
}

async function extractStreamsFromContentPage(pageUrl) {
    var streams = [];
    try {
        var res = await fetchWithTimeout(pageUrl, { headers: HEADERS }, 15000);
        if (!res.ok) return [];
        var html = await res.text();

        var ajaxMatch = html.match(/window\.STF_AJAX\s*=\s*\{[^}]*url\s*:\s*"([^"]+)"[^}]*nonces\s*:\s*\{[^}]*video\s*:\s*"([^"]+)"/);
        var ajaxUrl = ajaxMatch ? ajaxMatch[1] : (BASE_URL + '/wp-admin/admin-ajax.php');
        var videoNonce = ajaxMatch ? ajaxMatch[2] : '';

        // Yeni tema: data-post-id kapsayıcıda (div.fplayer), data-player-name butonlarda.
        // Eski tema: üçü aynı etikette. İkisini de destekle.
        var players = [];
        var seenP = new Set();
        function addPlayer(pid, pname, pkey) {
            if (!pid || !pname || pid.includes('event')) return;
            var k = pid + '|' + pname + '|' + (pkey || '');
            if (seenP.has(k)) return;
            seenP.add(k);
            players.push({ id: pid, name: pname, key: pkey || '' });
        }
        var playerRe = /data-post-id="([^"]+)"[^>]*data-player-name="([^"]+)"[^>]*data-part-key="([^"]*)"/gi;
        var pm;
        while ((pm = playerRe.exec(html)) !== null) {
            addPlayer(pm[1], pm[2], pm[3]);
        }
        if (players.length === 0) {
            var postIds = [];
            var piRe = /data-post-id="([^"]+)"/gi;
            var pim;
            while ((pim = piRe.exec(html)) !== null) {
                if (pim[1] && !pim[1].includes('event') && postIds.indexOf(pim[1]) === -1) postIds.push(pim[1]);
            }
            var btnRe = /data-player-name="([^"]+)"[^>]*data-part-key="([^"]*)"/gi;
            var bm;
            var btns = [];
            while ((bm = btnRe.exec(html)) !== null) {
                btns.push({ name: bm[1], key: bm[2] || '' });
            }
            if (btns.length === 0) {
                var nameOnly = /data-player-name="([^"]+)"/gi;
                var nm;
                while ((nm = nameOnly.exec(html)) !== null) {
                    btns.push({ name: nm[1], key: '' });
                }
            }
            postIds.forEach(function(pid) {
                btns.forEach(function(b) { addPlayer(pid, b.name, b.key); });
            });
        }
        if (players.length === 0) return [];

        var nonces = [];
        if (videoNonce) nonces.push(videoNonce);
        var nonceMatches = [...html.matchAll(/data-nonce="([a-z0-9]+)"/gi)].map(function(m) { return m[1]; });
        for (var ni = 0; ni < nonceMatches.length; ni++) {
            if (nonces.indexOf(nonceMatches[ni]) === -1) nonces.push(nonceMatches[ni]);
        }
        if (nonces.length === 0) return [];

        var seenUrls = new Set();
        for (var i = 0; i < Math.min(players.length, 4); i++) {
            var gotStreamForPlayer = false;
            for (var nIdx = 0; nIdx < nonces.length && !gotStreamForPlayer; nIdx++) {
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
                        'User-Agent': HEADERS['User-Agent'],
                        'Referer': pageUrl,
                        'Origin': BASE_URL,
                        'X-Requested-With': 'XMLHttpRequest',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: form.toString()
                }, 15000);
                if (!aRes.ok) continue;
                var aj = await aRes.json();
                if (!aj || aj.success === false) continue;
                var setplayUrl = aj && aj.data && ((aj.data.stream && aj.data.stream.url) || aj.data.url);
                if (!setplayUrl) continue;
                setplayUrl = setplayUrl.replace(/\\\//g, '/');
                if (seenUrls.has(setplayUrl)) { gotStreamForPlayer = true; continue; }
                seenUrls.add(setplayUrl);

                // setplay -> SPG.cerceve -> fastplay
                var spRes = await fetchWithTimeout(setplayUrl, {
                    headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': pageUrl }
                }, 15000);
                if (!spRes.ok) continue;
                var spHtml = await spRes.text();
                var cerMatch = spHtml.match(/SPG\.cerceve\(\s*"[^"]*"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/) ||
                               spHtml.match(/SPG\.cerceve\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/);
                var fastplayUrl = null;
                if (cerMatch && cerMatch[1] && cerMatch[2]) {
                    fastplayUrl = spgDecode(cerMatch[1], cerMatch[2]);
                }
                // Bazı varyantlarda iframe içinde fastplay URL'i düz metin olabilir
                if (!fastplayUrl) {
                    var fMatch = spHtml.match(/https?:\/\/fastplay\.[a-z]+\/stfplay\.php\?[^"'<>\s\\]+/i);
                    if (fMatch) fastplayUrl = fMatch[0].replace(/\\+/g, '');
                }
                if (!fastplayUrl || !fastplayUrl.startsWith('http')) continue;

                var fp = await resolveFastplay(fastplayUrl, spRes.url || setplayUrl);
                if (!fp || !fp.manifestUrl) continue;

                var sHeaders = {
                    'User-Agent': 'ExoPlayerLib/2.19.1',
                    'Referer': fp.referer
                };
                streams.push({
                    name: 'SetFilmIzle',
                    title: '⌜ SetFilmIzle ⌟ | FastPlay (1080p HLS)',
                    url: fp.manifestUrl + '#.m3u8',
                    quality: '1080p',
                    provider: 'setfilmizle',
                    headers: sHeaders,
                    format: 'hls',
                    isHls: true,
                    behaviorHints: {
                        notWebReady: true,
                        proxyHeaders: { request: sHeaders }
                    },
                    subtitles: fp.subtitles || []
                });
                gotStreamForPlayer = true;
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
        var url = query ? (BASE_URL + '/?s=' + encodeURIComponent(query)) : (BASE_URL + '/tur/aksiyon/');
        var res = await fetchWithTimeout(url, { headers: HEADERS }, 15000);
        if (!res.ok) return { metas: [] };
        var html = await res.text();
        var cards = parseCards(html);
        var metas = cards.slice(0, 30).map(function(c) {
            return {
                id: 'setfilmizle:' + (c.isTv ? 'show:' : 'movie:') + encodeURIComponent(c.href),
                type: c.isTv ? 'tv' : 'movie',
                name: c.title,
                poster: c.poster || 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
                background: c.poster || 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
                genres: [c.isTv ? 'Yabancı Dizi' : 'Film', 'SetFilmIzle'],
                description: c.title + ' - SetFilmIzle'
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
        if (!rawId || !rawId.startsWith('setfilmizle:')) return { meta: null };
        var href = decodeURIComponent(rawId.split(':').slice(2).join(':'));
        var res = await fetchWithTimeout(href, { headers: HEADERS }, 15000);
        if (!res.ok) return { meta: null };
        var html = await res.text();
        var titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').replace(/\s*\(20\d\d\)\s*/g, '').trim() : 'SetFilmIzle';
        var ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        var poster = ogImg ? ogImg[1] : 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';

        if (href.includes('/dizi/')) {
            var videos = [];
            var seen = new Set();
            // Yeni tema: div.season-panel[data-season] > a.fep[href*="/bolum/"]
            var panelRe = /<div[^>]+class="[^"]*season-panel[^"]*"[^>]*data-season="(\d+)"[^>]*>([\s\S]*?)(?=<div[^>]+class="[^"]*season-panel[^"]*"|$)/gi;
            var pmm;
            while ((pmm = panelRe.exec(html)) !== null) {
                var sN = parseInt(pmm[1]) || 1;
                var panelHtml = pmm[2];
                var fepRe = /<a[^>]+class="[^"]*fep[^"]*"[^>]*href="([^"]+)"[^>]*>/gi;
                var fm;
                var eIdx = 0;
                while ((fm = fepRe.exec(panelHtml)) !== null) {
                    var fepHref = absUrl(fm[1]);
                    if (!fepHref || seen.has(fepHref)) continue;
                    eIdx++;
                    var slugM = fepHref.match(/-(\d+)-sezon-(\d+)-bolum/);
                    var eN = slugM ? parseInt(slugM[2]) : eIdx;
                    var sN2 = slugM ? parseInt(slugM[1]) : sN;
                    seen.add(fepHref);
                    videos.push({
                        id: 'setfilmizle:ep:' + encodeURIComponent(fepHref),
                        title: sN2 + '. Sezon ' + eN + '. Bölüm',
                        season: sN2,
                        episode: eN
                    });
                }
            }
            // Eski tema yedeği: ul.episodios
            if (videos.length === 0) {
                var epRe = /<a[^>]+href="([^"]+)"[^>]*>([^<]*\d+\.\s*Sezon[^<]*\d+\.\s*Bölüm[^<]*)<\/a>/gi;
                var em;
                while ((em = epRe.exec(html)) !== null) {
                    var epHref = absUrl(em[1]);
                    if (!epHref || seen.has(epHref)) continue;
                    var epTxt = em[2].replace(/\s+/g, ' ').trim();
                    var seMatch = epTxt.match(/(\d+)\.\s*Sezon[^\d]*(\d+)\.\s*Bölüm/);
                    var sN3 = seMatch ? parseInt(seMatch[1]) : 1;
                    var eN3 = seMatch ? parseInt(seMatch[2]) : 1;
                    seen.add(epHref);
                    videos.push({
                        id: 'setfilmizle:ep:' + encodeURIComponent(epHref),
                        title: epTxt || (sN3 + '. Sezon ' + eN3 + '. Bölüm'),
                        season: sN3,
                        episode: eN3
                    });
                }
            }
            videos.sort(function(a, b) { return (a.season - b.season) || (a.episode - b.episode); });
            return {
                meta: {
                    id: rawId, type: 'tv', name: title, poster: poster, background: poster,
                    description: title + ' - SetFilmIzle',
                    genres: ['Yabancı Dizi', 'SetFilmIzle'],
                    videos: videos
                }
            };
        }

        return {
            meta: {
                id: rawId, type: 'movie', name: title, poster: poster, background: poster,
                description: title + ' - SetFilmIzle',
                genres: ['Film', 'SetFilmIzle'],
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
        if (typeof tmdbIdOrArgs === 'string' && tmdbIdOrArgs.startsWith('setfilmizle:ep:')) {
            var epHref = decodeURIComponent(tmdbIdOrArgs.replace('setfilmizle:ep:', ''));
            return await extractStreamsFromContentPage(epHref);
        }
        if (typeof tmdbIdOrArgs === 'string' && (tmdbIdOrArgs.startsWith('setfilmizle:show:') || tmdbIdOrArgs.startsWith('setfilmizle:movie:'))) {
            var href2 = decodeURIComponent(tmdbIdOrArgs.split(':').slice(2).join(':'));
            if (tmdbIdOrArgs.startsWith('setfilmizle:show:')) {
                var meta = await getMeta(tmdbIdOrArgs);
                var vids = (meta && meta.meta && meta.meta.videos) || [];
                var target = vids.find(function(v) {
                    return v.season === (parseInt(seasonNum) || 1) && v.episode === (parseInt(episodeNum) || 1);
                }) || vids[0];
                if (target) return await getStreams(target.id);
                return await extractStreamsFromContentPage(href2);
            }
            return await extractStreamsFromContentPage(href2);
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
                var streams = await extractStreamsFromContentPage(best.href);
                if (streams.length > 0) {
                    // Bölüm sayfası doğrudan çalıştıysa dön (tek bölümlük ya da S01E01 varsayılanı)
                    if (season === 1 && episode === 1) return streams;
                }
                // Bölüm listesini dene
                var showMeta = await getMeta('setfilmizle:show:' + encodeURIComponent(best.href));
                var vids2 = (showMeta && showMeta.meta && showMeta.meta.videos) || [];
                var tgt = vids2.find(function(v) { return v.season === season && v.episode === episode; });
                if (tgt) {
                    var epStreams = await getStreams(tgt.id);
                    if (epStreams.length > 0) return epStreams;
                }
                if (streams.length > 0) return streams;
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
    module.exports = { getStreams, getMeta, getCatalog };
}
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
    globalThis.getMeta = getMeta;
    globalThis.getCatalog = getCatalog;
}
