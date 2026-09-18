/**
 * Anthology Provider: dizimom
 * Built from src/dizimom/index.js
 * Build Date: 2026-09-18T12:02:20.307Z
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

// src/dizimom/index.js
var { sortStreamsByQuality } = require_quality();
var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://www.dizimom.diy";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
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
function normalizeTitle(str) {
  if (!str) return "";
  return str.toLowerCase().replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}
function extractFromHDPlayer(embedUrl, referer) {
  return __async(this, null, function* () {
    try {
      const u = new URL(embedUrl);
      let dataId = u.searchParams.get("data") || "";
      if (!dataId) {
        const parts = u.pathname.replace(/\/$/, "").split("/");
        dataId = parts.pop() || "";
      }
      if (!dataId) return null;
      const host = u.host.toLowerCase();
      const apiUrl = `https://${host}/player/index.php?data=${dataId}&do=getVideo`;
      const postData = new URLSearchParams({
        hash: dataId,
        r: referer || `https://${host}/`
      });
      const res = yield fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
          "Referer": embedUrl,
          "User-Agent": HEADERS["User-Agent"]
        },
        body: postData.toString()
      });
      if (!res.ok) return null;
      const data = yield res.json();
      return data.securedLink || data.videoSource || data.videoSources && data.videoSources[0] && data.videoSources[0].file || null;
    } catch (e) {
      return null;
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
      if (typeof tmdbId === "string" && tmdbId.indexOf(":") !== -1 && !tmdbId.startsWith("dizimom:")) {
        var parts = tmdbId.split(":");
        if (parts.length >= 3) {
          var s = parseInt(parts[parts.length - 2]);
          var e = parseInt(parts[parts.length - 1]);
          if (!isNaN(s)) seasonNum = s;
          if (!isNaN(e)) episodeNum = e;
          tmdbId = parts[0];
        }
      }
      if (mediaType === "movie") return [];
      if (!mediaType) mediaType = "tv";
      if (typeof tmdbId === "string" && tmdbId.startsWith("dizimom:show:")) {
        const showMeta = yield getMeta(tmdbId);
        if (showMeta && showMeta.meta && Array.isArray(showMeta.meta.videos) && showMeta.meta.videos.length > 0) {
          return yield getStreams(showMeta.meta.videos[0].id);
        }
      }
      if (typeof tmdbId === "string" && tmdbId.startsWith("dizimom:ep:")) {
        const slug = tmdbId.replace("dizimom:ep:", "");
        const epUrl = `${BASE_URL}/${slug}/`;
        const epRes = yield fetch(epUrl, { headers: HEADERS });
        if (!epRes.ok) return [];
        const epHtml = yield epRes.text();
        const $ep = cheerio.load(epHtml);
        const iframes = [];
        $ep("div.video p iframe, iframe").each((i, el) => {
          const src = $ep(el).attr("src") || $ep(el).attr("data-src");
          if (src && !src.includes("facebook") && !src.includes("disqus")) {
            iframes.push(src.startsWith("//") ? "https:" + src : src);
          }
        });
        const streams2 = [];
        for (const iframe of iframes) {
          if (iframe.includes("hdplayersystem") || iframe.includes("hdstreamable") || iframe.includes("filmizle.in")) {
            const directM3u8 = yield extractFromHDPlayer(iframe, epUrl);
            if (directM3u8) {
              streams2.push({
                name: "\u231C DiziMom \u231F",
                title: "\u231C DiziMom \u231F | HDPlayer (1080p HLS)",
                url: directM3u8,
                quality: "1080p",
                type: "hls",
                provider: "dizimom",
                headers: {
                  "Referer": iframe,
                  "User-Agent": HEADERS["User-Agent"]
                }
              });
            }
          }
        }
        return streams2;
      }
      const season = parseInt(seasonNum) || 1;
      const episode = parseInt(episodeNum) || 1;
      const info = yield resolveTmdbInfo(tmdbId, mediaType);
      const queries = [info.title, info.origTitle].filter(Boolean);
      if (queries.length === 0) return [];
      let showPages = [];
      for (const q of queries) {
        const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(q)}`;
        const sRes = yield fetch(searchUrl, { headers: HEADERS });
        if (!sRes.ok) continue;
        const sHtml = yield sRes.text();
        const $ = cheerio.load(sHtml);
        const normQ = normalizeTitle(q);
        $("div.single-item").each((i, el) => {
          const itemTitle = $(el).find("div.categorytitle a").text().replace(/ izle.*$/i, "").trim();
          const href = $(el).find("div.cat-img a").attr("href");
          if (!href) return;
          const normItem = normalizeTitle(itemTitle);
          if (normItem.includes(normQ) || normQ.includes(normItem)) {
            showPages.push({
              title: itemTitle,
              url: href,
              isDubbed: itemTitle.toLowerCase().includes("dublaj")
            });
          }
        });
        if (showPages.length > 0) break;
      }
      if (showPages.length === 0) return [];
      const streams = [];
      for (const show of showPages.slice(0, 2)) {
        const showRes = yield fetch(show.url, { headers: HEADERS });
        if (!showRes.ok) continue;
        const showHtml = yield showRes.text();
        const $ = cheerio.load(showHtml);
        let episodeUrl = "";
        $("a").each((i, el) => {
          const h = $(el).attr("href") || "";
          const t = $(el).text().trim();
          const sRegex = new RegExp(`(?:^|\\s|\\.)${season}\\.?\\s*(?:Sezon|sezon)`, "i");
          const eRegex = new RegExp(`(?:^|\\s|\\.)${episode}\\.?\\s*(?:B\xF6l\xFCm|bolum|b\xF6l\xFCm)`, "i");
          const patternUrl = `-${season}-sezon-${episode}-bolum`;
          if (sRegex.test(t) && eRegex.test(t)) {
            episodeUrl = h;
            return false;
          }
          if (h.includes(patternUrl)) {
            episodeUrl = h;
            return false;
          }
        });
        if (!episodeUrl) continue;
        const epRes = yield fetch(episodeUrl, { headers: HEADERS });
        if (!epRes.ok) continue;
        const epHtml = yield epRes.text();
        const $ep = cheerio.load(epHtml);
        const iframes = [];
        $ep("div.video p iframe, iframe").each((i, el) => {
          const src = $ep(el).attr("src") || $ep(el).attr("data-src");
          if (src && !src.includes("facebook") && !src.includes("disqus")) {
            iframes.push(src.startsWith("//") ? "https:" + src : src);
          }
        });
        for (const iframe of iframes) {
          if (iframe.includes("hdplayersystem") || iframe.includes("hdstreamable") || iframe.includes("filmizle.in")) {
            const directM3u8 = yield extractFromHDPlayer(iframe, episodeUrl);
            if (directM3u8) {
              const langLabel = show.isDubbed ? "\u{1F1F9}\u{1F1F7} TR Dublaj" : "\u{1F310} TR Altyaz\u0131";
              streams.push({
                name: `${show.title} S${season}E${episode}`,
                title: `\u231C DiziMom \u231F | HDPlayer | ${langLabel}`,
                url: directM3u8,
                quality: "1080p",
                type: "hls",
                provider: "dizimom",
                headers: {
                  "Referer": iframe,
                  "User-Agent": HEADERS["User-Agent"]
                },
                behaviorHints: {
                  notWebReady: true,
                  proxyHeaders: {
                    request: {
                      "Referer": iframe,
                      "User-Agent": HEADERS["User-Agent"]
                    }
                  }
                }
              });
            }
          }
        }
      }
      return streams;
    } catch (err) {
      return [];
    }
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      const query = args && args.search || args && args.extra && args.extra.search || args && args.query || "";
      const metas = [];
      const seen = /* @__PURE__ */ new Set();
      if (query) {
        const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
        const sRes = yield fetch(searchUrl, { headers: HEADERS });
        if (!sRes.ok) return { metas: [] };
        const sHtml = yield sRes.text();
        const $ = cheerio.load(sHtml);
        $("div.categorytitle").each((i, el) => {
          const a = $(el).find("a");
          const href = a.attr("href") || "";
          const title = a.text().replace(/\s*izle\s*$/i, "").trim();
          const slug = href.replace(`${BASE_URL}/diziler/`, "").replace(`${BASE_URL}/`, "").replace(/^\//, "").replace(/\/$/, "");
          if (!slug || seen.has(slug) || title.length < 2) return;
          seen.add(slug);
          const parent = $(el).closest(".cat-container").parent();
          const img = parent.find("div.cat-img img[data-src]").attr("data-src") || parent.find("div.cat-img noscript img").attr("src") || parent.find("div.cat-img img").attr("src") || "";
          const poster = img.startsWith("http") ? img : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
          metas.push({
            id: `dizimom:show:${slug}`,
            type: "tv",
            name: title,
            poster,
            background: poster,
            genres: ["Yabanc\u0131 Dizi", "DiziMom"],
            description: `${title} - DiziMom Ar\u015Fivi`
          });
        });
        return { metas };
      }
      const targetUrls = [
        `${BASE_URL}/yabanci-dizi-izle/`,
        `${BASE_URL}/tum-diziler-hd1/`
      ];
      for (const url of targetUrls) {
        try {
          const res = yield fetch(url, { headers: HEADERS });
          if (!res.ok) continue;
          const html = yield res.text();
          const $ = cheerio.load(html);
          $("div.categorytitle").each((i, el) => {
            const a = $(el).find("a");
            const href = a.attr("href") || "";
            const title = a.text().replace(/\s*izle\s*$/i, "").trim();
            const slug = href.replace(`${BASE_URL}/diziler/`, "").replace(`${BASE_URL}/`, "").replace(/^\//, "").replace(/\/$/, "");
            if (!slug || seen.has(slug) || title.length < 2) return;
            seen.add(slug);
            const parent = $(el).closest(".cat-container").parent();
            const img = parent.find("div.cat-img img[data-src]").attr("data-src") || parent.find("div.cat-img noscript img").attr("src") || parent.find("div.cat-img img").attr("src") || "";
            const desc = parent.find("div.cat_ozet").text().trim() || `${title} - DiziMom`;
            const poster = img.startsWith("http") ? img : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
            metas.push({
              id: `dizimom:show:${slug}`,
              type: "tv",
              name: title,
              poster,
              background: poster,
              genres: ["Yabanc\u0131 Dizi", "DiziMom"],
              description: desc
            });
          });
        } catch (err) {
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
      const rawId = typeof args === "string" ? args : args && args.id ? args.id : "";
      if (!rawId) return { meta: null };
      if (rawId.startsWith("dizimom:ep:")) {
        const epSlug = rawId.replace("dizimom:ep:", "");
        const epUrl = `${BASE_URL}/${epSlug}/`;
        const res = yield fetch(epUrl, { headers: HEADERS });
        if (!res.ok) return { meta: null };
        const html = yield res.text();
        const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
        const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "DiziMom B\xF6l\xFCm";
        const title = rawTitle.replace(/\s*izle\s*$/i, "").trim();
        const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        const poster = ogImg ? ogImg[1] : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
        const epNumMatch = title.match(/(\d+)\s*\.?\s*bölüm/i);
        const seasonNumMatch = title.match(/(\d+)\s*\.?\s*sezon/i);
        const epNum = epNumMatch ? parseInt(epNumMatch[1]) : 1;
        const seasonNum = seasonNumMatch ? parseInt(seasonNumMatch[1]) : 1;
        return {
          meta: {
            id: rawId,
            type: "tv",
            name: title,
            poster,
            background: poster,
            description: `${title} - DiziMom`,
            genres: ["Yabanc\u0131 Dizi", "DiziMom"],
            videos: [{
              id: rawId,
              title,
              season: seasonNum,
              episode: epNum
            }]
          }
        };
      }
      if (rawId.startsWith("dizimom:show:")) {
        const showSlug = rawId.replace("dizimom:show:", "");
        const showUrl = `${BASE_URL}/diziler/${showSlug}/`;
        const res = yield fetch(showUrl, { headers: HEADERS });
        if (!res.ok) return { meta: null };
        const html = yield res.text();
        const $ = cheerio.load(html);
        const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
        const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "DiziMom";
        const title = rawTitle.replace(/\s*izle\s*$/i, "").trim();
        const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        const poster = ogImg ? ogImg[1] : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
        const desc = $("div.cat_ozet").text().trim() || $('meta[name="description"]').attr("content") || `${title} - DiziMom Ar\u015Fivi`;
        const videos = [];
        const seen = /* @__PURE__ */ new Set();
        $("a").each((i, el) => {
          const href = $(el).attr("href") || "";
          const epText = $(el).text().trim();
          if (href.includes("-sezon-") && href.includes("-bolum-")) {
            const epSlug = href.replace(BASE_URL, "").replace(/^\//, "").replace(/\/$/, "");
            if (!epSlug || seen.has(epSlug)) return;
            seen.add(epSlug);
            const sMatch = href.match(/-(\d+)-sezon-/i) || epText.match(/(\d+)\s*\.?\s*sezon/i);
            const eMatch = href.match(/-(\d+)-bolum-/i) || epText.match(/(\d+)\s*\.?\s*bölüm/i);
            const sNum = sMatch ? parseInt(sMatch[1]) : 1;
            const eNum = eMatch ? parseInt(eMatch[1]) : 1;
            videos.push({
              id: `dizimom:ep:${epSlug}`,
              title: epText || `${sNum}. Sezon ${eNum}. B\xF6l\xFCm`,
              season: sNum,
              episode: eNum
            });
          }
        });
        videos.sort((a, b) => a.season - b.season || a.episode - b.episode);
        return {
          meta: {
            id: rawId,
            type: "tv",
            name: title,
            poster,
            background: poster,
            description: desc,
            genres: ["Yabanc\u0131 Dizi", "DiziMom"],
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
  module.exports = { getStreams, getCatalog, getMeta };
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

