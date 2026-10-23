/**
 * Anthology Provider: ddizibox
 * Built from src/ddizibox/index.js
 * Build: v1.8.29 (anthology build system)
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

// src/ddizibox/index.js
var { loadConfig, val, wrapAll } = require_config();
var { sortStreamsByQuality } = require_quality();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.series.ddizibox.base");
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
var PROVIDER_NAME = "DDiziBox";
var BASE_URL = "https://ddizibox.com";
var DEFAULT_PLAYER_HOST = "https://play2.pilavyerplay.top";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
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
    if (!query || !query.trim()) return { movies: [], series: [] };
    try {
      var searchUrl = BASE_URL + "/ara/oneri?q=" + encodeURIComponent(query.trim());
      var sOpts = {
        headers: {
          "User-Agent": HEADERS["User-Agent"],
          "Accept": "application/json, text/plain, */*",
          "Referer": BASE_URL + "/"
        },
        signal: timeoutSignal(6e3)
      };
      var res = yield fetch(searchUrl, sOpts);
      if (!res.ok) return { movies: [], series: [] };
      var data = yield res.json();
      return {
        movies: Array.isArray(data.movies) ? data.movies : [],
        series: Array.isArray(data.series) ? data.series : []
      };
    } catch (e) {
      return { movies: [], series: [] };
    }
  });
}
function htmlSearch(query) {
  return __async(this, null, function* () {
    if (!query || !query.trim()) return [];
    try {
      var url = BASE_URL + "/ara?q=" + encodeURIComponent(query.trim());
      var res = yield fetch(url, { headers: HEADERS, signal: timeoutSignal(7e3) });
      if (!res.ok) return [];
      var html = yield res.text();
      if (!cheerio) return [];
      var $ = cheerio.load(html);
      var results = [];
      $('a[href*="/film/"], a[href*="/dizi/"]').each(function(i, el) {
        var href = $(el).attr("href") || "";
        var text = $(el).text().trim().replace(/\s+/g, " ");
        var poster = $(el).find("img").attr("src") || "";
        var isMovie = href.includes("/film/");
        var isSeries = href.includes("/dizi/") && !href.includes("/sezon-");
        if ((isMovie || isSeries) && href && !results.some(function(r) {
          return r.url === href;
        })) {
          results.push({
            type: isMovie ? "movie" : "series",
            title: text,
            url: href.startsWith("http") ? href : BASE_URL + href,
            poster,
            meta: text
          });
        }
      });
      return results;
    } catch (e) {
      return [];
    }
  });
}
function findMediaUrl(tmdbInfo, isTv) {
  return __async(this, null, function* () {
    var candidates = [];
    var queries = [];
    if (tmdbInfo.titleTr) queries.push(tmdbInfo.titleTr);
    if (tmdbInfo.titleEn && tmdbInfo.titleEn !== tmdbInfo.titleTr) queries.push(tmdbInfo.titleEn);
    for (var i = 0; i < queries.length; i++) {
      var q = queries[i];
      var lData = yield liveSearch(q);
      var list = isTv ? lData.series : lData.movies;
      if (list && list.length > 0) {
        list.forEach(function(item) {
          if (item && item.url && !candidates.some(function(c) {
            return c.url === item.url;
          })) {
            candidates.push(item);
          }
        });
      }
      if (candidates.length >= 3) break;
    }
    if (candidates.length === 0) {
      for (var j = 0; j < queries.length; j++) {
        var hList = yield htmlSearch(queries[j]);
        var filtered = hList.filter(function(item) {
          return isTv ? item.type === "series" : item.type === "movie";
        });
        filtered.forEach(function(item) {
          if (!candidates.some(function(c) {
            return c.url === item.url;
          })) {
            candidates.push(item);
          }
        });
        if (candidates.length > 0) break;
      }
    }
    if (candidates.length === 0) return null;
    var targetCleanTr = cleanTitle(tmdbInfo.titleTr);
    var targetCleanEn = cleanTitle(tmdbInfo.titleEn);
    var targetSlugTr = titleToSlug(tmdbInfo.titleTr);
    var targetSlugEn = titleToSlug(tmdbInfo.titleEn);
    var targetYear = parseInt(tmdbInfo.year, 10) || 0;
    var bestCandidate = null;
    var bestScore = -1;
    for (var k = 0; k < candidates.length; k++) {
      var cand = candidates[k];
      var candTitleClean = cleanTitle(cand.title);
      var candSlug = (cand.url.split("/").pop() || "").toLowerCase();
      var score = 0;
      if (candSlug && (candSlug === targetSlugEn || candSlug === targetSlugTr)) {
        score += 60;
      }
      if (candTitleClean === targetCleanTr || candTitleClean === targetCleanEn) {
        score += 50;
      } else {
        var targetWords = (targetCleanTr + " " + targetCleanEn).split(" ").filter(function(w) {
          return w.length > 2;
        });
        var candWords = candTitleClean.split(" ").filter(function(w) {
          return w.length > 2;
        });
        var matchCount = 0;
        targetWords.forEach(function(tw) {
          if (candWords.indexOf(tw) !== -1) matchCount++;
        });
        score += matchCount * 12;
      }
      var candYear = 0;
      var metaYearMatch = String(cand.meta || "").match(/\b(19\d\d|20\d\d)\b/);
      if (metaYearMatch) candYear = parseInt(metaYearMatch[1], 10);
      if (!candYear) {
        var titleYearMatch = String(cand.title || "").match(/\b(19\d\d|20\d\d)\b/);
        if (titleYearMatch) candYear = parseInt(titleYearMatch[1], 10);
      }
      if (targetYear && candYear) {
        if (Math.abs(targetYear - candYear) === 0) score += 25;
        else if (Math.abs(targetYear - candYear) <= 1) score += 10;
        else score -= 30;
      }
      if (score > bestScore && score >= 20) {
        bestScore = score;
        bestCandidate = cand;
      }
    }
    return bestCandidate;
  });
}
function extractStreamsFromPlayer(pageUrl) {
  return __async(this, null, function* () {
    try {
      var pageRes = yield fetch(pageUrl, { headers: HEADERS, signal: timeoutSignal(8e3) });
      if (!pageRes.ok) return [];
      var pHtml = yield pageRes.text();
      if (!pHtml) return [];
      var pvMatch = pHtml.match(/data-pv="([^"]+)"/);
      if (!pvMatch) return [];
      var pv = pvMatch[1];
      var hostMatch = pHtml.match(/src="(https?:\/\/[^\/]+)\/assets\/js\/core\.js"/i);
      var playerHost = hostMatch ? hostMatch[1] : DEFAULT_PLAYER_HOST;
      var sUrl = playerHost + "/assets/js/s.php?s=" + encodeURIComponent(pv);
      var pRes = yield fetch(sUrl, {
        headers: {
          "User-Agent": HEADERS["User-Agent"],
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Referer": BASE_URL + "/"
        },
        signal: timeoutSignal(8e3)
      });
      if (!pRes.ok) return [];
      var pDataHtml = yield pRes.text();
      if (!pDataHtml) return [];
      var jsonMatch = pDataHtml.match(/window\.__PLAYER__\s*=\s*(\{[\s\S]*?\});/);
      if (!jsonMatch) return [];
      var pData = null;
      try {
        pData = JSON.parse(jsonMatch[1]);
      } catch (e) {
        return [];
      }
      if (!pData || !pData.stream) return [];
      var subtitles = [];
      if (Array.isArray(pData.subs)) {
        pData.subs.forEach(function(sub) {
          if (sub && sub.src) {
            var langCode = (sub.lang || "").toLowerCase();
            var isTr = langCode === "tr" || sub.label && /türkçe|turkce/i.test(sub.label);
            subtitles.push({
              id: sub.sid || (isTr ? "tur" : "eng"),
              url: sub.src,
              file: sub.src,
              link: sub.src,
              lang: isTr ? "tur" : "eng",
              language: isTr ? "tr" : "en",
              label: sub.label || (isTr ? "T\xFCrk\xE7e" : "English"),
              name: sub.label || (isTr ? "T\xFCrk\xE7e" : "English"),
              title: sub.label || (isTr ? "T\xFCrk\xE7e Altyaz\u0131" : "English Subtitle"),
              format: "vtt",
              type: "text/vtt",
              headers: {
                "Referer": playerHost + "/",
                "User-Agent": HEADERS["User-Agent"]
              }
            });
          }
        });
      }
      var streamHeaders = {
        "Referer": playerHost + "/",
        "User-Agent": HEADERS["User-Agent"]
      };
      var streams = [];
      var audios = Array.isArray(pData.audios) && pData.audios.length > 0 ? pData.audios : [{ label: "Orijinal" }];
      audios.forEach(function(aud) {
        var rawLabel = (aud.label || aud.name || "Orijinal").trim();
        var displayLabel = rawLabel;
        if (/türkçe|turkce|tr\b/i.test(rawLabel)) {
          displayLabel = "T\xFCrk\xE7e Dublaj";
        } else if (/ingilizce|english|en\b/i.test(rawLabel)) {
          displayLabel = "\u0130ngilizce (Orijinal)";
        } else if (/orijinal|original/i.test(rawLabel)) {
          displayLabel = "Orijinal (TR Altyaz\u0131l\u0131)";
        }
        var sObj = {
          name: PROVIDER_NAME,
          title: PROVIDER_NAME + " \u2022 " + displayLabel + " \u2022 1080p FHD",
          url: pData.stream,
          quality: "1080p",
          resolution: "1080p",
          type: "hls",
          format: "hls",
          isHls: true,
          headers: streamHeaders,
          behaviorHints: {
            notWebReady: true,
            proxyHeaders: {
              request: streamHeaders
            }
          }
        };
        if (subtitles.length > 0) {
          sObj.subtitles = subtitles;
        }
        streams.push(sObj);
      });
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
      if (cleanId.indexOf(":") !== -1 && !cleanId.startsWith("ddizibox:")) {
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
      var contentUrl = null;
      if (cleanId.startsWith("ddizibox:ep:")) {
        var epParts = cleanId.split(":");
        var slug = epParts[2];
        if (epParts[3]) sNum = parseInt(epParts[3], 10) || sNum;
        if (epParts[4]) eNum = parseInt(epParts[4], 10) || eNum;
        contentUrl = BASE_URL + "/dizi/" + slug + "/sezon-" + sNum + "/bolum-" + eNum;
      } else if (cleanId.startsWith("ddizibox:movie:")) {
        var mSlug = cleanId.split(":")[2];
        contentUrl = BASE_URL + "/film/" + mSlug;
      } else if (cleanId.startsWith("ddizibox:show:")) {
        var sSlug = cleanId.split(":")[2];
        contentUrl = BASE_URL + "/dizi/" + sSlug + "/sezon-" + sNum + "/bolum-" + eNum;
      } else {
        var tmdbInfo = yield resolveTmdbInfo(cleanId, isTv ? "tv" : "movie");
        var mediaMatch = yield findMediaUrl(tmdbInfo, isTv);
        if (!mediaMatch || !mediaMatch.url) return [];
        var matchSlug = (mediaMatch.url.split("/").pop() || "").trim();
        if (isTv) {
          contentUrl = BASE_URL + "/dizi/" + matchSlug + "/sezon-" + sNum + "/bolum-" + eNum;
        } else {
          contentUrl = BASE_URL + "/film/" + matchSlug;
        }
      }
      if (!contentUrl) return [];
      var streams = yield extractStreamsFromPlayer(contentUrl);
      return streams;
    } catch (e2) {
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
  module.exports = wrapAll({
    getStreams
  }, cfgReady);
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

