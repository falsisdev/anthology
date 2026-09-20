const { sortStreamsByQuality } = require("../shared/quality.js");
const { loadConfig, val, wrapAll } = require("../shared/config.js");
const { timeoutSignal } = require("../shared/http.js");
const { unpackDeanEdwards } = require("../shared/unpacker.js");
const { normalizeSeriesId, resolveSeriesInfo, seriesSearchTitles, asciiFold } = require("../shared/turkish_series.js");

var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function () {
      var v = val('urls.anime.anizm.base');
      if (v) BASE_URL = String(v).replace(/\/+$/, '');
      var p = val('urls.anime.anizm.player_api');
      if (p) PLAYER_API = String(p).replace(/\/+$/, '');
      if (HEADERS) HEADERS.Referer = BASE_URL + '/';
    });
  }
  return _cfgReady;
}

/**
 * Anthology - Anizm Provider
 * Anime serileri için AnizmPlayer (FirePlayer HLS), OK.ru ve Sibnet doğrudan akışları sağlar.
 */

var BASE_URL = "https://anizm.net";
var PLAYER_API = "https://anizmplayer.com";
var SITE_NAME = "Anizm";

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

function isCfBlocked(status, body) {
  if (status === 403 || status === 429) return true;
  if (!body) return false;
  var b = String(body).substring(0, 4096);
  return b.indexOf("Just a moment") !== -1 || b.indexOf("cf-chl") !== -1 || b.indexOf("cf-mitigated") !== -1;
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

async function anizmSearch(query) {
  try {
    var res = await fetch(BASE_URL + "/searchAnime?query=" + encodeURIComponent(query) + "&page=1", { headers: AJAX_HEADERS, signal: timeoutSignal(9000) });
    if (!res.ok) return [];
    var j;
    try { j = await res.json(); } catch (e) { return []; }
    var data = (j && j.data) || [];
    var out = [];
    for (var i = 0; i < data.length; i++) {
      var it = data[i];
      out.push({
        slug: it.info_slug || "",
        name: decodeHtmlEntities(it.info_title || ""),
        original: decodeHtmlEntities(it.info_titleoriginal || ""),
        english: decodeHtmlEntities(it.info_titleenglish || ""),
        year: it.info_year || "",
        poster: it.info_poster || "",
        lastEpisode: (it.lastEpisode && it.lastEpisode[0] && it.lastEpisode[0].episode_slug) || ""
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

function resultNames(item) {
  var names = [];
  if (item && item.name) names.push(item.name);
  if (item && item.english && names.indexOf(item.english) === -1) names.push(item.english);
  if (item && item.original && names.indexOf(item.original) === -1) names.push(item.original);
  return names.join(" | ");
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

function hasSeasonMarker(title, season) {
  var c = ultraClean(title);
  var ordinals = { 2: "2nd|second|sezon2", 3: "3rd|third|sezon3", 4: "4th|fourth|sezon4", 5: "5th|fifth|sezon5" };
  var num = "season" + String(season).replace(/^0+/, "");
  var re = new RegExp("(" + (ordinals[season] || "season" + season) + ")", "i");
  return re.test(c) || c.indexOf(num) !== -1;
}

async function resolveMatch(show, requestedSeason) {
  var titles = seriesSearchTitles(show);
  var best = null;
  var bestScore = 0;
  for (var i = 0; i < titles.length && bestScore < 1; i++) {
    var q = titles[i];
    var results = await anizmSearch(q);
    for (var j = 0; j < results.length; j++) {
      var sc = scoreMatch(resultNames(results[j]), show);
      if (requestedSeason && requestedSeason > 1) {
        var nameForSeason = results[j].name || results[j].english || results[j].original || "";
        if (!hasSeasonMarker(nameForSeason, requestedSeason)) {
          sc = Math.min(sc, 0.4);
        }
      }
      if (sc > bestScore) { bestScore = sc; best = results[j]; }
    }
    if (requestedSeason && requestedSeason > 1) {
      var sq = q + " season " + requestedSeason;
      var res2 = await anizmSearch(sq);
      for (var k = 0; k < res2.length; k++) {
        var name2 = res2[k].name || res2[k].english || res2[k].original || "";
        if (!hasSeasonMarker(name2, requestedSeason)) continue;
        var sc2 = scoreMatch(resultNames(res2[k]), show) + 0.05;
        if (sc2 > bestScore) { bestScore = sc2; best = res2[k]; }
      }
    }
  }
  if (best && bestScore >= 0.5) return best;
  return null;
}

async function fetchHtml(url, headers, ms) {
  try {
    var res = await fetch(url, { headers: headers || HEADERS, signal: timeoutSignal(ms || 10000) });
    var text = await res.text();
    if (isCfBlocked(res.status, text)) return null;
    return { status: res.status, text: text };
  } catch (e) { return null; }
}

function parseEpisodeList(html) {
  var out = [];
  var seen = {};
  var blocks = html.match(/<div class="[^"]*bolumKutucugu[^"]*">[\s\S]*?<\/a>\s*<\/div>/g) || [];
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    var a = b.match(/href="(https:\/\/anizm\.net\/[^"]+)"/);
    var num = b.match(/class="episodeBlock[\s\S]*?">\s*([\d\.]+)(?:\s*Bölüm)?/i);
    if (!a) continue;
    var ep = -1;
    if (num) ep = parseInt(num[1], 10);
    if (ep < 0) {
      var mm = a[1].match(/-(\d+)-bolum/);
      if (mm) ep = parseInt(mm[1], 10);
    }
    if (ep < 1) continue;
    if (seen[ep]) continue;
    seen[ep] = true;
    out.push({ season: 1, episode: ep, url: a[1], title: ep + ". Bölüm" });
  }
  out.sort(function (aa, bb) { return aa.episode - bb.episode; });
  return out;
}

function parseTranslators(html) {
  var out = [];
  var seen = {};
  var m = html.match(/translator="(https:\/\/anizm\.net\/episode\/\d+\/translator\/\d+)"/g) || [];
  for (var i = 0; i < m.length; i++) {
    var u = m[i].replace(/^translator="/, "").replace(/"$/, "");
    if (!seen[u]) { seen[u] = true; out.push(u); }
  }
  return out;
}

async function fetchTranslatorVideos(translatorUrl) {
  try {
    var res = await fetch(translatorUrl, { headers: AJAX_HEADERS, signal: timeoutSignal(8000) });
    if (!res.ok) return [];
    var text = await res.text();
    if (text.trim().indexOf("{") === 0) {
      try {
        var j = JSON.parse(text);
        text = j.data || text;
      } catch (e) {}
    }
    var out = [];
    var seen = {};
    var vm = text.match(/video="(https:\/\/anizm\.net\/video\/\d+)"/g) || [];
    for (var i = 0; i < vm.length; i++) {
      var u = vm[i].replace(/^video="/, "").replace(/"$/, "");
      if (!seen[u]) { seen[u] = true; out.push(u); }
    }
    return out;
  } catch (e) { return []; }
}

async function resolveAnizmPlayer(hash) {
  try {
    var res = await fetch(PLAYER_API + "/player/index.php?data=" + hash + "&do=getVideo", {
      method: "POST",
      headers: Object.assign({}, AJAX_HEADERS, {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Referer": PLAYER_API + "/",
        "Origin": PLAYER_API
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
    return [buildStream(SITE_NAME, "⌜ " + SITE_NAME + " ⌟ | AnizmPlayer [" + quality + " HLS]", data.securedLink, quality, "hls", true, PLAYER_API + "/")];
  } catch (e) { return []; }
}

async function probeHlsHeight(url) {
  try {
    var r = await fetch(url, { headers: { "User-Agent": HEADERS["User-Agent"], "Referer": PLAYER_API + "/" }, signal: timeoutSignal(6000) });
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

async function resolveOkRu(frameUrl) {
  try {
    var fullUrl = frameUrl.indexOf("//") === 0 ? "https:" + frameUrl : frameUrl;
    var res = await fetch(fullUrl, { headers: { "User-Agent": HEADERS["User-Agent"] }, signal: timeoutSignal(8000) });
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

async function resolvePlayerPage(vidUrl) {
  // vidUrl = https://anizm.net/video/{vidId}
  var vidId = (vidUrl.match(/\/video\/(\d+)/) || [])[1];
  if (!vidId) return [];
  var results = [];

  // 1) Doğrudan player sayfası (player/{vidId}), CF engeli yoksa
  var playerPage = await fetchHtml(BASE_URL + "/player/" + vidId, HEADERS, 9000);
  if (playerPage) {
    var methods = await analyzePlayerHtml(playerPage.text);
    for (var i = 0; i < methods.length; i++) {
      var m2 = await methods[i]();
      for (var k = 0; k < m2.length; k++) results.push(m2[k]);
    }
    if (results.length) return results;
  }

  // 2) /video/{vidId} JSON -> iframe player/{playerId}
  try {
    var res = await fetch(vidUrl, { headers: AJAX_HEADERS, signal: timeoutSignal(8000) });
    var text = await res.text();
    if (!isCfBlocked(res.status, text)) {
      var pm = text.match(/player\/(\d+)/);
      if (pm && pm[1] !== vidId) {
        var player2 = await fetchHtml(BASE_URL + "/player/" + pm[1], HEADERS, 9000);
        if (player2) {
          var methods2 = await analyzePlayerHtml(player2.text);
          for (var j = 0; j < methods2.length; j++) {
            var m3 = await methods2[j]();
            for (var k2 = 0; k2 < m3.length; k2++) results.push(m3[k2]);
          }
        }
      }
    }
  } catch (e) {}
  return results;
}

async function analyzePlayerHtml(html) {
  var res = [];
  // Dean Edwards -> FirePlayer(ID)
  if (html.indexOf("eval(function(p,a,c,k,e,d)") !== -1) {
    var idx = html.indexOf("eval(function(p,a,c,k,e,d)");
    var endIdx = html.indexOf("</script>", idx);
    var snippet = html.substring(idx, endIdx < 0 ? html.length : endIdx).trim();
    var unpacked = unpackDeanEdwards(snippet);
    if (unpacked) {
      var fp = unpacked.match(/FirePlayer\(["']([^"']+)["']/);
      if (fp) {
        res.push(function () { return resolveAnizmPlayer(fp[1]); });
      }
    }
  }
  var embeds = [];
  var em = html.match(/(?:src|data-src|href)="([^"]*ok\.ru\/videoembed\/[^"]+)"/g) || [];
  for (var i = 0; i < em.length; i++) {
    var u = em[i].match(/"([^"]+)/)[1];
    embeds.push(u);
  }
  for (var k = 0; k < embeds.length; k++) {
    (function (u) { res.push(function () { return resolveOkRu(u); }); })(embeds[k]);
  }
  var sn = html.match(/(?:src|data-src|href)="([^"]*video\.sibnet\.ru[^"]+)"/g) || [];
  for (var j = 0; j < sn.length; j++) {
    var su = sn[j].match(/"([^"]+)/)[1];
    (function (u) { res.push(function () { return resolveSibnet(u); }); })(su);
  }
  return res;
}

async function buildEpisodeUrl(slug, season, episode) {
  var urls = [
    BASE_URL + "/" + slug + "-" + episode + "-bolum-izle",
    BASE_URL + "/" + slug + "-" + episode + "-bolum-final-izle",
    BASE_URL + "/" + slug + "-" + episode + "-bolum-final",
    BASE_URL + "/" + slug + "-" + episode + "-bolum"
  ];
  for (var i = 0; i < urls.length; i++) {
    var r = await fetchHtml(urls[i], HEADERS, 9000);
    if (r) return urls[i];
  }
  return null;
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
      if (tmdbId.indexOf("anizm:show:") === 0) {
        id = tmdbId.replace("anizm:show:", "");
      } else if (tmdbId.indexOf("anizm:ep:") === 0) {
        var epParts = tmdbId.replace("anizm:ep:", "").split(":");
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

    var slug = "";
    if (typeof id === "string" && String(tmdbId).indexOf("anizm:") === 0 && id.indexOf("/") === -1) {
      slug = id;
    }

    if (!slug) {
      var show = await resolveSeriesInfo(id, mediaType || "series");
      if (!show || !show.title) return out;
      var match = await resolveMatch(show, finalSeason);
      if (!match) return out;
      slug = match.slug;
    }

    var epUrl = await buildEpisodeUrl(slug, finalSeason, finalEpisode);
    if (!epUrl) return out;

    var page = await fetchHtml(epUrl, HEADERS, 10000);
    if (!page) return out;

    var translators = parseTranslators(page.text);
    var visited = {};
    for (var i = 0; i < translators.length && out.length < 6; i++) {
      var videos = await fetchTranslatorVideos(translators[i]);
      for (var j = 0; j < videos.length && out.length < 6; j++) {
        if (visited[videos[j]]) continue;
        visited[videos[j]] = true;
        var s = await resolvePlayerPage(videos[j]);
        for (var k = 0; k < s.length; k++) out.push(s[k]);
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
    if (typeof id === "string" && id.indexOf("anizm:show:") === 0) {
      slug = id.replace("anizm:show:", "");
    }
    if (!slug) {
      var show = await resolveSeriesInfo(id, "series");
      if (!show || !show.title) return null;
      var match = await resolveMatch(show, 0);
      if (!match) return null;
      slug = match.slug;
    }
    var page = await fetchHtml(BASE_URL + "/anime/" + slug, HEADERS, 10000);
    if (!page) return null;
    var episodes = parseEpisodeList(page.text);
    var videos = [];
    for (var i = 0; i < episodes.length; i++) {
      videos.push({
        id: "anizm:ep:" + slug + ":1:" + episodes[i].episode,
        name: episodes[i].title,
        season: 1,
        number: episodes[i].episode,
        title: episodes[i].title
      });
    }
    var poster = "";
    var pm = page.text.match(/infoPosterImgItem[^"]*"[^>]*src="([^"]+)"/i);
    if (!pm) pm = page.text.match(/src="([^"]*storage\/pcovers\/[^"]+)"/i);
    if (pm) poster = pm[1].indexOf("http") === 0 ? pm[1] : (BASE_URL + pm[1]);
    var name = slug;
    var nm = page.text.match(/animeTitle[^>]*>([^<]+)</i);
    if (!nm) nm = page.text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (!nm) nm = page.text.match(/og:title" content="([^"]+)/i);
    if (nm) {
      name = decodeHtmlEntities(nm[1]).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      name = name.split("|")[0].replace(/\s*izle\s*$/i, "").trim() || name;
    }
    return {
      meta: {
        id: "anizm:show:" + slug,
        type: "series",
        name: name,
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
      var results = await anizmSearch(args.search);
      for (var i = 0; i < results.length; i++) {
        if (!results[i].slug) continue;
        metas.push({
          id: "anizm:show:" + results[i].slug,
          type: "series",
          name: results[i].name || results[i].english || results[i].slug,
          poster: ""
        });
      }
      return { metas: metas };
    }

    var page = await fetchHtml(BASE_URL + "/", HEADERS, 10000);
    if (page) {
      var seen = {};
      var blocks = page.text.match(/<a class="slideAnimeLink[^"]*" href="(https:\/\/anizm\.net\/[^"]+)">/g) || [];
      var titles = page.text.match(/slideAnimeTitle[^>]*>([^<]+)</g) || [];
      for (var i = 0; i < blocks.length && metas.length < 30; i++) {
        var href = (blocks[i].match(/href="(https:\/\/anizm\.net\/[^"]+)"/) || [])[1];
        if (!href) continue;
        var raw = href.replace(/^https:\/\/anizm\.net\//, "");
        var clean = raw.replace(/-\d+-bolum(?:-(?:final|izle|fragman))*$/i, "").replace(/-(?:final|izle|fragman)+$/i, "");
        if (!clean || seen[clean]) continue;
        seen[clean] = true;
        var name = (titles[i] || "").match(/>([^<]+)</);
        metas.push({
          id: "anizm:show:" + clean,
          type: "series",
          name: name ? decodeHtmlEntities(name[1]).trim() : clean,
          poster: ""
        });
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