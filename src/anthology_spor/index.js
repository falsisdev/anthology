const { sortStreamsByQuality } = require("../shared/quality.js");
const { loadConfig, val, wrapAll } = require("../shared/config.js");

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v;
            v = val('urls.live.m3u_remote'); if (v) M3U_REMOTE = String(v).replace(/\/+$/, '');
            v = val('urls.live.mahsunsports'); if (v) MAHSUN_SITE = v;
            if (_MAHSUN_HEADERS) { _MAHSUN_HEADERS.Referer = MAHSUN_SITE; _MAHSUN_HEADERS.Origin = MAHSUN_SITE; }
        });
    }
    return _cfgReady;
}

/**
 * Anthology Canlı Spor Paketi
 * TRT Spor, A Spor, TV8.5, BeIN Sports, S Sport, Tivibu Spor, Exxen Spor vb.
 * Mahsunsports maç yayınları (Futbol, Basketbol, Voleybol, Tenis) ayrı bir kanal olarak.
 */

var path = typeof require !== 'undefined' ? require('path') : null;
var fs = typeof require !== 'undefined' ? require('fs') : null;

var M3U_REMOTE = "https://raw.githubusercontent.com/falsisdev/anthology/main/providers/M3U/Liste/canli.m3u";

// TEK DEĞİŞTİRİLECEK SİTE AYARI: MahsunSports giriş adresi.
var MAHSUN_SITE = "https://mahsunsports80.xyz/";

var MAHSUN_LOGO = "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/mahsunsports.png";

var _HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*'
};

var _MAHSUN_HEADERS = {
    'User-Agent': _HEADERS['User-Agent'],
    'Referer': MAHSUN_SITE,
    'Origin': MAHSUN_SITE
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
                    url: streamUrl,
                    backup: backupMatch ? backupMatch[1] : ''
                });
            }
        }
    }
    return channels;
}

function isEncryptedSport(channel) {
    var key = cleanKey((channel.id || '').replace(/^tv:/, '') + ' ' + (channel.name || ''));
    return /bein|ssport|sspor|tivibu|smartspor|smarts|exxen|tabii|eurosport|nba/.test(key);
}

// ── MahsunSports Yedek Akış Motoru ──────────────────────────────────
// Kaynak yapısı: mahsunsports80.xyz/event.html?id=<id> oynatıcısı
// gerçek akışı https://andro.evrenesoglu<NNN>.click/checklist/<id>.m3u8
// adresinden çeker. Host adresleri scriptten dinamik okunur; kodda sabit
// yedek host TUTULMAZ. Böylece tek kaynak dosyası (canli.m3u) üzerinden
// kanal bağlantısı değiştirilir ve yedek host otomatik takip eder.

var ANDRO_URL_RE = /https:\/\/andro\.evrenesoglu\d+\.click\/checklist\//g;
var MAHSUN_DATA_TTL = 15 * 60 * 1000;    // backend + maç listesi 15 dk

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

// Spor haritası: etiket (emoji + harf) ve görüntülenme sırası.
var SPORT_LABEL = { F: '⚽️ F', B: '🏀 B', V: '🏐 V', T: '🎾 T' };
var SPORT_ORDER = { F: 0, B: 1, V: 2, T: 3 };

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

