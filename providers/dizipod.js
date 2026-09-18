/**
 * Anthology Provider: dizipod
 * Built from src/dizipod/index.js
 * Build Date: 2026-09-18T20:22:18.763Z
 */
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/shared/config.js
var require_config = __commonJS({
  "src/shared/config.js"(exports2, module2) {
    var CONFIG_URL = "https://raw.githubusercontent.com/falsisdev/anthology/main/config.json";
    var CONFIG_TTL_MS = 10 * 60 * 1e3;
    var _cfg = null;
    var _cfgTime = 0;
    function _cfgLocalRead() {
      try {
        if (typeof require === "undefined") return null;
        var fs = require("fs");
        var path = require("path");
        if (!fs || !path || typeof fs.existsSync !== "function") return null;
        var dir = typeof __dirname !== "undefined" ? __dirname : "";
        var candidates = [
          path.resolve(dir, "..", "config.json"),
          // providers/<name>.js
          path.resolve(dir, "..", "..", "config.json"),
          // src/<name>/index.js
          path.resolve(dir, "config.json")
        ];
        for (var i = 0; i < candidates.length; i++) {
          if (fs.existsSync(candidates[i])) {
            return JSON.parse(fs.readFileSync(candidates[i], "utf8"));
          }
        }
      } catch (e) {
        return null;
      }
      return null;
    }
    function _cfgFetch() {
      return fetch(CONFIG_URL, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "application/json"
        }
      }).then(function(res) {
        if (!res || !res.ok) throw new Error("config.json " + (res && res.status));
        if (typeof res.json === "function") return res.json();
        return res.text().then(function(t) {
          return JSON.parse(t);
        });
      });
    }
    function loadConfig2() {
      var now = Date.now();
      if (_cfg && now - _cfgTime < CONFIG_TTL_MS) return Promise.resolve(_cfg);
      var local = _cfgLocalRead();
      if (local && typeof local === "object") {
        _cfg = local;
        _cfgTime = now;
        return Promise.resolve(_cfg);
      }
      return _cfgFetch().then(function(c) {
        _cfg = c && typeof c === "object" ? c : {};
        _cfgTime = now;
        return _cfg;
      }).catch(function() {
        _cfg = null;
        _cfgTime = now;
        return _cfg;
      });
    }
    function val2(pathStr) {
      if (!_cfg || !pathStr) return void 0;
      var parts = String(pathStr).split(".");
      var cur = _cfg;
      for (var i = 0; i < parts.length; i++) {
        if (cur == null || typeof cur !== "object") return void 0;
        cur = cur[parts[i]];
      }
      return cur;
    }
    function wrapAll2(obj, pre) {
      var out = {};
      for (var k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          if (typeof obj[k] === "function") {
            (function(name, fn) {
              out[name] = function() {
                var self = this;
                var args = arguments;
                var chain = pre ? pre() : Promise.resolve();
                return chain.then(function() {
                  return fn.apply(self, args);
                });
              };
            })(k, obj[k]);
          } else {
            out[k] = obj[k];
          }
        }
      }
      return out;
    }
    if (typeof module2 !== "undefined" && module2.exports) {
      module2.exports = { loadConfig: loadConfig2, val: val2, wrapAll: wrapAll2 };
    }
  }
});

