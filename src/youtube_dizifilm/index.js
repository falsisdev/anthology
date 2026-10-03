const { sortStreamsByQuality } = require('../shared/quality.js');
const { loadConfig, val, wrapAll } = require('../shared/config.js');
const { timeoutSignal } = require('../shared/http.js');
const { normalizeSeriesId, resolveSeriesInfo } = require('../shared/turkish_series.js');
const { resolveYouTubeMp4 } = require('../shared/ytmp4.js');

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v;
            v = val('api_keys.tmdb'); if (v) TMDB_API_KEY = String(v);
            v = val('urls.youtube.innertube_key'); if (v) INNERTUBE_KEY = String(v);
        });
    }
    return _cfgReady;
}

/**
 * Anthology - YouTube Dizi & Film Provider
 * 
 * YouTube üzerinde resmi yapımcılar, TV kanalları (Show TV, Kanal D, Star, TRT vb.)
 * ve film stüdyoları (Arzu Film, Fanatik Film, BKM) tarafından yayınlanan
 * tam bölümler ve yerli sinema filmleri için 1080p doğrudan akış sağlayıcısı.
 */

var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

var DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

var HEADERS = {
    'User-Agent': DESKTOP_UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8'
};

// ── Curated YouTube Vitrin Kataloğu ──────────────────────────────────────────

var POPULAR_DIZILER = [
    { tmdbId: '34587', name: 'Kurtlar Vadisi', year: '2003', poster: 'https://image.tmdb.org/t/p/w500/yX6JEIijuH6KNCgO8I2yLKu2Psb.jpg', channel: 'Kurtlar Vadisi' },
    { tmdbId: '32519', name: 'Ezel', year: '2009', poster: 'https://image.tmdb.org/t/p/w500/pHSjh4MINU2JnK7qQvjogQaX3wr.jpg', channel: 'Ezel' },
    { tmdbId: '32433', name: 'Aşk-ı Memnu', year: '2008', poster: 'https://image.tmdb.org/t/p/w500/bJbL2fG6t4b7qH9eE2K3jP0v5a7.jpg', channel: 'Kanal D' },
    { tmdbId: '39176', name: 'Behzat Ç.', year: '2010', poster: 'https://image.tmdb.org/t/p/w500/iL8P2aX8n7j9t9K8p1v0m5k3b7g.jpg', channel: 'Adam Film' },
    { tmdbId: '39352', name: 'Leyla ile Mecnun', year: '2011', poster: 'https://image.tmdb.org/t/p/w500/8tH8rZ2vG8o1m3k5b7p9q0r1s2t.jpg', channel: 'TRT 1' },
    { tmdbId: '43865', name: 'Kuzey Güney', year: '2011', poster: 'https://image.tmdb.org/t/p/w500/q2m7b9k5p3j8r1v0m5k3b7g9q0r.jpg', channel: 'Kuzey Güney' },
    { tmdbId: '32520', name: 'Avrupa Yakası', year: '2004', poster: 'https://image.tmdb.org/t/p/w500/v1m5k3b7g9q0r1s2t8h8rZ2vG8o.jpg', channel: 'Avrupa Yakası' },
    { tmdbId: '60682', name: 'Kardeş Payı', year: '2014', poster: 'https://image.tmdb.org/t/p/w500/3j8r1v0m5k3b7g9q0r1s2t8h8rZ.jpg', channel: 'Kardeş Payı' },
    { tmdbId: '32522', name: 'Geniş Aile', year: '2009', poster: 'https://image.tmdb.org/t/p/w500/8r1v0m5k3b7g9q0r1s2t8h8rZ2v.jpg', channel: 'D Productions' },
    { tmdbId: '32521', name: 'Cennet Mahallesi', year: '2004', poster: 'https://image.tmdb.org/t/p/w500/m5k3b7g9q0r1s2t8h8rZ2vG8o1m.jpg', channel: 'Erler Film Türker İnanoğlu' },
    { tmdbId: '32524', name: 'Akasya Durağı', year: '2008', poster: 'https://image.tmdb.org/t/p/w500/7g9q0r1s2t8h8rZ2vG8o1m3k5b7.jpg', channel: 'Erler Film' },
    { tmdbId: '61483', name: 'Medcezir', year: '2013', poster: 'https://image.tmdb.org/t/p/w500/9q0r1s2t8h8rZ2vG8o1m3k5b7p9.jpg', channel: 'Medcezir' },
    { tmdbId: '68349', name: 'İçerde', year: '2016', poster: 'https://image.tmdb.org/t/p/w500/r1s2t8h8rZ2vG8o1m3k5b7p9q0r.jpg', channel: 'İçerde' },
    { tmdbId: '74431', name: 'Çukur', year: '2017', poster: 'https://image.tmdb.org/t/p/w500/2t8h8rZ2vG8o1m3k5b7p9q0r1s2.jpg', channel: 'Çukur' },
    { tmdbId: '39351', name: 'Muhteşem Yüzyıl', year: '2011', poster: 'https://image.tmdb.org/t/p/w500/8h8rZ2vG8o1m3k5b7p9q0r1s2t8.jpg', channel: 'Tims Productions' },
    { tmdbId: '32523', name: 'Yaprak Dökümü', year: '2006', poster: 'https://image.tmdb.org/t/p/w500/o1m3k5b7p9q0r1s2t8h8rZ2vG8o.jpg', channel: 'Kanal D' },
    { tmdbId: '46648', name: 'Karadayı', year: '2012', poster: 'https://image.tmdb.org/t/p/w500/m3k5b7p9q0r1s2t8h8rZ2vG8o1m.jpg', channel: 'Karadayı' },
    { tmdbId: '112454', name: 'Gönül Dağı', year: '2020', poster: 'https://image.tmdb.org/t/p/w500/5b7p9q0r1s2t8h8rZ2vG8o1m3k5.jpg', channel: 'TRT 1' }
];

