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

    // ── Mahsun Sports sanal kanalı: her canlı maç ayrı video ──
    var cleanM = String(targetId).toLowerCase();
    if (cleanM.indexOf('tv:mahsunsports') === 0) {
        return fetchMahsunVerifiedMatches(null).then(function(matches) {
            var videos = [];
            var titleCount = {};
            for (var i = 0; i < matches.length; i++) {
                var m = matches[i];
                titleCount[m.title] = (titleCount[m.title] || 0) + 1;
                var st;
                if (m.isChannelFeed) st = '🔴 ' + m.title;
                else st = (SPORT_LABEL[m.sport] || '▶') + ' | ' + m.title;
                if (titleCount[m.title] > 1) st += ' (Akış ' + titleCount[m.title] + ')';
                videos.push({ id: 'tv:mahsunsports:' + i, title: st, released: new Date().toISOString() });
            }
            return {
                meta: {
                    id: 'tv:mahsunsports',
                    type: "tv",
                    name: "Mahsun Sports",
                    poster: 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/mahsunsports.png',
                    background: 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/mahsunsports.png',
                    description: "Mahsun Sports canlı maç yayınları — Futbol, Basketbol, Voleybol ve Tenis",
                    genres: ["Spor"],
                    videos: videos
                }
            };
        }).catch(function() { return { meta: null }; });
    }

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
// Spor haritası: etiket (emoji + harf) ve görüntülenme sırası.
var SPORT_LABEL = { F: '⚽️ F', B: '🏀 B', V: '🏐 V', T: '🎾 T' };
var SPORT_ORDER = { F: 0, B: 1, V: 2, T: 3, C: 4 };

// Bir maçın sporunu belirler: önce site'nin F/B/V/T listelerinde birebir
// başlık, yoksa lig/başlık anahtar kelimeleri, son çare futbol.
function sportOfMatch(m, catSets) {
    var ct = cleanKey(m.title);
    if (catSets.F.has(ct)) return 'F';
    if (catSets.B.has(ct)) return 'B';
    if (catSets.V.has(ct)) return 'V';
    if (catSets.T.has(ct)) return 'T';
    var lg = String(m.league || '') + ' ' + String(m.title || '');
    lg = lg.toLowerCase();
    if (/(tenis|tennis|davis|atp|wta)/i.test(lg)) return 'T';
    if (/(voley|volley|legends cup)/i.test(lg)) return 'V';
    if (/(basket|basketbol|nba|wnba|euroliga|euro ?league|berna vindita|lacb)/i.test(lg)) return 'B';
    return 'F';
}

// Sitedeki canlı maç listesini (karsilasmalar) çıkarır ve spor grubuna göre
// etiketler. 4 branş listesi (F/B/V/T) yalnızca maç etiketi için başvuru
// tablosudur; branş listelerindeki ch# id'leri yer tutucudur (404).
function parseTimeMs(o) {
    var d = o.tarih || '';
    var t = o.time || '';
    if (!d && o._sort_key) d = String(o._sort_key).slice(0, 10);
    var tm = String(t).match(/(\d{1,2}):(\d{2})/);
    if (!tm) return null;
    var ts = Date.parse((d || '1970-01-01') + 'T' + tm[1] + ':' + tm[2] + ':00+03:00');
    return isNaN(ts) ? null : ts;
}

// Sabit kanal gruplarında yalnızca en son başlamış (≥ kickoff) maçı tutar.
function filterCurrentChannelSlots(featured) {
    var byId = {};
    var order = [];
    for (var a = 0; a < featured.length; a++) {
        var m = featured[a];
        if (!byId[m.id]) { byId[m.id] = []; order.push(m.id); }
        byId[m.id].push(m);
    }
    var out = [];
    var nowMs = Date.now();
    for (var i = 0; i < order.length; i++) {
        var id = order[i];
        var arr = byId[id];
        // ch# = per-event (yayın saatinde canlanır), facebooklive = mirror feed.
        // Bunlar tek maça ayrılmıştır → hepsi korunur.
        var isChannelFeed = (id.indexOf('facebooklive') === -1) && !/ch\d+$/i.test(id);
        if (!isChannelFeed) {
            out = out.concat(arr);
            continue;
        }
        var started = [];
        var untimed = [];
        for (var j = 0; j < arr.length; j++) {
            var ts = arr[j]._ts;
            if (ts === null) { untimed.push(arr[j]); continue; }
            if (ts <= nowMs) started.push(arr[j]);
        }
        if (started.length) {
            started.sort(function(x, y) { return x._ts - y._ts; });
            out.push(started[started.length - 1]);
        } else if (untimed.length) {
            out = out.concat(untimed); // saati bilinmiyor → fail-open
        }
    }
    return out;
}

