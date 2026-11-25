/**
 * Anthology Paylaşılan Canlı TV Paketi Motoru
 * Ulusal, Haber, Belgesel & Çocuk, Müzik & Eğlence ve Sinema paketleri için ortak altyapı.
 * QuickJS/Nuvio ve Node.js/Stremio ortamları ile %100 uyumludur.
 */
const { parseTvgLang, channelDescription } = require('./channel_lang.js');
const { sortStreamsByQuality } = require('./quality.js');
const { loadConfig, val, wrapAll } = require('./config.js');
const { timeoutSignal } = require('./http.js');
const { initSportConfig, resolveAnthologyLiveStreams } = require('./sport_engine.js');

var DEFAULT_M3U_REMOTE = 'https://raw.githubusercontent.com/falsisdev/anthology/main/providers/M3U/Liste/canli.m3u';
var DEFAULT_LOGO = 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png';
var _HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*'
};

var M3U_REMOTE = DEFAULT_M3U_REMOTE;
var _cfgReady = null;
var cachedText = null;
var cacheTime = 0;

function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = Promise.all([loadConfig(), initSportConfig()]).then(function () {
            var v = val('urls.live.m3u_remote');
            if (v) M3U_REMOTE = String(v).replace(/\/+$/, '');
        });
    }
    return _cfgReady;
}

function getNodeModules() {
    if (typeof process === 'undefined' || !process.versions || !process.versions.node || typeof require === 'undefined') {
        return null;
    }
    try {
        return {
            path: require('path'),
            fs: require('fs')
        };
    } catch (e) {
        return null;
    }
}

function fetchChannels() {
    var now = Date.now();
    if (cachedText && (now - cacheTime < 300000)) {
        return Promise.resolve(cachedText);
    }

    var nodeMods = getNodeModules();
    if (nodeMods && nodeMods.fs && nodeMods.path) {
        var candidates = [];
        try {
            if (typeof __dirname === 'string') {
                candidates.push(nodeMods.path.resolve(__dirname, 'M3U', 'Liste', 'canli.m3u'));
                candidates.push(nodeMods.path.resolve(__dirname, '..', '..', 'providers', 'M3U', 'Liste', 'canli.m3u'));
            }
            if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
                candidates.push(nodeMods.path.resolve(process.cwd(), 'providers', 'M3U', 'Liste', 'canli.m3u'));
            }
            for (var i = 0; i < candidates.length; i++) {
                if (candidates[i] && nodeMods.fs.existsSync(candidates[i])) {
                    cachedText = nodeMods.fs.readFileSync(candidates[i], 'utf8');
                    cacheTime = now;
                    return Promise.resolve(cachedText);
                }
            }
        } catch (e) {}
    }

    return fetch(M3U_REMOTE, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: timeoutSignal(12000)
    })
        .then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
        })
        .then(function (txt) {
            cachedText = txt;
            cacheTime = now;
            return txt;
        });
}

function cleanKey(s) {
    return (s || '')
        .toString()
        .replace(/İ/g, 'I')
        .replace(/ı/g, 'i')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function parseGroupChannels(content, matchGroup) {
    var lines = String(content || '').split('\n');
    var channels = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.indexOf('#EXTINF') === -1) continue;

        var groupMatch = line.match(/group-title="([^"]+)"/i);
        var group = groupMatch ? groupMatch[1] : '';
        if (!matchGroup(group)) continue;

        var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
        var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
        var logoMatch = line.match(/tvg-logo="([^"]+)"/i);
        var nameMatch = line.match(/"\s*,\s*(.+)$/);
        var channelName = nameMatch ? nameMatch[1].trim() : line.split(',').pop().trim();
        var rawId = (tvgIdMatch && tvgIdMatch[1])
            ? tvgIdMatch[1].trim()
            : (tvgNameMatch ? tvgNameMatch[1].trim() : channelName);
        var channelId = rawId.indexOf('tv:') === 0 ? rawId : ('tv:' + rawId);
        var logo = logoMatch ? logoMatch[1] : DEFAULT_LOGO;

        var streamUrl = '';
        for (var j = i + 1; j < lines.length; j++) {
            var u = lines[j].trim();
            if (u.indexOf('http') === 0) {
                streamUrl = u;
                break;
            }
            if (u.indexOf('#EXTINF') === 0) break;
        }

        var backups = [];
        var b1 = line.match(/tvg-backup="([^"]+)"/i);
        var b2 = line.match(/tvg-backup2="([^"]+)"/i);
        if (b1) b1[1].split('|').forEach(function (u) { if (u && u.trim()) backups.push(u.trim()); });
        if (b2) b2[1].split('|').forEach(function (u) { if (u && u.trim()) backups.push(u.trim()); });

        channels.push({
            id: channelId,
            name: channelName,
            logo: logo,
            url: streamUrl,
            backups: backups,
            lang: parseTvgLang(line)
        });
    }

    return channels;
}

function isRejectedNonLiveRequest(targetId, mediaType) {
    var raw = String(targetId || '').trim();
    if (!raw) return true;
    if (mediaType === 'movie' || mediaType === 'series') return true;
    // Bare TMDB/IMDb movie & series IDs (e.g. "1396", "tt0903747", "1396:1:1") never map to live TV packs.
    if (raw.toLowerCase().indexOf('tv:') !== 0 && /^(?:tt\d+|\d+)(?::\d+:\d+)?$/i.test(raw)) {
        return true;
    }
    return false;
}