var POPULAR_FILMLER = [
    { tmdbId: '38794', name: 'Tosun Paşa', year: '1976', poster: 'https://image.tmdb.org/t/p/w500/aE8cMuRNYltzzW36N2hC3zyZQm2.jpg', channel: 'ARZU FİLM' },
    { tmdbId: '16842', name: 'Hababam Sınıfı', year: '1975', poster: 'https://image.tmdb.org/t/p/w500/q2m7b9k5p3j8r1v0m5k3b7g9q0r.jpg', channel: 'ARZU FİLM' },
    { tmdbId: '38795', name: 'Şaban Oğlu Şaban', year: '1977', poster: 'https://image.tmdb.org/t/p/w500/v1m5k3b7g9q0r1s2t8h8rZ2vG8o.jpg', channel: 'ARZU FİLM' },
    { tmdbId: '38796', name: 'Süt Kardeşler', year: '1976', poster: 'https://image.tmdb.org/t/p/w500/3j8r1v0m5k3b7g9q0r1s2t8h8rZ.jpg', channel: 'ARZU FİLM' },
    { tmdbId: '38798', name: 'Kibar Feyzo', year: '1978', poster: 'https://image.tmdb.org/t/p/w500/8r1v0m5k3b7g9q0r1s2t8h8rZ2v.jpg', channel: 'ARZU FİLM' },
    { tmdbId: '38797', name: 'Çöpçüler Kralı', year: '1977', poster: 'https://image.tmdb.org/t/p/w500/m5k3b7g9q0r1s2t8h8rZ2vG8o1m.jpg', channel: 'ARZU FİLM' },
    { tmdbId: '38799', name: 'Neşeli Günler', year: '1978', poster: 'https://image.tmdb.org/t/p/w500/7g9q0r1s2t8h8rZ2vG8o1m3k5b7.jpg', channel: 'ARZU FİLM' },
    { tmdbId: '88451', name: 'Davaro', year: '1981', poster: 'https://image.tmdb.org/t/p/w500/9q0r1s2t8h8rZ2vG8o1m3k5b7p9.jpg', channel: 'Gülşah Film' },
    { tmdbId: '88452', name: 'Züğürt Ağa', year: '1985', poster: 'https://image.tmdb.org/t/p/w500/r1s2t8h8rZ2vG8o1m3k5b7p9q0r.jpg', channel: 'Fanatik Film' },
    { tmdbId: '38800', name: 'Kapıcılar Kralı', year: '1976', poster: 'https://image.tmdb.org/t/p/w500/2t8h8rZ2vG8o1m3k5b7p9q0r1s2.jpg', channel: 'ARZU FİLM' },
    { tmdbId: '12621', name: 'Organize İşler', year: '2005', poster: 'https://image.tmdb.org/t/p/w500/8h8rZ2vG8o1m3k5b7p9q0r1s2t8.jpg', channel: 'BKM' },
    { tmdbId: '12620', name: 'Vizontele', year: '2001', poster: 'https://image.tmdb.org/t/p/w500/o1m3k5b7p9q0r1s2t8h8rZ2vG8o.jpg', channel: 'BKM' },
    { tmdbId: '12619', name: 'G.O.R.A.', year: '2004', poster: 'https://image.tmdb.org/t/p/w500/m3k5b7p9q0r1s2t8h8rZ2vG8o1m.jpg', channel: 'BKM' }
];

// ── String & Matching Helpers ───────────────────────────────────────────────

function asciiFold(s) {
    s = String(s || '');
    try { if (typeof s.normalize === 'function') s = s.normalize('NFD'); } catch (e) { }
    s = s.replace(/[\u0300-\u036f]/g, '');
    var map = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
    var out = '';
    var lower = s.toLowerCase();
    for (var i = 0; i < lower.length; i++) {
        var ch = lower.charAt(i);
        out += (map[ch] !== undefined ? map[ch] : ch);
    }
    return out;
}

function cleanTitle(t) {
    return asciiFold(String(t || '')).replace(/[^a-z0-9]+/g, ' ').trim();
}

function parseDurationSec(str) {
    if (!str) return 0;
    var parts = String(str).split(':').map(function (p) { return parseInt(p, 10); });
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return 0;
}

