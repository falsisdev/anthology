const { sortStreamsByQuality } = require("../shared/quality.js");
const { loadConfig, val, wrapAll } = require("../shared/config.js");
const { timeoutSignal } = require("../shared/http.js");
const { normalizeSeriesId, resolveSeriesInfo, seriesSearchTitles, asciiFold } = require("../shared/turkish_series.js");

var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function () {
      var v = val('urls.anime.animeprax.base');
      if (v) BASE_URL = String(v).replace(/\/+$/, '');
      if (HEADERS) HEADERS.Referer = BASE_URL + '/';
    });
  }
  return _cfgReady;
}

/**
 * Anthology - AnimePraX Provider
 * Anime serileri için Sibnet, OK.ru ve Dailymotion doğrudan akışları sağlar.
 */

var BASE_URL = "https://animeprax.com";
var SITE_NAME = "AnimePraX";

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
  "Accept": "application/json, text/plain, */*"
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

function absUrl(u) {
  if (!u) return "";
  if (u.indexOf("//") === 0) return "https:" + u;
  if (u.indexOf("http") === 0) return u;
  return BASE_URL + u;
}

async function animepraxSearch(query) {
  try {
    var res = await fetch(BASE_URL + "/api/search?q=" + encodeURIComponent(query), { headers: { "User-Agent": HEADERS["User-Agent"], "Accept": "application/json" }, signal: timeoutSignal(9000) });
    if (!res.ok) return [];
    var j;
    try { j = await res.json(); } catch (e) { return []; }
    if (!Array.isArray(j)) return [];
    var out = [];
    for (var i = 0; i < j.length; i++) {
      var it = j[i];
      out.push({
        slug: it.slug || "",
        name: decodeHtmlEntities(it.title || ""),
        poster: absUrl(it.cover_image_url || "")
      });
    }
    return out;
  } catch (e) { return []; }
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

async function resolveMatch(show) {
  var titles = seriesSearchTitles(show);
  var best = null;
  var bestScore = 0;
  for (var i = 0; i < titles.length && bestScore < 1; i++) {
    var results = await animepraxSearch(titles[i]);
    for (var j = 0; j < results.length; j++) {
      var sc = scoreMatch(results[j].name, show);
      if (sc > bestScore) { bestScore = sc; best = results[j]; }
    }
  }
  if (best && bestScore >= 0.5) return best;
  return null;
}

async function fetchHtml(url, headers, ms) {
  try {
    var res = await fetch(url, { headers: headers || HEADERS, signal: timeoutSignal(ms || 10000) });
    return { status: res.status, text: await res.text() };
  } catch (e) { return null; }
}

async function resolveSibnet(frameUrl) {
  try {
    var res = await fetch(frameUrl, { headers: { "User-Agent": HEADERS["User-Agent"], "Referer": BASE_URL + "/" }, signal: timeoutSignal(8000) });
    if (!res.ok) return [];
    var html = await res.text();
    var m = html.match(/player\.src\(\[\{src:\s*["']?([^"'\s>]+)/i);
    if (!m) return [];
    var videoPath = m[1];
    var videoUrl = videoPath.indexOf("http") === 0 ? videoPath : ("https://video.sibnet.ru" + videoPath);
    return [buildStream(SITE_NAME, "⌜ " + SITE_NAME + " ⌟ | Sibnet [Direct MP4]", videoUrl, "720p", "mp4", false, "https://video.sibnet.ru/")];
  } catch (e) { return []; }
}

async function resolveOkRu(frameUrl) {
  try {
    var res = await fetch(frameUrl, { headers: { "User-Agent": HEADERS["User-Agent"] }, signal: timeoutSignal(8000) });
    if (!res.ok) return [];
    var html = await res.text();
    var m = html.match(/data-options=["']([^"']+)["']/i);
    if (!m) return [];
    var opts;
    try { opts = JSON.parse(decodeHtmlEntities(m[1])); } catch (e) { return []; }
    var fv = opts.flashvars || {};
    var metadata = fv.metadata;
    if (typeof metadata === "string") { try { metadata = JSON.parse(metadata); } catch (e) { metadata = {}; } }
    if (!metadata || typeof metadata !== "object") metadata = {};
    var vids = metadata.videos || fv.videos || [];
    var streams = [];
    var nameMap = { "full": "1080p", "hd": "720p", "sd": "480p", "low": "360p", "lowest": "240p", "mobile": "240p" };
    for (var i = 0; i < vids.length; i++) {
      var v = vids[i];
      if (!v || !v.url) continue;
      var q = nameMap[v.name] || v.name || "720p";
      streams.push(buildStream(SITE_NAME, "⌜ " + SITE_NAME + " ⌟ | Ok.ru [" + q.toUpperCase() + " MP4]", v.url, q, "mp4", false, "https://ok.ru/"));
    }
    var hlsUrl = metadata.hlsManifestUrl || fv.hlsManifestUrl;
    if (hlsUrl) {
      streams.push(buildStream(SITE_NAME, "⌜ " + SITE_NAME + " ⌟ | Ok.ru [HLS]", hlsUrl, "720p", "hls", true, "https://ok.ru/"));
    }
    return streams;
  } catch (e) { return []; }
}

async function resolveDailymotion(frameUrl) {
  try {
    var m = frameUrl.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/i);
    if (!m) return [];
    var res = await fetch("https://api.dailymotion.com/video/" + m[1] + "?fields=stream_hls_url,width", { headers: { "User-Agent": HEADERS["User-Agent"] }, signal: timeoutSignal(8000) });
    if (!res.ok) return [];
    var j;
    try { j = await res.json(); } catch (e) { return []; }
    if (!j || !j.stream_hls_url) return [];
    return [buildStream(SITE_NAME, "⌜ " + SITE_NAME + " ⌟ | Dailymotion [HLS]", j.stream_hls_url, "720p", "hls", true, "https://www.dailymotion.com/")];
  } catch (e) { return []; }
}

async function resolveSource(src) {
  var provider = String(src.provider_name || "").toLowerCase();
  var embed = src.embed_url || "";
  if (!embed) return [];
  var url = absUrl(embed);
  if (provider.indexOf("sibnet") !== -1 || url.indexOf("sibnet.ru") !== -1) {
    return await resolveSibnet(url);
  }
  if (provider.indexOf("ok") !== -1 || url.indexOf("ok.ru") !== -1) {
    return await resolveOkRu(url.indexOf("https") === 0 ? url : ("https:" + (url.indexOf("//") === 0 ? url : url)));
  }
  if (provider.indexOf("dailymotion") !== -1 || url.indexOf("dailymotion.com") !== -1) {
    return await resolveDailymotion(url);
  }
  return [];
}

function parseTeams(html) {
  var out = [];
  var seen = {};
  var m = html.match(/data-team-id="(\d+)"\s*data-team-name="([^"]*)"/g) || [];
  for (var i = 0; i < m.length; i++) {
    var tm = m[i].match(/data-team-id="(\d+)"\s*data-team-name="([^"]*)"/);
    if (!tm || seen[tm[1]]) continue;
    seen[tm[1]] = true;
    out.push({ id: tm[1], name: tm[2] });
  }
  return out;
}

async function fetchTeamSources(slug, season, episode, teamId, epPageUrl) {
  try {
    var t = Date.now();
    var url = BASE_URL + "/anime/" + slug + "/season/" + season + "/episode/" + episode + "/sources?team=" + encodeURIComponent(teamId) + "&t=" + t;
    var headers = Object.assign({}, AJAX_HEADERS);
    headers.Referer = epPageUrl;
    headers.Accept = "application/json, text/plain, */*";
    var res = await fetch(url, { headers: headers, signal: timeoutSignal(9000) });
    if (!res.ok) return [];
    var j;
    try { j = await res.json(); } catch (e) { return []; }
    return (j && j.sources) || [];
  } catch (e) { return []; }
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
      if (tmdbId.indexOf("animeprax:show:") === 0) {
        id = tmdbId.replace("animeprax:show:", "");
      } else if (tmdbId.indexOf("animeprax:ep:") === 0) {
        var epParts = tmdbId.replace("animeprax:ep:", "").split(":");
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

    if (!finalEpisode && finalSeason < 1) finalEpisode = 1;
    if (!finalSeason) finalSeason = 1;

    var slug = "";
    if (typeof id === "string" && String(tmdbId).indexOf("animeprax:") === 0 && id.indexOf("/") === -1) {
      slug = id;
    }

    if (!slug) {
      var show = await resolveSeriesInfo(id, mediaType || "series");
      if (!show || !show.title) return out;
      var match = await resolveMatch(show);
      if (!match) return out;
      slug = match.slug;
    }

    var epPageUrl = BASE_URL + "/anime/" + slug + "/season/" + finalSeason + "/episode/" + finalEpisode;
    var page = await fetchHtml(epPageUrl, HEADERS, 10000);
    if (!page || page.status === 404) return out;

    var teams = parseTeams(page.text);
    for (var i = 0; i < teams.length && out.length < 8; i++) {
      var sources = await fetchTeamSources(slug, finalSeason, finalEpisode, teams[i].id, epPageUrl);
      for (var j = 0; j < sources.length && out.length < 8; j++) {
        var s = await resolveSource(sources[j]);
        for (var k = 0; k < s.length; k++) out.push(s[k]);
      }
    }
    return out;
  } catch (e) {
    return out;
  }
}

function parseSeasonsAndEpisodes(html) {
  var seasons = {};
  var tab = html.match(/season-tab[^>]*data-season="(\d+)"[^>]*>\s*Sezon\s*\d+\s*<span[^>]*>\((\d+)\)/g) || [];
  for (var i = 0; i < tab.length; i++) {
    var tm = tab[i].match(/data-season="(\d+)"[\s\S]*?\((\d+)\)/);
    if (tm) seasons[parseInt(tm[1], 10)] = parseInt(tm[2], 10) || 0;
  }
  var eps = {};
  var cards = html.match(/<a href="\/anime\/[^"]+\/season\/(\d+)\/episode\/(\d+)" class="episode-card">/g) || [];
  for (var k = 0; k < cards.length; k++) {
    var cm = cards[k].match(/season\/(\d+)\/episode\/(\d+)/);
    if (!cm) continue;
    var sN = parseInt(cm[1], 10);
    var eN = parseInt(cm[2], 10);
    if (!eps[sN]) eps[sN] = [];
    if (eps[sN].indexOf(eN) === -1) eps[sN].push(eN);
  }
  return { seasons: seasons, episodes: eps };
}

async function getMeta(id) {
  try {
    var slug = "";
    if (typeof id === "string" && id.indexOf("animeprax:show:") === 0) {
      slug = id.replace("animeprax:show:", "");
    }
    var poster = "";
    if (!slug) {
      var show = await resolveSeriesInfo(id, "series");
      if (!show || !show.title) return null;
      var match = await resolveMatch(show);
      if (!match) return null;
      slug = match.slug;
      poster = match.poster || "";
    }
    var page = await fetchHtml(BASE_URL + "/anime/" + slug, HEADERS, 10000);
    if (!page || page.status === 404) return null;
    var parsed = parseSeasonsAndEpisodes(page.text);
    var videos = [];
    var seasonKeys = Object.keys(parsed.episodes);
    seasonKeys.sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); });
    for (var i = 0; i < seasonKeys.length; i++) {
      var sN = parseInt(seasonKeys[i], 10);
      var list = parsed.episodes[sN];
      list.sort(function (a, b) { return a - b; });
      for (var j = 0; j < list.length; j++) {
        videos.push({
          id: "animeprax:ep:" + slug + ":" + sN + ":" + list[j],
          name: sN + ". Sezon " + list[j] + ". Bölüm",
          season: sN,
          number: list[j],
          title: sN + ". Sezon " + list[j] + ". Bölüm"
        });
      }
    }
    if (!poster) {
      var pm = page.text.match(/<meta property="og:image" content="([^"]+)"/);
      if (pm) poster = absUrl(pm[1]);
    }
    var name = slug;
    var nm = page.text.match(/"anime-title"[^>]*>([^<]+)</i);
    if (!nm) nm = page.text.match(/<meta property="og:title" content="([^"]+)"/);
    if (nm) name = decodeHtmlEntities((nm[1] || "").replace(/ -.*$/, "")).trim();
    return {
      meta: {
        id: "animeprax:show:" + slug,
        type: "series",
        name: name || slug,
        poster: poster,
        videos: videos
      }
    };
  } catch (e) {
    return null;
  }
}

