/**
 * Anthology Provider: hdfilmcehennemi
 * Built from src/hdfilmcehennemi/index.js
 * Build Date: 2026-09-20T20:49:56.239Z
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

// src/hdfilmcehennemi/index.js
var { loadConfig, val, wrapAll } = require_config();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.movies.hdfilmcehennemi.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var BASE_URL = "https://www.hdfilmcehennemi.nl";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
  "Referer": BASE_URL + "/"
};
var CLOSELOAD_HEADERS = {
  "User-Agent": HEADERS["User-Agent"],
  "Referer": "https://hdfilmcehennemi.mobi/"
};
var FILM_MAP = {
  // Top / Popüler Filmler
  "tt0133093": "hd-the-matrix-izle",
  "603": "hd-the-matrix-izle",
  "tt0111161": "1-esaretin-bedeli-film-izle-hdf-hdf-6",
  "278": "1-esaretin-bedeli-film-izle-hdf-hdf-6",
  "tt0068646": "hd-the-godfather-izle-10",
  "238": "hd-the-godfather-izle-10",
  "tt0071562": "hd-the-godfather-2-izle-7",
  "240": "hd-the-godfather-2-izle-7",
  "tt0468569": "batman-kara-sovalye-hd-film-izle-hdf-hdf-7",
  "155": "batman-kara-sovalye-hd-film-izle-hdf-hdf-7",
  "tt0137523": "1-dovus-kulubu-izle-6",
  "550": "1-dovus-kulubu-izle-6",
  "tt0110912": "ucuz-roman-izle-hdf-7",
  "680": "ucuz-roman-izle-hdf-7",
  "tt0108052": "hd-schindlerin-listesi-film-izle-7",
  "424": "hd-schindlerin-listesi-film-izle-7",
  "tt0050083": "12-angry-men-6",
  "389": "12-angry-men-6",
  "tt0060196": "1-iyi-kotu-ve-cirkin-izle-hdf-7",
  "429": "1-iyi-kotu-ve-cirkin-izle-hdf-7",
  "tt0120737": "1-yuzuklerin-efendisi-yuzuk-kardesligi-izle-hdf-8",
  "120": "1-yuzuklerin-efendisi-yuzuk-kardesligi-izle-hdf-8",
  "tt0167261": "yuzuklerin-efendisi-iki-kule-film-izle-hdf-7",
  "121": "yuzuklerin-efendisi-iki-kule-film-izle-hdf-7",
  "tt0167260": "1-yuzuklerin-efendisi-kralin-donusu-izle-hdf-7",
  "122": "1-yuzuklerin-efendisi-kralin-donusu-izle-hdf-7",
  "tt0075143": "the-message",
  "tt0252487": "the-chaos-class",
  "tt0253828": "tosun-pasha",
  "tt0253779": "the-foster-brothers",
  "tt2592910": "cm101mmxi-fundamentals-1",
  "tt15398776": "oppenheimer",
  "872585": "oppenheimer",
  "tt10366206": "john-wick-chapter-4",
  "603692": "john-wick-chapter-4",
  "tt10838180": "the-matrix-resurrections-hdf-16",
  "624860": "the-matrix-resurrections-hdf-16",
  "tt1877830": "the-batman-izle-hdf1-19",
  "414906": "the-batman-izle-hdf1-19",
  "tt4154796": "5-yenilmezler-son-oyun-full-hd-film-izle-hdf-18",
  "299534": "5-yenilmezler-son-oyun-full-hd-film-izle-hdf-18",
  "tt10872600": "spider-man-no-way-home-hdf13-10",
  "634649": "spider-man-no-way-home-hdf13-10",
  "tt1630029": "avatar-2-izle-hdf-549",
  "76600": "avatar-2-izle-hdf-549",
  "tt18412256": "alien-romulus-70",
  "945961": "alien-romulus-70",
  "tt6723592": "tenet-hd-film-izle-hdf-hdf1-19",
  "577922": "tenet-hd-film-izle-hdf-hdf1-19",
  "tt5433138": "hizli-ve-ofkeli-9-hd-film-izle-hdf-hdf6-8",
  "385128": "hizli-ve-ofkeli-9-hd-film-izle-hdf-hdf6-8",
  "tt5433140": "fast-x-2",
  "385687": "fast-x-2",
  "tt9114286": "black-panther-wakanda-forever-144",
  "505642": "black-panther-wakanda-forever-144",
  "tt9032400": "eternals-izle-hdf7-88",
  "524434": "eternals-izle-hdf7-88",
  "tt6443346": "black-adam-1711122",
  "436270": "black-adam-1711122",
  "tt9419884": "doctor-strange-in-the-multiverse-of-madness-hdf4-75222111",
  "453395": "doctor-strange-in-the-multiverse-of-madness-hdf4-75222111",
  "tt10648342": "thor-love-and-thunder-hdf2-60222135",
  "616037": "thor-love-and-thunder-hdf2-60222135",
  "tt5034838": "godzilla-ve-kong-hd-film-izle-hdf2-hdf1-30",
  "399566": "godzilla-ve-kong-hd-film-izle-hdf2-hdf1-30",
  "tt7097896": "venom-let-there-be-carnage-hdf-hdf6-19",
  "580489": "venom-let-there-be-carnage-hdf-hdf6-19",
  "tt12361974": "zack-snyders-justice-league-hd-film-izle-hdf6-14",
  "791373": "zack-snyders-justice-league-hd-film-izle-hdf6-14",
  "tt2543164": "1-gelis-film-izle-hdf-hdf-10",
  "329865": "1-gelis-film-izle-hdf-hdf-10",
  "tt9777666": "the-tomorrow-war-hdf13-8",
  "588228": "the-tomorrow-war-hdf13-8",
  "tt9376612": "shang-chi-and-the-legend-of-the-ten-rings-hdf-hdf18-8539",
  "566525": "shang-chi-and-the-legend-of-the-ten-rings-hdf-hdf18-8539",
  "tt5700672": "ssddtraintobusonfilmini-1080p-hd-izle-hdf-hdf-7",
  "396535": "ssddtraintobusonfilmini-1080p-hd-izle-hdf-hdf-7",
  "tt22084616": "spider-man-brand-new-day",
  "tt8814476": "supergirl-2026-hdfc-7",
  "tt31170389": "evil-dead-burn-13",
  "tt0427340": "masters-of-the-universe-36",
  "tt37287335": "obsession-2026-hdfc-46",
  "tt30825738": "the-mandalorian-and-grogu-34",
  "tt15047880": "disclosure-day",
  "tt17490712": "mortal-kombat-ii-2026-8",
  "tt32273171": "the-death-of-robin-hood-32",
  "tt28014327": "mayday-hdf-2026",
  "tt27165187": "the-end-of-oak-street-2",
  "tt32093575": "scary-movie-2026-18",
  "tt12042730": "project-hail-mary-54",
  "tt32558705": "the-hunger-games-sunrise-on-the-reaping-4",
  "tt27419420": "street-fighter-hdfc",
  "tt32432428": "violent-night-2-2026-hdfc",
  "tt27041231": "musk-2026",
  "tt32329539": "crawlers-2026",
  "tt34384661": "godzilla-minus-zero-2026",
  "tt31378509": "dune-part-three",
  "tt32038799": "vittoria-2024",
  "tt27369017": "hope-2026-hdfc-2",
  "tt38359047": "catane-2025",
  "tt38630008": "gator-face-2026",
  "tt27804164": "julie-keeps-quiet",
  "tt32635378": "checkered-ninja-3-2026",
  "tt32296243": "hell-in-paradise-2025",
  "tt15475528": "cuerpo-celeste-2025",
  "tt33510831": "band-of-brothers-legacy",
  "tt14119302": "hot-spot-2026",
  "tt38616652": "go-team-2026",
  "tt43751675": "the-idaho-college-murders-catching-kohberger",
  "tt4357198": "how-to-make-a-killing--2026-hdfc-15",
  "tt37673293": "tarung-unforgiven",
  "tt28375311": "the-balconettes-15",
  "tt36073210": "drawn-together",
  "tt38061210": "why-did-i-get-married-again",
  "tt38267923": "call-my-agent-the-movie",
  "tt39315536": "twenty-one-pilots-more-than-we-ever-imagined-2026",
  "tt33175825": "attack-on-titan-the-last-attack",
  "tt32034305": "never-escape",
  "tt38353956": "de-un-rancho-a-otro",
  "tt31975872": "maantrika",
  "tt1756855": "coyote-vs-acme-2026-2",
  "tt32333324": "batman-knightfall-part-1-knightfall",
  "tt15245268": "young-hearts-2024",
  "tt10612922": "miamide-bir-gece-one-night-in-miami-izle-hdf-hdf1-5",
  "tt43749709": "grand-theft-auto-vi-an-extended-look",
  "tt35340614": "the-blue-trail-52",
  "tt43465871": "sia-nostalgic-for-the-present",
  "tt18550220": "junkyard-dog",
  "tt29355505": "toy-story-5-2026-35",
  "tt33296751": "tuner-2026-6",
  "tt32889884": "freefall-a-reckoning-for-boeing-2026",
  "tt35521200": "two-prosecutors",
  "tt38984207": "sunshine-women-s-choir-2025",
  "tt38264211": "kenny-dalglish-2025",
  "tt39260895": "pyaar-prema-kalyanam-2026",
  "tt13654226": "the-gorge-2",
  "tt31227572": "predator-badlands-22",
  "tt15486810": "teen-wolf-the-movie-79",
  "tt0427944": "thank-you-for-smoking-2005",
  "tt0347304": "kal-ho-naa-ho-2003",
  "tt0455961": "hoboken-hollow",
  "tt7960918": "cin-cesmesi-1",
  "tt5042436": "barbie-spy-squad-2016",
  "tt38359641": "frankie-maniac-woman-2025",
  "tt5211694": "flower-shop-mystery-mum-s-the-word-2016",
  "tt0082924": "super-fuzz-1980",
  "tt2172935": "metallica-through-the-never-2013",
  "tt0065112": "topaz",
  "tt38689148": "tormento-2025",
  "tt0071532": "the-gambler",
  "tt34379051": "by-any-means-2026",
  "tt0051036": "sweet-smell-of-success",
  "tt0058329": "marnie",
  "tt0039694": "the-paradine-case",
  "tt0070334": "the-long-goodbye-1973",
  "tt36372021": "guardiansofthe-galapagos-2025",
  "tt0097815": "major-league",
  "tt37547195": "in-a-cold-vein-2025",
  "tt0064952": "the-secret-of-santa-vittoria-1969-1970",
  "tt1490785": "i-saw-the-light",
  "tt3801934": "1-wild-city-izle-4",
  "tt1572168": "black-ransom-2010"
};
var SLUG_CACHE = /* @__PURE__ */ new Map();
function fetchWithTimeout(url, options, ms) {
  var opts = options || {};
  try {
    if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) {
      opts.signal = AbortSignal.timeout(ms || 1e4);
    }
  } catch (e) {
  }
  return fetch(url, opts);
}
function slugify(text) {
  if (!text) return "";
  return text.toString().toLowerCase().replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[âÂ]/g, "a").replace(/[îÎ]/g, "i").replace(/[ûÛ]/g, "u").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function ultraClean(str) {
  if (!str) return "";
  return str.toString().toLowerCase().replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[âÂ]/g, "a").replace(/[îÎ]/g, "i").replace(/[ûÛ]/g, "u").replace(/[^a-z0-9]/g, "").trim();
}
function resolveTmdbInfo(id) {
  return __async(this, null, function* () {
    try {
      var cleanId = String(id || "").trim();
      if (cleanId.includes(":")) cleanId = cleanId.split(":")[0];
      var titleTr = "";
      var titleEn = "";
      var year = "";
      var imdbId = "";
      var tmdbId = "";
      if (cleanId.startsWith("tt")) {
        imdbId = cleanId;
        var findUrl = "https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_API_KEY + "&external_source=imdb_id&language=tr-TR";
        var findRes = yield fetchWithTimeout(findUrl, {}, 8e3);
        if (findRes.ok) {
          var fd = yield findRes.json();
          var match = fd.movie_results && fd.movie_results[0];
          if (match) {
            titleTr = match.title || "";
            titleEn = match.original_title || "";
            year = (match.release_date || "").split("-")[0];
            tmdbId = String(match.id || "");
          }
        }
      } else if (/^\d+$/.test(cleanId)) {
        tmdbId = cleanId;
        var movieUrl = "https://api.themoviedb.org/3/movie/" + cleanId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR";
        var mRes = yield fetchWithTimeout(movieUrl, {}, 8e3);
        if (mRes.ok) {
          var md = yield mRes.json();
          titleTr = md.title || "";
          titleEn = md.original_title || "";
          year = (md.release_date || "").split("-")[0];
          imdbId = md.imdb_id || "";
        }
      }
      return {
        titleTr,
        titleEn,
        year,
        imdbId,
        tmdbId
      };
    } catch (e) {
      return { titleTr: "", titleEn: "", year: "", imdbId: "", tmdbId: "" };
    }
  });
}
function findMovieSlug(tmdbIdOrSlug) {
  return __async(this, null, function* () {
    var cleanId = String(tmdbIdOrSlug || "").trim();
    if (cleanId.startsWith("hdfilmcehennemi:movie:")) {
      return cleanId.replace("hdfilmcehennemi:movie:", "").trim();
    }
    if (FILM_MAP[cleanId]) return FILM_MAP[cleanId];
    if (cleanId.includes(":")) {
      var rawId = cleanId.split(":")[0];
      if (FILM_MAP[rawId]) return FILM_MAP[rawId];
    }
    if (SLUG_CACHE.has(cleanId)) return SLUG_CACHE.get(cleanId);
    var info = yield resolveTmdbInfo(cleanId);
    if (info.imdbId && FILM_MAP[info.imdbId]) {
      SLUG_CACHE.set(cleanId, FILM_MAP[info.imdbId]);
      return FILM_MAP[info.imdbId];
    }
    if (info.tmdbId && FILM_MAP[info.tmdbId]) {
      SLUG_CACHE.set(cleanId, FILM_MAP[info.tmdbId]);
      return FILM_MAP[info.tmdbId];
    }
    var candidates = [];
    var enSlug = slugify(info.titleEn);
    var trSlug = slugify(info.titleTr);
    var year = info.year;
    if (enSlug) {
      candidates.push(enSlug);
      if (year) candidates.push(enSlug + "-" + year);
      candidates.push("hd-" + enSlug + "-izle");
      candidates.push("1-" + enSlug + "-izle-6");
      candidates.push("1-" + enSlug + "-izle-7");
      candidates.push("1-" + enSlug + "-izle-8");
      candidates.push("1-" + enSlug + "-izle-10");
      candidates.push(enSlug + "-izle");
      candidates.push(enSlug + "-hdf");
    }
    if (trSlug && trSlug !== enSlug) {
      candidates.push(trSlug);
      if (year) candidates.push(trSlug + "-" + year);
      candidates.push("hd-" + trSlug + "-izle");
      candidates.push("1-" + trSlug + "-izle-6");
      candidates.push("1-" + trSlug + "-izle-7");
      candidates.push("1-" + trSlug + "-izle-8");
      candidates.push("1-" + trSlug + "-izle-10");
      candidates.push("1-" + trSlug + "-film-izle-hdf-hdf-6");
      candidates.push("1-" + trSlug + "-film-izle-hdf-hdf-7");
      candidates.push("1-" + trSlug + "-film-izle-hdf-hdf-8");
      candidates.push("1-" + trSlug + "-film-izle-hdf-hdf-10");
      candidates.push(trSlug + "-izle");
      candidates.push(trSlug + "-hdf");
    }
    var cleanTargetEn = ultraClean(info.titleEn);
    var cleanTargetTr = ultraClean(info.titleTr);
    for (var i = 0; i < candidates.length; i++) {
      var cand = candidates[i];
      if (!cand) continue;
      try {
        var res = yield fetchWithTimeout(BASE_URL + "/" + cand + "/", { headers: HEADERS }, 5e3);
        if (res.status === 200) {
          var html = yield res.text();
          var imdbMatch = html.match(/https:\/\/(?:www\.)?imdb\.com\/title\/(tt\d+)/i);
          var pageImdb = imdbMatch ? imdbMatch[1] : null;
          if (pageImdb && info.imdbId && pageImdb === info.imdbId) {
            SLUG_CACHE.set(cleanId, cand);
            if (info.imdbId) FILM_MAP[info.imdbId] = cand;
            return cand;
          }
          var titleMatch = html.match(/<title>([^<]+)<\/title>/i);
          if (titleMatch) {
            var pTitle = ultraClean(titleMatch[1]);
            if (cleanTargetEn && pTitle.includes(cleanTargetEn) || cleanTargetTr && pTitle.includes(cleanTargetTr)) {
              SLUG_CACHE.set(cleanId, cand);
              return cand;
            }
          }
        }
      } catch (e) {
      }
    }
    return null;
  });
}
function decryptCloseLoadScript(scriptContent) {
  try {
    var m = scriptContent.match(/var\s+([a-zA-Z0-9_$]+)\s*=\s*[a-zA-Z0-9_$]+\(\[[^\]]+\]\);/);
    if (!m) return null;
    var varName = m[1];
    var code = [
      'var atob = (typeof globalThis.atob !== "undefined") ? globalThis.atob : function(s) {',
      '  return Buffer.from(s, "base64").toString("binary");',
      "};",
      'var btoa = (typeof globalThis.btoa !== "undefined") ? globalThis.btoa : function(s) {',
      '  return Buffer.from(s, "binary").toString("base64");',
      "};",
      scriptContent,
      "return " + varName + ";"
    ].join("\n");
    return new Function(code)();
  } catch (e) {
    return null;
  }
}
function resolveCloseLoadStreams(pageUrl) {
  return __async(this, null, function* () {
    try {
      var res = yield fetchWithTimeout(pageUrl, { headers: HEADERS }, 1e4);
      if (!res.ok) return null;
      var html = yield res.text();
      var ifrMatch = html.match(/data-src="([^"]*video\/embed[^"]*)"/i) || html.match(/<iframe[^>]+src="([^"]*video\/embed[^"]*)"/i);
      if (!ifrMatch) return null;
      var embedUrl = ifrMatch[1];
      if (embedUrl.startsWith("//")) embedUrl = "https:" + embedUrl;
      var eRes = yield fetchWithTimeout(embedUrl, {
        headers: {
          "User-Agent": HEADERS["User-Agent"],
          "Referer": BASE_URL + "/"
        }
      }, 1e4);
      if (!eRes.ok) return null;
      var eHtml = yield eRes.text();
      var scripts = Array.from(eHtml.matchAll(/<script[\s\S]*?<\/script>/gi)).map(function(m) {
        return m[0];
      });
      var streamUrl = null;
      for (var i = 0; i < scripts.length; i++) {
        var s = scripts[i];
        if (s.includes("var ") && s.includes("([") && (s.includes("btoa") || s.includes("atob") || s.includes("join"))) {
          var cleanScript = s.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "");
          var dec = decryptCloseLoadScript(cleanScript);
          if (dec && typeof dec === "string" && dec.startsWith("http")) {
            streamUrl = dec;
            break;
          }
        }
      }
      if (!streamUrl) return null;
      var subtitles = [];
      var tracksMatch = eHtml.match(/tracks:\s*(\[[^\]]+\])/i);
      if (tracksMatch) {
        try {
          var rawTracks = JSON.parse(tracksMatch[1]);
          for (var tIdx = 0; tIdx < rawTracks.length; tIdx++) {
            var t = rawTracks[tIdx];
            if (t.file && t.kind === "captions") {
              var label = t.label || "Subtitle";
              var lowerLabel = label.toLowerCase();
              var langCode = "tr";
              var isoLang = "tur";
              if (lowerLabel.includes("eng") || lowerLabel.includes("ing")) {
                langCode = "en";
                isoLang = "eng";
              } else if (lowerLabel.includes("tur") || lowerLabel.includes("t\xFCrk")) {
                langCode = "tr";
                isoLang = "tur";
              } else if (lowerLabel.includes("ger") || lowerLabel.includes("alm")) {
                langCode = "de";
                isoLang = "ger";
              } else if (lowerLabel.includes("fre") || lowerLabel.includes("fra")) {
                langCode = "fr";
                isoLang = "fre";
              } else if (lowerLabel.includes("spa") || lowerLabel.includes("isp")) {
                langCode = "es";
                isoLang = "spa";
              }
              subtitles.push({
                id: "hdfc_sub_" + tIdx,
                url: t.file,
                file: t.file,
                link: t.file,
                lang: isoLang,
                language: langCode,
                label,
                name: label,
                title: label,
                format: "vtt",
                type: "text/vtt",
                mimeType: "text/vtt",
                headers: {
                  "User-Agent": HEADERS["User-Agent"],
                  "Referer": "https://hdfilmcehennemi.mobi/"
                }
              });
            }
          }
        } catch (e) {
        }
      }
      return {
        streamUrl,
        subtitles
      };
    } catch (e) {
      return null;
    }
  });
}
function getStreams(tmdbIdOrArgs, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      var rawId = tmdbIdOrArgs;
      if (typeof tmdbIdOrArgs === "object" && tmdbIdOrArgs !== null) {
        rawId = tmdbIdOrArgs.id || "";
        mediaType = mediaType || tmdbIdOrArgs.type || tmdbIdOrArgs.mediaType;
      }
      if (!rawId) return [];
      var slug = yield findMovieSlug(rawId);
      if (!slug) return [];
      var pageUrl = BASE_URL + "/" + slug + "/";
      var resolved = yield resolveCloseLoadStreams(pageUrl);
      if (!resolved || !resolved.streamUrl) return [];
      var masterUrl = resolved.streamUrl;
      var playUrl = masterUrl.includes("#") ? masterUrl : masterUrl + "#.m3u8";
      var streams = [];
      streams.push({
        name: "HDFilmCehennemi [CloseLoad]",
        title: "HDFilmCehennemi - 1080p [Dual: TR Dublaj / Orijinal]",
        url: playUrl,
        quality: "1080p",
        format: "hls",
        isHls: true,
        contentLanguage: ["tr", "en"],
        behaviorHints: {
          headers: CLOSELOAD_HEADERS
        },
        headers: CLOSELOAD_HEADERS,
        subtitles: resolved.subtitles
      });
      return streams;
    } catch (e) {
      return [];
    }
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      var pages = [
        BASE_URL + "/",
        BASE_URL + "/imdb-7-puan-uzeri-filmler-2/",
        BASE_URL + "/en-cok-yorumlananlar-2/",
        BASE_URL + "/feed/"
      ];
      var metas = [];
      var seenSlugs = /* @__PURE__ */ new Set();
      for (var i = 0; i < pages.length; i++) {
        try {
          var res = yield fetchWithTimeout(pages[i], { headers: HEADERS }, 8e3);
          if (!res.ok) continue;
          var html = yield res.text();
          var matches = Array.from(html.matchAll(/<a[^>]+href="https:\/\/www\.hdfilmcehennemi\.nl\/([^"\/]+)\/"[^>]*title="([^"]*)"/gi));
          for (var mIdx = 0; mIdx < matches.length; mIdx++) {
            var m = matches[mIdx];
            var slug = m[1];
            var rawTitle = m[2];
            if (!slug || seenSlugs.has(slug)) continue;
            if (slug.includes("category") || slug.includes("yil") || slug.includes("imdb") || slug.includes("yorum") || slug.includes("begeni") || slug.includes("robotu") || slug.includes("apk") || slug.includes("iletisim") || slug.includes("dizi/") || slug.includes("tur/") || slug.includes("dil/") || slug.includes("serifilmlerim") || slug.includes("film-istek")) {
              continue;
            }
            seenSlugs.add(slug);
            var title = rawTitle.replace(/&amp;/g, "&").replace(/&ouml;/gi, "\xF6").replace(/&uuml;/gi, "\xFC").replace(/&ccedil;/gi, "\xE7").replace(/&rsquo;/g, "\u2019").replace(/&Uuml;/gi, "\xDC").replace(/&Ouml;/gi, "\xD6").replace(/&Ccedil;/gi, "\xC7").replace(/&#039;/g, "'").replace(/\s*-\s*Hdfilmcehennemi.*$/i, "").trim();
            metas.push({
              id: "hdfilmcehennemi:movie:" + slug,
              type: "movie",
              name: title || slug,
              poster: "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
              background: "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
              genres: ["Film", "HDFilmCehennemi"],
              description: title + " - HDFilmCehennemi 1080p Dual Ak\u0131\u015F"
            });
            if (metas.length >= 50) break;
          }
        } catch (e) {
        }
        if (metas.length >= 50) break;
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
      var slug = rawId.startsWith("hdfilmcehennemi:movie:") ? rawId.replace("hdfilmcehennemi:movie:", "") : rawId;
      var pageUrl = BASE_URL + "/" + slug + "/";
      var res = yield fetchWithTimeout(pageUrl, { headers: HEADERS }, 1e4);
      if (!res.ok) return { meta: null };
      var html = yield res.text();
      var titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      var title = titleMatch ? titleMatch[1].split("|")[0].split("-")[0].trim() : slug;
      var ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      var poster = ogImg ? ogImg[1] : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
      return {
        meta: {
          id: "hdfilmcehennemi:movie:" + slug,
          type: "movie",
          name: title,
          poster,
          background: poster,
          description: title + " - HDFilmCehennemi",
          genres: ["Film", "HDFilmCehennemi"],
          videos: [
            {
              id: "hdfilmcehennemi:movie:" + slug,
              title,
              released: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
            }
          ]
        }
      };
    } catch (e) {
      return { meta: null };
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

