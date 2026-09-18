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

// ── Mahsunsports SANAL KANALI ─────────────────────────────────────────
// canli.m3u içindeki "Mahsunsports" kanalı tek akış yerine canlı maç
// listesini çözümler: futbol, basketbol, voleybol ve tenis maçlarının
// aktif yayınlarını ayrı ayrı stream olarak döner (spor eklentisiyle aynı motor).
var MAHSUN_DATA_TTL = 15 * 60 * 1000;
var mahsunCache = null;   // { time, bases: [], idMap: {}, groups: [] }

function mahsunFetchText(url) {
    return fetch(url, { headers: _MAHSUN_HEADERS })
        .then(function(res) { return res.text(); })
        .catch(function() { return ''; });
}

// Script4 içindeki "const NAME = [ ... ]" bloğunu string-farkındalıklı döner.
function extractNamedArray(script, name) {
    var re = new RegExp('(?:const|var|let)\\s+' + name + '\\s*=\\s*\\[');
    var m = script.match(re);
    if (!m) return '';
    var start = m.index + m[0].length - 1;
    var depth = 0, inStr = false, quote = '';
    for (var i = start; i < script.length; i++) {
        var c = script[i];
        if (inStr) {
            if (c === '\\') { i++; continue; }
            if (c === quote) inStr = false;
            continue;
        }
        if (c === '"' || c === "'") { inStr = true; quote = c; continue; }
        if (c === '[') depth++;
        else if (c === ']') { depth--; if (depth === 0) return script.slice(start, i + 1); }
    }
    return '';
}

// Kanal ID haritası (name -> andro id) ve aktif canlı maç grupları çıkarır.
function parseScript4(script) {
    var idMap = {};
    var pairsRe = /\{\s*title:\s*"([^"]+)",\s*url:\s*"\/event\.html\?id=([^"]+)"\s*\}/g;
    var p;
    while ((p = pairsRe.exec(script)) !== null) {
        var nk = cleanKey(p[1]);
        if (nk && !idMap[nk]) idMap[nk] = p[2];
    }

    var CATS = [
        { label: 'Futbol',     array: 'futbolMatches' },
        { label: 'Basketbol',  array: 'basketbolMatches' },
        { label: 'Voleybol',   array: 'voleybolMatches' },
        { label: 'Tenis',      array: 'tenisMatches' },
        { label: 'Öne Çıkan',  array: 'karsilasmalar' }
    ];

    var matchList = [];
    var seenIds = {};
    for (var ci = 0; ci < CATS.length; ci++) {
        var cat = CATS[ci];
        var body = extractNamedArray(script, cat.array);
        if (!body) continue;
        var objs = body.match(/\{[^{}]*\}/g) || [];
        for (var oi = 0; oi < objs.length; oi++) {
            var o = objs[oi];
            var t = o.match(/"title"\s*:\s*"([^"]*)"/);
            var u = o.match(/"url"\s*:\s*"\/?event\.html\?id=([A-Za-z0-9]+)"/);
            var l = o.match(/"league"\s*:\s*"([^"]*)"/);
            var lv = o.match(/"live"\s*:\s*(true|false)/);
            var tm = o.match(/"time"\s*:\s*"([^"]*)"/);
            if (!t || !u) continue;
            var title = t[1].trim();
            var id = u[1];
            if (id === 'None' || id.indexOf('chNone') !== -1) continue;
            var key = id + '|' + title;
            if (seenIds[key]) continue;
            seenIds[key] = true;
            matchList.push({
                title: title,
                id: id,
                league: l ? l[1].trim() : '',
                live: lv ? lv[1] === 'true' : false,
                time: tm ? tm[1].trim() : '',
                cat: cat.label
            });
        }
    }

    // Aynı maç adına sahip kayıtları grup: ana yayın + yedek yayınlar.
    var groups = {};
    for (var mi = 0; mi < matchList.length; mi++) {
        var mm = matchList[mi];
        var gk = cleanKey(mm.title);
        if (!groups[gk]) groups[gk] = { title: mm.title, cat: mm.cat, entries: [] };
        groups[gk].entries.push(mm);
    }

    var groupArr = [];
    for (var gk2 in groups) {
        var g = groups[gk2];
        var ana = null, yedek = [];
        for (var ei = 0; ei < g.entries.length; ei++) {
            var e = g.entries[ei];
            if (!ana && e.league.indexOf('Yedek') === -1) ana = e;
            else if (e.league.indexOf('Yedek') !== -1) yedek.push(e);
            else if (!ana) ana = e;
        }
        if (!ana) ana = g.entries[0];
        for (var yi = 0; yi < g.entries.length; yi++) {
            if (g.entries[yi] === ana) continue;
            if (yedek.indexOf(g.entries[yi]) === -1) yedek.push(g.entries[yi]);
        }
        groupArr.push({
            title: g.title,
            cat: ana ? ana.cat : g.cat,
            live: ana ? ana.live : false,
            time: ana ? ana.time : '',
            ana: ana,
            yedek: yedek.slice(0, 2)
        });
    }

    // Kategori sırası + gerçek besleme önceliği + canlı önceliği + saat.
    // "Öne Çıkan" (karsilasmalar) gerçek kanal id'leriyle (bs1/ss1/cbcs vb.)
    // maç->kanal eşleşmesi içerir; ch# benzeri yer tutucu id'ler öne geçmez.
    function isRealFeedId(id) {
        return /^(androstreamlive)?(bs\d+|s\d+|ss\d+|ssplus\d+|cbcs|sbs|exn\d+|trts\d*|ts\d*|ht|idm|sifir|ttt\d+|sm\d*|bsm\d*)/i.test(String(id || ''));
    }
    var order = { 'Öne Çıkan': 0, 'Futbol': 1, 'Basketbol': 2, 'Voleybol': 3, 'Tenis': 4 };
    groupArr.sort(function(a, b) {
        var ra = isRealFeedId(a.ana && a.ana.id) ? 0 : 1;
        var rb = isRealFeedId(b.ana && b.ana.id) ? 0 : 1;
        if (ra !== rb) return ra - rb;
        var oc = (order[a.cat] !== undefined ? order[a.cat] : 9) - (order[b.cat] !== undefined ? order[b.cat] : 9);
        if (oc !== 0) return oc;
        if (a.live !== b.live) return a.live ? -1 : 1;
        return (a.time < b.time) ? -1 : (a.time > b.time ? 1 : 0);
    });

    return { idMap: idMap, groups: groupArr };
}

