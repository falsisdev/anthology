const { sortStreamsByQuality } = require("../shared/quality.js");
const { loadConfig, val, wrapAll } = require("../shared/config.js");
const { getNowPlayingInfo } = require("../shared/epg.js");
const { parseTvgLang, channelDescription } = require("../shared/channel_lang.js");

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v;
            v = val('urls.live.m3u_remote'); if (v) M3U_URL = String(v).replace(/\/+$/, '');
            v = val('urls.live.taraftarium.base'); if (v) TARAFTARIUM_SITE = String(v);
            v = val('urls.live.taraftarium.api_base'); if (v) TARAFTARIUM_API = String(v).replace(/\/+$/, '');
            v = val('urls.live.taraftarium.base_number'); if (v && !isNaN(Number(v))) TARAFTARIUM_BASE_NUM = Number(v);
            if (_TARAFTARIUM_HEADERS) {
                _TARAFTARIUM_HEADERS.Referer = TARAFTARIUM_SITE;
                _TARAFTARIUM_HEADERS.Origin = TARAFTARIUM_SITE;
            }
        });
    }
    return _cfgReady;
}

/**
 * Anthology Canlı TV & M3U Katalog Motoru
 * 138 Ulusal, Haber, Spor, Belgesel ve Canlı TV kanalı
 * Taraftarium24 Canlı Maçlar ve 7/24 Spor Kanalları Hibrit Entegrasyonu
 */

var M3U_URL = "https://raw.githubusercontent.com/falsisdev/anthology/main/providers/M3U/Liste/canli.m3u";

// Taraftarium24 Başlangıç Yapılandırması (Kendi kendini otomatik günceller)
var TARAFTARIUM_SITE = "https://taraftarium24-245.top/";
var TARAFTARIUM_API = "https://teletv15.top";
var TARAFTARIUM_BASE_NUM = 245;
var TARAFTARIUM_LOGO = "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/taraftarium24.png";

var _HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*'
};

var _TARAFTARIUM_HEADERS = {
    'User-Agent': _HEADERS['User-Agent'],
    'Referer': TARAFTARIUM_SITE,
    'Origin': TARAFTARIUM_SITE
};

var cachedText = null;
var cacheTime = 0;

function fetchChannels() {
    var now = Date.now();
    if (cachedText && (now - cacheTime < 300000)) {
        return Promise.resolve(cachedText);
    }
    if (typeof require !== 'undefined') {
        try {
            var path = require('path');
            var fs = require('fs');
            var localPath = path.resolve(__dirname, 'Liste', 'canli.m3u');
            if (fs.existsSync(localPath)) {
                cachedText = fs.readFileSync(localPath, 'utf8');
                cacheTime = now;
                return Promise.resolve(cachedText);
            }
        } catch (e) {}
    }
    return fetch(M3U_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        .then(function(res) { return res.text(); })
        .then(function(txt) {
            cachedText = txt;
            cacheTime = now;
            return txt;
        });
}

function getCatalog(args) {
    return fetchChannels()
        .then(function(content) {
            var lines = content.split('\n');
            var metas = [];
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line.indexOf("#EXTINF") !== -1) {
                    var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
                    var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
                    var logoMatch = line.match(/tvg-logo="([^"]+)"/i);
                    var groupMatch = line.match(/group-title="([^"]+)"/i);

                    var nameMatch = line.match(/"\s*,\s*(.+)$/);
                    var channelName = nameMatch ? nameMatch[1].trim() : line.split(',').pop().trim();
                    var rawId = tvgIdMatch && tvgIdMatch[1] ? tvgIdMatch[1].trim() : (tvgNameMatch ? tvgNameMatch[1].trim() : channelName);
                    var channelId = rawId.startsWith('tv:') ? rawId : ('tv:' + rawId);
                    var logo = logoMatch ? logoMatch[1] : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png";
                    var genre = groupMatch ? groupMatch[1].replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/gi, '').trim() : "Ulusal";

                    metas.push({
                        id: channelId,
                        type: "tv",
                        name: channelName,
                        poster: logo,
                        background: logo,
                        genres: [genre],
                        description: channelDescription(channelName, parseTvgLang(line))
                    });
                }
            }
            return { metas: metas };
        })
        .catch(function() {
            return { metas: [] };
        });
}

