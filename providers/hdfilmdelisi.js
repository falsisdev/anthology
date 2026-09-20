/**
 * Anthology Provider: hdfilmdelisi
 * Built from src/hdfilmdelisi/index.js
 * Build Date: 2026-09-20T20:49:56.242Z
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

// src/hdfilmdelisi/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.movies.hdfilmdelisi.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var BASE_URL = "https://hdfilmdelisi.one";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "Referer": BASE_URL + "/"
};
var VIDMODY_HEADERS = {
  "User-Agent": HEADERS["User-Agent"],
  "Referer": "https://vidmody.com/",
  "Origin": "https://player.vidmody.com"
};
function ultraClean(str) {
  if (!str) return "";
  return str.toString().toLowerCase().replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[^a-z0-9]/g, "").trim();
}
function fetchWithTimeout(url, options, ms) {
  var opts = options || {};
  try {
    if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) {
      opts.signal = AbortSignal.timeout(ms || 15e3);
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
      var title = "";
      var origTitle = "";
      if (cleanId.startsWith("tt")) {
        var findRes = yield fetchWithTimeout("https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_API_KEY + "&external_source=imdb_id", {}, 1e4);
        if (findRes.ok) {
          var fd = yield findRes.json();
          var match = mediaType === "tv" || mediaType === "series" ? fd.tv_results && fd.tv_results[0] : fd.movie_results && fd.movie_results[0];
          if (!match) match = fd.movie_results && fd.movie_results[0] || fd.tv_results && fd.tv_results[0];
          if (match) {
            title = match.name || match.title || "";
            origTitle = match.original_name || match.original_title || "";
          }
        }
      } else {
        var type = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
        var tRes = yield fetchWithTimeout("https://api.themoviedb.org/3/" + type + "/" + cleanId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR", {}, 1e4);
        if (tRes.ok) {
          var td = yield tRes.json();
          title = td.name || td.title || "";
          origTitle = td.original_name || td.original_title || "";
        }
      }
      return { title, origTitle };
    } catch (e) {
      return { title: "", origTitle: "" };
    }
  });
}
function apiSearch(query) {
  return __async(this, null, function* () {
    try {
      var res = yield fetchWithTimeout(BASE_URL + "/api/search?q=" + encodeURIComponent(query), {
        headers: { "User-Agent": HEADERS["User-Agent"], "Referer": BASE_URL + "/" }
      }, 15e3);
      if (!res.ok) return [];
      var data = yield res.json();
      return data && (data.results || data.films) || [];
    } catch (e) {
      return [];
    }
  });
}
function pickBest(results, title) {
  if (!results || results.length === 0) return null;
  var cleanTarget = ultraClean(title);
  var nameOf = function(r) {
    return r.baslik || r.orijinalBaslik || r.title || "";
  };
  for (var i = 0; i < results.length; i++) {
    if (ultraClean(nameOf(results[i])) === cleanTarget) return results[i];
  }
  for (var j = 0; j < results.length; j++) {
    var c = ultraClean(nameOf(results[j]));
    if (c.includes(cleanTarget) || cleanTarget.includes(c)) return results[j];
  }
  return results[0];
}
function vidmodyDecrypt(hex, key) {
  try {
    var sb = "";
    for (var i = 0; i < hex.length; i += 2) {
      sb += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    var rev = sb.split("").reverse().join("");
    var decoded;
    if (typeof Buffer !== "undefined") {
      decoded = Buffer.from(rev, "base64");
    } else if (typeof atob === "function") {
      var bin = atob(rev);
      decoded = [];
      for (var k = 0; k < bin.length; k++) decoded.push(bin.charCodeAt(k));
    } else {
      return "";
    }
    var out = "";
    for (var b = 0; b < decoded.length; b++) {
      var byte = typeof decoded[b] === "number" ? decoded[b] : decoded.charCodeAt(b);
      out += String.fromCharCode((byte - key + 256) % 256);
    }
    return out.replace(/\\x([0-9a-fA-F]{2})/g, function(m, h) {
      return String.fromCharCode(parseInt(h, 16));
    });
  } catch (e) {
    return "";
  }
}
function extractVidmodyFile(pageUrl) {
  return __async(this, null, function* () {
    try {
      var res = yield fetchWithTimeout(pageUrl, { headers: HEADERS }, 15e3);
      if (!res.ok) return null;
      var html = yield res.text();
      var vm = html.match(/https?:[\\/]+player\.vidmody\.com[\\/][a-zA-Z0-9=\\/]+/);
      if (!vm) return null;
      var playerUrl = vm[0].split("\\").join("/");
      var pRes = yield fetchWithTimeout(playerUrl, {
        headers: { "User-Agent": HEADERS["User-Agent"], "Referer": pageUrl }
      }, 15e3);
      if (!pRes.ok) return null;
      var pHtml = yield pRes.text();
      var dMatch = pHtml.match(/(?:decrypt|\))\s*\(\s*["']([0-9a-fA-F]+)["']\s*,\s*(\d+)\s*\)/);
      if (!dMatch) return null;
      var block = vidmodyDecrypt(dMatch[1], parseInt(dMatch[2]));
      var fMatch = block.match(/file:\s*['"](https?:\/\/[^'"]+)['"]/);
      if (!fMatch) return null;
      var subs = [];
      var subRe = /https?:\/\/[^\s"'\\]+\.vtt/gi;
      var sm;
      var seen = /* @__PURE__ */ new Set();
      while ((sm = subRe.exec(pHtml + " " + block)) !== null) {
        if (seen.has(sm[0]) || /thumb/i.test(sm[0])) continue;
        seen.add(sm[0]);
        var lang = /tur/i.test(sm[0]) ? "tur" : "eng";
        subs.push({ id: lang, lang, url: sm[0] });
      }
      return { file: fMatch[1], playerUrl, subtitles: subs };
    } catch (e) {
      return null;
    }
  });
}
function toStream(file, subtitles) {
  var isHls = /\.m3u8/i.test(file) || file.includes("vidmody.com/vs/");
  var headers = isHls && file.includes("vidmody.com") ? { "User-Agent": HEADERS["User-Agent"], "Referer": "https://vidmody.com/" } : { "User-Agent": HEADERS["User-Agent"], "Referer": "https://player.vidmody.com/" };
  return {
    name: "HDFilmDelisi",
    title: "\u231C HDFilmDelisi \u231F | VidMody (1080p HLS)",
    url: file,
    quality: "1080p",
    provider: "hdfilmdelisi",
    headers,
    format: "hls",
    isHls: true,
    behaviorHints: { notWebReady: true, proxyHeaders: { request: headers } },
    subtitles: subtitles || []
  };
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      var query = args && args.search || args && args.extra && args.extra.search || args && args.query || "";
      var url = query ? BASE_URL + "/api/search?q=" + encodeURIComponent(query) : BASE_URL + "/api/films?page=1&sort=newest&limit=20";
      var res = yield fetchWithTimeout(url, { headers: { "User-Agent": HEADERS["User-Agent"] } }, 15e3);
      if (!res.ok) return { metas: [] };
      var data = yield res.json();
      var items = data.results || data.films || [];
      var metas = items.slice(0, 30).map(function(f) {
        var title = f.baslik || f.title || "Film";
        return {
          id: "hdfilmdelisi:movie:" + (f.slug || f.id),
          type: "movie",
          name: title + (f.yayinYili ? " (" + f.yayinYili + ")" : ""),
          poster: f.afis || "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
          background: f.afis || "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
          genres: [f.kategoriler && f.kategoriler[0] && f.kategoriler[0].ad || "Film", "HDFilmDelisi"],
          description: (f.orijinalBaslik || title) + " - HDFilmDelisi"
        };
      });
      return { metas };
    } catch (e) {
      return { metas: [] };
    }
  });
}
function getMeta(args) {
  return __async(this, null, function* () {
    try {
      var rawId = typeof args === "string" ? args : args && args.id ? args.id : "";
      if (!rawId || !rawId.startsWith("hdfilmdelisi:")) return { meta: null };
      var slug = rawId.split(":").slice(2).join(":");
      var pageUrl = BASE_URL + "/film/" + slug;
      var res = yield fetchWithTimeout(pageUrl, { headers: HEADERS }, 15e3);
      if (!res.ok) return { meta: null };
      var html = yield res.text();
      var titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      var title = titleMatch ? titleMatch[1].split("|")[0].split("-")[0].trim() : "HDFilmDelisi";
      var ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      var poster = ogImg ? ogImg[1] : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
      return {
        meta: {
          id: rawId,
          type: "movie",
          name: title,
          poster,
          background: poster,
          description: title + " - HDFilmDelisi",
          genres: ["Film", "HDFilmDelisi"],
          videos: [{ id: rawId, title, released: (/* @__PURE__ */ new Date()).toISOString().split("T")[0] }]
        }
      };
    } catch (e) {
      return { meta: null };
    }
  });
}
function getStreams(tmdbIdOrArgs, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      if (typeof tmdbIdOrArgs === "object" && tmdbIdOrArgs && tmdbIdOrArgs.id) {
        return getStreams(tmdbIdOrArgs.id, mediaType, seasonNum, episodeNum);
      }
      if (typeof tmdbIdOrArgs === "string" && tmdbIdOrArgs.startsWith("hdfilmdelisi:movie:")) {
        var slug = tmdbIdOrArgs.split(":").slice(2).join(":");
        var found = yield extractVidmodyFile(BASE_URL + "/film/" + slug);
        return found ? [toStream(found.file, found.subtitles)] : [];
      }
      var info = yield resolveTmdbInfo(tmdbIdOrArgs, mediaType);
      var searchTitles = [info.title, info.origTitle].filter(Boolean);
      if (searchTitles.length === 0) return [];
      for (var t = 0; t < searchTitles.length; t++) {
        var results = yield apiSearch(searchTitles[t]);
        if (!results || results.length === 0) continue;
        var best = pickBest(results, searchTitles[t]);
        if (!best || !best.slug) continue;
        var vf = yield extractVidmodyFile(BASE_URL + "/film/" + best.slug);
        if (vf) return [toStream(vf.file, vf.subtitles)];
      }
      return [];
    } catch (e) {
      return [];
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
  module.exports = wrapAll({ getStreams, getMeta, getCatalog }, cfgReady);
}
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = getStreams;
  globalThis.getMeta = getMeta;
  globalThis.getCatalog = getCatalog;
}

if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
    if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
    if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
    if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
    if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

