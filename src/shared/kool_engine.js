/**
 * Anthology Yerel Kool.ws Çözücüsü (Go motorundan JavaScript'e port edildi)
 *
 * Sunucu proxy'si olmadan doğrudan kool.ws/live/resolve API'si üzerinden
 * kool1, kool6, kool7 sunucu havuzlarını paralel çözer ve canlılık kontrolü yapar.
 * QuickJS/Nuvio ve Node.js/Stremio ortamları ile %100 uyumludur.
 */
const { loadConfig, val } = require('./config.js');
const { timeoutSignal } = require('./http.js');
const koolCatalog = require('./kool_catalog.js');

var DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
var KOOL_BASE = 'https://kool.ws';

var _koolByKey = null;
var _koolKeyById = null;

function poolPriority(pool) {
    if (pool === 'kool1') return 1;
    if (pool === 'kool6') return 2;
    if (pool === 'kool7') return 3;
    return 9;
}

function initKoolCatalog() {
    if (_koolByKey) return;
    _koolByKey = {};
    _koolKeyById = {};
    var channels = (koolCatalog && Array.isArray(koolCatalog.channels)) ? koolCatalog.channels : [];
    for (var i = 0; i < channels.length; i++) {
        var ch = channels[i];
        if (!ch || !ch.key || !Array.isArray(ch.variants) || ch.variants.length === 0) continue;
        var variants = ch.variants.slice().sort(function (a, b) {
            if ((a.quality || 0) !== (b.quality || 0)) {
                return (b.quality || 0) - (a.quality || 0);
            }
            return poolPriority(a.pool) - poolPriority(b.pool);
        });
        _koolByKey[ch.key] = variants;
        for (var j = 0; j < variants.length; j++) {
            if (variants[j].koolId) {
                _koolKeyById[String(variants[j].koolId)] = ch.key;
            }
        }
    }
}

function getKoolKeyByUrlOrId(urlOrId) {
    initKoolCatalog();
    if (!urlOrId) return '';
    var m = String(urlOrId).match(/\/live\/play\/(\d+)/);
    var id = m ? m[1] : String(urlOrId).trim();
    return _koolKeyById[id] || '';
}

function getKoolPools(channelKey) {
    initKoolCatalog();
    var variants = _koolByKey[channelKey];
    if (!variants || variants.length === 0) return [];
    var order = ['kool1', 'kool6', 'kool7'];
    var pools = [];
    for (var i = 0; i < order.length; i++) {
        var p = order[i];
        for (var j = 0; j < variants.length; j++) {
            if (variants[j].pool === p) {
                pools.push(p);
                break;
            }
        }
    }
    return pools;
}

async function resolveSingleKoolVariant(koolBase, variant) {
    var playUrl = variant.playUrl || (variant.koolId ? (koolBase + '/live/play/' + variant.koolId) : '');
    if (!playUrl) return null;

    var apiUrl = koolBase + '/live/resolve?region=TR&language=tr&url=' + encodeURIComponent(playUrl);
    try {
        var res = await fetch(apiUrl, {
            headers: {
                'User-Agent': DEFAULT_UA,
                'Referer': koolBase + '/',
                'Accept': 'application/json, */*'
            },
            signal: timeoutSignal(4500)
        });
        if (!res || res.status < 200 || res.status >= 400) return null;
        var parsed = await res.json();
        if (!parsed || !parsed.url) return null;

        var headers = { 'User-Agent': DEFAULT_UA };
        if (parsed.headers && typeof parsed.headers === 'object') {
            for (var hk in parsed.headers) {
                if (Object.prototype.hasOwnProperty.call(parsed.headers, hk)) {
                    headers[hk] = parsed.headers[hk];
                }
            }
        }
        return {
            url: parsed.url,
            headers: headers,
            pool: variant.pool || 'kool1',
            quality: variant.quality || 720,
            rawName: variant.rawName || ''
        };
    } catch (e) {
        return null;
    }
}

async function testStreamAlive(streamUrl, headers) {
    if (!streamUrl) return false;
    try {
        var res = await fetch(streamUrl, {
            headers: headers || { 'User-Agent': DEFAULT_UA },
            signal: timeoutSignal(3000)
        });
        if (!res || res.status < 200 || res.status >= 400) return false;
        if (streamUrl.indexOf('.m3u8') !== -1 || streamUrl.indexOf('/sunshine/') !== -1) {
            var txt = await res.text();
            if (txt && txt.indexOf('#EXTM3U') === -1) {
                return false;
            }
        }
        return true;
    } catch (e) {
        return false;
    }
}

async function resolveKoolPool(channelKey, pool, koolBase) {
    initKoolCatalog();
    var allVariants = _koolByKey[channelKey];
    if (!allVariants || allVariants.length === 0) return null;

    var candidates = (!pool || pool === 'kool')
        ? allVariants
        : allVariants.filter(function (v) { return v.pool === pool; });
    if (candidates.length === 0) return null;

    var maxTries = Math.min(candidates.length, 3);
    for (var i = 0; i < maxTries; i++) {
        var v = candidates[i];
        var resolved = await resolveSingleKoolVariant(koolBase, v);
        if (!resolved || !resolved.url) continue;
        var alive = await testStreamAlive(resolved.url, resolved.headers);
        if (alive) {
            return resolved;
        }
    }
    return null;
}

function formatKoolStream(resolved, channelName) {
    var poolLabel = 'Sunucu 1';
    var shortPool = 'Kool S1';
    if (resolved.pool === 'kool6') {
        poolLabel = 'Sunucu 6';
        shortPool = 'Kool S6';
    } else if (resolved.pool === 'kool7') {
        poolLabel = 'Sunucu 7';
        shortPool = 'Kool S7';
    }
    var qualTag = resolved.quality >= 2160 ? '4K UHD' : (resolved.quality >= 1080 ? '1080p FHD' : 'HD');
    return {
        name: '⌜ ' + shortPool + ' ⌟',
        title: channelName + ' [Kool.ws · ' + poolLabel + ' · ' + qualTag + ']',
        url: resolved.url,
        headers: resolved.headers,
        behaviorHints: { isLive: true }
    };
}

async function resolveAllKoolStreams(channelKey, channelName) {
    initKoolCatalog();
    if (!channelKey || !_koolByKey[channelKey]) return [];

    try {
        await loadConfig();
        var cfgBase = val('urls.live.kool.base');
        if (cfgBase) KOOL_BASE = String(cfgBase).replace(/\/+$/, '');
    } catch (e) {}

    var pools = getKoolPools(channelKey);
    if (pools.length === 0) return [];

    var results = await Promise.all(
        pools.map(function (p) {
            return resolveKoolPool(channelKey, p, KOOL_BASE);
        })
    );

    var streams = [];
    var seen = {};
    for (var i = 0; i < results.length; i++) {
        var r = results[i];
        if (r && r.url && !seen[r.url]) {
            seen[r.url] = true;
            streams.push(formatKoolStream(r, channelName || channelKey));
        }
    }
    return streams;
}

module.exports = {
    initKoolCatalog: initKoolCatalog,
    getKoolKeyByUrlOrId: getKoolKeyByUrlOrId,
    getKoolPools: getKoolPools,
    resolveKoolPool: resolveKoolPool,
    resolveAllKoolStreams: resolveAllKoolStreams,
    testStreamAlive: testStreamAlive
};