// src/dizipod/index.js
var { loadConfig, val, wrapAll } = require_config();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.series.dizipod.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var cheerio = (function() {
  try {
    return require("cheerio-without-node-native");
  } catch (e) {
    try {
      return require("cheerio");
    } catch (e2) {
      return null;
    }
  }
})();
var PROVIDER_NAME = "DiziPod";
var BASE_URL = "https://dizipod.com";
var PLAYER_URL = "https://player.dizipod.com";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Referer": BASE_URL + "/"
};
function timeoutSignal(ms) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  var controller = new AbortController();
  setTimeout(function() {
    controller.abort();
  }, ms);
  return controller.signal;
}
function asciiFold(str) {
  if (!str) return "";
  return String(str).replace(/[ıİ]/g, "i").replace(/[öÖ]/g, "o").replace(/[üÜ]/g, "u").replace(/[çÇ]/g, "c").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[âîûÂÎÛ]/g, function(m) {
    return { "\xE2": "a", "\xEE": "i", "\xFB": "u", "\xC2": "a", "\xCE": "i", "\xDB": "u" }[m] || m;
  }).toLowerCase();
}
function cleanTitle(str) {
  if (!str) return "";
  return asciiFold(str).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
function titleToSlug(str) {
  if (!str) return "";
  return asciiFold(str).replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}
function unpackDeanEdwards(str) {
  if (!str || typeof str !== "string") return null;
  var match = str.match(/eval\(function\(p,a,c,k,e,[rd]\)\s*\{.+?\}\s*\(\s*([x\x27\x22].+?)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([x\x27\x22].+?)\.split\(\s*[\x27\x22]\|[\x27\x22]\s*\)/);
  if (!match) return null;
  var p = match[1];
  if (p.startsWith("'") && p.endsWith("'") || p.startsWith('"') && p.endsWith('"')) {
    p = p.slice(1, -1);
  }
  p = p.replace(/\\x27/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  var a = parseInt(match[2], 10);
  var c = parseInt(match[3], 10);
  var kStr = match[4];
  if (kStr.startsWith("'") && kStr.endsWith("'") || kStr.startsWith('"') && kStr.endsWith('"')) {
    kStr = kStr.slice(1, -1);
  }
  var k = kStr.split("|");
  function baseN(val3, radix) {
    if (radix === 10) return String(val3);
    var chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var res = "";
    do {
      res = chars[val3 % radix] + res;
      val3 = Math.floor(val3 / radix);
    } while (val3 > 0);
    return res;
  }
  for (var i = c - 1; i >= 0; i--) {
    var key = baseN(i, a);
    var val2 = k[i] || key;
    if (val2 !== key) {
      var reg = new RegExp("\\b" + key + "\\b", "g");
      p = p.replace(reg, val2);
    }
  }
  return p;
}
function resolveTmdbInfo(id, mediaType) {
  return __async(this, null, function* () {
    try {
      var cleanId = String(id || "").trim();
      if (cleanId.includes(":")) cleanId = cleanId.split(":")[0];
      var numericId = null;
      var title = "";
      var origTitle = "";
      var year = "";
      var isTv = mediaType === "tv" || mediaType === "series";
      if (cleanId.startsWith("tt")) {
        var findUrl = "https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_API_KEY + "&external_source=imdb_id";
        var findRes = yield fetch(findUrl, { signal: timeoutSignal(7e3) });
        if (findRes.ok) {
          var fData = yield findRes.json();
          var item = isTv ? fData.tv_results && fData.tv_results[0] : fData.movie_results && fData.movie_results[0];
          if (item) {
            numericId = item.id;
            title = item.name || item.title || "";
            origTitle = item.original_name || item.original_title || "";
            var dateStr = item.first_air_date || item.release_date || "";
            year = dateStr.slice(0, 4);
          }
        }
      } else {
        numericId = cleanId;
      }
      if (numericId && (!title || !origTitle)) {
        var tType = isTv ? "tv" : "movie";
        var tUrl = "https://api.themoviedb.org/3/" + tType + "/" + numericId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR";
        var tRes = yield fetch(tUrl, { signal: timeoutSignal(7e3) });
        if (tRes.ok) {
          var tData = yield tRes.json();
          title = tData.name || tData.title || title;
          origTitle = tData.original_name || tData.original_title || origTitle;
          var dateStr2 = tData.first_air_date || tData.release_date || "";
          if (!year && dateStr2) year = dateStr2.slice(0, 4);
        }
      }
      return {
        titleTr: (title || "").trim(),
        titleEn: (origTitle || "").trim(),
        year: year || "",
        numericId: numericId || id
      };
    } catch (e) {
      return { titleTr: "", titleEn: "", year: "", numericId: id };
    }
  });
}
function liveSearch(query) {
  return __async(this, null, function* () {
    if (!query || !query.trim()) return { films: [], series: [] };
    try {
      var bodyData = "action=dp_live_search&q=" + encodeURIComponent(query.trim());
      var res = yield fetch(BASE_URL + "/wp/wp-admin/admin-ajax.php", {
        method: "POST",
        headers: {
          "User-Agent": HEADERS["User-Agent"],
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Referer": BASE_URL + "/",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: bodyData,
        signal: timeoutSignal(8e3)
      });
      if (!res.ok) return { films: [], series: [] };
      var json = yield res.json();
      if (json && json.success && json.data) {
        return {
          films: Array.isArray(json.data.films) ? json.data.films : [],
          series: Array.isArray(json.data.series) ? json.data.series : []
        };
      }
      return { films: [], series: [] };
    } catch (e) {
      return { films: [], series: [] };
    }
  });
}
function fallbackSearch(query, isTv) {
  return __async(this, null, function* () {
    if (!query || !query.trim()) return [];
    try {
      var searchUrl = BASE_URL + "/?s=" + encodeURIComponent(query.trim());
      var res = yield fetch(searchUrl, {
        headers: HEADERS,
        signal: timeoutSignal(8e3)
      });
      if (!res.ok) return [];
      var html = yield res.text();
      var results = [];
      var pattern = isTv ? /href="(https:\/\/dizipod\.com\/diziler\/[^"]+)"[^>]*>[\s\S]*?<div class="title">([^<]+)<\/div>/g : /href="(https:\/\/dizipod\.com\/film\/[^"]+)"[^>]*>[\s\S]*?<div class="title">([^<]+)<\/div>/g;
      var m;
      while ((m = pattern.exec(html)) !== null) {
        results.push({
          url: m[1],
          title: m[2].replace(/&#8211;/g, "-").replace(/&#8217;/g, "'").trim()
        });
      }
      return results;
    } catch (e) {
      return [];
    }
  });
}
function calculateMatchScore(candidateTitle, candidateUrl, targetTitle, targetYear) {
  var candNorm = cleanTitle(candidateTitle);
  var targetNorm = cleanTitle(targetTitle);
  if (!candNorm || !targetNorm) return 0;
  var candSlug = titleToSlug(candidateUrl.replace(/\/$/, "").split("/").pop() || "");
  var targetSlug = titleToSlug(targetTitle);
  var score = 0;
  if (candSlug === targetSlug) score += 100;
  if (candNorm === targetNorm) score += 80;
  else if (candNorm.startsWith(targetNorm)) score += 50;
  else if (candNorm.includes(targetNorm)) score += 30;
  if (targetYear && candidateUrl.includes(targetYear)) score += 20;
  var candWords = candNorm.split(" ");
  var targetWords = targetNorm.split(" ");
  if (candWords.length > targetWords.length && !candNorm.includes("sezon")) {
    score -= (candWords.length - targetWords.length) * 10;
  }
  return score;
}
function findMediaUrl(tmdbInfo, isTv) {
  return __async(this, null, function* () {
    var titles = [];
    if (tmdbInfo.titleEn) titles.push(tmdbInfo.titleEn);
    if (tmdbInfo.titleTr && tmdbInfo.titleTr !== tmdbInfo.titleEn) titles.push(tmdbInfo.titleTr);
    for (var t = 0; t < titles.length; t++) {
      var slug = titleToSlug(titles[t]);
      if (!slug) continue;
      var directUrl = isTv ? BASE_URL + "/diziler/" + slug + "/" : BASE_URL + "/film/" + slug + "/";
      try {
        var headRes = yield fetch(directUrl, {
          method: "HEAD",
          headers: HEADERS,
          signal: timeoutSignal(4e3)
        });
        if (headRes.ok) {
          return { url: directUrl, slug };
        }
      } catch (e) {
      }
    }
    var bestScore = -1;
    var bestUrl = null;
    var bestSlug = null;
    for (var i = 0; i < titles.length; i++) {
      var q = titles[i];
      var searchRes = yield liveSearch(q);
      var candidates = isTv ? searchRes.series : searchRes.films;
      if (!candidates.length) {
        candidates = yield fallbackSearch(q, isTv);
      }
      for (var c = 0; c < candidates.length; c++) {
        var item = candidates[c];
        var candUrl = item.url || "";
        if (!candUrl) continue;
        var cScore = calculateMatchScore(item.title, candUrl, q, tmdbInfo.year);
        if (cScore > bestScore) {
          bestScore = cScore;
          bestUrl = candUrl;
          var sMatch = candUrl.match(/\/(diziler|film)\/([^/]+)/);
          bestSlug = sMatch ? sMatch[2] : titleToSlug(item.title);
        }
      }
      if (bestScore >= 80) break;
    }
    if (bestUrl) {
      return { url: bestUrl, slug: bestSlug };
    }
    return null;
  });
}
function findEpisodePostId(mediaInfo, season, episode) {
  return __async(this, null, function* () {
    var slug = mediaInfo.slug;
    if (!slug) return null;
    var directEpUrl = BASE_URL + "/" + slug + "-" + season + "-sezon-" + episode + "-bolum/";
    try {
      var epRes = yield fetch(directEpUrl, { headers: HEADERS, signal: timeoutSignal(6e3) });
      if (epRes.ok) {
        var epHtml = yield epRes.text();
        var m = epHtml.match(/data-post-id="(\d+)"/);
        if (m && m[1]) return m[1];
      }
    } catch (e) {
    }
    var seasonPageUrl = BASE_URL + "/dizi/" + slug + "/" + slug + "-" + season + "-sezon/";
    try {
      var sRes = yield fetch(seasonPageUrl, { headers: HEADERS, signal: timeoutSignal(6e3) });
      var sHtml = sRes.ok ? yield sRes.text() : "";
      if (!sHtml && mediaInfo.url) {
        var mainRes = yield fetch(mediaInfo.url, { headers: HEADERS, signal: timeoutSignal(6e3) });
        if (mainRes.ok) sHtml = yield mainRes.text();
      }
      if (sHtml) {
        var epRegex = new RegExp('href="([^"]+-' + season + "-sezon-" + episode + '-bolum\\/?)"', "i");
        var epMatch = sHtml.match(epRegex);
        if (epMatch && epMatch[1]) {
          var matchedUrl = epMatch[1].startsWith("http") ? epMatch[1] : BASE_URL + epMatch[1];
          var targetRes = yield fetch(matchedUrl, { headers: HEADERS, signal: timeoutSignal(6e3) });
          if (targetRes.ok) {
            var targetHtml = yield targetRes.text();
            var postM = targetHtml.match(/data-post-id="(\d+)"/);
            if (postM && postM[1]) return postM[1];
          }
        }
      }
    } catch (e) {
    }
    return null;
  });
}
function findMoviePostId(filmUrl) {
  return __async(this, null, function* () {
    try {
      var res = yield fetch(filmUrl, { headers: HEADERS, signal: timeoutSignal(7e3) });
      if (!res.ok) return null;
      var html = yield res.text();
      var m = html.match(/data-post-id="(\d+)"/);
      if (m && m[1]) return m[1];
    } catch (e) {
    }
    return null;
  });
}
function extractStreamFromPostId(postId, pageReferer, displayName) {
  return __async(this, null, function* () {
    if (!postId) return [];
    try {
      var ajaxUrl = BASE_URL + "/wp/wp-admin/admin-ajax.php?action=get_episode_player&post_id=" + postId;
      var playerRes = yield fetch(ajaxUrl, {
        headers: {
          "User-Agent": HEADERS["User-Agent"],
          "Referer": pageReferer || BASE_URL + "/",
          "X-Requested-With": "XMLHttpRequest"
        },
        signal: timeoutSignal(7e3)
      });
      if (!playerRes.ok) return [];
      var playerJson = yield playerRes.json();
      if (!playerJson || !playerJson.success || !playerJson.data) return [];
      var iframeMatch = playerJson.data.match(/src=\\"([^"]+)\\"/) || playerJson.data.match(/src="([^"]+)"/);
      if (!iframeMatch || !iframeMatch[1]) return [];
      var embedUrl = iframeMatch[1].replace(/\\/g, "");
      if (!embedUrl.startsWith("http")) {
        embedUrl = PLAYER_URL + embedUrl;
      }
      var embedRes = yield fetch(embedUrl, {
        headers: {
          "User-Agent": HEADERS["User-Agent"],
          "Referer": BASE_URL + "/"
        },
        signal: timeoutSignal(7e3)
      });
      if (!embedRes.ok) return [];
      var embedHtml = yield embedRes.text();
      var streams = [];
      var parsedSources = [];
      var unpacked = unpackDeanEdwards(embedHtml);
      if (unpacked) {
        var srcMatch = unpacked.match(/sources:\s*(\[\{.+?\}\])/);
        if (srcMatch && srcMatch[1]) {
          try {
            var cleanJson = srcMatch[1].replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
            parsedSources = JSON.parse(cleanJson);
          } catch (je) {
            var fileM = srcMatch[1].match(/"file"\s*:\s*"([^"]+)"/);
            var labelM = srcMatch[1].match(/"label"\s*:\s*"([^"]+)"/);
            if (fileM && fileM[1]) {
              parsedSources.push({
                file: fileM[1].replace(/\\/g, ""),
                label: labelM ? labelM[1] : "720p"
              });
            }
          }
        }
      }
      if (!parsedSources.length) {
        var directFileM = embedHtml.match(/https?:\\\/\\\/[a-zA-Z0-9.-]+\.tyuopix\.com[^\s"']+\.m3u8/g) || embedHtml.match(/https?:\/\/[a-zA-Z0-9.-]+\.tyuopix\.com[^\s"']+\.m3u8/g);
        if (directFileM) {
          for (var f = 0; f < directFileM.length; f++) {
            parsedSources.push({
              file: directFileM[f].replace(/\\\//g, "/").replace(/\\/g, ""),
              label: "720p"
            });
          }
        }
      }
      for (var s = 0; s < parsedSources.length; s++) {
        var item = parsedSources[s];
        var fileUrl = (item.file || "").replace(/\\/g, "");
        if (!fileUrl || !fileUrl.includes(".m3u8")) continue;
        var qLabel = item.label || "720p";
        var streamHeaders = {
          "Referer": PLAYER_URL + "/",
          "User-Agent": HEADERS["User-Agent"]
        };
        streams.push({
          name: "\u231C " + PROVIDER_NAME + " \u231F",
          title: "\u231C " + PROVIDER_NAME + " \u231F | T\xFCrk\xE7e Altyaz\u0131l\u0131 [" + qLabel + "]",
          url: fileUrl,
          quality: qLabel,
          format: "hls",
          isHls: true,
          headers: streamHeaders,
          behaviorHints: {
            notWebReady: true,
            proxyHeaders: {
              request: streamHeaders
            }
          }
        });
      }
      return streams;
    } catch (e) {
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      if (typeof tmdbId === "object" && tmdbId !== null) {
        mediaType = tmdbId.type || mediaType;
        seasonNum = tmdbId.season || seasonNum;
        episodeNum = tmdbId.episode || episodeNum;
        tmdbId = tmdbId.id;
      }
      var isTv = mediaType === "tv" || mediaType === "series";
      var sNum = parseInt(seasonNum, 10) || 1;
      var eNum = parseInt(episodeNum, 10) || 1;
      var cleanId = String(tmdbId || "").trim();
      if (cleanId.indexOf(":") !== -1 && !cleanId.startsWith("dizipod:")) {
        var cParts = cleanId.split(":");
        if (cParts.length >= 3) {
          var s = parseInt(cParts[cParts.length - 2], 10);
          var e = parseInt(cParts[cParts.length - 1], 10);
          if (!isNaN(s)) sNum = s;
          if (!isNaN(e)) eNum = e;
          isTv = true;
          cleanId = cParts[0];
        }
      }
      var mediaMatch = null;
      if (cleanId.startsWith("dizipod:ep:")) {
        var epParts = cleanId.split(":");
        var directSlug = epParts[2];
        if (epParts[3]) sNum = parseInt(epParts[3], 10) || sNum;
        if (epParts[4]) eNum = parseInt(epParts[4], 10) || eNum;
        isTv = true;
        mediaMatch = { url: BASE_URL + "/diziler/" + directSlug + "/", slug: directSlug };
      } else if (cleanId.startsWith("dizipod:movie:") || cleanId.startsWith("dizipod:show:")) {
        var mParts = cleanId.split(":");
        var mKind = mParts[1];
        var mSlug = mParts[2];
        isTv = mKind === "show";
        mediaMatch = {
          url: isTv ? BASE_URL + "/diziler/" + mSlug + "/" : BASE_URL + "/film/" + mSlug + "/",
          slug: mSlug
        };
      } else {
        var tmdbInfo = yield resolveTmdbInfo(cleanId, isTv ? "tv" : "movie");
        mediaMatch = yield findMediaUrl(tmdbInfo, isTv);
      }
      if (!mediaMatch || !mediaMatch.url) return [];
      var postId = null;
      var pageUrl = mediaMatch.url;
      if (isTv) {
        postId = yield findEpisodePostId(mediaMatch, sNum, eNum);
        pageUrl = BASE_URL + "/" + mediaMatch.slug + "-" + sNum + "-sezon-" + eNum + "-bolum/";
      } else {
        postId = yield findMoviePostId(mediaMatch.url);
      }
      if (!postId) return [];
      var displayName = mediaMatch.slug || "\u0130\xE7erik";
      var streams = yield extractStreamFromPostId(postId, pageUrl, displayName);
      return streams;
    } catch (e2) {
      return [];
    }
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      var type = args && args.type || "series";
      var catUrl = type === "movie" ? BASE_URL + "/filmler/" : BASE_URL + "/trendler/";
      var res = yield fetch(catUrl, { headers: HEADERS, signal: timeoutSignal(8e3) });
      if (!res.ok) return { metas: [] };
      var html = yield res.text();
      var metas = [];
      var seen = {};
      var pattern = /<a[^>]+href="https:\/\/dizipod\.com\/(?:diziler|film)\/([^"/]+)\/?("[^>]*>[\s\S]*?<img[^>]+(?:data-)?src="([^"]+)"[\s\S]*?<div class="title">([^<]+)<\/div>)/g;
      var m;
      while ((m = pattern.exec(html)) !== null) {
        var slug = m[1];
        if (!seen[slug]) {
          seen[slug] = true;
          metas.push({
            id: "dizipod:" + (type === "movie" ? "movie" : "show") + ":" + slug,
            type: type === "movie" ? "movie" : "series",
            name: m[4].replace(/&#8211;/g, "-").replace(/&#8217;/g, "'").trim(),
            poster: m[3],
            description: "DiziPod " + (type === "movie" ? "filmler ar\u015Fivi." : "pop\xFCler diziler katalo\u011Fu.")
          });
        }
      }
      if (type === "movie" && metas.length < 10) {
        try {
          var homeRes = yield fetch(BASE_URL + "/", { headers: HEADERS, signal: timeoutSignal(6e3) });
          if (homeRes.ok) {
            var homeHtml = yield homeRes.text();
            var cardPattern = /<a[^>]+class="[^"]*dp-film-card[^"]*"[^>]+href="https:\/\/dizipod\.com\/film\/([^"/]+)\/?("[^>]*aria-label="([^"]+)"[\s\S]*?<img[^>]+src="([^"]+)")/g;
            var cm;
            while ((cm = cardPattern.exec(homeHtml)) !== null) {
              var cSlug = cm[1];
              if (!seen[cSlug]) {
                seen[cSlug] = true;
                metas.push({
                  id: "dizipod:movie:" + cSlug,
                  type: "movie",
                  name: cm[3].replace(/&#8211;/g, "-").replace(/&#8217;/g, "'").trim(),
                  poster: cm[4],
                  description: "DiziPod filmler ar\u015Fivi."
                });
              }
            }
          }
        } catch (he) {
        }
      }
      return { metas };
    } catch (e) {
      return { metas: [] };
    }
  });
}
function getMeta(args) {
  return __async(this, null, function* () {
    try {
      var id = args && args.id || "";
      if (!id.startsWith("dizipod:")) return { meta: null };
      var parts = id.split(":");
      var kind = parts[1];
      var slug = parts[2];
      if (!slug) return { meta: null };
      var pageUrl = kind === "movie" ? BASE_URL + "/film/" + slug + "/" : BASE_URL + "/diziler/" + slug + "/";
      var res = yield fetch(pageUrl, { headers: HEADERS, signal: timeoutSignal(8e3) });
      if (!res.ok) return { meta: null };
      var html = yield res.text();
      var titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
      var title = titleMatch ? titleMatch[1].replace(/&#8211;/g, "-").replace(/&#8217;/g, "'").trim() : slug;
      var posterMatch = html.match(/class="item"[\s\S]*?<img[^>]+(?:data-)?src="([^"]+)"/) || html.match(/<img[^>]+src="([^"]*(?:thetvdb|tmdb)[^"]*)"/i) || html.match(/<img[^>]+src="([^"]+)"/);
      var poster = posterMatch ? posterMatch[1] : "";
      var videos = [];
      if (kind === "show") {
        var epPattern = /href="https:\/\/dizipod\.com\/[a-z0-9-]+-(\d+)-sezon-(\d+)-bolum\/"/g;
        var seen = {};
        var em;
        while ((em = epPattern.exec(html)) !== null) {
          var s = parseInt(em[1], 10);
          var ep = parseInt(em[2], 10);
          var key = s + ":" + ep;
          if (!seen[key]) {
            seen[key] = true;
            videos.push({
              id: "dizipod:ep:" + slug + ":" + s + ":" + ep,
              title: s + ". Sezon " + ep + ". B\xF6l\xFCm",
              season: s,
              episode: ep
            });
          }
        }
        var seasonLinkPattern = /href="(https:\/\/dizipod\.com\/dizi\/[^\/]+\/[^\/]+-([0-9]+)-sezon\/?)"/g;
        var slm;
        var seasonSeen = {};
        var seasonLinks = [];
        while ((slm = seasonLinkPattern.exec(html)) !== null) {
          if (!seasonSeen[slm[1]]) {
            seasonSeen[slm[1]] = true;
            seasonLinks.push(slm[1]);
          }
        }
        if (seasonLinks.length > 0) {
          var seasonPages = yield Promise.all(seasonLinks.map(function(sUrl) {
            return fetch(sUrl, { headers: HEADERS, signal: timeoutSignal(5e3) }).then(function(r) {
              return r.ok ? r.text() : "";
            }).catch(function() {
              return "";
            });
          }));
          for (var sIdx = 0; sIdx < seasonPages.length; sIdx++) {
            var sHtml = seasonPages[sIdx];
            if (!sHtml) continue;
            var epPattern2 = /href="https:\/\/dizipod\.com\/[a-z0-9-]+-(\d+)-sezon-(\d+)-bolum\/"/g;
            var sem;
            while ((sem = epPattern2.exec(sHtml)) !== null) {
              var ss = parseInt(sem[1], 10);
              var sep = parseInt(sem[2], 10);
              var skey = ss + ":" + sep;
              if (!seen[skey]) {
                seen[skey] = true;
                videos.push({
                  id: "dizipod:ep:" + slug + ":" + ss + ":" + sep,
                  title: ss + ". Sezon " + sep + ". B\xF6l\xFCm",
                  season: ss,
                  episode: sep
                });
              }
            }
          }
        }
        videos.sort(function(a, b) {
          return a.season !== b.season ? a.season - b.season : a.episode - b.episode;
        });
      }
      return {
        meta: {
          id,
          type: kind === "movie" ? "movie" : "series",
          name: title,
          poster,
          videos
        }
      };
    } catch (e) {
      return { meta: null };
    }
  });
}
function sortStreamsByQuality(streams) {
  if (!Array.isArray(streams) || streams.length <= 1) return streams || [];
  function getQualityScore(s) {
    if (!s) return 0;
    var score = 0;
    if (s.quality) {
      var q = String(s.quality).toLowerCase().trim();
      if (/\b(4k|2160p?|uhd)\b/.test(q)) score = 2160;
      else if (/\b(2k|1440p?|qhd)\b/.test(q)) score = 1440;
      else if (/\b(1080p?|fhd|full[\s-]?hd)\b/.test(q)) score = 1080;
      else if (/\b(720p?|hd)\b/.test(q)) score = 720;
      else if (/\b(540p?)\b/.test(q)) score = 540;
      else if (/\b(480p?|sd)\b/.test(q)) score = 480;
      else if (/\b(360p?)\b/.test(q)) score = 360;
      else if (/\b(240p?)\b/.test(q)) score = 240;
    }
    if (!score) {
      var text = [s.title, s.name, s.resolution].filter(Boolean).join(" ").toLowerCase();
      if (/\b(4k|2160p|uhd)\b/.test(text)) score = 2160;
      else if (/\b(2k|1440p|qhd)\b/.test(text)) score = 1440;
      else if (/\b(1080p|fhd|full[\s-]?hd)\b/.test(text)) score = 1080;
      else if (/\b(720p)\b/.test(text)) score = 720;
      else if (/\b(540p)\b/.test(text)) score = 540;
      else if (/\b(480p)\b/.test(text)) score = 480;
      else if (/\b(360p)\b/.test(text)) score = 360;
      else if (/\b(240p)\b/.test(text)) score = 240;
      else if (/\b(hd)\b/.test(text) && !/\b(full[\s-]?hd)\b/.test(text)) score = 720;
      else if (/\b(sd)\b/.test(text)) score = 480;
    }
    if (!score && s.url) {
      var u = String(s.url).toLowerCase();
      if (/[\/_.-](2160p?|4k)[\/_.-]/.test(u)) score = 2160;
      else if (/[\/_.-](1440p?|2k)[\/_.-]/.test(u)) score = 1440;
      else if (/[\/_.-](1080p?|fhd)[\/_.-]/.test(u)) score = 1080;
      else if (/[\/_.-](720p?|hd)[\/_.-]/.test(u)) score = 720;
      else if (/[\/_.-](480p?|sd)[\/_.-]/.test(u)) score = 480;
      else if (/[\/_.-](360p?)[\/_.-]/.test(u)) score = 360;
    }
    var isDirectMp4 = s.format === "mp4" || s.type === "mp4" || !s.isHls && s.url && (s.url.endsWith(".mp4") || s.url.includes(".mp4?"));
    if (isDirectMp4 && score > 0) score += 1;
    return score;
  }
  return streams.slice().sort(function(a, b) {
    return getQualityScore(b) - getQualityScore(a);
  });
}
if (typeof getStreams === "function") {
  _origGetStreams = getStreams;
  getStreams = function() {
    return __async(this, arguments, function* () {
      var res = yield _origGetStreams.apply(this, arguments);
      return sortStreamsByQuality(res);
    });
  };
}
var _origGetStreams;
if (typeof module !== "undefined" && module.exports) {
  module.exports = wrapAll({
    getStreams,
    getCatalog,
    getMeta
  }, cfgReady);
}
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = getStreams;
  globalThis.getCatalog = getCatalog;
  globalThis.getMeta = getMeta;
}

if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
    if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
    if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
    if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
    if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

