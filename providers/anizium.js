/**
 * Anthology Provider: anizium
 * Built from src/anizium/index.js
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
function timeoutSignal(ms) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  if (typeof AbortController !== "undefined") {
    var controller = new AbortController();
    setTimeout(function() {
      try {
        controller.abort();
      } catch (e) {
      }
    }, ms);
    return controller.signal;
  }
  return void 0;
}
function safeFetchJson(url, options, timeoutMs) {
  return __async(this, null, function* () {
    try {
      var opts = Object.assign({}, options || {});
      if (timeoutMs) {
        var sig = timeoutSignal(timeoutMs);
        if (sig) opts.signal = sig;
      }
      var res = yield fetch(url, opts);
      if (!res.ok) return null;
      return yield res.json();
    } catch (e) {
      return null;
    }
  });
}
function cleanStr(str) {
  if (!str) return "";
  var s = str.toString().toLowerCase();
  try {
    if (typeof s.normalize === "function") {
      s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
  } catch (e) {
  }
  return s.replace(/[ıİ]/g, "i").replace(/[üÜûùú]/g, "u").replace(/[öÖōôòó]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[āâàá]/g, "a").replace(/[ēêèé]/g, "e").replace(/[īîìí]/g, "i").replace(/[ū]/g, "u").replace(/[ñ]/g, "n").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
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
    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        var headers = Object.assign({}, DEFAULT_HEADERS, {
          "Cf-Control": generateCfControl(),
          "device": "browser",
          "language": "tr",
          "site": "main"
        });
        var sig = timeoutSignal(8e3);
        var opts = sig ? { headers, signal: sig } : { headers };
        var res = yield fetch(url, opts);
        if (res.status === 429 && attempt === 0) {
          yield new Promise(function(resolve) {
            setTimeout(resolve, 650);
          });
          continue;
        }
        if (!res.ok) return null;
        return yield res.json();
      } catch (e) {
        return null;
      }
    }
    return null;
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
function parseMediaRequest(id, mediaType, season, episode) {
  var rawId = id;
  var mType = mediaType;
  var sRaw = season;
  var eRaw = episode;
  if (typeof id === "object" && id !== null) {
    mType = id.type || id.mediaType || mType;
    sRaw = id.season !== void 0 ? id.season : sRaw;
    eRaw = id.episode !== void 0 ? id.episode : eRaw;
    rawId = id.id;
  }
  var strId = String(rawId || "").trim();
  var lowerType = String(mType || "").toLowerCase();
  var sParam = parseInt(sRaw, 10);
  var eParam = parseInt(eRaw, 10);
  var isTv = lowerType === "tv" || lowerType === "series" || lowerType === "anime" || !lowerType && (sParam > 0 || eParam > 0 || strId.indexOf(":") !== -1);
  if (strId.indexOf("anizium:ep:") === 0) {
    var epParts = strId.split(":");
    return {
      direct: true,
      aniziumId: epParts[2],
      isSeries: true,
      season: parseInt(epParts[3], 10) || 1,
      episode: parseInt(epParts[4], 10) || 1
    };
  }
  if (strId.indexOf("anizium:movie:") === 0) {
    return {
      direct: true,
      aniziumId: strId.replace("anizium:movie:", ""),
      isSeries: false,
      season: 1,
      episode: 1
    };
  }
  if (strId.indexOf("anizium:anime:") === 0) {
    return {
      direct: true,
      aniziumId: strId.replace("anizium:anime:", ""),
      isSeries: isTv,
      season: sParam > 0 ? sParam : 1,
      episode: eParam > 0 ? eParam : 1
    };
  }
  var parts = strId.split(":");
  var head = parts[0].toLowerCase();
  if (head === "kitsu" || head === "mal" || head === "anilist" || head === "anidb") {
    var trackerEp = (parts.length >= 3 ? parseInt(parts[2], 10) : 0) || (eParam > 0 ? eParam : 1);
    return {
      direct: false,
      kind: head,
      extId: parts[1] || "",
      isTracker: true,
      isTv: isTv || lowerType !== "movie",
      season: sParam > 0 ? sParam : 1,
      episode: trackerEp
    };
  }
  if (head === "tmdb" || head === "tvdb" || head === "imdb" || head === "cinemeta" || head === "cine") {
    var normKind = head === "imdb" || head === "cinemeta" || head === "cine" ? "imdb" : head;
    var pSeason = parts.length >= 3 ? parseInt(parts[2], 10) : 0;
    var pEp = parts.length >= 4 ? parseInt(parts[3], 10) : 0;
    return {
      direct: false,
      kind: normKind,
      extId: parts[1] || "",
      isTracker: false,
      isTv,
      season: pSeason > 0 ? pSeason : sParam > 0 ? sParam : 1,
      episode: pEp > 0 ? pEp : eParam > 0 ? eParam : 1
    };
  }
  var colonSeason = parts.length >= 2 ? parseInt(parts[1], 10) : 0;
  var colonEp = parts.length >= 3 ? parseInt(parts[2], 10) : 0;
  return {
    direct: false,
    kind: head.indexOf("tt") === 0 ? "imdb" : "tmdb",
    extId: parts[0],
    isTracker: false,
    isTv,
    season: colonSeason > 0 ? colonSeason : sParam > 0 ? sParam : 1,
    episode: colonEp > 0 ? colonEp : eParam > 0 ? eParam : 1
  };
}
function addUniqueCleanedTitles(list, rawTitles) {
  for (var i = 0; i < rawTitles.length; i++) {
    var c = cleanStr(rawTitles[i]);
    if (c && c.length >= 2 && list.indexOf(c) === -1) {
      list.push(c);
    }
  }
}
function resolveTrackerInfo(kind, extId, trackerEp) {
  return __async(this, null, function* () {
    var result = {
      tmdbId: null,
      tvdbId: null,
      isMovie: null,
      trackerQueries: [],
      mappedSeason: null,
      mappedEpisode: null,
      absoluteEpisode: null
    };
    if (!extId) return result;
    var rawTitles = [];
    var paramKey = kind === "kitsu" ? "kitsu_id" : kind === "mal" ? "mal_id" : kind === "anilist" ? "anilist_id" : "anidb_id";
    var aniZip = yield safeFetchJson("https://api.ani.zip/mappings?" + paramKey + "=" + encodeURIComponent(extId), {}, 5e3);
    if (aniZip && aniZip.mappings) {
      var m = aniZip.mappings;
      if (m.themoviedb_id) result.tmdbId = String(m.themoviedb_id);
      if (m.thetvdb_id) result.tvdbId = String(m.thetvdb_id);
      if (m.type === "MOVIE") result.isMovie = true;
      else if (m.type === "TV" || m.type === "OVA" || m.type === "ONA") result.isMovie = false;
      if (aniZip.titles) {
        if (aniZip.titles.en) rawTitles.push(aniZip.titles.en);
        if (aniZip.titles["x-jat"]) rawTitles.push(aniZip.titles["x-jat"]);
        if (aniZip.titles.ja) rawTitles.push(aniZip.titles.ja);
      }
      if (aniZip.episodes && aniZip.episodes[String(trackerEp)]) {
        var epInfo = aniZip.episodes[String(trackerEp)];
        var ms = parseInt(epInfo.seasonNumber, 10);
        var me = parseInt(epInfo.episodeNumber, 10);
        var ma = parseInt(epInfo.absoluteEpisodeNumber, 10);
        if (ms > 0) result.mappedSeason = ms;
        if (me > 0) result.mappedEpisode = me;
        if (ma > 0) result.absoluteEpisode = ma;
      }
    }
    if (!result.tmdbId && rawTitles.length === 0 || kind === "kitsu" && rawTitles.length === 0) {
      if (kind === "kitsu") {
        var kData = yield safeFetchJson("https://kitsu.io/api/edge/anime/" + encodeURIComponent(extId) + "?include=mappings", {}, 5e3);
        var attr = kData && kData.data && kData.data.attributes;
        if (attr) {
          if (attr.canonicalTitle) rawTitles.push(attr.canonicalTitle);
          if (attr.titles) {
            if (attr.titles.en) rawTitles.push(attr.titles.en);
            if (attr.titles.en_jp) rawTitles.push(attr.titles.en_jp);
            if (attr.titles.ja_jp) rawTitles.push(attr.titles.ja_jp);
          }
          if (Array.isArray(attr.abbreviatedTitles)) {
            for (var a = 0; a < attr.abbreviatedTitles.length; a++) rawTitles.push(attr.abbreviatedTitles[a]);
          }
          if (result.isMovie === null && attr.subtype) {
            result.isMovie = String(attr.subtype).toLowerCase() === "movie";
          }
        }
        var included = kData && Array.isArray(kData.included) ? kData.included : [];
        for (var inc = 0; inc < included.length; inc++) {
          var extSite = included[inc] && included[inc].attributes && included[inc].attributes.externalSite;
          var extVal = included[inc] && included[inc].attributes && included[inc].attributes.externalId;
          if (!result.tvdbId && extVal && (extSite === "thetvdb/series" || extSite === "thetvdb")) {
            result.tvdbId = String(extVal).split("/")[0];
          }
        }
      } else if (kind === "anilist" || kind === "mal") {
        var gqlVar = kind === "mal" ? { idMal: parseInt(extId, 10) } : { id: parseInt(extId, 10) };
        var gqlQuery = kind === "mal" ? "query ($idMal: Int) { Media(idMal: $idMal, type: ANIME) { format title { english romaji native } synonyms } }" : "query ($id: Int) { Media(id: $id, type: ANIME) { format title { english romaji native } synonyms } }";
        var alRes = yield safeFetchJson("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ query: gqlQuery, variables: gqlVar })
        }, 5e3);
        var media = alRes && alRes.data && alRes.data.Media;
        if (media) {
          if (media.title) {
            if (media.title.english) rawTitles.push(media.title.english);
            if (media.title.romaji) rawTitles.push(media.title.romaji);
            if (media.title.native) rawTitles.push(media.title.native);
          }
          if (Array.isArray(media.synonyms)) {
            for (var sy = 0; sy < Math.min(media.synonyms.length, 4); sy++) rawTitles.push(media.synonyms[sy]);
          }
          if (result.isMovie === null && media.format) {
            result.isMovie = media.format === "MOVIE";
          }
        }
      }
    }
    addUniqueCleanedTitles(result.trackerQueries, rawTitles);
    return result;
  });
}
function resolveTmdbInfo(kind, extId, isTv) {
  return __async(this, null, function* () {
    try {
      var numericId = null;
      var resolvedIsTv = isTv;
      var rawTitles = [];
      var baseTitles = [];
      var tmdbSeasons = [];
      if (kind === "imdb" || kind === "tvdb") {
        var src = kind === "imdb" ? "imdb_id" : "tvdb_id";
        var fData = yield safeFetchJson("https://api.themoviedb.org/3/find/" + encodeURIComponent(extId) + "?api_key=" + TMDB_API_KEY + "&external_source=" + src, {}, 6e3);
        if (fData) {
          var tvHit = fData.tv_results && fData.tv_results[0];
          var movHit = fData.movie_results && fData.movie_results[0];
          var item = isTv ? tvHit || movHit : movHit || tvHit;
          if (item) {
            numericId = item.id;
            resolvedIsTv = item === tvHit;
            if (item.name) rawTitles.push(item.name);
            if (item.title) rawTitles.push(item.title);
            if (item.original_name) rawTitles.push(item.original_name);
            if (item.original_title) rawTitles.push(item.original_title);
          }
        }
      } else if (/^\d+$/.test(String(extId))) {
        numericId = String(extId);
      }
      if (numericId) {
        var type = resolvedIsTv ? "tv" : "movie";
        var enData = yield safeFetchJson("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY, {}, 6e3);
        if (enData) {
          if (enData.name) {
            rawTitles.push(enData.name);
            baseTitles.push(enData.name);
          }
          if (enData.title) {
            rawTitles.push(enData.title);
            baseTitles.push(enData.title);
          }
          if (enData.original_name) {
            rawTitles.push(enData.original_name);
            baseTitles.push(enData.original_name);
          }
          if (enData.original_title) {
            rawTitles.push(enData.original_title);
            baseTitles.push(enData.original_title);
          }
          if (Array.isArray(enData.seasons)) {
            for (var s = 0; s < enData.seasons.length; s++) {
              if (enData.seasons[s] && enData.seasons[s].season_number > 0) {
                tmdbSeasons.push(enData.seasons[s]);
              }
            }
            tmdbSeasons.sort(function(a, b) {
              return a.season_number - b.season_number;
            });
          }
        }
        var trData = yield safeFetchJson("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR", {}, 6e3);
        if (trData) {
          if (trData.name) {
            rawTitles.push(trData.name);
            baseTitles.push(trData.name);
          }
          if (trData.title) {
            rawTitles.push(trData.title);
            baseTitles.push(trData.title);
          }
        }
        var altData = yield safeFetchJson("https://api.themoviedb.org/3/" + type + "/" + numericId + "/alternative_titles?api_key=" + TMDB_API_KEY, {}, 6e3);
        if (altData) {
          var alts = altData.titles || altData.results || [];
          var altAdded = 0;
          for (var i = 0; i < alts.length && altAdded < 2; i++) {
            var cc = alts[i].iso_3166_1 || "";
            if (alts[i].title && (!cc || cc === "US" || cc === "GB" || cc === "TR" || cc === "JP")) {
              rawTitles.push(alts[i].title);
              altAdded++;
            }
          }
        }
      }
      var uniqueQueries = [];
      var uniqueBase = [];
      addUniqueCleanedTitles(uniqueQueries, rawTitles);
      addUniqueCleanedTitles(uniqueBase, baseTitles);
      return {
        numericId,
        isTv: resolvedIsTv,
        uniqueQueries,
        baseQueries: uniqueBase,
        tmdbSeasons
      };
    } catch (e) {
      return { numericId: null, isTv, uniqueQueries: [], baseQueries: [], tmdbSeasons: [] };
    }
  });
}
function scoreAniziumCandidate(item, query, expectedIsMovie, index) {
  var itemClean = cleanStr(item && item.name ? item.name : "");
  if (!itemClean || !query) return -9999;
  var titleScore = 0;
  if (itemClean === query) {
    titleScore = 500;
  } else if (itemClean.indexOf(query) === 0) {
    titleScore = 260 - Math.min(200, (itemClean.length - query.length) * 3);
  } else if (itemClean.indexOf(query) !== -1 || query.indexOf(itemClean) !== -1) {
    titleScore = 140 - Math.min(120, Math.abs(itemClean.length - query.length) * 3);
  } else {
    return -9999;
  }
  var typeScore = 0;
  if (expectedIsMovie !== null && expectedIsMovie !== void 0) {
    var itemIsMovie = item.type === "movie";
    typeScore = itemIsMovie === expectedIsMovie ? 1e3 : -500;
  }
  return typeScore + titleScore - index * 0.1;
}
function searchAnizium(queries, expectedIsMovie, searchCache) {
  return __async(this, null, function* () {
    if (!queries || queries.length === 0) return null;
    var cache = searchCache || {};
    var bestItem = null;
    var bestScore = -9999;
    var limit = Math.min(queries.length, 4);
    for (var i = 0; i < limit; i++) {
      var q = queries[i];
      if (!q) continue;
      var items;
      if (cache[q] !== void 0) {
        items = cache[q];
      } else {
        var sData = yield aniziumFetch("/page/search", { value: q, page: 1 });
        items = sData && sData.page && sData.page.data ? sData.page.data : [];
        cache[q] = items;
      }
      for (var j = 0; j < items.length; j++) {
        var item = items[j];
        var sc = scoreAniziumCandidate(item, q, expectedIsMovie, j);
        if (sc > bestScore) {
          bestScore = sc;
          bestItem = item;
        }
        if (bestScore >= 1499) {
          return bestItem;
        }
      }
    }
    if (bestItem) return bestItem;
    var firstWord = queries[0] ? queries[0].split(" ")[0] : "";
    if (firstWord && firstWord.length >= 4) {
      var fbItems;
      if (cache[firstWord] !== void 0) {
        fbItems = cache[firstWord];
      } else {
        var fallbackData = yield aniziumFetch("/page/search", { value: firstWord, page: 1 });
        fbItems = fallbackData && fallbackData.page && fallbackData.page.data ? fallbackData.page.data : [];
        cache[firstWord] = fbItems;
      }
      for (var k = 0; k < fbItems.length; k++) {
        var fbItem = fbItems[k];
        for (var m = 0; m < queries.length; m++) {
          var fbScore = scoreAniziumCandidate(fbItem, queries[m], expectedIsMovie, k);
          if (fbScore > bestScore) {
            bestScore = fbScore;
            bestItem = fbItem;
          }
        }
      }
    }
    return bestItem;
  });
}
function resolveAniziumEpisode(aniziumId, reqSeason, reqEpisode, reqAbsolute, tmdbSeasons, baseQueries) {
  return __async(this, null, function* () {
    var dRes = yield aniziumFetch("/anime/get", { id: aniziumId });
    var seasons = dRes && dRes.success && dRes.data && Array.isArray(dRes.data.seasons) ? dRes.data.seasons : [];
    if (seasons.length === 0) {
      return { aniziumId, season: reqSeason || 1, episode: reqEpisode || 1 };
    }
    var sortedSeasons = seasons.slice().sort(function(a, b) {
      return (parseInt(a.number, 10) || 1) - (parseInt(b.number, 10) || 1);
    });
    var flatEps = [];
    var directMatch = false;
    for (var s = 0; s < sortedSeasons.length; s++) {
      var se = sortedSeasons[s];
      var sNum = parseInt(se.number, 10) || 1;
      var eps = Array.isArray(se.episodes) ? se.episodes.slice() : [];
      eps.sort(function(a, b) {
        return (parseInt(a.number, 10) || 0) - (parseInt(b.number, 10) || 0);
      });
      for (var e = 0; e < eps.length; e++) {
        var eNum = parseInt(eps[e].number, 10) || e + 1;
        flatEps.push({ season: sNum, episode: eNum });
        if (sNum === reqSeason && eNum === reqEpisode) {
          directMatch = true;
        }
      }
    }
    if (directMatch) {
      return { aniziumId, season: reqSeason, episode: reqEpisode };
    }
    var absTarget = reqAbsolute > 0 ? reqAbsolute : 0;
    if (!absTarget && reqSeason > 1 && Array.isArray(tmdbSeasons) && tmdbSeasons.length > 0) {
      var prevSum = 0;
      for (var ts = 0; ts < tmdbSeasons.length; ts++) {
        var tSeason = tmdbSeasons[ts];
        if (tSeason.season_number > 0 && tSeason.season_number < reqSeason) {
          prevSum += parseInt(tSeason.episode_count, 10) || 0;
        }
      }
      if (prevSum > 0) {
        absTarget = prevSum + reqEpisode;
      }
    } else if (!absTarget && reqSeason === 1) {
      absTarget = reqEpisode;
    }
    if (absTarget > 0) {
      if (sortedSeasons.length === 1) {
        var singleSNum = parseInt(sortedSeasons[0].number, 10) || 1;
        for (var f = 0; f < flatEps.length; f++) {
          if (flatEps[f].episode === absTarget) {
            return { aniziumId, season: singleSNum, episode: absTarget };
          }
        }
      }
      if (absTarget <= flatEps.length) {
        var mapped = flatEps[absTarget - 1];
        return { aniziumId, season: mapped.season, episode: mapped.episode };
      }
      if (reqSeason > 1 && Array.isArray(tmdbSeasons) && Array.isArray(baseQueries) && baseQueries.length > 0) {
        var targetSeasonObj = null;
        for (var k = 0; k < tmdbSeasons.length; k++) {
          if (tmdbSeasons[k].season_number === reqSeason) {
            targetSeasonObj = tmdbSeasons[k];
            break;
          }
        }
        var sName = targetSeasonObj && targetSeasonObj.name ? cleanStr(targetSeasonObj.name) : "";
        if (sName && !/^season \d+$/.test(sName) && !/^sezon \d+$/.test(sName)) {
          var sequelQueries = [];
          addUniqueCleanedTitles(sequelQueries, [baseQueries[0] + " " + sName, sName]);
          var sequelMatch = yield searchAnizium(sequelQueries, false);
          if (sequelMatch && String(sequelMatch.ID) !== String(aniziumId)) {
            return yield resolveAniziumEpisode(sequelMatch.ID, 1, reqEpisode, reqEpisode, [], []);
          }
        }
      }
    }
    return { aniziumId, season: reqSeason || 1, episode: reqEpisode || 1 };
  });
}
function resolveSourceData(id, mediaType, season, episode) {
  return __async(this, null, function* () {
    var req = parseMediaRequest(id, mediaType, season, episode);
    var aniziumId = null;
    var isSeries = req.direct ? req.isSeries : req.isTv;
    var targetSeason = req.season;
    var targetEpisode = req.episode;
    var targetAbsolute = null;
    var tmdbSeasons = [];
    var baseQueries = [];
    if (req.direct) {
      aniziumId = req.aniziumId;
    } else {
      var expectedIsMovie = req.isTv ? false : null;
      var tracker = null;
      if (req.isTracker) {
        tracker = yield resolveTrackerInfo(req.kind, req.extId, req.episode);
        if (tracker.isMovie !== null) {
          expectedIsMovie = tracker.isMovie;
          isSeries = !tracker.isMovie;
        }
      }
      var tmdbKind = req.kind;
      var tmdbExtId = req.extId;
      if (req.isTracker) {
        if (tracker && tracker.tmdbId) {
          tmdbKind = "tmdb";
          tmdbExtId = tracker.tmdbId;
        } else if (tracker && tracker.tvdbId) {
          tmdbKind = "tvdb";
          tmdbExtId = tracker.tvdbId;
        } else {
          tmdbKind = null;
          tmdbExtId = null;
        }
      }
      var tmdbInfo = tmdbKind ? yield resolveTmdbInfo(tmdbKind, tmdbExtId, isSeries) : { numericId: null, isTv: isSeries, uniqueQueries: [], baseQueries: [], tmdbSeasons: [] };
      if (tmdbInfo.numericId) {
        isSeries = tmdbInfo.isTv;
        expectedIsMovie = !tmdbInfo.isTv;
        tmdbSeasons = tmdbInfo.tmdbSeasons;
        baseQueries = tmdbInfo.baseQueries;
      }
      var matched = null;
      var matchedDedicatedTracker = false;
      var searchCache = {};
      var trackerMatched = null;
      if (tracker && tracker.trackerQueries.length > 0) {
        trackerMatched = yield searchAnizium(tracker.trackerQueries, expectedIsMovie, searchCache);
        if (trackerMatched) {
          var tmClean = cleanStr(trackerMatched.name || "");
          var isBaseTitle = baseQueries.indexOf(tmClean) !== -1;
          var isExactTracker = tracker.trackerQueries.indexOf(tmClean) !== -1;
          if (isExactTracker && !isBaseTitle) {
            matched = trackerMatched;
            matchedDedicatedTracker = true;
          } else if (!tmdbInfo.uniqueQueries.length || isBaseTitle) {
            matched = trackerMatched;
          }
        }
      }
      if (!matched && tmdbInfo.uniqueQueries.length > 0) {
        matched = yield searchAnizium(tmdbInfo.uniqueQueries, expectedIsMovie, searchCache);
      }
      if (!matched && trackerMatched) {
        matched = trackerMatched;
      }
      if (!matched) return null;
      aniziumId = matched.ID;
      if (matched.type === "movie") isSeries = false;
      if (isSeries && tracker && !matchedDedicatedTracker) {
        if (tracker.mappedSeason) targetSeason = tracker.mappedSeason;
        if (tracker.mappedEpisode) targetEpisode = tracker.mappedEpisode;
        if (tracker.absoluteEpisode) targetAbsolute = tracker.absoluteEpisode;
      }
    }
    if (!aniziumId) return null;
    var resolvedPos = { aniziumId, season: targetSeason, episode: targetEpisode };
    if (isSeries && !req.direct) {
      resolvedPos = yield resolveAniziumEpisode(aniziumId, targetSeason, targetEpisode, targetAbsolute, tmdbSeasons, baseQueries);
    }
    var sourceParams = {
      id: resolvedPos.aniziumId,
      site: "main",
      server: "1"
    };
    if (isSeries) {
      sourceParams.season = resolvedPos.season;
      sourceParams.episode = resolvedPos.episode;
    }
    return yield aniziumFetch("/anime/source", sourceParams);
  });
}
function getStreams(id, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      var srcData = yield resolveSourceData(id, mediaType, season, episode);
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
          var streamHeaders = {
            "Referer": "https://anizium.co/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
          };
          streams.push({
            name: "Anizium",
            title: "\u231C Anizium \u231F | " + groupTag + " [" + qLabel + "]",
            url: item.link,
            quality: qLabel,
            format: item.type || "mp4",
            isHls: item.type === "hls",
            contentLanguage: contentLang,
            provider: "anizium",
            headers: streamHeaders,
            behaviorHints: {
              notWebReady: false,
              proxyHeaders: {
                request: streamHeaders
              }
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
      var srcData = yield resolveSourceData(id, mediaType, season, episode);
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