// Kanal ID haritası (name -> andro id) ve canlı maç listesini çıkarır.
// Sitede bulunan 4 branş listesi (F/B/V/T) maçın sporunu etiketlemek için
// başvuru tablosudur; oynanabilir yayınlar yalnızca karsilasmalar'da olur
// (branş listelerindeki ch# id'leri yer tutucudur → CDN'de 404).
function parseScript4(script) {
    var idMap = {};
    var pairsRe = /\{\s*title:\s*"([^"]+)",\s*url:\s*"\/event\.html\?id=([^"]+)"\s*\}/g;
    var p;
    while ((p = pairsRe.exec(script)) !== null) {
        var nk = cleanKey(p[1]);
        if (nk && !idMap[nk]) idMap[nk] = p[2];
    }

    var CAT_ARRAYS = [
        { sport: 'F', array: 'futbolMatches' },
        { sport: 'B', array: 'basketbolMatches' },
        { sport: 'V', array: 'voleybolMatches' },
        { sport: 'T', array: 'tenisMatches' }
    ];
    var catSets = {};
    for (var ci = 0; ci < CAT_ARRAYS.length; ci++) {
        var ca = CAT_ARRAYS[ci];
        var caSet = new Set();
        var catBody = extractNamedArray(script, ca.array);
        if (catBody) {
            var catObjs = catBody.match(/\{[^{}]*\}/g) || [];
            for (var co = 0; co < catObjs.length; co++) {
                var ctM = catObjs[co].match(/"title"\s*:\s*"([^"]*)"/);
                if (ctM && ctM[1]) caSet.add(cleanKey(ctM[1].trim()));
            }
        }
        catSets[ca.sport] = caSet;
    }

    var featBody = extractNamedArray(script, 'karsilasmalar');
    var matches = [];
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
            if (!t || !u) continue;
            var title = t[1].trim();
            var id = u[1];
            if (!title || !id || id === 'None' || id.indexOf('chNone') !== -1) continue;
            var key = id + '|' + title;
            if (seenIdsArr[key]) continue;
            seenIdsArr[key] = true;
            matches.push({
                title: title,
                id: id,
                league: l ? l[1].trim() : '',
                live: lv ? lv[1] === 'true' : false,
                time: tm ? tm[1].trim() : '',
                sport: sportOfMatch({ title: title, league: l ? l[1].trim() : '' }, catSets)
            });
        }
    }

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
    return mahsunFetchText(MAHSUN_SITE + "event.html?id=androstreamlivebs1")
        .then(function(evtHtml) {
            var bases = [];
            var bm;
            ANDRO_URL_RE.lastIndex = 0;
            while ((bm = ANDRO_URL_RE.exec(evtHtml)) !== null) {
                if (bases.indexOf(bm[0]) === -1) bases.push(bm[0]);
            }
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
        })
        .catch(function() {
            mahsunCache = { time: now, bases: [], idMap: {}, matches: [] };
            return mahsunCache;
        });
}

// Yedek akış motoru için host + kanal-id haritası.
function fetchMahsunBackend() {
    return fetchMahsunData();
}

// Mahsunsports kanalı için canlı maç listesi.
function fetchMahsunMatches() {
    return fetchMahsunData().then(function(data) {
        return data.matches || [];
    });
}

function androIdFromUrl(url) {
    var m = String(url || '').match(/\/checklist\/([A-Za-z0-9]+)\.m3u8/);
    return m ? m[1] : null;
}

function buildAndroBackupUrls(channel, backend) {
    var primary = channel.url || '';
    var pId = androIdFromUrl(primary);
    var id = null;
    var k = cleanKey(channel.name || '');
    var cand = cleanKey((channel.name || '').replace(/\s*HD$/i, '').trim());
    if (backend.idMap && backend.idMap[k]) id = backend.idMap[k];
    else if (backend.idMap && backend.idMap[cand]) id = backend.idMap[cand];
    if (!id && backend.idMap) {
        for (var kk in backend.idMap) {
            if (kk && kk.length > 3 && (k.indexOf(kk) !== -1 || kk.indexOf(k) !== -1)) {
                id = backend.idMap[kk];
                break;
            }
        }
    }
    if (!id && pId) id = pId;
    if (!id) return [];
    var out = [];
    var bases = (backend.bases && backend.bases.length) ? backend.bases : [];
    for (var i = 0; i < bases.length; i++) {
        var u = bases[i] + id + ".m3u8";
        if (u !== primary && out.indexOf(u) === -1) out.push(u);
    }
    return out;
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

// ── Ölü maç akışı filtresi ──────────────────────────────────────────
// Mahsunsports maç listesindeki "ch#/None" beslemelerinin çoğu CDN'de
// gerçekten yayında değildir (404). Oynatıcı çökmesin diye akış URL'lerini
// hafif Range isteğiyle doğrular; kesin 404/410/400 olanları sessizce eler.
// Ağ hatası/zaman aşımı (çevresel blok olabilir) durumunda akış KORUNUR.
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

            // Mahsun Sports: sitedeki canlı maç yayınlarını tek tek stream olarak döner.
            metas.unshift({
                id: "tv:mahsunsports",
                type: "tv",
                name: "Mahsun Sports",
                poster: MAHSUN_LOGO,
                background: MAHSUN_LOGO,
                genres: ["Spor"],
                description: "Mahsun Sports canlı maç yayınları — Futbol, Basketbol, Voleybol ve Tenis"
            });
            return { metas: metas };
        })
        .catch(function() {
            return { metas: [] };
        });
}