function cleanKey(s) {
    return (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ── Taraftarium24 7/24 Sabit Kanal Tanımları ─────────────────────────
var TARAFTARIUM_CHANNELS = [
    { id: "bein-sports-1", name: "BEIN SPORTS 1", clean: "beinsports1" },
    { id: "bein-sports-2", name: "BEIN SPORTS 2", clean: "beinsports2" },
    { id: "bein-sports-3", name: "BEIN SPORTS 3", clean: "beinsports3" },
    { id: "bein-sports-4", name: "BEIN SPORTS 4", clean: "beinsports4" },
    { id: "bein-sports-5", name: "BEIN SPORTS 5", clean: "beinsports5" },
    { id: "bein-sports-max-1", name: "BEIN SPORTS MAX 1", clean: "beinsportsmax1" },
    { id: "bein-sports-max-2", name: "BEIN SPORTS MAX 2", clean: "beinsportsmax2" },
    { id: "s-sport", name: "S SPORT", clean: "ssport" },
    { id: "s-sport-2", name: "S SPORT 2", clean: "ssport2" },
    { id: "trt-spor", name: "TRT SPOR", clean: "trtspor" },
    { id: "trt-1", name: "TRT 1", clean: "trt1" },
    { id: "a-spor", name: "A SPOR", clean: "aspor" }
];

var TARAFTARIUM_ALIASES = {
    "beinsports1": "bein-sports-1",
    "beinsports1tr": "bein-sports-1",
    "beinsports2": "bein-sports-2",
    "beinsports2tr": "bein-sports-2",
    "beinsports3": "bein-sports-3",
    "beinsports3tr": "bein-sports-3",
    "beinsports4": "bein-sports-4",
    "beinsports4tr": "bein-sports-4",
    "beinsports5": "bein-sports-5",
    "beinsports5tr": "bein-sports-5",
    "beinsportsmax1": "bein-sports-max-1",
    "beinsportsmax1tr": "bein-sports-max-1",
    "beinsportsmax2": "bein-sports-max-2",
    "beinsportsmax2tr": "bein-sports-max-2",
    "ssport": "s-sport",
    "ssport1": "s-sport",
    "ssporttr": "s-sport",
    "ssport2": "s-sport-2",
    "ssport2tr": "s-sport-2",
    "trtspor": "trt-spor",
    "trtsportr": "trt-spor",
    "trt1": "trt-1",
    "trt1tr": "trt-1",
    "aspor": "a-spor",
    "asportr": "a-spor"
};

function matchTaraftariumChannelId(rawStr) {
    if (!rawStr) return null;
    var k = cleanKey(rawStr).replace(/^tv/, '');
    if (TARAFTARIUM_ALIASES[k]) return TARAFTARIUM_ALIASES[k];
    for (var ak in TARAFTARIUM_ALIASES) {
        if (k.indexOf(ak) === 0 || ak.indexOf(k) === 0) return TARAFTARIUM_ALIASES[ak];
    }
    return null;
}

// ── Çok Katmanlı Otomatik Domain ve API Çözümleyici ──────────────────
var _resolvedApi = null;
var _resolvedSite = null;
var _resolvedTime = 0;
var RESOLVER_TTL = 15 * 60 * 1000;

function resolveActiveBase() {
    var now = Date.now();
    if (_resolvedApi && (now - _resolvedTime < RESOLVER_TTL)) {
        return Promise.resolve({ api: _resolvedApi, site: _resolvedSite });
    }

    var baseApi = _resolvedApi || TARAFTARIUM_API;
    var baseSite = _resolvedSite || TARAFTARIUM_SITE;

    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var tm = setTimeout(function() { if (ctrl) ctrl.abort(); }, 3500);
    var opts = { headers: _HEADERS };
    if (ctrl) opts.signal = ctrl.signal;

    return fetch(baseApi + "/load/channels.php", opts)
        .then(function(res) {
            clearTimeout(tm);
            if (res && res.status === 200) {
                _resolvedApi = baseApi;
                _resolvedSite = baseSite;
                _resolvedTime = now;
                return { api: _resolvedApi, site: _resolvedSite };
            }
            throw new Error("API status not 200");
        })
        .catch(function() {
            clearTimeout(tm);
            var num = TARAFTARIUM_BASE_NUM;
            var cands = [num, num + 1, num - 1, num + 2, num + 3, num + 4];
            var i = 0;

            function tryNextCandidate() {
                if (i >= cands.length) {
                    _resolvedApi = baseApi;
                    _resolvedSite = baseSite;
                    _resolvedTime = now;
                    return Promise.resolve({ api: _resolvedApi, site: _resolvedSite });
                }
                var curN = cands[i++];
                var candUrl = "https://taraftarium24-" + curN + ".top/";
                var cctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
                var ctm = setTimeout(function() { if (cctrl) cctrl.abort(); }, 3000);
                var copts = { headers: _HEADERS };
                if (cctrl) copts.signal = cctrl.signal;

                return fetch(candUrl, copts)
                    .then(function(r) { return r.text(); })
                    .then(function(html) {
                        clearTimeout(ctm);
                        if (!html) return tryNextCandidate();
                        var apiM = html.match(/https:\/\/teletv\d+\.top/i) || html.match(/fetch\(['"](https:\/\/[^'"]*teletv[^'"]*top)/i);
                        var foundApi = apiM ? (apiM[1] || apiM[0]) : baseApi;
                        var activeSite = candUrl;
                        var numM = html.match(/taraftarium24-(\d+)\.top/i);
                        if (numM && numM[1]) {
                            TARAFTARIUM_BASE_NUM = parseInt(numM[1], 10);
                        }
                        _resolvedApi = foundApi.replace(/\/+$/, '');
                        _resolvedSite = activeSite;
                        _resolvedTime = now;
                        return { api: _resolvedApi, site: _resolvedSite };
                    })
                    .catch(function() {
                        clearTimeout(ctm);
                        return tryNextCandidate();
                    });
            }

            return tryNextCandidate();
        });
}

// ── Taraftarium Yayın Çözücü (JSON API Bypass) ──────────────────────
function fetchTaraftariumStream(streamOrChannelId) {
    if (!streamOrChannelId) return Promise.resolve(null);
    return resolveActiveBase().then(function(base) {
        var apiUrl = base.api + "/load/yayinlink.php?id=" + encodeURIComponent(streamOrChannelId);
        var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var tm = setTimeout(function() { if (ctrl) ctrl.abort(); }, 4500);
        var opts = { headers: _HEADERS };
        if (ctrl) opts.signal = ctrl.signal;

        return fetch(apiUrl, opts)
            .then(function(res) {
                clearTimeout(tm);
                return res.json();
            })
            .then(function(data) {
                if (data && data.deismackanal && typeof data.deismackanal === 'string' && data.deismackanal.indexOf('m3u8') !== -1) {
                    var finalUrl = data.deismackanal.replace(/edge4\./g, 'edge3.');
                    return {
                        url: finalUrl,
                        headers: {
                            'User-Agent': _HEADERS['User-Agent'],
                            'Referer': base.site,
                            'Origin': base.site
                        }
                    };
                }
                return null;
            })
            .catch(function() {
                clearTimeout(tm);
                return null;
            });
    });
}

// ── Canlı Maç Listesi Ayrıştırıcı ───────────────────────────────────
var _cachedMatches = null;
var _cachedMatchesTime = 0;
var MATCHES_TTL = 3 * 60 * 1000;

function fetchTaraftariumMatches() {
    var now = Date.now();
    if (_cachedMatches && (now - _cachedMatchesTime < MATCHES_TTL)) {
        return Promise.resolve(_cachedMatches);
    }

    return resolveActiveBase().then(function(base) {
        var matchesUrl = base.api + "/load/matches.php";
        return fetch(matchesUrl, { headers: _HEADERS })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var regex = /<a[^>]*href="matches\?id=([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
                var m;
                var list = [];
                while ((m = regex.exec(html)) !== null) {
                    var id = m[1];
                    var body = m[2];
                    var timeM = body.match(/class="event"[^>]*>\s*([^<]+)/);
                    var homeM = body.match(/class="home"[^>]*>\s*([^<]+)/);
                    var awayM = body.match(/class="away"[^>]*>\s*([^<]+)/);
                    var typeM = m[0].match(/data-matchtype="([^"]+)"/);

                    var sportType = typeM ? typeM[1].trim() : "Futbol";
                    var timeStr = timeM ? timeM[1].trim() : "";
                    var home = homeM ? homeM[1].trim() : "";
                    var away = awayM ? awayM[1].trim() : "";

                    var emoji = "⚽️";
                    if (/basket/i.test(sportType)) emoji = "🏀";
                    else if (/voley/i.test(sportType)) emoji = "🏐";
                    else if (/tenis/i.test(sportType)) emoji = "🎾";

                    var formattedTitle = emoji + " " + sportType + " | " + (timeStr ? timeStr + " " : "") + home + (away ? " - " + away : "");

                    list.push({
                        id: id,
                        title: formattedTitle,
                        sport: sportType,
                        time: timeStr,
                        home: home,
                        away: away
                    });
                }
                _cachedMatches = list;
                _cachedMatchesTime = now;
                return list;
            })
            .catch(function() {
                return _cachedMatches || [];
            });
    });
}

