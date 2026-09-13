/**
 * Anthology Canlı Spor Paketi
 * BeIN Sports 1-5, S Sport 1-2, Tivibu Spor, Exxen Spor, TRT Spor vb.
 */

var path = typeof require !== 'undefined' ? require('path') : null;
var fs = typeof require !== 'undefined' ? require('fs') : null;

var M3U_REMOTE = "https://raw.githubusercontent.com/falsisdev/anthology/main/providers/M3U/Liste/canli.m3u";
var NETVGOLD_REMOTE = "https://raw.githubusercontent.com/Wiojelt/TurkSpor/main/catalogs/netvgold.json";
var _HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*'
};

/* NetVGold gömülü yedeği (TurkSpor catalogs/netvgold.json, 2026-09-13 çekimi).
   Remote fetch başarısız olursa kullanılır; katalog değişmez, sadece alternatif stream sağlar. */
var NETVGOLD_FALLBACK = [
  {"id":"bein1e","title":"beIN Sports 1","url":"https://raw.githubusercontent.com/icebu12/turbo-guacamole/refs/heads/main/streams3/bein-sports-1.m3u8","referer":"https://www.atomsportv514.top/"},
  {"id":"bein2c","title":"beIN Sports 2","url":"https://raw.githubusercontent.com/icebu12/turbo-guacamole/refs/heads/main/streams3/bein-sports-2.m3u8","referer":"https://www.atomsportv513.top/"},
  {"id":"bein2hd","title":"beIN Sports 2 \u00b7 Yedek","url":"https://raw.githubusercontent.com/icebu12/turbo-guacamole/refs/heads/main/streams2/stream_androstreamlivebs2.m3u8","referer":"https://betist146tv.live/"},
  {"id":"bein3","title":"beIN Sports 3","url":"https://raw.githubusercontent.com/icebu12/turbo-guacamole/refs/heads/main/streams/stream_b3.m3u8","referer":"https://taraftarium1046.xyz/"},
  {"id":"bein3s","title":"beIN Sports 3 \u00b7 Yedek","url":"https://raw.githubusercontent.com/icebu12/turbo-guacamole/refs/heads/main/streams2/stream_androstreamlivebs3.m3u8","referer":"https://atomsportv501.top/"},
  {"id":"bein4s","title":"beIN Sports 4","url":"https://raw.githubusercontent.com/icebu12/turbo-guacamole/refs/heads/main/streams/stream_b4.m3u8","referer":"https://taraftarium1081.xyz/"},
  {"id":"bein5","title":"beIN Sports 5","url":"https://raw.githubusercontent.com/icebu12/turbo-guacamole/refs/heads/main/streams/stream_b5.m3u8","referer":"https://fairtv18.com/"},
  {"id":"beinmax1","title":"beIN Sports Max 1","url":"https://raw.githubusercontent.com/icebu12/turbo-guacamole/refs/heads/main/streams/stream_bm1.m3u8","referer":"https://fairtv16.com/"},
  {"id":"beinmax2","title":"beIN Sports Max 2","url":"https://raw.githubusercontent.com/icebu12/turbo-guacamole/refs/heads/main/streams/stream_bm2.m3u8","referer":"https://fairtv16.com/"},
  {"id":"ssporred1","title":"S Sport 1","url":"https://raw.githubusercontent.com/icebu12/turbo-guacamole/refs/heads/main/streams/stream_ss.m3u8","referer":"https://taraftarium1081.xyz/"},
  {"id":"ssporred2","title":"S Sport 2","url":"https://raw.githubusercontent.com/icebu12/turbo-guacamole/refs/heads/main/streams/stream_ss2.m3u8","referer":"https://fairtv20.com/"},
  {"id":"ssportb","title":"S Sport Plus","url":"https://andro.evrenesoglu57.click/checklist/batutest.m3u8","referer":"https://mahsunsports80.xyz/"},
  {"id":"ssport2b","title":"S Sport 2 \u00b7 Yedek","url":"https://andro.evrenesoglu57.click/checklist/androstreamlivess2.m3u8","referer":"https://mahsunsports37.xyz/"},
  {"id":"smarts","title":"Smart Spor 1","url":"https://raw.githubusercontent.com/icebu12/turbo-guacamole/refs/heads/main/streams/stream_smarts.m3u8","referer":"https://taraftarium1081.xyz/"},
  {"id":"smartweb2","title":"Smart Spor 2","url":"https://raw.githubusercontent.com/icebu12/turbo-guacamole/refs/heads/main/streams/stream_sms2.m3u8","referer":"https://taraftarium1081.xyz/"},
  {"id":"tivibu1","title":"Tivibu Spor 1","url":"https://raw.githubusercontent.com/icebu12/turbo-guacamole/refs/heads/main/streams/stream_t1.m3u8","referer":"https://taraftarium1081.xyz/"},
  {"id":"tivibu2","title":"Tivibu Spor 2","url":"https://raw.githubusercontent.com/icebu12/turbo-guacamole/refs/heads/main/streams/stream_t2.m3u8","referer":"https://taraftarium1081.xyz/"},
  {"id":"tivibu3","title":"Tivibu Spor 3","url":"https://raw.githubusercontent.com/icebu12/turbo-guacamole/refs/heads/main/streams/stream_t3.m3u8","referer":"https://taraftarium1081.xyz/"},
  {"id":"trtspor","title":"TRT Spor","url":"https://tv-trtspor1.medya.trt.com.tr/master.m3u8","referer":"https://www.trtspor.com.tr/"}
];

