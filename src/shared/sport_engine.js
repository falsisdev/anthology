/**
 * Anthology Spor Motoru — 5 Büyük Platform Çözücüsü
 * 
 * 1. Taraftarium24 (teletv API)
 * 2. ArdaSports / SelcukSports (selcuksporkral1.cc + loadstream Base64)
 * 3. AlemdarSport (alemdarsport.cfd + mdalemdar CDN)
 * 4. MahsunSports (mahsunsports.xyz + Akinci IPTV CDN)
 * 5. PapazSports (papazsports.pro + auth.php + usertoken HLS)
 */

const { loadConfig, val } = require("./config.js");

var TARAFTARIUM_SITE = "https://taraftarium24-245.top/";
var TARAFTARIUM_API = "https://teletv15.top";
var TARAFTARIUM_BASE_NUM = 245;

var ARDA_SITE = "https://selcuksporkral1.cc";
var ALEMDAR_SITE = "https://alemdarsport.cfd";
var MAHSUN_SITE = "https://mahsunsports54.xyz";
var PAPAZ_SITE = "https://www.papazsports1028.pro";

var _HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*'
};

var _cfgReady = null;
function initSportConfig() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v;
            v = val('urls.live.taraftarium.base'); if (v) TARAFTARIUM_SITE = String(v);
            v = val('urls.live.taraftarium.api_base'); if (v) TARAFTARIUM_API = String(v).replace(/\/+$/, '');
            v = val('urls.live.taraftarium.base_number'); if (v && !isNaN(Number(v))) TARAFTARIUM_BASE_NUM = Number(v);
            v = val('urls.live.ardasports.base'); if (v) ARDA_SITE = String(v).replace(/\/+$/, '');
            v = val('urls.live.alemdarsport.base'); if (v) ALEMDAR_SITE = String(v).replace(/\/+$/, '');
            v = val('urls.live.mahsunsports.base'); if (v) MAHSUN_SITE = String(v).replace(/\/+$/, '');
            v = val('urls.live.papazsports.base'); if (v) PAPAZ_SITE = String(v).replace(/\/+$/, '');
        });
    }
    return _cfgReady;
}

