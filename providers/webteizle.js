/**
 * Anthology Provider: webteizle
 * Built from src/webteizle/index.js
 * Build Date: 2026-09-20T20:49:56.284Z
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

// src/webteizle/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.movies.webteizle.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var BASE_URL = "https://webteizle.info";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "Referer": BASE_URL + "/"
};
function fetchTmdbInfo(tmdbId, mediaType) {
  return __async(this, null, function* () {
    var cleanId = String(tmdbId || "").trim();
    if (cleanId.includes(":")) cleanId = cleanId.split(":")[0];
    var isTV = mediaType === "tv" || mediaType === "series";
    var endpoint = isTV ? "tv" : "movie";
    var isImdb = cleanId.startsWith("tt");
    if (isImdb) {
      var fRes = yield fetch("https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_API_KEY + "&external_source=imdb_id");
      if (fRes.ok) {
        var fData = yield fRes.json();
        var match = isTV ? fData.tv_results && fData.tv_results[0] : fData.movie_results && fData.movie_results[0];
        if (match) {
          return {
            titleTr: match.title || match.name || "",
            titleEn: match.original_title || match.original_name || "",
            year: (match.release_date || match.first_air_date || "").slice(0, 4)
          };
        }
      }
    }
    var res = yield fetch("https://api.themoviedb.org/3/" + endpoint + "/" + cleanId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR");
    if (!res.ok) return { titleTr: "", titleEn: "", year: "" };
    var d = yield res.json();
    return {
      titleTr: d.title || d.name || "",
      titleEn: d.original_title || d.original_name || "",
      year: (d.release_date || d.first_air_date || "").slice(0, 4)
    };
  });
}
function titleToSlug(title) {
  return (title || "").toLowerCase().replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ı/g, "i").replace(/İ/g, "i").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function findFilmPage(titleTr, titleEn) {
  return __async(this, null, function* () {
    var slugTr = titleToSlug(titleTr);
    var slugEn = titleToSlug(titleEn);
    var candidates = [];
    if (slugTr) {
      candidates.push(BASE_URL + "/izle/dublaj/" + slugTr);
      candidates.push(BASE_URL + "/izle/altyazi/" + slugTr);
    }
    if (slugEn && slugEn !== slugTr) {
      candidates.push(BASE_URL + "/izle/dublaj/" + slugEn);
      candidates.push(BASE_URL + "/izle/altyazi/" + slugEn);
    }
    for (var url of candidates) {
      try {
        var r = yield fetch(url, { headers: HEADERS });
        if (r.ok) {
          var html = yield r.text();
          if (html.indexOf("data-id") !== -1 && html.indexOf('id="wip"') !== -1) {
            return { url, html };
          }
        }
      } catch (e) {
      }
    }
    return yield searchFallback(titleTr, titleEn);
  });
}
function searchFallback(titleTr, titleEn) {
  return __async(this, null, function* () {
    var queries = [titleTr, titleEn].filter(Boolean);
    for (var query of queries) {
      try {
        var r = yield fetch(BASE_URL + "/ajax/arama.asp", {
          method: "POST",
          headers: Object.assign({}, HEADERS, {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest"
          }),
          body: "q=" + encodeURIComponent(query)
        });
        if (!r.ok) continue;
        var data = yield r.json();
        if (data.status === "success" && data.results && data.results.filmler && Array.isArray(data.results.filmler.results)) {
          var items = data.results.filmler.results;
          if (items.length > 0) {
            var best = items[0];
            var pageUrl = best.url.startsWith("http") ? best.url : BASE_URL + best.url;
            var pRes = yield fetch(pageUrl, { headers: HEADERS });
            if (pRes.ok) {
              var html = yield pRes.text();
              return { url: pageUrl, html };
            }
          }
        }
      } catch (e) {
      }
    }
    return null;
  });
}
function parseFilmId(html) {
  var m = html.match(/data-id="(\d+)"[^>]*id="wip"/) || html.match(/id="wip"[^>]*data-id="(\d+)"/) || html.match(/button[^>]+id="wip"[^>]+data-id="(\d+)"/) || html.match(/data-id="(\d+)"/);
  return m ? m[1] : null;
}
function parseDilList(html, pageUrl) {
  var diller = [];
  if (html.indexOf("/izle/dublaj/") !== -1 || pageUrl.indexOf("/izle/dublaj/") !== -1) diller.push({ dil: "0", ad: "TR Dublaj" });
  if (html.indexOf("/izle/altyazi/") !== -1 || pageUrl.indexOf("/izle/altyazi/") !== -1) diller.push({ dil: "1", ad: "TR Altyaz\u0131" });
  if (diller.length === 0) {
    diller.push({ dil: "0", ad: "TR Dublaj" });
    diller.push({ dil: "1", ad: "TR Altyaz\u0131" });
  }
  return diller;
}
function fetchAlternatifler(filmId, dil, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    var body = "filmid=" + filmId + "&dil=" + dil + "&s=" + (seasonNum || "") + "&b=" + (episodeNum || "") + "&bot=0";
    try {
      var r = yield fetch(BASE_URL + "/ajax/dataAlternatif3.asp", {
        method: "POST",
        headers: Object.assign({}, HEADERS, {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
          "Origin": BASE_URL
        }),
        body
      });
      if (!r.ok) return [];
      var data = yield r.json();
      return data.status === "success" && Array.isArray(data.data) ? data.data : [];
    } catch (e) {
      return [];
    }
  });
}
function fetchEmbedIframe(embedId) {
  return __async(this, null, function* () {
    try {
      var r = yield fetch(BASE_URL + "/ajax/dataEmbed.asp", {
        method: "POST",
        headers: Object.assign({}, HEADERS, {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
          "Origin": BASE_URL
        }),
        body: "id=" + embedId
      });
      if (!r.ok) return null;
      var html = yield r.text();
      var m = html.match(/<iframe[^>]+src="([^"]+)"/i);
      if (m) return m[1];
      var sm = html.match(/(vidmoly|okru|filemoon|dzen)\s*\(\s*'([^']+)'/i);
      if (sm) {
        var p = sm[1].toLowerCase();
        var vid = sm[2];
        if (p === "vidmoly") return "https://vidmoly.biz/embed-" + vid + ".html";
        if (p === "okru") return "https://odnoklassniki.ru/videoembed/" + vid;
        if (p === "filemoon") return "https://filemoon.sx/e/" + vid;
        if (p === "dzen") return "https://dzen.ru/video/watch/" + vid;
      }
      return null;
    } catch (e) {
      return null;
    }
  });
}
function fetchVidMolyStream(iframeUrl) {
  return __async(this, null, function* () {
    var fullUrl = iframeUrl.startsWith("//") ? "https:" + iframeUrl : iframeUrl;
    fullUrl = fullUrl.replace("vidmoly.to", "vidmoly.biz").replace("vidmoly.net", "vidmoly.biz");
    try {
      var r = yield fetch(fullUrl, {
        headers: {
          "User-Agent": HEADERS["User-Agent"],
          "Referer": BASE_URL + "/"
        }
      });
      if (!r.ok) return null;
      var html = yield r.text();
      var m = html.match(/file\s*:\s*['"](https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)['"]/i);
      return m ? { url: m[1], type: "hls", referer: "https://vidmoly.biz/" } : null;
    } catch (e) {
      return null;
    }
  });
}
function processEmbed(embedData, dilAd, movieTitle) {
  return __async(this, null, function* () {
    var baslik = (embedData.baslik || "").toLowerCase();
    if (baslik === "pixel" || baslik === "netu") return null;
    var src = yield fetchEmbedIframe(embedData.id);
    if (!src) return null;
    var flag = dilAd.includes("Dublaj") ? "\u{1F1F9}\u{1F1F7} " : "\u{1F310} ";
    var pName = embedData.baslik || "Kaynak";
    if (src.indexOf("vidmoly") !== -1) pName = "VidMoly";
    else if (src.indexOf("sibnet") !== -1) pName = "Sibnet";
    else if (src.indexOf("filemoon") !== -1) pName = "FileMoon";
    var q = embedData.kalite || "1080p";
    if (src.indexOf("vidmoly") !== -1) {
      var s = yield fetchVidMolyStream(src);
      if (s) {
        var sHeaders = {
          "User-Agent": HEADERS["User-Agent"],
          "Referer": s.referer
        };
        return {
          name: movieTitle,
          title: "\u231C Webte\u0130zle \u231F | " + pName + " | " + flag + dilAd,
          url: s.url,
          quality: q,
          headers: sHeaders,
          behaviorHints: {
            notWebReady: true,
            proxyHeaders: { request: sHeaders }
          },
          provider: "webteizle"
        };
      }
    }
    return null;
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      if (typeof tmdbId === "object" && tmdbId !== null) {
        mediaType = tmdbId.type || mediaType;
        season = tmdbId.season || season;
        episode = tmdbId.episode || episode;
        tmdbId = tmdbId.id;
      }
      if (typeof tmdbId === "string" && tmdbId.indexOf(":") !== -1 && !tmdbId.startsWith("webteizle:")) {
        tmdbId = tmdbId.split(":")[0];
      }
      var isTV = mediaType === "tv" || mediaType === "series";
      var info = yield fetchTmdbInfo(tmdbId, mediaType);
      var movieName = info.titleTr || info.titleEn;
      if (!movieName) return [];
      var pageResult = yield findFilmPage(info.titleTr, info.titleEn);
      if (!pageResult || !pageResult.html) return [];
      var filmId = parseFilmId(pageResult.html);
      if (!filmId) return [];
      var diller = parseDilList(pageResult.html, pageResult.url);
      var streams = [];
      for (var d of diller) {
        var embedList = yield fetchAlternatifler(filmId, d.dil, season, episode);
        for (var e of embedList) {
          var s = yield processEmbed(e, d.ad, movieName);
          if (s && !streams.some((x) => x.url === s.url)) {
            streams.push(s);
          }
        }
      }
      return streams;
    } catch (err) {
      console.error("[Webte\u0130zle] Hata:", err.message);
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
  module.exports = wrapAll({ getStreams }, cfgReady);
} else {
  global.WebteIzleProvider = { getStreams };
}

if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
    if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
    if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
    if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
    if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