var cachedText = null;
var cacheTime = 0;
var cachedNetv = null;
var cacheNetvTime = 0;

function fetchWithTimeout(url, options, ms) {
    var opts = options || {};
    try {
        if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
            opts.signal = AbortSignal.timeout(ms || 8000);
        }
    } catch (e) {}
    return fetch(url, opts);
}

function fetchNetVGold() {
    var now = Date.now();
    if (cachedNetv && (now - cacheNetvTime < 300000)) {
        return Promise.resolve(cachedNetv);
    }
    return fetchWithTimeout(NETVGOLD_REMOTE, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 8000)
        .then(function(res) {
            if (!res.ok) throw new Error('netv http ' + res.status);
            return res.json();
        })
        .then(function(arr) {
            if (!Array.isArray(arr) || arr.length === 0) throw new Error('netv empty');
            cachedNetv = arr;
            cacheNetvTime = now;
            return arr;
        })
        .catch(function() {
            cachedNetv = NETVGOLD_FALLBACK;
            cacheNetvTime = now;
            return cachedNetv;
        });
}

function normTitle(s) {
    return (s || '').toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function stripStreamWords(s) {
    return (s || '').replace(/\byedek\b/g, '').replace(/\bhd\b/g, '').replace(/\s+/g, ' ').trim();
}

function trailNum(s) {
    var m = (s || '').match(/(\d+)\s*$/);
    return m ? m[1] : null;
}

function netvMatchesChannel(netvTitle, ch) {
    var nt = stripStreamWords(normTitle(netvTitle));
    var names = [ch.name, (ch.id || '').replace(/^tv:/, '')];
    for (var i = 0; i < names.length; i++) {
        var ct = stripStreamWords(normTitle(names[i]));
        if (!nt || !ct) continue;
        if (nt === ct) return true;
        if (nt.length < 4 || ct.length < 4) continue;
        // Sayı koruması: ikisi de farklı numarayla bitiyorsa eşleşme yok (S Sport 1 vs S Sport 2)
        var nNum = trailNum(nt);
        var cNum = trailNum(ct);
        if (nNum && cNum && nNum !== cNum) continue;
        // plus/max/haber gibi ayırt edici kelime tek tarafta varsa bu adayı atla
        var markers = ['plus', 'max', 'haber', 'yildiz'];
        var markerMismatch = false;
        for (var k = 0; k < markers.length; k++) {
            var mk = markers[k];
            var inN = nt.split(' ').indexOf(mk) !== -1;
            var inC = ct.split(' ').indexOf(mk) !== -1;
            if (inN !== inC) { markerMismatch = true; break; }
        }
        if (markerMismatch) continue;
        // "s sport" (katalog) <-> "s sport 1" (netv): numarasız ana kanal yalnızca
        // numarasız veya 1 numaralı alternatife eşleşir (S Sport = S Sport 1; S Sport 2 eşleşmez)
        if (nt.indexOf(ct + ' ') === 0) {
            var restN = nt.slice(ct.length).trim();
            if (/^\d+$/.test(restN)) {
                if (!cNum && restN === '1') return true;
                if (cNum) return true;
            }
            continue;
        }
        if (ct.indexOf(nt + ' ') === 0) {
            var restC = ct.slice(nt.length).trim();
            if (/^\d+$/.test(restC)) return true;
            continue;
        }
        if (nt.includes(ct) || ct.includes(nt)) return true;
    }
    return false;
}

function originOf(url) {
    try {
        var m = String(url || '').match(/^(https?:\/\/[^/]+)/i);
        return m ? m[1] + '/' : undefined;
    } catch (e) { return undefined; }
}

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
            var channels = parseSportChannels(content);
            var metas = channels.map(function(ch) {
                return {
                    id: ch.id,
                    type: "tv",
                    name: ch.name,
                    poster: ch.logo,
                    background: ch.logo,
                    genres: ["Spor"],
                    description: ch.name + " Canlı Spor Yayını"
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

    return Promise.all([
        fetchChannels(),
        fetchNetVGold()
    ])
        .then(function(all) {
            var content = all[0];
            var netv = all[1] || [];
            var channels = parseSportChannels(content);
            if (!targetId && channels.length > 0) {
                // Return top sport channels
                return channels.slice(0, 5).map(function(ch) {
                    return {
                        name: '⌜ Anthology Spor ⌟',
                        title: ch.name + ' [Canlı]',
                        url: ch.url,
                        headers: _HEADERS,
                        behaviorHints: { isLive: true }
                    };
                });
            }

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

            if (!matched && channels.length > 0) {
                // Fallback to top sport channel (e.g. BeIN 1 / S Sport)
                matched = channels[0];
            }
            if (!matched) {
                var empty = [];
                empty.streams = [];
                return empty;
            }

            var streams = [{
                name: '⌜ Anthology Spor ⌟',
                title: matched.name + ' [Canlı HD]',
                url: matched.url,
                headers: _HEADERS,
                behaviorHints: { isLive: true }
            }];

            // Alternatif kaynaklar (TurkSpor NetVGold): katalog sabit kalır,
            // aynı kanal için farklı sitelerden ek stream döner.
            var seenUrls = {};
            seenUrls[matched.url] = true;
            for (var k = 0; k < netv.length; k++) {
                var entry = netv[k] || {};
                if (!entry.url || seenUrls[entry.url]) continue;
                if (!netvMatchesChannel(entry.title, matched)) continue;
                seenUrls[entry.url] = true;
                var ref = entry.referer || matched.url;
                var headers = {
                    'User-Agent': _HEADERS['User-Agent'],
                    'Referer': ref
                };
                var origin = originOf(ref);
                if (origin) headers['Origin'] = origin.replace(/\/$/, '');
                streams.push({
                    name: '⌜ NetVGold ⌟',
                    title: matched.name + ' [NetVGold HD]',
                    url: entry.url,
                    headers: headers,
                    behaviorHints: { isLive: true }
                });
                if (streams.length >= 6) break;
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams, getCatalog: getCatalog };
} else {
    var g = (typeof globalThis !== 'undefined') ? globalThis : (typeof global !== 'undefined') ? global : window;
    g.getStreams = getStreams; g.getCatalog = getCatalog;
}

function getMeta(args) {
    var targetId = (typeof args === 'string') ? args : (args && args.id ? args.id : null);
    if (!targetId) return Promise.resolve({ meta: null });
    return fetchChannels()
        .then(function(content) {
            var channels = parseSportChannels(content);
            var cleanTarget = cleanKey(targetId.replace(/^tv:/, ''));
            var ch = channels.find(function(c) { return c.id === targetId || cleanKey(c.id.replace(/^tv:/, '')) === cleanTarget || cleanKey(c.name) === cleanTarget; }) || channels[0];
            return {
                meta: {
                    id: targetId,
                    type: "tv",
                    name: ch.name,
                    poster: ch.logo,
                    background: ch.logo,
                    description: ch.name + " Canlı Yayın",
                    genres: ["Spor"],
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
