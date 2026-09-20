/**
 * Anthology Provider: sinemacx
 * Built from src/sinemacx/index.js
 * Build Date: 2026-09-20T21:43:09.387Z
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

// src/sinemacx/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.movies.sinemacx.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      if (WORKING_HEADERS) WORKING_HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://www.sinema.gg";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var WORKING_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/"
};
function resolveTmdbInfo(id, mediaType) {
  return __async(this, null, function* () {
    try {
      let cleanId = String(id || "").trim();
      if (cleanId.includes(":")) cleanId = cleanId.split(":")[0];
      let numericId = null;
      let title = "";
      let origTitle = "";
      let year = "";
      if (cleanId.startsWith("tt")) {
        const findRes = yield fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
        if (findRes.ok) {
          const fData = yield findRes.json();
          const item = mediaType === "tv" || mediaType === "series" ? fData.tv_results && fData.tv_results[0] : fData.movie_results && fData.movie_results[0];
          if (item) {
            numericId = item.id;
            title = item.name || item.title || "";
            origTitle = item.original_name || item.original_title || "";
            year = (item.first_air_date || item.release_date || "").slice(0, 4);
          }
        }
      } else {
        numericId = cleanId;
      }
      if (numericId && (!title || !origTitle)) {
        const type = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
        const tRes = yield fetch(`https://api.themoviedb.org/3/${type}/${numericId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        if (tRes.ok) {
          const tData = yield tRes.json();
          title = tData.name || tData.title || title;
          origTitle = tData.original_name || tData.original_title || origTitle;
          year = (tData.first_air_date || tData.release_date || "").slice(0, 4);
        }
      }
      return { title, origTitle, year, numericId };
    } catch (e) {
      return { title: "", origTitle: "", year: "", numericId: id };
    }
  });
}
function searchOnSite(query, year) {
  return __async(this, null, function* () {
    if (!query || query.length < 2) return null;
    const cleanQuery = query.toLowerCase().trim();
    const searchUrl = `${BASE_URL}/?s=` + encodeURIComponent(cleanQuery);
    try {
      const res = yield fetch(searchUrl, { headers: WORKING_HEADERS });
      if (!res.ok) return null;
      const html = yield res.text();
      const $ = cheerio.load(html);
      const results = [];
      const stopWords = /* @__PURE__ */ new Set(["the", "a", "an", "ve", "ile", "der", "die", "das", "le", "la"]);
      const significantWords = cleanQuery.split(/\s+/).filter((w) => w.length > 1 && !stopWords.has(w));
      $("a.baslik, a.resim").each(function() {
        const url = $(this).attr("href") || "";
        const rawTitle = $(this).attr("title") || $(this).find("span").first().text().trim() || $(this).text().trim();
        const titleLower = rawTitle.toLowerCase();
        if (!url.includes("sinema.gg") || url.includes("/category/") || url.includes("/search/") || url.includes("/tag/") || rawTitle.length < 2) return;
        let score = 0;
        let matchedWordCount = 0;
        significantWords.forEach((w) => {
          if (titleLower.includes(w) || url.includes(w)) {
            score += 10;
            matchedWordCount++;
          }
        });
        if (matchedWordCount === significantWords.length && significantWords.length > 0) {
          score += 15;
        }
        if (year && (titleLower.includes(year) || url.includes(year))) score += 10;
        if (url.includes(cleanQuery.replace(/\s+/g, "-"))) score += 8;
        const extraWords = titleLower.split(/\s+/).filter((w) => !stopWords.has(w) && !significantWords.includes(w));
        const hasSequel = /[\s\-_]([2-9]|ii|iii|iv|v)($|[\s\-_])/i.test(titleLower) || /[\s\-_]([2-9]|ii|iii|iv|v)($|[\s\-_])/i.test(url);
        if (hasSequel && !/[\s\-_]([2-9]|ii|iii|iv|v)/i.test(cleanQuery)) {
          score -= 25;
        }
        score -= extraWords.length * 2;
        if (score > 5) {
          results.push({ url, siteTitle: rawTitle, score });
        }
      });
      if (results.length > 0) {
        results.sort((a, b) => b.score - a.score);
        return results[0];
      }
      return null;
    } catch (err) {
      return null;
    }
  });
}
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      const info = yield resolveTmdbInfo(tmdbId, mediaType);
      const trTitle = (info.title || "").trim();
      const orgTitle = (info.origTitle || "").trim();
      const displayTitle = trTitle || orgTitle || "Film";
      const releaseYear = info.year;
      let result = null;
      const searchCandidates = [];
      if (orgTitle) {
        searchCandidates.push(orgTitle);
        const withoutThe = orgTitle.replace(/^the\s+/i, "").trim();
        if (withoutThe && withoutThe !== orgTitle) searchCandidates.push(withoutThe);
      }
      if (trTitle && trTitle !== orgTitle) {
        searchCandidates.push(trTitle);
        const withoutTheTr = trTitle.replace(/^the\s+/i, "").trim();
        if (withoutTheTr && withoutTheTr !== trTitle) searchCandidates.push(withoutTheTr);
      }
      for (const cand of searchCandidates) {
        result = yield searchOnSite(cand, releaseYear);
        if (result && result.score >= 10) break;
      }
      if (!result || !result.url) return [];
      const pageRes = yield fetch(result.url, { headers: WORKING_HEADERS });
      if (!pageRes.ok) return [];
      const html = yield pageRes.text();
      const $page = cheerio.load(html);
      const pageText = $page("body").text().toLowerCase();
      let langInfo = "1080p";
      if (pageText.includes("dublaj")) {
        langInfo = "\u{1F1F9}\u{1F1F7} TR Dublaj";
      } else if (pageText.includes("altyaz\u0131")) {
        langInfo = "\u{1F310} TR Altyaz\u0131";
      }
      let iframeUrl = "";
      $page("iframe").each(function() {
        const src = $page(this).attr("data-vsrc") || $page(this).attr("src") || "";
        if (src.toLowerCase().includes("filmizle.in")) {
          iframeUrl = src.split("?img=")[0];
          return false;
        }
      });
      if (!iframeUrl) return [];
      const videoId = iframeUrl.split("/").pop().split("?")[0];
      const apiURL = "https://player.filmizle.in/player/index.php?data=" + videoId + "&do=getVideo";
      const params = new URLSearchParams();
      params.append("hash", videoId);
      params.append("r", result.url);
      const r = yield fetch(apiURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          "Referer": iframeUrl.toLowerCase(),
          "User-Agent": WORKING_HEADERS["User-Agent"]
        },
        body: params.toString()
      });
      if (!r.ok) return [];
      const json = yield r.json();
      if (json && json.securedLink) {
        return [{
          name: displayTitle,
          title: `\u231C SinemaCX \u231F | ${langInfo}`,
          url: json.securedLink,
          quality: "1080p",
          type: "hls",
          provider: "sinemacx",
          headers: {
            "Referer": "https://player.filmizle.in/",
            "User-Agent": WORKING_HEADERS["User-Agent"]
          }
        }];
      }
      return [];
    } catch (err) {
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
}
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = getStreams;
}

if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
    if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
    if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
    if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
    if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

