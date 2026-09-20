const { sortStreamsByQuality } = require("../shared/quality.js");
const { loadConfig, val, wrapAll } = require("../shared/config.js");
const { timeoutSignal } = require("../shared/http.js");
const { normalizeSeriesId, resolveSeriesInfo, seriesSearchTitles, asciiFold } = require("../shared/turkish_series.js");

var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function () {
      var v = val('urls.anime.animom.base');
      if (v) BASE_URL = String(v).replace(/\/+$/, '');
      if (v) HDPLAYER_HOST = "https://hdplayersystem.com";
      if (HEADERS) HEADERS.Referer = BASE_URL + '/';
    });
  }
  return _cfgReady;
}

/**
 * Anthology - AniMOM Provider
 * Anime serileri için HDPlayer (HLS), Sibnet ve YourUpload doğrudan akışları sağlar.
 */

var BASE_URL = "https://animom.org";
var HDPLAYER_HOST = "https://hdplayersystem.com";
var SITE_NAME = "AniMOM";

var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8"
};

var AJAX_HEADERS = {
  "User-Agent": HEADERS["User-Agent"],
  "Referer": BASE_URL + "/",
  "X-Requested-With": "XMLHttpRequest",
  "Accept": "application/json, text/javascript, */*; q=0.01"
};

function ultraClean(str) {
  if (!str) return "";
  return asciiFold(str).replace(/[^a-z0-9]+/g, "").trim();
}

function decodeHtmlEntities(str) {
  if (!str) return "";
  return str.toString()
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;/g, "-")
    .replace(/&#8217;/g, "'")
    .replace(/&#(\d+);/g, function (m, d) { return String.fromCharCode(parseInt(d, 10)); })
    .trim();
}

function buildStream(name, title, url, quality, format, isHls, ref) {
  var sHeaders = { "User-Agent": HEADERS["User-Agent"], "Referer": ref };
  return {
    name: name,
    title: title,
    url: url,
    quality: quality,
    format: format,
    isHls: isHls,
    headers: sHeaders,
    behaviorHints: {
      notWebReady: false,
      proxyHeaders: { request: sHeaders }
    }
  };
}

/**
 * AniMOM arama: POST /search -> { success, theme (HTML) }
 */
async function animomSearch(query) {
  try {
    var res = await fetch(BASE_URL + "/search", {
      method: "POST",
      headers: Object.assign({}, AJAX_HEADERS, { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" }),
      body: "query=" + encodeURIComponent(query),
      signal: timeoutSignal(9000)
    });
    if (!res.ok) return [];
    var data = await res.json();
    if (!data || !data.success || !data.theme) return [];
    return parseSearchHtml(data.theme);
  } catch (e) { return []; }
}

function parseSearchHtml(html) {
  var out = [];
  var blocks = html.match(/<li class="w-1\/2">[\s\S]*?<\/li>/g) || [];
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    var a = b.match(/href="([^"]*\/anime\/[^"]+)"/);
    var img = b.match(/data-src="([^"]+)"/);
    var alt = b.match(/alt="([^"]*)"/);
    if (!a) continue;
    var slug = a[1].split("/").pop();
    var name = (alt && alt[1]) || slug;
    out.push({
      slug: slug,
      url: a[1],
      name: decodeHtmlEntities(name),
      poster: (img && img[1]) || ""
    });
  }
  return out;
}

/**
 * Anime sayfasındaki tüm bölüm linklerini (sezon-{s}/bolum-{e} ve düz -{e}-bolum biçiminde) toplar.
 */
function parseEpisodeLinks(html, slug) {
  var out = [];
  var seen = {};
  var hrefs = html.match(/href="https:\/\/animom\.org\/anime\/[^"]+"/g) || [];
  for (var i = 0; i < hrefs.length; i++) {
    var url = hrefs[i].replace(/^href="/, "").replace(/"$/, "");
    var m = url.match(/\/sezon-(\d+)\/bolum-(\d+)/);
    var s = 1, e = 0;
    if (m) {
      s = parseInt(m[1], 10);
      e = parseInt(m[2], 10);
    } else {
      var m2 = url.match(/anime\/[^\/]*?-(\d+)-bolum/);
      if (!m2) continue;
      e = parseInt(m2[1], 10);
      if (isNaN(e)) continue;
      s = 1;
    }
    if (isNaN(e) || e < 1) continue;
    var key = s + ":" + e;
    if (seen[key]) continue;
    seen[key] = true;
    out.push({ season: s, episode: e, url: url });
  }
  out.sort(function (aa, bb) { return (aa.season - bb.season) || (aa.episode - bb.episode); });
  return out;
}

