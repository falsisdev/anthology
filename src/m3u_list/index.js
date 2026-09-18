const { sortStreamsByQuality } = require("../shared/quality.js");
const { loadConfig, val, wrapAll } = require("../shared/config.js");

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v;
            v = val('urls.live.m3u_remote'); if (v) M3U_URL = String(v).replace(/\/+$/, '');
            v = val('urls.live.mahsunsports'); if (v) MAHSUN_SITE = v;
            if (_MAHSUN_HEADERS) { _MAHSUN_HEADERS.Referer = MAHSUN_SITE; _MAHSUN_HEADERS.Origin = MAHSUN_SITE; }
        });
    }
    return _cfgReady;
}

/**
 * Anthology Canlı TV & M3U Katalog Motoru
 * 80+ Ulusal, Haber, Spor ve Canlı TV kanalı
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
                        description: channelName + " Canlı Yayın"
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
    var targetId = (typeof args === 'string') ? args : (args && args.id ? args.id : null);
    if (!targetId) return Promise.resolve({ meta: null });

    return fetchChannels()
        .then(function(content) {
            var lines = content.split('\n');
            var name = targetId.replace(/^tv:/, '');
            var logo = "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png";
            var searchKey = cleanKey(targetId.replace(/^tv:/, ''));

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
                        var logoMatch = line.match(/tvg-logo="([^"]+)"/i);
                        if (logoMatch) logo = logoMatch[1];
                        break;
                    }
                }
            }

            return {
                meta: {
                    id: targetId,
                    type: "tv",
                    name: name,
                    poster: logo,
                    background: logo,
                    description: name + " Canlı Yayın",
                    videos: [{
                        id: targetId,
                        title: name,
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
    return /bein|ssport|sspor|tivibu|smartspor|smarts|exxen|tabii|eurosport|nba/.test(key);
}

// ── MahsunSports yedek akış motoru (host dinamik, kodda sabit yedek host yok) ──
var MAHSUN_SITE = "https://mahsunsports80.xyz/";
var ANDRO_URL_RE = /https:\/\/andro\.evrenesoglu\d+\.click\/checklist\//g;
var _MAHSUN_HEADERS = {
    'User-Agent': _HEADERS['User-Agent'],
    'Referer': MAHSUN_SITE,
    'Origin': MAHSUN_SITE
};
var mahsunBasesCache = null;

function fetchMahsunBases() {
    var now = Date.now();
    if (mahsunBasesCache && (now - mahsunBasesCache.time < 15 * 60 * 1000)) {
        return Promise.resolve(mahsunBasesCache.bases);
    }
    return fetch(MAHSUN_SITE + "event.html?id=androstreamlivebs1", { headers: _MAHSUN_HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(txt) {
            var bases = [];
            var m;
            ANDRO_URL_RE.lastIndex = 0;
            while ((m = ANDRO_URL_RE.exec(txt)) !== null) {
                if (bases.indexOf(m[0]) === -1) bases.push(m[0]);
            }
            mahsunBasesCache = { time: now, bases: bases };
            return bases;
        })
        .catch(function() {
            mahsunBasesCache = { time: now, bases: [] };
            return [];
        });
}

function androIdFromUrl(url) {
    var m = String(url || '').match(/\/checklist\/([A-Za-z0-9]+)\.m3u8/);
    return m ? m[1] : null;
}

async function getStreams(args) {
    var targetId = (typeof args === 'string') ? args : (args ? args.id : "");
    if (!targetId) {
        var e = [];
        e.streams = [];
        return e;
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
    var searchKey = cleanKey(targetId.replace(/^tv:/, ''));
    var androPrimary = null;
    var matchedBackup = '';
    var matchedName = '';

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.indexOf("#EXTINF") !== -1) {
            var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
            var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
            var nameMatch = line.match(/"\s*,\s*(.+)$/);
            var backupMatch = line.match(/tvg-backup="([^"]+)"/i);
            var aliasName = nameMatch ? nameMatch[1].trim() : line.split(',').pop().trim();

            var cId = cleanKey(tvgIdMatch ? tvgIdMatch[1] : "");
            var cName = cleanKey(tvgNameMatch ? tvgNameMatch[1] : "");
            var aName = cleanKey(aliasName);

            if (cId === searchKey || cName === searchKey || aName === searchKey || (aName.length > 2 && (aName.includes(searchKey) || searchKey.includes(aName)))) {
                if (!matchedName) matchedName = aliasName;
                var encrypted = isEncryptedChannel(aliasName, cId);
                var backupAttr = backupMatch ? backupMatch[1] : '';
                if (backupAttr) matchedBackup = backupAttr;
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
                            } else if (encrypted) {
                                sObj.headers = _MAHSUN_HEADERS;
                                if (androIdFromUrl(urlLine)) androPrimary = urlLine;
                            } else {
                                sObj.headers = _HEADERS;
                            }
                            streams.push(sObj);
                        }
                        break;
                    }
                    if (urlLine.indexOf("#EXTINF") === 0) break;
                }

                // Kullanıcı canli.m3u satırına tvg-backup="..." verdiyse o kullanılır;
                // aksi halde resmi KNOWN_BACKUPS yedek olarak eklenir.
                if (matchedBackup) {
                    if (!seenUrls[matchedBackup] && matchedBackup !== urlLine) {
                        seenUrls[matchedBackup] = true;
                        streams.push({
                            name: '⌜ Anthology ⌟',
                            title: aliasName + ' [Yedek Akış]',
                            url: matchedBackup,
                            headers: encrypted ? _MAHSUN_HEADERS : _HEADERS,
                            behaviorHints: { isLive: true }
                        });
                    }
                } else {
                    for (var bk in KNOWN_BACKUPS) {
                        if ((cId === bk || searchKey === bk) && !seenUrls[KNOWN_BACKUPS[bk]] && KNOWN_BACKUPS[bk] !== urlLine) {
                            seenUrls[KNOWN_BACKUPS[bk]] = true;
                            streams.push({
                                name: '⌜ Anthology ⌟',
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
        if (streams.length >= 4) break;
    }

    // Şifreli kanallar için MahsunSports'tan dinamik andro yedek.
    if (androPrimary && !matchedBackup) {
        var bases = await fetchMahsunBases();
        var androId = androIdFromUrl(androPrimary);
        for (var bi = 0; bi < bases.length; bi++) {
            var bu = bases[bi] + androId + ".m3u8";
            if (bu !== androPrimary && !seenUrls[bu]) {
                seenUrls[bu] = true;
                streams.push({
                    name: '⌜ Anthology Spor · Yedek ⌟',
                    title: (matchedName || 'Yedek') + ' [Yedek Akış]',
                    url: bu,
                    headers: _MAHSUN_HEADERS,
                    behaviorHints: { isLive: true }
                });
            }
        }
    }

    streams.streams = streams;
    return streams;
}

// --- EXPORTS ---
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
