/**
 * Anthology Provider: ddizi
 * Built from src/ddizi/index.js
 * Build Date: 2026-09-18T20:38:10.147Z
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

// src/ddizi/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.series.ddizi.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var BASE_URL = "https://www.ddizi.im";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/"
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
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      const query = args && args.search || args && args.extra && args.extra.search || args && args.query || "";
      let url = `${BASE_URL}/`;
      let options = { headers: HEADERS };
      if (query) {
        const form = new URLSearchParams();
        form.append("arama", query);
        url = `${BASE_URL}/arama/`;
        options = {
          method: "POST",
          headers: Object.assign({}, HEADERS, { "Content-Type": "application/x-www-form-urlencoded" }),
          body: form.toString()
        };
      }
      const res = yield fetch(url, options);
      if (!res.ok) return { metas: [] };
      const html = yield res.text();
      let metas = [];
      const seen = /* @__PURE__ */ new Set();
      const seriesMatches = [...html.matchAll(/<a href="([^"]*\/diziler\/([^"]*))"[^>]*>([\s\S]*?)<\/a>/gi)];
      for (const m of seriesMatches) {
        const slug = m[2].replace(/\/$/, "");
        const title = m[3].replace(/<[^>]+>/g, "").trim();
        if (!slug || seen.has(slug) || title.length < 2) continue;
        seen.add(slug);
        metas.push({
          id: `ddizi:show:${slug}`,
          type: "tv",
          name: title,
          poster: "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
          background: "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
          genres: ["Yerli Dizi", "DDizi"],
          description: `${title} - DDizi Yerli Dizi Ar\u015Fivi`
        });
      }
      if (query) {
        const cleanQuery = ultraClean(query);
        const filtered = metas.filter((m) => ultraClean(m.name).includes(cleanQuery) || ultraClean(m.id).includes(cleanQuery));
        if (filtered.length > 0) {
          metas = filtered;
        }
      }
      const topShows = metas.slice(0, 15);
      yield Promise.all(topShows.map((s) => __async(null, null, function* () {
        try {
          const sSlug = s.id.replace("ddizi:show:", "");
          const sRes = yield fetch(`${BASE_URL}/diziler/${sSlug}`, { headers: HEADERS });
          if (sRes.ok) {
            const sHtml = yield sRes.text();
            const pMatch = sHtml.match(/class="[^"]*(?:dizi-resmi|img-back-cat)[^"]*"[\s\S]*?(?:data-src|src)="([^"]*)"/i);
            if (pMatch) {
              const pUrl = pMatch[1].startsWith("http") ? pMatch[1] : `${BASE_URL}${pMatch[1]}`;
              s.poster = pUrl;
              s.background = pUrl;
            }
          }
        } catch (e) {
        }
      })));
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
      if (!rawId) return { meta: null };
      if (rawId.startsWith("ddizi:ep:")) {
        const epSlug = rawId.replace("ddizi:ep:", "");
        const epUrl = `${BASE_URL}/izle/${epSlug}`;
        const res = yield fetch(epUrl, { headers: HEADERS });
        if (!res.ok) return { meta: null };
        const html = yield res.text();
        const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").replace(/\s*izle\s*$/i, "").trim() : "DDizi B\xF6l\xFCm";
        const posterMatch = html.match(/class="[^"]*(?:dizi-resmi|img-back-cat)[^"]*"[\s\S]*?(?:data-src|src)="([^"]*)"/i);
        const poster = posterMatch ? posterMatch[1].startsWith("http") ? posterMatch[1] : `${BASE_URL}${posterMatch[1]}` : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
        const epNumMatch = title.match(/(\d+)\s*\.?\s*bölüm/i);
        const epNum = epNumMatch ? parseInt(epNumMatch[1]) : 1;
        return {
          meta: {
            id: rawId,
            type: "tv",
            name: title,
            poster,
            background: poster,
            description: `${title} - DDizi`,
            genres: ["Yerli Dizi", "DDizi"],
            videos: [{
              id: rawId,
              title,
              season: 1,
              episode: epNum
            }]
          }
        };
      }
      if (rawId.startsWith("ddizi:show:")) {
        const showSlug = rawId.replace("ddizi:show:", "");
        const showUrl = `${BASE_URL}/diziler/${showSlug}`;
        const res = yield fetch(showUrl, { headers: HEADERS });
        if (!res.ok) return { meta: null };
        const html = yield res.text();
        const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
        const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").replace(/\s*son\s*bölüm\s*izle.*$/i, "").replace(/\s*\|.*$/i, "").trim() : "DDizi";
        const title = rawTitle.replace(/\s*Full\s*.*$/i, "").trim() || rawTitle;
        const posterMatch = html.match(/class="[^"]*(?:dizi-resmi|img-back-cat)[^"]*"[\s\S]*?(?:data-src|src)="([^"]*)"/i);
        const poster = posterMatch ? posterMatch[1].startsWith("http") ? posterMatch[1] : `${BASE_URL}${posterMatch[1]}` : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
        const pageLinks = [...html.matchAll(/href="([^"]*sayfa-\d+)"/g)];
        const pagesToFetch = [];
        for (const p of pageLinks) {
          const pUrl = p[1].startsWith("http") ? p[1] : `${BASE_URL}${p[1].startsWith("/") ? "" : "/"}${p[1]}`;
          if (!pagesToFetch.includes(pUrl) && pUrl !== showUrl) {
            pagesToFetch.push(pUrl);
          }
        }
        let allHtmls = [html];
        for (const pUrl of pagesToFetch) {
          try {
            const pRes = yield fetch(pUrl, { headers: HEADERS });
            if (pRes.ok) allHtmls.push(yield pRes.text());
          } catch (e) {
          }
        }
        const epMatches = [];
        for (const phtml of allHtmls) {
          epMatches.push(...phtml.matchAll(/<a href="([^"]*\/izle\/([^"]*))"[^>]*>([\s\S]*?)<\/a>/gi));
        }
        const videos = [];
        const seen = /* @__PURE__ */ new Set();
        const slugPart = (showSlug.split("/")[1] || showSlug).replace(/-\d+-son-bolum.*$/i, "").replace(/-izle.*$/i, "");
        const baseSlugKey = ultraClean(slugPart);
        const titleKey = ultraClean(title);
        for (const ep of epMatches) {
          const epSlug = ep[2];
          if (!epSlug || seen.has(epSlug)) continue;
          const epTitle = ep[3].replace(/<[^>]+>/g, "").trim();
          const epClean = ultraClean(epSlug + " " + epTitle);
          if (baseSlugKey && !epClean.includes(baseSlugKey) && titleKey && !epClean.includes(titleKey)) {
            continue;
          }
          seen.add(epSlug);
          const epNumMatch = epTitle.match(/(\d+)\s*\.?\s*bölüm/i) || epSlug.match(/-(\d+)-bolum/i);
          const epNum = epNumMatch ? parseInt(epNumMatch[1]) : 1;
          videos.push({
            id: `ddizi:ep:${epSlug.replace(/\/$/, "")}`,
            title: epTitle || `${epNum}. B\xF6l\xFCm`,
            season: 1,
            episode: epNum
          });
        }
        videos.sort((a, b) => a.season - b.season || a.episode - b.episode);
        return {
          meta: {
            id: rawId,
            type: "tv",
            name: title,
            poster,
            background: poster,
            description: `${title} - DDizi Dizi Ar\u015Fivi`,
            genres: ["Yerli Dizi", "DDizi"],
            videos
          }
        };
      }
      return { meta: null };
    } catch (e) {
      return { meta: null };
    }
  });
}
function extractStreamsFromEpisodePage(epUrl) {
  return __async(this, null, function* () {
    try {
      const epRes = yield fetch(epUrl, { headers: HEADERS });
      if (!epRes.ok) return [];
      const epHtml = yield epRes.text();
      const iframes = [...epHtml.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)];
      const streams = [];
      for (const ifr of iframes) {
        let src = ifr[1];
        if (src.startsWith("//")) src = "https:" + src;
        else if (src.startsWith("/")) src = BASE_URL + src;
        if (src.includes("/player/oynat/")) {
          const pRes = yield fetch(src, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: epUrl }) });
          if (!pRes.ok) continue;
          const pHtml = yield pRes.text();
          const videoMatches = [
            ...[...pHtml.matchAll(/https?:\/\/[^\s"'<>\\]+\.(?:mp4|m3u8)[^\s"'<>\\]*/gi)].map((m) => m[0]),
            ...[...pHtml.matchAll(/file\s*:\s*["'](https?:\\\/\\\/[^"']+|https?:[^"']+)["']/gi)].map((m) => m[1].replace(/\\\//g, "/"))
          ];
          const seenStreamUrls = /* @__PURE__ */ new Set();
          for (const rawVUrl of videoMatches) {
            const vUrl = rawVUrl.trim();
            if (!vUrl || seenStreamUrls.has(vUrl)) continue;
            seenStreamUrls.add(vUrl);
            if (vUrl.includes("preview/") || vUrl.includes("image/") || vUrl.includes(".svg") || vUrl.includes(".jpg") || vUrl.includes(".png")) continue;
            let quality = "1080p";
            if (vUrl.includes("720") || vUrl.includes("itag=22")) quality = "720p";
            else if (vUrl.includes("480")) quality = "480p";
            else if (vUrl.includes("360") || vUrl.includes("itag=18")) quality = "360p";
            let server = "CDN";
            let streamHeaders = { "User-Agent": HEADERS["User-Agent"] };
            if (vUrl.includes("googlevideo")) {
              const durMatch = vUrl.match(/[?&]dur=([0-9.]+)/);
              if (durMatch && parseFloat(durMatch[1]) < 300) continue;
              server = "Google Direct";
            } else if (vUrl.includes("ciner.com.tr")) {
              server = "Ciner CDN";
              streamHeaders["Referer"] = "https://www.ciner.com.tr/";
            } else if (vUrl.includes("yandex")) {
              server = "Yandex";
              streamHeaders["Referer"] = "https://yadi.sk/";
            } else if (vUrl.includes("twimg")) {
              server = "Fast CDN";
              streamHeaders["Referer"] = "https://twitter.com/";
              streamHeaders["Origin"] = "https://twitter.com";
            } else if (vUrl.includes("tabii.com")) {
              server = "Tabii CDN";
              streamHeaders["Referer"] = "https://www.tabii.com/";
            } else if (vUrl.includes("akamaized")) {
              server = "Akamai";
              streamHeaders["Referer"] = src;
            } else {
              streamHeaders["Referer"] = src;
            }
            var isMp4 = vUrl.toLowerCase().includes(".mp4");
            var isHls = !isMp4;
            streams.push({
              name: "DDizi",
              title: `\u231C DDizi \u231F | ${server} (${quality}${isMp4 ? " MP4" : " HLS"})`,
              url: vUrl,
              quality,
              provider: "ddizi",
              headers: streamHeaders,
              format: isMp4 ? "mp4" : "hls",
              isHls,
              behaviorHints: {
                notWebReady: true,
                proxyHeaders: {
                  request: streamHeaders
                }
              }
            });
          }
        }
        if (src.includes("daily.php") || src.includes("dailymotion.com")) {
          const dmMatch = src.match(/(?:daily\.php\?id=|video\/)([a-zA-Z0-9]+)/);
          if (dmMatch) {
            try {
              const dmRes = yield fetch(`https://www.dailymotion.com/player/metadata/video/${dmMatch[1]}`);
              if (dmRes.ok) {
                const dmData = yield dmRes.json();
                const autoQual = dmData.qualities && dmData.qualities.auto && dmData.qualities.auto[0];
                if (autoQual && autoQual.url) {
                  const dmHeaders = {
                    "User-Agent": HEADERS["User-Agent"],
                    "Referer": "https://www.dailymotion.com/"
                  };
                  streams.push({
                    name: "DDizi",
                    title: "\u231C DDizi \u231F | Dailymotion (1080p HLS)",
                    url: autoQual.url,
                    quality: "1080p",
                    provider: "ddizi",
                    headers: dmHeaders,
                    format: "hls",
                    isHls: true,
                    behaviorHints: {
                      notWebReady: true,
                      proxyHeaders: {
                        request: dmHeaders
                      }
                    }
                  });
                }
              }
            } catch (e) {
            }
          }
        }
        if (src.includes("youtube.php") || src.includes("/player/telif/") || src.includes("youtube.com") || src.includes("youtu.be")) {
          const ytMatch = src.match(/(?:youtube\.php\?id=|v=|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
          if (ytMatch) {
            const ytId = ytMatch[1];
            const invInstances = [
              "https://inv.nadeko.net",
              "https://invidious.nerdvpn.de",
              "https://vid.puffyan.us",
              "https://pipedapi.kavin.rocks",
              "https://api.piped.private.coffee"
            ];
            for (const inst of invInstances) {
              try {
                const invRes = yield fetch(`${inst}/api/v1/videos/${ytId}?fields=formatStreams,title`, {
                  headers: { "User-Agent": HEADERS["User-Agent"] },
                  signal: AbortSignal.timeout(2e3)
                });
                if (!invRes.ok) continue;
                const invData = yield invRes.json();
                const formats = (invData.formatStreams || []).filter((f) => f.url && f.container === "mp4");
                if (formats.length > 0) {
                  formats.sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));
                  for (const fmt of formats.slice(0, 2)) {
                    const ytHeaders = { "User-Agent": HEADERS["User-Agent"] };
                    streams.push({
                      name: "DDizi",
                      title: `\u231C DDizi \u231F | YouTube MP4 (${fmt.qualityLabel || fmt.quality || "HD"})`,
                      url: fmt.url,
                      quality: fmt.qualityLabel || "720p",
                      provider: "ddizi",
                      headers: ytHeaders,
                      format: "mp4",
                      behaviorHints: {
                        notWebReady: true,
                        proxyHeaders: {
                          request: ytHeaders
                        }
                      }
                    });
                  }
                  break;
                }
              } catch (e) {
              }
            }
            streams.push({
              name: "DDizi",
              title: "\u231C DDizi \u231F | YouTube (Resmi Yay\u0131n)",
              ytId,
              provider: "ddizi"
            });
          }
        }
      }
      if (streams.length === 0) {
        for (const ifr of iframes) {
          let src = ifr[1];
          if (src.startsWith("//")) src = "https:" + src;
          else if (src.startsWith("/")) src = BASE_URL + src;
          if (src.includes("youtube") || src.includes("youtu.be") || src.includes("daily")) continue;
          try {
            const pRes = yield fetch(src, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: epUrl }) });
            if (!pRes.ok) continue;
            const pHtml = yield pRes.text();
            const videoMatches = [...pHtml.matchAll(/https?:\/\/[^\s"'<>\\]+\.(?:mp4|m3u8)[^\s"'<>\\]*/gi)];
            for (const vm of videoMatches) {
              const vUrl = vm[0].trim();
              if (vUrl.includes("preview/") || vUrl.includes(".jpg") || vUrl.includes(".png")) continue;
              const fallbackHeaders = { "User-Agent": HEADERS["User-Agent"], "Referer": src };
              const isHls2 = vUrl.includes(".m3u8");
              streams.push({
                name: "DDizi",
                title: `\u231C DDizi \u231F | Alternatif Kaynak`,
                url: vUrl,
                provider: "ddizi",
                headers: fallbackHeaders,
                format: isHls2 ? "hls" : "mp4",
                isHls: isHls2,
                behaviorHints: {
                  notWebReady: true,
                  proxyHeaders: {
                    request: fallbackHeaders
                  }
                }
              });
            }
          } catch (e) {
          }
        }
      }
      streams.sort((a, b) => {
        const aIsDirectMp4 = a.url && a.url.includes(".mp4") ? 1 : 0;
        const bIsDirectMp4 = b.url && b.url.includes(".mp4") ? 1 : 0;
        if (bIsDirectMp4 !== aIsDirectMp4) return bIsDirectMp4 - aIsDirectMp4;
        const aQ = parseInt(a.quality) || 0;
        const bQ = parseInt(b.quality) || 0;
        return bQ - aQ;
      });
      return streams;
    } catch (e) {
      return [];
    }
  });
}
function getStreams(tmdbIdOrArgs, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      if (typeof tmdbIdOrArgs === "object" && tmdbIdOrArgs && tmdbIdOrArgs.id) {
        return getStreams(tmdbIdOrArgs.id, mediaType, seasonNum, episodeNum);
      }
      if (typeof tmdbIdOrArgs === "string" && tmdbIdOrArgs.startsWith("ddizi:show:")) {
        const showMeta = yield getMeta(tmdbIdOrArgs);
        if (showMeta && showMeta.meta && Array.isArray(showMeta.meta.videos) && showMeta.meta.videos.length > 0) {
          return yield getStreams(showMeta.meta.videos[0].id);
        }
      }
      if (typeof tmdbIdOrArgs === "string" && tmdbIdOrArgs.startsWith("ddizi:ep:")) {
        const slug = tmdbIdOrArgs.replace("ddizi:ep:", "");
        const epUrl = `${BASE_URL}/izle/${slug}`;
        return yield extractStreamsFromEpisodePage(epUrl);
      }
      const episode = parseInt(episodeNum) || 1;
      const info = yield resolveTmdbInfo(tmdbIdOrArgs, mediaType);
      const searchTitles = [info.title, info.origTitle].filter(Boolean);
      if (searchTitles.length === 0) return [];
      for (const title of searchTitles) {
        const form = new URLSearchParams();
        form.append("arama", title);
        const sRes = yield fetch(`${BASE_URL}/arama/`, {
          method: "POST",
          headers: Object.assign({}, HEADERS, { "Content-Type": "application/x-www-form-urlencoded" }),
          body: form.toString()
        });
        if (!sRes.ok) continue;
        const sHtml = yield sRes.text();
        const leftMatch = sHtml.match(/class=["']left_sidebar["'][^>]*>([\s\S]*?)class=["']right_sidebar["']/i);
        const contentToSearch = leftMatch ? leftMatch[1] : sHtml.split(/class=["']right_sidebar["']/i)[0] || sHtml;
        const seriesMatches = [...contentToSearch.matchAll(/<a href="([^"]*\/diziler\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
        if (seriesMatches.length === 0) continue;
        const cleanTarget = ultraClean(title);
        let matchedShowHref = null;
        for (const sm of seriesMatches) {
          const sName = sm[2].replace(/<[^>]+>/g, "").trim();
          const sClean = ultraClean(sName);
          if (sClean === cleanTarget) {
            matchedShowHref = sm[1];
            break;
          }
        }
        if (!matchedShowHref) {
          for (const sm of seriesMatches) {
            const sName = sm[2].replace(/<[^>]+>/g, "").trim();
            const sClean = ultraClean(sName);
            if (sClean.includes(cleanTarget) || cleanTarget.includes(sClean)) {
              matchedShowHref = sm[1];
              break;
            }
          }
        }
        if (!matchedShowHref) continue;
        if (!matchedShowHref.startsWith("http")) matchedShowHref = `${BASE_URL}${matchedShowHref.startsWith("/") ? "" : "/"}${matchedShowHref}`;
        const pagesToCheck = [matchedShowHref];
        const showRes = yield fetch(matchedShowHref, { headers: HEADERS });
        if (!showRes.ok) continue;
        const showHtml = yield showRes.text();
        const pageLinks = [...showHtml.matchAll(/href="([^"]*sayfa-(\d+)[^"]*)"/g)];
        const sortedPages = pageLinks.map((p) => ({ url: p[1], num: parseInt(p[2]) })).sort((a, b) => b.num - a.num);
        for (const sp of sortedPages) {
          if (!pagesToCheck.includes(sp.url)) pagesToCheck.push(sp.url);
        }
        for (const pageUrl of pagesToCheck.slice(0, 20)) {
          const pRes = pageUrl === matchedShowHref ? { ok: true, text: () => Promise.resolve(showHtml) } : yield fetch(pageUrl, { headers: HEADERS });
          if (!pRes.ok) continue;
          const pHtml = yield pRes.text();
          const leftEpMatch = pHtml.match(/class=["']left_sidebar["'][^>]*>([\s\S]*?)class=["']right_sidebar["']/i);
          const pageContent = leftEpMatch ? leftEpMatch[1] : pHtml.split(/class=["']right_sidebar["']/i)[0] || pHtml;
          const epMatches = [...pageContent.matchAll(/<a href="([^"]*\/izle\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
          if (epMatches.length === 0) continue;
          let targetEpUrl = null;
          const epRegex = new RegExp(`(?:^|\\s|\\.)${episode}\\.?\\s*b\xF6l\xFCm`, "i");
          const epSlugRegex = new RegExp(`-${episode}-bolum`, "i");
          for (const ep of epMatches) {
            const epText = ep[2].replace(/<[^>]+>/g, "").toLowerCase().replace(/\s+/g, " ");
            const epLink = ep[1].toLowerCase();
            if (epRegex.test(epText) || epSlugRegex.test(epLink)) {
              targetEpUrl = ep[1];
              break;
            }
          }
          if (targetEpUrl) {
            if (!targetEpUrl.startsWith("http")) targetEpUrl = `${BASE_URL}${targetEpUrl.startsWith("/") ? "" : "/"}${targetEpUrl}`;
            const streams = yield extractStreamsFromEpisodePage(targetEpUrl);
            if (streams.length > 0) return streams;
          }
        }
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

