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

var ANTHOLOGY_LIVE_BASE = "https://anthology-live.duckdns.org";
var ANTHOLOGY_LIVE_USER = "anthology";
var ANTHOLOGY_LIVE_PASS = "falsisdevwashere";

var TARAFTARIUM_SITE = "https://taraftarium24-246.top/";
var TARAFTARIUM_API = "https://teletv15.top";
var TARAFTARIUM_BASE_NUM = 246;

var ARDA_SITE = "https://selcuksporkral1.cc";
var ALEMDAR_SITE = "https://alemdarsport.cfd";
var MAHSUN_SITE = "https://mahsunsports58.xyz";
var PAPAZ_SITE = "https://www.papazsports1033.pro";

var _HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*'
};

var _cfgReady = null;
function initSportConfig() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v;
            v = val('urls.live.anthology_live.base'); if (v) ANTHOLOGY_LIVE_BASE = String(v).replace(/\/+$/, '');
            v = val('urls.live.anthology_live.username'); if (v) ANTHOLOGY_LIVE_USER = String(v);
            v = val('urls.live.anthology_live.password'); if (v) ANTHOLOGY_LIVE_PASS = String(v);
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
        if (mk.length >= 4 && k.indexOf(mk) === 0 && (k === mk || !/^\d/.test(k.slice(mk.length)))) {
            return SPORT_MAP[mk];
        }
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
            var fallback = "https://andro.evrenesoglu235.click/checklist/";
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

function extractCanonicalKey(s) {
    var raw = (s || '').toString().toLowerCase();
    raw = raw.replace(/^tv[:_]/, '').replace(/\.tr$/, '');
    var cleaned = raw.replace(/[^a-z0-9]/g, '');
    if (cleaned.startsWith('tv') && cleaned.length > 3) cleaned = cleaned.substring(2);
    if (cleaned.endsWith('tr') && cleaned.length > 5) cleaned = cleaned.substring(0, cleaned.length - 2);

    // Known alias normalizations to match anthology-live keys
    if (/^beinsport?1/i.test(cleaned)) return "beinsports1";
    if (/^beinsport?2/i.test(cleaned)) return "beinsports2";
    if (/^beinsport?3/i.test(cleaned)) return "beinsports3";
    if (/^beinsport?4/i.test(cleaned)) return "beinsports4";
    if (/^beinsport?5/i.test(cleaned)) return "beinsports5";
    if (/^beinsport?max1/i.test(cleaned)) return "beinsportsmax1";
    if (/^beinsport?max2/i.test(cleaned)) return "beinsportsmax2";
    if (/^ssport1?$/i.test(cleaned)) return "ssport";
    if (/^ssport2$/i.test(cleaned)) return "ssport2";
    if (/^ssportplus$/i.test(cleaned)) return "ssportplus";
    if (/^(?:24|24tv|kanal24)$/i.test(cleaned)) return "kanal24";
    if (/^tivibu(spor)?1?$/i.test(cleaned)) return "tivibuspor1";
    if (/^tivibu(spor)?2/i.test(cleaned)) return "tivibuspor2";
    if (/^tivibu(spor)?3/i.test(cleaned)) return "tivibuspor3";
    if (/^tivibu(spor)?4/i.test(cleaned)) return "tivibuspor4";
    if (/^smartspor1|^sporsmart1?$/i.test(cleaned)) return "smartspor1";
    if (/^smartspor2|^sporsmart2/i.test(cleaned)) return "smartspor2";
    if (/^trtspor$/i.test(cleaned)) return "trtspor";
    if (/^trtsporyildiz/i.test(cleaned)) return "trtsporyildiz";
    if (/^aspor/i.test(cleaned)) return "aspor";
    if (/^tv85|tv8bucuk/i.test(cleaned)) return "tv85";
    if (/^exxen(sports?)?1$/i.test(cleaned)) return "exxensports1";
    if (/^exxen(sports?)?2$/i.test(cleaned)) return "exxensports2";
    if (/^exxen(sports?)?3$/i.test(cleaned)) return "exxensports3";
    if (/^exxen(sports?)?4$/i.test(cleaned)) return "exxensports4";
    if (/^exxen(sports?)?5$/i.test(cleaned)) return "exxensports5";
    if (/^exxen(sports?)?6$/i.test(cleaned)) return "exxensports6";
    if (/^exxen(sports?)?7$/i.test(cleaned)) return "exxensports7";
    if (/^exxen(sports?)?8$/i.test(cleaned)) return "exxensports8";
    if (/^tabii(spor)?1$/i.test(cleaned)) return "tabiispor1";
    if (/^tabii(spor)?2$/i.test(cleaned)) return "tabiispor2";
    if (/^tabii(spor)?3$/i.test(cleaned)) return "tabiispor3";
    if (/^tabii(spor)?4$/i.test(cleaned)) return "tabiispor4";
    if (/^tabii(spor)?5$/i.test(cleaned)) return "tabiispor5";
    if (/^tabii(spor)?6$/i.test(cleaned)) return "tabiispor6";
    if (/^tabii(spor)?7$/i.test(cleaned)) return "tabiispor7";
    if (/^tabii(spor)?8$/i.test(cleaned)) return "tabiispor8";

    return cleaned;
}