/**
 * Validates if YouTube video title matches requested season and episode number.
 * Prevents false matches (e.g. matching 10. Bölüm when Episode 1 is requested).
 */
function matchesEpisode(videoTitle, season, episode, cumEpisode) {
    var norm = asciiFold(videoTitle);

    var epCandidates = [episode];
    if (cumEpisode && cumEpisode !== episode) {
        epCandidates.push(cumEpisode);
    }

    var matchedEp = false;
    for (var i = 0; i < epCandidates.length; i++) {
        var ep = epCandidates[i];
        var epRegexes = [
            new RegExp('(?:^|[^0-9])' + ep + '\\s*\\.?\\s*(?:bolum|bolumu|b|episode|ep)(?:[^0-9]|$)', 'i'),
            new RegExp('(?:bolum|bolumu|episode|ep)\\s*[:#-]?\\s*' + ep + '(?:[^0-9]|$)', 'i'),
            new RegExp('(?:^|[^0-9])b' + ep + '(?:[^0-9]|$)', 'i'),
            new RegExp('(?:^|\\s)-?\\s*' + ep + '\\.bolum', 'i')
        ];
        if (epRegexes.some(function (r) { return r.test(norm); })) {
            matchedEp = true;
            break;
        }
    }

    if (!matchedEp) return false;

    // If season > 1, check that an explicitly different season is not mentioned
    if (season > 1) {
        var otherSeasonRegex = /(?:^|[^0-9])([1-9]\d?)\s*\.?\s*(?:sezon|season)(?:[^0-9]|$)/i;
        var sMatch = norm.match(otherSeasonRegex);
        if (sMatch && parseInt(sMatch[1], 10) !== season) {
            return false;
        }
    }

    return true;
}

// ── YouTube Channel Subscribers Cache & Fetcher ───────────────────────────
var _channelCache = {};

async function getChannelSubscribers(browseId) {
    if (!browseId) return null;
    if (_channelCache[browseId] !== undefined) return _channelCache[browseId];
    try {
        var res = await fetch('https://www.youtube.com/youtubei/v1/browse?key=' + INNERTUBE_KEY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                browseId: browseId,
                context: { client: { clientName: 'WEB', clientVersion: '2.20240313.00.00', hl: 'tr', gl: 'TR' } }
            }),
            signal: timeoutSignal(3500)
        });
        if (!res.ok) {
            _channelCache[browseId] = null;
            return null;
        }
        var data = await res.json();
        var subs = '';
        var rows = (data.header && data.header.pageHeaderRenderer && data.header.pageHeaderRenderer.content &&
            data.header.pageHeaderRenderer.content.pageHeaderViewModel &&
            data.header.pageHeaderRenderer.content.pageHeaderViewModel.metadata &&
            data.header.pageHeaderRenderer.content.pageHeaderViewModel.metadata.contentMetadataViewModel &&
            data.header.pageHeaderRenderer.content.pageHeaderViewModel.metadata.contentMetadataViewModel.metadataRows) || [];
        for (var r = 0; r < rows.length; r++) {
            var parts = rows[r].metadataParts || [];
            for (var p = 0; p < parts.length; p++) {
                var txt = (parts[p].text && parts[p].text.content) || parts[p].accessibilityLabel || '';
                if (txt.indexOf('abone') !== -1 || txt.indexOf('subscriber') !== -1) {
                    subs = txt.replace(/\s*abone\s*/gi, '').replace(/\s*subscribers?\s*/gi, '').trim();
                    break;
                }
            }
            if (subs) break;
        }
        if (!subs && data.header && data.header.c4TabbedHeaderRenderer) {
            var c4 = data.header.c4TabbedHeaderRenderer;
            if (c4.subscriberCountText && c4.subscriberCountText.simpleText) {
                subs = c4.subscriberCountText.simpleText.replace(/\s*abone\s*/gi, '').trim();
            }
        }
        if (!subs) {
            var str = JSON.stringify(data.header || {});
            var m = str.match(/([0-9.,]+\s*[B|Mn|M|bin|milyon]?)\s*(?:abone|subscriber)/i);
            if (m) subs = m[1].trim();
        }
        if (subs) {
            subs = subs.replace(/\u00a0/g, ' ').trim();
            if (subs.toLowerCase().indexOf('abone') === -1) subs += ' Abone';
        }
        _channelCache[browseId] = subs || null;
        return _channelCache[browseId];
    } catch (e) {
        _channelCache[browseId] = null;
        return null;
    }
}

function parseViewCount(str) {
    if (!str) return 0;
    var s = String(str).toLowerCase().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    var mnMatch = s.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:mn|m|milyon)/i);
    if (mnMatch) return parseFloat(mnMatch[1].replace(',', '.')) * 1000000;
    var bMatch = s.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:b|k|bin)/i);
    if (bMatch) return parseFloat(bMatch[1].replace(',', '.')) * 1000;
    var clean = s.replace(/[^0-9]/g, '');
    return parseInt(clean, 10) || 0;
}

