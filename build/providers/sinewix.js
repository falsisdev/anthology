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
var API_BASE = CONFIG.sinewix && CONFIG.sinewix.api_base || URLS.sinewix && URLS.sinewix.api_base || URLS.movies && URLS.movies.sinewix && URLS.movies.sinewix.api_base || "https://ydfvfdizipanel.ru/public/api";
var API_KEY = CONFIG.api_keys && CONFIG.api_keys.sinewix || "9iQNC5HQwPlaFuJDkhncJ5XTJ8feGXOJatAA";
var TMDB_KEY = CONFIG.api_keys && CONFIG.api_keys.tmdb || "500330721680edb6d5f7f12ba7cd9023";
var API_HEADERS = {
  "hash256": "711bff4afeb47f07ab08a0b07e85d3835e739295e8a6361db77eebd93d96306b",
  "signature": "3082058830820370a00302010202145bbfbba9791db758ad12295636e094ab4b07dc24300d06092a864886f70d01010b05003074310b3009060355040613025553311330110603550408130a43616c69666f726e6961311630140603550407130d4d6f756e7461696e205669657731143012060355040a130b476f6f676c6520496e632e3110300e060355040b1307416e64726f69643110300e06035504031307416e64726f69643020170d3231313231353232303433335a180f32303531313231353232303433335a3074310b3009060355040613025553311330110603550408130a43616c69666f726e6961311630140603550407130d4d6f756e7461696e205669657731143012060355040a130b476f6f676c6520496e632e3110300e060355040b1307416e64726f69643110300e06035504031307416e64726f696430820222300d06092a864886f70d01010105000382020f003082020a0282020100a5106a24bb3f9c0aaf3a2b228f794b5eaf1757ba758b19736a39d1bdc73fc983a7237b8d5ca5156cfa999c1dab3418bbc2be0920e0ee001c8aa4812d1dae75d080f09e91e0abda83ff9a76e8384a4429f4849248069a59505b12ac2c14ba2e4d1a13afcdaf54e508697ff928a9f738e6f4a6fc27409c55329eb149b5ff89c5a2d7c06bf9e62086f955cad17d7be2623ee9d5ec56068eadc23cb0965a13ff97d49fe10ef41afc6eeca36b4ace9582097faff89f590bc831cdb3a69eec5d15b67c3f2cad49e37ed053733e3d2d400c47755b932bdbe15d749fd6ad1dce30ba5e66094dfb6ee6f64cafb807e11b19a990c5d078c6d6701cda0bdeb21e99404ff166074f4c89b04c418f4e7940db5c78647c475bcfb85d4c4e836ee7d7c1d53e9e736b5d96d4b4d8b98209064b729ac6a682d55a6a930e518d849898bb28329ca0aaa133b5e5270a9d5940cac6af4802a57fd971efda91abb602882dd6aa6ce2b236b57b52ee2481498f0cacbcc2c36c238bc84becad7eaaf1125b9a1ca9ded6c79f3f283a52050377809b2a9995d66e1636b0ed426fdd8685c47cb18e82077f4aefcc07887e1dc58b4d64be1632f0e7b4625da6f40c65a8512a6454a4b96963e7f876136e6c0069a519a79ad632078ed965aa12482458060c030ed50db706d854f88cb004630b49285d8af8b471ff8f6070687826412287b50049bcb7d1b6b62ef90203010001a310300e300c0603551d13040530030101ff300d06092a864886f70d01010b0500038202010051c0b7bd793181dc29ca777d3773f928a366c8469ecf2fa3cfb076e8831970d19bb2b96e44e8ccc647cf0696bb824ac61c23d958525d283cab26037b04d58aa79bf92192db843adf5c26a980f081d2f0e14f759fc5ff4c5bb3dce0860299bfe7b349a8155a2efaf731ba25ce796a80c1442c7bf80f8c1a7912ff0b6f6592264315337251a846460194fa594f81f38f9e5233a63201e931ad9cab5bf119f24025613f307194eaa6eb39a83f3c05a49ba34455b1aff7c6839bbb657d9392ffdf397432af6e56ba9534a8b07d7060fe09691c6cf07cb5324f67b3cc0871a8c621d81fe71d71085c55206a4f57e25f774fd4b979b299e8bb076b50fca42fa57da2d519fd35a4a7c0137babaed4345f8031b63b6a71f5e8268f709d658ccd7c2a58849379d25bfa598c3f4a2c3d9b7d89285fefeb7f0ec65137d38b08ce432a15688b624a179e6a4a505ebc3bcdfbc4d4330508ee2d8d0f016924dcec21a6838ef7d834c6f43bde4a5201ed0b3bb4e9bd377b470e36bcf5bc3d56169dbd8e39567aa7dce4d1a8a8a54a5e1aa6fb1a8aab0062669a966f96e15ccce6fe12ea5e6a8b8c8823bdc94988ca39759fd1cc8fd8ae5c3d74db50b174cf7d77655016c075c91d439ed01cc0a9f695c99fad3b5495fb6cb1e01a5fa020cc6022a85c07ec55f9eba89719f86e49d34ab5bd208c5f70cced2b7b7963c014f8404432979b506de29e",
  "User-Agent": "EasyPlex (Android 14; SM-A546B; Samsung Galaxy A54 5G; tr)",
  "Accept": "application/json"
};
var STREAM_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Referer": "https://ydfvfdizipanel.ru/",
  "Origin": "https://ydfvfdizipanel.ru"
};
function resolveMediaFireLink(link) {
  return fetch(link, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }).then(function(res) {
    return res.text();
  }).then(function(html) {
    var match = html.match(/href="(https:\/\/download\d+\.mediafire\.com[^"]+)"/);
    return match ? match[1] : link;
  }).catch(function() {
    return link;
  });
}
function buildStreams(videos, mediaTitle) {
  return Promise.all(
    (videos || []).map(function(v) {
      var link = v.link;
      var serverName = v.server || "Sunucu";
      var isMF = link.includes("mediafire.com");
      var displayTitle = "\u231C S\u0130NEW\u0130X \u231F | " + (isMF ? "MED\u0130AF\u0130RE" : serverName.toUpperCase());
      if (isMF) {
        return resolveMediaFireLink(link).then(function(finalUrl) {
          return {
            name: "SineWix",
            title: displayTitle,
            url: finalUrl,
            quality: "Auto",
            headers: STREAM_HEADERS,
            behaviorHints: {
              notWebReady: true,
              proxyHeaders: { request: STREAM_HEADERS }
            },
            provider: "sinewix"
          };
        });
      }
      return Promise.resolve({
        name: "SineWix",
        title: displayTitle,
        url: link,
        quality: "Auto",
        headers: STREAM_HEADERS,
        behaviorHints: {
          notWebReady: true,
          proxyHeaders: { request: STREAM_HEADERS }
        },
        provider: "sinewix"
      });
    })
  );
}
function searchAndFetch(title, originalTitle, targetImdb, targetTmdb, mediaType, seasonNum, episodeNum, targetYear) {
  return __async(this, null, function* () {
    var queries = /* @__PURE__ */ new Set();
    if (originalTitle) queries.add(originalTitle);
    if (title) queries.add(title);
    var candidates = [originalTitle, title];
    for (var i = 0; i < candidates.length; i++) {
      var t = candidates[i];
      if (!t) continue;
      if (t.includes(":")) {
        var p1 = t.split(":")[0].trim();
        var p2 = t.split(":")[1].trim();
        if (p1.length >= 2) queries.add(p1);
        if (p2.length >= 2) queries.add(p2);
      }
      if (t.includes("-")) {
        var hp1 = t.split("-")[0].trim();
        var hp2 = t.split("-")[1].trim();
        if (hp1.length >= 2) queries.add(hp1);
        if (hp2.length >= 2) queries.add(hp2);
      }
      var cleaned = t.replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/gi, " ").replace(/\s+/g, " ").trim();
      if (cleaned && cleaned.length >= 2) queries.add(cleaned);
    }
    var allSearchResults = [];
    var seenIds = /* @__PURE__ */ new Set();
    for (var q of queries) {
      if (!q || q.length < 2) continue;
      try {
        var sRes = yield fetch(API_BASE + "/search/" + encodeURIComponent(q) + "/" + API_KEY, { headers: API_HEADERS });
        var sData = yield sRes.json();
        for (var item of sData.search || []) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            allSearchResults.push(item);
          }
        }
        if (allSearchResults.length >= 10) break;
      } catch (e2) {
      }
    }
    if (allSearchResults.length === 0) return [];
    var detailedItems = yield Promise.all(allSearchResults.map(function(item2) {
      return __async(this, null, function* () {
        var path = "media/detail";
        if (item2.type === "anime") {
          path = "animes/show";
        } else if (item2.type === "serie" || item2.type === "series" || mediaType === "tv") {
          path = "series/show";
        } else if (mediaType === "movie") {
          path = "media/detail";
        }
        try {
          var r = yield fetch(API_BASE + "/" + path + "/" + item2.id + "/" + API_KEY, { headers: API_HEADERS });
          return yield r.json();
        } catch (e2) {
          return null;
        }
      });
    }));
    var bestMatch = detailedItems.find(function(item2) {
      if (!item2) return false;
      if (targetImdb && item2.imdb_external_id && item2.imdb_external_id === targetImdb) return true;
      if (targetTmdb && item2.tmdb_id && String(item2.tmdb_id) === String(targetTmdb)) return true;
      var itemYear = (item2.release_date || item2.first_air_date || "").split("-")[0];
      var itemName = (item2.title || item2.name || item2.original_title || item2.original_name || "").toLowerCase();
      var origLower = (originalTitle || "").toLowerCase();
      var titleLower = (title || "").toLowerCase();
      var exact = itemName === origLower || itemName === titleLower;
      return exact && (!targetYear || !itemYear || itemYear === targetYear);
    }) || detailedItems.find(function(item2) {
      if (!item2) return false;
      var itemYear = (item2.release_date || item2.first_air_date || "").split("-")[0];
      if (targetYear && itemYear && Math.abs(parseInt(itemYear) - parseInt(targetYear)) > 1) return false;
      var itemName = (item2.title || item2.name || item2.original_title || item2.original_name || "").toLowerCase();
      var origLower = (originalTitle || "").toLowerCase();
      var titleLower = (title || "").toLowerCase();
      return origLower && itemName.includes(origLower) || titleLower && itemName.includes(titleLower);
    });
    if (!bestMatch) return [];
    var vList = [];
    if (mediaType === "movie") {
      vList = bestMatch.videos || [];
    } else {
      var s = (bestMatch.seasons || []).find(function(s2) {
        return parseInt(s2.season_number) === parseInt(seasonNum);
      });
      if (s && s.episodes) {
        var e = s.episodes.find(function(e2) {
          return parseInt(e2.episode_number) === parseInt(episodeNum);
        });
        if (e) vList = e.videos || [];
      }
    }
    return buildStreams(vList, bestMatch.title || bestMatch.name || title);
  });
}
function resolveTmdbInfo(rawId, mediaType) {
  return __async(this, null, function* () {
    var cleanId = String(rawId).replace(/^tmdb:/, "").split(":")[0].trim();
    var isImdb = cleanId.startsWith("tt");
    var isTV = mediaType === "tv" || mediaType === "series";
    try {
      if (isImdb) {
        var findUrl = "https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_KEY + "&external_source=imdb_id&language=tr-TR";
        var r = yield fetch(findUrl);
        var d = yield r.json();
        var item = null;
        var detectedType = mediaType;
        if (isTV) {
          item = d.tv_results && d.tv_results[0] || d.tv_episode_results && d.tv_episode_results[0];
        } else if (mediaType === "movie") {
          item = d.movie_results && d.movie_results[0];
        } else {
          if (d.tv_results && d.tv_results.length > 0) {
            item = d.tv_results[0];
            detectedType = "tv";
          } else if (d.movie_results && d.movie_results.length > 0) {
            item = d.movie_results[0];
            detectedType = "movie";
          }
        }
        if (!item) return null;
        return {
          id: item.id,
          tmdb_id: item.id,
          title: item.title || item.name,
          original_title: item.original_title || item.original_name,
          release_date: item.release_date || item.first_air_date || "",
          imdb_id: cleanId,
          media_type: detectedType || (item.title ? "movie" : "tv")
        };
      } else {
        var tmdbType = isTV ? "tv" : "movie";
        var tmdbUrl = "https://api.themoviedb.org/3/" + tmdbType + "/" + cleanId + "?api_key=" + TMDB_KEY + "&language=tr-TR&append_to_response=external_ids";
        var res = yield fetch(tmdbUrl);
        var data = null;
        if (res.ok) {
          data = yield res.json();
        } else if (!mediaType) {
          var altType = isTV ? "movie" : "tv";
          var altUrl = "https://api.themoviedb.org/3/" + altType + "/" + cleanId + "?api_key=" + TMDB_KEY + "&language=tr-TR&append_to_response=external_ids";
          var altRes = yield fetch(altUrl);
          if (altRes.ok) {
            data = yield altRes.json();
            tmdbType = altType;
          }
        }
        if (data && (data.title || data.name)) {
          return {
            id: data.id,
            tmdb_id: data.id,
            title: data.title || data.name,
            original_title: data.original_title || data.original_name,
            release_date: data.release_date || data.first_air_date || "",
            imdb_id: data.imdb_id || data.external_ids && data.external_ids.imdb_id || null,
            media_type: tmdbType
          };
        }
        return null;
      }
    } catch (e) {
      return null;
    }
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      var query = args && args.search || args && args.extra && args.extra.search || args && args.query || "";
      var isMovie = args && (args.type === "movie" || args.id === "anthology_sinewix_movies");
      if (query) {
        var sRes = yield fetch(API_BASE + "/search/" + encodeURIComponent(query) + "/" + API_KEY, { headers: API_HEADERS });
        var sData = yield sRes.json();
        var items = (sData.search || []).map(function(it) {
          var mType = it.type === "movie" || it.title ? "movie" : "series";
          var mId = mType === "movie" ? "sinewix:movie:" + it.id : "sinewix:series:" + it.id;
          var poster = (it.poster_path || "").replace("http://", "https://");
          var bg = (it.backdrop_path || "").replace("http://", "https://");
          return {
            id: mId,
            type: mType === "movie" ? "movie" : "tv",
            name: it.title || it.name,
            poster,
            background: bg,
            description: it.overview || "",
            genres: ["SineWix"]
          };
        });
        return { metas: items };
      }
      if (isMovie) {
        var mRes = yield fetch(API_BASE + "/search/film/" + API_KEY, { headers: API_HEADERS });
        var mData = yield mRes.json();
        var mItems = (mData.search || []).map(function(it) {
          var poster = (it.poster_path || "").replace("http://", "https://");
          var bg = (it.backdrop_path || "").replace("http://", "https://");
          return {
            id: "sinewix:movie:" + it.id,
            type: "movie",
            name: it.title || it.name,
            poster,
            background: bg,
            description: it.overview || "",
            genres: ["SineWix", "Film"]
          };
        });
        return { metas: mItems };
      }
      var serRes = yield fetch(API_BASE + "/series/popular/" + API_KEY, { headers: API_HEADERS });
      var serData = yield serRes.json();
      var sItems = (serData.popularSeries || []).map(function(it) {
        var poster = (it.poster_path || "").replace("http://", "https://");
        var bg = (it.backdrop_path || "").replace("http://", "https://");
        return {
          id: "sinewix:series:" + it.id,
          type: "tv",
          name: it.name,
          poster,
          background: bg,
          description: it.overview || "",
          genres: ["SineWix", "Pop\xFCler Dizi"]
        };
      });
      return { metas: sItems };
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
      if (rawId.startsWith("sinewix:movie:")) {
        var mId = rawId.replace("sinewix:movie:", "");
        var res = yield fetch(API_BASE + "/media/detail/" + mId + "/" + API_KEY, { headers: API_HEADERS });
        var it = yield res.json();
        var poster = (it.poster_path || "").replace("http://", "https://");
        var bg = (it.backdrop_path || "").replace("http://", "https://");
        return {
          meta: {
            id: rawId,
            type: "movie",
            name: it.title || it.name,
            poster,
            background: bg,
            description: it.overview || "",
            genres: ["SineWix", "Film"],
            videos: [{ id: rawId, title: it.title || it.name }]
          }
        };
      }
      if (rawId.startsWith("sinewix:series:")) {
        var sId = rawId.replace("sinewix:series:", "");
        var sRes = yield fetch(API_BASE + "/series/show/" + sId + "/" + API_KEY, { headers: API_HEADERS });
        var sIt = yield sRes.json();
        var sPoster = (sIt.poster_path || "").replace("http://", "https://");
        var sBg = (sIt.backdrop_path || "").replace("http://", "https://");
        var videos = [];
        (sIt.seasons || []).forEach(function(sea) {
          var sNum = sea.season_number !== void 0 && sea.season_number !== null && !isNaN(parseInt(sea.season_number)) ? parseInt(sea.season_number) : 1;
          (sea.episodes || []).forEach(function(ep) {
            var eNum = ep.episode_number !== void 0 && ep.episode_number !== null && !isNaN(parseInt(ep.episode_number)) ? parseInt(ep.episode_number) : 1;
            videos.push({
              id: "sinewix:ep:" + sId + ":" + sNum + ":" + eNum,
              title: ep.name || sNum + ". Sezon " + eNum + ". B\xF6l\xFCm",
              season: sNum,
              episode: eNum,
              streams_raw: ep.videos || []
            });
          });
        });
        return {
          meta: {
            id: rawId,
            type: "tv",
            name: sIt.name,
            poster: sPoster,
            background: sBg,
            description: sIt.overview || "",
            genres: ["SineWix", "Pop\xFCler Dizi"],
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
function getStreams(tmdbIdOrArgs, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      var rawId = tmdbIdOrArgs;
      var type = mediaType;
      var season = seasonNum;
      var episode = episodeNum;
      if (typeof tmdbIdOrArgs === "object" && tmdbIdOrArgs !== null) {
        rawId = tmdbIdOrArgs.id;
        type = tmdbIdOrArgs.type || type;
        season = tmdbIdOrArgs.season || tmdbIdOrArgs.seasonNum || season;
        episode = tmdbIdOrArgs.episode || tmdbIdOrArgs.episodeNum || episode;
      }
      if (!rawId) return [];
      var strId = String(rawId).trim();
      if (strId.startsWith("sinewix:movie:")) {
        var mId = strId.replace("sinewix:movie:", "");
        var mRes = yield fetch(API_BASE + "/media/detail/" + mId + "/" + API_KEY, { headers: API_HEADERS });
        var mData = yield mRes.json();
        return buildStreams(mData.videos || [], mData.title || mData.name || "SineWix");
      }
      if (strId.startsWith("sinewix:series:")) {
        var sId = strId.replace("sinewix:series:", "");
        var sRes = yield fetch(API_BASE + "/series/show/" + sId + "/" + API_KEY, { headers: API_HEADERS });
        var sData = yield sRes.json();
        var targetSeason = parseInt(season) || 1;
        var targetEpisode = parseInt(episode) || 1;
        var sObj = (sData.seasons || []).find(function(s) {
          return parseInt(s.season_number) === targetSeason;
        }) || sData.seasons && sData.seasons[0];
        if (sObj && sObj.episodes) {
          var eObj = sObj.episodes.find(function(e) {
            return parseInt(e.episode_number) === targetEpisode;
          }) || sObj.episodes[0];
          if (eObj && eObj.videos) {
            return buildStreams(eObj.videos, sData.name || "SineWix");
          }
        }
        return [];
      }
      if (strId.startsWith("sinewix:ep:")) {
        var parts = strId.replace("sinewix:ep:", "").split(":");
        var showId = parts[0];
        var targetSeason = parseInt(parts[1]) || parseInt(season) || 1;
        var targetEpisode = parseInt(parts[2]) || parseInt(episode) || 1;
        var sRes = yield fetch(API_BASE + "/series/show/" + showId + "/" + API_KEY, { headers: API_HEADERS });
        var sData = yield sRes.json();
        var targetSeasonObj = (sData.seasons || []).find(function(s) {
          return parseInt(s.season_number) === targetSeason;
        });
        if (targetSeasonObj && targetSeasonObj.episodes) {
          var targetEpObj = targetSeasonObj.episodes.find(function(e) {
            return parseInt(e.episode_number) === targetEpisode;
          });
          if (targetEpObj && targetEpObj.videos) {
            return buildStreams(targetEpObj.videos, sData.name || "SineWix");
          }
        }
        return [];
      }
      var cleanId = strId;
      if (cleanId.startsWith("tmdb:")) {
        cleanId = cleanId.slice(5);
      }
      if (cleanId.includes(":")) {
        var colonParts = cleanId.split(":");
        if (colonParts.length >= 3) {
          cleanId = colonParts[0];
          season = parseInt(colonParts[1]) || season || 1;
          episode = parseInt(colonParts[2]) || episode || 1;
          type = type || "series";
        }
      }
      var isTV = type === "tv" || type === "series";
      var data = yield resolveTmdbInfo(cleanId, isTV ? "tv" : type === "movie" ? "movie" : null);
      if (!data) return [];
      var ot = data.original_title || data.original_name || data.title || data.name || "";
      var trTitle = data.title || data.name || "";
      var releaseDate = data.release_date || data.first_air_date || "";
      var year = releaseDate ? releaseDate.split("-")[0] : "";
      var targetImdb = data.imdb_id || (cleanId.startsWith("tt") ? cleanId : null);
      var targetTmdb = data.tmdb_id || data.id || (!cleanId.startsWith("tt") ? cleanId : null);
      var finalType = data.media_type === "tv" || isTV ? "tv" : "movie";
      var streams = yield searchAndFetch(trTitle, ot, targetImdb, targetTmdb, finalType, season || 1, episode || 1, year);
      return streams || [];
    } catch (e) {
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams, getMeta, getCatalog, buildStreams };
}
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = getStreams;
  globalThis.getMeta = getMeta;
  globalThis.getCatalog = getCatalog;
  globalThis.buildStreams = buildStreams;
}