var _sourcesCache = {};
var _SOURCES_TTL = 300000;

async function fetchAnthologyLiveSources(canonicalKey) {
    if (!canonicalKey) return null;
    var now = Date.now();
    var cached = _sourcesCache[canonicalKey];
    if (cached && (now - cached.at < _SOURCES_TTL)) {
        return cached.data;
    }
    var sourcesUrl = ANTHOLOGY_LIVE_BASE + "/api/sources?channel=" + encodeURIComponent(canonicalKey);
    try {
        var fetchPromise = fetch(sourcesUrl, { headers: _HEADERS })
            .then(function(res) {
                if (res && res.status === 200) return res.json();
                return null;
            });
        var sources = await withTimeout(fetchPromise, 2500);
        if (Array.isArray(sources)) {
            _sourcesCache[canonicalKey] = { at: now, data: sources };
            return sources;
        }
    } catch (e) {}
    return null;
}

function buildAnthologyLiveStreamEntry(src, canonicalKey, chTitle, authQuery) {
    var streamUrl = ANTHOLOGY_LIVE_BASE + "/live/" + canonicalKey + ".m3u8?" + authQuery;
    if (src.id !== "auto") {
        streamUrl += "&source=" + encodeURIComponent(src.id);
    }

    var cleanName = (src.name || src.id)
        .replace(/[⚡️📡🛡🌐]/g, '')
        .trim();

    var displayProvider = '⌜ Anthology Live · ' + cleanName + ' ⌟';
    var displayTitle = chTitle + ' [1080p FHD]';

    if (src.id === 'auto') {
        displayProvider = '⌜ Anthology Live · Otomatik ⌟';
        displayTitle = chTitle + ' [1080p FHD · Ultra Hızlı]';
    } else if (src.id === 'kool1') {
        displayProvider = '⌜ Anthology Live · Kool S1 ⌟';
        displayTitle = chTitle + ' [Kool.ws · Sunucu 1]';
    } else if (src.id === 'kool6') {
        displayProvider = '⌜ Anthology Live · Kool S6 ⌟';
        displayTitle = chTitle + ' [Kool.ws · Sunucu 6]';
    } else if (src.id === 'kool7') {
        displayProvider = '⌜ Anthology Live · Kool S7 ⌟';
        displayTitle = chTitle + ' [Kool.ws · Sunucu 7]';
    } else if (src.id === 'mahsunsports' || src.id === 'papazsports') {
        displayTitle = chTitle + ' [1080p HD]';
    }

    return makeStream(
        displayProvider,
        displayTitle,
        streamUrl,
        {
            'User-Agent': _HEADERS['User-Agent'],
            'Accept': '*/*'
        }
    );
}

/**
 * Genel Anthology Live Kaynak Çözümleyici (Spor + Ulusal + Haber + Sinema + Belgesel + Müzik + Yerel)
 */
async function resolveAnthologyLiveStreams(channelIdOrName, fallbackTitle, opts) {
    await initSportConfig();
    opts = opts || {};
    if (opts.isSport) {
        return resolveMultiSportStreams(channelIdOrName, fallbackTitle);
    }

    var canonicalKey = extractCanonicalKey(channelIdOrName);
    var chTitle = fallbackTitle || String(channelIdOrName).toUpperCase();
    var authQuery = "username=" + encodeURIComponent(ANTHOLOGY_LIVE_USER) + "&password=" + encodeURIComponent(ANTHOLOGY_LIVE_PASS);

    var liveSources = await fetchAnthologyLiveSources(canonicalKey);
    if (!Array.isArray(liveSources) || liveSources.length === 0) {
        return [];
    }

    var streams = [];
    for (var i = 0; i < liveSources.length; i++) {
        var src = liveSources[i];
        if (!src || !src.id || src.available === false) continue;
        // Official direct/backup URLs are already included directly from canli.m3u
        if (src.id === 'direct' || src.id === 'backup') continue;
        streams.push(buildAnthologyLiveStreamEntry(src, canonicalKey, chTitle, authQuery));
    }
    return streams;
}