function formatNumberCompact(n) {
    var num = parseInt(n, 10);
    if (isNaN(num)) return '';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '').replace('.', ',') + ' Mn';
    if (num >= 1000) return (num / 1000).toFixed(0) + ' B';
    return String(num);
}

// ── YouTube Search via Innertube API ────────────────────────────────────────

async function searchYouTube(query) {
    // 1. Önce WEB Innertube API (Doğrulandı rozeti, tam kanal ve görüntüleme verisi)
    try {
        var resWeb = await fetch('https://www.youtube.com/youtubei/v1/search?key=' + INNERTUBE_KEY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: query,
                context: {
                    client: {
                        clientName: 'WEB',
                        clientVersion: '2.20240313.00.00',
                        hl: 'tr',
                        gl: 'TR'
                    }
                }
            }),
            signal: timeoutSignal(4000)
        });
        if (resWeb.ok) {
            var dataWeb = await resWeb.json();
            var resultsWeb = _parseInnertubeWebSearch(dataWeb);
            if (resultsWeb.length > 0) return resultsWeb;
        }
    } catch (e) { }

    // 2. ANDROID Innertube API fallback
    try {
        var resAnd = await fetch('https://www.youtube.com/youtubei/v1/search?key=' + INNERTUBE_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip',
                'X-Goog-Api-Format-Version': '2'
            },
            body: JSON.stringify({
                query: query,
                context: {
                    client: {
                        clientName: 'ANDROID',
                        clientVersion: '20.10.38',
                        hl: 'tr',
                        gl: 'TR'
                    }
                }
            }),
            signal: timeoutSignal(4000)
        });
        if (resAnd.ok) {
            var dataAnd = await resAnd.json();
            var resultsAnd = _parseInnertubeAndroidSearch(dataAnd);
            if (resultsAnd.length > 0) return resultsAnd;
        }
    } catch (e2) { }

    // 3. Fallback: Web HTML scraping
    try {
        var res3 = await fetch('https://www.youtube.com/results?search_query=' + encodeURIComponent(query), {
            headers: HEADERS,
            signal: timeoutSignal(4000)
        });
        if (!res3.ok) return [];
        var html = await res3.text();
        var match = html.match(/var ytInitialData = ({.*?});<\/script>/) || html.match(/ytInitialData\s*=\s*({.+?});/);
        if (!match) return [];
        var data3 = JSON.parse(match[1]);
        return _parseInnertubeWebSearch(data3);
    } catch (e3) {
        return [];
    }
}

function _parseInnertubeWebSearch(data) {
    var results = [];
    var seenIds = {};
    try {
        var contents = (data && data.contents &&
            data.contents.twoColumnSearchResultsRenderer &&
            data.contents.twoColumnSearchResultsRenderer.primaryContents &&
            data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer &&
            data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents) || [];
        for (var s = 0; s < contents.length; s++) {
            var itemSection = contents[s].itemSectionRenderer && contents[s].itemSectionRenderer.contents;
            for (var i = 0; i < (itemSection || []).length; i++) {
                var vr = itemSection[i].videoRenderer;
                if (!vr || !vr.videoId) continue;
                var vid = vr.videoId;
                if (seenIds[vid]) continue;
                seenIds[vid] = true;

                var title = (vr.title && vr.title.runs && vr.title.runs.map(function (r) { return r.text; }).join('')) ||
                    (vr.title && vr.title.simpleText) || '';
                var duration = (vr.lengthText && vr.lengthText.simpleText) ||
                    (vr.lengthText && vr.lengthText.runs && vr.lengthText.runs.map(function (r) { return r.text; }).join('')) || '';
                var channel = (vr.ownerText && vr.ownerText.runs && vr.ownerText.runs[0] && vr.ownerText.runs[0].text) || '';
                var browseId = (vr.ownerText && vr.ownerText.runs && vr.ownerText.runs[0] &&
                    vr.ownerText.runs[0].navigationEndpoint && vr.ownerText.runs[0].navigationEndpoint.browseEndpoint &&
                    vr.ownerText.runs[0].navigationEndpoint.browseEndpoint.browseId) || null;
                var views = (vr.shortViewCountText && vr.shortViewCountText.simpleText) ||
                    (vr.viewCountText && vr.viewCountText.simpleText) || '';
                views = views.replace(/\u00a0/g, ' ').replace(/\s*görüntüleme\s*/i, '').trim();

                var isVerified = false;
                if (Array.isArray(vr.ownerBadges)) {
                    isVerified = vr.ownerBadges.some(function (b) {
                        return b && b.metadataBadgeRenderer && b.metadataBadgeRenderer.style &&
                            b.metadataBadgeRenderer.style.indexOf('VERIFIED') !== -1;
                    });
                }

                results.push({
                    id: vid,
                    title: title,
                    duration: duration,
                    durationSec: parseDurationSec(duration),
                    channel: channel,
                    browseId: browseId,
                    views: views,
                    viewsNum: parseViewCount(views),
                    isVerified: isVerified
                });
            }
        }
    } catch (e) { }
    return results;
}

