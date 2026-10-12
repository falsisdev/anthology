const { sortStreamsByQuality } = require("../shared/quality.js");
const { parseTvgLang, channelDescription } = require("../shared/channel_lang.js");
const { loadConfig, val, wrapAll } = require("../shared/config.js");
const { initSportConfig, resolveMultiSportStreams } = require("../shared/sport_engine.js");

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = Promise.all([loadConfig(), initSportConfig()]).then(function () {
            var v = val('urls.live.m3u_remote');
            if (v) M3U_REMOTE = String(v).replace(/\/+$/, '');
        });
    }
    return _cfgReady;
}

/**
 * Anthology Canlı Spor Paketi — 5 Büyük Platform Entegrasyonu
 * Taraftarium24, ArdaSports (SelcukSports), AlemdarSport, MahsunSports ve PapazSports
 * 7/24 spor kanalları altında doğrudan, açık etiketli ve dinamik yayın sunumu.
 */

var path = typeof require !== 'undefined' ? require('path') : null;
var fs = typeof require !== 'undefined' ? require('fs') : null;

var M3U_REMOTE = "https://raw.githubusercontent.com/falsisdev/anthology/main/providers/M3U/Liste/canli.m3u";

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
    if (fs && path) {
        try {
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
    return fetch(M3U_REMOTE, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        .then(function(res) { return res.text(); })
        .then(function(txt) {
            cachedText = txt;
            cacheTime = now;
            return txt;
        });
}

function cleanKey(s) {
    return (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseSportChannels(content) {
    var lines = content.split('\n');
    var channels = [];
    var isTargetGroup = false;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.indexOf('#EXTINF') !== -1) {
            var groupMatch = line.match(/group-title="([^"]+)"/i);
            var group = groupMatch ? groupMatch[1] : '';
            isTargetGroup = group.indexOf('SPOR') !== -1;

            if (isTargetGroup) {
                var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
                var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
                var logoMatch = line.match(/tvg-logo="([^"]+)"/i);
                var backupMatch = line.match(/tvg-backup="([^"]+)"/i);
                var srcAttrMatch = line.match(/tvg-src="([^"]+)"/i);
                var nameMatch = line.match(/"\s*,\s*(.+)$/);
                var channelName = nameMatch ? nameMatch[1].trim() : line.split(',').pop().trim();
                var rawId = tvgIdMatch && tvgIdMatch[1] ? tvgIdMatch[1].trim() : (tvgNameMatch ? tvgNameMatch[1].trim() : channelName);
                var channelId = rawId.startsWith('tv:') ? rawId : ('tv:' + rawId);
                var logo = logoMatch ? logoMatch[1] : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png";

                var namedSrcs = [];
                if (srcAttrMatch && srcAttrMatch[1]) {
                    var srcParts = srcAttrMatch[1].split('|');
                    for (var psi = 0; psi + 1 < srcParts.length; psi += 2) {
                        var srcName = (srcParts[psi] || '').trim();
                        var srcUrl = (srcParts[psi + 1] || '').trim();
                        if (srcName && srcUrl) namedSrcs.push({ name: srcName, url: srcUrl });
                    }
                }

                var streamUrl = '';
                for (var j = i + 1; j < lines.length; j++) {
                    var u = lines[j].trim();
                    if (u.indexOf('http') === 0) {
                        streamUrl = u;
                        break;
                    }
                    if (u.indexOf('#EXTINF') === 0) break;
                }

                channels.push({
                    id: channelId,
                    name: channelName,
                    logo: logo,
                    url: streamUrl,
                    backup: backupMatch ? backupMatch[1] : '',
                    srcs: namedSrcs,
                    lang: parseTvgLang(line)
                });
            }
        }
    }
    return channels;
}

function makeStream(name, title, url, headers) {
    return {
        name: name,
        title: title,
        url: url,
        headers: headers,
        behaviorHints: { isLive: true }
    };
}

var VERIFIED_BACKUPS = {
    'trtspor': 'https://tv-trtspor1.medya.trt.com.tr/master.m3u8',
    'trtsporyildiz': 'https://tv-trtspor2.medya.trt.com.tr/master.m3u8',
    'trt1': 'https://tv-trt1.medya.trt.com.tr/master.m3u8',
    'aspor': 'https://trkvz-live.ercdn.net/asportv/asportv.m3u8',
    'fbtv': 'http://1hskrdto.rocketcdn.com/fenerbahcetv.smil/playlist.m3u8',
    'tv85': 'https://tv8.daioncdn.net/tv8bucuk/tv8bucuk.m3u8?app=tv8bucuk_web&ce=3'
};

// ── Stremio / Nuvio getCatalog ───────────────────────────────────────
function getCatalog(args) {
    return fetchChannels()
        .then(function(content) {
            var channels = parseSportChannels(content);
            var metas = channels.map(function(ch) {
                return {
                    id: ch.id,
                    type: "tv",
                    name: ch.name,
                    poster: ch.logo,
                    background: ch.logo,
                    genres: ["Spor"],
                    description: channelDescription(ch.name, ch.lang)
                };
            });
            return { metas: metas };
        })
        .catch(function() {
            return { metas: [] };
        });
}

