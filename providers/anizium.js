/**
 * Anthology Provider: anizium
 * Built from src/anizium/index.js
 * Build Date: 2026-09-20T20:49:56.170Z
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

// src/anizium/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.anime.anizium.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      v = val("urls.anime.anizium.site");
      if (v) SITE_ORIGIN = String(v).replace(/\/+$/, "");
      if (DEFAULT_HEADERS) {
        DEFAULT_HEADERS.Origin = SITE_ORIGIN;
        DEFAULT_HEADERS.Referer = SITE_ORIGIN + "/";
      }
    });
  }
  return _cfgReady;
}
var BASE_URL = "https://api.anizium.co";
var SITE_ORIGIN = "https://anizium.co";
var TOKEN_KEY = "hlxjl1c2w281ax473rt1ofgrvhyjvi";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Origin": "https://anizium.co",
  "Referer": SITE_ORIGIN + "/",
  "Accept": "application/json, text/plain, */*"
};
function cleanStr(str) {
  if (!str) return "";
  var s = str.toString().toLowerCase();
  try {
    if (typeof s.normalize === "function") {
      s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
  } catch (e) {
  }
  return s.replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}
function getIstanbulDay() {
  var days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  var now = /* @__PURE__ */ new Date();
  var utc = now.getTime() + now.getTimezoneOffset() * 6e4;
  var istDate = new Date(utc + 36e5 * 3);
  return days[istDate.getDay()];
}
function xorEncryptHex(text, key) {
  var out = "";
  for (var i = 0; i < text.length; i++) {
    var code = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    var hex = code.toString(16);
    out += hex.length < 2 ? "0" + hex : hex;
  }
  return out;
}
function generateCfControl() {
  var weekday = getIstanbulDay();
  var key = TOKEN_KEY + "_" + weekday;
  var randomKey = Math.random().toString(36).substring(2, 8);
  var payload = {};
  payload[randomKey] = Date.now();
  return xorEncryptHex(JSON.stringify(payload), key);
}
function aniziumFetch(endpoint, params) {
  return __async(this, null, function* () {
    var url = BASE_URL + endpoint;
    if (params && Object.keys(params).length > 0) {
      var parts = [];
      for (var k in params) {
        if (params[k] !== void 0 && params[k] !== null) {
          parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k]));
        }
      }
      if (parts.length > 0) {
        url += (url.indexOf("?") === -1 ? "?" : "&") + parts.join("&");
      }
    }
    var headers = Object.assign({}, DEFAULT_HEADERS, {
      "Cf-Control": generateCfControl(),
      "device": "browser",
      "language": "tr",
      "site": "main"
    });
    var res = yield fetch(url, { headers });
    if (!res.ok) return null;
    return yield res.json();
  });
}
function mapLangCode(group) {
  var g = (group || "").toLowerCase();
  switch (g) {
    case "tr":
      return { id: "tr", lang: "tur", language: "tr", label: "T\xFCrk\xE7e" };
    case "en":
      return { id: "en", lang: "eng", language: "en", label: "\u0130ngilizce" };
    case "de":
      return { id: "de", lang: "ger", language: "de", label: "Almanca" };
    case "fr":
      return { id: "fr", lang: "fre", language: "fr", label: "Frans\u0131zca" };
    case "es":
      return { id: "es", lang: "spa", language: "es", label: "\u0130spanyolca" };
    case "it":
      return { id: "it", lang: "ita", language: "it", label: "\u0130talyanca" };
    case "ar":
      return { id: "ar", lang: "ara", language: "ar", label: "Arap\xE7a" };
    default:
      return { id: g || "unknown", lang: g || "und", language: g || "und", label: g ? g.toUpperCase() : "Altyaz\u0131" };
  }
}
function formatSubtitles(rawSubs) {
  if (!rawSubs || rawSubs.length === 0) return [];
  var subs = [];
  for (var i = 0; i < rawSubs.length; i++) {
    var s = rawSubs[i];
    if (!s || !s.link) continue;
    var info = mapLangCode(s.group);
    var label = s.name || info.label;
    subs.push({
      id: info.id + "_" + (i + 1),
      url: s.link,
      file: s.link,
      link: s.link,
      lang: info.lang,
      language: info.language,
      label,
      name: label,
      title: label,
      format: "vtt",
      type: "text/vtt",
      mimeType: "text/vtt",
      headers: {
        "Referer": SITE_ORIGIN + "/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      }
    });
  }
  return subs;
}
function resolveTmdbInfo(id, mediaType) {
  return __async(this, null, function* () {
    try {
      var cleanId = String(id || "").trim();
      if (cleanId.indexOf(":") !== -1) cleanId = cleanId.split(":")[0];
      var numericId = null;
      var titles = [];
      if (cleanId.indexOf("tt") === 0) {
        var findRes = yield fetch("https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_API_KEY + "&external_source=imdb_id");
        if (findRes.ok) {
          var fData = yield findRes.json();
          var item = mediaType === "tv" || mediaType === "series" ? fData.tv_results && fData.tv_results[0] : fData.movie_results && fData.movie_results[0];
          if (item) {
            numericId = item.id;
            if (item.name) titles.push(item.name);
            if (item.title) titles.push(item.title);
            if (item.original_name) titles.push(item.original_name);
            if (item.original_title) titles.push(item.original_title);
          }
        }
      } else {
        numericId = cleanId;
      }
      if (numericId) {
        var type = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
        var enRes = yield fetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY);
        if (enRes.ok) {
          var enData = yield enRes.json();
          if (enData.name) titles.push(enData.name);
          if (enData.title) titles.push(enData.title);
          if (enData.original_name) titles.push(enData.original_name);
          if (enData.original_title) titles.push(enData.original_title);
        }
        var trRes = yield fetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR");
        if (trRes.ok) {
          var trData = yield trRes.json();
          if (trData.name) titles.push(trData.name);
          if (trData.title) titles.push(trData.title);
        }
        var altRes = yield fetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "/alternative_titles?api_key=" + TMDB_API_KEY);
        if (altRes.ok) {
          var altData = yield altRes.json();
          var alts = altData.titles || altData.results || [];
          for (var i = 0; i < Math.min(alts.length, 6); i++) {
            if (alts[i].title) titles.push(alts[i].title);
          }
        }
      }
      var uniqueQueries = [];
      for (var j = 0; j < titles.length; j++) {
        var c = cleanStr(titles[j]);
        if (c && c.length >= 2 && uniqueQueries.indexOf(c) === -1) {
          uniqueQueries.push(c);
        }
      }
      return { numericId, uniqueQueries };
    } catch (e) {
      return { numericId: null, uniqueQueries: [] };
    }
  });
}
function searchAnizium(queries) {
  return __async(this, null, function* () {
    if (!queries || queries.length === 0) return null;
    for (var i = 0; i < queries.length; i++) {
      var q = queries[i];
      var sData = yield aniziumFetch("/page/search", { value: q, page: 1 });
      var items = sData && sData.page && sData.page.data ? sData.page.data : [];
      for (var j = 0; j < items.length; j++) {
        var item = items[j];
        var itemClean = cleanStr(item.name || "");
        if (itemClean && (itemClean === q || itemClean.indexOf(q) !== -1 || q.indexOf(itemClean) !== -1)) {
          return item;
        }
      }
    }
    var firstWord = queries[0].split(" ")[0];
    if (firstWord && firstWord.length >= 4) {
      var fallbackData = yield aniziumFetch("/page/search", { value: firstWord, page: 1 });
      var fbItems = fallbackData && fallbackData.page && fallbackData.page.data ? fallbackData.page.data : [];
      for (var k = 0; k < fbItems.length; k++) {
        var fbItem = fbItems[k];
        var fbClean = cleanStr(fbItem.name || "");
        for (var m = 0; m < queries.length; m++) {
          var query = queries[m];
          if (fbClean && (fbClean === query || fbClean.indexOf(query) !== -1 || query.indexOf(fbClean) !== -1)) {
            return fbItem;
          }
        }
      }
    }
    return null;
  });
}
function getStreams(id, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      var rawId = String(id || "").trim();
      var isTv = mediaType === "tv" || mediaType === "series";
      var sNum = parseInt(season) || 1;
      var eNum = parseInt(episode) || 1;
      var aniziumId = null;
      var isSeries = isTv;
      if (rawId.indexOf("anizium:ep:") === 0) {
        var parts = rawId.split(":");
        aniziumId = parts[2];
        sNum = parseInt(parts[3]) || 1;
        eNum = parseInt(parts[4]) || 1;
        isSeries = true;
      } else if (rawId.indexOf("anizium:movie:") === 0) {
        aniziumId = rawId.replace("anizium:movie:", "");
        isSeries = false;
      } else if (rawId.indexOf("anizium:anime:") === 0) {
        aniziumId = rawId.replace("anizium:anime:", "");
      } else {
        var tmdbInfo = yield resolveTmdbInfo(rawId, mediaType);
        var matched = yield searchAnizium(tmdbInfo.uniqueQueries);
        if (!matched) return [];
        aniziumId = matched.ID;
        if (matched.type === "movie") isSeries = false;
      }
      if (!aniziumId) return [];
      var sourceParams = {
        id: aniziumId,
        site: "main",
        server: "1"
      };
      if (isSeries) {
        sourceParams.season = sNum;
        sourceParams.episode = eNum;
      }
      var srcData = yield aniziumFetch("/anime/source", sourceParams);
      if (!srcData || !srcData.success || !srcData.groups || srcData.groups.length === 0) {
        return [];
      }
      var subtitles = formatSubtitles(srcData.subtitles);
      var streams = [];
      var groups = srcData.groups;
      for (var g = 0; g < groups.length; g++) {
        var group = groups[g];
        var isDub = group.group === "trdub";
        var isOriginal = group.group === "original";
        var isEnDub = group.group === "endub";
        var groupTag = isDub ? "T\xFCrk\xE7e Dublaj" : isOriginal ? "Japonca [TR Altyaz\u0131l\u0131]" : isEnDub ? "\u0130ngilizce Dublaj" : group.name || "Japonca";
        var items = group.items || [];
        items.sort(function(a, b) {
          return (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0);
        });
        for (var it = 0; it < items.length; it++) {
          var item = items[it];
          if (!item.link) continue;
          var qLabel = item.quality === 2160 ? "4K UHD" : item.quality === 1440 ? "2K QHD" : item.quality + "p";
          var contentLang = isDub ? "tr" : isEnDub ? "en" : "ja";
          streams.push({
            name: "Anizium",
            title: "\u231C Anizium \u231F | " + groupTag + " [" + qLabel + "]",
            url: item.link,
            quality: qLabel,
            format: item.type || "mp4",
            isHls: item.type === "hls",
            contentLanguage: contentLang,
            provider: "anizium",
            behaviorHints: {
              notWebReady: false
            },
            subtitles: subtitles.length > 0 ? subtitles : void 0
          });
        }
      }
      return streams;
    } catch (e) {
      return [];
    }
  });
}
function getSubtitles(id, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      var rawId = String(id || "").trim();
      var isTv = mediaType === "tv" || mediaType === "series";
      var sNum = parseInt(season) || 1;
      var eNum = parseInt(episode) || 1;
      var aniziumId = null;
      var isSeries = isTv;
      if (rawId.indexOf("anizium:ep:") === 0) {
        var parts = rawId.split(":");
        aniziumId = parts[2];
        sNum = parseInt(parts[3]) || 1;
        eNum = parseInt(parts[4]) || 1;
        isSeries = true;
      } else if (rawId.indexOf("anizium:movie:") === 0) {
        aniziumId = rawId.replace("anizium:movie:", "");
        isSeries = false;
      } else if (rawId.indexOf("anizium:anime:") === 0) {
        aniziumId = rawId.replace("anizium:anime:", "");
      } else {
        var tmdbInfo = yield resolveTmdbInfo(rawId, mediaType);
        var matched = yield searchAnizium(tmdbInfo.uniqueQueries);
        if (!matched) return { subtitles: [] };
        aniziumId = matched.ID;
        if (matched.type === "movie") isSeries = false;
      }
      if (!aniziumId) return { subtitles: [] };
      var sourceParams = { id: aniziumId, site: "main", server: "1" };
      if (isSeries) {
        sourceParams.season = sNum;
        sourceParams.episode = eNum;
      }
      var srcData = yield aniziumFetch("/anime/source", sourceParams);
      if (!srcData || !srcData.subtitles) return { subtitles: [] };
      return { subtitles: formatSubtitles(srcData.subtitles) };
    } catch (e) {
      return { subtitles: [] };
    }
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      var homeData = yield aniziumFetch("/page/home");
      if (!homeData || !homeData.success) return { metas: [] };
      var allAnimes = [];
      if (homeData.settlement_top) allAnimes = allAnimes.concat(homeData.settlement_top);
      if (homeData.settlement_middle) allAnimes = allAnimes.concat(homeData.settlement_middle);
      if (homeData.settlement_lower) allAnimes = allAnimes.concat(homeData.settlement_lower);
      var metas = [];
      var seen = {};
      for (var i = 0; i < allAnimes.length; i++) {
        var item = allAnimes[i];
        if (!item || !item.ID || seen[item.ID]) continue;
        seen[item.ID] = true;
        var isMovie = item.type === "movie";
        metas.push({
          id: isMovie ? "anizium:movie:" + item.ID : "anizium:anime:" + item.ID,
          type: isMovie ? "movie" : "series",
          name: item.name || "Anime",
          poster: item.poster || item.details_banner || item.banner,
          background: item.banner || item.details_banner || item.poster,
          description: item.overview || item.name + " - Anizium 4K Anime",
          genres: ["Anime", "Anizium"]
        });
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
      var rawId = typeof args === "string" ? args : args && args.id ? args.id : "";
      if (!rawId || rawId.indexOf("anizium:") !== 0) return { meta: null };
      var cleanId = rawId.replace("anizium:anime:", "").replace("anizium:movie:", "");
      var dRes = yield aniziumFetch("/anime/get", { id: cleanId });
      if (!dRes || !dRes.success || !dRes.data) return { meta: null };
      var d = dRes.data;
      var name = d.name || "Anime";
      var poster = d.poster || d.details_banner || d.banner;
      var bg = d.banner || d.details_banner || poster;
      var desc = d.overview || name + " - Anizium";
      var isMovie = d.type === "movie";
      var videos = [];
      if (!isMovie && d.seasons && d.seasons.length > 0) {
        for (var s = 0; s < d.seasons.length; s++) {
          var season = d.seasons[s];
          var sNum = season.number || 1;
          var eps = season.episodes || [];
          for (var e = 0; e < eps.length; e++) {
            var ep = eps[e];
            var eNum = ep.number || e + 1;
            videos.push({
              id: "anizium:ep:" + cleanId + ":" + sNum + ":" + eNum,
              title: ep.name ? sNum + ". Sezon " + eNum + ". B\xF6l\xFCm - " + ep.name : sNum + ". Sezon " + eNum + ". B\xF6l\xFCm",
              season: sNum,
              episode: eNum
            });
          }
        }
      }
      return {
        meta: {
          id: rawId,
          type: isMovie ? "movie" : "series",
          name,
          poster,
          background: bg,
          description: desc,
          genres: ["Anime", "Anizium"],
          videos: videos.length > 0 ? videos : void 0
        }
      };
    } catch (e2) {
      return { meta: null };
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
if (typeof module !== "undefined") {
  module.exports = wrapAll({
    getStreams,
    getSubtitles,
    getCatalog,
    getMeta
  }, cfgReady);
}
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = getStreams;
  globalThis.getSubtitles = getSubtitles;
  globalThis.getCatalog = getCatalog;
  globalThis.getMeta = getMeta;
}

if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
    if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
    if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
    if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
    if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