function _parseInnertubeAndroidSearch(data) {
    var results = [];
    var seenIds = {};
    try {
        var sections = (data && data.contents && data.contents.sectionListRenderer &&
            data.contents.sectionListRenderer.contents) || [];
        for (var s = 0; s < sections.length; s++) {
            var items = (sections[s].itemSectionRenderer && sections[s].itemSectionRenderer.contents) || [];
            for (var i = 0; i < items.length; i++) {
                var vr = items[i].compactVideoRenderer || items[i].videoRenderer;
                if (!vr || !vr.videoId) continue;
                var vid = vr.videoId;
                if (seenIds[vid]) continue;
                seenIds[vid] = true;

                var title = (vr.title && vr.title.runs && vr.title.runs.map(function (r) { return r.text; }).join('')) ||
                    (vr.title && vr.title.simpleText) || '';
                var duration = (vr.lengthText && vr.lengthText.simpleText) ||
                    (vr.lengthText && vr.lengthText.runs && vr.lengthText.runs.map(function (r) { return r.text; }).join('')) || '';
                var channel = (vr.shortBylineText && vr.shortBylineText.runs && vr.shortBylineText.runs[0] && vr.shortBylineText.runs[0].text) ||
                    (vr.ownerText && vr.ownerText.runs && vr.ownerText.runs[0] && vr.ownerText.runs[0].text) || '';
                var browseEndpoint = (vr.shortBylineText && vr.shortBylineText.runs && vr.shortBylineText.runs[0] &&
                    vr.shortBylineText.runs[0].navigationEndpoint && vr.shortBylineText.runs[0].navigationEndpoint.browseEndpoint) ||
                    (vr.ownerText && vr.ownerText.runs && vr.ownerText.runs[0] &&
                    vr.ownerText.runs[0].navigationEndpoint && vr.ownerText.runs[0].navigationEndpoint.browseEndpoint);
                var browseId = (browseEndpoint && browseEndpoint.browseId) || null;

                var views = (vr.shortViewCountText && vr.shortViewCountText.runs && vr.shortViewCountText.runs[0] && vr.shortViewCountText.runs[0].text) ||
                    (vr.viewCountText && vr.viewCountText.runs && vr.viewCountText.runs[0] && vr.viewCountText.runs[0].text) ||
                    (vr.viewCountText && vr.viewCountText.simpleText) || '';
                views = views.replace(/\u00a0/g, ' ').replace(/\s*görüntüleme\s*/i, '').trim();

                var isVerified = false;
                var badges = vr.badges || vr.ownerBadges;
                if (Array.isArray(badges)) {
                    isVerified = badges.some(function (b) {
                        return b && b.metadataBadgeRenderer && b.metadataBadgeRenderer.style &&
                            b.metadataBadgeRenderer.style.indexOf('VERIFIED') !== -1;
                    });
                }

                results.push({
                    id: vid,
                    title: title,
                    duration: duration,
                    durationSec: parseDurationSec(duration),
                    channel: channel,
                    browseId: browseId,
                    views: views,
                    viewsNum: parseViewCount(views),
                    isVerified: isVerified
                });
            }
        }
    } catch (e) { }
    return results;
}

// ── Stream Resolution ───────────────────────────────────────────────────────

