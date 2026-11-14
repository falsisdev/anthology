/**
 * Anthology Provider: diziwatch
 * Built from src/diziwatch/index.js
 * Build: v1.8.39 (anthology build system)
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

// src/diziwatch/index.js
var { loadConfig, val, wrapAll } = require_config();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.series.diziwatch.base");
      if (v && String(v).indexOf("diziwatch.ac") === -1) BASE_URL = String(v).replace(/\/+$/, "");
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var BASE_URL = "https://diziwatch.org";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
var HEADERS = {
  "User-Agent": UA,
  "Referer": BASE_URL + "/",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
};
function timeoutSignal(ms) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  var controller = new AbortController();
  setTimeout(function() {
    try {
      controller.abort();
    } catch (e) {
    }
  }, ms);
  return controller.signal;
}
function asciiFold(str) {
  if (!str) return "";
  return String(str).replace(/[çÇ]/g, "c").replace(/[ğĞ]/g, "g").replace(/[ıİiI]/g, function(m) {
    return m === "\u0130" || m === "I" || m === "\u0131" ? "i" : "i";
  }).replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[üÜ]/g, "u").replace(/[âÂ]/g, "a").replace(/[îÎ]/g, "i").replace(/[ûÛ]/g, "u");
}
function ultraClean(str) {
  if (!str) return "";
  return asciiFold(str).toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}
function decodeHtmlEntities(str) {
  if (!str) return "";
  return str.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&uuml;/g, "\xFC").replace(/&ouml;/g, "\xF6").replace(/&ccedil;/g, "\xE7").replace(/&icirc;/g, "\xEE").replace(/&acirc;/g, "\xE2");
}
function unpackPacked(src) {
  if (!src) return null;
  var match = src.match(/eval\(function\s*\(p,a,c,k,e,d\)\{[\s\S]*?\}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\s*\.split\('\|'\),0,\{\}\)\)/);
  if (!match) return null;
  var packed = match[1];
  var radix = parseInt(match[2], 10);
  var count = parseInt(match[3], 10);
  var words = match[4].split("|");
  var out = packed;
  for (var i = 0; i < count; i++) {
    if (!words[i]) continue;
    out = out.replace(new RegExp("\\b" + i.toString(radix) + "\\b", "g"), words[i]);
  }
  return out;
}
function resolveTmdbInfo(id, mediaType) {
  return __async(this, null, function* () {
    try {
      var cleanId = String(id || "").trim();
      if (cleanId.indexOf(":") !== -1) cleanId = cleanId.split(":")[0];
      var numericId = null;
      var titles = [];
      var imdbId = "";
      if (cleanId.indexOf("tt") === 0) {
        imdbId = cleanId;
        var findRes = yield fetch("https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_API_KEY + "&external_source=imdb_id", { signal: timeoutSignal(6e3) });
        if (findRes.ok) {
          var fData = yield findRes.json();
          var item = mediaType === "tv" || mediaType === "series" ? fData.tv_results && fData.tv_results[0] : fData.movie_results && fData.movie_results[0];
          if (!item && fData.tv_results && fData.tv_results.length > 0) item = fData.tv_results[0];
          if (!item && fData.movie_results && fData.movie_results.length > 0) item = fData.movie_results[0];
          if (item) {
            numericId = item.id;
            if (item.name) titles.push(item.name);
            if (item.title) titles.push(item.title);
            if (item.original_name) titles.push(item.original_name);
            if (item.original_title) titles.push(item.original_title);
          }
        }
      } else if (/^\d+$/.test(cleanId)) {
        numericId = cleanId;
      }
      if (numericId) {
        var type = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
        var enRes = yield fetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY, { signal: timeoutSignal(6e3) });
        if (enRes.ok) {
          var enData = yield enRes.json();
          if (enData.name) titles.push(enData.name);
          if (enData.title) titles.push(enData.title);
          if (enData.original_name) titles.push(enData.original_name);
          if (enData.original_title) titles.push(enData.original_title);
          if (enData.external_ids && enData.external_ids.imdb_id) imdbId = enData.external_ids.imdb_id;
        }
        var trRes = yield fetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR", { signal: timeoutSignal(6e3) });
        if (trRes.ok) {
          var trData = yield trRes.json();
          if (trData.name) titles.push(trData.name);
          if (trData.title) titles.push(trData.title);
        }
      }
      var seen = {};
      var uniqueTitles = [];
      for (var j = 0; j < titles.length; j++) {
        var t = decodeHtmlEntities(titles[j]).trim();
        var u = ultraClean(t);
        if (u && !seen[u]) {
          seen[u] = true;
          uniqueTitles.push(t);
        }
      }
      return { titles: uniqueTitles, numericId, imdbId };
    } catch (e) {
      return { titles: [], numericId: id, imdbId: "" };
    }
  });
}
function searchDiziwatch(keyword) {
  return __async(this, null, function* () {
    try {
      if (!keyword) return [];
      var q = encodeURIComponent(keyword.trim());
      try {
        var r1 = yield fetch(BASE_URL + "/api/ara?q=" + q, {
          headers: {
            "User-Agent": UA,
            "Accept": "application/json",
            "Referer": BASE_URL + "/"
          },
          signal: timeoutSignal(6e3)
        });
        if (r1.ok) {
          var arr = yield r1.json();
          if (Array.isArray(arr) && arr.length > 0) {
            return arr.map(function(it) {
              return {
                used_slug: it.slug,
                object_name: it.title || it.slug,
                object_alternative_name: it.originalTitle || "",
                object_related_imdb_id: it.imdbId || "",
                poster: it.poster || "",
                year: it.year || ""
              };
            });
          }
        }
      } catch (e) {
      }
      var body = new URLSearchParams();
      body.set("searchterm", keyword.trim());
      var res = yield fetch(BASE_URL + "/bg/searchcontent", {
        method: "POST",
        headers: {
          "User-Agent": UA,
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
          "Referer": BASE_URL + "/"
        },
        body: body.toString(),
        signal: timeoutSignal(6e3)
      });
      if (!res.ok) return [];
      var json = yield res.json();
      if (json && json.data && json.data.state && Array.isArray(json.data.result)) {
        return json.data.result;
      }
      return [];
    } catch (e) {
      return [];
    }
  });
}
function findBestMatch(results, queries, targetImdbId) {
  if (!results || !results.length) return null;
  if (targetImdbId) {
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      if (r.object_related_imdb_id && r.object_related_imdb_id.trim().toLowerCase() === targetImdbId.trim().toLowerCase()) {
        return r;
      }
    }
  }
  for (var qIdx = 0; qIdx < queries.length; qIdx++) {
    var qClean = ultraClean(queries[qIdx]);
    if (!qClean) continue;
    for (var j = 0; j < results.length; j++) {
      var res = results[j];
      var nameClean = ultraClean(res.object_name);
      var altClean = ultraClean(res.object_alternative_name);
      if (nameClean === qClean || altClean === qClean) {
        return res;
      }
    }
  }
  for (var k = 0; k < queries.length; k++) {
    var queryClean = ultraClean(queries[k]);
    if (!queryClean || queryClean.length < 3) continue;
    for (var l = 0; l < results.length; l++) {
      var it = results[l];
      var itName = ultraClean(it.object_name);
      if (itName && (itName.indexOf(queryClean) !== -1 || queryClean.indexOf(itName) !== -1)) {
        return it;
      }
    }
  }
  return results[0] || null;
}
function resolveAnizmPlayerHash(hash, baseTitle) {
  return __async(this, null, function* () {
    try {
      var res = yield fetch("https://anizmplayer.com/player/index.php?data=" + hash + "&do=getVideo", {
        method: "POST",
        headers: {
          "User-Agent": UA,
          "X-Requested-With": "XMLHttpRequest",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Referer": "https://anizmplayer.com/",
          "Origin": "https://anizmplayer.com"
        },
        body: "hash=" + hash + "&r=" + encodeURIComponent(BASE_URL + "/"),
        signal: timeoutSignal(7e3)
      });
      if (!res.ok) return [];
      var data = yield res.json();
      var streamUrl = data && (data.videoSource || data.securedLink);
      if (!streamUrl) return [];
      var playUrl = streamUrl.indexOf(".txt") !== -1 ? streamUrl + "#.m3u8" : streamUrl;
      var hs = { "User-Agent": UA, "Referer": "https://anizmplayer.com/" };
      return [{
        name: "DiziWatch",
        title: baseTitle + " | AnizmPlayer [1080p HLS]",
        url: playUrl,
        quality: "1080p",
        format: "hls",
        isHls: true,
        contentLanguage: "tr",
        provider: "diziwatch",
        headers: hs,
        behaviorHints: { notWebReady: false, proxyHeaders: { request: hs } }
      }];
    } catch (e) {
      return [];
    }
  });
}
function resolveSibnetEmbed(embedUrl, baseTitle) {
  return __async(this, null, function* () {
    try {
      var fullUrl = embedUrl.indexOf("//") === 0 ? "https:" + embedUrl : embedUrl;
      var res = yield fetch(fullUrl, {
        headers: { "User-Agent": UA, "Referer": BASE_URL + "/" },
        signal: timeoutSignal(7e3)
      });
      if (!res.ok) return [];
      var html = yield res.text();
      var m = html.match(/player\.src\(\[\{src:\s*["']?([^"'\s>]+)/i);
      if (!m) return [];
      var videoPath = m[1];
      var videoUrl = videoPath.indexOf("http") === 0 ? videoPath : "https://video.sibnet.ru" + videoPath;
      var hs = { "User-Agent": UA, "Referer": "https://video.sibnet.ru/" };
      return [{
        name: "DiziWatch",
        title: baseTitle + " | Sibnet [720p MP4]",
        url: videoUrl,
        quality: "720p",
        format: "mp4",
        isHls: false,
        contentLanguage: "tr",
        provider: "diziwatch",
        headers: hs,
        behaviorHints: { notWebReady: false, proxyHeaders: { request: hs } }
      }];
    } catch (e) {
      return [];
    }
  });
}
function resolveOkRuEmbed(embedUrl, baseTitle) {
  return __async(this, null, function* () {
    try {
      var fullUrl = embedUrl.indexOf("//") === 0 ? "https:" + embedUrl : embedUrl;
      var res = yield fetch(fullUrl, {
        headers: { "User-Agent": UA, "Referer": "https://ok.ru/" },
        signal: timeoutSignal(7e3)
      });
      if (!res.ok) return [];
      var html = yield res.text();
      var m = html.match(/data-options=["']([^"']+)["']/i);
      if (!m) return [];
      var opts = JSON.parse(decodeHtmlEntities(m[1]));
      var fv = opts.flashvars || {};
      var meta = fv.metadata;
      if (typeof meta === "string") {
        try {
          meta = JSON.parse(meta);
        } catch (e) {
          meta = null;
        }
      }
      var vids = meta && meta.videos ? meta.videos : fv.videos || [];
      var nameMap = { "ultra": "2160p", "quad": "1440p", "full": "1080p", "hd": "720p", "sd": "480p", "low": "360p", "lowest": "240p", "mobile": "240p" };
      var out = [];
      var hs = { "User-Agent": UA, "Referer": "https://ok.ru/" };
      for (var i = 0; i < vids.length; i++) {
        var v = vids[i];
        if (!v || !v.url) continue;
        var q = nameMap[String(v.name).toLowerCase()] || v.name || "720p";
        out.push({
          name: "DiziWatch",
          title: baseTitle + " | Ok.ru [" + q.toUpperCase() + " MP4]",
          url: v.url,
          quality: q,
          format: "mp4",
          isHls: false,
          contentLanguage: "tr",
          provider: "diziwatch",
          headers: hs,
          behaviorHints: { notWebReady: false, proxyHeaders: { request: hs } }
        });
      }
      var hlsUrl = meta && meta.hlsManifestUrl ? meta.hlsManifestUrl : fv.hlsManifestUrl;
      if (hlsUrl) {
        out.push({
          name: "DiziWatch",
          title: baseTitle + " | Ok.ru [1080p HLS]",
          url: hlsUrl,
          quality: "1080p",
          format: "hls",
          isHls: true,
          contentLanguage: "tr",
          provider: "diziwatch",
          headers: hs,
          behaviorHints: { notWebReady: false, proxyHeaders: { request: hs } }
        });
      }
      return out;
    } catch (e) {
      return [];
    }
  });
}
function extractEpisodeStreams(usedSlug, showName, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      var cleanSlug = usedSlug.replace(/^\//, "").replace(/^dizi\//, "");
      var epUrl = BASE_URL + "/dizi/" + cleanSlug + "/sezon-" + seasonNum + "/bolum-" + episodeNum;
      var res = yield fetch(epUrl, {
        headers: HEADERS,
        signal: timeoutSignal(8e3)
      });
      if (!res.ok) return [];
      var html = yield res.text();
      var epLabel = "S" + (seasonNum < 10 ? "0" + seasonNum : seasonNum) + "E" + (episodeNum < 10 ? "0" + episodeNum : episodeNum);
      var baseTitle = "\u231C DiziWatch \u231F | " + (showName || cleanSlug) + " " + epLabel;
      var tasks = [];
      var seenHashes = {};
      var apMatches = html.match(/https?:\/\/anizmplayer\.com\/video\/([a-f0-9]{16,64})/gi) || [];
      for (var i = 0; i < apMatches.length; i++) {
        var hm = apMatches[i].match(/\/video\/([a-f0-9]+)/i);
        if (hm && !seenHashes[hm[1]]) {
          seenHashes[hm[1]] = true;
          tasks.push(resolveAnizmPlayerHash(hm[1], baseTitle));
        }
      }
      var okMatches = html.match(/https?:\/\/ok\.ru\/videoembed\/\d+/gi) || [];
      var seenOk = {};
      for (var j = 0; j < okMatches.length; j++) {
        if (!seenOk[okMatches[j]]) {
          seenOk[okMatches[j]] = true;
          tasks.push(resolveOkRuEmbed(okMatches[j], baseTitle));
        }
      }
      var sibMatches = html.match(/https?:\/\/video\.sibnet\.ru\/shell\.php\?videoid=\d+/gi) || [];
      var seenSib = {};
      for (var k = 0; k < sibMatches.length; k++) {
        if (!seenSib[sibMatches[k]]) {
          seenSib[sibMatches[k]] = true;
          tasks.push(resolveSibnetEmbed(sibMatches[k], baseTitle));
        }
      }
      var nested = yield Promise.all(tasks);
      var allStreams = [];
      var seenUrls = {};
      for (var n = 0; n < nested.length; n++) {
        var list = nested[n] || [];
        for (var m = 0; m < list.length; m++) {
          if (list[m] && list[m].url && !seenUrls[list[m].url]) {
            seenUrls[list[m].url] = true;
            allStreams.push(list[m]);
          }
        }
      }
      if (allStreams.length > 0) return allStreams;
      var iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
      if (iframeMatch && iframeMatch[1]) {
        var src2 = iframeMatch[1].trim();
        if (src2.indexOf("http") !== 0) {
          src2 = src2.indexOf("//") === 0 ? "https:" + src2 : "https://" + src2;
        }
        return extractPichiveStreams(src2, showName, seasonNum, episodeNum);
      }
      return [];
    } catch (e) {
      return [];
    }
  });
}
function extractPichiveStreams(iframeUrl, showName, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    var streams = [];
    if (!iframeUrl) return streams;
    var epLabel = "S" + (seasonNum < 10 ? "0" + seasonNum : seasonNum) + "E" + (episodeNum < 10 ? "0" + episodeNum : episodeNum);
    var baseTitle = "\u231C DiziWatch \u231F | " + (showName || "DiziWatch") + " " + epLabel;
    try {
      var res = yield fetch(iframeUrl, {
        headers: {
          "User-Agent": UA,
          "Referer": BASE_URL + "/",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        },
        signal: timeoutSignal(6e3)
      });
      if (res.ok) {
        var html = yield res.text();
        var unpacked = unpackPacked(html) || html;
        var fileMatch = unpacked.match(/file["']?\s*:\s*["']([^"']+)["']/i) || unpacked.match(/(https?:\/\/[^"'\s]+\.(?:m3u8|mp4)[^"'\s]*)/i);
        if (fileMatch && fileMatch[1]) {
          var videoUrl = fileMatch[1].replace(/\\\//g, "/");
          var isHls = videoUrl.indexOf(".m3u8") !== -1;
          streams.push({
            name: "DiziWatch",
            title: baseTitle + " [1080p FHD]",
            url: videoUrl,
            quality: "1080p",
            format: isHls ? "hls" : "mp4",
            isHls,
            contentLanguage: "tr",
            provider: "diziwatch",
            behaviorHints: {
              notWebReady: false
            },
            headers: {
              "Referer": BASE_URL + "/",
              "User-Agent": UA
            }
          });
        }
      }
    } catch (e) {
    }
    if (streams.length === 0) {
      streams.push({
        name: "DiziWatch",
        title: baseTitle + " [Player - TR Altyaz\u0131l\u0131]",
        url: iframeUrl,
        quality: "1080p",
        format: "hls",
        isHls: true,
        contentLanguage: "tr",
        provider: "diziwatch",
        behaviorHints: {
          notWebReady: false
        },
        headers: {
          "Referer": BASE_URL + "/",
          "User-Agent": UA
        }
      });
    }
    return streams;
  });
}
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      if (typeof tmdbId === "object" && tmdbId && tmdbId.id) {
        return getStreams(tmdbId.id, mediaType || tmdbId.type, seasonNum || tmdbId.season, episodeNum || tmdbId.episode);
      }
      var cleanId = String(tmdbId || "").trim();
      var season = parseInt(seasonNum) || 1;
      var episode = parseInt(episodeNum) || 1;
      if (cleanId.indexOf(":") !== -1 && cleanId.indexOf("diziwatch:") !== 0) {
        var idParts = cleanId.split(":");
        if (idParts.length >= 3) {
          season = parseInt(idParts[idParts.length - 2]) || season;
          episode = parseInt(idParts[idParts.length - 1]) || episode;
          cleanId = idParts[0];
        }
      }
      if (cleanId.indexOf("diziwatch:ep:") === 0) {
        var parts = cleanId.replace("diziwatch:ep:", "").split(":");
        var slug = parts[0];
        if (parts.length >= 3) {
          season = parseInt(parts[1]) || season;
          episode = parseInt(parts[2]) || episode;
        }
        return yield extractEpisodeStreams(slug, slug, season, episode);
      }
      if (cleanId.indexOf("diziwatch:show:") === 0) {
        var showSlug = cleanId.replace("diziwatch:show:", "");
        return yield extractEpisodeStreams(showSlug, showSlug, season, episode);
      }
      var tmdbInfo = yield resolveTmdbInfo(cleanId, mediaType);
      var queries = tmdbInfo.titles || [];
      if (queries.length === 0 && cleanId.indexOf("tt") !== 0 && !/^\d+$/.test(cleanId)) {
        queries.push(cleanId);
      }
      if (queries.length === 0) return [];
      var chosenResult = null;
      for (var i = 0; i < queries.length; i++) {
        var results = yield searchDiziwatch(queries[i]);
        if (results && results.length > 0) {
          chosenResult = findBestMatch(results, queries, tmdbInfo.imdbId);
          if (chosenResult) break;
        }
      }
      if (!chosenResult || !chosenResult.used_slug) {
        var fallbackSlug = ultraClean(queries[0]).replace(/\s+/g, "-");
        if (fallbackSlug) {
          return yield extractEpisodeStreams(fallbackSlug, queries[0], season, episode);
        }
        return [];
      }
      return yield extractEpisodeStreams(chosenResult.used_slug, chosenResult.object_name, season, episode);
    } catch (e) {
      return [];
    }
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      var query = args && args.search || args && args.extra && args.extra.search || args && args.query || "";
      if (query) {
        var sRes = yield searchDiziwatch(query);
        return {
          metas: sRes.map(function(r) {
            return {
              id: "diziwatch:show:" + r.used_slug,
              type: "series",
              name: r.object_name,
              poster: r.poster || ""
            };
          })
        };
      }
      var res = yield fetch(BASE_URL + "/", {
        headers: HEADERS,
        signal: timeoutSignal(8e3)
      });
      if (!res.ok) return { metas: [] };
      var html = yield res.text();
      var metas = [];
      var seen = {};
      var linkRegex = /href=["'](?:https?:\/\/[^"'/]+)?\/dizi\/([a-z0-9-]+)["']/gi;
      var m;
      while ((m = linkRegex.exec(html)) !== null) {
        var slug = m[1];
        if (!slug || seen[slug]) continue;
        seen[slug] = true;
        var title = slug.split("-").map(function(w) {
          return w ? w.charAt(0).toUpperCase() + w.slice(1) : "";
        }).join(" ");
        metas.push({
          id: "diziwatch:show:" + slug,
          type: "series",
          name: title,
          poster: "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
          description: title + " - DiziWatch T\xFCrk\xE7e Altyaz\u0131l\u0131"
        });
        if (metas.length >= 30) break;
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
      var id = args && args.id || args;
      if (!id) return { meta: null };
      var slug = "";
      if (String(id).indexOf("diziwatch:show:") === 0) {
        slug = id.replace("diziwatch:show:", "");
      } else if (String(id).indexOf("diziwatch:ep:") === 0) {
        slug = id.replace("diziwatch:ep:", "").split(":")[0];
      } else {
        var info = yield resolveTmdbInfo(id, "series");
        if (info && info.titles && info.titles.length) {
          var sResults = yield searchDiziwatch(info.titles[0]);
          var best = findBestMatch(sResults, info.titles, info.imdbId);
          if (best && best.used_slug) {
            slug = best.used_slug.replace(/^\//, "").replace(/^dizi\//, "");
          }
        }
      }
      if (!slug) return { meta: null };
      var res = yield fetch(BASE_URL + "/dizi/" + slug, { headers: HEADERS, signal: timeoutSignal(8e3) });
      if (!res.ok) return { meta: null };
      var html = yield res.text();
      var titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      var name = titleMatch ? titleMatch[1].replace(/\s*-\s*diziwatch.*$/i, "").replace(/\s*izle.*$/i, "").trim() : slug;
      var posterMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/<img[^>]+src=["'](https:\/\/image\.tmdb\.org\/t\/p\/[^"']+)["']/i);
      var poster = posterMatch ? posterMatch[1] : "";
      var epRegex = /href=['"]?(?:https?:\/\/[^"'/]+)?\/dizi\/([^\s'"/]+)\/sezon-(\d+)\/bolum-(\d+)/gi;
      var videos = [];
      var seenVids = {};
      var m;
      while ((m = epRegex.exec(html)) !== null) {
        var s = parseInt(m[2]) || 1;
        var e = parseInt(m[3]) || 1;
        var vidId = "diziwatch:ep:" + slug + ":" + s + ":" + e;
        if (!seenVids[vidId]) {
          seenVids[vidId] = true;
          videos.push({
            id: vidId,
            title: s + ". Sezon " + e + ". B\xF6l\xFCm",
            season: s,
            episode: e
          });
        }
      }
      return {
        meta: {
          id: "diziwatch:show:" + slug,
          type: "series",
          name,
          poster,
          videos
        }
      };
    } catch (e2) {
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
if (typeof module !== "undefined") {
  module.exports = wrapAll({ getStreams, getCatalog, getMeta }, cfgReady);
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