function getMeta(args) {
    var targetId = (typeof args === 'string') ? args : (args && args.id ? args.id : null);
    if (!targetId) return Promise.resolve({ meta: null });

    // ── Taraftarium24 Sanal Kanalı: Her canlı maç ve 7/24 spor kanalı ayrı video ──
    var cleanM = String(targetId).toLowerCase();
    if (cleanM.indexOf('tv:taraftarium24') === 0 || cleanM.indexOf('tv:mahsunsports') === 0) {
        return fetchTaraftariumMatches().then(function(matches) {
            var videos = [];

            // 1. 7/24 Sabit Spor Kanalları
            TARAFTARIUM_CHANNELS.forEach(function(ch) {
                videos.push({
                    id: "tv:taraftarium24:ch:" + ch.id,
                    title: "🔴 " + ch.name + " [7/24 Canlı]",
                    released: new Date().toISOString()
                });
            });

            // 2. Günün Canlı ve Yaklaşan Maçları
            matches.forEach(function(m) {
                videos.push({
                    id: "tv:taraftarium24:match:" + m.id,
                    title: m.title,
                    released: new Date().toISOString()
                });
            });

            return {
                meta: {
                    id: cleanM.indexOf('tv:mahsunsports') === 0 ? 'tv:mahsunsports' : 'tv:taraftarium24',
                    type: "tv",
                    name: "Taraftarium24",
                    poster: TARAFTARIUM_LOGO,
                    background: TARAFTARIUM_LOGO,
                    description: "Taraftarium24 Canlı Maçlar ve 7/24 Spor Kanalları — Futbol, Basketbol, Voleybol, Tenis ve Canlı TV",
                    genres: ["Spor"],
                    videos: videos
                }
            };
        }).catch(function() { return { meta: null }; });
    }

    return fetchChannels()
        .then(function(content) {
            var lines = content.split('\n');
            var name = targetId.replace(/^tv:/, '');
            var logo = "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png";
            var searchKey = cleanKey(targetId.replace(/^tv:/, ''));
            var lang = '';

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line.indexOf("#EXTINF") !== -1) {
                    var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
                    var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
                    var nameMatch = line.match(/"\s*,\s*(.+)$/);
                    var aliasName = nameMatch ? nameMatch[1].trim() : line.split(',').pop().trim();

                    var cId = cleanKey(tvgIdMatch ? tvgIdMatch[1] : "");
                    var cName = cleanKey(tvgNameMatch ? tvgNameMatch[1] : "");
                    var aName = cleanKey(aliasName);

                    if (cId === searchKey || cName === searchKey || aName === searchKey || aName.includes(searchKey) || searchKey.includes(aName)) {
                        name = aliasName;
                        lang = parseTvgLang(line);
                        var logoMatch = line.match(/tvg-logo="([^"]+)"/i);
                        if (logoMatch) logo = logoMatch[1];
                        break;
                    }
                }
            }

            var epg = getNowPlayingInfo(searchKey, name);
            return {
                meta: {
                    id: targetId,
                    type: "tv",
                    name: name,
                    poster: logo,
                    background: logo,
                    description: (epg && epg.formattedText) ? (channelDescription(name, lang) + '\n' + epg.formattedText) : channelDescription(name, lang),
                    videos: [{
                        id: targetId,
                        title: (epg && epg.current) ? epg.current : name,
                        released: new Date().toISOString()
                    }]
                }
            };
        })
        .catch(function() {
            return {
                meta: {
                    id: targetId,
                    type: "tv",
                    name: "Canlı Yayın",
                    poster: "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png",
                    videos: [{ id: targetId, title: "Yayını Başlat" }]
                }
            };
        });
}