function findMatchingChannel(channels, targetId) {
    var raw = String(targetId || '').trim();
    var searchKey = cleanKey(raw.replace(/^tv:/i, ''));
    if (!searchKey) return null;

    for (var i = 0; i < channels.length; i++) {
        var ch = channels[i];
        var cId = cleanKey(ch.id.replace(/^tv:/i, ''));
        var cName = cleanKey(ch.name);
        if (ch.id === raw || cId === searchKey || cName === searchKey) {
            return ch;
        }
    }

    if (searchKey.length >= 4) {
        for (var j = 0; j < channels.length; j++) {
            var ch2 = channels[j];
            var cId2 = cleanKey(ch2.id.replace(/^tv:/i, ''));
            var cName2 = cleanKey(ch2.name);
            if ((cName2.length >= 4 && (cName2.indexOf(searchKey) !== -1 || searchKey.indexOf(cName2) !== -1)) ||
                (cId2.length >= 4 && (cId2.indexOf(searchKey) !== -1 || searchKey.indexOf(cId2) !== -1))) {
                return ch2;
            }
        }
    }

    return null;
}

function buildStreamEntry(streamName, baseName, liveLabel, url) {
    var ytMatch = (url || '').match(/(?:watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
        return {
            name: streamName,
            title: baseName + ' [Canlı HD · YouTube]',
            ytId: ytMatch[1],
            behaviorHints: { isLive: true }
        };
    }
    return {
        name: streamName,
        title: liveLabel,
        url: url,
        headers: _HEADERS,
        behaviorHints: { isLive: true }
    };
}

function createLiveTvProvider(opts) {
    var streamName = opts.streamName;
    var genre = opts.genre;
    var matchGroup = opts.matchGroup;

    function getCatalog() {
        return fetchChannels()
            .then(function (content) {
                var channels = parseGroupChannels(content, matchGroup);
                var metas = channels.map(function (ch) {
                    return {
                        id: ch.id,
                        type: 'tv',
                        name: ch.name,
                        poster: ch.logo,
                        background: ch.logo,
                        genres: [genre],
                        description: genre + ' • ' + channelDescription(ch.name, ch.lang)
                    };
                });
                return { metas: metas };
            })
            .catch(function () {
                return { metas: [] };
            });
    }

    async function getStreams(args) {
        var targetId = (typeof args === 'string') ? args : (args ? (args.id || args.name || '') : '');
        var mediaType = (args && typeof args === 'object') ? (args.type || args.mediaType || '') : '';
        var empty = [];
        empty.streams = empty;

        if (isRejectedNonLiveRequest(targetId, mediaType)) {
            return empty;
        }

        try {
            var content = await fetchChannels();
            var channels = parseGroupChannels(content, matchGroup);
            var ch = findMatchingChannel(channels, targetId);
            if (!ch) return empty;

            var officialStreams = [];
            var proxyStreams = [];
            var seenUrls = {};
            var isLiveProxyUrl = function (u) {
                return u && u.indexOf('/live/') !== -1 && u.indexOf('anthology-live') !== -1;
            };

            if (ch.url) {
                seenUrls[ch.url] = true;
                if (isLiveProxyUrl(ch.url)) {
                    proxyStreams.push(buildStreamEntry('⌜ Anthology Live · Otomatik ⌟', ch.name, ch.name + ' [Kool.ws · Otomatik]', ch.url));
                } else {
                    officialStreams.push(buildStreamEntry(streamName, ch.name, ch.name + ' [Canlı HD · Resmi]', ch.url));
                }
            }
            if (ch.backups && ch.backups.length > 0) {
                for (var bkIdx = 0; bkIdx < ch.backups.length; bkIdx++) {
                    var bUrl = ch.backups[bkIdx];
                    if (bUrl && !seenUrls[bUrl]) {
                        seenUrls[bUrl] = true;
                        var bSuffix = ch.backups.length > 1 ? (' [Yedek Akış ' + (bkIdx + 1) + ']') : ' [Yedek Akış]';
                        officialStreams.push(buildStreamEntry(streamName, ch.name + bSuffix, ch.name + bSuffix, bUrl));
                    }
                }
            }

            try {
                var liveSources = await resolveAnthologyLiveStreams(ch.id, ch.name, { isSport: false });
                for (var li = 0; li < liveSources.length; li++) {
                    var ls = liveSources[li];
                    if (ls && ls.url && !seenUrls[ls.url]) {
                        seenUrls[ls.url] = true;
                        proxyStreams.push(ls);
                    }
                }
            } catch (e) {}

            var streams = sortStreamsByQuality(officialStreams).concat(proxyStreams);
            streams.streams = streams;
            return streams;
        } catch (e) {
            return empty;
        }
    }

    function getMeta(args) {
        var targetId = (typeof args === 'string') ? args : (args && args.id ? args.id : null);
        if (!targetId) return Promise.resolve({ meta: null });

        return fetchChannels()
            .then(function (content) {
                var channels = parseGroupChannels(content, matchGroup);
                var ch = findMatchingChannel(channels, targetId);
                if (!ch) return { meta: null };

                var description = genre + ' • ' + channelDescription(ch.name, ch.lang);

                return {
                    meta: {
                        id: targetId,
                        type: 'tv',
                        name: ch.name,
                        poster: ch.logo,
                        background: ch.logo,
                        description: description,
                        genres: [genre],
                        videos: [{ id: targetId, title: ch.name, released: new Date().toISOString() }]
                    }
                };
            })
            .catch(function () {
                return { meta: null };
            });
    }

    return wrapAll({
        getStreams: getStreams,
        getCatalog: getCatalog,
        getMeta: getMeta
    }, cfgReady);
}

module.exports = {
    createLiveTvProvider: createLiveTvProvider,
    cfgReady: cfgReady
};
