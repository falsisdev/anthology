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
var BASE_URL = URLS.filmmodu && URLS.filmmodu.base || "https://www.filmmodu.one";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "Referer": BASE_URL + "/"
};
function fetchTmdbInfo(tmdbId) {
  return __async(this, null, function* () {
    let cleanId = String(tmdbId || "").trim();
    if (cleanId.includes(":")) cleanId = cleanId.split(":")[0];
    let numericId = cleanId;
    if (cleanId.startsWith("tt")) {
      try {
        const fRes = yield fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
        if (fRes.ok) {
          const fData = yield fRes.json();
          if (fData.movie_results && fData.movie_results.length > 0) {
            numericId = fData.movie_results[0].id;
          }
        }
      } catch (e) {
      }
    }
    var url = "https://api.themoviedb.org/3/movie/" + numericId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR";
    const r = yield fetch(url);
    if (!r.ok) throw new Error("TMDB yan\u0131t vermedi: " + r.status);
    const data = yield r.json();
    return {
      titleTr: data.title || "",
      titleEn: data.original_title || "",
      year: data.release_date ? data.release_date.slice(0, 4) : ""
    };
  });
}
function normalizeForUrl(str) {
  return str.toLowerCase().replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]/g, "");
}
function slugFromHref(href) {
  try {
    var last = href.split("/").filter(Boolean).pop() || "";
    return last.replace(/-film-izle.*$/i, "").replace(/-izle.*$/i, "").trim();
  } catch (e) {
    return href;
  }
}
function findBestMatch(results, searchTitle, year) {
  var normalizedSearch = normalizeForUrl(searchTitle);
  var slugSearch = normalizeForUrl(slugFromHref(searchTitle));
  for (var s = 0; s < results.length; s++) {
    var slugNorm = normalizeForUrl(slugFromHref(results[s].href));
    if (slugNorm === normalizedSearch || slugNorm === slugSearch) {
      console.log("[FilmModu] Slug tam e\u015Fle\u015Fti: " + results[s].href);
      return results[s].href;
    }
  }
  if (year) {
    for (var i = 0; i < results.length; i++) {
      var normalizedHref = normalizeForUrl(results[i].href);
      if (normalizedHref.indexOf(normalizedSearch) !== -1 && results[i].href.indexOf(year) !== -1) {
        console.log("[FilmModu] Ba\u015Fl\u0131k+y\u0131l e\u015Fle\u015Fti: " + results[i].href);
        return results[i].href;
      }
    }
  }
  var best = null;
  var bestLen = Infinity;
  for (var j = 0; j < results.length; j++) {
    var normalizedHref2 = normalizeForUrl(results[j].href);
    if (normalizedHref2.indexOf(normalizedSearch) !== -1) {
      var len = normalizedHref2.length;
      if (len < bestLen) {
        best = results[j].href;
        bestLen = len;
      }
    }
  }
  if (best) {
    console.log("[FilmModu] Ba\u015Fl\u0131k e\u015Fle\u015Fti (en k\u0131sa): " + best);
    return best;
  }
  if (year) {
    for (var k = 0; k < results.length; k++) {
      if (results[k].href.indexOf(year) !== -1) {
        console.log("[FilmModu] Y\u0131l e\u015Fle\u015Fti: " + results[k].href);
        return results[k].href;
      }
    }
  }
  console.log("[FilmModu] G\xFCvenilir e\u015Fle\u015Fme bulunamad\u0131, atlan\u0131yor");
  return null;
}
function searchFilmModu(title, year) {
  var searchUrl = BASE_URL + "/film-ara?term=" + encodeURIComponent(title);
  console.log("[FilmModu] Aran\u0131yor: " + searchUrl);
  return fetch(searchUrl, { headers: HEADERS, redirect: "follow" }).then(function(r) {
    if (!r.ok) throw new Error("Arama ba\u015Far\u0131s\u0131z: " + r.status);
    var finalUrl = r.url;
    if (finalUrl && finalUrl !== searchUrl && finalUrl.indexOf("/film-ara") === -1) {
      console.log("[FilmModu] Direkt film sayfas\u0131na y\xF6nlendirildi: " + finalUrl);
      return { redirectUrl: finalUrl, html: null };
    }
    return r.text().then(function(html) {
      return { redirectUrl: null, html };
    });
  }).then(function(result) {
    if (result.redirectUrl) return result.redirectUrl;
    var cheerio = require("cheerio-without-node-native");
    var $ = cheerio.load(result.html);
    if ($("div.alternates").length > 0) {
      var canonical = $('link[rel="canonical"]').attr("href") || "";
      if (canonical) {
        console.log("[FilmModu] Sayfa film sayfas\u0131, canonical: " + canonical);
        return canonical;
      }
      return searchUrl;
    }
    var results = [];
    $("div.movie").each(function() {
      var a = $(this).find("a").first();
      var href = a.attr("href") || "";
      var text = a.text().trim();
      if (href) results.push({ href, text });
    });
    console.log("[FilmModu] Bulunan sonu\xE7 say\u0131s\u0131: " + results.length);
    if (results.length === 0) return null;
    return findBestMatch(results, title, year);
  });
}
function fetchAlternateLinks(filmUrl) {
  console.log("[FilmModu] Film sayfas\u0131: " + filmUrl);
  return fetch(filmUrl, { headers: HEADERS }).then(function(r) {
    if (!r.ok) throw new Error("Film sayfas\u0131 y\xFCklenemedi: " + r.status);
    return r.text();
  }).then(function(html) {
    var cheerio = require("cheerio-without-node-native");
    var $ = cheerio.load(html);
    var links = [];
    links.push({ href: filmUrl, name: "Ana Kaynak" });
    $("div.alternates a").each(function() {
      var href = $(this).attr("href") || "";
      var name = $(this).text().trim();
      if (name && !name.toLowerCase().includes("fragman") && href) {
        if (!links.some(function(l) {
          return l.href === href;
        })) {
          links.push({ href, name });
        }
      }
    });
    console.log("[FilmModu] Kaynak linki say\u0131s\u0131: " + links.length);
    return links;
  });
}
function fetchStreamsFromAlt(altLink, filmUrl) {
  var altHeaders = Object.assign({}, HEADERS, { "Referer": filmUrl });
  return fetch(altLink.href, { headers: altHeaders }).then(function(r) {
    if (!r.ok) return [];
    return r.text();
  }).then(function(altHtml) {
    var videoIdMatch = altHtml.match(/var videoId\s*=\s*'([^']+)'/);
    var videoTypeMatch = altHtml.match(/var videoType\s*=\s*'([^']+)'/);
    if (!videoIdMatch || !videoTypeMatch) {
      console.log("[FilmModu] videoId/videoType bulunamad\u0131: " + altLink.href);
      return [];
    }
    var videoId = videoIdMatch[1];
    var videoType = videoTypeMatch[1];
    var sourceUrl = BASE_URL + "/get-source?movie_id=" + videoId + "&type=" + videoType;
    console.log("[FilmModu] get-source iste\u011Fi: " + sourceUrl);
    var sourceHeaders = Object.assign({}, HEADERS, {
      "Referer": altLink.href,
      "X-Requested-With": "XMLHttpRequest",
      "Accept": "application/json, text/javascript, */*"
    });
    return fetch(sourceUrl, { headers: sourceHeaders }).then(function(r) {
      if (!r.ok) return [];
      return r.json();
    }).then(function(data) {
      var streams = [];
      if (!data || !data.sources || data.sources.length === 0) {
        console.log("[FilmModu] Kaynak bulunamad\u0131: " + altLink.name);
        return streams;
      }
      if (data.subtitle) {
        console.log("[FilmModu] Altyaz\u0131 mevcut: " + data.subtitle);
      }
      var subtitleUrl = null;
      if (data.subtitle) {
        subtitleUrl = data.subtitle.startsWith("http") ? data.subtitle : BASE_URL + data.subtitle;
      }
      data.sources.forEach(function(source) {
        if (!source.src) return;
        var qualityLabel = source.label || source.res ? source.res + "p" : "HD";
        var srcUrl = source.src;
        if (srcUrl.indexOf(".m3u8") === -1) srcUrl = srcUrl + ".m3u8";
        var fmHeaders = {
          "Referer": BASE_URL + "/",
          "User-Agent": HEADERS["User-Agent"]
        };
        var streamObj = {
          name: "FilmModu",
          title: altLink.name + " \u2022 " + qualityLabel,
          url: srcUrl,
          quality: qualityLabel,
          type: "hls",
          format: "hls",
          isHls: true,
          headers: fmHeaders,
          behaviorHints: {
            notWebReady: true,
            proxyHeaders: {
              request: fmHeaders
            }
          }
        };
        if (subtitleUrl) {
          streamObj.subtitles = [{
            url: subtitleUrl,
            language: "T\xFCrk\xE7e",
            label: "T\xFCrk\xE7e"
          }];
        }
        streams.push(streamObj);
        console.log("[FilmModu] Stream: " + qualityLabel + " | " + source.src);
      });
      return streams;
    }).catch(function(err) {
      console.error("[FilmModu] get-source hatas\u0131 (" + altLink.name + "): " + err.message);
      return [];
    });
  }).catch(function(err) {
    console.error("[FilmModu] Alt link hatas\u0131 (" + altLink.href + "): " + err.message);
    return [];
  });
}
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  if (typeof tmdbId === "object" && tmdbId && tmdbId.id) {
    return getStreams(tmdbId.id, mediaType || "movie", seasonNum, episodeNum);
  }
  if (typeof tmdbId === "string" && tmdbId.startsWith("filmmodu:")) {
    var slug = tmdbId.replace("filmmodu:", "");
    var filmUrl = BASE_URL + "/" + slug;
    return fetchAlternateLinks(filmUrl).then(function(altLinks) {
      return Promise.all(altLinks.map(function(alt) {
        return fetchStreamsFromAlt(alt, filmUrl);
      })).then(function(results) {
        var allStreams = [];
        var seen = /* @__PURE__ */ new Set();
        results.forEach(function(arr) {
          if (arr) arr.forEach(function(s) {
            if (s && s.url && !seen.has(s.url)) {
              seen.add(s.url);
              allStreams.push(s);
            }
          });
        });
        allStreams.sort(function(a, b) {
          var qA = parseInt(a.quality) || (a.quality && a.quality.includes("4K") ? 2160 : 0);
          var qB = parseInt(b.quality) || (b.quality && b.quality.includes("4K") ? 2160 : 0);
          return qB - qA;
        });
        return allStreams;
      });
    });
  }
  if (mediaType && mediaType !== "movie") {
    console.log("[FilmModu] Sadece film destekleniyor, mediaType: " + mediaType);
    return Promise.resolve([]);
  }
  console.log("[FilmModu] === Ba\u015Fl\u0131yor | TMDB ID: " + tmdbId + " ===");
  return fetchTmdbInfo(tmdbId).then(function(info) {
    if (!info.titleEn && !info.titleTr) {
      console.log("[FilmModu] TMDB ba\u015Fl\u0131k bulunamad\u0131");
      return [];
    }
    console.log("[FilmModu] Film: " + info.titleEn + " / " + info.titleTr + " (" + info.year + ")");
    return searchFilmModu(info.titleEn, info.year).then(function(filmUrl2) {
      if (!filmUrl2 && info.titleTr && info.titleTr !== info.titleEn) {
        console.log("[FilmModu] Orijinal ba\u015Fl\u0131kla bulunamad\u0131, T\xFCrk\xE7e deneniyor: " + info.titleTr);
        return searchFilmModu(info.titleTr, info.year);
      }
      return filmUrl2;
    }).then(function(filmUrl2) {
      if (!filmUrl2) {
        console.log("[FilmModu] Film sitede bulunamad\u0131");
        return [];
      }
      return fetchAlternateLinks(filmUrl2).then(function(altLinks) {
        if (altLinks.length === 0) {
          console.log("[FilmModu] Hi\xE7 kaynak linki yok");
          return [];
        }
        var promises = altLinks.map(function(alt) {
          return fetchStreamsFromAlt(alt, filmUrl2);
        });
        return Promise.all(promises).then(function(results) {
          var allStreams = [];
          var seen = /* @__PURE__ */ new Set();
          results.forEach(function(arr) {
            if (arr && arr.length > 0) {
              arr.forEach(function(s) {
                if (s && s.url && !seen.has(s.url)) {
                  seen.add(s.url);
                  allStreams.push(s);
                }
              });
            }
          });
          allStreams.sort(function(a, b) {
            var qA = parseInt(a.quality) || (a.quality && a.quality.includes("4K") ? 2160 : 0);
            var qB = parseInt(b.quality) || (b.quality && b.quality.includes("4K") ? 2160 : 0);
            return qB - qA;
          });
          console.log("[FilmModu] Toplam stream: " + allStreams.length);
          return allStreams;
        });
      });
    });
  }).catch(function(err) {
    console.error("[FilmModu] Genel hata: " + err.message);
    return [];
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
function getCatalog(args) {
  var query = args && args.search || args && args.extra && args.extra.search || args && args.query || "";
  var targetUrl = query ? BASE_URL + "/film-ara?term=" + encodeURIComponent(query) : BASE_URL + "/";
  return fetch(targetUrl, { headers: HEADERS }).then(function(res) {
    return res.text();
  }).then(function(html) {
    var cheerio = require("cheerio-without-node-native");
    var $ = cheerio.load(html);
    var metas = [];
    var seen = /* @__PURE__ */ new Set();
    $("div.movie").each(function() {
      var a = $(this).find("a").first();
      var img = $(this).find("img").first();
      var href = a.attr("href") || "";
      var title = a.text().trim() || img.attr("alt") || "";
      var poster = img.attr("data-src") || img.attr("src") || "";
      var slug = href.replace(BASE_URL, "").replace(/^\//, "").replace(/\/$/, "");
      if (slug && !seen.has(slug) && title) {
        seen.add(slug);
        metas.push({
          id: "filmmodu:" + slug,
          type: "movie",
          name: title,
          poster,
          background: poster,
          genres: ["FilmModu", "Film"],
          description: title + " - FilmModu HD Film"
        });
      }
    });
    return { metas };
  }).catch(function() {
    return { metas: [] };
  });
}
function getMeta(args) {
  var rawId = typeof args === "string" ? args : args && args.id ? args.id : "";
  if (!rawId || !rawId.startsWith("filmmodu:")) return Promise.resolve({ meta: null });
  var slug = rawId.replace("filmmodu:", "");
  var filmUrl = BASE_URL + "/" + slug;
  return fetch(filmUrl, { headers: HEADERS }).then(function(res) {
    return res.text();
  }).then(function(html) {
    var cheerio = require("cheerio-without-node-native");
    var $ = cheerio.load(html);
    var title = $("h1").first().text().trim() || $("title").first().text().replace(/film izle.*/i, "").trim();
    var poster = $("div.poster img").first().attr("src") || $("div.poster img").first().attr("data-src") || "";
    var desc = $("div.description, div.summary, p").first().text().trim();
    return {
      meta: {
        id: rawId,
        type: "movie",
        name: title,
        poster,
        background: poster,
        description: desc,
        genres: ["FilmModu", "Film"],
        videos: [{ id: rawId, title }]
      }
    };
  }).catch(function() {
    return { meta: null };
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams, getCatalog, getMeta };
} else {
  global.getStreams = getStreams;
  global.getCatalog = getCatalog;
  global.getMeta = getMeta;
}
