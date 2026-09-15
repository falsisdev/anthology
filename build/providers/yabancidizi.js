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
var BASE_URL = URLS.yabancidizi && URLS.yabancidizi.base || "https://yabancidizi.news";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "Referer": BASE_URL + "/"
};
function safeFetch(url, options) {
  options = options || {};
  if (typeof process !== "undefined" && process.versions && process.versions.node) {
    try {
      var https = require("https");
      var http = require("http");
      var u = new URL(url);
      var mod = u.protocol === "http:" ? http : https;
      return new Promise(function(resolve, reject) {
        var req = mod.request({
          hostname: u.hostname,
          port: u.port || (u.protocol === "http:" ? 80 : 443),
          path: u.pathname + u.search,
          method: options.method || "GET",
          headers: options.headers || {}
        }, function(res) {
          var data = "";
          res.on("data", function(chunk) {
            data += chunk;
          });
          res.on("end", function() {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              headers: res.headers,
              text: function() {
                return __async(this, null, function* () {
                  return data;
                });
              },
              json: function() {
                return __async(this, null, function* () {
                  return JSON.parse(data);
                });
              }
            });
          });
        });
        req.on("error", reject);
        if (options.body) req.write(options.body);
        req.end();
      });
    } catch (e) {
    }
  }
  return fetch(url, options);
}
function ultraClean(str) {
  if (!str) return "";
  return str.toString().toLowerCase().replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[^a-z0-9]/g, "").trim();
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
          var fData = yield findRes.json();
          var item = mediaType === "tv" || mediaType === "series" ? fData.tv_results && fData.tv_results[0] : fData.movie_results && fData.movie_results[0];
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
        var type = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
        var tRes = yield safeFetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR");
        if (tRes.ok) {
          var tData = yield tRes.json();
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
function searchYabanciDizi(query) {
  return __async(this, null, function* () {
    try {
      var searchUrl = BASE_URL + "/search?qr=" + encodeURIComponent(query);
      var res = yield safeFetch(searchUrl, {
        method: "POST",
        headers: {
          "User-Agent": HEADERS["User-Agent"],
          "X-Requested-With": "XMLHttpRequest",
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "Referer": BASE_URL + "/"
        }
      });
      if (!res.ok) return [];
      var data = yield res.json();
      if (data && data.data && Array.isArray(data.data.result)) {
        return data.data.result;
      }
      return [];
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
        var results = yield searchYabanciDizi(query);
        var metas = results.map(function(r) {
          var poster = r.s_image ? r.s_image.startsWith("http") ? r.s_image : BASE_URL + "/uploads/series/" + r.s_image : "";
          return {
            id: "yabancidizi:show:" + r.s_link,
            type: r.s_type === "1" ? "movie" : "tv",
            name: r.s_name,
            poster,
            background: poster,
            genres: ["Yabanc\u0131 Dizi", "Yabanc\u0131Dizi"],
            description: (r.s_name || "") + " (" + (r.s_year || "") + ") - Yabanc\u0131Dizi"
          };
        });
        return { metas };
      }
      var res = yield safeFetch(BASE_URL + "/", { headers: HEADERS });
      if (!res.ok) return { metas: [] };
      var html = yield res.text();
      var cardRegex = /<a[^>]+href=["'](?:https:\/\/yabancidizi\.news)?\/(?:dizi)\/([^"'/]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      var metas = [];
      var seen = /* @__PURE__ */ new Set();
      var m;
      while ((m = cardRegex.exec(html)) !== null) {
        var slug = m[1];
        if (!slug || slug.startsWith("tur/") || seen.has(slug)) continue;
        seen.add(slug);
        var title = m[2].replace(/<[^>]+>/g, "").trim();
        if (!title) continue;
        metas.push({
          id: "yabancidizi:show:" + slug,
          type: "tv",
          name: title,
          poster: "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
          background: "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
          genres: ["Yabanc\u0131 Dizi", "Yabanc\u0131Dizi"],
          description: title + " - Yabanc\u0131Dizi Ar\u015Fivi"
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
      if (rawId.startsWith("yabancidizi:show:")) {
        var showSlug = rawId.replace("yabancidizi:show:", "");
        var showUrl = BASE_URL + "/dizi/" + showSlug;
        var res = yield safeFetch(showUrl, { headers: HEADERS });
        if (!res.ok) return { meta: null };
        var html = yield res.text();
        var titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
        var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "Yabanc\u0131Dizi";
        var ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        var poster = ogImg ? ogImg[1] : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
        var epMatches = [...html.matchAll(/(?:dizi\/[^"'\s]*\/)?sezon-(\d+)\/bolum-(\d+)/gi)];
        var videos = [];
        var seen = /* @__PURE__ */ new Set();
        for (var ep of epMatches) {
          var sNum = parseInt(ep[1]);
          var eNum = parseInt(ep[2]);
          var key = sNum + "x" + eNum;
          if (seen.has(key)) continue;
          seen.add(key);
          videos.push({
            id: "yabancidizi:ep:" + showSlug + ":" + sNum + ":" + eNum,
            title: sNum + ". Sezon " + eNum + ". B\xF6l\xFCm",
            season: sNum,
            episode: eNum
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
            description: title + " - Yabanc\u0131Dizi",
            genres: ["Yabanc\u0131 Dizi", "Yabanc\u0131Dizi"],
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
      var epRes = yield safeFetch(epUrl, {
        headers: {
          "User-Agent": HEADERS["User-Agent"],
          "Referer": BASE_URL + "/"
        }
      });
      if (!epRes.ok) return [];
      var html = yield epRes.text();
      var dlRegex = /<a[^>]+href=["'](https?:\/\/vidmoly\.[a-z0-9]+\/dl\/([a-zA-Z0-9_-]+))["'][^>]*>([\s\S]*?)<\/a>/gi;
      var streams = [];
      var seenUrls = /* @__PURE__ */ new Set();
      var seenIds = /* @__PURE__ */ new Set();
      var m;
      while ((m = dlRegex.exec(html)) !== null) {
        var vidId = m[2];
        var label = m[3].replace(/<[^>]+>/g, "").trim();
        if (seenIds.has(vidId)) continue;
        seenIds.add(vidId);
        var langText = "T\xFCrk\xE7e Altyaz\u0131l\u0131";
        if (/dublaj/i.test(label)) langText = "T\xFCrk\xE7e Dublaj";
        else if (/ingilizce/i.test(label)) langText = "\u0130ngilizce Altyaz\u0131l\u0131";
        var embedUrl = "https://vidmoly.biz/embed-" + vidId + ".html";
        try {
          var vmRes = yield safeFetch(embedUrl, {
            headers: {
              "User-Agent": HEADERS["User-Agent"],
              "Referer": BASE_URL + "/"
            }
          });
          if (vmRes.ok) {
            var vmHtml = yield vmRes.text();
            var m3u8Match = vmHtml.match(/file\s*:\s*['"](https?:\/\/[^'"<>]+\.m3u8[^'"<>]*)['"]/i);
            if (m3u8Match && !seenUrls.has(m3u8Match[1])) {
              seenUrls.add(m3u8Match[1]);
              var vmHeaders = {
                "User-Agent": HEADERS["User-Agent"],
                "Referer": "https://vidmoly.biz/"
              };
              streams.push({
                name: "Yabanc\u0131Dizi",
                title: "\u231C Yabanc\u0131Dizi \u231F | VidMoly (" + langText + " 1080p HLS)",
                url: m3u8Match[1],
                quality: "1080p",
                provider: "yabancidizi",
                headers: vmHeaders,
                behaviorHints: {
                  notWebReady: true,
                  proxyHeaders: {
                    request: vmHeaders
                  }
                }
              });
            }
          }
        } catch (err) {
        }
      }
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
        return getStreams(tmdbIdOrArgs.id, mediaType || tmdbIdOrArgs.type, seasonNum || tmdbIdOrArgs.season, episodeNum || tmdbIdOrArgs.episode);
      }
      if (typeof tmdbIdOrArgs === "string" && tmdbIdOrArgs.startsWith("yabancidizi:ep:")) {
        var parts = tmdbIdOrArgs.replace("yabancidizi:ep:", "").split(":");
        var sSlug = parts[0];
        var s = parts[1] || "1";
        var e = parts[2] || "1";
        var epUrl = BASE_URL + "/dizi/" + sSlug + "/sezon-" + s + "/bolum-" + e;
        return yield extractStreamsFromEpisodePage(epUrl);
      }
      if (typeof tmdbIdOrArgs === "string" && tmdbIdOrArgs.startsWith("yabancidizi:show:")) {
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
        var results = yield searchYabanciDizi(title);
        if (results.length === 0) continue;
        var cleanTarget = ultraClean(title);
        var matchedShow = null;
        for (var r of results) {
          var rTitle = ultraClean(r.s_name);
          if (rTitle === cleanTarget) {
            matchedShow = r;
            break;
          }
        }
        if (!matchedShow) {
          for (var r of results) {
            var rTitle = ultraClean(r.s_name);
            if (rTitle.includes(cleanTarget) || cleanTarget.includes(rTitle)) {
              matchedShow = r;
              break;
            }
          }
        }
        if (!matchedShow && results.length > 0) {
          matchedShow = results[0];
        }
        if (!matchedShow || !matchedShow.s_link) continue;
        var targetEpUrl = BASE_URL + "/dizi/" + matchedShow.s_link + "/sezon-" + season + "/bolum-" + episode;
        var streams = yield extractStreamsFromEpisodePage(targetEpUrl);
        if (streams.length > 0) return streams;
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
