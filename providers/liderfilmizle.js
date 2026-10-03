/**
 * Anthology Provider: liderfilmizle
 * Built from src/liderfilmizle/index.js
 * Build: v1.8.24 (anthology build system)
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

// src/shared/quality.js
var require_quality = __commonJS({
  "src/shared/quality.js"(exports2, module2) {
    function getQualityScore(s) {
      if (!s) return 0;
      if (!s.url) return 1;
      var q = ((s.quality || "") + " " + (s.title || "") + " " + (s.name || "")).toLowerCase();
      var score = 0;
      if (/\b(4k|2160p?|uhd)\b/.test(q)) score = 2160;
      else if (/\b(2k|1440p?|qhd)\b/.test(q)) score = 1440;
      else if (/\b(1080p?|fhd)\b/.test(q)) score = 1080;
      else if (/\b(720p?|hd)\b/.test(q)) score = 720;
      else if (/\b(540p?)\b/.test(q)) score = 540;
      else if (/\b(480p?|sd)\b/.test(q)) score = 480;
      else if (/\b(360p?)\b/.test(q)) score = 360;
      else if (/\b(240p?)\b/.test(q)) score = 240;
      if (score === 0 && s.title) {
        var text = s.title.toLowerCase();
        if (/\b(4k|2160p|uhd)\b/.test(text)) score = 2160;
        else if (/\b(2k|1440p|qhd)\b/.test(text)) score = 1440;
        else if (/\b(1080p|fhd)\b/.test(text)) score = 1080;
        else if (/\b(720p|hd)\b/.test(text)) score = 720;
        else if (/\b(480p|sd)\b/.test(text)) score = 480;
        else if (/\b(360p)\b/.test(text)) score = 360;
        else if (/\b(240p)\b/.test(text)) score = 240;
      }
      if (score === 0 && s.url) {
        var u = s.url.toLowerCase();
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
    function sortStreamsByQuality2(streams) {
      if (!Array.isArray(streams) || streams.length === 0) return streams;
      return streams.slice().sort(function(a, b) {
        return getQualityScore(b) - getQualityScore(a);
      });
    }
    module2.exports = {
      getQualityScore,
      sortStreamsByQuality: sortStreamsByQuality2
    };
  }
});

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

// src/liderfilmizle/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.movies.liderfilmizle.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      v = val("urls.movies.liderfilmizle.play_base");
      if (v) PLAY_BASE = String(v).replace(/\/+$/, "");
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var BASE_URL = "https://liderfilmizle.vip";
var PLAY_BASE = "https://play.liderfilm.cc";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
var HEADERS = {
  "User-Agent": UA,
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "Referer": BASE_URL + "/"
};
function ultraClean(str) {
  if (!str) return "";
  return str.toString().toLowerCase().replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[^a-z0-9]/g, "").trim();
}
function fetchWithTimeout(url, options, ms) {
  var opts = options || {};
  try {
    if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) {
      opts.signal = AbortSignal.timeout(ms || 12e3);
    }
  } catch (e) {
  }
  return fetch(url, opts);
}
function resolveTmdbInfo(id, mediaType) {
  return __async(this, null, function* () {
    try {
      var cleanId = String(id || "").trim();
      if (cleanId.includes(":")) cleanId = cleanId.split(":")[0];
      var numericId = null;
      var title = "";
      var origTitle = "";
      if (cleanId.startsWith("tt")) {
        var findRes = yield fetchWithTimeout("https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_API_KEY + "&external_source=imdb_id", {}, 1e4);
        if (findRes.ok) {
          var fd = yield findRes.json();
          var match = mediaType === "tv" || mediaType === "series" ? fd.tv_results && fd.tv_results[0] : fd.movie_results && fd.movie_results[0];
          var item = match || fd.movie_results && fd.movie_results[0] || fd.tv_results && fd.tv_results[0];
          if (item) {
            title = item.name || item.title || "";
            origTitle = item.original_name || item.original_title || "";
            numericId = item.id;
          }
        }
      } else if (/^\d+$/.test(cleanId)) {
        numericId = cleanId;
        var type = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
        var tRes = yield fetchWithTimeout("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR", {}, 1e4);
        if (tRes.ok) {
          var td = yield tRes.json();
          title = td.name || td.title || "";
          origTitle = td.original_name || td.original_title || "";
        }
      } else {
        title = cleanId;
      }
      return { title, origTitle, numericId };
    } catch (e) {
      return { title: String(id || ""), origTitle: "", numericId: id };
    }
  });
}
function searchLider(query) {
  return __async(this, null, function* () {
    if (!query) return [];
    try {
      var res = yield fetchWithTimeout(BASE_URL + "/api/search.php?q=" + encodeURIComponent(query), {
        headers: {
          "User-Agent": UA,
          "Referer": BASE_URL + "/"
        }
      }, 8e3);
      if (!res.ok) return [];
      var data = yield res.json().catch(function() {
        return null;
      });
      return data && Array.isArray(data.results) ? data.results : [];
    } catch (e) {
      return [];
    }
  });
}
function resolveSourceStream(sourceUrl, pageUrl) {
  return __async(this, null, function* () {
    try {
      if (!sourceUrl || sourceUrl.includes("youtube.com")) return null;
      if (sourceUrl.includes("/vod/")) {
        var vRes = yield fetchWithTimeout(sourceUrl, {
          headers: { "User-Agent": UA, "Referer": pageUrl }
        }, 15e3);
        if (!vRes.ok) return null;
        var vHtml = yield vRes.text();
        var sourceMatch = vHtml.match(/file:\s*["'](\/player\/stream\.php\?url=[^"']+)["']/i) || vHtml.match(/sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/i);
        if (!sourceMatch) return null;
        var streamPath = sourceMatch[1].replace(/\\/g, "");
        var streamUrl = streamPath.startsWith("http") ? streamPath : new URL(streamPath, sourceUrl).href;
        var subtitles = [];
        var trackRe = /file:\s*["']([^"']+\.vtt[^"']*)["']\s*,\s*label:\s*["']([^"']+)["']/gi;
        var tm;
        var subIdx = 0;
        while ((tm = trackRe.exec(vHtml)) !== null) {
          var subUrl = tm[1].replace(/\\/g, "");
          var label = tm[2];
          var lowerLabel = label.toLowerCase();
          var lang = "tr";
          if (lowerLabel.includes("ing") || lowerLabel.includes("eng")) lang = "en";
          subtitles.push({
            id: "lider_sub_" + subIdx++,
            url: subUrl,
            file: subUrl,
            lang: lang === "tr" ? "tur" : "eng",
            language: lang,
            label,
            format: "vtt",
            type: "text/vtt",
            mimeType: "text/vtt"
          });
        }
        return {
          streamUrl,
          quality: "1080p",
          subtitles,
          headers: { "User-Agent": UA, "Referer": sourceUrl }
        };
      }
      var pRes = yield fetchWithTimeout(sourceUrl, {
        headers: { "User-Agent": UA, "Referer": pageUrl }
      }, 15e3);
      if (!pRes.ok) return null;
      var pHtml = yield pRes.text();
      var ifrMatch = pHtml.match(/<iframe[^>]+src=["']([^"']+)["']/i);
      if (!ifrMatch) return null;
      var innerEmbedUrl = ifrMatch[1];
      var innerRes = yield fetchWithTimeout(innerEmbedUrl, {
        headers: { "User-Agent": UA, "Referer": sourceUrl }
      }, 15e3);
      if (!innerRes.ok) return null;
      var innerHtml = yield innerRes.text();
      var dlMatch = innerHtml.match(/fetch\(['"](\/dl\?[^'"]+)['"]\)/);
      if (!dlMatch) return null;
      var dlPath = dlMatch[1];
      var dlUrl = new URL(dlPath, innerEmbedUrl).href;
      var innerOrigin = new URL(innerEmbedUrl).origin;
      var dlRes = yield fetchWithTimeout(dlUrl, {
        headers: {
          "User-Agent": UA,
          "Referer": innerEmbedUrl,
          "Origin": innerOrigin
        }
      }, 15e3);
      if (!dlRes.ok) return null;
      var dlData = yield dlRes.json().catch(function() {
        return null;
      });
      if (dlData && dlData.url) {
        return {
          streamUrl: dlData.url,
          quality: "1080p",
          subtitles: [],
          headers: { "User-Agent": UA, "Referer": innerOrigin + "/" }
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  });
}
function extractStreamsFromPage(pageUrl) {
  return __async(this, null, function* () {
    try {
      var res = yield fetchWithTimeout(pageUrl, {
        headers: { "User-Agent": UA, "Referer": BASE_URL + "/" }
      }, 1e4);
      if (!res.ok) return [];
      var html = yield res.text();
      var vsMatch = html.match(/window\._vs\s*=\s*['"]([^'"]+)['"]/);
      if (!vsMatch) return [];
      var sources = [];
      try {
        var decoded = typeof Buffer !== "undefined" ? Buffer.from(vsMatch[1], "base64").toString("utf-8") : atob(vsMatch[1]);
        sources = JSON.parse(decoded);
      } catch (e) {
        return [];
      }
      var streams = [];
      for (var i = 0; i < sources.length; i++) {
        var src = sources[i];
        if (!src.url || src.id === "trailer" || src.url.includes("youtube.com")) continue;
        var resolved = yield resolveSourceStream(src.url, pageUrl);
        if (resolved && resolved.streamUrl) {
          var playUrl = resolved.streamUrl.includes("#") ? resolved.streamUrl : resolved.streamUrl + "#.m3u8";
          streams.push({
            name: "LiderFilm",
            title: "LiderFilm - " + resolved.quality + " [TR / DUAL]",
            url: playUrl,
            quality: resolved.quality,
            format: "hls",
            isHls: true,
            contentLanguage: ["tr"],
            headers: resolved.headers,
            behaviorHints: {
              headers: resolved.headers
            },
            subtitles: resolved.subtitles || []
          });
        }
      }
      return streams;
    } catch (e) {
      return [];
    }
  });
}
function getStreams(tmdbIdOrArgs, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      var rawId = tmdbIdOrArgs;
      var sNum = seasonNum || 1;
      var eNum = episodeNum || 1;
      var mType = mediaType || "movie";
      if (typeof tmdbIdOrArgs === "object" && tmdbIdOrArgs !== null) {
        rawId = tmdbIdOrArgs.id || tmdbIdOrArgs.url || "";
        mType = tmdbIdOrArgs.type || tmdbIdOrArgs.mediaType || mType;
        sNum = tmdbIdOrArgs.season || tmdbIdOrArgs.seasonNum || sNum;
        eNum = tmdbIdOrArgs.episode || tmdbIdOrArgs.episodeNum || eNum;
      }
      rawId = String(rawId || "").trim();
      if (rawId.startsWith("http://") || rawId.startsWith("https://")) {
        return yield extractStreamsFromPage(rawId);
      }
      if (rawId.startsWith("liderfilm:")) {
        var parts = rawId.split(":");
        var type = parts[1];
        var slug = parts[2];
        if (parts[3] && /^\d+$/.test(parts[3])) sNum = parseInt(parts[3], 10);
        if (parts[4] && /^\d+$/.test(parts[4])) eNum = parseInt(parts[4], 10);
        var pageUrl = type === "tv" || type === "series" ? BASE_URL + "/dizi/" + slug + "/sezon-" + sNum + "/bolum-" + eNum : BASE_URL + "/" + slug;
        return yield extractStreamsFromPage(pageUrl);
      }
      var tmdb = yield resolveTmdbInfo(rawId, mType);
      var titlesToSearch = [tmdb.title, tmdb.origTitle].filter(Boolean);
      if (titlesToSearch.length === 0 && rawId) titlesToSearch.push(rawId);
      var bestMatch = null;
      var isSeries = mType === "tv" || mType === "series";
      for (var i = 0; i < titlesToSearch.length; i++) {
        var q = titlesToSearch[i];
        var results = yield searchLider(q);
        if (!results || results.length === 0) continue;
        var typeFiltered = results.filter(function(r2) {
          return isSeries ? r2.type === "series" : r2.type === "movie";
        });
        var pool = typeFiltered.length > 0 ? typeFiltered : results;
        var targetClean = ultraClean(q);
        for (var j = 0; j < pool.length; j++) {
          var r = pool[j];
          if (ultraClean(r.title) === targetClean || ultraClean(r.original_title) === targetClean) {
            bestMatch = r;
            break;
          }
        }
        if (!bestMatch && pool[0]) {
          bestMatch = pool[0];
        }
        if (bestMatch) break;
      }
      if (!bestMatch || !bestMatch.slug) return [];
      var targetPageUrl = isSeries ? BASE_URL + "/dizi/" + bestMatch.slug + "/sezon-" + sNum + "/bolum-" + eNum : BASE_URL + "/" + bestMatch.slug;
      return yield extractStreamsFromPage(targetPageUrl);
    } catch (e) {
      return [];
    }
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      var catalogId = args && args.id || "anthology_liderfilm_movies";
      var searchQuery = args && (args.search || args.extra && args.extra.search) || "";
      if (searchQuery) {
        var results = yield searchLider(searchQuery);
        var searchMetas = results.map(function(r) {
          var isTv = r.type === "series";
          return {
            id: "liderfilm:" + (isTv ? "tv" : "movie") + ":" + r.slug,
            type: isTv ? "tv" : "movie",
            name: r.title || r.original_title || r.slug,
            poster: r.poster || "",
            description: r.year ? String(r.year) : "",
            releaseInfo: r.year ? String(r.year) : void 0
          };
        });
        return { metas: searchMetas };
      }
      var isSeries = catalogId.includes("series") || catalogId.includes("dizi");
      var pageUrl = isSeries ? BASE_URL + "/diziler/?sayfa=1" : BASE_URL + "/kesfet/filmler/?sayfa=1";
      var res = yield fetchWithTimeout(pageUrl, { headers: { "User-Agent": UA } }, 1e4);
      if (!res.ok) return { metas: [] };
      var html = yield res.text();
      var metas = [];
      var seenSlugs = /* @__PURE__ */ new Set();
      if (isSeries) {
        var sRe = /<a\s+href="\/dizi\/([^"\/]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]+alt="([^"]+)"/gi;
        var sm;
        while ((sm = sRe.exec(html)) !== null) {
          var sSlug = sm[1];
          if (seenSlugs.has(sSlug)) continue;
          seenSlugs.add(sSlug);
          metas.push({
            id: "liderfilm:tv:" + sSlug,
            type: "tv",
            name: sm[3].trim(),
            poster: sm[2]
          });
        }
      } else {
        var mRe = /<a\s+href="\/([^"\/]+)"\s+class="movie-card"[\s\S]*?<img[^>]+src="([^"]+)"[^>]+alt="([^"]+)"/gi;
        var mm;
        while ((mm = mRe.exec(html)) !== null) {
          var mSlug = mm[1];
          if (seenSlugs.has(mSlug) || mSlug === "diziler" || mSlug === "kesfet") continue;
          seenSlugs.add(mSlug);
          metas.push({
            id: "liderfilm:movie:" + mSlug,
            type: "movie",
            name: mm[3].trim(),
            poster: mm[2]
          });
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
      var rawId = args && (args.id || args) || "";
      if (!rawId.startsWith("liderfilm:")) return null;
      var parts = rawId.split(":");
      var type = parts[1];
      var slug = parts[2];
      var isTv = type === "tv" || type === "series";
      var pageUrl = isTv ? BASE_URL + "/dizi/" + slug : BASE_URL + "/" + slug;
      var res = yield fetchWithTimeout(pageUrl, { headers: { "User-Agent": UA } }, 1e4);
      if (!res.ok) return null;
      var html = yield res.text();
      var titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([\s\S]*?)<\/title>/i);
      var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").replace(/izle.*$/i, "").trim() : slug;
      var descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
      var desc = descMatch ? descMatch[1] : "";
      var posterMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i);
      var poster = posterMatch ? posterMatch[1] : "";
      var meta = {
        id: rawId,
        type: isTv ? "tv" : "movie",
        name: title,
        poster,
        background: poster,
        description: desc
      };
      if (isTv) {
        var videos = [];
        var epRe = /href="\/dizi\/[^"\/]+\/sezon-(\d+)\/bolum-(\d+)"[^>]*class="episode-thumb"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<span class="episode-number">([^<]+)<\/span>/gi;
        var em;
        var seenEp = /* @__PURE__ */ new Set();
        while ((em = epRe.exec(html)) !== null) {
          var season = parseInt(em[1], 10);
          var episode = parseInt(em[2], 10);
          var epKey = season + "_" + episode;
          if (seenEp.has(epKey)) continue;
          seenEp.add(epKey);
          videos.push({
            id: rawId + ":" + season + ":" + episode,
            title: em[4].trim(),
            season,
            episode,
            thumbnail: em[3]
          });
        }
        if (videos.length > 0) meta.videos = videos;
      }
      return { meta };
    } catch (e) {
      return null;
    }
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
  module.exports = wrapAll({ getStreams, getCatalog, getMeta }, cfgReady);
}

if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
    if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
    if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
    if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
    if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

