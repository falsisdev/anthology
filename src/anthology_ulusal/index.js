const { sortStreamsByQuality } = require("../shared/quality.js");
const { loadConfig, val, wrapAll } = require("../shared/config.js");

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v;
            v = val('urls.live.m3u_remote'); if (v) M3U_REMOTE = String(v).replace(/\/+$/, '');
        });
    }
    return _cfgReady;
}

/**
 * Anthology Ulusal Kanallar Paketi
 * TRT 1, ATV, Kanal D, Show TV, Star TV, NOW TV, TV8, Kanal 7 vb.
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
            var localPath = path.resolve(__dirname, 'M3U', 'Liste', 'canli.m3u');
            if (fs.existsSync(localPath)) {
                cachedText = fs.readFileSync(localPath, 'utf8');
                cacheTime = now;
                return Promise.resolve(cachedText);
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

function parseUlusalChannels(content) {
    var lines = content.split('\n');
    var channels = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.indexOf('#EXTINF') !== -1) {
            var groupMatch = line.match(/group-title="([^"]+)"/i);
            var group = groupMatch ? groupMatch[1] : '';

            if (group.indexOf('ULUSAL') !== -1) {
                var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
                var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
                var logoMatch = line.match(/tvg-logo="([^"]+)"/i);
                var nameMatch = line.match(/"\s*,\s*(.+)$/);
                var channelName = nameMatch ? nameMatch[1].trim() : line.split(',').pop().trim();
                var rawId = tvgIdMatch && tvgIdMatch[1] ? tvgIdMatch[1].trim() : (tvgNameMatch ? tvgNameMatch[1].trim() : channelName);
                var channelId = rawId.startsWith('tv:') ? rawId : ('tv:' + rawId);
                var logo = logoMatch ? logoMatch[1] : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png";

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
                    url: streamUrl
                });
            }
        }
    }
    return channels;
}

function getCatalog(args) {
    return fetchChannels()
        .then(function(content) {
            var channels = parseUlusalChannels(content);
            var metas = channels.map(function(ch) {
                return {
                    id: ch.id,
                    type: "tv",
                    name: ch.name,
                    poster: ch.logo,
                    background: ch.logo,
                    genres: ["Ulusal"],
                    description: ch.name + " Canlı Yayın"
                };
            });
            return { metas: metas };
        })
        .catch(function() {
            return { metas: [] };
        });
}

function getStreams(args) {
    var targetId = (typeof args === 'string') ? args : (args ? (args.id || args.name) : "");

    return fetchChannels()
        .then(function(content) {
            var channels = parseUlusalChannels(content);
            if (!targetId && channels.length > 0) {
                return channels.slice(0, 5).map(function(ch) {
                    return {
                        name: '⌜ Anthology Ulusal ⌟',
                        title: ch.name + ' [Canlı]',
                        url: ch.url,
                        headers: _HEADERS,
                        behaviorHints: { isLive: true }
                    };
                });
            }

            var searchKey = cleanKey(targetId.replace(/^tv:/, ''));
            var streams = [];

            for (var i = 0; i < channels.length; i++) {
                var ch = channels[i];
                var cId = cleanKey(ch.id.replace(/^tv:/, ''));
                var cName = cleanKey(ch.name);

                if (cId === searchKey || cName === searchKey || (searchKey && (cName.includes(searchKey) || searchKey.includes(cName)))) {
                    streams.push({
                        name: '⌜ Anthology Ulusal ⌟',
                        title: ch.name + ' [Canlı HD]',
                        url: ch.url,
                        headers: _HEADERS,
                        behaviorHints: { isLive: true }
                    });
                    break;
                }
            }

            if (streams.length === 0 && channels.length > 0) {
                streams.push({
                    name: '⌜ Anthology Ulusal ⌟',
                    title: channels[0].name + ' [Canlı HD]',
                    url: channels[0].url,
                    headers: _HEADERS,
                    behaviorHints: { isLive: true }
                });
            }

            streams.streams = streams;
            return streams;
        })
        .catch(function() {
            var empty = [];
            empty.streams = [];
            return empty;
        });
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
    module.exports = wrapAll({ getStreams: getStreams, getCatalog: getCatalog }, cfgReady);
} else {
    var g = (typeof globalThis !== 'undefined') ? globalThis : (typeof global !== 'undefined') ? global : window;
    g.getStreams = getStreams; g.getCatalog = getCatalog;
}

function getMeta(args) {
    var targetId = (typeof args === 'string') ? args : (args && args.id ? args.id : null);
    if (!targetId) return Promise.resolve({ meta: null });
    return fetchChannels()
        .then(function(content) {
            var channels = parseUlusalChannels(content);
            var cleanTarget = cleanKey(targetId.replace(/^tv:/, ''));
            var ch = channels.find(function(c) { return c.id === targetId || cleanKey(c.id.replace(/^tv:/, '')) === cleanTarget || cleanKey(c.name) === cleanTarget; }) || channels[0];
            return {
                meta: {
                    id: targetId,
                    type: "tv",
                    name: ch.name,
                    poster: ch.logo,
                    background: ch.logo,
                    description: ch.name + " Canlı Ulusal Yayın",
                    genres: ["Ulusal"],
                    videos: [{ id: targetId, title: ch.name, released: new Date().toISOString() }]
                }
            };
        })
        .catch(function() { return { meta: null }; });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams, getCatalog: getCatalog, getMeta: getMeta };
} else {
    var g = (typeof globalThis !== 'undefined') ? globalThis : (typeof global !== 'undefined') ? global : window;
    g.getStreams = getStreams; g.getCatalog = getCatalog; g.getMeta = getMeta;
}