/**
 * HDPlayer çözücü: POST /player/index.php?data={hash}&do=getVideo -> securedLink HLS
 */
async function resolveHdPlayer(hash) {
  try {
    var res = await fetch(HDPLAYER_HOST + "/player/index.php?data=" + hash + "&do=getVideo", {
      method: "POST",
      headers: Object.assign({}, AJAX_HEADERS, {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Referer": HDPLAYER_HOST + "/video/" + hash,
        "Origin": HDPLAYER_HOST
      }),
      body: "hash=" + hash + "&r=" + encodeURIComponent(BASE_URL + "/"),
      signal: timeoutSignal(9000)
    });
    if (!res.ok) return [];
    var data;
    try { data = await res.json(); } catch (e) { return []; }
    if (!data || !data.securedLink) return [];
    var quality = await probeHlsHeight(data.securedLink);
    if (!quality) quality = "720p";
    var ref = HDPLAYER_HOST + "/";
    return [buildStream(SITE_NAME, "⌜ " + SITE_NAME + " ⌟ | HDPlayer [" + quality + " HLS]", data.securedLink, quality, "hls", true, ref)];
  } catch (e) { return []; }
}

async function probeHlsHeight(url) {
  try {
    var r = await fetch(url, { headers: { "User-Agent": HEADERS["User-Agent"], "Referer": HDPLAYER_HOST + "/" }, signal: timeoutSignal(6000) });
    if (!r.ok) return null;
    var txt = await r.text();
    var m = txt.match(/RESOLUTION=\d+x(\d+)/g);
    if (m) {
      var max = 0;
      for (var i = 0; i < m.length; i++) {
        var h = parseInt(m[i].match(/x(\d+)/)[1], 10);
        if (h > max) max = h;
      }
      if (max) return max + "p";
    }
    return null;
  } catch (e) { return null; }
}