/**
 * Anthology Live Çoklu Kaynak (Multi-Source) Çözümleyici
 * 
 * Tüm canlı spor ve TV yayınlarını Anthology Live Go Restreamer tünelinden geçirir;
 * TS segmentlerini 'video/mp2t' ve temiz CORS ile Nuvio ExoPlayer'a sunar.
 */
async function resolveMultiSportStreams(channelIdOrName, fallbackTitle) {
    await initSportConfig();
    var map = findSportChannelMapping(channelIdOrName);
    var chTitle = fallbackTitle || (map && map.name) || String(channelIdOrName).toUpperCase();
    var canonicalKey = extractCanonicalKey(channelIdOrName);
    if (!canonicalKey && map && map.key) canonicalKey = map.key;

    var streams = [];
    var authQuery = "username=" + encodeURIComponent(ANTHOLOGY_LIVE_USER) + "&password=" + encodeURIComponent(ANTHOLOGY_LIVE_PASS);

    // 1. Canlı Kaynakları Anthology Live API'sinden çek
    var liveSources = await fetchAnthologyLiveSources(canonicalKey);

    // Canlı API zaman aşımına uğrarsa veya kanal haritada varsa statik yedek kaynaklar oluştur
    if (!liveSources || liveSources.length === 0) {
        if (map || canonicalKey) {
            liveSources = [
                { id: "auto", name: "⚡️ Otomatik (En Hızlı)", available: true },
                { id: "mahsunsports", name: "Mahsun Sports", available: true },
                { id: "alemdarsport", name: "Alemdar Sport", available: true },
                { id: "taraftarium", name: "Taraftarium24", available: true },
                { id: "ardasports", name: "Selçuk / Arda", available: true },
                { id: "papazsports", name: "Papaz Sports", available: true }
            ];
        }
    }

    if (Array.isArray(liveSources)) {
        for (var i = 0; i < liveSources.length; i++) {
            var src = liveSources[i];
            if (!src || !src.id || src.available === false) continue;
            streams.push(buildAnthologyLiveStreamEntry(src, canonicalKey, chTitle, authQuery));
        }
    }

    // 2. Eğer Anthology Live'dan hiçbir akış üretilemediyse doğrudan platform fallback'i çalıştır
    if (streams.length === 0 && map) {
        var pTimeout = 3500;
        var tPromise = map.taraftarium ? withTimeout(fetchTaraftariumStream(map.taraftarium), pTimeout) : Promise.resolve(null);
        var aPromise = map.ardasports ? withTimeout(fetchArdaSportsStream(map.ardasports), pTimeout) : Promise.resolve(null);
        var alPromise = map.alemdarsport ? withTimeout(fetchAlemdarStream(map.alemdarsport), pTimeout) : Promise.resolve(null);
        var mPromise = map.mahsunsports ? withTimeout(fetchMahsunStream(map.mahsunsports), pTimeout) : Promise.resolve(null);
        var pPromise = map.papazsports ? withTimeout(fetchPapazStream(map.papazsports), pTimeout) : Promise.resolve(null);

        var results = await Promise.all([tPromise, aPromise, alPromise, mPromise, pPromise]);
        if (results[0] && results[0].url) streams.push(makeStream('⌜ Taraftarium24 ⌟', chTitle + ' [1080p FHD]', results[0].url, results[0].headers));
        if (results[1] && results[1].url) streams.push(makeStream('⌜ ArdaSports ⌟', chTitle + ' [1080p FHD]', results[1].url, results[1].headers));
        if (results[2] && results[2].url) streams.push(makeStream('⌜ AlemdarSport ⌟', chTitle + ' [1080p FHD]', results[2].url, results[2].headers));
        if (results[3] && results[3].url) streams.push(makeStream('⌜ MahsunSports ⌟', chTitle + ' [1080p HD]', results[3].url, results[3].headers));
        if (results[4] && results[4].url) streams.push(makeStream('⌜ PapazSports ⌟', chTitle + ' [1080p HD]', results[4].url, results[4].headers));
    }

    return streams;
}

module.exports = {
    initSportConfig: initSportConfig,
    findSportChannelMapping: findSportChannelMapping,
    extractCanonicalKey: extractCanonicalKey,
    fetchAnthologyLiveSources: fetchAnthologyLiveSources,
    fetchTaraftariumStream: fetchTaraftariumStream,
    fetchArdaSportsStream: fetchArdaSportsStream,
    fetchAlemdarStream: fetchAlemdarStream,
    fetchMahsunStream: fetchMahsunStream,
    fetchPapazStream: fetchPapazStream,
    resolveMultiSportStreams: resolveMultiSportStreams,
    resolveAnthologyLiveStreams: resolveAnthologyLiveStreams,
    makeStream: makeStream
};
