/**
 * Anthology Provider: seicode
 * Built from src/seicode/index.js
 * Build Date: 2026-09-19T21:03:10.760Z
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

// src/seicode/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.anime.seicode.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      v = val("urls.anime.seicode.api_base");
      if (v) API_BASE = String(v).replace(/\/+$/, "");
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var BASE_URL = "https://seicode.net";
var API_BASE = "https://next.seicode.net";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/"
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
var TMDB_MAP = {
  "30984": "bleach",
  "30991": "cowboy-bebop",
  "45790": "jojos-bizarre-adventure",
  "56568": "nana",
  "62602": "blue-spring-ride",
  "62640": "nisekoi",
  "63926": "one-punch-man",
  "65942": "re-zero-starting-life-in-another-world-",
  "66348": "re-zero-kara-hajimeru-break-time",
  "72517": "classroom-of-the-elite",
  "76758": "hinamatsuri",
  "78483": "kakuriyo-bed-breakfast-for-spirits-",
  "79166": "grand-blue-dreaming",
  "80564": "banana-fish",
  "82684": "that-time-i-got-reincarnated-as-a-slime",
  "82739": "rascal-does-not-dream-of-bunny-girl-senpai",
  "83121": "kaguya-sama-love-is-war",
  "85937": "demon-slayer-kimetsu-no-yaiba",
  "86034": "arifureta-from-commonplace-to-worlds-strongest",
  "88040": "given",
  "91768": "ascendance-of-a-bookworm",
  "91801": "welcome-to-demon-school-iruma-kun",
  "93241": "uzumaki",
  "94664": "mushoku-tensei-jobless-reincarnation",
  "95269": "toilet-bound-hanako-kun",
  "95479": "jujutsu-kaisen",
  "96316": "rent-a-girlfriend",
  "97525": "to-your-eternity",
  "97782": "kuma-kuma-kuma-bear",
  "100281": "moriarty-the-patriot",
  "100436": "akudama-drive",
  "107255": "dragon-raja-the-blazing-dawn-",
  "110837": "bungo-stray-dogs-wan",
  "111576": "shadows-house",
  "113808": "seirei-gensouki-spirit-chronicles",
  "117465": "hells-paradise",
  "120089": "spy-x-family",
  "123249": "my-dress-up-darling",
  "123542": "link-click",
  "127532": "solo-leveling",
  "130237": "aharen-san-wa-hakarenai",
  "131041": "blue-lock",
  "153217": "sparks-of-tomorrow",
  "154526": "mf-ghost",
  "154716": "link-click-the-daily-life-in-lightime",
  "154743": "the-angel-next-door-spoils-me-rotten",
  "196285": "farming-life-in-another-world",
  "196950": "witch-hat-atelier",
  "203737": "oshi-no-ko",
  "204266": "trigun-stampede",
  "205050": "shangri-la-frontier",
  "205743": "no-longer-allowed-in-another-world",
  "206799": "dark-gathering",
  "207332": "sakamoto-days",
  "207347": "blue-box",
  "213402": "campfire-cooking-in-another-world-with-my-absurd-skill",
  "216074": "25-dimensional-seduction",
  "216467": "mission-yozakura-family",
  "216523": "ron-kamonohashis-forbidden-deductions",
  "217407": "can-a-boy-girl-friendship-survive",
  "217409": "april-showers-bring-may-flowers",
  "220286": "ishura",
  "220542": "the-apothecary-diaries",
  "222623": "the-elusive-samurai",
  "223564": "the-100-girlfriends-who-really-really-really-really-really-love-you",
  "229858": "fate-strange-fake",
  "230189": "365-days-to-the-wedding",
  "231003": "lazarus",
  "231873": "oblivion-battery",
  "232230": "lord-of-mysteries",
  "232252": "delicos-nursery",
  "234538": "demon-lord-2099",
  "234776": "blue-miburo",
  "234910": "tying-the-knot-with-an-amagami-sister",
  "239761": "senpai-is-an-otokonoko",
  "239779": "true-beauty",
  "241535": "makeine-too-many-losing-heroines",
  "242143": "you-are-ms-servant",
  "244624": "the-do-over-damsel-conquers-the-dragon-emperor",
  "245285": "failure-frame-i-became-the-strongest-and-annihilated-everything-with-low-level-spells",
  "245325": "the-richest-man-in-game",
  "245842": "wistoria-wand-and-sword",
  "247045": "nyaight-of-the-living-cat",
  "247859": "honey-lemon-soda",
  "249882": "zenshu",
  "249907": "sentenced-to-be-a-hero",
  "249964": "i-may-be-a-guild-receptionist-but-ill-solo-any-boss-to-clock-out-on-time",
  "250596": "my-wife-has-no-emotion",
  "250994": "ameku-md-doctor-detective",
  "253476": "journal-with-witch",
  "254492": "hana-kimi",
  "254987": "dead-dead-demons-dededede-destruction",
  "256721": "gachiakuta",
  "256744": "flower-and-asura",
  "257603": "tsumasho",
  "258228": "momentary-lily",
  "258348": "clevatess",
  "258578": "promise-of-wizard",
  "258580": "the-most-notorious-talker-runs-the-worlds-greatest-clan",
  "258680": "anyway-im-falling-in-love-with-you",
  "258994": "medaka-kuroiwa-is-impervious-to-my-charms",
  "259559": "headhunted-to-another-world-from-salaryman-to-big-four",
  "259787": "yakuza-fiance-raise-wa-tanin-ga-ii",
  "259819": "rooster-fighter",
  "260463": "daemons-of-the-shadow-realm",
  "260523": "rock-is-a-ladys-modesty",
  "260823": "from-old-country-bumpkin-to-master-swordsman",
  "261298": "possibly-the-greatest-alchemist-of-all-time",
  "261311": "i-want-to-escape-from-princess-lessons",
  "261343": "chitose-is-in-the-ramune-bottle",
  "262141": "i-have-a-crush-at-work",
  "263330": "shiboyugi-playing-death-games-to-put-food-on-the-table",
  "270603": "the-exiled-heavy-knight-knows-how-to-game-the-system",
  "271605": "may-i-ask-for-one-final-thing",
  "271609": "dark-moon-the-blood-altar",
  "272059": "to-be-hero-x",
  "273467": "the-warrior-princess-and-the-barbaric-king",
  "274069": "kowloon-generic-romance",
  "274671": "the-beginning-after-the-end",
  "274741": "the-too-perfect-saint-tossed-aside-by-my-fiance-and-sold-to-another-kingdom",
  "276204": "bogus-skill-fruitmaster-about-that-time-i-became-able-to-eat-unlimited-numbers-of-skill-fruits-that-kill-you",
  "276253": "the-brilliant-healers-new-life-in-the-shadows",
  "277513": "theres-no-freaking-way-ill-be-your-lover-unless",
  "277665": "anne-shirley",
  "278043": "you-and-i-are-polar-opposites",
  "278196": "the-summer-hikaru-died",
  "278604": "gnosia",
  "278635": "my-gift-lvl-9999-unlimited-gacha-backstabbed-in-a-backwater-dungeon-im-out-for-revenge",
  "278816": "the-gorilla-gods-go-to-girl",
  "279182": "super-cube",
  "279216": "the-dinner-table-detective",
  "280049": "hell-mode-the-hardcore-gamer-dominates-in-another-world-with-garbage-balancing",
  "280078": "the-all-devouring-whale-homecoming",
  "281161": "noble-reincarnation-born-blessed-so-ill-obtain-ultimate-power",
  "281199": "legend-of-princess-chang-ge",
  "282946": "kunon-the-sorcerer-can-see",
  "282984": "nmeneko",
  "283360": "classicstars",
  "283428": "the-ramparts-of-ice",
  "283891": "the-holy-grail-of-eris",
  "284029": "the-cat-and-the-dragon",
  "284432": "scum-of-the-brave",
  "284444": "champignon-witch",
  "284495": "isekai-office-worker-the-other-worlds-books-depend-on-the-bean-counter",
  "284644": "my-status-as-an-assassin-obviously-exceeds-the-heros",
  "285166": "jack-of-all-trades-party-of-none",
  "285291": "reincarnated-as-a-dragon-hatchling",
  "285356": "watari-kuns-is-about-to-collapse",
  "285574": "i-want-to-love-you-till-your-dying-day",
  "285743": "you-cant-be-in-a-rom-com-with-your-childhood-friends",
  "285818": "mistress-kanan-is-devilishly-easy",
  "285933": "tune-in-to-the-midnight-heart",
  "286291": "dead-account",
  "286345": "though-i-am-an-inept-villainess",
  "287278": "mechanical-marie",
  "287591": "in-the-clear-moonlit-dusk",
  "288551": "the-klutzy-class-monitor-and-the-girl-with-the-short-skirt",
  "288659": "agents-of-the-four-seasons-dance-of-spring",
  "288971": "jaadugar-a-witch-in-mongolia",
  "290019": "i-made-friends-with-the-second-prettiest-girl-in-my-class",
  "293144": "wash-it-all-away",
  "293697": "i-want-to-end-this-love-game",
  "295071": "goodbye-lara",
  "295366": "there-was-a-cute-girl-in-the-heros-party-so-i-tried-confessing-to-her",
  "295999": "mao",
  "296286": "smoking-behind-the-supermarket-with-you",
  "296851": "si-vis-the-sound-of-heroes",
  "297438": "akane-banashi",
  "298831": "a-livid-ladys-guide-to-getting-even-how-i-crushed-my-homeland-with-my-mighty-grimoires",
  "300126": "liar-game",
  "300131": "kill-blue",
  "300267": "the-worlds-strongest-rearguard",
  "301944": "marriage-toxin",
  "304820": "always-a-catch",
  "309163": "gals-cant-be-kind-to-otaku",
  "309974": "love-unseen-beneath-the-clear-night-sky",
  "310921": "monster-eater",
  "312474": "nippon-sangoku-the-three-nations-of-the-crimson-sun",
  "312849": "rich-girl-caretaker-im-secretly-the-caregiver-of-the-most-popular-girl-in-this-rich-kid-school",
  "312949": "chainsmoker-cat"
};
function resolveTmdbInfo(id, mediaType) {
  return __async(this, null, function* () {
    try {
      var cleanId = String(id || "").trim();
      if (cleanId.indexOf(":") !== -1) cleanId = cleanId.split(":")[0];
      var numericId = null;
      var titles = [];
      if (cleanId.indexOf("tt") === 0) {
        var findUrl = "https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_API_KEY + "&external_source=imdb_id";
        var findRes = yield fetch(findUrl, { signal: timeoutSignal(6e3) });
        if (findRes.ok) {
          var fData = yield findRes.json();
          var item = null;
          if (mediaType === "movie") {
            item = fData.movie_results && fData.movie_results[0] || fData.tv_results && fData.tv_results[0];
          } else {
            item = fData.tv_results && fData.tv_results[0] || fData.movie_results && fData.movie_results[0];
          }
          if (item) {
            numericId = item.id;
            if (item.name) titles.push(item.name);
            if (item.title) titles.push(item.title);
            if (item.original_name) titles.push(item.original_name);
            if (item.original_title) titles.push(item.original_title);
          }
        }
      } else if (/^\d+$/.test(cleanId)) {
        numericId = cleanId;
      }
      if (numericId) {
        var type = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
        var enRes = yield fetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY, { signal: timeoutSignal(6e3) });
        if (enRes.ok) {
          var enData = yield enRes.json();
          if (enData.name) titles.push(enData.name);
          if (enData.title) titles.push(enData.title);
          if (enData.original_name) titles.push(enData.original_name);
          if (enData.original_title) titles.push(enData.original_title);
        }
        var trRes = yield fetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR", { signal: timeoutSignal(6e3) });
        if (trRes.ok) {
          var trData = yield trRes.json();
          if (trData.name) titles.push(trData.name);
          if (trData.title) titles.push(trData.title);
        }
        var altRes = yield fetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "/alternative_titles?api_key=" + TMDB_API_KEY, { signal: timeoutSignal(6e3) });
        if (altRes.ok) {
          var altData = yield altRes.json();
          var alts = altData.titles || altData.results || [];
          for (var i = 0; i < alts.length; i++) {
            var a = alts[i];
            if (a.title && /^[a-zA-Z0-9\s:.,!?'-]+$/.test(a.title)) {
              titles.push(a.title);
            }
          }
        }
      }
      var seen = {};
      var uniqueTitles = [];
      for (var j = 0; j < titles.length; j++) {
        var t = decodeHtmlEntities(titles[j]).trim();
        var u = ultraClean(t);
        if (u && !seen[u]) {
          seen[u] = true;
          uniqueTitles.push(t);
        }
      }
      return { titles: uniqueTitles, numericId };
    } catch (e) {
      return { titles: [], numericId: id };
    }
  });
}
function searchSeicode(query) {
  return __async(this, null, function* () {
    try {
      var url = API_BASE + "/anime/search?q=" + encodeURIComponent(query);
      var res = yield fetch(url, { headers: HEADERS, signal: timeoutSignal(7e3) });
      if (!res.ok) return [];
      var data = yield res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  });
}
function fetchAnimeDetail(slug) {
  return __async(this, null, function* () {
    try {
      if (!slug) return null;
      var url = API_BASE + "/anime/" + encodeURIComponent(slug);
      var res = yield fetch(url, { headers: HEADERS, signal: timeoutSignal(8e3) });
      if (!res.ok) return null;
      return yield res.json();
    } catch (e) {
      return null;
    }
  });
}
function resolveSlugFromTmdb(numericId, mediaType) {
  return __async(this, null, function* () {
    if (!numericId) return null;
    var strId = String(numericId).trim();
    if (TMDB_MAP[strId]) {
      return TMDB_MAP[strId];
    }
    var info = yield resolveTmdbInfo(strId, mediaType);
    if (!info.titles || !info.titles.length && !info.numericId) return null;
    if (info.numericId && TMDB_MAP[String(info.numericId)]) {
      TMDB_MAP[strId] = TMDB_MAP[String(info.numericId)];
      return TMDB_MAP[String(info.numericId)];
    }
    for (var i = 0; i < info.titles.length; i++) {
      var q = info.titles[i];
      var list = yield searchSeicode(q);
      if (list && list.length > 0) {
        for (var j = 0; j < list.length; j++) {
          var item = list[j];
          if (!item || !item.slug) continue;
          var det = yield fetchAnimeDetail(item.slug);
          if (det && det.tmdbID && String(det.tmdbID) === strId) {
            TMDB_MAP[strId] = item.slug;
            return item.slug;
          }
          if (ultraClean(item.english) === ultraClean(q)) {
            TMDB_MAP[strId] = item.slug;
            return item.slug;
          }
        }
      }
    }
    return null;
  });
}
function matchEpisode(seasons, targetSeason, targetEpisode) {
  if (!Array.isArray(seasons) || !seasons.length) return null;
  var tS = parseInt(targetSeason) || 1;
  var tE = parseInt(targetEpisode) || 1;
  for (var i = 0; i < seasons.length; i++) {
    var s = seasons[i];
    var sNum = parseInt(s.season_number) || 1;
    if (sNum === tS && Array.isArray(s.episodes)) {
      var ep = s.episodes.find(function(e) {
        return parseInt(e.episode_number) === tE;
      });
      if (ep) return ep;
    }
  }
  if (seasons.length === 1 && Array.isArray(seasons[0].episodes)) {
    var epSolo = seasons[0].episodes.find(function(e) {
      return parseInt(e.episode_number) === tE;
    });
    if (epSolo) return epSolo;
  }
  for (var j = 0; j < seasons.length; j++) {
    var s2 = seasons[j];
    if (Array.isArray(s2.episodes)) {
      var ep2 = s2.episodes.find(function(e) {
        return parseInt(e.episode_number) === tE;
      });
      if (ep2) return ep2;
    }
  }
  var targetSeasonObj = seasons.find(function(s3) {
    return (parseInt(s3.season_number) || 1) === tS;
  }) || seasons[0];
  if (targetSeasonObj && Array.isArray(targetSeasonObj.episodes) && targetSeasonObj.episodes.length > 0) {
    return targetSeasonObj.episodes[0];
  }
  return null;
}
function resolveTauVideo(embedUrl) {
  return __async(this, null, function* () {
    try {
      var m = embedUrl.match(/tau-video\.xyz\/embed\/([a-zA-Z0-9_-]+)/i);
      if (!m) return [];
      var tauId = m[1];
      var res = yield fetch("https://tau-video.xyz/api/video/" + tauId, {
        headers: { "User-Agent": HEADERS["User-Agent"], "Referer": "https://animecix.tv/" },
        signal: timeoutSignal(7e3)
      });
      if (!res.ok) return [];
      var data = yield res.json();
      if (!data.urls || !data.urls.length) return [];
      var sHeaders = { "Referer": "https://tau-video.xyz/", "User-Agent": HEADERS["User-Agent"] };
      return data.urls.map(function(u) {
        var q = (u.label || "1080p").toLowerCase();
        return {
          name: "SeiCode",
          title: "\u231C SeiCode \u231F | TauVideo [" + q.toUpperCase() + " MP4]",
          url: u.url,
          quality: q,
          format: "mp4",
          isHls: false,
          headers: sHeaders,
          behaviorHints: {
            notWebReady: false,
            proxyHeaders: { request: sHeaders }
          }
        };
      });
    } catch (e) {
      return [];
    }
  });
}
function resolveOkRu(iframeUrl) {
  return __async(this, null, function* () {
    try {
      var fullUrl = iframeUrl.startsWith("//") ? "https:" + iframeUrl : iframeUrl;
      var res = yield fetch(fullUrl, { headers: { "User-Agent": HEADERS["User-Agent"] }, signal: timeoutSignal(7e3) });
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
      var streams = [];
      var nameMap = { "full": "1080p", "hd": "720p", "sd": "480p", "low": "360p", "lowest": "240p", "mobile": "240p" };
      var okHeaders = { "User-Agent": HEADERS["User-Agent"] };
      for (var i = 0; i < vids.length; i++) {
        var v = vids[i];
        if (!v.url) continue;
        var q = nameMap[v.name] || v.name || "720p";
        streams.push({
          name: "SeiCode",
          title: "\u231C SeiCode \u231F | Ok.ru [" + q.toUpperCase() + " MP4]",
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
      var hlsUrl = metadata.hlsManifestUrl || flashvars.hlsManifestUrl;
      if (hlsUrl) {
        streams.push({
          name: "SeiCode",
          title: "\u231C SeiCode \u231F | Ok.ru [1080p HLS Master]",
          url: hlsUrl,
          quality: "1080p",
          format: "hls",
          isHls: true,
          headers: okHeaders,
          behaviorHints: {
            notWebReady: false,
            proxyHeaders: { request: okHeaders }
          }
        });
      }
      return streams;
    } catch (e) {
      return [];
    }
  });
}
function resolveSibnet(iframeUrl) {
  return __async(this, null, function* () {
    try {
      var fullUrl = iframeUrl.startsWith("//") ? "https:" + iframeUrl : iframeUrl;
      var res = yield fetch(fullUrl, {
        headers: { "Referer": BASE_URL + "/", "User-Agent": HEADERS["User-Agent"] },
        signal: timeoutSignal(7e3)
      });
      if (!res.ok) return [];
      var html = yield res.text();
      var m = html.match(/player\.src\(\[\{src:\s*["']?([^"'\s>]+)/i);
      if (!m) return [];
      var videoPath = m[1];
      var videoUrl = videoPath.startsWith("http") ? videoPath : "https://video.sibnet.ru" + videoPath;
      var sibHeaders = {
        "Referer": "https://video.sibnet.ru/",
        "User-Agent": HEADERS["User-Agent"]
      };
      return [{
        name: "SeiCode",
        title: "\u231C SeiCode \u231F | Sibnet [1080p MP4]",
        url: videoUrl,
        quality: "1080p",
        format: "mp4",
        isHls: false,
        headers: sibHeaders,
        behaviorHints: {
          notWebReady: false,
          proxyHeaders: { request: sibHeaders }
        }
      }];
    } catch (e) {
      return [];
    }
  });
}
function resolveVidMoly(iframeUrl) {
  return __async(this, null, function* () {
    try {
      var fullUrl = iframeUrl.startsWith("//") ? "https:" + iframeUrl : iframeUrl;
      var mId = fullUrl.match(/vidmoly\.[a-z]+\/(?:v\/|embed-)?([a-zA-Z0-9]+)/i);
      if (mId) {
        fullUrl = "https://vidmoly.biz/embed-" + mId[1] + ".html";
      }
      var res = yield fetch(fullUrl, {
        headers: { "User-Agent": HEADERS["User-Agent"] },
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
        name: "SeiCode",
        title: "\u231C SeiCode \u231F | VidMoly [1080p HLS Master]",
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
function resolveMp4Upload(iframeUrl) {
  return __async(this, null, function* () {
    try {
      var fullUrl = iframeUrl.startsWith("//") ? "https:" + iframeUrl : iframeUrl;
      var mId = fullUrl.match(/mp4upload\.com\/(?:embed-)?([a-zA-Z0-9]+)/i);
      if (mId) {
        fullUrl = "https://www.mp4upload.com/embed-" + mId[1] + ".html";
      }
      var res = yield fetch(fullUrl, {
        headers: { "User-Agent": HEADERS["User-Agent"] },
        signal: timeoutSignal(7e3)
      });
      if (!res.ok) return [];
      var html = yield res.text();
      var m = html.match(/src:\s*["'](https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*)["']/i);
      if (!m) return [];
      var streamUrl = m[1];
      var sHeaders = {
        "User-Agent": HEADERS["User-Agent"],
        "Referer": "https://www.mp4upload.com/"
      };
      return [{
        name: "SeiCode",
        title: "\u231C SeiCode \u231F | MP4Upload [1080p MP4]",
        url: streamUrl,
        quality: "1080p",
        format: "mp4",
        isHls: false,
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
function fetchEpisodeStreams(videoLinks) {
  return __async(this, null, function* () {
    if (!videoLinks || typeof videoLinks !== "object") return [];
    var promises = [];
    for (var key in videoLinks) {
      if (!Object.prototype.hasOwnProperty.call(videoLinks, key)) continue;
      var rawUrl = videoLinks[key];
      if (!rawUrl || typeof rawUrl !== "string") continue;
      var url = rawUrl.trim();
      if (!url.startsWith("http") && !url.startsWith("//")) continue;
      var lowerUrl = url.toLowerCase();
      var lowerKey = key.toLowerCase();
      if (lowerKey === "tau-video.xyz" || lowerUrl.indexOf("tau-video.xyz/embed/") !== -1) {
        promises.push(resolveTauVideo(url));
      } else if (lowerKey === "okru" || lowerUrl.indexOf("ok.ru/videoembed/") !== -1) {
        promises.push(resolveOkRu(url));
      } else if (lowerKey === "sibnet" || lowerUrl.indexOf("video.sibnet.ru") !== -1) {
        promises.push(resolveSibnet(url));
      } else if (lowerKey.indexOf("vidmoly") !== -1 || lowerUrl.indexOf("vidmoly") !== -1) {
        promises.push(resolveVidMoly(url));
      } else if (lowerKey.indexOf("mp4upload") !== -1 || lowerUrl.indexOf("mp4upload") !== -1) {
        promises.push(resolveMp4Upload(url));
      }
    }
    var results = yield Promise.all(promises);
    var streams = [];
    for (var i = 0; i < results.length; i++) {
      var arr = results[i];
      if (Array.isArray(arr) && arr.length > 0) {
        streams = streams.concat(arr);
      }
    }
    return streams;
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      args = args || {};
      var extra = args.extra || {};
      var search = extra.search || "";
      var animes = [];
      if (search) {
        animes = yield searchSeicode(search);
      } else {
        var page = extra.skip ? Math.floor(extra.skip / 30) + 1 : 1;
        var url = API_BASE + "/anime?page=" + page;
        var res = yield fetch(url, { headers: HEADERS, signal: timeoutSignal(8e3) });
        if (res.ok) {
          var data = yield res.json();
          animes = data.animes || [];
        }
      }
      var metas = [];
      for (var i = 0; i < animes.length; i++) {
        var a = animes[i];
        if (!a || !a.slug) continue;
        var poster = a.pictures && (a.pictures.avatar || a.pictures.banner) || "";
        metas.push({
          id: "seicode:show:" + a.slug,
          type: "series",
          name: a.english || a.slug,
          poster,
          posterShape: "poster",
          description: a.summary || ""
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
      var rawId = typeof args === "object" && args !== null ? args.id : args;
      if (!rawId) return { meta: null };
      var slug = "";
      if (typeof rawId === "string") {
        if (rawId.indexOf("seicode:show:") === 0) {
          slug = rawId.replace("seicode:show:", "");
        } else if (rawId.indexOf("seicode:ep:") === 0) {
          var p = rawId.replace("seicode:ep:", "").split(":");
          slug = p[0];
        } else if (rawId.indexOf("seicode:") === 0) {
          slug = rawId.replace("seicode:", "");
        } else {
          slug = TMDB_MAP[rawId] || rawId;
        }
      }
      var data = yield fetchAnimeDetail(slug);
      if (!data) return { meta: null };
      var videos = [];
      if (Array.isArray(data.seasons)) {
        for (var s = 0; s < data.seasons.length; s++) {
          var sObj = data.seasons[s];
          var sNum = sObj.season_number || 1;
          if (Array.isArray(sObj.episodes)) {
            for (var e = 0; e < sObj.episodes.length; e++) {
              var epObj = sObj.episodes[e];
              var epNum = epObj.episode_number || e + 1;
              videos.push({
                id: "seicode:ep:" + slug + ":" + sNum + ":" + epNum,
                title: "S" + sNum + " B" + epNum,
                season: sNum,
                episode: epNum
              });
            }
          }
        }
      }
      return {
        meta: {
          id: "seicode:show:" + slug,
          type: "series",
          name: data.english || slug,
          poster: data.pictures && data.pictures.avatar || "",
          posterShape: "poster",
          background: data.pictures && data.pictures.banner || "",
          description: data.summary || "",
          genres: data.genres || [],
          videos
        }
      };
    } catch (e2) {
      return { meta: null };
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
      var finalSeason = parseInt(seasonNum) || 1;
      var finalEpisode = parseInt(episodeNum) || 1;
      var slug = null;
      if (typeof tmdbId === "string" && tmdbId.indexOf("seicode:ep:") === 0) {
        var epParts = tmdbId.replace("seicode:ep:", "").split(":");
        slug = epParts[0];
        if (epParts[1]) finalSeason = parseInt(epParts[1]) || finalSeason;
        if (epParts[2]) finalEpisode = parseInt(epParts[2]) || finalEpisode;
      }
      if (typeof tmdbId === "string" && tmdbId.indexOf("seicode:show:") === 0) {
        slug = tmdbId.replace("seicode:show:", "");
      }
      if (typeof tmdbId === "string" && tmdbId.indexOf(":") !== -1 && !slug) {
        var parts = tmdbId.split(":");
        if (parts.length >= 3) {
          var s = parseInt(parts[parts.length - 2]);
          var e = parseInt(parts[parts.length - 1]);
          if (!isNaN(s)) finalSeason = s;
          if (!isNaN(e)) finalEpisode = e;
        }
        tmdbId = parts[0];
      }
      if (!slug) {
        slug = yield resolveSlugFromTmdb(tmdbId, mediaType);
      }
      if (!slug) return [];
      var detail = yield fetchAnimeDetail(slug);
      if (!detail || !Array.isArray(detail.seasons) || !detail.seasons.length) return [];
      var ep = matchEpisode(detail.seasons, finalSeason, finalEpisode);
      if (!ep || !ep.video_links) return [];
      return yield fetchEpisodeStreams(ep.video_links);
    } catch (e2) {
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

