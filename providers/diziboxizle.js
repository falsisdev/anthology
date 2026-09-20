/**
 * Anthology Provider: diziboxizle
 * Built from src/diziboxizle/index.js
 * Build Date: 2026-09-20T20:49:56.223Z
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

// src/diziboxizle/index.js
var { loadConfig, val, wrapAll } = require_config();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.series.diziboxizle.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var BASE_URL = "https://diziboxizle.com";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/"
};
var SERIES_MAP = {
  "56-days": "56 Days",
  "angela-diniz-assassinada-e-condenada": "\xC2ngela Diniz: Assassinada e Condenada",
  "a-knight-of-the-seven-kingdoms": "A Knight of the Seven Kingdoms",
  "a-tale-dark-grimm": "A Tale Dark &amp; Grimm",
  "age-of-attraction": "Age of Attraction",
  "amadeus": "Amadeus",
  "american-classic": "American Classic",
  "amor-de-oficina": "Amor de oficina",
  "are-you-sure": "Are You Sure?!",
  "ayrilik-da-sevdaya-dahil": "Ayr\u0131l\u0131k da Sevdaya Dahil",
  "bad-vegan-fame-fraud-fugitives": "Bad Vegan: Fame. Fraud. Fugitives.",
  "badly-in-love": "Badly in Love",
  "baki-dou-the-invincible-samurai": "BAKI-DOU: The Invincible Samurai",
  "battle-camp": "Battle Camp",
  "being-gordon-ramsay": "Being Gordon Ramsay",
  "bergerac": "Bergerac",
  "best-medicine": "Best Medicine",
  "betrayal-2026": "Betrayal 2026",
  "beyond-paradise": "Beyond Paradise",
  "bize-bisey-olmaz": "Bize Bi\u2019\u015Eey Olmaz",
  "black-knight": "Black Knight",
  "blind-sherlock": "Blind Sherlock",
  "bloody-flower": "Bloody Flower",
  "blue-therapy": "Blue Therapy",
  "born-to-be-wild": "Born to be Wild",
  "boston-blue": "Boston Blue",
  "boyfriend-on-demand": "Boyfriend on Demand",
  "can-you-keep-a-secret": "Can You Keep a Secret?",
  "cashero": "Cashero",
  "cheat-unfinished-business": "Cheat: Unfinished Business",
  "cia": "CIA",
  "ciudad-de-sombras": "Ciudad de sombras",
  "clairebell": "ClaireBell",
  "cra": "Cr\xE1",
  "de-big-fuck-up": "De Big Fuck-up",
  "dear-life": "Dear Life",
  "det-som-goms-i-sno": "Det som g\xF6ms i sn\xF6",
  "dime-tu-nombre": "Dime tu nombre",
  "domino-day": "Domino Day",
  "dona-beja": "Dona Beja",
  "down-cemetery-road": "Down Cemetery Road",
  "dtf-st-louis": "DTF St. Louis",
  "el-asesino-de-tiktok": "El asesino de TikTok",
  "el-tiempo-de-las-moscas": "El tiempo de las moscas",
  "fabrizio-corona-io-sono-notizia": "Fabrizio Corona: io sono notizia",
  "finding-her-edge": "Finding Her Edge",
  "foodie-love": "Foodie Love",
  "frauds": "Frauds",
  "free-bert": "Free Bert",
  "furia-2025": "Furia 2025",
  "glitter-gold-ice-dancing": "Glitter &amp; Gold: Ice Dancing",
  "gone": "Gone",
  "he-had-it-coming": "He Had It Coming",
  "heated-rivalry": "Heated Rivalry",
  "hello-bachhon": "Hello Bachhon",
  "hija-del-fuego-la-venganza-de-la-bastarda": "Hija del fuego: La venganza de la bastarda",
  "his-hers": "His &amp; Hers",
  "how-to-get-to-heaven-from-belfast": "How to Get to Heaven from Belfast",
  "idol-i": "Idol I",
  "invisible-boys": "Invisible Boys",
  "its-not-like-that": "It\u2019s Not Like That",
  "kacken-an-der-havel": "Kacken an der Havel",
  "kasaba": "Kasaba",
  "kims-convenience": "Kim\u2019s Convenience",
  "kpopped": "KPOPPED",
  "laid-bare": "Laid Bare",
  "les-disparues-de-la-gare": "Les Disparues de la Gare",
  "les-lionnes": "Les Lionnes",
  "lord-of-the-flies": "Lord of the Flies",
  "love-story": "Love Story",
  "love-through-a-prism": "Love Through a Prism",
  "man-vs-baby": "Man Vs Baby",
  "marie-antoinette": "Marie Antoinette",
  "marshals": "Marshals",
  "matices": "Matices",
  "memory-of-a-killer": "Memory of a Killer",
  "meu-namorado-coreano": "Meu Namorado Coreano",
  "million-follower-detective": "Million-Follower Detective",
  "miss-sophie-same-procedure-as-every-year": "Miss Sophie: Same Procedure As Every Year",
  "moonrise": "Moonrise",
  "motorvalley": "Motorvalley",
  "mourinho": "Mourinho",
  "murder-in-glitterball-city": "Murder in Glitterball City",
  "nice-to-not-meet-you": "Nice to Not Meet You",
  "niebo-rok-w-piekle": "Niebo. Rok w piekle",
  "no-tail-to-tell": "No Tail to Tell",
  "oderbruch": "Oderbruch",
  "olowiane-dzieci": "O\u0142owiane dzieci",
  "outrageous": "Outrageous",
  "pati": "Pati",
  "pluribus": "Pluribus",
  "ponies": "Ponies",
  "portobello": "Portobello",
  "projekt-ufo": "Projekt UFO",
  "pubertat": "Pubertat",
  "reality-check-inside-americas-next-top-model": "Reality Check: Inside America\u2019s Next Top Model",
  "reckless-2025": "Reckless 2025",
  "ripple": "Ripple",
  "rj-decker": "RJ Decker",
  "run-away": "Run Away",
  "safe-home": "Safe Home",
  "salvador": "Salvador",
  "sandokan": "Sandokan",
  "scarpetta": "Scarpetta",
  "scrubs-2026": "Scrubs 2026",
  "sean-combs-the-reckoning": "Sean Combs: The Reckoning",
  "selling-the-oc": "Selling The OC",
  "sentenced-to-be-a-hero": "Sentenced To Be a Hero",
  "sexy-beasts": "Sexy Beasts",
  "simon-cowell-the-next-act": "Simon Cowell: The Next Act",
  "single-papa": "Single Papa",
  "sirens-kiss": "Siren\u2019s Kiss",
  "small-prophets": "Small Prophets",
  "spider-noir": "Spider-Noir",
  "spring-fever": "Spring Fever",
  "steal": "Steal",
  "still-shining": "Still Shining",
  "strip-law": "Strip Law",
  "styx": "Styx",
  "surely-tomorrow": "Surely Tomorrow",
  "synden": "Synden",
  "take-that": "Take That",
  "taylor-swift-the-eras-tour-the-final-show": "Taylor Swift | The Eras Tour | The Final Show",
  "the-burbs": "The \u2019Burbs",
  "the-abandons": "The Abandons",
  "the-art-of-sarah": "The Art of Sarah",
  "the-artist": "The Artist",
  "the-beauty": "The Beauty",
  "the-chief": "The Chief",
  "the-copenhagen-test": "The Copenhagen Test",
  "the-dinosaurs": "The Dinosaurs",
  "the-dream-life-of-mr-kim": "The Dream Life of Mr. Kim",
  "the-forsytes": "The Forsytes",
  "the-gray-house": "The Gray House",
  "the-impossible-heir": "The Impossible Heir",
  "the-imposter": "The Imposter",
  "the-journalist": "The Journalist",
  "the-lady": "The Lady",
  "the-last-frontier": "The Last Frontier",
  "the-librarians-the-next-chapter": "The Librarians: The Next Chapter",
  "the-new-look": "The New Look",
  "the-pendragon-cycle-rise-of-the-merlin": "The Pendragon Cycle: Rise of the Merlin",
  "the-power-of-parker": "The Power of Parker",
  "the-price-of-confession": "The Price of Confession",
  "the-rain-in-espana": "The Rain in Espa\xF1a",
  "the-revenge-club": "The Revenge Club",
  "the-twelve-dates-til-christmas": "The Twelve Dates \u2019Til Christmas",
  "the-z-suite": "The Z-Suite",
  "things-you-should-have-done": "Things You Should Have Done",
  "traques": "Traqu\xE9s",
  "twisted-yoga": "Twisted Yoga",
  "under-salt-marsh": "Under Salt Marsh",
  "undercover-miss-hong": "Undercover Miss Hong",
  "unfamiliar": "Unfamiliar",
  "vaka": "Vaka",
  "vanished": "Vanished",
  "vindication": "Vindication",
  "vladimir": "Vladimir",
  "whats-in-the-box": "What\u2019s in the Box?",
  "young-sherlock": "Young Sherlock",
  "zombieverse": "Zombieverse"
};
function timeoutSignal(ms) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  var controller = new AbortController();
  setTimeout(function() {
    controller.abort();
  }, ms);
  return controller.signal;
}
function ultraClean(str) {
  if (!str) return "";
  return str.toString().toLowerCase().replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[âîûÂÎÛ]/g, function(c) {
    return { "\xE2": "a", "\xEE": "i", "\xFB": "u", "\xC2": "a", "\xCE": "i", "\xDB": "u" }[c] || c;
  }).replace(/[^a-z0-9]/g, "").trim();
}
function decodeHtmlEntities(str) {
  if (!str) return "";
  return str.toString().replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#8211;/g, "-").replace(/&#8217;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"').replace(/&#(\d+);/g, function(match, dec) {
    return String.fromCharCode(dec);
  }).trim();
}
function resolveTmdbInfo(id, mediaType) {
  return __async(this, null, function* () {
    try {
      var cleanId = String(id || "").trim();
      if (cleanId.indexOf(":") !== -1) cleanId = cleanId.split(":")[0];
      var numericId = null;
      var titles = [];
      if (cleanId.startsWith("tt")) {
        var findUrl = "https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_API_KEY + "&external_source=imdb_id";
        var findRes = yield fetch(findUrl, { signal: timeoutSignal(6e3) });
        if (findRes.ok) {
          var findData = yield findRes.json();
          var item = mediaType === "tv" || mediaType === "series" ? findData.tv_results && findData.tv_results[0] : findData.movie_results && findData.movie_results[0];
          if (item) {
            numericId = item.id;
            if (item.name) titles.push(item.name);
            if (item.title) titles.push(item.title);
            if (item.original_name && titles.indexOf(item.original_name) === -1) titles.push(item.original_name);
            if (item.original_title && titles.indexOf(item.original_title) === -1) titles.push(item.original_title);
          }
        }
      } else if (/^\d+$/.test(cleanId)) {
        numericId = cleanId;
      }
      if (numericId) {
        var type = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
        var trRes = yield fetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR", { signal: timeoutSignal(6e3) });
        if (trRes.ok) {
          var trData = yield trRes.json();
          if (trData.name && titles.indexOf(trData.name) === -1) titles.push(trData.name);
          if (trData.title && titles.indexOf(trData.title) === -1) titles.push(trData.title);
          if (trData.original_name && titles.indexOf(trData.original_name) === -1) titles.push(trData.original_name);
          if (trData.original_title && titles.indexOf(trData.original_title) === -1) titles.push(trData.original_title);
        }
        var enRes = yield fetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY + "&language=en-US", { signal: timeoutSignal(6e3) });
        if (enRes.ok) {
          var enData = yield enRes.json();
          if (enData.name && titles.indexOf(enData.name) === -1) titles.push(enData.name);
          if (enData.title && titles.indexOf(enData.title) === -1) titles.push(enData.title);
          if (enData.original_name && titles.indexOf(enData.original_name) === -1) titles.push(enData.original_name);
          if (enData.original_title && titles.indexOf(enData.original_title) === -1) titles.push(enData.original_title);
        }
      }
      if (!titles.length && cleanId) titles.push(cleanId);
      return { titles, numericId };
    } catch (e) {
      return { titles: [String(id || "")], numericId: null };
    }
  });
}
function searchSeries(query) {
  return __async(this, null, function* () {
    try {
      var cleanQ = ultraClean(query);
      if (!cleanQ) return [];
      var results = [];
      var seenSlugs = {};
      for (var slug in SERIES_MAP) {
        if (Object.prototype.hasOwnProperty.call(SERIES_MAP, slug)) {
          var sTitle = SERIES_MAP[slug];
          var sClean = ultraClean(sTitle);
          var slugClean = ultraClean(slug);
          if (sClean === cleanQ || slugClean === cleanQ || sClean.indexOf(cleanQ) !== -1 || cleanQ.indexOf(sClean) !== -1) {
            seenSlugs[slug] = true;
            results.push({ slug, title: sTitle, url: BASE_URL + "/" + slug + "/" });
          }
        }
      }
      try {
        var wpCatUrl = BASE_URL + "/wp-json/wp/v2/categories?search=" + encodeURIComponent(query);
        var wpRes = yield fetch(wpCatUrl, { headers: HEADERS, signal: timeoutSignal(6e3) });
        if (wpRes.ok) {
          var wpCats = yield wpRes.json();
          if (Array.isArray(wpCats)) {
            for (var i = 0; i < wpCats.length; i++) {
              var c = wpCats[i];
              if (c.slug && !seenSlugs[c.slug]) {
                seenSlugs[c.slug] = true;
                results.push({ slug: c.slug, title: decodeHtmlEntities(c.name || c.slug), url: BASE_URL + "/" + c.slug + "/" });
              }
            }
          }
        }
      } catch (e) {
      }
      try {
        var searchUrl = BASE_URL + "/?s=" + encodeURIComponent(query);
        var sRes = yield fetch(searchUrl, { headers: HEADERS, signal: timeoutSignal(6e3) });
        if (sRes.ok) {
          var sHtml = yield sRes.text();
          var linkRegex = /<div class="categorytitle"[^>]*>\s*<a href="https:\/\/diziboxizle\.com\/([a-z0-9-]+)\/"[^>]*>([^<]+)<\/a>/gi;
          var lm;
          while ((lm = linkRegex.exec(sHtml)) !== null) {
            var hSlug = lm[1];
            var hTitle = decodeHtmlEntities(lm[2]);
            if (!seenSlugs[hSlug]) {
              seenSlugs[hSlug] = true;
              results.push({ slug: hSlug, title: hTitle, url: BASE_URL + "/" + hSlug + "/" });
            }
          }
        }
      } catch (e) {
      }
      return results;
    } catch (e) {
      return [];
    }
  });
}
function pickBestSeries(candidates, targetTitle) {
  if (!candidates || !candidates.length) return null;
  var cleanTarget = ultraClean(targetTitle);
  for (var i = 0; i < candidates.length; i++) {
    var cClean = ultraClean(candidates[i].title);
    var slugClean = ultraClean(candidates[i].slug);
    if (cClean === cleanTarget || slugClean === cleanTarget) {
      return candidates[i];
    }
  }
  for (var j = 0; j < candidates.length; j++) {
    var candClean = ultraClean(candidates[j].title);
    if (candClean && cleanTarget && (candClean.indexOf(cleanTarget) !== -1 || cleanTarget.indexOf(candClean) !== -1)) {
      return candidates[j];
    }
  }
  return candidates[0];
}
function parseEpisodes(detailHtml) {
  var episodes = [];
  var seen = {};
  var epRegex = /<a[^>]+href="(https:\/\/diziboxizle\.com\/[a-z0-9-]+-(?:[0-9]+-sezon-[0-9]+-bolum|[0-9]+-bolum)\/)"[^>]*>([\s\S]*?)<\/a>/gi;
  var m;
  while ((m = epRegex.exec(detailHtml)) !== null) {
    var url = m[1];
    var rawText = decodeHtmlEntities(m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    var season = 1;
    var episode = 1;
    var sMatch = url.match(/(\d+)-sezon/i) || rawText.match(/(\d+)\.?\s*sezon/i);
    var eMatch = url.match(/(\d+)-bolum/i) || rawText.match(/(\d+)\.?\s*bölüm/i);
    if (sMatch) season = parseInt(sMatch[1]);
    if (eMatch) episode = parseInt(eMatch[1]);
    var key = season + ":" + episode;
    if (!seen[key]) {
      seen[key] = true;
      episodes.push({
        url,
        title: rawText || season + ". Sezon " + episode + ". B\xF6l\xFCm",
        season,
        episode
      });
    }
  }
  return episodes;
}
function matchEpisode(episodes, targetSeason, targetEpisode) {
  if (!episodes || !episodes.length) return null;
  var exact = episodes.find(function(ep) {
    return ep.season === targetSeason && ep.episode === targetEpisode;
  });
  if (exact) return exact;
  if (targetSeason === 1) {
    var epOnly = episodes.find(function(ep) {
      return ep.episode === targetEpisode;
    });
    if (epOnly) return epOnly;
  }
  return null;
}
function resolveVidMoly(iframeUrl) {
  return __async(this, null, function* () {
    try {
      var fullUrl = iframeUrl.startsWith("//") ? "https:" + iframeUrl : iframeUrl;
      fullUrl = fullUrl.replace("vidmoly.to", "vidmoly.biz").replace("vidmoly.net", "vidmoly.biz");
      var res = yield fetch(fullUrl, {
        headers: {
          "User-Agent": HEADERS["User-Agent"]
        },
        signal: timeoutSignal(7e3)
      });
      if (!res.ok) return [];
      var html = yield res.text();
      var m = html.match(/file\s*:\s*["'](https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)["']/i);
      if (!m) return [];
      var streamUrl = m[1];
      var sHeaders = {
        "User-Agent": HEADERS["User-Agent"],
        "Referer": "https://vidmoly.biz/"
      };
      return [{
        name: "DiziBox\u0130zle",
        title: "\u231C DiziBox\u0130zle \u231F | VidMoly [1080p HLS Master]",
        url: streamUrl,
        quality: "1080p",
        format: "hls",
        isHls: true,
        headers: sHeaders,
        behaviorHints: {
          notWebReady: false,
          proxyHeaders: { request: sHeaders }
        }
      }];
    } catch (e) {
      return [];
    }
  });
}
function resolveOkRu(iframeUrl) {
  return __async(this, null, function* () {
    try {
      var fullUrl = iframeUrl.startsWith("//") ? "https:" + iframeUrl : iframeUrl;
      var res = yield fetch(fullUrl, {
        headers: { "User-Agent": HEADERS["User-Agent"] },
        signal: timeoutSignal(7e3)
      });
      if (!res.ok) return [];
      var html = yield res.text();
      var m = html.match(/data-options=["']([^"']+)["']/i);
      if (!m) return [];
      var decoded = decodeHtmlEntities(m[1]);
      var opts = JSON.parse(decoded);
      var flashvars = opts.flashvars || {};
      var metadata = flashvars.metadata;
      if (typeof metadata === "string") {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          metadata = {};
        }
      }
      if (!metadata || typeof metadata !== "object") metadata = {};
      var vids = metadata.videos || flashvars.videos || [];
      var hlsUrl = metadata.hlsManifestUrl || flashvars.hlsManifestUrl;
      var streams = [];
      var nameMap = { "full": "1080p", "hd": "720p", "sd": "480p", "low": "360p", "lowest": "240p", "mobile": "240p" };
      for (var i = 0; i < vids.length; i++) {
        var v = vids[i];
        if (!v.url) continue;
        var q = nameMap[v.name] || v.name || "720p";
        var okHeaders = { "User-Agent": HEADERS["User-Agent"] };
        streams.push({
          name: "DiziBox\u0130zle",
          title: "\u231C DiziBox\u0130zle \u231F | Ok.ru [" + q.toUpperCase() + " MP4]",
          url: v.url,
          quality: q,
          format: "mp4",
          isHls: false,
          headers: okHeaders,
          behaviorHints: {
            notWebReady: false,
            proxyHeaders: { request: okHeaders }
          }
        });
      }
      if (hlsUrl) {
        var okHlsHeaders = { "User-Agent": HEADERS["User-Agent"] };
        streams.push({
          name: "DiziBox\u0130zle",
          title: "\u231C DiziBox\u0130zle \u231F | Ok.ru [HLS Master]",
          url: hlsUrl,
          quality: "1080p",
          format: "hls",
          isHls: true,
          headers: okHlsHeaders,
          behaviorHints: {
            notWebReady: false,
            proxyHeaders: { request: okHlsHeaders }
          }
        });
      }
      return streams;
    } catch (e) {
      return [];
    }
  });
}
function fetchEpisodeMirrors(episodeUrl) {
  return __async(this, null, function* () {
    try {
      var res = yield fetch(episodeUrl, { headers: HEADERS, signal: timeoutSignal(8e3) });
      if (!res.ok) return [];
      var html = yield res.text();
      var iframes = [];
      var seenIframes = {};
      var containerMatch = html.match(/<div class="video-container">([\s\S]*?)<\/div>/i);
      var targetArea = containerMatch ? containerMatch[1] : html;
      var iframeRegex = /<iframe[^>]+src=["']([^"'>]+)["']/gi;
      var m;
      while ((m = iframeRegex.exec(targetArea)) !== null) {
        var src = m[1];
        if (src && !seenIframes[src]) {
          seenIframes[src] = true;
          iframes.push(src);
        }
      }
      var promises = iframes.map(function(src2) {
        return __async(this, null, function* () {
          if (src2.indexOf("vidmoly") !== -1) {
            return yield resolveVidMoly(src2);
          } else if (src2.indexOf("ok.ru") !== -1 || src2.indexOf("odnoklassniki") !== -1) {
            return yield resolveOkRu(src2);
          }
          return [];
        });
      });
      var results = yield Promise.all(promises);
      var allStreams = [];
      var seenStreamUrls = {};
      for (var i = 0; i < results.length; i++) {
        var list = results[i];
        for (var j = 0; j < list.length; j++) {
          var st = list[j];
          if (st && st.url && !seenStreamUrls[st.url]) {
            seenStreamUrls[st.url] = true;
            allStreams.push(st);
          }
        }
      }
      return allStreams;
    } catch (e) {
      return [];
    }
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      var page = 1;
      if (args && args.extra && args.extra.skip) {
        page = Math.floor(args.extra.skip / 20) + 1;
      }
      var query = args && args.extra && args.extra.search ? args.extra.search : "";
      if (query) {
        var searchList = yield searchSeries(query);
        var metas = searchList.map(function(s) {
          return {
            id: "diziboxizle:show:" + s.slug,
            type: "series",
            name: s.title,
            posterShape: "poster"
          };
        });
        return { metas };
      }
      var url = page > 1 ? BASE_URL + "/dizi-arsivi/page/" + page + "/" : BASE_URL + "/dizi-arsivi/";
      var res = yield fetch(url, { headers: HEADERS, signal: timeoutSignal(8e3) });
      if (!res.ok) return { metas: [] };
      var html = yield res.text();
      var metasArr = [];
      var seen = {};
      var itemRegex = /<div class="single-item">([\s\S]*?)<\/div>\s*<\/div>/gi;
      var im;
      while ((im = itemRegex.exec(html)) !== null) {
        var block = im[1];
        var linkMatch = block.match(/<a[^>]+href="https:\/\/diziboxizle\.com\/([a-z0-9-]+)\/"/i);
        var titleMatch = block.match(/<a[^>]+href="https:\/\/diziboxizle\.com\/[a-z0-9-]+\/">([^<]+)<\/a>/i);
        var posterMatch = block.match(/<img[^>]+src="([^"]+)"/i);
        var descMatch = block.match(/<div class="cat_ozet[^"]*">([\s\S]*?)<\/div>/i);
        var imdbMatch = block.match(/IMDb:\s*([\d.]+)/i);
        if (linkMatch && titleMatch) {
          var slug = linkMatch[1];
          if (!seen[slug]) {
            seen[slug] = true;
            metasArr.push({
              id: "diziboxizle:show:" + slug,
              type: "series",
              name: decodeHtmlEntities(titleMatch[1].trim()),
              poster: posterMatch ? posterMatch[1] : void 0,
              description: descMatch ? decodeHtmlEntities(descMatch[1].replace(/<[^>]+>/g, "").trim()) : void 0,
              imdbRating: imdbMatch ? imdbMatch[1] : void 0,
              posterShape: "poster"
            });
          }
        }
      }
      return { metas: metasArr };
    } catch (e) {
      return { metas: [] };
    }
  });
}
function getMeta(args) {
  return __async(this, null, function* () {
    try {
      var rawId = typeof args === "object" && args ? args.id || "" : String(args || "");
      var slug = rawId.replace("diziboxizle:show:", "").replace("diziboxizle:ep:", "");
      var detailUrl = BASE_URL + "/" + slug + "/";
      var res = yield fetch(detailUrl, { headers: HEADERS, signal: timeoutSignal(8e3) });
      if (!res.ok) return { meta: null };
      var html = yield res.text();
      var ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
      var ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
      var ogDesc = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
      var showName = SERIES_MAP[slug] || (ogTitle ? decodeHtmlEntities(ogTitle[1].replace(/\s*Dizisi izle[\s\S]*/i, "").trim()) : slug);
      var poster = ogImage ? ogImage[1] : void 0;
      var description = ogDesc ? decodeHtmlEntities(ogDesc[1].trim()) : void 0;
      var epList = parseEpisodes(html);
      var videos = epList.map(function(ep) {
        var epSlug = ep.url.replace(BASE_URL + "/", "").replace(/\/$/, "");
        return {
          id: "diziboxizle:ep:" + epSlug,
          title: ep.title,
          season: ep.season,
          episode: ep.episode
        };
      });
      return {
        meta: {
          id: "diziboxizle:show:" + slug,
          type: "series",
          name: showName,
          poster,
          description,
          videos
        }
      };
    } catch (e) {
      return { meta: null };
    }
  });
}
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      var isTv = mediaType === "tv" || mediaType === "series";
      if (typeof tmdbId === "object" && tmdbId && tmdbId.id) {
        return getStreams(tmdbId.id, tmdbId.type || mediaType, tmdbId.season || seasonNum, tmdbId.episode || episodeNum);
      }
      if (typeof tmdbId === "string" && tmdbId.startsWith("diziboxizle:ep:")) {
        var epSlug = tmdbId.replace("diziboxizle:ep:", "");
        return yield fetchEpisodeMirrors(BASE_URL + "/" + epSlug + "/");
      }
      var finalSeason = parseInt(seasonNum) || 1;
      var finalEpisode = parseInt(episodeNum) || 1;
      if (typeof tmdbId === "string" && tmdbId.startsWith("diziboxizle:show:")) {
        var showMeta = yield getMeta(tmdbId);
        if (showMeta && showMeta.meta && Array.isArray(showMeta.meta.videos) && showMeta.meta.videos.length > 0) {
          var matchedV = showMeta.meta.videos.find(function(v) {
            return v.season === finalSeason && v.episode === finalEpisode;
          }) || showMeta.meta.videos[0];
          return yield getStreams(matchedV.id, mediaType, finalSeason, finalEpisode);
        }
      }
      if (typeof tmdbId === "string" && tmdbId.indexOf(":") !== -1) {
        var parts = tmdbId.split(":");
        if (parts.length >= 3) {
          var s = parseInt(parts[parts.length - 2]);
          var e = parseInt(parts[parts.length - 1]);
          if (!isNaN(s)) finalSeason = s;
          if (!isNaN(e)) finalEpisode = e;
        }
      }
      var info = yield resolveTmdbInfo(tmdbId, mediaType);
      if (!info.titles || !info.titles.length) return [];
      var matchedSeries = null;
      for (var i = 0; i < info.titles.length; i++) {
        var q = info.titles[i];
        var list = yield searchSeries(q);
        if (list && list.length > 0) {
          matchedSeries = pickBestSeries(list, q);
          if (matchedSeries) break;
        }
      }
      if (!matchedSeries) return [];
      var sRes = yield fetch(matchedSeries.url, { headers: HEADERS, signal: timeoutSignal(8e3) });
      if (!sRes.ok) return [];
      var sHtml = yield sRes.text();
      var epList = parseEpisodes(sHtml);
      if (!epList.length) return [];
      var targetEpisode = matchEpisode(epList, finalSeason, finalEpisode);
      if (!targetEpisode) return [];
      return yield fetchEpisodeMirrors(targetEpisode.url);
    } catch (e2) {
      return [];
    }
  });
}
function sortStreamsByQuality(streams) {
  if (!Array.isArray(streams) || streams.length <= 1) return streams || [];
  function getQualityScore(s) {
    if (!s) return 0;
    var score = 0;
    var text = ((s.title || "") + " " + (s.name || "") + " " + (s.quality || "")).toLowerCase();
    if (/\b(4k|2160p|uhd)\b/.test(text)) score = 2160;
    else if (/\b(2k|1440p|qhd)\b/.test(text)) score = 1440;
    else if (/\b(1080p|fhd|full[\s-]?hd)\b/.test(text)) score = 1080;
    else if (/\b(720p)\b/.test(text)) score = 720;
    else if (/\b(540p)\b/.test(text)) score = 540;
    else if (/\b(480p)\b/.test(text)) score = 480;
    else if (/\b(360p)\b/.test(text)) score = 360;
    else if (/\b(240p)\b/.test(text)) score = 240;
    else if (/\b(hd)\b/.test(text) && !/\b(full[\s-]?hd)\b/.test(text)) score = 720;
    else if (/\b(sd)\b/.test(text)) score = 480;
    if (!score && s.url) {
      var u = String(s.url).toLowerCase();
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
  return streams.slice().sort(function(a, b) {
    return getQualityScore(b) - getQualityScore(a);
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
if (typeof module !== "undefined") module.exports = wrapAll({ getStreams, getCatalog, getMeta }, cfgReady);
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

