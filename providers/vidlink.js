/**
 * Anthology Provider: vidlink
 * Built from src/vidlink/index.js
 * Build Date: 2026-09-18T20:22:18.804Z
 */
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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

// src/vidlink/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.meta_resolvers.vidlink.api");
      if (v) VIDLINK_API = String(v).replace(/\/+$/, "");
      v = val("urls.meta_resolvers.vidlink.enc_dec");
      if (v) ENC_DEC_API = String(v).replace(/\/+$/, "");
      v = val("urls.meta_resolvers.vidlink.base");
      if (v) VIDLINK_ORIGIN = String(v).replace(/\/+$/, "");
      if (VIDLINK_HEADERS) {
        VIDLINK_HEADERS.Referer = VIDLINK_ORIGIN + "/";
        VIDLINK_HEADERS.Origin = VIDLINK_ORIGIN;
      }
    });
  }
  return _cfgReady;
}
var TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
var ENC_DEC_API = "https://enc-dec.app/api";
var VIDLINK_API = "https://vidlink.pro/api/b";
var VIDLINK_ORIGIN = "https://vidlink.pro";
var VIDLINK_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "Connection": "keep-alive",
  "Referer": VIDLINK_ORIGIN + "/",
  "Origin": VIDLINK_ORIGIN
};
var STREAM_HEADERS = {
  "Accept": "*/*"
};
function makeRequest(url, options = {}) {
  const defaultHeaders = __spreadValues({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "Accept": "application/json,*/*",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "keep-alive"
  }, options.headers);
  return fetch(url, __spreadValues({
    method: options.method || "GET",
    headers: defaultHeaders
  }, options)).then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response;
  }).catch((error) => {
    console.error(`[Vidlink] Request failed for ${url}: ${error.message}`);
    throw error;
  });
}
function parseM3U8(content, baseUrl) {
  const lines = content.split("\n").map((line) => line.trim()).filter((line) => line);
  const streams = [];
  let currentStream = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("#EXT-X-STREAM-INF:")) {
      currentStream = { bandwidth: null, resolution: null, url: null };
      const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
      if (bandwidthMatch) {
        currentStream.bandwidth = parseInt(bandwidthMatch[1]);
      }
      const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
      if (resolutionMatch) {
        currentStream.resolution = resolutionMatch[1];
      }
    } else if (currentStream && !line.startsWith("#")) {
      currentStream.url = resolveUrl(line, baseUrl);
      streams.push(currentStream);
      currentStream = null;
    }
  }
  return streams;
}
function resolveUrl(url, baseUrl) {
  if (url.startsWith("http")) {
    return url;
  }
  try {
    return new URL(url, baseUrl).toString();
  } catch (error) {
    console.error(`[Vidlink] Could not resolve URL: ${url} against ${baseUrl}`);
    return url;
  }
}
function getQualityFromResolution(resolution) {
  if (!resolution) return "Auto";
  const [width, height] = resolution.split("x").map(Number);
  if (height >= 2160) return "4K";
  if (height >= 1440) return "1440p";
  if (height >= 1080) return "1080p";
  if (height >= 720) return "720p";
  if (height >= 480) return "480p";
  if (height >= 360) return "360p";
  return "240p";
}
function fetchAndParseM3U8(playlistUrl, mediaInfo) {
  console.log(`[Vidlink] Fetching M3U8 playlist: ${playlistUrl.substring(0, 80)}...`);
  return makeRequest(playlistUrl, { headers: VIDLINK_HEADERS }).then((response) => response.text()).then((m3u8Content) => {
    console.log(`[Vidlink] Parsing M3U8 content`);
    const parsedStreams = parseM3U8(m3u8Content, playlistUrl);
    if (parsedStreams.length === 0) {
      console.log("[Vidlink] No quality variants found, returning master playlist");
      return [{
        name: "Vidlink - Auto",
        title: mediaInfo.title,
        url: playlistUrl,
        quality: "Auto",
        size: "ALTYAZILI",
        //'Unknown',
        headers: STREAM_HEADERS,
        behaviorHints: {
          notWebReady: true,
          proxyHeaders: { request: STREAM_HEADERS }
        },
        provider: "vidlink"
      }];
    }
    console.log(`[Vidlink] Found ${parsedStreams.length} quality variants`);
    const streams = parsedStreams.map((stream) => {
      const quality = getQualityFromResolution(stream.resolution);
      return {
        name: `Vidlink - ${quality}`,
        title: mediaInfo.title,
        url: stream.url,
        quality,
        size: "ALTYAZILI",
        //'Unknown',
        headers: STREAM_HEADERS,
        behaviorHints: {
          notWebReady: true,
          proxyHeaders: { request: STREAM_HEADERS }
        },
        provider: "vidlink"
      };
    });
    return streams;
  }).catch((error) => {
    console.error(`[Vidlink] Error fetching/parsing M3U8: ${error.message}`);
    return [{
      name: "Vidlink - Auto",
      title: mediaInfo.title,
      url: playlistUrl,
      quality: "Auto",
      size: "ALTYAZILI",
      //'Unknown',
      headers: STREAM_HEADERS,
      behaviorHints: {
        notWebReady: true,
        proxyHeaders: { request: STREAM_HEADERS }
      },
      provider: "vidlink"
    }];
  });
}
function getTmdbInfo(tmdbId, mediaType) {
  const cleanId = String(tmdbId).replace(/^tmdb:/, "").split(":")[0].trim();
  const isImdb = cleanId.startsWith("tt");
  const isTV = mediaType === "tv" || mediaType === "series";
  let url;
  if (isImdb) {
    url = `https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
  } else {
    url = `https://api.themoviedb.org/3/${isTV ? "tv" : "movie"}/${cleanId}?api_key=${TMDB_API_KEY}`;
  }
  return makeRequest(url).then((response) => response.json()).then((raw) => {
    var _a, _b;
    let data = raw;
    if (isImdb) {
      data = isTV ? raw.tv_results && raw.tv_results[0] : raw.movie_results && raw.movie_results[0];
    }
    if (!data) {
      throw new Error("Could not find media on TMDB");
    }
    const title = isTV ? data.name : data.title;
    const year = isTV ? (_a = data.first_air_date) == null ? void 0 : _a.substring(0, 4) : (_b = data.release_date) == null ? void 0 : _b.substring(0, 4);
    if (!title) {
      throw new Error("Could not extract title from TMDB response");
    }
    console.log(`[Vidlink] TMDB Info: "${title}" (${year}), Numeric ID: ${data.id}`);
    return { id: data.id, title, year, data };
  });
}
function encryptTmdbId(tmdbId) {
  console.log(`[Vidlink] Encrypting TMDB ID: ${tmdbId}`);
  function attempt(n) {
    return makeRequest(`${ENC_DEC_API}/enc-vidlink?text=${tmdbId}`).then((response) => response.json()).then((data) => {
      if (data && data.result) {
        console.log(`[Vidlink] Successfully encrypted TMDB ID (attempt ${n})`);
        return data.result;
      }
      throw new Error("Invalid encryption response format");
    }).catch((error) => {
      console.error(`[Vidlink] Encryption attempt ${n} failed: ${error.message}`);
      if (n < 4) {
        return new Promise((resolve) => setTimeout(resolve, 1500 * n)).then(() => attempt(n + 1));
      }
      throw error;
    });
  }
  return attempt(1).catch((error) => {
    console.error(`[Vidlink] Encryption failed after retries: ${error.message}`);
    throw error;
  });
}
function extractQuality(streamData) {
  if (!streamData) return "Unknown";
  const qualityFields = ["quality", "resolution", "label", "name"];
  for (const field of qualityFields) {
    if (streamData[field]) {
      const quality = streamData[field].toString().toLowerCase();
      if (quality.includes("2160") || quality.includes("4k")) return "4K";
      if (quality.includes("1440") || quality.includes("2k")) return "1440p";
      if (quality.includes("1080") || quality.includes("fhd")) return "1080p";
      if (quality.includes("720") || quality.includes("hd")) return "720p";
      if (quality.includes("480") || quality.includes("sd")) return "480p";
      if (quality.includes("360")) return "360p";
      const match = quality.match(/(\d{3,4})[pP]?/);
      if (match) {
        const res = parseInt(match[1]);
        if (res >= 2160) return "4K";
        if (res >= 1080) return "1080p";
        if (res >= 720) return "720p";
        return "480p";
      }
    }
  }
  return "Unknown";
}
function extractLanguage(data, url = "") {
  try {
    if (!data && !url) return "EN";
    const dataString = data ? JSON.stringify(data) : "";
    const searchString = (dataString + (url || "")).toLowerCase();
    if (searchString.includes("turkish") || searchString.includes("dublaj") || searchString.includes(" tr") || searchString.includes("-tr") || searchString.includes("/tr/")) return "TR";
    if (searchString.includes("multi") || searchString.includes("dual")) return "MULTI";
  } catch (e) {
    return "EN";
  }
  return "EN";
}
function processVidlinkResponse(data, mediaInfo) {
  const streams = [];
  const safeMediaInfo = mediaInfo || { title: "Unknown" };
  try {
    console.log(`[Vidlink] Processing response data`);
    if (data.stream && data.stream.qualities) {
      Object.entries(data.stream.qualities).forEach(([qualityKey, qualityData]) => {
        if (qualityData.url) {
          const quality = extractQuality({ quality: qualityKey });
          const lang = extractLanguage(qualityData, qualityData.url);
          const streamTitle = safeMediaInfo.mediaType === "tv" && safeMediaInfo.season && safeMediaInfo.episode ? `${safeMediaInfo.title} S${String(safeMediaInfo.season).padStart(2, "0")}E${String(safeMediaInfo.episode).padStart(2, "0")}` : safeMediaInfo.year ? `${safeMediaInfo.title} (${safeMediaInfo.year})` : safeMediaInfo.title;
          streams.push({
            name: `Vidlink`,
            title: streamTitle,
            url: qualityData.url,
            quality: `${quality} [${lang}]`,
            // KALİTE + DİL
            size: "ALTYAZILI",
            //'Unknown',
            headers: STREAM_HEADERS,
            behaviorHints: {
              notWebReady: true,
              proxyHeaders: { request: STREAM_HEADERS }
            },
            provider: "vidlink"
          });
        }
      });
      if (data.stream.playlist) {
        const lang = extractLanguage(data.stream, data.stream.playlist);
        const streamTitle = safeMediaInfo.mediaType === "tv" && safeMediaInfo.season && safeMediaInfo.episode ? `${safeMediaInfo.title} S${String(safeMediaInfo.season).padStart(2, "0")}E${String(safeMediaInfo.episode).padStart(2, "0")}` : safeMediaInfo.year ? `${safeMediaInfo.title} (${safeMediaInfo.year})` : safeMediaInfo.title;
        streams.push({
          _isPlaylist: true,
          url: data.stream.playlist,
          mediaInfo: __spreadProps(__spreadValues({}, safeMediaInfo), { title: streamTitle, lang })
          // DİLİ PASLA
        });
      }
    } else if (data.stream && data.stream.playlist && !data.stream.qualities) {
      const lang = extractLanguage(data.stream, data.stream.playlist);
      const streamTitle = safeMediaInfo.mediaType === "tv" && safeMediaInfo.season && safeMediaInfo.episode ? `${safeMediaInfo.title} S${String(safeMediaInfo.season).padStart(2, "0")}E${String(safeMediaInfo.episode).padStart(2, "0")}` : safeMediaInfo.year ? `${safeMediaInfo.title} (${safeMediaInfo.year})` : safeMediaInfo.title;
      streams.push({
        _isPlaylist: true,
        url: data.stream.playlist,
        mediaInfo: __spreadProps(__spreadValues({}, safeMediaInfo), { title: streamTitle, lang })
      });
    } else if (data.url) {
      const quality = extractQuality(data);
      const lang = extractLanguage(data, data.url);
      const streamTitle = safeMediaInfo.mediaType === "tv" && safeMediaInfo.season && safeMediaInfo.episode ? `${safeMediaInfo.title} S${String(safeMediaInfo.season).padStart(2, "0")}E${String(safeMediaInfo.episode).padStart(2, "0")}` : safeMediaInfo.year ? `${safeMediaInfo.title} (${safeMediaInfo.year})` : safeMediaInfo.title;
      streams.push({
        name: `Vidlink`,
        title: streamTitle,
        url: data.url,
        quality: `${quality} [${lang}]`,
        size: "ALTYAZILI",
        //'Unknown',
        headers: STREAM_HEADERS,
        behaviorHints: {
          notWebReady: true,
          proxyHeaders: { request: STREAM_HEADERS }
        },
        provider: "vidlink"
      });
    } else if (data.streams && Array.isArray(data.streams)) {
      data.streams.forEach((stream, index) => {
        if (stream.url) {
          const quality = extractQuality(stream);
          const lang = extractLanguage(stream, stream.url);
          const streamTitle = safeMediaInfo.mediaType === "tv" && safeMediaInfo.season && safeMediaInfo.episode ? `${safeMediaInfo.title} S${String(safeMediaInfo.season).padStart(2, "0")}E${String(safeMediaInfo.episode).padStart(2, "0")}` : safeMediaInfo.year ? `${safeMediaInfo.title} (${safeMediaInfo.year})` : safeMediaInfo.title;
          streams.push({
            name: `Vidlink Stream ${index + 1}`,
            title: streamTitle,
            url: stream.url,
            quality: `${quality} [${lang}]`,
            size: stream.size || "ALTYAZILI",
            //'Unknown',
            headers: STREAM_HEADERS,
            behaviorHints: {
              notWebReady: true,
              proxyHeaders: { request: STREAM_HEADERS }
            },
            provider: "vidlink"
          });
        }
      });
    }
  } catch (error) {
    console.error(`[Vidlink] Error processing response: ${error.message}`);
  }
  return streams;
}
function getStreams(tmdbId, mediaType = "movie", seasonNum = null, episodeNum = null) {
  console.log(`[Vidlink] Fetching streams for TMDB ID: ${tmdbId}`);
  return getTmdbInfo(tmdbId, mediaType).then((tmdbInfo) => {
    const { title, year, id: numericId } = tmdbInfo;
    return encryptTmdbId(numericId).then((encryptedId) => {
      let vidlinkUrl;
      if (mediaType === "tv" && seasonNum && episodeNum) {
        vidlinkUrl = `${VIDLINK_API}/tv/${encryptedId}/${seasonNum}/${episodeNum}`;
      } else {
        vidlinkUrl = `${VIDLINK_API}/movie/${encryptedId}`;
      }
      return makeRequest(vidlinkUrl, { headers: VIDLINK_HEADERS }).then((response) => response.json()).then((data) => {
        const mediaInfo = { title, year, mediaType, season: seasonNum, episode: episodeNum };
        const streams = processVidlinkResponse(data, mediaInfo);
        if (streams.length === 0) return [];
        const playlistStreams = streams.filter((s) => s._isPlaylist);
        const directStreams = streams.filter((s) => !s._isPlaylist);
        if (playlistStreams.length > 0) {
          const playlistPromises = playlistStreams.map(
            (ps) => fetchAndParseM3U8(ps.url, ps.mediaInfo)
          );
          return Promise.all(playlistPromises).then((parsedStreamArrays) => {
            const allStreams = directStreams.concat(...parsedStreamArrays);
            const qualityOrder = { "4K": 5, "1440p": 4, "1080p": 3, "720p": 2, "480p": 1, "360p": 0, "240p": -1, "Auto": -2, "Unknown": -3 };
            allStreams.sort((a, b) => (qualityOrder[b.quality.split(" ")[0]] || -3) - (qualityOrder[a.quality.split(" ")[0]] || -3));
            return allStreams;
          });
        } else {
          const qualityOrder = { "4K": 5, "1440p": 4, "1080p": 3, "720p": 2, "480p": 1, "360p": 0, "240p": -1, "Auto": -2, "Unknown": -3 };
          directStreams.sort((a, b) => (qualityOrder[b.quality.split(" ")[0]] || -3) - (qualityOrder[a.quality.split(" ")[0]] || -3));
          return directStreams;
        }
      });
    });
  }).catch((error) => {
    console.error(`[Vidlink] Error in getStreams: ${error.message}`);
    return [];
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
  global.VidlinkScraperModule = { getStreams };
}

if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
    if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
    if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
    if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
    if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

