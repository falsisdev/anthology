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
  var out = [];
  // 1) V3 hızlı arama uç noktası (/arama-onerileri?q=)
  try {
    var v3Res = await fetch(BASE_URL + "/arama-onerileri?q=" + encodeURIComponent(query), { headers: AJAX_HEADERS, signal: timeoutSignal(6000) });
    if (v3Res.ok) {
      var v3Json = await v3Res.json();
      var list = (v3Json && v3Json.results) || [];
      for (var r = 0; r < list.length; r++) {
        var it3 = list[r];
        var slug = String(it3.url || "").replace(/^https?:\/\/[^\/]+\//, "").replace(/\/+$/, "");
        if (!slug) continue;
        var title3 = decodeHtmlEntities(it3.title || "");
        var isRecap = /\brecap\b|\bözet\b/i.test(title3);
        out.push({
          slug: slug,
          name: title3,
          original: title3,
          english: isRecap ? "" : query,
          year: it3.year || "",
          poster: it3.poster || "",
          lastEpisode: ""
        });
      }
      if (out.length > 0) return out;
    }
  } catch (e) {}

  // 2) V2 yedek uç noktası (/searchAnime?query=)
  try {
    var res = await fetch(BASE_URL + "/searchAnime?query=" + encodeURIComponent(query) + "&page=1", { headers: AJAX_HEADERS, signal: timeoutSignal(6000) });
    if (!res.ok) return [];
    var j;
    try { j = await res.json(); } catch (e) { return []; }
    var data = (j && j.data) || [];
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

function scoreMatch(item, show) {
  var names = (typeof item === "object" && item !== null)
    ? [item.name, item.english, item.original].filter(Boolean)
    : [String(item || "")];
  var candidates = [show.title, show.origTitle].concat(show.aliases || []).filter(Boolean);
  var best = 0;
  for (var i = 0; i < names.length; i++) {
    var nClean = ultraClean(names[i]);
    for (var j = 0; j < candidates.length; j++) {
      var cClean = ultraClean(candidates[j]);
      if (nClean && cClean && nClean === cClean) return 1;
      var t = tokensMatch(names[i], candidates[j]);
      if (t > best) best = t;
    }
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
      var sc = scoreMatch(results[j], show);
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
        var sc2 = scoreMatch(res2[k], show) + 0.05;
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

  // V3: <a ... href="https://anizm.net/slug-1-bolum-izle">
  var v3matches = Array.from(html.matchAll(/href=["'](https:\/\/anizm\.net\/[^"']*-(\d+)-bolum(?:-[^"']*)?)["']/gi));
  for (var i = 0; i < v3matches.length; i++) {
    var u = v3matches[i][1];
    var ep = parseInt(v3matches[i][2], 10);
    if (ep > 0 && !seen[ep]) {
      seen[ep] = true;
      out.push({ season: 1, episode: ep, url: u, title: ep + ". Bölüm" });
    }
  }
  if (out.length) {
    out.sort(function (a, b) { return a.episode - b.episode; });
    return out;
  }

  // V2 fallback: bolumKutucugu
  var blocks = html.match(/<div class="[^"]*bolumKutucugu[^"]*">[\s\S]*?<\/a>\s*<\/div>/g) || [];
  for (var j = 0; j < blocks.length; j++) {
    var b = blocks[j];
    var a = b.match(/href="(https:\/\/anizm\.net\/[^"]+)"/);
    var num = b.match(/class="episodeBlock[\s\S]*?">\s*([\d\.]+)(?:\s*Bölüm)?/i);
    if (!a) continue;
    var epNum = -1;
    if (num) epNum = parseInt(num[1], 10);
    if (epNum < 0) {
      var mm = a[1].match(/-(\d+)-bolum/);
      if (mm) epNum = parseInt(mm[1], 10);
    }
    if (epNum < 1 || seen[epNum]) continue;
    seen[epNum] = true;
    out.push({ season: 1, episode: epNum, url: a[1], title: epNum + ". Bölüm" });
  }
  out.sort(function (aa, bb) { return aa.episode - bb.episode; });
  return out;
}

function parseTranslators(html) {
  var out = [];
  var seen = {};

  // V3: data-sources="https://anizm.net/bolum/.../cevirmen/..."
  var v3m = html.match(/data-sources=["'](https:\/\/anizm\.net\/bolum\/\d+\/cevirmen\/\d+)["']/g) || [];
  for (var i = 0; i < v3m.length; i++) {
    var uMatch = v3m[i].match(/https:\/\/anizm\.net\/bolum\/\d+\/cevirmen\/\d+/);
    if (uMatch) {
      var u = uMatch[0];
      if (!seen[u]) { seen[u] = true; out.push(u); }
    }
  }

  // V2 fallback: translator="..."
  var m = html.match(/translator=["'](https:\/\/anizm\.net\/episode\/\d+\/translator\/\d+)["']/g) || [];
  for (var j = 0; j < m.length; j++) {
    var u2 = m[j].replace(/^translator=["']/, "").replace(/["']$/, "");
    if (!seen[u2]) { seen[u2] = true; out.push(u2); }
  }
  return out;
}

async function fetchTranslatorVideos(translatorUrl) {
  try {
    var res = await fetch(translatorUrl, { headers: AJAX_HEADERS, signal: timeoutSignal(8000) });
    if (!res.ok) return [];
    var text = await res.text();

    // V3: {"success":true,"videos":[{"id":1607202,"name":"Aincrad (Reklamsız)",...}]}
    try {
      var j = JSON.parse(text);
      if (j && Array.isArray(j.videos)) {
        var v3out = [];
        for (var vi = 0; vi < j.videos.length; vi++) {
          var v = j.videos[vi];
          if (v && v.id) {
            var vUrl = translatorUrl.replace(/\/cevirmen\/\d+$/, "/video/" + v.id);
            v3out.push(vUrl);
          }
        }
        if (v3out.length) return v3out;
      }
    } catch (e) {}

    // V2 fallback: video="..."
    var out = [];
    var seen = {};
    var vm = text.match(/video=["'](https:\/\/anizm\.net\/video\/\d+)["']/g) || [];
    for (var i = 0; i < vm.length; i++) {
      var u = vm[i].replace(/^video=["']/, "").replace(/["']$/, "");
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
    if (!data) return [];

    // master.txt (%100 oynatılabilir adaptif HLS)
    var streamUrl = data.videoSource || data.securedLink;
    if (!streamUrl) return [];

    var playUrl = streamUrl.includes(".txt") ? (streamUrl + "#.m3u8") : streamUrl;
    var quality = "1080p";

    return [buildStream(SITE_NAME, "⌜ " + SITE_NAME + " ⌟ | AnizmPlayer [" + quality + " HLS]", playUrl, quality, "hls", true, PLAYER_API + "/")];
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
  var vidId = (vidUrl.match(/\/video\/(\d+)/) || [])[1];
  if (!vidId) return [];
  var results = [];

  // 1) V3: /bolum/{epId}/video/{vidId} JSON -> {"success":true,"url":"https:\/\/anizm.net\/player\/1607202"}
  if (vidUrl.includes("/bolum/")) {
    try {
      var r = await fetch(vidUrl, { headers: AJAX_HEADERS, signal: timeoutSignal(8000) });
      if (r.ok) {
        var j = await r.json();
        if (j && j.url) {
          var playerP = await fetchHtml(j.url, HEADERS, 9000);
          if (playerP) {
            var m = await analyzePlayerHtml(playerP.text);
            for (var mi = 0; mi < m.length; mi++) {
              var sList = await m[mi]();
              for (var si = 0; si < sList.length; si++) results.push(sList[si]);
            }
          }
        }
      }
    } catch (e) {}
    if (results.length) return results;
  }

  // 2) Doğrudan player sayfası (player/{vidId}), CF engeli yoksa
  var playerPage = await fetchHtml(BASE_URL + "/player/" + vidId, HEADERS, 9000);
  if (playerPage) {
    var methods = await analyzePlayerHtml(playerPage.text);
    for (var i = 0; i < methods.length; i++) {
      var m2 = await methods[i]();
      for (var k = 0; k < m2.length; k++) results.push(m2[k]);
    }
    if (results.length) return results;
  }

  // 3) /video/{vidId} JSON -> iframe player/{playerId}
  try {
    var res = await fetch(vidUrl, { headers: AJAX_HEADERS, signal: timeoutSignal(8000) });
    var text = await res.text();
    if (!isCfBlocked(res.status, text)) {
      var pm = text.match(/player\/(\d+)/);
      if (pm && pm[1] !== vidId) {
        var player2 = await fetchHtml(BASE_URL + "/player/" + pm[1], HEADERS, 9000);
        if (player2) {
          var methods2 = await analyzePlayerHtml(player2.text);
          for (var j2 = 0; j2 < methods2.length; j2++) {
            var m3 = await methods2[j2]();
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
  // Sayfada birden fazla eval bloğu olabilir; hepsini tara
  var evals = Array.from(html.matchAll(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?<\/script>/gi));
  for (var ei = 0; ei < evals.length; ei++) {
    var snippet = evals[ei][0].replace(/<\/script>$/i, "").trim();
    var unpacked = unpackDeanEdwards(snippet);
    if (unpacked) {
      var fp = unpacked.match(/FirePlayer\(["']([^"']+)["']/);
      if (fp) {
        (function(hash) {
          res.push(function () { return resolveAnizmPlayer(hash); });
        })(fp[1]);
        break;
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
    (function(emUrl) {
      res.push(function () { return resolveOkRu(emUrl); });
    })(embeds[k]);
  }

  var sib = html.match(/(?:src|data-src|href)="([^"]*video\.sibnet\.ru\/shell\.php\?videoid=[^"]+)"/g) || [];
  for (var s = 0; s < sib.length; s++) {
    (function(sibUrl) {
      res.push(function () { return resolveSibnet(sibUrl); });
    })(sib[s].match(/"([^"]+)/)[1]);
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
    var show = null;
    if (typeof id === "string" && String(tmdbId).indexOf("anizm:") === 0 && id.indexOf("/") === -1) {
      slug = id;
    }

    if (!slug) {
      show = await resolveSeriesInfo(id, mediaType || "series");
      if (!show || !show.title) return out;
      var match = await resolveMatch(show, finalSeason);
      if (match) slug = match.slug;
    }

    if (slug) {
      var epUrl = await buildEpisodeUrl(slug, finalSeason, finalEpisode);
      if (epUrl) {
        var page = await fetchHtml(epUrl, HEADERS, 10000);
        if (page) {
          var translators = parseTranslators(page.text);
          var visited = {};
          var consecutiveFails = 0;
          for (var i = 0; i < translators.length && out.length < 6 && consecutiveFails < 2; i++) {
            var videos = await fetchTranslatorVideos(translators[i]);
            for (var j = 0; j < videos.length && out.length < 6 && consecutiveFails < 2; j++) {
              if (visited[videos[j]]) continue;
              visited[videos[j]] = true;
              var s = await resolvePlayerPage(videos[j]);
              if (s && s.length > 0) {
                consecutiveFails = 0;
                for (var k = 0; k < s.length; k++) out.push(s[k]);
              } else {
                consecutiveFails++;
              }
            }
          }
        }
      }
    }

    if (out.length === 0 && show) {
      var titles = seriesSearchTitles(show);
      var dwSlug = "";
      for (var t = 0; t < titles.length && !dwSlug; t++) {
        var q = titles[t];
        if (!q || q.length < 2) continue;
        try {
          var sr = await fetch("https://diziwatch.org/api/ara?q=" + encodeURIComponent(q), {
            headers: { "User-Agent": HEADERS["User-Agent"], "Accept": "application/json", "Referer": "https://diziwatch.org/" },
            signal: timeoutSignal(4000)
          });
          if (sr.ok) {
            var arr = await sr.json();
            if (Array.isArray(arr) && arr.length > 0 && arr[0].slug) dwSlug = arr[0].slug;
          }
        } catch (e) {}
      }
      if (dwSlug) {
        var sN = finalSeason > 0 ? finalSeason : 1;
        var eN = finalEpisode > 0 ? finalEpisode : 1;
        try {
          var epRes = await fetch("https://diziwatch.org/dizi/" + dwSlug + "/sezon-" + sN + "/bolum-" + eN, {
            headers: { "User-Agent": HEADERS["User-Agent"], "Referer": "https://diziwatch.org/" },
            signal: timeoutSignal(6000)
          });
          if (epRes.ok) {
            var dwHtml = await epRes.text();
            var reH = /anizmplayer\.com\/video\/([a-f0-9]{24,40})/gi;
            var mh;
            var hashes = [];
            while ((mh = reH.exec(dwHtml)) !== null) {
              if (hashes.indexOf(mh[1]) === -1) hashes.push(mh[1]);
              if (hashes.length >= 3) break;
            }
            for (var hi = 0; hi < hashes.length; hi++) {
              var sAp = await resolveAnizmPlayer(hashes[hi]);
              for (var si = 0; si < sAp.length; si++) out.push(sAp[si]);
            }
          }
        } catch (e) {}
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
          poster: results[i].poster ? (results[i].poster.indexOf("http") === 0 ? results[i].poster : "https://cdn.anizm.net/storage/pcovers/" + results[i].poster) : ""
        });
      }
      return { metas: metas };
    }

    var page = await fetchHtml(BASE_URL + "/", HEADERS, 10000);
    if (page) {
      var seen = {};

      // 1) V3 Series Cards (<article class="v3-series-card">)
      var seriesCards = Array.from(page.text.matchAll(/<article[^>]*class="[^"]*v3-series-card[^"]*"[^>]*>[\s\S]*?<a[^>]+href="https:\/\/anizm\.net\/([^"\/]+)"[\s\S]*?alt="([^"]*?)(?:\s+posteri)?"[\s\S]*?<\/article>/gi));
      for (var sc = 0; sc < seriesCards.length && metas.length < 30; sc++) {
        var m = seriesCards[sc];
        var slug = m[1];
        if (!slug || seen[slug] || slug === "manifest.json") continue;
        seen[slug] = true;
        var name = (m[2] || "").trim() || slug;
        metas.push({
          id: "anizm:show:" + slug,
          type: "series",
          name: decodeHtmlEntities(name),
          poster: ""
        });
      }

      // 2) V3 Episode Cards (<article class="v3-episode-card">)
      if (metas.length < 15) {
        var epCards = Array.from(page.text.matchAll(/<article[^>]*class="[^"]*v3-episode-card[^"]*"[^>]*>[\s\S]*?<a[^>]+href="https:\/\/anizm\.net\/([^"\/]+)"[\s\S]*?alt="([^"]*?)(?:\s+posteri)?"[\s\S]*?<\/article>/gi));
        for (var ec = 0; ec < epCards.length && metas.length < 30; ec++) {
          var em = epCards[ec];
          var rawSlug = em[1] || "";
          var cleanSlug = rawSlug.replace(/-\d+-bolum(?:-(?:final|izle|fragman))*$/i, "");
          if (!cleanSlug || seen[cleanSlug] || cleanSlug === "manifest.json") continue;
          seen[cleanSlug] = true;
          var epName = (em[2] || "").trim() || cleanSlug;
          metas.push({
            id: "anizm:show:" + cleanSlug,
            type: "series",
            name: decodeHtmlEntities(epName),
            poster: ""
          });
        }
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