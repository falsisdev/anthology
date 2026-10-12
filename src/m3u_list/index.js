const { sortStreamsByQuality } = require("../shared/quality.js");
const { loadConfig, val, wrapAll } = require("../shared/config.js");
const { getNowPlayingInfo } = require("../shared/epg.js");
const { parseTvgLang, channelDescription } = require("../shared/channel_lang.js");
const { initSportConfig, resolveMultiSportStreams, findSportChannelMapping } = require("../shared/sport_engine.js");

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

async function getStreams(args) {
    var targetId = (typeof args === 'string') ? args : (args ? args.id : "");
    if (!targetId) {
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
                if (!matchedCId) matchedCId = cId;
                var encrypted = isEncryptedChannel(aliasName, cId);
                var backupAttr = backupMatch ? backupMatch[1] : '';
                if (backupAttr) matchedBackup = backupAttr;

                // 1. Canlı Spor Kanalları — 5 Büyük Platform Eşzamanlı Çözümleme
                var sportMap = findSportChannelMapping(cId || aName);
                if (encrypted || sportMap) {
                    try {
                        var sportStreams = await resolveMultiSportStreams(cId || aName, aliasName);
                        for (var si = 0; si < sportStreams.length; si++) {
                            var sp = sportStreams[si];
                            if (sp && sp.url && !seenUrls[sp.url]) {
                                seenUrls[sp.url] = true;
                                streams.push(sp);
                            }
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

                // 3. canli.m3u Çoklu Yedek Yayınlar (tvg-src)
                for (var si2 = 0; si2 < namedSrcs.length; si2++) {
                    var ns = namedSrcs[si2];
                    if (ns.url && !seenUrls[ns.url]) {
                        seenUrls[ns.url] = true;
                        var ytMatch2 = ns.url.match(/(?:watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                        var sObj2 = {
                            name: encrypted ? ('⌜ Anthology Spor · ' + ns.name + ' ⌟') : ('⌜ Anthology · ' + ns.name + ' ⌟'),
                            title: aliasName + ' [' + ns.name + (ytMatch2 ? ' · YouTube' : '') + ']',
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
                break;
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
    module.exports = wrapAll({ getStreams: getStreams, getCatalog: getCatalog, getMeta: getMeta }, cfgReady);
} else {
    var g = (typeof globalThis !== 'undefined') ? globalThis : (typeof global !== 'undefined') ? global : window;
    g.getStreams = getStreams; g.getCatalog = getCatalog; g.getMeta = getMeta;
}