async function getCatalog(args) {
  var metas = [];
  try {
    if (args && args.search) {
      var results = await animepraxSearch(args.search);
      for (var i = 0; i < results.length; i++) {
        if (!results[i].slug) continue;
        metas.push({
          id: "animeprax:show:" + results[i].slug,
          type: "series",
          name: results[i].name || results[i].slug,
          poster: results[i].poster
        });
      }
      return { metas: metas };
    }

    var page = await fetchHtml(BASE_URL + "/", HEADERS, 10000);
    if (page) {
      var seen = {};
      var re = /<article class="anime-card[^"]*">[\s\S]*?<a href="\/anime\/([a-z0-9-]+)"[\s\S]*?<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/g;
      var m;
      while ((m = re.exec(page.text)) !== null) {
        if (seen[m[1]]) continue;
        seen[m[1]] = true;
        metas.push({
          id: "animeprax:show:" + m[1],
          type: "series",
          name: decodeHtmlEntities(m[3]) || m[1],
          poster: absUrl(m[2])
        });
        if (metas.length >= 30) break;
      }
    }
    return { metas: metas };
  } catch (e) {
    return { metas: metas };
  }
}

var _origGetStreams = getStreams;
getStreams = async function () {
  var res = await _origGetStreams.apply(this, arguments);
  return sortStreamsByQuality(res);
};

if (typeof module !== "undefined") module.exports = wrapAll({ getStreams, getCatalog, getMeta }, cfgReady);
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = getStreams;
  globalThis.getCatalog = getCatalog;
  globalThis.getMeta = getMeta;
}