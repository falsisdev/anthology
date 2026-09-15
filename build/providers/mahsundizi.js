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
var CONFIG = (typeof require !== "undefined" ? (function() {
  try {
    return require("./config");
  } catch (e) {
    return require("./urls");
  }
})() : null) || (typeof globalThis !== "undefined" ? globalThis.CONFIG || globalThis.URLS : null) || {};
var URLS = CONFIG.urls || CONFIG;
var BASE_URL = URLS.mahsundizi && URLS.mahsundizi.base || "https://mahsundizi8.com";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "Referer": BASE_URL + "/"
};
function safeFetch(url, options) {
  return __async(this, null, function* () {
    if (typeof fetch === "function") {
      return fetch(url, options);
    }
    return fetch(url, options);
  });
}
function ultraClean(str) {
  if (!str) return "";
  return str.toString().toLowerCase().replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[^a-z0-9]/g, "").trim();
}
function decryptCryptoJS(cipherJsonStr, passwordStr) {
  try {
    var j = typeof cipherJsonStr === "string" ? JSON.parse(cipherJsonStr) : cipherJsonStr;
    if (!j || !j.ct || !j.s || !j.iv) return null;
    if (typeof require === "function") {
      try {
        var crypto = require("crypto");
        var ct = Buffer.from(j.ct, "base64");
        var salt = Buffer.from(j.s, "hex");
        var iv = Buffer.from(j.iv, "hex");
        var d = Buffer.alloc(0);
        var d_i = Buffer.alloc(0);
        while (d.length < 48) {
          var hasher = crypto.createHash("md5");
          hasher.update(d_i);
          hasher.update(Buffer.from(passwordStr, "utf8"));
          hasher.update(salt);
          d_i = hasher.digest();
          d = Buffer.concat([d, d_i]);
        }
        var key = d.subarray(0, 32);
        try {
          var decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
          var dec = decipher.update(ct, null, "utf8");
          dec += decipher.final("utf8");
          return dec;
        } catch (e1) {
          var decipher2 = crypto.createDecipheriv("aes-256-cbc", key, d.subarray(32, 48));
          var dec2 = decipher2.update(ct, null, "utf8");
          dec2 += decipher2.final("utf8");
          return dec2;
        }
      } catch (err) {
      }
    }
  } catch (e) {
  }
  return null;
}
function resolveTmdbInfo(id, mediaType) {
  return __async(this, null, function* () {
    try {
      var cleanId = String(id || "").trim();
      if (cleanId.includes(":")) cleanId = cleanId.split(":")[0];
      var numericId = null;
      var title = "";
      var origTitle = "";
      if (cleanId.startsWith("tt")) {
        var findRes = yield safeFetch("https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_API_KEY + "&external_source=imdb_id");
        if (findRes.ok) {
          var findData = yield findRes.json();
          var match = findData.tv_results && findData.tv_results[0] || findData.movie_results && findData.movie_results[0];
          if (match) {
            title = match.name || match.title || "";
            origTitle = match.original_name || match.original_title || "";
            numericId = match.id;
          }
        }
      } else {
        numericId = cleanId;
        var type = mediaType === "movie" ? "movie" : "tv";
        var tRes = yield safeFetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR");
        if (tRes.ok) {
          var tData = yield tRes.json();
          title = tData.name || tData.title || "";
          origTitle = tData.original_name || tData.original_title || "";
        }
      }
      return { title, origTitle, numericId };
    } catch (e) {
      return { title: "", origTitle: "", numericId: id };
    }
  });
}
function searchMahsunDizi(query) {
  return __async(this, null, function* () {
    try {
      var form = new URLSearchParams();
      form.append("s", query);
      form.append("t", "search");
      var res = yield safeFetch(BASE_URL + "/wp-json/be/v1/search/", {
        method: "POST",
        headers: {
          "User-Agent": HEADERS["User-Agent"],
          "Content-Type": "application/x-www-form-urlencoded",
          "Referer": BASE_URL + "/"
        },
        body: form.toString()
      });
      if (!res.ok) return [];
      var data = yield res.json();
      var results = data && data.data && Array.isArray(data.data.result) ? data.data.result : [];
      return results.filter(function(r) {
        return r && (r.s_type === "0" || r.s_type === "1");
      });
    } catch (e) {
      return [];
    }
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      var query = args && args.search || args && args.extra && args.extra.search || args && args.query || "";
      if (query) {
        var results = yield searchMahsunDizi(query);
        var metas = results.map(function(r) {
          var poster2 = r.s_image ? r.s_image.replace("mahsundizi7.com", "mahsundizi8.com") : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
          var cleanLink = (r.s_link || "").replace(/https?:\/\/[^/]+/, "");
          return {
            id: "mahsundizi:show:" + cleanLink,
            type: r.s_type === "1" ? "movie" : "tv",
            name: r.s_name || "Dizi",
            poster: poster2,
            background: poster2,
            genres: [r.s_tur || "Yabanc\u0131 Dizi", "Mahsun Dizi"],
            description: (r.s_name || "") + " (" + (r.s_year || "") + ") - Mahsun Dizi"
          };
        });
        return { metas };
      }
      var res = yield safeFetch(BASE_URL + "/diziler", { headers: HEADERS });
      if (!res.ok) return { metas: [] };
      var html = yield res.text();
      var cardRegex = /<div class="poster poster-md">[\s\S]*?<a href="([^"]*\/diziler\/([^"]+))"[\s\S]*?(?:data-src|src)="([^"]*)"[\s\S]*?<h2><a[^>]*>([\s\S]*?)<\/a><\/h2>/gi;
      var metas = [];
      var seen = /* @__PURE__ */ new Set();
      var m;
      while ((m = cardRegex.exec(html)) !== null) {
        var fullLink = m[1];
        var slug = m[2].replace(/-izle$/, "");
        var poster = m[3] ? m[3].replace("mahsundizi7.com", "mahsundizi8.com") : "";
        var title = m[4].replace(/<[^>]+>/g, "").trim();
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);
        metas.push({
          id: "mahsundizi:show:" + slug,
          type: "tv",
          name: title,
          poster: poster || "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
          background: poster || "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
          genres: ["Yabanc\u0131 Dizi", "Mahsun Dizi"],
          description: title + " - Mahsun Dizi Ar\u015Fivi"
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
      if (!rawId) return { meta: null };
      if (rawId.startsWith("mahsundizi:show:")) {
        var cleanSlug = rawId.replace("mahsundizi:show:", "").replace(/^\//, "").replace(/^diziler\//, "").replace(/-izle$/, "");
        var showUrl = BASE_URL + "/diziler/" + cleanSlug + "-izle";
        var res = yield safeFetch(showUrl, { headers: HEADERS });
        if (!res.ok) {
          showUrl = BASE_URL + "/diziler/" + cleanSlug;
          res = yield safeFetch(showUrl, { headers: HEADERS });
        }
        if (!res.ok) return { meta: null };
        var html = yield res.text();
        var titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
        var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "Mahsun Dizi";
        var ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        var poster = ogImg ? ogImg[1].replace("mahsundizi7.com", "mahsundizi8.com") : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
        var descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
        var desc = descMatch ? descMatch[1] : title + " - Mahsun Dizi";
        var epMatches = [...html.matchAll(/(?:href=["'][^"']*?-(\d+)-sezon-(\d+)-bolum-izle|data-season=["'](\d+)["'][\s\S]*?data-episode=["'](\d+)["'])/gi)];
        var videos = [];
        var seen = /* @__PURE__ */ new Set();
        for (var ep of epMatches) {
          var sNum = parseInt(ep[1] || ep[3]) || 1;
          var eNum = parseInt(ep[2] || ep[4]) || 1;
          var key = sNum + "x" + eNum;
          if (seen.has(key)) continue;
          seen.add(key);
          videos.push({
            id: "mahsundizi:ep:" + cleanSlug + ":" + sNum + ":" + eNum,
            title: sNum + ". Sezon " + eNum + ". B\xF6l\xFCm",
            season: sNum,
            episode: eNum
          });
        }
        if (videos.length === 0) {
          videos.push({
            id: "mahsundizi:ep:" + cleanSlug + ":1:1",
            title: "1. Sezon 1. B\xF6l\xFCm",
            season: 1,
            episode: 1
          });
        }
        videos.sort(function(a, b) {
          return a.season - b.season || a.episode - b.episode;
        });
        return {
          meta: {
            id: rawId,
            type: "tv",
            name: title,
            poster,
            background: poster,
            description: desc,
            genres: ["Yabanc\u0131 Dizi", "Mahsun Dizi"],
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
function extractStreamsFromMahsunPage(targetUrl) {
  return __async(this, null, function* () {
    var streams = [];
    try {
      var pageRes = yield safeFetch(targetUrl, { headers: HEADERS });
      if (!pageRes.ok) return [];
      var pageHtml = yield pageRes.text();
      var frameMatches = [...pageHtml.matchAll(/data-frame=["']([^"']+)["']/gi)].map(function(m2) {
        return m2[1];
      });
      var seenUrls = /* @__PURE__ */ new Set();
      for (var frameUrl of frameMatches) {
        if (!frameUrl.includes("dosyaload.com/embed/")) continue;
        try {
          var dRes = yield safeFetch(frameUrl, {
            headers: {
              "User-Agent": HEADERS["User-Agent"],
              "Referer": BASE_URL + "/"
            }
          });
          if (!dRes.ok) continue;
          var dHtml = yield dRes.text();
          var m = dHtml.match(/bePlayer\(\s*['"]([^'"]+)['"]\s*,\s*['"](\{[\s\S]*?\})['"]\s*\)/);
          if (!m) continue;
          var hash = m[1];
          var rawJson = m[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
          var decrypted = decryptCryptoJS(rawJson, hash);
          if (!decrypted) continue;
          var parsed = JSON.parse(decrypted);
          var videoLoc = parsed.video_location;
          if (!videoLoc) continue;
          var subList = (parsed.strSubtitles || []).filter(function(s) {
            return s.file && s.kind === "captions";
          }).map(function(s) {
            var fUrl = s.file.startsWith("http") ? s.file : "https://dosyaload.com" + (s.file.startsWith("/") ? "" : "/") + s.file;
            return {
              id: s.language || "tr",
              lang: s.language === "tr" ? "tur" : s.language === "en" ? "eng" : s.language,
              url: fUrl
            };
          });
          var m3uRes = yield safeFetch(videoLoc, {
            headers: {
              "User-Agent": HEADERS["User-Agent"],
              "Referer": "https://dosyaload.com/"
            }
          });
          if (m3uRes.ok) {
            var m3uText = yield m3uRes.text();
            var subUrls = [...m3uText.matchAll(/https?:\/\/dosyaload\.com\/m3u\/[a-zA-Z0-9+/=]+/gi)].map(function(sm) {
              return sm[0];
            });
            var streamTarget = subUrls.length > 0 ? subUrls[subUrls.length - 1] + "#video.m3u8" : videoLoc + "#master.m3u8";
            if (!seenUrls.has(streamTarget)) {
              seenUrls.add(streamTarget);
              var sHeaders = {
                "User-Agent": HEADERS["User-Agent"],
                "Referer": "https://dosyaload.com/"
              };
              streams.push({
                name: "Mahsun Dizi",
                title: "\u231C Mahsun Dizi \u231F | BEPLAYER+ (1080p HLS)",
                url: streamTarget,
                quality: "1080p",
                provider: "mahsundizi",
                headers: sHeaders,
                behaviorHints: {
                  notWebReady: true,
                  proxyHeaders: {
                    request: sHeaders
                  }
                },
                subtitles: subList
              });
            }
          }
        } catch (e) {
        }
      }
    } catch (err) {
    }
    return streams;
  });
}
function getStreams(tmdbIdOrArgs, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      if (typeof tmdbIdOrArgs === "object" && tmdbIdOrArgs && tmdbIdOrArgs.id) {
        return getStreams(tmdbIdOrArgs.id, mediaType || tmdbIdOrArgs.type, seasonNum || tmdbIdOrArgs.season, episodeNum || tmdbIdOrArgs.episode);
      }
      if (typeof tmdbIdOrArgs === "string" && tmdbIdOrArgs.startsWith("mahsundizi:ep:")) {
        var parts = tmdbIdOrArgs.replace("mahsundizi:ep:", "").split(":");
        var sSlug = parts[0];
        var s = parts[1] || "1";
        var e = parts[2] || "1";
        var targetEpUrl = BASE_URL + "/" + sSlug + "-" + s + "-sezon-" + e + "-bolum-izle";
        return yield extractStreamsFromMahsunPage(targetEpUrl);
      }
      if (typeof tmdbIdOrArgs === "string" && tmdbIdOrArgs.startsWith("mahsundizi:show:")) {
        var showMeta = yield getMeta(tmdbIdOrArgs);
        if (showMeta && showMeta.meta && Array.isArray(showMeta.meta.videos) && showMeta.meta.videos.length > 0) {
          return yield getStreams(showMeta.meta.videos[0].id);
        }
      }
      var season = parseInt(seasonNum) || 1;
      var episode = parseInt(episodeNum) || 1;
      var info = yield resolveTmdbInfo(tmdbIdOrArgs, mediaType);
      var searchTitles = [info.origTitle, info.title].filter(Boolean);
      if (searchTitles.length === 0) return [];
      for (var title of searchTitles) {
        var results = yield searchMahsunDizi(title);
        if (results.length === 0) continue;
        var cleanTarget = ultraClean(title);
        var matched = null;
        for (var r of results) {
          var rClean = ultraClean(r.s_name);
          if (rClean === cleanTarget) {
            matched = r;
            break;
          }
        }
        if (!matched) {
          for (var r of results) {
            var rClean = ultraClean(r.s_name);
            if (rClean.includes(cleanTarget) || cleanTarget.includes(rClean)) {
              matched = r;
              break;
            }
          }
        }
        if (!matched) continue;
        var seriesSlug = (matched.s_link || "").replace(/https?:\/\/[^/]+\/diziler\//, "").replace(/https?:\/\/[^/]+\/film\//, "").replace(/-izle$/, "");
        if (!seriesSlug) continue;
        var targetEpUrl = BASE_URL + "/" + seriesSlug + "-" + season + "-sezon-" + episode + "-bolum-izle";
        var streams = yield extractStreamsFromMahsunPage(targetEpUrl);
        if (streams.length > 0) return streams;
        if (matched.s_type === "1") {
          var movieUrl = (matched.s_link || "").replace("mahsundizi7.com", "mahsundizi8.com");
          var mStreams = yield extractStreamsFromMahsunPage(movieUrl);
          if (mStreams.length > 0) return mStreams;
        }
      }
      return [];
    } catch (e2) {
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams, getMeta, getCatalog };
}
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = getStreams;
  globalThis.getMeta = getMeta;
  globalThis.getCatalog = getCatalog;
}