var VERIFIED_BACKUPS = {
    'trtspor': 'https://tv-trtspor1.medya.trt.com.tr/master.m3u8',
    'trtsporyildiz': 'https://tv-trtspor2.medya.trt.com.tr/master.m3u8',
    'aspor': 'https://trkvz-live.ercdn.net/asportv/asportv.m3u8',
    'fbtv': 'http://1hskrdto.rocketcdn.com/fenerbahcetv.smil/playlist.m3u8',
    'tv85': 'https://tv8.daioncdn.net/tv8bucuk/tv8bucuk.m3u8?app=tv8bucuk_web&ce=3'
};

// Her canlı maç ayrı bir stream: "⚽️ F | <başlık>". Aynı maçın birden
// fazla yayın beslemesi varsa (örn. ana kanal + alternatif) "(Akış N)" eklenir.
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
        var label = SPORT_LABEL[m.sport] || '▶';
        titleCount[m.title] = (titleCount[m.title] || 0) + 1;
        var st = label + ' | ' + m.title;
        if (titleCount[m.title] > 1) st += ' (Akış ' + titleCount[m.title] + ')';
        streams.push(makeStream(
            '⌜ Mahsun Sports ⌟',
            st,
            base + m.id + '.m3u8',
            _MAHSUN_HEADERS
        ));
    }
    return streams;
}

