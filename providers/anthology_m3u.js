/**
 * Anthology Provider: anthology_m3u
 * Built from src/anthology_m3u/index.js
 * Build Date: 2026-09-18T12:47:09.153Z
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

// src/anthology_m3u/index.js
var { sortStreamsByQuality } = require_quality();
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var FILM_BASE_URL = "https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_parcalari/";
var DIZI_BASE_URL = "https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_dizi_parcalari/";
var cache = {};
var cacheTime = {};
function ultraClean(s) {
  if (!s) return "";
  return s.toString().toLowerCase().replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[âÂ]/g, "a").replace(/[îÎ]/g, "i").replace(/[ûÛ]/g, "u").replace(/[^a-z0-9]/g, "").trim();
}
function cleanTitleTokens(s) {
  if (!s) return [];
  const junk = /* @__PURE__ */ new Set([
    "the",
    "a",
    "an",
    "bir",
    "film",
    "filmi",
    "dizi",
    "dizisi",
    "izle",
    "dublaj",
    "altyazi",
    "altyazili",
    "turkce",
    "hd",
    "fhd",
    "uhd",
    "webrip",
    "bluray",
    "extended",
    "cut",
    "edition",
    "unrated",
    "remastered"
  ]);
  const folded = String(s).toLowerCase().replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[âÂ]/g, "a").replace(/[îÎ]/g, "i").replace(/[ûÛ]/g, "u");
  return folded.split(/[^a-z0-9]+/).map((t) => t.replace(/[^a-z0-9]/g, "")).filter((t) => t.length > 0 && !junk.has(t));
}
function getLetterGroups(title) {
  const groups = /* @__PURE__ */ new Set();
  const clean = ultraClean(title);
  if (!clean) return ["diger"];
  const firstChar = clean.charAt(0);
  if (/[0-9]/.test(firstChar)) groups.add("0_9_rakam");
  else if (/[a-z]/.test(firstChar)) groups.add(firstChar);
  else groups.add("diger");
  const stripped = clean.replace(/^(the|a|an|bir)/, "");
  if (stripped && stripped.length > 0) {
    const nextChar = stripped.charAt(0);
    if (/[0-9]/.test(nextChar)) groups.add("0_9_rakam");
    else if (/[a-z]/.test(nextChar)) groups.add(nextChar);
  }
  return Array.from(groups);
}
function matchesMovieTitle(m3uTitle, m3uYear, targetTitle, targetYear) {
  if (!m3uTitle || !targetTitle) return false;
  if (m3uYear && targetYear) {
    const yM3u = parseInt(m3uYear, 10);
    const yTgt = parseInt(targetYear, 10);
    if (!isNaN(yM3u) && !isNaN(yTgt) && Math.abs(yM3u - yTgt) > 1) {
      return false;
    }
  }
  const m3uClean = m3uTitle.replace(/\([^)]*\)/g, "").split("-")[0].trim();
  let mTokens = cleanTitleTokens(m3uClean);
  let tTokens = cleanTitleTokens(targetTitle);
  if (!mTokens.length || !tTokens.length) return false;
  if (mTokens.length === tTokens.length + 1 && mTokens[mTokens.length - 1] === "1") {
    const hasTgtNum = tTokens.some((t) => /^\d+$/.test(t));
    if (!hasTgtNum) {
      mTokens.pop();
    }
  }
  return mTokens.join("") === tTokens.join("");
}
function matchesShowTitle(rawName, targetName) {
  if (!rawName || !targetName) return false;
  const nameWithoutYear = rawName.replace(/\([^)]*\)/g, "").split("-")[0].trim();
  const nameTokens = cleanTitleTokens(nameWithoutYear);
  const targetTokens = cleanTitleTokens(targetName);
  if (!nameTokens.length || !targetTokens.length) return false;
  return nameTokens.join("") === targetTokens.join("");
}
var EP_REGEX = /(?:s\d+[\s._-]*e0*(\d+)|(?:b[oö]l[uü]m|episode|ep)[\s._-]*0*(\d+)|\b0*(\d+)\.[\s._-]*b[oö]l[uü]m|\b\d+x0*(\d+)\b)/i;
var S_REGEX = /(?:s0*(\d+)[\s._-]*e|\b0*(\d+)x\d+\b)/i;
function resolveTmdbMovie(rawId) {
  return __async(this, null, function* () {
    let cleanId = String(rawId).replace(/^tmdb:/, "").split(":")[0].trim();
    const isImdb = cleanId.startsWith("tt");
    try {
      if (isImdb) {
        const res = yield fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
        const data = yield res.json();
        return data.movie_results && data.movie_results[0] ? data.movie_results[0] : null;
      } else {
        const res = yield fetch(`https://api.themoviedb.org/3/movie/${cleanId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const data = yield res.json();
        return data && (data.title || data.original_title) ? data : null;
      }
    } catch (e) {
      return null;
    }
  });
}
function resolveTmdbShow(rawId) {
  return __async(this, null, function* () {
    let cleanId = String(rawId).replace(/^tmdb:/, "").split(":")[0].trim();
    const isImdb = cleanId.startsWith("tt");
    try {
      if (isImdb) {
        const res = yield fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
        const data = yield res.json();
        return data.tv_results && data.tv_results[0] ? data.tv_results[0] : null;
      } else {
        const res = yield fetch(`https://api.themoviedb.org/3/tv/${cleanId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const data = yield res.json();
        return data && (data.name || data.original_name) ? data : null;
      }
    } catch (e) {
      return null;
    }
  });
}
function fetchM3U(url) {
  return __async(this, null, function* () {
    const now = Date.now();
    if (cache[url] && now - (cacheTime[url] || 0) < 3e5) {
      return cache[url];
    }
    try {
      const res = yield fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) return null;
      const text = yield res.text();
      cache[url] = text;
      cacheTime[url] = now;
      return text;
    } catch (e) {
      return null;
    }
  });
}
var BLOCKED_DOMAINS = [
  "imagebin.pics",
  "imagehub.pics",
  "imagesbox.cloud",
  "photogrids.site",
  "picturebox.cloud",
  "pixtureup.org",
  "pixypost.art",
  "pixtures.art",
  "imglink.info",
  "imglink.pro"
];
function isBlockedStream(url) {
  if (!url) return true;
  for (let i = 0; i < BLOCKED_DOMAINS.length; i++) {
    if (url.includes(BLOCKED_DOMAINS[i])) return true;
  }
  return false;
}
function searchFilmStreams(tmdbId) {
  return __async(this, null, function* () {
    try {
      const d = yield resolveTmdbMovie(tmdbId);
      if (!d || !d.title && !d.original_title) return [];
      const targetImdb = d.imdb_id || (d.external_ids ? d.external_ids.imdb_id : null);
      const targetYear = (d.release_date || "").slice(0, 4);
      const targetGroups = /* @__PURE__ */ new Set([
        ...getLetterGroups(d.title),
        ...getLetterGroups(d.original_title),
        "0_9_rakam",
        "diger"
      ]);
      const results = [];
      const seenUrls = /* @__PURE__ */ new Set();
      for (const grp of targetGroups) {
        const m3uUrl = `${FILM_BASE_URL}nuvio_${grp}.m3u`;
        const content = yield fetchM3U(m3uUrl);
        if (!content) continue;
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith("#EXTINF")) {
            const nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
            if (!nextLine.startsWith("http")) continue;
            if (isBlockedStream(nextLine)) continue;
            if (seenUrls.has(nextLine)) continue;
            const grpTitleMatch = line.match(/group-title="([^"]+)"/);
            const grpTitle = grpTitleMatch ? grpTitleMatch[1].toUpperCase() : "";
            if (d.original_language !== "tr" && (grpTitle.includes("YERLI") || grpTitle.includes("TURK"))) {
              continue;
            }
            let authorMatch = line.match(/group-author="([^"]+)"/);
            let sourceTag = authorMatch ? authorMatch[1].replace(/[\[\]]/g, "").trim() : "M3U";
            let parts = line.split(",");
            let rawName = parts[parts.length - 1].trim();
            let yearMatch = line.match(/year="(\d{4})"/);
            let m3uYear = yearMatch ? yearMatch[1] : rawName.match(/\d{4}/) ? rawName.match(/\d{4}/)[0] : "";
            let isMatch = false;
            let score = 0;
            if (targetImdb && nextLine.includes(targetImdb)) {
              isMatch = true;
              score = 120;
            } else if (matchesMovieTitle(rawName, m3uYear, d.title, targetYear) || matchesMovieTitle(rawName, m3uYear, d.original_title, targetYear)) {
              isMatch = true;
              score = m3uYear && targetYear && Math.abs(parseInt(m3uYear, 10) - parseInt(targetYear, 10)) <= 1 ? 100 : 90;
            }
            if (isMatch) {
              seenUrls.add(nextLine);
              results.push({
                name: `${d.title || d.original_title} (${m3uYear || targetYear})`,
                title: `\u231C Anthology M3U \u231F | ${sourceTag} [HD]`,
                url: nextLine,
                quality: sourceTag || "HD",
                format: nextLine.includes(".m3u8") ? "hls" : "mp4",
                isHls: nextLine.includes(".m3u8"),
                score
              });
            }
          }
        }
      }
      return results.sort((a, b) => b.score - a.score);
    } catch (e) {
      return [];
    }
  });
}
function searchDiziStreams(rawId, seasonInput, episodeInput) {
  return __async(this, null, function* () {
    let finalSeason = parseInt(seasonInput, 10) || 1;
    let finalEpisode = parseInt(episodeInput, 10) || 1;
    if (typeof rawId === "string" && rawId.includes(":")) {
      const parts = rawId.split(":");
      if (parts.length >= 3) {
        finalSeason = parseInt(parts[1], 10) || finalSeason;
        finalEpisode = parseInt(parts[2], 10) || finalEpisode;
      }
    }
    try {
      const d = yield resolveTmdbShow(rawId);
      if (!d || !d.name && !d.original_name) return [];
      const sPad = finalSeason.toString().padStart(2, "0");
      const ePad = finalEpisode.toString().padStart(2, "0");
      const targetGroups = /* @__PURE__ */ new Set([
        ...getLetterGroups(d.name),
        ...getLetterGroups(d.original_name),
        "0_9_rakam",
        "diger"
      ]);
      const results = [];
      const seenUrls = /* @__PURE__ */ new Set();
      for (const grp of targetGroups) {
        const fileName = `dizi_${grp}_s${finalSeason}.m3u`;
        const m3uUrl = `${DIZI_BASE_URL}${fileName}`;
        const content = yield fetchM3U(m3uUrl);
        if (!content) continue;
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith("#EXTINF")) {
            const nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
            if (!nextLine.startsWith("http")) continue;
            if (isBlockedStream(nextLine)) continue;
            if (seenUrls.has(nextLine)) continue;
            const tvgIdMatch = line.match(/tvg-id="(\d+)"/);
            const lineTvgId = tvgIdMatch ? tvgIdMatch[1] : null;
            let showMatches = false;
            if (lineTvgId && d.id) {
              if (lineTvgId === String(d.id)) {
                showMatches = true;
              }
            }
            if (!showMatches && !lineTvgId) {
              const grpMatch = line.match(/group-title="([^"]+)"/);
              const grpTitle = grpMatch ? grpMatch[1] : "";
              const parts2 = line.split(",");
              const diziname2 = parts2[parts2.length - 1].trim();
              const dizinameWithoutEp = diziname2.replace(/(?:s\d+[\s._-]*e\d+|b[oö]l[uü]m[\s._-]*\d+|\d+\.[\s._-]*b[oö]l[uü]m|\b\d+x\d+).*/i, "").trim();
              if (matchesShowTitle(grpTitle, d.name) || matchesShowTitle(grpTitle, d.original_name) || matchesShowTitle(dizinameWithoutEp, d.name) || matchesShowTitle(dizinameWithoutEp, d.original_name)) {
                showMatches = true;
              }
            }
            if (!showMatches) continue;
            const parts = line.split(",");
            const diziname = parts[parts.length - 1].trim();
            const sMatch = diziname.match(S_REGEX);
            if (sMatch) {
              const lineSeason = parseInt(sMatch[1] || sMatch[2], 10);
              if (lineSeason !== finalSeason) continue;
            }
            const epMatch = diziname.match(EP_REGEX);
            if (!epMatch) continue;
            const epNum = parseInt(epMatch[1] || epMatch[2] || epMatch[3] || epMatch[4], 10);
            if (epNum !== finalEpisode) continue;
            const authorMatch = line.match(/group-author="([^"]+)"/);
            const sourceTag = authorMatch ? authorMatch[1].replace(/[\[\]]/g, "").trim() : "M3U";
            seenUrls.add(nextLine);
            results.push({
              name: `${d.name || d.original_name} S${sPad}E${ePad}`,
              title: `\u231C Anthology M3U \u231F | ${sourceTag} [HD]`,
              url: nextLine,
              quality: sourceTag || "HD",
              format: nextLine.includes(".m3u8") ? "hls" : "mp4",
              isHls: nextLine.includes(".m3u8")
            });
          }
        }
      }
      return results;
    } catch (err) {
      return [];
    }
  });
}
function getStreams(id, mediaType, season, episode) {
  return __async(this, null, function* () {
    let finalId = id;
    let finalType = mediaType;
    let finalSeason = season;
    let finalEpisode = episode;
    if (id && typeof id === "object") {
      finalType = id.type || id.mediaType || mediaType;
      finalSeason = id.season || season;
      finalEpisode = id.episode || episode;
      finalId = id.id || id.tmdbId || id.imdbId;
    }
    if (typeof finalId === "string" && finalId.includes(":")) {
      const parts = finalId.split(":");
      if (parts.length >= 3) {
        finalSeason = parts[1];
        finalEpisode = parts[2];
        finalId = parts[0];
        if (!finalType || finalType === "movie") finalType = "series";
      }
    }
    const isSeries = finalType === "tv" || finalType === "series" || finalSeason !== void 0 && finalEpisode !== void 0 && finalSeason !== null;
    let streams = [];
    if (isSeries) {
      streams = yield searchDiziStreams(finalId, finalSeason, finalEpisode);
    } else {
      streams = yield searchFilmStreams(finalId);
    }
    return sortStreamsByQuality(streams);
  });
}
if (typeof module !== "undefined") {
  module.exports = {
    getStreams,
    searchFilmStreams,
    searchDiziStreams,
    sortStreamsByQuality
  };
}
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = getStreams;
}

if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
    if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
    if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
    if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
    if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