function parseScript4(script) {
    var idMap = {};
    var chanById = {};
    var pairsRe = /\{\s*title:\s*"([^"]+)",\s*url:\s*"\/event\.html\?id=([^"]+)"\s*\}/g;
    var p;
    while ((p = pairsRe.exec(script)) !== null) {
        var nk = cleanKey(p[1]);
        if (nk && !idMap[nk]) idMap[nk] = p[2];
        if (p[2] && !chanById[p[2]]) chanById[p[2]] = p[1];
    }

    var CAT_ARRAYS = [
        { sport: 'F', array: 'futbolMatches' },
        { sport: 'B', array: 'basketbolMatches' },
        { sport: 'V', array: 'voleybolMatches' },
        { sport: 'T', array: 'tenisMatches' }
    ];
    var catSets = {};
    var catEvents = [];
    for (var ci = 0; ci < CAT_ARRAYS.length; ci++) {
        var ca = CAT_ARRAYS[ci];
        var caSet = new Set();
        var catBody = extractNamedArray(script, ca.array);
        if (catBody) {
            var catObjs = catBody.match(/\{[^{}]*\}/g) || [];
            for (var co = 0; co < catObjs.length; co++) {
                var ctM = catObjs[co].match(/"title"\s*:\s*"([^"]*)"/);
                var cu = catObjs[co].match(/"url"\s*:\s*"[^"]*id=([A-Za-z0-9]+)"/);
                var ct = ctM && ctM[1] ? ctM[1].trim() : '';
                var cid = cu ? cu[1] : '';
                if (ctM && ctM[1]) caSet.add(cleanKey(ctM[1].trim()));
                if (!ct || !cid || cid === 'None' || cid.indexOf('chNone') !== -1) continue;
                var ctTimeM = catObjs[co].match(/"time"\s*:\s*"([^"]*)"/);
                var ctSortM = catObjs[co].match(/"_sort_key"\s*:\s*"([^"]*)"/);
                var ctObj = {
                    title: ct,
                    id: cid,
                    league: '',
                    live: true,
                    time: ctTimeM ? ctTimeM[1] : '',
                    _sort_key: ctSortM ? ctSortM[1] : '',
                    sport: ca.sport,
                    _ts: null
                };
                ctObj._ts = parseTimeMs(ctObj);
                catEvents.push(ctObj);
            }
        }
        catSets[ca.sport] = caSet;
    }

    var featBody = extractNamedArray(script, 'karsilasmalar');
    var featured = [];
    var seenIdsArr = {};
    if (featBody) {
        var objs = featBody.match(/\{[^{}]*\}/g) || [];
        for (var oi = 0; oi < objs.length; oi++) {
            var o = objs[oi];
            var t = o.match(/"title"\s*:\s*"([^"]*)"/);
            var u = o.match(/"url"\s*:\s*"\/?event\.html\?id=([A-Za-z0-9]+)"/);
            var l = o.match(/"league"\s*:\s*"([^"]*)"/);
            var lv = o.match(/"live"\s*:\s*(true|false)/);
            var tm = o.match(/"time"\s*:\s*"([^"]*)"/);
            var dd = o.match(/"tarih"\s*:\s*"([^"]*)"/);
            if (!t || !u) continue;
            var title = t[1].trim();
            var id = u[1];
            if (!title || !id || id === 'None' || id.indexOf('chNone') !== -1) continue;
            var key = id + '|' + title;
            if (seenIdsArr[key]) continue;
            seenIdsArr[key] = true;
            var fobj = {
                title: title,
                id: id,
                league: l ? l[1].trim() : '',
                live: lv ? lv[1] === 'true' : false,
                time: tm ? tm[1].trim() : '',
                tarih: dd ? dd[1].trim() : '',
                sport: sportOfMatch({ title: title, league: l ? l[1].trim() : '' }, catSets),
                _ts: null
            };
            fobj._ts = parseTimeMs(fobj);
            featured.push(fobj);
        }
    }

    // Sabit kanallar: sadece şu an oynayan maç. ch#/facebook: hepsi.
    var keptFeatured = filterCurrentChannelSlots(featured);

    // Kanal adıyla fallback: bir sabit kanal featured'da vardır ama o an
    // başlamış maç slotu yoktur (günün programı listelenir). Kanal yine de
    // CANLI beslemedir — maç etiketi yalanına düşmeden kanal adıyla eklenir.
    // Yalnızca featured'da GÖRÜNEN beslemeler eklenir (site aktif kanalları);
    // Trt1/Atv/Tjk gibi genel kanallar checklist üzerinde boştur — eklenmez.
    // Verify (CDN 200) gerçekten yayında olanları tutar, ölüleri eler.
    var activeFeedIds = {};
    featured.forEach(function(m) { activeFeedIds[m.id] = true; });
    var featIds = {};
    keptFeatured.forEach(function(m) { featIds[m.id] = true; });
    var chanKeys = Object.keys(chanById);
    var channelFeedAdds = [];
    for (var ck = 0; ck < chanKeys.length; ck++) {
        var cid = chanKeys[ck];
        if (!activeFeedIds[cid]) continue;
        if (featIds[cid]) continue;
        if (cid.indexOf('facebooklive') !== -1) continue;
        if (/ch\d+$/i.test(cid)) continue;
        channelFeedAdds.push({
            title: chanById[cid],
            id: cid,
            league: '',
            live: true,
            time: '',
            tarih: '',
            sport: 'C',
            _ts: null,
            isChannelFeed: true
        });
    }

    // Featured'da zaten olan event'leri kategoriden düş (çift girmesin).
    var matches = keptFeatured.slice();
    for (var kk = 0; kk < catEvents.length; kk++) {
        if (featIds[catEvents[kk].id]) continue;
        matches.push(catEvents[kk]);
    }
    for (var af = 0; af < channelFeedAdds.length; af++) matches.push(channelFeedAdds[af]);

    // Spor grubuna göre sırala (F → B → V → T), sonra canlı, sonra saat.
    matches.sort(function(a, b) {
        var oa = SPORT_ORDER[a.sport] !== undefined ? SPORT_ORDER[a.sport] : 9;
        var ob = SPORT_ORDER[b.sport] !== undefined ? SPORT_ORDER[b.sport] : 9;
        if (oa !== ob) return oa - ob;
        if (a.live !== b.live) return a.live ? -1 : 1;
        return (a.time < b.time) ? -1 : (a.time > b.time ? 1 : 0);
    });

    return { idMap: idMap, matches: matches };
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
                mahsunCache = { time: now, bases: bases, idMap: {}, matches: [] };
                return mahsunCache;
            }
            return mahsunFetchText(scriptUrl).then(function(script) {
                var parsed = parseScript4(script);
                mahsunCache = { time: now, bases: bases, idMap: parsed.idMap, matches: parsed.matches };
                return mahsunCache;
            });
        });
    }).catch(function() {
        mahsunCache = { time: now, bases: [], idMap: {}, matches: [] };
        return mahsunCache;
    });
}