async function resolveSibnet(frameUrl) {
  try {
    var fullUrl = frameUrl.indexOf("//") === 0 ? "https:" + frameUrl : frameUrl;
    var res = await fetch(fullUrl, { headers: { "User-Agent": HEADERS["User-Agent"], "Referer": BASE_URL + "/" }, signal: timeoutSignal(8000) });
    if (!res.ok) return [];
    var html = await res.text();
    var m = html.match(/player\.src\(\[\{src:\s*["']?([^"'\s>]+)/i);
    if (!m) return [];
    var videoPath = m[1];
    var videoUrl = videoPath.indexOf("http") === 0 ? videoPath : ("https://video.sibnet.ru" + videoPath);
    return [buildStream(SITE_NAME, "⌜ " + SITE_NAME + " ⌟ | Sibnet [Direct MP4]", videoUrl, "720p", "mp4", false, "https://video.sibnet.ru/")];
  } catch (e) { return []; }
}

async function resolveYourUpload(embedId) {
  try {
    var videoUrl = "http://www.vidcache.net:8161/" + embedId + ".mp4";
    return [buildStream(SITE_NAME, "⌜ " + SITE_NAME + " ⌟ | YourUpload [Direct MP4]", videoUrl, "720p", "mp4", false, BASE_URL + "/")];
  } catch (e) { return []; }
}

function extractFrames(html) {
  var out = [];
  var seen = {};
  var df = html.match(/data-frame="([^"]+)"/g) || [];
  for (var i = 0; i < df.length; i++) {
    var u = df[i].replace(/^data-frame="/, "").replace(/"$/, "");
    if (!seen[u]) { seen[u] = true; out.push(u); }
  }
  var ifr = html.match(/<iframe[^>]+src="([^"]+)"/g) || [];
  for (var k = 0; k < ifr.length; k++) {
    var u2 = ifr[k].match(/src="([^"]+)"/);
    if (!u2) continue;
    u2 = u2[1];
    if (!u2 || u2.indexOf("http") !== 0) continue;
    if (!seen[u2]) { seen[u2] = true; out.push(u2); }
  }
  return out;
}

async function resolveEpisodeStreams(epUrl) {
  try {
    var res = await fetch(epUrl, { headers: HEADERS, signal: timeoutSignal(10000) });
    if (!res.ok) return [];
    var html = await res.text();
    var frames = extractFrames(html);
    var results = [];
    for (var i = 0; i < frames.length; i++) {
      var url = frames[i];
      var mm = url.match(/hdplayersystem\.com\/(?:video|player\/index\.php\?data=)\/([a-f0-9]+)/i);
      var mh = url.match(/player\/index\.php\?data=([a-f0-9]+)/i);
      if (mm || mh) {
        var hash = (mm && mm[1]) || (mh && mh[1]);
        var hs = await resolveHdPlayer(hash);
        for (var a = 0; a < hs.length; a++) results.push(hs[a]);
      } else if (url.indexOf("video.sibnet.ru") !== -1) {
        var sib = await resolveSibnet(url);
        for (var b = 0; b < sib.length; b++) results.push(sib[b]);
      } else if (url.indexOf("yourupload.com/embed/") !== -1) {
        var yId = url.match(/embed\/([^\/?#]+)/);
        if (yId) {
          var yup = await resolveYourUpload(yId[1]);
          for (var c = 0; c < yup.length; c++) results.push(yup[c]);
        }
      }
    }
    return results;
  } catch (e) { return []; }
}

async function fetchAnimePage(slug) {
  try {
    var res = await fetch(BASE_URL + "/anime/" + slug, { headers: HEADERS, signal: timeoutSignal(10000) });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) { return null; }
}

function pickPoster(html) {
  var m = html.match(/"image":\s*"([^"]+)"/);
  if (m) return m[1];
  var og = html.match(/property="og:image" content="([^"]+)"/);
  if (og) return og[1];
  return "";
}

function pickTitle(html) {
  var og = html.match(/property="og:title" content="([^"]+)"/);
  if (og) return decodeHtmlEntities(og[1]).replace(/\s*-\s*.*$/i, "").trim();
  var t = html.match(/<title>([^<]+)<\/title>/);
  if (t) return decodeHtmlEntities(t[1]).replace(/\s*-\s*.*$/i, "").trim();
  return "";
}

/**
 * TMDB/IMDb kimliğini rollere göre en iyi site eşleşmesine çevirir.
 */
async function resolveMatch(show) {
  var titles = seriesSearchTitles(show);
  var best = null;
  var bestScore = 0;
  for (var i = 0; i < titles.length && bestScore < 1; i++) {
    var results = await animomSearch(titles[i]);
    for (var j = 0; j < results.length; j++) {
      var sc = scoreMatch(results[j].name, show);
      if (sc > bestScore) { bestScore = sc; best = results[j]; }
    }
  }
  if (best && bestScore >= 0.5) return best;
  return null;
}

function tokensMatch(a, b) {
  var ta = ultraClean(a).split(" ").filter(function (x) { return x.length > 1; });
  var tb = ultraClean(b).split(" ").filter(function (x) { return x.length > 1; });
  if (!ta.length || !tb.length) return 0;
  var hits = 0;
  for (var i = 0; i < ta.length; i++) {
    for (var j = 0; j < tb.length; j++) {
      if (ta[i] === tb[j]) { hits++; break; }
    }
  }
  return hits / Math.max(ta.length, tb.length);
}

function scoreMatch(name, show) {
  var candidates = [show.title, show.origTitle].concat(show.aliases || []);
  var nameClean = ultraClean(name);
  for (var i = 0; i < candidates.length; i++) {
    if (!candidates[i]) continue;
    if (nameClean === ultraClean(candidates[i])) return 1;
  }
  var best = 0;
  for (var k = 0; k < candidates.length; k++) {
    if (!candidates[k]) continue;
    var t = tokensMatch(name, candidates[k]);
    if (t > best) best = t;
  }
  return best;
}

async function getStreams(tmdbId, mediaType, season, episode) {
  var out = [];
  try {
    var id = tmdbId;
    var finalSeason = season || 0;
    var finalEpisode = episode || 0;
    if (typeof tmdbId === "object" && tmdbId !== null) {
      id = tmdbId.id || "";
      mediaType = mediaType || tmdbId.type || "series";
      finalSeason = tmdbId.season || 0;
      finalEpisode = tmdbId.episode || 0;
    } else if (typeof tmdbId === "string" && tmdbId.indexOf(":") !== -1) {
      if (tmdbId.indexOf("animom:show:") === 0) {
        id = tmdbId.replace("animom:show:", "");
      } else if (tmdbId.indexOf("animom:ep:") === 0) {
        var epParts = tmdbId.replace("animom:ep:", "").split(":");
        id = epParts[0];
        if (epParts[1]) finalSeason = parseInt(epParts[1], 10) || 0;
        if (epParts[2]) finalEpisode = parseInt(epParts[2], 10) || 0;
      } else {
        var parts = tmdbId.split(":");
        var s = parseInt(parts[parts.length - 2], 10);
        var e = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(s) && !isNaN(e)) { finalSeason = s; finalEpisode = e; }
        id = parts[0];
      }
    }

    var slug = "";
    if (typeof id === "string" && id.indexOf("/") === -1 && id.indexOf(".") === -1 && /^(?!tt\d+$|\d+$)[a-z0-9-]+$/i.test(id) && (tmdbId && (String(tmdbId).indexOf("animom:") === 0))) {
      slug = id;
    }

    if (!slug) {
      var show = await resolveSeriesInfo(id, mediaType || "series");
      if (!show || !show.title) return out;
      var match = await resolveMatch(show);
      if (!match) return out;
      slug = match.slug;
    }

    var pageHtml = await fetchAnimePage(slug);
    if (pageHtml) {
      var episodes = parseEpisodeLinks(pageHtml, slug);
      var ep = null;
      for (var i = 0; i < episodes.length; i++) {
        var okS = (episodes[i].season === finalSeason) || (finalSeason <= 1 && episodes[i].season === 1) || (finalSeason <= 0 && episodes[i].season === 1);
        if (okS && episodes[i].episode === finalEpisode) { ep = episodes[i]; break; }
      }
      if (ep) {
        out = await resolveEpisodeStreams(ep.url);
        return out;
      }
      if (finalSeason > 0 && finalEpisode > 0 && episodes.length > 0 && episodes[0].url.indexOf("/sezon-") !== -1) {
        var guess = BASE_URL + "/anime/" + slug + "/sezon-" + finalSeason + "/bolum-" + finalEpisode;
        out = await resolveEpisodeStreams(guess);
        return out;
      }
    }
    return out;
  } catch (e) {
    return out;
  }
}

async function getMeta(id) {
  try {
    var slug = "";
    if (typeof id === "string" && id.indexOf("animom:show:") === 0) {
      slug = id.replace("animom:show:", "");
    }
    if (!slug) {
      var show = await resolveSeriesInfo(id, "series");
      if (!show || !show.title) return null;
      var match = await resolveMatch(show);
      if (!match) return null;
      slug = match.slug;
    }
    var html = await fetchAnimePage(slug);
    if (!html) return null;
    var episodes = parseEpisodeLinks(html, slug);
    var videos = [];
    for (var i = 0; i < episodes.length; i++) {
      videos.push({
        id: "animom:ep:" + slug + ":" + episodes[i].season + ":" + episodes[i].episode,
        name: episodes[i].season + ". Sezon " + episodes[i].episode + ". Bölüm",
        season: episodes[i].season,
        number: episodes[i].episode,
        title: episodes[i].season + ". Sezon " + episodes[i].episode + ". Bölüm"
      });
    }
    return {
      meta: {
        id: "animom:show:" + slug,
        type: "series",
        name: pickTitle(html) || slug,
        poster: pickPoster(html),
        videos: videos
      }
    };
  } catch (e) {
    return null;
  }
}

async function getCatalog(args) {
  try {
    var metas = [];
    if (args && args.search) {
      var results = await animomSearch(args.search);
      for (var i = 0; i < results.length; i++) {
        metas.push({
          id: "animom:show:" + results[i].slug,
          type: "series",
          name: results[i].name,
          poster: results[i].poster
        });
      }
      return { metas: metas };
    }

    var res = await fetch(BASE_URL + "/home", { headers: HEADERS, signal: timeoutSignal(10000) });
    if (!res.ok) return { metas: [] };
    var html = await res.text();
    var re = /<a\s+class="block"\s+href="https:\/\/animom\.org\/anime\/([^"\?\/]+)"[^>]*>\s*<img[^>]*\sdata-src="([^"]+)"[^>]*alt="([^"]*)"/g;
    var m;
    var seen = {};
    while ((m = re.exec(html)) !== null) {
      var slug = m[1];
      if (seen[slug]) continue;
      seen[slug] = true;
      metas.push({
        id: "animom:show:" + slug,
        type: "series",
        name: decodeHtmlEntities(m[3]) || slug,
        poster: m[2]
      });
      if (metas.length >= 30) break;
    }
    return { metas: metas };
  } catch (e) {
    return { metas: [] };
  }
}

if (typeof getStreams === "function") {
  var _origGetStreams = getStreams;
  getStreams = async function () {
    var res = await _origGetStreams.apply(this, arguments);
    return sortStreamsByQuality(res);
  };
}

if (typeof module !== "undefined") module.exports = wrapAll({ getStreams, getCatalog, getMeta }, cfgReady);
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = getStreams;
  globalThis.getCatalog = getCatalog;
  globalThis.getMeta = getMeta;
}