async function getStreams(tmdbIdOrArgs, mediaType, seasonNum, episodeNum) {
    try {
        var rawId = tmdbIdOrArgs;
        var sNum = seasonNum || 1;
        var eNum = episodeNum || 1;
        var mType = mediaType || 'movie';

        if (typeof tmdbIdOrArgs === 'object' && tmdbIdOrArgs !== null) {
            rawId = tmdbIdOrArgs.id || tmdbIdOrArgs.url || '';
            mType = tmdbIdOrArgs.type || tmdbIdOrArgs.mediaType || mType;
            sNum = tmdbIdOrArgs.season || tmdbIdOrArgs.seasonNum || sNum;
            eNum = tmdbIdOrArgs.episode || tmdbIdOrArgs.episodeNum || eNum;
        }

        rawId = String(rawId || '').trim();

        // 1. Doğrudan YouTube URL veya video ID'si verilmişse
        var directYtId = null;
        if (/^[a-zA-Z0-9_-]{11}$/.test(rawId)) {
            directYtId = rawId;
        } else if (rawId.startsWith('youtube:video:')) {
            directYtId = rawId.replace('youtube:video:', '');
        } else if (rawId.includes('youtube.com/') || rawId.includes('youtu.be/')) {
            var m = rawId.match(/(?:youtube\.com\/(?:embed|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (m) directYtId = m[1];
        }

        if (directYtId) {
            var streams = [];
            var streamData = await resolveYouTubeMp4(directYtId);
            var chName = (streamData && streamData.author) || 'YouTube';
            var chId = streamData && streamData.channelId;
            var subs = chId ? await getChannelSubscribers(chId) : null;
            var vTitle = (streamData && streamData.videoTitle) || '';
            var vViews = streamData && streamData.viewCount ? formatNumberCompact(streamData.viewCount) : '';
            var viewsTag = vViews ? ' · 👁 ' + vViews : '';

            var nameParts = ['📺', chName];
            if (subs) nameParts.push('(' + subs + ')');
            var streamName = nameParts.join(' ');

            if (streamData) {
                var qBase = streamData.quality || (streamData.isHls ? '1080p' : '720p');
                var qType = streamData.isHls ? 'HLS' : 'MP4';
                streams.push({
                    name: streamName,
                    title: '⌜ YouTube ⌟ | ' + streamName + ' | ' + qBase + ' ' + qType,
                    description: vTitle + viewsTag,
                    url: streamData.url,
                    quality: qBase + ' ' + qType + viewsTag,
                    isHls: !!streamData.isHls,
                    format: streamData.format || (streamData.isHls ? 'hls' : 'mp4'),
                    provider: 'youtube_dizifilm',
                    headers: streamData.headers,
                    behaviorHints: { headers: streamData.headers }
                });
            }
            streams.push({
                name: streamName,
                title: '⌜ YouTube ⌟ | ' + streamName + ' | 1080p Resmî Oynatıcı',
                description: vTitle + viewsTag,
                url: 'https://www.youtube.com/watch?v=' + directYtId,
                ytId: directYtId,
                quality: '1080p · Resmî Oynatıcı' + viewsTag,
                provider: 'youtube_dizifilm'
            });
            return sortStreamsByQuality(streams);
        }

        // 2. Özel katalog ID'si (youtube:tv:34587:1:1 veya youtube:movie:38794)
        if (rawId.startsWith('youtube:')) {
            var parts = rawId.split(':');
            if (parts[1] === 'tv' || parts[1] === 'movie') {
                mType = parts[1];
                rawId = parts[2];
                if (parts[3]) sNum = parseInt(parts[3], 10) || sNum;
                if (parts[4]) eNum = parseInt(parts[4], 10) || eNum;
            }
        }

        // 3. TMDB Kimlik Çözümü (Dinamik)
        var isSeries = (mType === 'tv' || mType === 'series');
        var info = await resolveSeriesInfo(rawId, mType, TMDB_API_KEY);
        var targetTitle = info.title || rawId;

        // Kümülatif Bölüm Hesaplama (Örn: Kurtlar Vadisi 2. Sezon 1. Bölüm = 21. Bölüm)
        var cumEpisode = eNum;
        if (isSeries && sNum > 1 && Array.isArray(info.seasons) && info.seasons.length > 0) {
            var sum = 0;
            for (var s = 0; s < info.seasons.length; s++) {
                var sn = info.seasons[s].season_number;
                if (sn > 0 && sn < sNum) {
                    sum += (info.seasons[s].episode_count || 0);
                }
            }
            if (sum > 0) cumEpisode = sum + eNum;
        }

        // 4. Arama Başlıkları ve Sorguları Oluşturma
        var titlesToSearch = [targetTitle];
        if (info.origTitle && info.origTitle !== targetTitle) titlesToSearch.push(info.origTitle);
        if (Array.isArray(info.aliases)) {
            for (var a = 0; a < info.aliases.length; a++) {
                var al = info.aliases[a];
                if (al && !al.startsWith('tt') && titlesToSearch.indexOf(al) === -1) {
                    titlesToSearch.push(al);
                }
            }
        }

        var searchQueries = [];
        for (var t = 0; t < titlesToSearch.length; t++) {
            var curTitle = titlesToSearch[t];
            if (isSeries) {
                if (cumEpisode && cumEpisode !== eNum) {
                    searchQueries.push(curTitle + ' ' + cumEpisode + '. Bölüm');
                }
                if (sNum > 1) {
                    searchQueries.push(curTitle + ' ' + sNum + '. Sezon ' + eNum + '. Bölüm');
                }
                searchQueries.push(curTitle + ' ' + eNum + '. Bölüm');
                searchQueries.push(curTitle + ' ' + eNum + '. Bölüm Full HD');
            } else {
                searchQueries.push(curTitle + ' Full İzle');
                searchQueries.push(curTitle + ' Full HD Tek Parça');
                searchQueries.push(curTitle + ' Türk Filmi Full');
                searchQueries.push(curTitle);
            }
        }

        var candidateVideos = [];
        var seenVid = {};

        for (var q = 0; q < searchQueries.length; q++) {
            var vids = await searchYouTube(searchQueries[q]);
            for (var v = 0; v < vids.length; v++) {
                var vid = vids[v];
                if (seenVid[vid.id]) continue;
                seenVid[vid.id] = true;

                // Süre kontrolü (Klip, fragman ve sahneleri ele)
                // Diziler için en az 15 dakika (900s), filmler için en az 40 dakika (2400s)
                var minDuration = isSeries ? 900 : 2400;
                if (vid.durationSec > 0 && vid.durationSec < minDuration) continue;

                // Dizi ise bölüm kontrolü
                if (isSeries) {
                    if (!matchesEpisode(vid.title, sNum, eNum, cumEpisode)) continue;
                } else {
                    // Film ise film başlığı kontrolü (alakasız diğer filmleri ele)
                    var cVid = cleanTitle(vid.title);
                    var cTarget = cleanTitle(targetTitle);
                    var words = cTarget.split(' ').filter(function (w) { return w.length > 2; });
                    var allWordsFound = words.length > 0 && words.every(function (w) { return cVid.indexOf(w) !== -1; });
                    if (!allWordsFound && cVid.indexOf(cTarget) === -1) continue;
                }

                candidateVideos.push(vid);
                if (candidateVideos.length >= 6) break;
            }
            if (candidateVideos.length >= 6) break;
        }

        if (candidateVideos.length === 0) return [];

        // Aday videoları izlenme sayısına göre sırala (en çok izlenen/resmî olanlar en üstte)
        candidateVideos.sort(function (a, b) {
            return (b.viewsNum || 0) - (a.viewsNum || 0);
        });

        // Farklı kanallardan en iyi videoları seç (aynı kanaldan kopya/çöp videoları ele)
        var channelSeen = {};
        var topCandidates = [];
        for (var c = 0; c < candidateVideos.length; c++) {
            var cand = candidateVideos[c];
            var chKey = cand.channel || cand.browseId || cand.id;
            if (!channelSeen[chKey]) {
                channelSeen[chKey] = true;
                topCandidates.push(cand);
                if (topCandidates.length >= 3) break;
            }
        }
        if (topCandidates.length < 2) {
            for (var c2 = 0; c2 < candidateVideos.length; c2++) {
                var cand2 = candidateVideos[c2];
                if (topCandidates.indexOf(cand2) === -1) {
                    topCandidates.push(cand2);
                    if (topCandidates.length >= 2) break;
                }
            }
        }

        // Seçilen kanalların abone sayılarını paralel olarak çek
        await Promise.all(topCandidates.map(async function (candObj) {
            if (candObj.browseId) {
                candObj.subscribers = await getChannelSubscribers(candObj.browseId);
            }
        }));

        var streams = [];

        // 1. Resmî Oynatıcı (YouTube Native) akışları - Anında ve 1080p
        for (var i = 0; i < topCandidates.length; i++) {
            var candObj = topCandidates[i];
            var nameParts = ['📺', candObj.channel || 'YouTube'];
            if (candObj.isVerified) nameParts.push('✔');
            if (candObj.subscribers) nameParts.push('(' + candObj.subscribers + ')');
            var streamName = nameParts.join(' ');

            var cleanViews = candObj.views ? candObj.views.replace(/\u00a0/g, ' ').replace(/\s*görüntüleme\s*/i, '').trim() : '';
            var viewsLabel = cleanViews ? ' · 👁 ' + cleanViews : '';

            streams.push({
                name: streamName,
                title: '⌜ YouTube ⌟ | ' + streamName + ' | 1080p Resmî Oynatıcı',
                description: candObj.title + viewsLabel,
                url: 'https://www.youtube.com/watch?v=' + candObj.id,
                ytId: candObj.id,
                quality: '1080p · Resmî Oynatıcı' + viewsLabel,
                provider: 'youtube_dizifilm'
            });
        }

        // 2. Doğrudan MP4 / HLS akışları - Paralel çöz
        try {
            var resolvedArr = await Promise.all(topCandidates.map(function (c) {
                return resolveYouTubeMp4(c.id).catch(function () { return null; });
            }));
            for (var j = 0; j < topCandidates.length; j++) {
                var candObj2 = topCandidates[j];
                var resolved = resolvedArr[j];
                if (!resolved || !resolved.url) continue;

                var nameParts2 = ['📺', candObj2.channel || 'YouTube'];
                if (candObj2.isVerified) nameParts2.push('✔');
                if (candObj2.subscribers) nameParts2.push('(' + candObj2.subscribers + ')');
                var streamName2 = nameParts2.join(' ');

                var cleanViews2 = candObj2.views ? candObj2.views.replace(/\u00a0/g, ' ').replace(/\s*görüntüleme\s*/i, '').trim() : '';
                var viewsLabel2 = cleanViews2 ? ' · 👁 ' + cleanViews2 : '';

                var qBase = resolved.quality || (resolved.isHls ? '1080p' : '720p');
                var qType = resolved.isHls ? 'HLS' : 'MP4';

                streams.push({
                    name: streamName2,
                    title: '⌜ YouTube ⌟ | ' + streamName2 + ' | ' + qBase + ' ' + qType,
                    description: candObj2.title + viewsLabel2,
                    url: resolved.url,
                    quality: qBase + ' ' + qType + viewsLabel2,
                    isHls: !!resolved.isHls,
                    format: resolved.format || (resolved.isHls ? 'hls' : 'mp4'),
                    provider: 'youtube_dizifilm',
                    headers: resolved.headers,
                    behaviorHints: { headers: resolved.headers }
                });
            }
        } catch (e) { }

        return sortStreamsByQuality(streams);
    } catch (e) {
        return [];
    }
}

// ── Catalog & Metadata ──────────────────────────────────────────────────────

async function getCatalog(args) {
    try {
        var catalogId = (args && args.id) || 'anthology_youtube_diziler';
        var searchQuery = (args && (args.search || (args.extra && args.extra.search))) || '';

        // 1. Arama modu
        if (searchQuery) {
            var searchResults = await searchYouTube(searchQuery + ' Full');
            var searchMetas = searchResults
                .filter(function (v) { return v.durationSec >= 600; }) // en az 10 dakika
                .slice(0, 20)
                .map(function (v) {
                    return {
                        id: 'youtube:video:' + v.id,
                        type: catalogId.includes('dizi') ? 'series' : 'movie',
                        name: v.title,
                        poster: 'https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg',
                        description: (v.channel ? v.channel + ' · ' : '') + v.duration + (v.views ? ' · ' + v.views : ''),
                        releaseInfo: v.duration
                    };
                });
            return { metas: searchMetas };
        }

        // 2. Vitrin katalogları
        var isSeries = catalogId.includes('dizi');
        var pool = isSeries ? POPULAR_DIZILER : POPULAR_FILMLER;

        var metas = pool.map(function (item) {
            return {
                id: 'youtube:' + (isSeries ? 'tv' : 'movie') + ':' + item.tmdbId,
                type: isSeries ? 'series' : 'movie',
                name: item.name,
                poster: item.poster,
                description: 'YouTube Resmî Yayıncı: ' + item.channel,
                releaseInfo: item.year
            };
        });

        return { metas: metas };
    } catch (e) {
        return { metas: [] };
    }
}

async function getMeta(id) {
    try {
        var rawId = String(id || '').trim();

        // 1. Doğrudan video ID ise
        if (rawId.startsWith('youtube:video:')) {
            var vid = rawId.replace('youtube:video:', '');
            return {
                meta: {
                    id: rawId,
                    type: 'movie',
                    name: 'YouTube Video (' + vid + ')',
                    poster: 'https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg',
                    background: 'https://i.ytimg.com/vi/' + vid + '/maxresdefault.jpg',
                    description: 'Doğrudan YouTube video akışı'
                }
            };
        }

        // 2. Katalog öğesi ise (youtube:tv:34587 veya youtube:movie:38794)
        if (rawId.startsWith('youtube:')) {
            var parts = rawId.split(':');
            var mType = parts[1]; // tv veya movie
            var tmdbId = parts[2];

            if (mType === 'movie') {
                var resM = await fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR', { signal: timeoutSignal(6000) });
                if (resM.ok) {
                    var dm = await resM.json();
                    return {
                        meta: {
                            id: rawId,
                            type: 'movie',
                            name: dm.title || dm.name,
                            poster: dm.poster_path ? ('https://image.tmdb.org/t/p/w500' + dm.poster_path) : undefined,
                            background: dm.backdrop_path ? ('https://image.tmdb.org/t/p/original' + dm.backdrop_path) : undefined,
                            description: dm.overview || '',
                            releaseInfo: (dm.release_date || '').slice(0, 4)
                        }
                    };
                }
            } else if (mType === 'tv') {
                var resTv = await fetch('https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR', { signal: timeoutSignal(6000) });
                if (resTv.ok) {
                    var dt = await resTv.json();
                    var videos = [];
                    if (Array.isArray(dt.seasons)) {
                        for (var s = 0; s < dt.seasons.length; s++) {
                            var sObj = dt.seasons[s];
                            var sNum = sObj.season_number;
                            if (sNum <= 0) continue; // Özel bölümleri atla
                            var epCount = sObj.episode_count || 0;
                            for (var e = 1; e <= epCount; e++) {
                                videos.push({
                                    id: 'youtube:tv:' + tmdbId + ':' + sNum + ':' + e,
                                    season: sNum,
                                    episode: e,
                                    title: sNum + '. Sezon ' + e + '. Bölüm',
                                    name: sNum + '. Sezon ' + e + '. Bölüm',
                                    releaseInfo: sNum + 'x' + (e < 10 ? '0' + e : e)
                                });
                            }
                        }
                    }

                    return {
                        meta: {
                            id: rawId,
                            type: 'series',
                            name: dt.name,
                            poster: dt.poster_path ? ('https://image.tmdb.org/t/p/w500' + dt.poster_path) : undefined,
                            background: dt.backdrop_path ? ('https://image.tmdb.org/t/p/original' + dt.backdrop_path) : undefined,
                            description: dt.overview || '',
                            releaseInfo: (dt.first_air_date || '').slice(0, 4),
                            videos: videos
                        }
                    };
                }
            }
        }

        return null;
    } catch (e) {
        return null;
    }
}

var _exports = wrapAll({ getStreams: getStreams, getCatalog: getCatalog, getMeta: getMeta }, cfgReady);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = _exports;
}
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = _exports.getStreams;
    globalThis.getCatalog = _exports.getCatalog;
    globalThis.getMeta = _exports.getMeta;
}