function fetchMahsunMatches() {
    return fetchMahsunData().then(function(data) {
        return data.matches || [];
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

// Her canlı maç ayrı bir stream: "⚽️ F | <başlık>". Aynı maçın birden
// fazla yayın beslemesi varsa "(Akış N)" eklenir.
function buildMahsunMatchStreams(matches, onlyIndex) {
    var streams = [];
    var bases = (mahsunCache && mahsunCache.bases && mahsunCache.bases.length) ? mahsunCache.bases : [];
    if (!bases.length) return streams;

    var base = bases[0];
    var titleCount = {};
    for (var i = 0; i < matches.length; i++) {
        if (onlyIndex !== null && onlyIndex !== undefined && i !== onlyIndex) continue;
        var m = matches[i];
        if (!m.id || !m.title) continue;
        var label;
        if (m.isChannelFeed) label = '🔴 ' + m.title;
        else label = (SPORT_LABEL[m.sport] || '▶') + ' | ' + m.title;
        titleCount[m.title] = (titleCount[m.title] || 0) + 1;
        var st = label;
        if (titleCount[m.title] > 1) st += ' (Akış ' + titleCount[m.title] + ')';
        streams.push(mahsunMakeStream(
            '⌜ Mahsun Sports ⌟',
            st,
            base + m.id + '.m3u8'
        ));
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

// Sadece GERÇEKTEN yayında olan (CDN 200/206) maçları döner. getMeta ve
// getStreams aynı listeyi kullandığı için meta'da görünüp açılmayan maç olmaz.
function mahsunVerifiedMatches(matches, onlyIndex) {
    if (!matches || !Array.isArray(matches)) matches = [];
    var streams = buildMahsunMatchStreams(matches, onlyIndex);
    if (!streams.length) return Promise.resolve([]);
    return verifyMahsunStreams(streams).then(function(kept) {
        var keptUrls = {};
        kept.forEach(function(s) { keptUrls[s.url] = true; });
        var base = (mahsunCache && mahsunCache.bases && mahsunCache.bases.length) ? mahsunCache.bases[0] : '';
        var out = [];
        for (var i = 0; i < matches.length; i++) {
            if (onlyIndex !== null && onlyIndex !== undefined && i !== onlyIndex) continue;
            var m = matches[i];
            if (!m.id || !m.title) continue;
            if (keptUrls[base + m.id + '.m3u8']) out.push(m);
        }
        return out;
    });
}

function fetchMahsunVerifiedMatches(onlyIndex) {
    return fetchMahsunMatches().then(function(matches) {
        return mahsunVerifiedMatches(matches, onlyIndex);
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
        return fetchMahsunVerifiedMatches(only).then(function(kept) {
            var mStreams = buildMahsunMatchStreams(kept, null);
            mStreams.streams = mStreams;
            return mStreams;
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