function cleanKey(s) {
    return (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function safeAtob(b64) {
    if (typeof atob === 'function') {
        try { return atob(b64); } catch (e) {}
    }
    if (typeof Buffer !== 'undefined') {
        try { return Buffer.from(b64, 'base64').toString('utf8'); } catch (e) {}
    }
    return '';
}

function withTimeout(promise, ms) {
    var timer;
    var timeoutPromise = new Promise(function(resolve) {
        timer = setTimeout(function() { resolve(null); }, ms);
    });
    return Promise.race([
        promise.then(function(res) {
            clearTimeout(timer);
            return res;
        }).catch(function() {
            clearTimeout(timer);
            return null;
        }),
        timeoutPromise
    ]);
}

// ── Çoklu Platform Kanal Eşleştirme Sözlüğü ─────────────────────────
var SPORT_MAP = {
    "beinsports1": {
        name: "BEIN SPORTS 1",
        taraftarium: "bein-sports-1",
        ardasports: "bein-sports-1",
        alemdarsport: "bein1",
        mahsunsports: "androstreamlivebs1",
        papazsports: "100001"
    },
    "beinsports2": {
        name: "BEIN SPORTS 2",
        taraftarium: "bein-sports-2",
        ardasports: "bein-sports-2",
        alemdarsport: "bein2",
        mahsunsports: "androstreamlivebs2",
        papazsports: "100002"
    },
    "beinsports3": {
        name: "BEIN SPORTS 3",
        taraftarium: "bein-sports-3",
        ardasports: "bein-sports-3",
        alemdarsport: "bein3",
        mahsunsports: "androstreamlivebs3",
        papazsports: "100003"
    },
    "beinsports4": {
        name: "BEIN SPORTS 4",
        taraftarium: "bein-sports-4",
        ardasports: "bein-sports-4",
        alemdarsport: "bein4",
        mahsunsports: "androstreamlivebs4",
        papazsports: "100004"
    },
    "beinsports5": {
        name: "BEIN SPORTS 5",
        taraftarium: "bein-sports-5",
        ardasports: "bein-sports-5",
        alemdarsport: "bein5",
        mahsunsports: "androstreamlivebs5",
        papazsports: "100005"
    },
    "beinsportsmax1": {
        name: "BEIN SPORTS MAX 1",
        taraftarium: "bein-sports-max-1",
        ardasports: "bein-sports-max-1",
        alemdarsport: "beinmax1",
        mahsunsports: "androstreamlivebsm1",
        papazsports: "100006"
    },
    "beinsportsmax2": {
        name: "BEIN SPORTS MAX 2",
        taraftarium: "bein-sports-max-2",
        ardasports: "bein-sports-max-2",
        alemdarsport: "beinmax2",
        mahsunsports: "androstreamlivebsm2",
        papazsports: "100007"
    },
    "ssport": {
        name: "S SPORT",
        taraftarium: "s-sport",
        ardasports: "s-sport",
        alemdarsport: "ssport1",
        mahsunsports: "androstreamlivess1",
        papazsports: "100010"
    },
    "ssport1": {
        name: "S SPORT 1",
        taraftarium: "s-sport",
        ardasports: "s-sport",
        alemdarsport: "ssport1",
        mahsunsports: "androstreamlivess1",
        papazsports: "100010"
    },
    "ssport2": {
        name: "S SPORT 2",
        taraftarium: "s-sport-2",
        ardasports: "s-sport-2",
        alemdarsport: "ssport2",
        mahsunsports: "androstreamlivess2",
        papazsports: "100011"
    },
    "ssportplus": {
        name: "S SPORT PLUS",
        mahsunsports: "androstreamlivessplus1",
        alemdarsport: "ssport1"
    },
    "tivibuspor": {
        name: "TIVIBU SPOR",
        alemdarsport: "tivibu1",
        mahsunsports: "androstreamlivets",
        papazsports: "100021"
    },
    "tivibuspor1": {
        name: "TIVIBU SPOR 1",
        alemdarsport: "tivibu1",
        mahsunsports: "androstreamlivets1",
        papazsports: "100021"
    },
    "tivibuspor2": {
        name: "TIVIBU SPOR 2",
        alemdarsport: "tivibu2",
        mahsunsports: "androstreamlivets2",
        papazsports: "100022"
    },
    "tivibuspor3": {
        name: "TIVIBU SPOR 3",
        alemdarsport: "tivibu3",
        mahsunsports: "androstreamlivets3",
        papazsports: "100023"
    },
    "tivibuspor4": {
        name: "TIVIBU SPOR 4",
        alemdarsport: "tivibu4",
        mahsunsports: "androstreamlivets4",
        papazsports: "100024"
    },
    "smartspor1": {
        name: "SMART SPOR 1",
        alemdarsport: "sporsmart",
        mahsunsports: "androstreamlivesm1",
        papazsports: "100030"
    },
    "sporsmart": {
        name: "SPOR SMART 1",
        alemdarsport: "sporsmart",
        mahsunsports: "androstreamlivesm1",
        papazsports: "100030"
    },
    "smartspor2": {
        name: "SMART SPOR 2",
        alemdarsport: "sporsmart2",
        mahsunsports: "androstreamlivesm2",
        papazsports: "100031"
    },
    "sporsmart2": {
        name: "SPOR SMART 2",
        alemdarsport: "sporsmart2",
        mahsunsports: "androstreamlivesm2",
        papazsports: "100031"
    },
    "trtspor": {
        name: "TRT SPOR",
        taraftarium: "trt-spor",
        ardasports: "trt-spor",
        alemdarsport: "trtspor"
    },
    "trtsporyildiz": {
        name: "TRT SPOR YILDIZ",
        alemdarsport: "trtspor2"
    },
    "trt1": {
        name: "TRT 1",
        taraftarium: "trt-1",
        ardasports: "trt-1",
        alemdarsport: "trt1"
    },
    "aspor": {
        name: "A SPOR",
        taraftarium: "a-spor",
        ardasports: "a-spor",
        alemdarsport: "aspor",
        papazsports: "100052"
    },
    "tv85": {
        name: "TV8.5",
        alemdarsport: "tv85",
        papazsports: "100051"
    },
    "nbatv": {
        name: "NBA TV",
        papazsports: "100053"
    },
    "eurosport1": {
        name: "EUROSPORT 1",
        mahsunsports: "androstreamlivees1",
        papazsports: "100056"
    },
    "eurosport2": {
        name: "EUROSPORT 2",
        mahsunsports: "androstreamlivees2",
        papazsports: "100057"
    },
    "cbcsport": {
        name: "CBC SPORT",
        mahsunsports: "androstreamlivecbcs"
    },
    "idmantv": {
        name: "IDMAN TV",
        mahsunsports: "androstreamliveidm"
    },
    "exxentv": {
        name: "EXXEN TV",
        mahsunsports: "androstreamliveexn"
    }
};

function findSportChannelMapping(rawStr) {
    if (!rawStr) return null;
    var k = cleanKey(rawStr).replace(/^tv/, '').replace(/tr$/, '');
    if (SPORT_MAP[k]) return SPORT_MAP[k];

    if (k.indexOf('beinsportsmax1') !== -1 || k.indexOf('beinmax1') !== -1) return SPORT_MAP['beinsportsmax1'];
    if (k.indexOf('beinsportsmax2') !== -1 || k.indexOf('beinmax2') !== -1) return SPORT_MAP['beinsportsmax2'];
    if (k.indexOf('beinsport1') !== -1 || k.indexOf('bein1') !== -1) return SPORT_MAP['beinsports1'];
    if (k.indexOf('beinsport2') !== -1 || k.indexOf('bein2') !== -1) return SPORT_MAP['beinsports2'];
    if (k.indexOf('beinsport3') !== -1 || k.indexOf('bein3') !== -1) return SPORT_MAP['beinsports3'];
    if (k.indexOf('beinsport4') !== -1 || k.indexOf('bein4') !== -1) return SPORT_MAP['beinsports4'];
    if (k.indexOf('beinsport5') !== -1 || k.indexOf('bein5') !== -1) return SPORT_MAP['beinsports5'];
    if (k.indexOf('ssportplus') !== -1) return SPORT_MAP['ssportplus'];
    if (k.indexOf('ssport2') !== -1) return SPORT_MAP['ssport2'];
    if (k.indexOf('ssport') !== -1) return SPORT_MAP['ssport1'];
    if (k.indexOf('tivibu1') !== -1) return SPORT_MAP['tivibuspor1'];
    if (k.indexOf('tivibu2') !== -1) return SPORT_MAP['tivibuspor2'];
    if (k.indexOf('tivibu3') !== -1) return SPORT_MAP['tivibuspor3'];
    if (k.indexOf('tivibu4') !== -1) return SPORT_MAP['tivibuspor4'];
    if (k.indexOf('tivibu') !== -1) return SPORT_MAP['tivibuspor'];
    if (k.indexOf('smartspor2') !== -1 || k.indexOf('sporsmart2') !== -1) return SPORT_MAP['smartspor2'];
    if (k.indexOf('smartspor') !== -1 || k.indexOf('sporsmart') !== -1) return SPORT_MAP['smartspor1'];
    if (k.indexOf('trtsporyildiz') !== -1) return SPORT_MAP['trtsporyildiz'];
    if (k.indexOf('trtspor') !== -1) return SPORT_MAP['trtspor'];
    if (k.indexOf('aspor') !== -1) return SPORT_MAP['aspor'];
    if (k.indexOf('tv85') !== -1 || k.indexOf('tv8bucuk') !== -1) return SPORT_MAP['tv85'];
    if (k.indexOf('nba') !== -1) return SPORT_MAP['nbatv'];
    if (k.indexOf('eurosport2') !== -1) return SPORT_MAP['eurosport2'];
    if (k.indexOf('eurosport') !== -1) return SPORT_MAP['eurosport1'];
    if (k.indexOf('cbc') !== -1) return SPORT_MAP['cbcsport'];
    if (k.indexOf('idman') !== -1) return SPORT_MAP['idmantv'];
    if (k.indexOf('exxen') !== -1) return SPORT_MAP['exxentv'];

    for (var mk in SPORT_MAP) {
        if (k.indexOf(mk) === 0 || mk.indexOf(k) === 0) return SPORT_MAP[mk];
    }
    return null;
}

// ── 1. Taraftarium24 Çözücü ──────────────────────────────────────────
var _resolvedT24Api = null;
var _resolvedT24Site = null;
var _resolvedT24Time = 0;
var RESOLVER_TTL = 15 * 60 * 1000;

function resolveTaraftariumBase() {
    var now = Date.now();
    if (_resolvedT24Api && (now - _resolvedT24Time < RESOLVER_TTL)) {
        return Promise.resolve({ api: _resolvedT24Api, site: _resolvedT24Site });
    }

    var baseApi = _resolvedT24Api || TARAFTARIUM_API;
    var baseSite = _resolvedT24Site || TARAFTARIUM_SITE;

    return fetch(baseApi + "/load/channels.php", { headers: _HEADERS })
        .then(function(res) {
            if (res && res.status === 200) {
                _resolvedT24Api = baseApi;
                _resolvedT24Site = baseSite;
                _resolvedT24Time = now;
                return { api: _resolvedT24Api, site: _resolvedT24Site };
            }
            throw new Error("T24 API not 200");
        })
        .catch(function() {
            var num = TARAFTARIUM_BASE_NUM;
            var cands = [num, num + 1, num - 1, num + 2, num + 3, num + 4];
            var i = 0;

            function tryNext() {
                if (i >= cands.length) {
                    _resolvedT24Api = baseApi;
                    _resolvedT24Site = baseSite;
                    _resolvedT24Time = now;
                    return Promise.resolve({ api: _resolvedT24Api, site: _resolvedT24Site });
                }
                var curN = cands[i++];
                var candUrl = "https://taraftarium24-" + curN + ".top/";
                return fetch(candUrl, { headers: _HEADERS })
                    .then(function(r) { return r.text(); })
                    .then(function(html) {
                        if (!html) return tryNext();
                        var apiM = html.match(/https:\/\/teletv\d+\.top/i) || html.match(/fetch\(['"](https:\/\/[^'"]*teletv[^'"]*top)/i);
                        var foundApi = apiM ? (apiM[1] || apiM[0]) : baseApi;
                        _resolvedT24Api = foundApi.replace(/\/+$/, '');
                        _resolvedT24Site = candUrl;
                        _resolvedT24Time = now;
                        return { api: _resolvedT24Api, site: _resolvedT24Site };
                    })
                    .catch(function() { return tryNext(); });
            }
            return tryNext();
        });
}

function fetchTaraftariumStream(channelId) {
    if (!channelId) return Promise.resolve(null);
    return resolveTaraftariumBase().then(function(base) {
        var apiUrl = base.api + "/load/yayinlink.php?id=" + encodeURIComponent(channelId);
        return fetch(apiUrl, { headers: _HEADERS })
            .then(function(res) { return res.json(); })
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
            .catch(function() { return null; });
    });
}

// ── 2. ArdaSports (SelcukSports) Çözücü ──────────────────────────────
function fetchArdaSportsStream(channelId) {
    if (!channelId) return Promise.resolve(null);
    var watchUrl = ARDA_SITE + "/channel/watch/" + encodeURIComponent(channelId);
    var refHeader = ARDA_SITE + "/canli-izle/" + encodeURIComponent(channelId);

    return fetch(watchUrl, {
        headers: {
            'User-Agent': _HEADERS['User-Agent'],
            'Referer': refHeader
        }
    })
    .then(function(res) { return res.text(); })
    .then(function(html) {
        var lsMatch = html.match(/src="(\/loadstream\.php\?[^"]+)"/);
        if (!lsMatch) return null;
        var loadUrl = ARDA_SITE + lsMatch[1];
        return fetch(loadUrl, {
            headers: {
                'User-Agent': _HEADERS['User-Agent'],
                'Referer': watchUrl
            }
        });
    })
    .then(function(res) { return res ? res.text() : null; })
    .then(function(lsHtml) {
        if (!lsHtml) return null;
        var b64Match = lsHtml.match(/['"]([A-Za-z0-9+/=]{40,})\|atob/i) || lsHtml.match(/atob\(['"]([A-Za-z0-9+/=]+)['"]\)/);
        if (!b64Match) return null;
        var decoded = safeAtob(b64Match[1]);
        if (!decoded) return null;
        var streamM = decoded.match(/https?:\/\/[^"'\s\\]+\.m3u8/);
        if (streamM) {
            return {
                url: streamM[0],
                headers: {
                    'User-Agent': _HEADERS['User-Agent'],
                    'Referer': ARDA_SITE,
                    'Origin': ARDA_SITE
                }
            };
        }
        return null;
    })
    .catch(function() { return null; });
}

// ── 3. AlemdarSport Çözücü ──────────────────────────────────────────
var _cachedAlemdarCdn = null;
var _cachedAlemdarTime = 0;

function fetchAlemdarStream(channelId) {
    if (!channelId) return Promise.resolve(null);
    var now = Date.now();

    if (_cachedAlemdarCdn && (now - _cachedAlemdarTime < RESOLVER_TTL)) {
        var directUrl = _cachedAlemdarCdn.replace('${cid}', channelId);
        return Promise.resolve({
            url: directUrl,
            headers: {
                'User-Agent': _HEADERS['User-Agent'],
                'Referer': ALEMDAR_SITE,
                'Origin': ALEMDAR_SITE
            }
        });
    }

    var channelUrl = ALEMDAR_SITE + "/channel.php?id=" + encodeURIComponent(channelId);
    return fetch(channelUrl, { headers: _HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var flotfMatch = html.match(/flotfUrl\s*=\s*[`'"](https:\/\/[^`'"]+index\.m3u8)/);
            if (flotfMatch) {
                var template = flotfMatch[1];
                _cachedAlemdarCdn = template;
                _cachedAlemdarTime = now;
                return {
                    url: template.replace('${cid}', channelId),
                    headers: {
                        'User-Agent': _HEADERS['User-Agent'],
                        'Referer': ALEMDAR_SITE,
                        'Origin': ALEMDAR_SITE
                    }
                };
            }
            return null;
        })
        .catch(function() { return null; });
}

// ── 4. MahsunSports Çözücü ──────────────────────────────────────────
var _cachedMahsunBase = null;
var _cachedMahsunTime = 0;

function resolveMahsunBaseUrl() {
    var now = Date.now();
    if (_cachedMahsunBase && (now - _cachedMahsunTime < RESOLVER_TTL)) {
        return Promise.resolve(_cachedMahsunBase);
    }

    var probeUrl = MAHSUN_SITE + "/event.html?id=androstreamlivebs1";
    return fetch(probeUrl, { headers: _HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var baseMatch = html.match(/["'](https:\/\/andro\.[^"']+\/checklist\/)["']/);
            if (baseMatch) {
                _cachedMahsunBase = baseMatch[1];
                _cachedMahsunTime = now;
                return _cachedMahsunBase;
            }
            throw new Error("No mahsun base");
        })
        .catch(function() {
            var fallback = "https://andro.evrenesoglu149.click/checklist/";
            _cachedMahsunBase = fallback;
            _cachedMahsunTime = now;
            return fallback;
        });
}

function fetchMahsunStream(channelId) {
    if (!channelId) return Promise.resolve(null);
    return resolveMahsunBaseUrl().then(function(base) {
        var streamUrl = base + channelId + ".m3u8";
        return {
            url: streamUrl,
            headers: {
                'User-Agent': _HEADERS['User-Agent']
            }
        };
    }).catch(function() { return null; });
}

// ── 5. PapazSports Çözücü ───────────────────────────────────────────
function fetchPapazStream(channelId) {
    if (!channelId) return Promise.resolve(null);

    if (channelId.indexOf('http') === 0) {
        return Promise.resolve({
            url: channelId,
            headers: _HEADERS
        });
    }

    var authUrl = PAPAZ_SITE + "/auth.php";
    return fetch(authUrl, {
        method: 'POST',
        headers: {
            'User-Agent': _HEADERS['User-Agent'],
            'Referer': PAPAZ_SITE + '/',
            'Origin': PAPAZ_SITE,
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: 'channel=' + encodeURIComponent(channelId)
    })
    .then(function(res) { return res.json(); })
    .then(function(json) {
        if (json && json.URL && json.TOKEN) {
            return {
                url: json.URL,
                headers: {
                    'User-Agent': _HEADERS['User-Agent'],
                    'Referer': PAPAZ_SITE + '/',
                    'Origin': PAPAZ_SITE,
                    'usertoken': json.TOKEN,
                    'pl': 'PapazSports'
                }
            };
        }
        return null;
    })
    .catch(function() { return null; });
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

/**
 * 5 Büyük Platform Eşzamanlı Çözümleyici
 */
async function resolveMultiSportStreams(channelIdOrName, fallbackTitle) {
    await initSportConfig();
    var map = findSportChannelMapping(channelIdOrName);
    var chTitle = fallbackTitle || (map && map.name) || String(channelIdOrName).toUpperCase();

    var pTimeout = 4500;
    var tPromise = (map && map.taraftarium) ? withTimeout(fetchTaraftariumStream(map.taraftarium), pTimeout) : Promise.resolve(null);
    var aPromise = (map && map.ardasports) ? withTimeout(fetchArdaSportsStream(map.ardasports), pTimeout) : Promise.resolve(null);
    var alPromise = (map && map.alemdarsport) ? withTimeout(fetchAlemdarStream(map.alemdarsport), pTimeout) : Promise.resolve(null);
    var mPromise = (map && map.mahsunsports) ? withTimeout(fetchMahsunStream(map.mahsunsports), pTimeout) : Promise.resolve(null);
    var pPromise = (map && map.papazsports) ? withTimeout(fetchPapazStream(map.papazsports), pTimeout) : Promise.resolve(null);

    var results = await Promise.all([tPromise, aPromise, alPromise, mPromise, pPromise]);
    var tStream = results[0];
    var aStream = results[1];
    var alStream = results[2];
    var mStream = results[3];
    var pStream = results[4];

    var streams = [];

    // 1. Taraftarium24
    if (tStream && tStream.url) {
        streams.push(makeStream('⌜ Taraftarium24 ⌟', chTitle + ' [1080p FHD]', tStream.url, tStream.headers));
    }

    // 2. ArdaSports (SelcukSports)
    if (aStream && aStream.url) {
        streams.push(makeStream('⌜ ArdaSports ⌟', chTitle + ' [1080p FHD]', aStream.url, aStream.headers));
    }

    // 3. AlemdarSport
    if (alStream && alStream.url) {
        streams.push(makeStream('⌜ AlemdarSport ⌟', chTitle + ' [1080p FHD]', alStream.url, alStream.headers));
    }

    // 4. MahsunSports
    if (mStream && mStream.url) {
        streams.push(makeStream('⌜ MahsunSports ⌟', chTitle + ' [1080p HD]', mStream.url, mStream.headers));
    }

    // 5. PapazSports
    if (pStream && pStream.url) {
        streams.push(makeStream('⌜ PapazSports ⌟', chTitle + ' [1080p HD]', pStream.url, pStream.headers));
    }

    return streams;
}

module.exports = {
    initSportConfig: initSportConfig,
    findSportChannelMapping: findSportChannelMapping,
    fetchTaraftariumStream: fetchTaraftariumStream,
    fetchArdaSportsStream: fetchArdaSportsStream,
    fetchAlemdarStream: fetchAlemdarStream,
    fetchMahsunStream: fetchMahsunStream,
    fetchPapazStream: fetchPapazStream,
    resolveMultiSportStreams: resolveMultiSportStreams,
    makeStream: makeStream
};