var KNOWN_BACKUPS = {
    'trt1': 'https://tv-trt1.medya.trt.com.tr/master.m3u8',
    'trtspor': 'https://tv-trtspor1.medya.trt.com.tr/master.m3u8',
    'trtsporyildiz': 'https://tv-trtspor2.medya.trt.com.tr/master.m3u8',
    'trthaber': 'https://tv-trthaber.medya.trt.com.tr/master.m3u8',
    'trtbelgesel': 'https://tv-trtbelgesel-dai.medya.trt.com.tr/master.m3u8',
    'trtcocuk': 'https://tv-trtcocuk.medya.trt.com.tr/master.m3u8',
    'trtmuzik': 'https://tv-trtmuzik.medya.trt.com.tr/master.m3u8',
    'tv85': 'https://tv8.daioncdn.net/tv8bucuk/tv8bucuk.m3u8?app=tv8bucuk_web&ce=3'
};

function isEncryptedChannel(name, id) {
    var key = (name || '').toLowerCase() + ' ' + (id || '').toLowerCase();
    return /bein|ssport|sspor|tivibu|smartspor|smarts|exxen|tabii|eurosport|nba|cbcs/.test(key);
}

async function getStreams(args) {
    var targetId = (typeof args === 'string') ? args : (args ? args.id : "");
    if (!targetId) {
        var e = [];
        e.streams = [];
        return e;
    }

    var cleanT = String(targetId || '').toLowerCase();
    var searchKey = cleanKey(targetId.replace(/^tv:/, ''));

    // Taraftarium24 Maç Yayını
    if (cleanT.indexOf('tv:taraftarium24:match:') === 0 || cleanT.indexOf('tv:mahsunsports:match:') === 0) {
        var matchId = targetId.split(':').pop();
        var sObj = await fetchTaraftariumStream(matchId);
        var streams = [];
        if (sObj && sObj.url) {
            streams.push({
                name: '⌜ Taraftarium24 ⌟',
                title: 'Canlı Maç Akışı [HD]',
                url: sObj.url,
                headers: sObj.headers,
                behaviorHints: { isLive: true }
            });
        }
        streams.streams = streams;
        return streams;
    }

    // Taraftarium24 7/24 Sabit Kanal Yayını
    if (cleanT.indexOf('tv:taraftarium24:ch:') === 0 || cleanT.indexOf('tv:mahsunsports:ch:') === 0) {
        var chId = targetId.split(':').pop();
        var chDef = TARAFTARIUM_CHANNELS.find(function(c) { return c.id === chId; });
        var chLabel = chDef ? chDef.name : chId;
        var sObj2 = await fetchTaraftariumStream(chId);
        var streams2 = [];
        if (sObj2 && sObj2.url) {
            streams2.push({
                name: '⌜ Taraftarium24 ⌟',
                title: chLabel + ' [Canlı HD]',
                url: sObj2.url,
                headers: sObj2.headers,
                behaviorHints: { isLive: true }
            });
        }
        streams2.streams = streams2;
        return streams2;
    }

    // Taraftarium24 / Mahsun Sports Sanal Kartı Doğrudan Seçildiyse
    if (searchKey === 'taraftarium24' || searchKey === 'mahsunsports' || cleanT === 'tv:taraftarium24' || cleanT === 'tv:mahsunsports') {
        var subIdx = String(targetId.replace(/^tv:(?:taraftarium24|mahsunsports):?/i, ''));
        if (subIdx && /^\d+$/.test(subIdx)) {
            var idx = parseInt(subIdx, 10);
            var matches = await fetchTaraftariumMatches();
            var totalCh = TARAFTARIUM_CHANNELS.length;
            if (idx < totalCh) {
                var ch = TARAFTARIUM_CHANNELS[idx];
                var s = await fetchTaraftariumStream(ch.id);
                var st = [];
                if (s && s.url) st.push({ name: '⌜ Taraftarium24 ⌟', title: ch.name + ' [Canlı HD]', url: s.url, headers: s.headers, behaviorHints: { isLive: true } });
                st.streams = st;
                return st;
            } else {
                var mIdx = idx - totalCh;
                var m = matches[mIdx];
                if (m) {
                    var sm = await fetchTaraftariumStream(m.id);
                    var stm = [];
                    if (sm && sm.url) stm.push({ name: '⌜ Taraftarium24 ⌟', title: m.title + ' [HD]', url: sm.url, headers: sm.headers, behaviorHints: { isLive: true } });
                    stm.streams = stm;
                    return stm;
                }
            }
            var empty = [];
            empty.streams = [];
            return empty;
        }

        var sDefault = await fetchTaraftariumStream('bein-sports-1');
        var streamsDef = [];
        if (sDefault && sDefault.url) {
            streamsDef.push({
                name: '⌜ Taraftarium24 ⌟',
                title: 'BEIN SPORTS 1 [Canlı HD]',
                url: sDefault.url,
                headers: sDefault.headers,
                behaviorHints: { isLive: true }
            });
        }
        streamsDef.streams = streamsDef;
        return streamsDef;
    }

    var content;
    try {
        content = await fetchChannels();
    } catch (err) {
        var ec = [];
        ec.streams = [];
        return ec;
    }

    var lines = content.split('\n');
    var streams = [];
    var seenUrls = {};
    var matchedBackup = '';
    var matchedName = '';

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.indexOf("#EXTINF") !== -1) {
            var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
            var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
            var nameMatch = line.match(/"\s*,\s*(.+)$/);
            var backupMatch = line.match(/tvg-backup="([^"]+)"/i);
            var srcAttrMatch = line.match(/tvg-src="([^"]+)"/i);
            var aliasName = nameMatch ? nameMatch[1].trim() : line.split(',').pop().trim();

            var namedSrcs = [];
            if (srcAttrMatch && srcAttrMatch[1]) {
                var srcParts = srcAttrMatch[1].split('|');
                for (var psi = 0; psi + 1 < srcParts.length; psi += 2) {
                    var srcName = (srcParts[psi] || '').trim();
                    var srcUrl = (srcParts[psi + 1] || '').trim();
                    if (srcName && srcUrl) namedSrcs.push({ name: srcName, url: srcUrl });
                }
            }

            var cId = cleanKey(tvgIdMatch ? tvgIdMatch[1] : "");
            var cName = cleanKey(tvgNameMatch ? tvgNameMatch[1] : "");
            var aName = cleanKey(aliasName);

            if (cId === searchKey || cName === searchKey || aName === searchKey || (aName.length > 2 && (aName.includes(searchKey) || searchKey.includes(aName)))) {
                if (!matchedName) matchedName = aliasName;
                var encrypted = isEncryptedChannel(aliasName, cId);
                var backupAttr = backupMatch ? backupMatch[1] : '';
                if (backupAttr) matchedBackup = backupAttr;

                // 1. Taraftarium24 Canlı Spor Akışı Önceliği (BeIN Sports, S Sport, TRT Spor, A Spor vb.)
                var tChannelId = matchTaraftariumChannelId(cId || aName);
                if (tChannelId) {
                    try {
                        var tStream = await fetchTaraftariumStream(tChannelId);
                        if (tStream && tStream.url && !seenUrls[tStream.url]) {
                            seenUrls[tStream.url] = true;
                            streams.push({
                                name: '⌜ Taraftarium24 ⌟',
                                title: aliasName + ' [Canlı HD]',
                                url: tStream.url,
                                headers: tStream.headers,
                                behaviorHints: { isLive: true }
                            });
                        }
                    } catch (e) {}
                }

                // 2. canli.m3u Birincil Akışı
                for (var j = i + 1; j < lines.length; j++) {
                    var urlLine = lines[j].trim();
                    if (urlLine && urlLine.indexOf("http") === 0) {
                        if (!seenUrls[urlLine]) {
                            seenUrls[urlLine] = true;
                            var ytMatch = urlLine.match(/(?:watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                            var sObj = {
                                name: encrypted ? '⌜ Anthology Spor ⌟' : '⌜ Anthology ⌟',
                                title: aliasName + (ytMatch ? ' [Canlı HD · YouTube]' : ' [Canlı HD]'),
                                url: urlLine,
                                behaviorHints: { isLive: true }
                            };
                            if (ytMatch) {
                                sObj.ytId = ytMatch[1];
                            } else {
                                sObj.headers = _HEADERS;
                            }
                            streams.push(sObj);
                        }
                        break;
                    }
                    if (urlLine.indexOf("#EXTINF") === 0) break;
                }

                // 3. tvg-src Alternatif Kaynaklar
                for (var nsi = 0; nsi < namedSrcs.length; nsi++) {
                    var ns = namedSrcs[nsi];
                    if (/^https?:\/\//i.test(ns.url) && !seenUrls[ns.url]) {
                        seenUrls[ns.url] = true;
                        streams.push({
                            name: encrypted ? '⌜ Anthology Spor ⌟' : '⌜ Anthology ⌟',
                            title: ns.name + (encrypted ? ' [Canlı HD]' : ' [Canlı HD]'),
                            url: ns.url,
                            headers: _HEADERS,
                            behaviorHints: { isLive: true }
                        });
                    }
                }

                // 4. tvg-backup / tvg-backup2 / tvg-backup3
                var backups = [];
                var b1 = line.match(/tvg-backup="([^"]+)"/i);
                var b2 = line.match(/tvg-backup2="([^"]+)"/i);
                var b3 = line.match(/tvg-backup3="([^"]+)"/i);
                if (b1) b1[1].split('|').forEach(function(u) { if (u && u.trim()) backups.push(u.trim()); });
                if (b2) b2[1].split('|').forEach(function(u) { if (u && u.trim()) backups.push(u.trim()); });
                if (b3) b3[1].split('|').forEach(function(u) { if (u && u.trim()) backups.push(u.trim()); });

                if (backups.length > 0) {
                    for (var bkIdx = 0; bkIdx < backups.length; bkIdx++) {
                        var bUrl = backups[bkIdx];
                        if (!seenUrls[bUrl]) {
                            seenUrls[bUrl] = true;
                            var bLabel = aliasName + (backups.length > 1 ? (' [Yedek Akış ' + (bkIdx + 1) + ']') : ' [Yedek Akış]');
                            streams.push({
                                name: encrypted ? '⌜ Anthology Spor · Yedek ⌟' : '⌜ Anthology · Yedek ⌟',
                                title: bLabel,
                                url: bUrl,
                                headers: _HEADERS,
                                behaviorHints: { isLive: true }
                            });
                        }
                    }
                } else {
                    for (var bk in KNOWN_BACKUPS) {
                        if ((cId === bk || searchKey === bk) && !seenUrls[KNOWN_BACKUPS[bk]]) {
                            seenUrls[KNOWN_BACKUPS[bk]] = true;
                            streams.push({
                                name: '⌜ Anthology · Yedek ⌟',
                                title: aliasName + ' [Yedek Akış]',
                                url: KNOWN_BACKUPS[bk],
                                headers: _HEADERS,
                                behaviorHints: { isLive: true }
                            });
                        }
                    }
                }
            }
        }
        if (streams.length >= 8) break;
    }

    streams.streams = streams;
    return streams;
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
    module.exports = wrapAll({ getStreams: getStreams, getMeta: getMeta, getCatalog: getCatalog }, cfgReady);
} else {
    var g = (typeof globalThis !== 'undefined') ? globalThis : (typeof global !== 'undefined') ? global : window;
    g.getStreams = getStreams; g.getMeta = getMeta; g.getCatalog = getCatalog;
}
