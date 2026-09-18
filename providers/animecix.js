/**
 * Anthology Provider: animecix
 * Built from src/animecix/index.js
 * Build Date: 2026-09-18T16:40:17.272Z
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

// src/animecix/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.anime.animecix.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var BASE_URL = "https://animecix.tv";
var XEH_KEY = "7Y2ozlO+QysR5w9Q6Tupmtvl9jJp7ThFH8SB+Lo7NvZjgjqRSqOgcT2v4ISM9sP10LmnlYI8WQ==.xrlyOBFS5BHjQ2Lk";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/",
  "x-e-h": XEH_KEY
};
function ultraClean(str) {
  if (!str) return "";
  return str.toString().toLowerCase().replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[^a-z0-9]/g, "").trim();
}
function resolveTmdbInfo(id, mediaType) {
  return __async(this, null, function* () {
    try {
      let cleanId = String(id || "").trim();
      if (cleanId.includes(":")) cleanId = cleanId.split(":")[0];
      let numericId = null;
      let title = "";
      let origTitle = "";
      if (cleanId.startsWith("tt")) {
        const findRes = yield fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
        if (findRes.ok) {
          const fData = yield findRes.json();
          const item = mediaType === "tv" || mediaType === "series" ? fData.tv_results && fData.tv_results[0] : fData.movie_results && fData.movie_results[0];
          if (item) {
            numericId = item.id;
            title = item.name || item.title || "";
            origTitle = item.original_name || item.original_title || "";
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
        }
      }
      return { title, origTitle, numericId };
    } catch (e) {
      return { title: "", origTitle: "", numericId: id };
    }
  });
}
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      if (typeof tmdbId === "object" && tmdbId && tmdbId.id) {
        return getStreams(tmdbId.id, mediaType || "tv", seasonNum, episodeNum);
      }
      const isTv = mediaType === "tv" || mediaType === "series" || !mediaType;
      const season = parseInt(seasonNum) || 1;
      const episode = parseInt(episodeNum) || 1;
      if (typeof tmdbId === "string" && tmdbId.startsWith("animecix:title:")) {
        const showMeta = yield getMeta(tmdbId);
        if (showMeta && showMeta.meta && Array.isArray(showMeta.meta.videos) && showMeta.meta.videos.length > 0) {
          return yield getStreams(showMeta.meta.videos[0].id);
        }
      }
      if (typeof tmdbId === "string" && tmdbId.startsWith("animecix:ep:")) {
        const parts = tmdbId.replace("animecix:ep:", "").split(":");
        const titleId = parts[0];
        const targetSeason = parseInt(parts[1]) || season;
        const targetEp = parseInt(parts[2]) || episode;
        const videoUrl2 = `${BASE_URL}/secure/best-video?titleId=${titleId}&episode=${targetEp}&season=${targetSeason}`;
        const bestRes2 = yield fetch(videoUrl2, { headers: HEADERS, redirect: "follow" });
        const finalUrl2 = bestRes2.url || "";
        const m2 = finalUrl2.match(/tau-video\.xyz\/embed\/([a-zA-Z0-9_-]+)/);
        if (!m2) return [];
        const tauId2 = m2[1];
        const tauRes2 = yield fetch(`https://tau-video.xyz/api/video/${tauId2}`, {
          headers: { "User-Agent": HEADERS["User-Agent"], "Referer": BASE_URL + "/" }
        });
        if (!tauRes2.ok) return [];
        const tauData2 = yield tauRes2.json();
        if (!tauData2.urls || tauData2.urls.length === 0) return [];
        return tauData2.urls.map((u) => ({
          name: "AnimeciX",
          title: `\u231C AnimeciX \u231F | TauVideo [${u.label || "HD"}]`,
          url: u.url,
          quality: u.label || "1080p",
          provider: "animecix",
          headers: { "User-Agent": HEADERS["User-Agent"], "Referer": BASE_URL + "/" }
        }));
      }
      if (typeof tmdbId === "string" && tmdbId.startsWith("animecix:title:")) {
        const titleId = tmdbId.replace("animecix:title:", "");
        const videoUrl2 = `${BASE_URL}/secure/best-video?titleId=${titleId}&episode=${episode}&season=${season}`;
        const bestRes2 = yield fetch(videoUrl2, { headers: HEADERS, redirect: "follow" });
        const finalUrl2 = bestRes2.url || "";
        const m2 = finalUrl2.match(/tau-video\.xyz\/embed\/([a-zA-Z0-9_-]+)/);
        if (!m2) return [];
        const tauId2 = m2[1];
        const tauRes2 = yield fetch(`https://tau-video.xyz/api/video/${tauId2}`, {
          headers: { "User-Agent": HEADERS["User-Agent"], "Referer": BASE_URL + "/" }
        });
        if (!tauRes2.ok) return [];
        const tauData2 = yield tauRes2.json();
        if (!tauData2.urls || tauData2.urls.length === 0) return [];
        return tauData2.urls.map((u) => ({
          name: "AnimeciX",
          title: `\u231C AnimeciX \u231F | TauVideo [${u.label || "HD"}]`,
          url: u.url,
          quality: u.label || "1080p",
          provider: "animecix",
          headers: { "User-Agent": HEADERS["User-Agent"], "Referer": BASE_URL + "/" }
        }));
      }
      const info = yield resolveTmdbInfo(tmdbId, mediaType);
      const queries = [info.title, info.origTitle].filter(Boolean);
      if (queries.length === 0) return [];
      let matchedItem = null;
      for (const q of queries) {
        const searchRes = yield fetch(`${BASE_URL}/secure/search/${encodeURIComponent(q)}?limit=10`, { headers: HEADERS });
        if (!searchRes.ok) continue;
        const sData = yield searchRes.json();
        if (sData.results && sData.results.length > 0) {
          const qClean = ultraClean(q);
          for (const item of sData.results) {
            if (info.numericId && String(item.tmdb_id) === String(info.numericId)) {
              matchedItem = item;
              break;
            }
            const itemClean = ultraClean(item.name || "");
            if (qClean && itemClean && (itemClean.includes(qClean) || qClean.includes(itemClean))) {
              matchedItem = item;
              break;
            }
          }
          if (matchedItem) break;
        }
      }
      if (!matchedItem) return [];
      let videoUrl = isTv ? `${BASE_URL}/secure/best-video?titleId=${matchedItem.id}&episode=${episode}&season=${season}` : `${BASE_URL}/secure/best-video?titleId=${matchedItem.id}&episode=1&season=1`;
      const bestRes = yield fetch(videoUrl, { headers: HEADERS, redirect: "follow" });
      const finalUrl = bestRes.url || "";
      const m = finalUrl.match(/tau-video\.xyz\/embed\/([a-zA-Z0-9_-]+)/);
      if (!m) return [];
      const tauId = m[1];
      const tauRes = yield fetch(`https://tau-video.xyz/api/video/${tauId}`, {
        headers: {
          "User-Agent": HEADERS["User-Agent"],
          "Referer": BASE_URL + "/"
        }
      });
      if (!tauRes.ok) return [];
      const tauData = yield tauRes.json();
      if (!tauData.urls || tauData.urls.length === 0) return [];
      const displayTitle = isTv ? `${matchedItem.name} S${season}E${episode}` : matchedItem.name;
      const aHeaders = {
        "User-Agent": HEADERS["User-Agent"],
        "Referer": BASE_URL + "/"
      };
      return tauData.urls.map((u) => ({
        name: displayTitle,
        title: `\u231C AnimeciX \u231F | TauVideo [${u.label || "HD"}]`,
        url: u.url,
        quality: u.label || "1080p",
        provider: "animecix",
        headers: aHeaders,
        behaviorHints: {
          notWebReady: true,
          proxyHeaders: {
            request: aHeaders
          }
        }
      }));
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
if (typeof module !== "undefined") module.exports = { getStreams };
if (typeof globalThis !== "undefined") globalThis.getStreams = getStreams;
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      const query = args && args.search || args && args.extra && args.extra.search || args && args.query || "";
      let items = [];
      if (query) {
        const res = yield fetch(`${BASE_URL}/secure/search/${encodeURIComponent(query)}?limit=20`, { headers: HEADERS });
        if (res.ok) {
          const data = yield res.json();
          items = data.results || [];
        }
      } else {
        const res = yield fetch(`${BASE_URL}/secure/titles?limit=20`, { headers: HEADERS });
        if (res.ok) {
          const data = yield res.json();
          items = data.pagination && data.pagination.data || [];
        }
      }
      const metas = items.map((item) => ({
        id: `animecix:title:${item.id}`,
        type: "tv",
        name: item.name,
        poster: item.poster || "https://www.google.com/s2/favicons?domain=animecix.tv&sz=128",
        background: item.backdrop || item.poster || "https://www.google.com/s2/favicons?domain=animecix.tv&sz=128",
        description: item.description || `${item.name} - AnimeciX`,
        genres: ["Anime", "AnimeciX"]
      }));
      return { metas };
    } catch (e) {
      return { metas: [] };
    }
  });
}
function getMeta(args) {
  return __async(this, null, function* () {
    try {
      const rawId = typeof args === "string" ? args : args && args.id ? args.id : "";
      if (!rawId || !rawId.startsWith("animecix:title:")) return { meta: null };
      const titleId = rawId.replace("animecix:title:", "");
      const dRes = yield fetch(`${BASE_URL}/secure/titles/${titleId}`, { headers: HEADERS });
      if (!dRes.ok) return { meta: null };
      const dData = yield dRes.json();
      const titleObj = dData.title || {};
      const name = titleObj.name || titleObj.name_english || "Anime";
      const poster = titleObj.poster || "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
      const bg = titleObj.backdrop || poster;
      const desc = titleObj.description || `${name} - AnimeciX`;
      const videos = [];
      const seasons = titleObj.seasons || [];
      if (seasons.length > 0) {
        seasons.forEach((s) => {
          const sNum = s.number !== void 0 && s.number !== null && !isNaN(parseInt(s.number)) ? parseInt(s.number) : 1;
          const epCount = parseInt(s.episode_count) || 0;
          for (let ep = 1; ep <= epCount; ep++) {
            videos.push({
              id: `animecix:ep:${titleId}:${sNum}:${ep}`,
              title: `${name} ${sNum}. Sezon ${ep}. B\xF6l\xFCm`,
              season: sNum,
              episode: ep
            });
          }
        });
      }
      if (videos.length === 0) {
        const epCount = parseInt(titleObj.episode_count) || 1;
        for (let ep = 1; ep <= epCount; ep++) {
          videos.push({
            id: `animecix:ep:${titleId}:1:${ep}`,
            title: `${name} ${ep}. B\xF6l\xFCm`,
            season: 1,
            episode: ep
          });
        }
      }
      return {
        meta: {
          id: rawId,
          type: "tv",
          name,
          poster,
          background: bg,
          description: desc,
          genres: ["Anime", "AnimeciX"],
          videos
        }
      };
    } catch (e) {
      return { meta: null };
    }
  });
}
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