function getStreams(args) {
    var targetId = (typeof args === 'string') ? args : (args ? (args.id || args.name) : "");
    var mediaType = (args && args.type) || (args && args.mediaType) || '';
    var isLiveRequest = /^tv:/i.test(targetId) || mediaType === 'channel' || mediaType === 'tv' && /^tv:/i.test((args && args.id) || '');
    if (!isLiveRequest && targetId && !/^tv:/i.test(targetId)) {
        var looksLikeTmdb = /^(tt\d+|\d+)$/.test(String(targetId).split(':')[0]);
        if (looksLikeTmdb || mediaType === 'movie') {
            var emptyNoLive = [];
            emptyNoLive.streams = [];
            return Promise.resolve(emptyNoLive);
        }
    }

    // ── Mahsunsports sanal kanalı ──
    var cleanT = String(targetId || '').toLowerCase();
    if (cleanT.indexOf('tv:mahsunsports') === 0) {
        var sub = cleanT.replace(/^tv:mahsunsports:?/, '');
        var idx = (sub && /^\d+$/.test(sub)) ? parseInt(sub, 10) : null;
        return fetchMahsunMatches().then(function(groups) {
            var streams = buildMahsunMatchStreams(groups, idx);
            streams.streams = streams;
            return verifyMahsunStreams(streams).then(function(kept) {
                kept.streams = kept;
                return kept;
            });
        });
    }

    return fetchChannels()
        .then(function(content) {
            var channels = parseSportChannels(content);
            if (!targetId && channels.length > 0) {
                return channels.slice(0, 5).map(function(ch) {
                    var encrypted = isEncryptedSport(ch);
                    return makeStream(
                        '⌜ Anthology Spor ⌟',
                        ch.name + ' [Canlı HD]',
                        ch.url,
                        encrypted ? _MAHSUN_HEADERS : _HEADERS
                    );
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

            if (!matched) {
                var empty2 = [];
                empty2.streams = [];
                return empty2;
            }

            var streams = [];
            var encrypted = isEncryptedSport(matched);

            if (encrypted) {
                streams.push(makeStream('⌜ Anthology Spor ⌟', matched.name + ' [Canlı HD]', matched.url, _MAHSUN_HEADERS));
                // kullanıcı canli.m3u satırına tvg-backup="..." verdiyse o kullanılır.
                if (matched.backup && matched.backup !== matched.url) {
                    streams.push(makeStream('⌜ Anthology Spor · Yedek ⌟', matched.name + ' [Yedek Akış]', matched.backup, _MAHSUN_HEADERS));
                } else {
                    return fetchMahsunBackend().then(function(backend) {
                        var backups = buildAndroBackupUrls(matched, backend);
                        for (var bi = 0; bi < backups.length; bi++) {
                            streams.push(makeStream('⌜ Anthology Spor · Yedek ⌟', matched.name + ' [Yedek Akış]', backups[bi], _MAHSUN_HEADERS));
                        }
                        streams.streams = streams;
                        return streams;
                    });
                }
            } else {
                streams.push(makeStream('⌜ Anthology Spor ⌟', matched.name + ' [Canlı HD]', matched.url, _HEADERS));
                var extra = '';
                if (matched.backup && matched.backup !== matched.url) {
                    extra = matched.backup;
                } else {
                    for (var bk in VERIFIED_BACKUPS) {
                        if (cleanKey(matched.id).includes(bk)) {
                            extra = VERIFIED_BACKUPS[bk];
                            break;
                        }
                    }
                }
                if (extra) {
                    streams.push(makeStream('⌜ Anthology Spor · Yedek ⌟', matched.name + ' [Yedek Akış]', extra, _HEADERS));
                }
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

function getMeta(args) {
    var targetId = (typeof args === 'string') ? args : (args && args.id ? args.id : null);
    if (!targetId) return Promise.resolve({ meta: null });

    var cleanT = String(targetId).toLowerCase();
    if (cleanT.indexOf('tv:mahsunsports') === 0) {
        return fetchMahsunMatches().then(function(matches) {
            var videos = [];
            var titleCount = {};
            for (var i = 0; i < matches.length; i++) {
                var g = matches[i];
                titleCount[g.title] = (titleCount[g.title] || 0) + 1;
                var st = (SPORT_LABEL[g.sport] || '▶') + ' | ' + g.title;
                if (titleCount[g.title] > 1) st += ' (Akış ' + titleCount[g.title] + ')';
                videos.push({
                    id: 'tv:mahsunsports:' + i,
                    title: st,
                    released: new Date().toISOString()
                });
            }
            return {
                meta: {
                    id: 'tv:mahsunsports',
                    type: "tv",
                    name: "Mahsun Sports",
                    poster: MAHSUN_LOGO,
                    background: MAHSUN_LOGO,
                    description: "Mahsun Sports canlı maç yayınları — Futbol, Basketbol, Voleybol ve Tenis",
                    genres: ["Spor"],
                    videos: videos
                }
            };
        }).catch(function() {
            return { meta: null };
        });
    }

    return fetchChannels()
        .then(function(content) {
            var channels = parseSportChannels(content);
            var cleanTarget = cleanKey(targetId.replace(/^tv:/, ''));
            var ch = channels.find(function(c) { return c.id === targetId || cleanKey(c.id.replace(/^tv:/, '')) === cleanTarget || cleanKey(c.name) === cleanTarget; });
            if (!ch) ch = channels[0];
            if (!ch) return { meta: null };
            return {
                meta: {
                    id: targetId,
                    type: "tv",
                    name: ch.name,
                    poster: ch.logo,
                    background: ch.logo,
                    description: ch.name + " Canlı Spor Yayını",
                    genres: ["Spor"],
                    videos: [{ id: targetId, title: ch.name, released: new Date().toISOString() }]
                }
            };
        })
        .catch(function() { return { meta: null }; });
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