function fetchMahsunData() {
    var now = Date.now();
    if (mahsunCache && (now - mahsunCache.time < MAHSUN_DATA_TTL)) {
        return Promise.resolve(mahsunCache);
    }
    // Host listesi event.html'den dinamik çekilir; script4.js ana sayfadan bulunur.
    return fetchMahsunBases().then(function(bases) {
        return mahsunFetchText(MAHSUN_SITE).then(function(pageHtml) {
            var scriptUrl = null;
            var sm = pageHtml.match(/src=["']([^"']*script4\.js[^"']*)["']/i);
            if (sm) {
                scriptUrl = sm[1].indexOf('http') === 0 ? sm[1] : MAHSUN_SITE.replace(/\/+$/, '') + '/' + sm[1].replace(/^\/+/, '');
            }
            if (!scriptUrl) {
                mahsunCache = { time: now, bases: bases, idMap: {}, groups: [] };
                return mahsunCache;
            }
            return mahsunFetchText(scriptUrl).then(function(script) {
                var parsed = parseScript4(script);
                // Kategori başına dengeli kota (her branştan yayın görünsün).
                var perCat = {}, picked = [];
                for (var pi = 0; pi < parsed.groups.length && picked.length < 60; pi++) {
                    var g = parsed.groups[pi];
                    var cnt = perCat[g.cat] || 0;
                    if (cnt >= (g.cat === 'Öne Çıkan' ? 24 : (g.cat === 'Futbol' ? 16 : 8))) continue;
                    perCat[g.cat] = cnt + 1;
                    picked.push(g);
                }
                mahsunCache = { time: now, bases: bases, idMap: parsed.idMap, groups: picked };
                return mahsunCache;
            });
        });
    }).catch(function() {
        mahsunCache = { time: now, bases: [], idMap: {}, groups: [] };
        return mahsunCache;
    });
}

function fetchMahsunMatches() {
    return fetchMahsunData().then(function(data) {
        return data.groups || [];
    });
}

function mahsunMakeStream(name, title, url) {
    return {
        name: name,
        title: title,
        url: url,
        headers: _MAHSUN_HEADERS,
        behaviorHints: { isLive: true }
    };
}

function buildMahsunMatchStreams(groups, onlyIndex) {
    var streams = [];
    var base = '';
    var bases = (mahsunCache && mahsunCache.bases && mahsunCache.bases.length) ? mahsunCache.bases : [];
    if (bases.length) base = bases[0];

    for (var i = 0; i < groups.length; i++) {
        var g = groups[i];
        if (onlyIndex !== null && onlyIndex !== undefined && i !== onlyIndex) continue;
        var liveTag = g.live ? 'Canlı' : (g.time || '');
        var suffix = liveTag ? ' · ' + liveTag : '';
        if (g.ana && g.ana.id && base) {
            streams.push(mahsunMakeStream(
                '⌜ Mahsunsports · ' + g.cat + ' ⌟',
                g.title + ' [Ana Yayın' + suffix + ']',
                base + g.ana.id + '.m3u8'
            ));
        }
        for (var yi = 0; yi < g.yedek.length; yi++) {
            var yd = g.yedek[yi];
            if (!yd.id || !base) continue;
            streams.push(mahsunMakeStream(
                '⌜ Mahsunsports · ' + g.cat + ' · Yedek ⌟',
                g.title + ' [Yedek Akış ' + (yi + 1) + suffix + ']',
                base + yd.id + '.m3u8'
            ));
        }
    }
    return streams;
}

// Ölü maç akışı filtresi: "ch#/None" beslemelerinin çoğu CDN'de yayında
// değildir (404). Oynatıcı çökmesin diye hafif Range isteğiyle doğrular;
// kesin 404/410/400 olanları eler, ağ hatası/zaman aşımında KORUR.
function mahsunCheckUrl(url) {
    var ctrl = null;
    if (typeof AbortController !== 'undefined') ctrl = new AbortController();
    var timer = setTimeout(function() { if (ctrl) ctrl.abort(); }, 5000);
    var opts = {
        method: 'GET',
        headers: {
            'User-Agent': _HEADERS['User-Agent'],
            'Referer': MAHSUN_SITE,
            'Range': 'bytes=0-1024'
        }
    };
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(url, opts).then(function(res) {
        clearTimeout(timer);
        var code = res.status;
        return { url: url, ok: (code === 200 || code === 206) };
    }).catch(function() {
        clearTimeout(timer);
        return { url: url, ok: true };
    });
}

function verifyMahsunStreams(streams) {
    if (!streams || !streams.length) return Promise.resolve(streams);
    var groupsArr = [];
    var seen = {};
    for (var i = 0; i < streams.length; i++) {
        var u = streams[i].url;
        if (!seen[u]) {
            seen[u] = true;
            groupsArr.push({ url: u, idxs: [i] });
        } else {
            groupsArr[groupsArr.length - 1].idxs.push(i);
        }
    }
    var results = {};
    function worker(queue) {
        if (!queue.length) return Promise.resolve();
        var cur = queue.shift();
        return mahsunCheckUrl(cur.url).then(function(r) {
            for (var j = 0; j < cur.idxs.length; j++) results[cur.idxs[j]] = r.ok;
            return worker(queue);
        });
    }
    var pool = Math.min(8, groupsArr.length);
    var jobs = [];
    var q = groupsArr.slice();
    for (var p = 0; p < pool; p++) jobs.push(worker(q));
    return Promise.all(jobs).then(function() {
        var kept = [];
        for (var k = 0; k < streams.length; k++) {
            if (results[k] !== false) kept.push(streams[k]);
        }
        return kept;
    });
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
    // ── Mahsunsports SANAL KANALI ──
    // canli.m3u'daki Mahsunsports satırı tek akış yerine canlı maç listesini
    // çözümler (futbol/basketbol/voleybol/tenis). Alt indeks: tv:mahsunsports:N
    if (searchKey === 'mahsunsports') {
        var subIdx = String(targetId.replace(/^tv:mahsunsports:?/i, ''));
        var only = (subIdx && /^\d+$/.test(subIdx)) ? parseInt(subIdx, 10) : null;
        return fetchMahsunMatches().then(function(groups) {
            var mStreams = buildMahsunMatchStreams(groups, only);
            return verifyMahsunStreams(mStreams).then(function(kept) {
                kept.streams = kept;
                return kept;
            });
        });
    }
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