// ── Stremio / Nuvio getMeta ──────────────────────────────────────────
function getMeta(args) {
    var targetId = (typeof args === 'string') ? args : (args && args.id ? args.id : null);
    if (!targetId) return Promise.resolve({ meta: null });

    return fetchChannels()
        .then(function(content) {
            var channels = parseSportChannels(content);
            var cleanTarget = cleanKey(targetId.replace(/^tv:/, ''));
            var ch = channels.find(function(c) {
                return c.id === targetId || cleanKey(c.id.replace(/^tv:/, '')) === cleanTarget || cleanKey(c.name) === cleanTarget;
            });
            if (!ch) ch = channels[0];
            if (!ch) return { meta: null };
            return {
                meta: {
                    id: targetId,
                    type: "tv",
                    name: ch.name,
                    poster: ch.logo,
                    background: ch.logo,
                    description: channelDescription(ch.name, ch.lang),
                    genres: ["Spor"],
                    videos: [{ id: targetId, title: ch.name, released: new Date().toISOString() }]
                }
            };
        })
        .catch(function() { return { meta: null }; });
}

// ── Stremio / Nuvio getStreams ───────────────────────────────────────
async function getStreams(args) {
    var targetId = (typeof args === 'string') ? args : (args ? (args.id || args.name) : "");
    var mediaType = (args && args.type) || (args && args.mediaType) || '';
    var isLiveRequest = /^tv:/i.test(targetId) || mediaType === 'channel' || (mediaType === 'tv' && /^tv:/i.test((args && args.id) || ''));
    if (!isLiveRequest && targetId && !/^tv:/i.test(targetId)) {
        var looksLikeTmdb = /^(tt\d+|\d+)$/.test(String(targetId).split(':')[0]);
        if (looksLikeTmdb || mediaType === 'movie') {
            var emptyNoLive = [];
            emptyNoLive.streams = [];
            return emptyNoLive;
        }
    }

    try {
        var content = await fetchChannels();
        var channels = parseSportChannels(content);
        var searchKey = cleanKey(targetId.replace(/^tv:/, ''));
        var matched = null;

        for (var i = 0; i < channels.length; i++) {
            var ch = channels[i];
            var cId = cleanKey(ch.id.replace(/^tv:/, ''));
            var cName = cleanKey(ch.name);
            if (cId === searchKey || cName === searchKey || (searchKey && (cName.includes(searchKey) || searchKey.includes(cName)))) {
                matched = ch;
                break;
            }
        }

        var chTitle = (matched && matched.name) || searchKey.toUpperCase();

        // 5 Büyük Platform Eşzamanlı Çözümleme
        var streams = await resolveMultiSportStreams(searchKey || chTitle, chTitle);

        // canli.m3u birincil akışı
        if (matched && matched.url) {
            var alreadyPresent = streams.some(function(s) { return s.url === matched.url; });
            if (!alreadyPresent) {
                streams.push(makeStream('⌜ Anthology Spor ⌟', matched.name + ' [Canlı]', matched.url, _HEADERS));
            }
        }

        // canli.m3u çoklu yedekler (tvg-src)
        if (matched && matched.srcs) {
            for (var nsi = 0; nsi < matched.srcs.length; nsi++) {
                var ns = matched.srcs[nsi];
                if (ns.url) {
                    var exists = streams.some(function(s) { return s.url === ns.url; });
                    if (!exists) {
                        streams.push(makeStream('⌜ Anthology Spor · ' + ns.name + ' ⌟', matched.name + ' [' + ns.name + ']', ns.url, _HEADERS));
                    }
                }
            }
        }

        // Doğrulanmış resmi yedekler (TRT, A Spor, TV 8.5 vb.)
        if (matched && matched.backup) {
            var bExists = streams.some(function(s) { return s.url === matched.backup; });
            if (!bExists) {
                streams.push(makeStream('⌜ Anthology Spor · Resmi ⌟', chTitle + ' [Resmi Akış]', matched.backup, _HEADERS));
            }
        } else {
            for (var bk in VERIFIED_BACKUPS) {
                if (cleanKey(targetId).includes(bk)) {
                    var extra = VERIFIED_BACKUPS[bk];
                    var extraExists = streams.some(function(s) { return s.url === extra; });
                    if (!extraExists) {
                        streams.push(makeStream('⌜ Anthology Spor · Resmi ⌟', chTitle + ' [Resmi Akış]', extra, _HEADERS));
                    }
                    break;
                }
            }
        }

        streams.streams = streams;
        return streams;
    } catch (err) {
        var empty = [];
        empty.streams = [];
        return empty;
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
    module.exports = wrapAll({ getStreams: getStreams, getCatalog: getCatalog, getMeta: getMeta }, cfgReady);
} else {
    var g = (typeof globalThis !== 'undefined') ? globalThis : (typeof global !== 'undefined') ? global : window;
    g.getStreams = getStreams; g.getCatalog = getCatalog; g.getMeta = getMeta;
}