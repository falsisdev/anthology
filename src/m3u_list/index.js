const { sortStreamsByQuality } = require("../shared/quality.js");
const { loadConfig, val, wrapAll } = require("../shared/config.js");
const { getNowPlayingInfo } = require("../shared/epg.js");
const { parseTvgLang, channelDescription } = require("../shared/channel_lang.js");
const { initSportConfig, resolveMultiSportStreams, resolveAnthologyLiveStreams, findSportChannelMapping } = require("../shared/sport_engine.js");

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = Promise.all([loadConfig(), initSportConfig()]).then(function () {
            var v;
            v = val('urls.live.m3u_remote'); if (v) M3U_URL = String(v).replace(/\/+$/, '');
        });
    }
    return _cfgReady;
}

/**
 * Anthology Canlı TV & M3U Katalog Motoru
 * 138 Ulusal, Haber, Spor, Belgesel ve Canlı TV kanalı
 * 5 Büyük Spor Platformu Hibrit Entegrasyonu (Taraftarium24, Arda, Alemdar, Mahsun, Papaz)
 */

var M3U_URL = "https://raw.githubusercontent.com/falsisdev/anthology/main/providers/M3U/Liste/canli.m3u";

var _HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*'
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
            var candidatePaths = [
                path.resolve(__dirname, 'M3U', 'Liste', 'canli.m3u'),
                path.resolve(__dirname, '..', 'providers', 'M3U', 'Liste', 'canli.m3u'),
                path.resolve(__dirname, '..', '..', 'providers', 'M3U', 'Liste', 'canli.m3u'),
                path.resolve(typeof process !== 'undefined' ? process.cwd() : '.', 'providers', 'M3U', 'Liste', 'canli.m3u')
            ];
            for (var pi = 0; pi < candidatePaths.length; pi++) {
                if (fs.existsSync(candidatePaths[pi])) {
                    cachedText = fs.readFileSync(candidatePaths[pi], 'utf8');
                    cacheTime = now;
                    return Promise.resolve(cachedText);
                }
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

function normalizeM3UGenre(groupRaw) {
    var g = (groupRaw || '').toString().replace(/İ/g, 'I').toUpperCase();
    if (g.indexOf('SPOR') !== -1) return 'Spor';
    if (g.indexOf('ULUSAL') !== -1) return 'Ulusal';
    if (g.indexOf('HABER') !== -1) return 'Haber';
    if (g.indexOf('SINEMA') !== -1) return 'Sinema';
    if (g.indexOf('BELGESEL') !== -1 || g.indexOf('ÇOCUK') !== -1 || g.indexOf('COCUK') !== -1) return 'Belgesel & Çocuk';
    if (g.indexOf('MÜZİK') !== -1 || g.indexOf('MUZIK') !== -1 || g.indexOf('EĞLENCE') !== -1) return 'Müzik & Eğlence';
    if (g.indexOf('YEREL') !== -1) return 'Yerel';
    if (g.indexOf('DİĞER') !== -1 || g.indexOf('DIGER') !== -1) return 'Diğer';
    var cleaned = (groupRaw || '').replace(/[^\w\sğüşıöçĞÜŞİÖÇ&]/gi, '').trim();
    return cleaned || 'Ulusal';
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
                    var genre = normalizeM3UGenre(groupMatch ? groupMatch[1] : '');

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

function getMeta(args) {
    var targetId = (typeof args === 'string') ? args : (args ? args.id : "");
    if (!targetId) return Promise.resolve({ meta: null });

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

function isRejectedNonLiveRequest(targetId, mediaType) {
    var raw = String(targetId || '').trim();
    if (!raw) return true;
    if (mediaType === 'movie' || mediaType === 'series') return true;
    if (raw.toLowerCase().indexOf('tv:') !== 0 && /^(?:tt\d+|\d+)(?::\d+:\d+)?$/i.test(raw)) {
        return true;
    }
    return false;
}

async function getStreams(args) {
    var targetId = (typeof args === 'string') ? args : (args ? (args.id || args.name || '') : '');
    var mediaType = (args && typeof args === 'object') ? (args.type || args.mediaType || '') : '';
    if (isRejectedNonLiveRequest(targetId, mediaType)) {
        var e = [];
        e.streams = [];
        return e;
    }

    var searchKey = cleanKey(targetId.replace(/^tv:/, ''));

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
    var matchedCId = '';
    var matchedEncrypted = false;
    var matchedEntry = null;
    var fallbackEntry = null;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.indexOf("#EXTINF") !== -1) {
            var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
            var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
            var nameMatch = line.match(/"\s*,\s*(.+)$/);
            var backupMatch = line.match(/tvg-backup="([^"]+)"/i);
            var srcAttrMatch = line.match(/tvg-src="([^"]+)"/i);
            var aliasName = nameMatch ? nameMatch[1].trim() : line.split(',').pop().trim();

            var cId = cleanKey(tvgIdMatch ? tvgIdMatch[1] : "");
            var cName = cleanKey(tvgNameMatch ? tvgNameMatch[1] : "");
            var aName = cleanKey(aliasName);

            var exactMatch = (cId === searchKey || cName === searchKey || aName === searchKey);
            var fuzzyMatch = (!exactMatch && searchKey.length >= 4 && aName.length >= 4 && (aName.includes(searchKey) || searchKey.includes(aName)));

            if (exactMatch || (fuzzyMatch && !fallbackEntry)) {
                var urlLine = '';
                for (var j = i + 1; j < lines.length; j++) {
                    var ul = lines[j].trim();
                    if (ul && ul.indexOf("http") === 0) {
                        urlLine = ul;
                        break;
                    }
                    if (ul.indexOf("#EXTINF") === 0) break;
                }
                var entryObj = {
                    aliasName: aliasName,
                    cId: cId,
                    backupAttr: backupMatch ? backupMatch[1] : '',
                    srcAttr: srcAttrMatch ? srcAttrMatch[1] : '',
                    urlLine: urlLine
                };
                if (exactMatch) {
                    matchedEntry = entryObj;
                    break;
                } else {
                    fallbackEntry = entryObj;
                }
            }
        }
    }

    var chosen = matchedEntry || fallbackEntry;
    if (chosen) {
        matchedName = chosen.aliasName;
        matchedCId = chosen.cId;
        var encrypted = isEncryptedChannel(chosen.aliasName, chosen.cId);
        matchedEncrypted = encrypted;
        if (chosen.backupAttr) matchedBackup = chosen.backupAttr;

        var namedSrcs = [];
        if (chosen.srcAttr) {
            var srcParts = chosen.srcAttr.split('|');
            for (var psi = 0; psi + 1 < srcParts.length; psi += 2) {
                var srcName = (srcParts[psi] || '').trim();
                var srcUrl = (srcParts[psi + 1] || '').trim();
                if (srcName && srcUrl) namedSrcs.push({ name: srcName, url: srcUrl });
            }
        }

        var sportMap = findSportChannelMapping(chosen.cId || cleanKey(chosen.aliasName));
        var isSport = Boolean(encrypted || sportMap);
        var isLiveProxyUrl = chosen.urlLine && chosen.urlLine.indexOf('/live/') !== -1 && chosen.urlLine.indexOf('anthology-live') !== -1;

        var addPrimaryFromM3u = function () {
            if (!chosen.urlLine || seenUrls[chosen.urlLine]) return;
            seenUrls[chosen.urlLine] = true;
            var ytMatch = chosen.urlLine.match(/(?:watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            var sObj = {
                name: isLiveProxyUrl ? '⌜ Anthology Live · Otomatik ⌟' : (encrypted ? '⌜ Anthology Spor ⌟' : '⌜ Anthology ⌟'),
                title: chosen.aliasName + (ytMatch ? ' [Canlı HD · YouTube]' : (isLiveProxyUrl ? ' [Kool.ws · Otomatik]' : ' [Canlı HD · Resmi]')),
                url: chosen.urlLine,
                behaviorHints: { isLive: true }
            };
            if (ytMatch) {
                sObj.ytId = ytMatch[1];
            } else {
                sObj.headers = _HEADERS;
            }
            streams.push(sObj);
        };

        var addLiveProxySources = async function () {
            try {
                var liveStreams = await resolveAnthologyLiveStreams(chosen.cId || chosen.aliasName, chosen.aliasName, { isSport: isSport });
                for (var si = 0; si < liveStreams.length; si++) {
                    var sp = liveStreams[si];
                    if (sp && sp.url && !seenUrls[sp.url]) {
                        seenUrls[sp.url] = true;
                        streams.push(sp);
                    }
                }
            } catch (e) {}
        };

        if (isSport || isLiveProxyUrl) {
            await addLiveProxySources();
            addPrimaryFromM3u();
        } else {
            // Non-sport official streams stay #1, followed by Kool.ws / Anthology Live pools
            addPrimaryFromM3u();
            await addLiveProxySources();
        }

        // canli.m3u Çoklu Yedek Yayınlar (tvg-src)
        for (var si2 = 0; si2 < namedSrcs.length; si2++) {
            var ns = namedSrcs[si2];
            if (ns.url && !seenUrls[ns.url]) {
                seenUrls[ns.url] = true;
                var ytMatch2 = ns.url.match(/(?:watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                var sObj2 = {
                    name: encrypted ? ('⌜ Anthology Spor · ' + ns.name + ' ⌟') : ('⌜ Anthology · ' + ns.name + ' ⌟'),
                    title: chosen.aliasName + ' [' + ns.name + (ytMatch2 ? ' · YouTube' : '') + ']',
                    url: ns.url,
                    behaviorHints: { isLive: true }
                };
                if (ytMatch2) {
                    sObj2.ytId = ytMatch2[1];
                } else {
                    sObj2.headers = _HEADERS;
                }
                streams.push(sObj2);
            }
        }
    }

    // 4. Doğrulanmış Yedekler (TRT, A Spor, TV 8.5 vb.)
    if (matchedBackup && !seenUrls[matchedBackup]) {
        seenUrls[matchedBackup] = true;
        streams.push({
            name: isEncryptedChannel(matchedName, matchedCId) ? '⌜ Anthology Spor · Resmi ⌟' : '⌜ Anthology · Resmi ⌟',
            title: matchedName + ' [Resmi Akış]',
            url: matchedBackup,
            headers: _HEADERS,
            behaviorHints: { isLive: true }
        });
    } else {
        for (var bk in KNOWN_BACKUPS) {
            if (searchKey.includes(bk) && !seenUrls[KNOWN_BACKUPS[bk]]) {
                seenUrls[KNOWN_BACKUPS[bk]] = true;
                streams.push({
                    name: isEncryptedChannel(matchedName, matchedCId) ? '⌜ Anthology Spor · Resmi ⌟' : '⌜ Anthology · Resmi ⌟',
                    title: (matchedName || searchKey.toUpperCase()) + ' [Resmi Akış]',
                    url: KNOWN_BACKUPS[bk],
                    headers: _HEADERS,
                    behaviorHints: { isLive: true }
                });
                break;
            }
        }
    }

    if (matchedEncrypted) {
        streams = sortStreamsByQuality(streams);
    }
    streams.streams = streams;
    return streams;
}

// ── Universal Quality Sorter ──────────────────────────────────────────
if (typeof getStreams === "function") {
    var _origGetStreams = getStreams;
    getStreams = async function() {
        return _origGetStreams.apply(this, arguments);
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = wrapAll({ getStreams: getStreams, getCatalog: getCatalog, getMeta: getMeta }, cfgReady);
} else {
    var g = (typeof globalThis !== 'undefined') ? globalThis : (typeof global !== 'undefined') ? global : window;
    g.getStreams = getStreams; g.getCatalog = getCatalog; g.getMeta = getMeta;
}
