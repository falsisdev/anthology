/**
 * Anthology Provider: setfilmizle
 * Built from src/setfilmizle/index.js
 * Build: v1.8.44 (anthology build system)
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
      if (!s.url) return 1;
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

// src/shared/http.js
var require_http = __commonJS({
  "src/shared/http.js"(exports2, module2) {
    var DEFAULT_UA2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
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
    function fetchWithTimeout2(url, options, ms) {
      ms = ms || 1e4;
      options = options || {};
      if (!options.signal) {
        options.signal = timeoutSignal(ms);
      }
      if (!options.headers) {
        options.headers = {};
      }
      if (!options.headers["User-Agent"] && !options.headers["user-agent"]) {
        options.headers["User-Agent"] = DEFAULT_UA2;
      }
      return fetch(url, options);
    }
    module2.exports = {
      DEFAULT_UA: DEFAULT_UA2,
      timeoutSignal,
      fetchWithTimeout: fetchWithTimeout2
    };
  }
});

// src/shared/extractors.js
var require_extractors = __commonJS({
  "src/shared/extractors.js"(exports2, module2) {
    var { timeoutSignal } = require_http();
    var DEFAULT_UA2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    var EXOPLAYER_UA = "ExoPlayerLib/2.19.1";
    function decodeHtmlEntities(str) {
      if (!str) return "";
      return String(str).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0*39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, function(_, num) {
        var c = parseInt(num, 10);
        return isNaN(c) ? "" : String.fromCharCode(c);
      });
    }
    function normalizeUrl(rawUrl) {
      var t = String(rawUrl || "").trim();
      if (t.indexOf("//") === 0) return "https:" + t;
      return t;
    }
    function base64DecodeBytes(b64) {
      var std = String(b64 || "").trim().replace(/-/g, "+").replace(/_/g, "/");
      while (std.length % 4 !== 0) std += "=";
      var bin = "";
      if (typeof atob === "function") {
        try {
          bin = atob(std);
        } catch (e) {
          bin = "";
        }
      } else if (typeof Buffer !== "undefined") {
        try {
          bin = Buffer.from(std, "base64").toString("binary");
        } catch (e) {
          bin = "";
        }
      }
      var out = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 255;
      return out;
    }
    function base64DecodeString(b64) {
      var norm = String(b64 || "").replace(/\\\//g, "/").trim();
      if (typeof atob === "function") {
        try {
          return atob(norm);
        } catch (e) {
        }
      }
      if (typeof Buffer !== "undefined") {
        try {
          return Buffer.from(norm, "base64").toString("binary");
        } catch (e) {
        }
      }
      return "";
    }
    function buildNuvioStream2(opts) {
      var url = opts.url;
      var isHls = opts.isHls !== void 0 ? Boolean(opts.isHls) : opts.format === "hls" || url.indexOf(".m3u8") !== -1;
      var format = opts.format || (isHls ? "hls" : "mp4");
      var hdrs = Object.assign({ "User-Agent": DEFAULT_UA2 }, opts.headers || {});
      var stream = {
        name: opts.name || opts.sourceLabel || "Anthology",
        title: opts.title,
        url,
        quality: opts.quality || "1080p",
        type: format,
        format,
        isHls,
        provider: opts.provider || void 0,
        headers: hdrs,
        behaviorHints: {
          notWebReady: true,
          proxyHeaders: {
            request: hdrs
          }
        }
      };
      if (opts.subtitles && opts.subtitles.length > 0) {
        stream.subtitles = opts.subtitles;
      }
      return stream;
    }
    function extractInlineVttSubtitles(htmlText, headers) {
      var subs = [];
      var seen = {};
      var re = /https?:\/\/[^\s"'\\]+\.vtt(?:\?[^\s"'\\]*)?/gi;
      var m;
      while ((m = re.exec(htmlText || "")) !== null) {
        var uri = m[0];
        if (!uri || seen[uri] || /thumb|sprite/i.test(uri)) continue;
        seen[uri] = true;
        var isEn = /eng|_en[_.]|english/i.test(uri);
        subs.push({
          id: isEn ? "eng" : "tur",
          lang: isEn ? "eng" : "tur",
          language: isEn ? "en" : "tr",
          label: isEn ? "English" : "T\xFCrk\xE7e",
          url: uri,
          format: "vtt",
          headers: headers || void 0
        });
      }
      return subs;
    }
    var AES_SBOX = new Uint8Array([
      99,
      124,
      119,
      123,
      242,
      107,
      111,
      197,
      48,
      1,
      103,
      43,
      254,
      215,
      171,
      118,
      202,
      130,
      201,
      125,
      250,
      89,
      71,
      240,
      173,
      212,
      162,
      175,
      156,
      164,
      114,
      192,
      183,
      253,
      147,
      38,
      54,
      63,
      247,
      204,
      52,
      165,
      229,
      241,
      113,
      216,
      49,
      21,
      4,
      199,
      35,
      195,
      24,
      150,
      5,
      154,
      7,
      18,
      128,
      226,
      235,
      39,
      178,
      117,
      9,
      131,
      44,
      26,
      27,
      110,
      90,
      160,
      82,
      59,
      214,
      179,
      41,
      227,
      47,
      132,
      83,
      209,
      0,
      237,
      32,
      252,
      177,
      91,
      106,
      203,
      190,
      57,
      74,
      76,
      88,
      207,
      208,
      239,
      170,
      251,
      67,
      77,
      51,
      133,
      69,
      249,
      2,
      127,
      80,
      60,
      159,
      168,
      81,
      163,
      64,
      143,
      146,
      157,
      56,
      245,
      188,
      182,
      218,
      33,
      16,
      255,
      243,
      210,
      205,
      12,
      19,
      236,
      95,
      151,
      68,
      23,
      196,
      167,
      126,
      61,
      100,
      93,
      25,
      115,
      96,
      129,
      79,
      220,
      34,
      42,
      144,
      136,
      70,
      238,
      184,
      20,
      222,
      94,
      11,
      219,
      224,
      50,
      58,
      10,
      73,
      6,
      36,
      92,
      194,
      211,
      172,
      98,
      145,
      149,
      228,
      121,
      231,
      200,
      55,
      109,
      141,
      213,
      78,
      169,
      108,
      86,
      244,
      234,
      101,
      122,
      174,
      8,
      186,
      120,
      37,
      46,
      28,
      166,
      180,
      198,
      232,
      221,
      116,
      31,
      75,
      189,
      139,
      138,
      112,
      62,
      181,
      102,
      72,
      3,
      246,
      14,
      97,
      53,
      87,
      185,
      134,
      193,
      29,
      158,
      225,
      248,
      152,
      17,
      105,
      217,
      142,
      148,
      155,
      30,
      135,
      233,
      206,
      85,
      40,
      223,
      140,
      161,
      137,
      13,
      191,
      230,
      66,
      104,
      65,
      153,
      45,
      15,
      176,
      84,
      187,
      22
    ]);
    var AES_RCON = [1, 2, 4, 8, 16, 32, 64, 128];
    function xtime(x) {
      return (x << 1 ^ (x & 128 ? 27 : 0)) & 255;
    }
    function expandAes256Key(key) {
      var rk = new Uint8Array(240);
      rk.set(key.subarray(0, 32));
      var bg = 32, rci = 0;
      while (bg < 240) {
        var t0 = rk[bg - 4], t1 = rk[bg - 3], t2 = rk[bg - 2], t3 = rk[bg - 1];
        if (bg % 32 === 0) {
          var nt0 = AES_SBOX[t1] ^ AES_RCON[rci++];
          t1 = AES_SBOX[t2];
          t2 = AES_SBOX[t3];
          t3 = AES_SBOX[t0];
          t0 = nt0;
        } else if (bg % 32 === 16) {
          t0 = AES_SBOX[t0];
          t1 = AES_SBOX[t1];
          t2 = AES_SBOX[t2];
          t3 = AES_SBOX[t3];
        }
        rk[bg] = rk[bg - 32] ^ t0;
        rk[bg + 1] = rk[bg - 31] ^ t1;
        rk[bg + 2] = rk[bg - 30] ^ t2;
        rk[bg + 3] = rk[bg - 29] ^ t3;
        bg += 4;
      }
      return rk;
    }
    function aes256EncryptBlock(block, rk) {
      var s = new Uint8Array(16);
      var i, round, col, tmp;
      for (i = 0; i < 16; i++) s[i] = block[i] ^ rk[i];
      for (round = 1; round <= 14; round++) {
        for (i = 0; i < 16; i++) s[i] = AES_SBOX[s[i]];
        tmp = s[1];
        s[1] = s[5];
        s[5] = s[9];
        s[9] = s[13];
        s[13] = tmp;
        tmp = s[2];
        s[2] = s[10];
        s[10] = tmp;
        tmp = s[6];
        s[6] = s[14];
        s[14] = tmp;
        tmp = s[15];
        s[15] = s[11];
        s[11] = s[7];
        s[7] = s[3];
        s[3] = tmp;
        if (round < 14) {
          for (col = 0; col < 16; col += 4) {
            var a0 = s[col], a1 = s[col + 1], a2 = s[col + 2], a3 = s[col + 3];
            var t = a0 ^ a1 ^ a2 ^ a3;
            s[col] = a0 ^ t ^ xtime(a0 ^ a1);
            s[col + 1] = a1 ^ t ^ xtime(a1 ^ a2);
            s[col + 2] = a2 ^ t ^ xtime(a2 ^ a3);
            s[col + 3] = a3 ^ t ^ xtime(a3 ^ a0);
          }
        }
        var rOff = round * 16;
        for (i = 0; i < 16; i++) s[i] = s[i] ^ rk[rOff + i];
      }
      return s;
    }
    function gfMul128(x, y) {
      var z = new Uint8Array(16), v = new Uint8Array(y);
      for (var i = 0; i < 128; i++) {
        if (x[i >>> 3] >>> 7 - (i & 7) & 1) {
          for (var j = 0; j < 16; j++) z[j] ^= v[j];
        }
        var lsb = v[15] & 1;
        for (var j2 = 15; j2 > 0; j2--) v[j2] = v[j2] >>> 1 | (v[j2 - 1] & 1) << 7;
        v[0] = v[0] >>> 1;
        if (lsb) v[0] ^= 225;
      }
      return z;
    }
    function ghash(h, ct) {
      var y = new Uint8Array(16);
      for (var off = 0; off < ct.length; off += 16) {
        var end = Math.min(off + 16, ct.length);
        for (var i = off; i < end; i++) y[i - off] ^= ct[i];
        y = gfMul128(y, h);
      }
      var bitLen = ct.length * 8;
      var lenBlock = new Uint8Array(16);
      lenBlock[12] = bitLen >>> 24 & 255;
      lenBlock[13] = bitLen >>> 16 & 255;
      lenBlock[14] = bitLen >>> 8 & 255;
      lenBlock[15] = bitLen & 255;
      for (var k = 0; k < 16; k++) y[k] ^= lenBlock[k];
      return gfMul128(y, h);
    }
    function decodeUtf8(bytes) {
      if (typeof TextDecoder === "function") return new TextDecoder("utf-8").decode(bytes);
      var out = "";
      for (var i = 0; i < bytes.length; ) {
        var b0 = bytes[i++];
        if (b0 < 128) out += String.fromCharCode(b0);
        else if ((b0 & 224) === 192 && i < bytes.length) out += String.fromCharCode((b0 & 31) << 6 | bytes[i++] & 63);
        else if ((b0 & 240) === 224 && i + 1 < bytes.length) out += String.fromCharCode((b0 & 15) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63);
        else if ((b0 & 248) === 240 && i + 2 < bytes.length) {
          var cp = (b0 & 7) << 18 | (bytes[i++] & 63) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
          out += String.fromCodePoint(cp);
        }
      }
      return out;
    }
    function decryptAes256Gcm(key, iv, payloadWithTag) {
      if (key.length !== 32 || iv.length !== 12 || payloadWithTag.length < 16) return null;
      var rk = expandAes256Key(key);
      var cipherLen = payloadWithTag.length - 16;
      var ct = payloadWithTag.subarray(0, cipherLen);
      var tag = payloadWithTag.subarray(cipherLen);
      var j0 = new Uint8Array(16);
      j0.set(iv, 0);
      j0[15] = 1;
      var h = aes256EncryptBlock(new Uint8Array(16), rk);
      var tagMask = aes256EncryptBlock(j0, rk);
      var s = ghash(h, ct);
      var diff = 0;
      for (var i = 0; i < 16; i++) diff |= tagMask[i] ^ s[i] ^ tag[i];
      if (diff !== 0) return null;
      var ctr = new Uint8Array(j0);
      var plain = new Uint8Array(cipherLen);
      for (var off = 0; off < cipherLen; off += 16) {
        for (var c = 15; c >= 12; c--) {
          ctr[c] = ctr[c] + 1 & 255;
          if (ctr[c] !== 0) break;
        }
        var ks = aes256EncryptBlock(ctr, rk);
        var end = Math.min(off + 16, cipherLen);
        for (var j = off; j < end; j++) plain[j] = ct[j] ^ ks[j - off];
      }
      return decodeUtf8(plain);
    }
    function extractBysezo(rawUrl, opts) {
      return __async(this, null, function* () {
        opts = opts || {};
        var normalized = normalizeUrl(rawUrl);
        var origin = "https://bysezoxexe.com";
        var code = "";
        try {
          var parsed = new URL(normalized);
          origin = parsed.origin;
          var segs = parsed.pathname.split("/").filter(Boolean);
          code = segs[segs.length - 1] || "";
        } catch (e) {
          var m = /\/([a-zA-Z0-9_-]{8,24})(?:[?#]|$)/.exec(normalized);
          code = m ? m[1] : "";
        }
        if (!code) return [];
        if (origin.indexOf("filemoon.") !== -1) origin = "https://bysezoxexe.com";
        var videoData = null;
        try {
          var r1 = yield fetch(origin + "/api/videos/" + encodeURIComponent(code), {
            headers: { "User-Agent": DEFAULT_UA2, "Referer": normalized, "Accept": "application/json, text/plain, */*" },
            signal: timeoutSignal(9e3)
          });
          if (r1.ok) videoData = yield r1.json();
        } catch (e) {
        }
        if ((!videoData || (!videoData.sources || !videoData.sources.length) && !videoData.playback) && origin !== "https://bysezoxexe.com") {
          try {
            var dRes = yield fetch(origin + "/api/videos/" + encodeURIComponent(code) + "/details", {
              headers: { "User-Agent": DEFAULT_UA2, "Referer": normalized },
              signal: timeoutSignal(8e3)
            });
            if (dRes.ok) {
              var det = yield dRes.json();
              if (det && det.embed_frame_url) {
                var tOrig = new URL(det.embed_frame_url).origin;
                var r2 = yield fetch(tOrig + "/api/videos/" + encodeURIComponent(code), {
                  headers: { "User-Agent": DEFAULT_UA2, "Referer": det.embed_frame_url },
                  signal: timeoutSignal(9e3)
                });
                if (r2.ok) {
                  videoData = yield r2.json();
                  origin = tOrig;
                }
              }
            }
          } catch (e) {
          }
        }
        if (!videoData) return [];
        var sources = videoData.sources || [];
        var tracks = videoData.tracks || [];
        if (sources.length === 0 && videoData.playback) {
          try {
            var pb = videoData.playback;
            var parts = pb.key_parts || [];
            var vNum = Number(pb.version);
            var chosen = parts;
            if (!isNaN(vNum) && vNum >= 1 && vNum <= 20 && parts[vNum - 1] && parts[30 - vNum]) {
              chosen = [parts[vNum - 1], parts[30 - vNum]];
            }
            var decodedParts = chosen.map(base64DecodeBytes);
            var totalLen = decodedParts.reduce(function(a, b) {
              return a + b.length;
            }, 0);
            var key = new Uint8Array(totalLen);
            var off = 0;
            for (var pi = 0; pi < decodedParts.length; pi++) {
              key.set(decodedParts[pi], off);
              off += decodedParts[pi].length;
            }
            var plain = decryptAes256Gcm(key, base64DecodeBytes(pb.iv), base64DecodeBytes(pb.payload));
            if (plain) {
              var dec = JSON.parse(plain);
              if (dec && dec.sources) sources = dec.sources;
              if (dec && dec.tracks && tracks.length === 0) tracks = dec.tracks;
            }
          } catch (e) {
          }
        }
        if (!sources || sources.length === 0) return [];
        var sHdr = { "User-Agent": DEFAULT_UA2, "Referer": origin + "/" };
        var subs = [];
        for (var ti = 0; ti < tracks.length; ti++) {
          var t = tracks[ti];
          var subU = t.file || t.url;
          if (!subU) continue;
          var lc = String(t.lang || "tr").toLowerCase().slice(0, 2) || "tr";
          subs.push({ id: lc + "_" + subs.length, lang: lc === "en" ? "eng" : "tur", language: lc, label: t.label || (lc === "en" ? "English" : "T\xFCrk\xE7e"), url: subU, format: subU.indexOf(".srt") !== -1 ? "srt" : "vtt", headers: sHdr });
        }
        var prefix = opts.sourceLabel ? opts.sourceLabel + " \u2022 " : "";
        var audioTag = opts.audioType === "dub" ? "TR Dublaj" : opts.audioType === "sub" ? "TR Altyaz\u0131" : "FileMoon";
        var out = [];
        for (var si = 0; si < sources.length; si++) {
          var src = sources[si];
          if (!src.url || src.url.indexOf("http") !== 0) continue;
          var q = src.label || (src.height ? src.height + "p" : "1080p");
          var isHls = src.mime_type && src.mime_type.indexOf("mpegurl") !== -1 || src.url.indexOf(".m3u8") !== -1;
          out.push(buildNuvioStream2({
            name: opts.streamName || opts.sourceLabel || "Anthology",
            title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | " + audioTag + " \u2022 " + q + (isHls ? " HLS" : " MP4"),
            url: src.url,
            quality: q,
            format: isHls ? "hls" : "mp4",
            isHls,
            provider: opts.provider,
            headers: sHdr,
            subtitles: subs
          }));
        }
        return out;
      });
    }
    function extractVidmoly(rawUrl, opts) {
      return __async(this, null, function* () {
        opts = opts || {};
        var url = normalizeUrl(rawUrl);
        var idM = /(?:embed-|\/dl\/|\/)([a-zA-Z0-9]{8,20})(?:\.html)?/i.exec(url);
        var vidId = idM ? idM[1] : null;
        var candidates = [];
        if (url.indexOf("vidmoly") !== -1 && vidId && url.indexOf("embed-") === -1) {
          candidates.push("https://vidmoly.biz/embed-" + vidId + ".html");
        } else {
          candidates.push(url);
        }
        if (vidId) {
          ["vidmoly.biz", "vidmoly.net", "vidmoly.to"].forEach(function(h) {
            var u = "https://" + h + "/embed-" + vidId + ".html";
            if (candidates.indexOf(u) === -1) candidates.push(u);
          });
        }
        for (var i = 0; i < candidates.length; i++) {
          var cand = candidates[i];
          var origin = "https://vidmoly.biz";
          try {
            origin = new URL(cand).origin;
          } catch (e) {
          }
          try {
            var r = yield fetch(cand, {
              headers: { "User-Agent": DEFAULT_UA2, "Referer": opts.referer || origin + "/" },
              signal: timeoutSignal(1e4)
            });
            if (!r.ok) continue;
            var html = yield r.text();
            var fm = /file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i.exec(html) || /sources\s*:\s*\[\s*\{\s*file\s*:\s*["'](https?:\/\/[^"']+)["']/i.exec(html);
            if (!fm || !fm[1]) continue;
            var tag = opts.audioType === "dub" ? "\u{1F1F9}\u{1F1F7} TR Dublaj" : opts.audioType === "sub" ? "\u{1F310} TR Altyaz\u0131" : "VidMoly";
            return [buildNuvioStream2({
              name: opts.streamName || opts.sourceLabel || "Anthology",
              title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | VidMoly | " + tag,
              url: fm[1],
              quality: "1080p",
              format: "hls",
              isHls: true,
              provider: opts.provider,
              headers: { "User-Agent": DEFAULT_UA2, "Referer": origin + "/" },
              subtitles: extractInlineVttSubtitles(html, { "User-Agent": DEFAULT_UA2, "Referer": origin + "/" })
            })];
          } catch (e) {
          }
        }
        return [];
      });
    }
    function extractOkRu(rawUrl, opts) {
      return __async(this, null, function* () {
        opts = opts || {};
        var url = normalizeUrl(rawUrl).replace("odnoklassniki.ru/", "ok.ru/");
        try {
          var r = yield fetch(url, {
            headers: { "User-Agent": DEFAULT_UA2, "Referer": opts.referer || "https://ok.ru/" },
            signal: timeoutSignal(1e4)
          });
          if (!r.ok) return [];
          var html = yield r.text();
          var m = /data-options=["']([^"']+)["']/i.exec(html);
          if (!m) return [];
          var outer = JSON.parse(decodeHtmlEntities(m[1]));
          var rawMeta = outer && outer.flashvars && outer.flashvars.metadata;
          var meta = typeof rawMeta === "string" ? JSON.parse(rawMeta) : rawMeta;
          if (!meta) return [];
          var qMap = { ultra: "2160p", quad: "1440p", full: "1080p", hd: "720p", sd: "480p", low: "360p", lowest: "240p" };
          var hdrs = { "User-Agent": DEFAULT_UA2, "Referer": "https://ok.ru/" };
          var out = [];
          var tag = opts.audioType === "dub" ? "\u{1F1F9}\u{1F1F7} TR Dublaj" : opts.audioType === "sub" ? "\u{1F310} TR Altyaz\u0131" : "OK.ru";
          (meta.videos || []).forEach(function(v) {
            if (!v.url) return;
            var q = qMap[String(v.name || "").toLowerCase()] || "720p";
            out.push(buildNuvioStream2({
              name: opts.streamName || opts.sourceLabel || "Anthology",
              title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | OK.ru " + q + " | " + tag,
              url: v.url,
              quality: q,
              format: "mp4",
              isHls: false,
              provider: opts.provider,
              headers: hdrs
            }));
          });
          var hlsUrl = meta.hlsMasterPlaylistUrl || meta.hlsManifestUrl;
          if (hlsUrl) {
            out.push(buildNuvioStream2({
              name: opts.streamName || opts.sourceLabel || "Anthology",
              title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | OK.ru HLS | " + tag,
              url: hlsUrl,
              quality: "1080p",
              format: "hls",
              isHls: true,
              provider: opts.provider,
              headers: hdrs
            }));
          }
          return out;
        } catch (e) {
          return [];
        }
      });
    }
    function extractSibnet(rawUrl, opts) {
      return __async(this, null, function* () {
        opts = opts || {};
        var url = normalizeUrl(rawUrl);
        var vm = /videoid=(\d+)/i.exec(url);
        if (vm) url = "https://video.sibnet.ru/shell.php?videoid=" + vm[1];
        try {
          var r = yield fetch(url, {
            headers: { "User-Agent": DEFAULT_UA2, "Referer": opts.referer || "https://video.sibnet.ru/" },
            signal: timeoutSignal(1e4)
          });
          if (!r.ok) return [];
          var html = yield r.text();
          var m = /player\.src\(\[\s*\{\s*src\s*:\s*["']([^"']+)["']/i.exec(html);
          if (!m || !m[1]) return [];
          var src = m[1].indexOf("http") === 0 ? m[1] : "https://video.sibnet.ru" + (m[1].charAt(0) === "/" ? "" : "/") + m[1];
          var tag = opts.audioType === "dub" ? "\u{1F1F9}\u{1F1F7} TR Dublaj" : opts.audioType === "sub" ? "\u{1F310} TR Altyaz\u0131" : "Sibnet";
          return [buildNuvioStream2({
            name: opts.streamName || opts.sourceLabel || "Anthology",
            title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | Sibnet MP4 | " + tag,
            url: src,
            quality: "720p",
            format: "mp4",
            isHls: false,
            provider: opts.provider,
            headers: { "User-Agent": DEFAULT_UA2, "Referer": "https://video.sibnet.ru/" }
          })];
        } catch (e) {
          return [];
        }
      });
    }
    function extractVixolity2(opts) {
      return __async(this, null, function* () {
        opts = opts || {};
        var imdbId = opts.imdbId;
        if (!imdbId || imdbId.indexOf("tt") !== 0) return [];
        var base = (opts.baseUrl || "https://ha.vixolity.com").replace(/\/+$/, "");
        var targetUrl = opts.season !== void 0 && opts.episode !== void 0 ? base + "/vs/" + imdbId + "/s" + opts.season + "/e" + (opts.episode < 10 ? "0" + opts.episode : opts.episode) : base + "/vs/" + imdbId;
        var vixHeaders = {
          "User-Agent": DEFAULT_UA2,
          "Referer": "https://pl.vixolity.com/",
          "Origin": "https://pl.vixolity.com",
          "Accept": "*/*"
        };
        try {
          var r = yield fetch(targetUrl, { headers: vixHeaders, signal: timeoutSignal(7e3) });
          if (!r.ok) return [];
          var text = yield r.text();
          if (!text || text.indexOf("#EXTM3U") === -1) return [];
          var subs = [];
          var subRe = /#EXT-X-MEDIA:TYPE=SUBTITLES.*?NAME="([^"]+)".*?LANGUAGE="([^"]+)".*?URI="([^"]+)"/gi;
          var sm, seenSub = {};
          while ((sm = subRe.exec(text)) !== null) {
            if (seenSub[sm[3]]) continue;
            seenSub[sm[3]] = true;
            var lc = String(sm[2] || "tr").toLowerCase();
            subs.push({ id: lc, lang: lc === "tr" ? "tur" : lc === "en" ? "eng" : lc, language: lc, label: sm[1], url: sm[3], format: "vtt", headers: vixHeaders });
          }
          var hasTr = /LANGUAGE="tr"|NAME="[^"]*Türk/i.test(text);
          var tag = hasTr ? "\xC7ift Ses (TR & Orijinal)" : "1080p HLS";
          return [buildNuvioStream2({
            name: opts.streamName || opts.sourceLabel || "Anthology",
            title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | Vixolity \u2022 " + tag + " (1080p HLS)",
            url: targetUrl,
            quality: "1080p",
            format: "hls",
            isHls: true,
            provider: opts.provider,
            headers: vixHeaders,
            subtitles: subs
          })];
        } catch (e) {
          return [];
        }
      });
    }
    function extractPilavyer(opts) {
      return __async(this, null, function* () {
        opts = opts || {};
        var host = (opts.playerHost || "https://play2.pilavyerplay.top").replace(/\/+$/, "");
        var scriptUrl = "";
        if (opts.pvId) {
          scriptUrl = host + "/assets/js/s.php?s=" + encodeURIComponent(opts.pvId);
        } else if (opts.playerUrl) {
          var pu = normalizeUrl(opts.playerUrl);
          try {
            var er = yield fetch(pu, { headers: { "User-Agent": DEFAULT_UA2, "Referer": opts.referer || pu }, signal: timeoutSignal(1e4) });
            if (er.ok) {
              var eh = yield er.text();
              var sm = /src=["']([^"']*assets\/js\/s\.php\?[^"']+)["']/i.exec(eh) || /\?s=([a-zA-Z0-9_-]+)/.exec(pu);
              if (sm && sm[1]) {
                var orig = new URL(pu).origin;
                scriptUrl = sm[1].indexOf("http") === 0 ? sm[1] : sm[1].indexOf("s.php") !== -1 ? orig + (sm[1].charAt(0) === "/" ? "" : "/") + sm[1] : orig + "/assets/js/s.php?s=" + encodeURIComponent(sm[1]);
              }
            }
          } catch (e) {
          }
        }
        if (!scriptUrl) return [];
        try {
          var scriptOrig = new URL(scriptUrl).origin;
          var jsRes = yield fetch(scriptUrl, { headers: { "User-Agent": DEFAULT_UA2, "Referer": opts.referer || scriptOrig + "/" }, signal: timeoutSignal(1e4) });
          if (!jsRes.ok) return [];
          var jsText = yield jsRes.text();
          var jm = /window\.__PLAYER__\s*=\s*(\{[\s\S]*?\});/.exec(jsText);
          if (!jm) return [];
          var payload = JSON.parse(jm[1]);
          if (!payload || !payload.stream) return [];
          var sHdr = { "User-Agent": DEFAULT_UA2, "Referer": scriptOrig + "/", "Origin": scriptOrig };
          var cleanUrl = String(payload.stream).replace(/[?&]cdn=\d+/i, "").replace(/#.*$/, "");
          var finalUrl = cleanUrl + (cleanUrl.indexOf("?") !== -1 ? "&" : "?") + "ext=.m3u8";
          var subs = [];
          (payload.subs || []).forEach(function(sub) {
            if (!sub || !sub.src) return;
            var su = sub.src.indexOf("http") === 0 ? sub.src : scriptOrig + (sub.src.charAt(0) === "/" ? "" : "/") + sub.src;
            var isTr = String(sub.lang || "").toLowerCase() === "tr" || /türkçe|tur/i.test(sub.label || "");
            subs.push({ id: sub.sid || (isTr ? "tur" : "eng"), lang: isTr ? "tur" : "eng", language: isTr ? "tr" : "en", label: sub.label || (isTr ? "T\xFCrk\xE7e" : "English"), url: su, format: "vtt", headers: sHdr });
          });
          var audios = Array.isArray(payload.audios) && payload.audios.length > 0 ? payload.audios : [{ label: "Orijinal" }];
          var audioTag = "Orijinal (TR Altyaz\u0131l\u0131)";
          if (audios.length > 1) {
            var hasTr = audios.some(function(a) {
              return /t[üu]rk[çc]e|\btr\b/i.test(a.label || a.name || "");
            });
            audioTag = hasTr ? "\xC7ift Ses (TR Dublaj & Orijinal)" : "\xC7oklu Ses";
          } else if (/t[üu]rk[çc]e|\btr\b/i.test(audios[0].label || audios[0].name || "")) {
            audioTag = "T\xFCrk\xE7e Dublaj";
          }
          return [buildNuvioStream2({
            name: opts.streamName || opts.sourceLabel || "Anthology",
            title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | " + audioTag + " \u2022 1080p FHD",
            url: finalUrl,
            quality: "1080p",
            format: "hls",
            isHls: true,
            provider: opts.provider,
            headers: sHdr,
            subtitles: subs
          })];
        } catch (e) {
          return [];
        }
      });
    }
    function extractMailRu(rawUrl, opts) {
      return __async(this, null, function* () {
        opts = opts || {};
        var url = normalizeUrl(rawUrl);
        var vm = /\/embed\/(\d+)/.exec(url) || /meta\/(\d+)/.exec(url);
        var metaUrl = vm ? "https://my.mail.ru/+/video/meta/" + vm[1] : "";
        var ref = url.indexOf("http") === 0 ? url : "https://my.mail.ru/";
        try {
          if (!metaUrl) {
            var r = yield fetch(url, { headers: { "User-Agent": DEFAULT_UA2, "Referer": opts.referer || "https://my.mail.ru/" }, signal: timeoutSignal(8e3) });
            if (r.ok) {
              var h = yield r.text();
              var mm = /metadataUrl["']?\s*:\s*["']([^"']+)["']/.exec(h) || /(\/+\/my\.mail\.ru\/\+\/video\/meta\/[^"'\s]+)/.exec(h);
              if (mm) metaUrl = normalizeUrl(mm[1]);
            }
          }
          if (!metaUrl) return [];
          var mr = yield fetch(metaUrl, { headers: { "User-Agent": DEFAULT_UA2, "Referer": ref }, signal: timeoutSignal(8e3) });
          if (!mr.ok) return [];
          var data = yield mr.json();
          var out = [];
          (data.videos || []).forEach(function(v) {
            if (!v.url) return;
            var q = v.key || "720p";
            out.push(buildNuvioStream2({
              name: opts.streamName || opts.sourceLabel || "Anthology",
              title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | Mail.ru " + q.toUpperCase(),
              url: normalizeUrl(v.url),
              quality: q,
              format: "mp4",
              isHls: false,
              provider: opts.provider,
              headers: { "User-Agent": DEFAULT_UA2, "Referer": ref }
            }));
          });
          return out;
        } catch (e) {
          return [];
        }
      });
    }
    function spgDecode2(encodedB64, keyB64) {
      try {
        var a = base64DecodeString(encodedB64);
        var b = base64DecodeString(keyB64);
        if (!a || !b) return null;
        var s = "";
        for (var i = 0; i < a.length; i++) {
          s += String.fromCharCode(a.charCodeAt(i) ^ b.charCodeAt(i % b.length));
        }
        return s.split("|")[0];
      } catch (e) {
        return null;
      }
    }
    function extractFastplay(rawUrl, opts) {
      return __async(this, null, function* () {
        opts = opts || {};
        var url = normalizeUrl(rawUrl);
        try {
          var fpOrig = new URL(url).origin;
          var res = yield fetch(url, {
            headers: { "User-Agent": DEFAULT_UA2, "Referer": opts.referer || fpOrig + "/" },
            signal: timeoutSignal(12e3)
          });
          if (!res.ok) return [];
          var fpHtml = yield res.text();
          var manMatch = /(?:src|stream)\s*:\s*["'](\/manifests\/[^"']+)["']/.exec(fpHtml);
          if (!manMatch) return [];
          var manPath = manMatch[1].replace(/&amp;/g, "&");
          var manifestUrl = manPath.indexOf("http") === 0 ? manPath : fpOrig + manPath;
          var subs = extractInlineVttSubtitles(fpHtml, { "User-Agent": DEFAULT_UA2, "Referer": fpOrig + "/" });
          var fpHdrs = { "User-Agent": EXOPLAYER_UA, "Referer": fpOrig + "/", "Origin": fpOrig };
          return [buildNuvioStream2({
            name: opts.streamName || opts.sourceLabel || "Anthology",
            title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | FastPlay (1080p HLS)",
            url: manifestUrl,
            quality: "1080p",
            format: "hls",
            isHls: true,
            provider: opts.provider,
            headers: fpHdrs,
            subtitles: subs
          })];
        } catch (e) {
          return [];
        }
      });
    }
    function extractSetplay(rawUrl, opts) {
      return __async(this, null, function* () {
        opts = opts || {};
        var url = normalizeUrl(rawUrl);
        try {
          var spOrig = new URL(url).origin;
          var res = yield fetch(url, {
            headers: { "User-Agent": DEFAULT_UA2, "Referer": opts.referer || spOrig + "/" },
            signal: timeoutSignal(12e3)
          });
          if (!res.ok) return [];
          var spHtml = yield res.text();
          var cerMatch = /SPG\.cerceve\(\s*["'][^"']*["']\s*,\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/.exec(spHtml) || /SPG\.cerceve\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/.exec(spHtml);
          var fastplayUrl = cerMatch ? spgDecode2(cerMatch[1], cerMatch[2]) : null;
          if (!fastplayUrl) {
            var fMatch = /https?:\/\/fastplay\.[a-z]+\/stfplay\.php\?[^"'<>\s\\]+/i.exec(spHtml);
            if (fMatch) fastplayUrl = fMatch[0].replace(/\\+/g, "");
          }
          if (!fastplayUrl || fastplayUrl.indexOf("http") !== 0) return [];
          return yield extractFastplay(fastplayUrl, Object.assign({}, opts, { referer: res.url || url }));
        } catch (e) {
          return [];
        }
      });
    }
    function extractByEmbedUrl2(rawUrl, opts) {
      return __async(this, null, function* () {
        opts = opts || {};
        var url = normalizeUrl(rawUrl);
        var lower = url.toLowerCase();
        if (lower.indexOf("setplay.") !== -1) return extractSetplay(url, opts);
        if (lower.indexOf("fastplay.") !== -1) return extractFastplay(url, opts);
        if (lower.indexOf("vidmoly.") !== -1) return extractVidmoly(url, opts);
        if (lower.indexOf("ok.ru") !== -1 || lower.indexOf("odnoklassniki.ru") !== -1) return extractOkRu(url, opts);
        if (lower.indexOf("sibnet.ru") !== -1) return extractSibnet(url, opts);
        if (lower.indexOf("bysezo") !== -1 || lower.indexOf("filemoon.") !== -1 || lower.indexOf("n1mwq.org") !== -1) return extractBysezo(url, opts);
        if (lower.indexOf("pilavyer") !== -1) return extractPilavyer(Object.assign({}, opts, { playerUrl: url }));
        if (lower.indexOf("mail.ru") !== -1) return extractMailRu(url, opts);
        return [];
      });
    }
    module2.exports = {
      DEFAULT_UA: DEFAULT_UA2,
      EXOPLAYER_UA,
      decodeHtmlEntities,
      base64DecodeString,
      buildNuvioStream: buildNuvioStream2,
      extractInlineVttSubtitles,
      extractBysezo,
      extractVidmoly,
      extractOkRu,
      extractSibnet,
      extractVixolity: extractVixolity2,
      extractPilavyer,
      extractMailRu,
      extractFastplay,
      extractSetplay,
      extractByEmbedUrl: extractByEmbedUrl2
    };
  }
});

// src/setfilmizle/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var { extractByEmbedUrl, extractVixolity, buildNuvioStream, DEFAULT_UA } = require_extractors();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.movies.setfilmizle.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var BASE_URL = "https://www.setfilmizle.ltd";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "Referer": BASE_URL + "/"
};
function ultraClean(str) {
  if (!str) return "";
  return str.toString().toLowerCase().replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[^a-z0-9]/g, "").trim();
}
function fetchWithTimeout(url, options, ms) {
  var opts = options || {};
  try {
    if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) {
      opts.signal = AbortSignal.timeout(ms || 15e3);
    }
  } catch (e) {
  }
  return fetch(url, opts);
}
function resolveTmdbInfo(id, mediaType2) {
  return __async(this, null, function* () {
    try {
      var cleanId = String(id || "").trim();
      if (cleanId.includes(":")) cleanId = cleanId.split(":")[0];
      var numericId = null;
      var title = "";
      var origTitle = "";
      var imdbId = "";
      if (cleanId.startsWith("tt")) {
        imdbId = cleanId;
        var findRes = yield fetchWithTimeout("https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_API_KEY + "&external_source=imdb_id", {}, 1e4);
        if (findRes.ok) {
          var fd = yield findRes.json();
          var match = mediaType2 === "tv" || mediaType2 === "series" ? fd.tv_results && fd.tv_results[0] : fd.movie_results && fd.movie_results[0];
          if (!match) match = fd.movie_results && fd.movie_results[0] || fd.tv_results && fd.tv_results[0];
          if (match) {
            title = match.name || match.title || "";
            origTitle = match.original_name || match.original_title || "";
            numericId = match.id;
          }
        }
      } else {
        numericId = cleanId;
        var type = mediaType2 === "tv" || mediaType2 === "series" ? "tv" : "movie";
        var tRes = yield fetchWithTimeout("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR&append_to_response=external_ids", {}, 1e4);
        if (tRes.ok) {
          var td = yield tRes.json();
          title = td.name || td.title || "";
          origTitle = td.original_name || td.original_title || "";
          imdbId = td.imdb_id || td.external_ids && td.external_ids.imdb_id || "";
        }
      }
      return { title, origTitle, numericId, imdbId };
    } catch (e) {
      return { title: "", origTitle: "", numericId: id };
    }
  });
}
function absUrl(href) {
  if (!href) return null;
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return "https:" + href;
  if (href.startsWith("/")) return BASE_URL + href;
  return BASE_URL + "/" + href;
}
function parseCards(html) {
  var out = [];
  var seen = /* @__PURE__ */ new Set();
  var re = /<a[^>]+class="[^"]*card-link[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  var m;
  while ((m = re.exec(html)) !== null) {
    var href = absUrl(m[1]);
    var inner = m[2];
    if (!href || seen.has(href)) continue;
    var titleMatch = inner.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i);
    var imgMatch = inner.match(/<img[^>]+(?:alt="([^"]*)")?[^>]*>/i);
    var srcMatch = inner.match(/<img[^>]+(?:src|data-src)="([^"]+)"/i);
    var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : imgMatch && imgMatch[1] ? imgMatch[1].trim() : "";
    if (!title) continue;
    seen.add(href);
    out.push({
      title,
      href,
      poster: srcMatch ? absUrl(srcMatch[1]) : "",
      isTv: href.includes("/dizi/")
    });
  }
  return out;
}
function searchSite(query) {
  return __async(this, null, function* () {
    try {
      var res = yield fetchWithTimeout(BASE_URL + "/?s=" + encodeURIComponent(query), { headers: HEADERS }, 15e3);
      if (!res.ok) return [];
      var html = yield res.text();
      return parseCards(html);
    } catch (e) {
      if (info.imdbId && !(mediaType === "tv" || mediaType === "series")) {
        var vixFallback = yield extractVixolity({ imdbId: info.imdbId, sourceLabel: "SetFilm\u0130zle", provider: "setfilmizle" });
        if (vixFallback.length > 0) return vixFallback;
      }
      return [];
    }
  });
}
function pickBest(cards, title) {
  if (!cards || cards.length === 0) return null;
  var cleanTarget = ultraClean(title);
  for (var i = 0; i < cards.length; i++) {
    if (ultraClean(cards[i].title) === cleanTarget) return cards[i];
  }
  for (var j = 0; j < cards.length; j++) {
    var c = ultraClean(cards[j].title);
    if (c.includes(cleanTarget) || cleanTarget.includes(c)) return cards[j];
  }
  return cards[0];
}
function spgDecode(n, o) {
  try {
    var a, b;
    if (typeof Buffer !== "undefined") {
      a = Buffer.from(n, "base64").toString("binary");
      b = Buffer.from(o, "base64").toString("binary");
    } else if (typeof atob === "function") {
      a = atob(n);
      b = atob(o);
    } else {
      return null;
    }
    var s = "";
    for (var i = 0; i < a.length; i++) {
      s += String.fromCharCode(a.charCodeAt(i) ^ b.charCodeAt(i % b.length));
    }
    return s.split("|")[0];
  } catch (e) {
    return null;
  }
}
function resolveFastplay(fastplayUrl, fastplayRef) {
  return __async(this, null, function* () {
    try {
      var fpRes = yield fetchWithTimeout(fastplayUrl, {
        headers: { "User-Agent": HEADERS["User-Agent"], "Referer": fastplayRef || BASE_URL + "/" }
      }, 15e3);
      if (!fpRes.ok) return null;
      var fpHtml = yield fpRes.text();
      var spMatch = fpHtml.match(/"sp"\s*:\s*"([^"]+)"/);
      var spTMatch = fpHtml.match(/"spT"\s*:\s*(\d+)/);
      var manMatch = fpHtml.match(/(?:src|stream)\s*:\s*"(\/manifests\/[^"]+)"/);
      if (!manMatch) return null;
      var sp = spMatch ? spMatch[1] : "";
      var spT = spTMatch ? spTMatch[1] : 0;
      var manPath = manMatch[1].replace(/&amp;/g, "&");
      var fpOrigin = fastplayUrl.match(/^(https?:\/\/[^/]+)/)[1];
      var manifestUrl = manPath.startsWith("http") ? manPath : fpOrigin + manPath;
      var subs = [];
      var subMatch = fpHtml.match(/subtitles\s*:\s*(\[[\s\S]*?\])/);
      if (subMatch) {
        try {
          var arr = JSON.parse(subMatch[1]);
          for (var si = 0; si < arr.length; si++) {
            var item = arr[si];
            if (item && item.file && item.file.indexOf(".vtt") !== -1) {
              var lCode = item.lang === "tur" ? "tr" : item.lang === "eng" ? "en" : item.lang || "tr";
              subs.push({
                id: item.lang || "sub_" + si,
                url: item.file,
                file: item.file,
                link: item.file,
                lang: item.lang || "tur",
                language: lCode,
                label: item.label || (lCode === "tr" ? "T\xFCrk\xE7e" : "English"),
                name: item.label || (lCode === "tr" ? "T\xFCrk\xE7e" : "English"),
                title: item.label || (lCode === "tr" ? "T\xFCrk\xE7e" : "English"),
                format: "vtt",
                type: "text/vtt",
                mimeType: "text/vtt"
              });
            }
          }
        } catch (e) {
        }
      }
      if (subs.length === 0) {
        var subRe = /"file"\s*:\s*"(https?:[^"]+\.vtt)"\s*,\s*"label"\s*:\s*"([^"]+)"\s*,\s*"lang"\s*:\s*"([^"]+)"/gi;
        var sm;
        while ((sm = subRe.exec(fpHtml)) !== null) {
          var langCode = sm[3] === "tur" ? "tr" : sm[3] === "eng" ? "en" : sm[3];
          subs.push({
            id: sm[3],
            url: sm[1].replace(/\\\//g, "/"),
            file: sm[1].replace(/\\\//g, "/"),
            link: sm[1].replace(/\\\//g, "/"),
            lang: sm[3],
            language: langCode,
            label: sm[2],
            name: sm[2],
            title: sm[2],
            format: "vtt",
            type: "text/vtt",
            mimeType: "text/vtt"
          });
        }
      }
      return { manifestUrl, sp, spT, subtitles: subs, referer: fpRes.url || fastplayUrl };
    } catch (e) {
      return null;
    }
  });
}
function extractStreamsFromContentPage(pageUrl) {
  return __async(this, null, function* () {
    var streams = [];
    try {
      let addPlayer2 = function(pid, pname, pkey) {
        if (!pid || !pname || pid.includes("event")) return;
        var k = pid + "|" + pname + "|" + (pkey || "");
        if (seenP.has(k)) return;
        seenP.add(k);
        players.push({ id: pid, name: pname, key: pkey || "" });
      };
      var addPlayer = addPlayer2;
      var res = yield fetchWithTimeout(pageUrl, { headers: HEADERS }, 15e3);
      if (!res.ok) return [];
      var html = yield res.text();
      var ajaxMatch = html.match(/window\.STF_AJAX\s*=\s*\{[^}]*url\s*:\s*"([^"]+)"[^}]*nonces\s*:\s*\{[^}]*video\s*:\s*"([^"]+)"/);
      var ajaxUrl = ajaxMatch ? ajaxMatch[1] : BASE_URL + "/wp-admin/admin-ajax.php";
      var videoNonce = ajaxMatch ? ajaxMatch[2] : "";
      var players = [];
      var seenP = /* @__PURE__ */ new Set();
      var playerRe = /data-post-id="([^"]+)"[^>]*data-player-name="([^"]+)"[^>]*data-part-key="([^"]*)"/gi;
      var pm;
      while ((pm = playerRe.exec(html)) !== null) {
        addPlayer2(pm[1], pm[2], pm[3]);
      }
      if (players.length === 0) {
        var postIds = [];
        var piRe = /data-post-id="([^"]+)"/gi;
        var pim;
        while ((pim = piRe.exec(html)) !== null) {
          if (pim[1] && !pim[1].includes("event") && postIds.indexOf(pim[1]) === -1) postIds.push(pim[1]);
        }
        var btnRe = /data-player-name="([^"]+)"[^>]*data-part-key="([^"]*)"/gi;
        var bm;
        var btns = [];
        while ((bm = btnRe.exec(html)) !== null) {
          btns.push({ name: bm[1], key: bm[2] || "" });
        }
        if (btns.length === 0) {
          var nameOnly = /data-player-name="([^"]+)"/gi;
          var nm;
          while ((nm = nameOnly.exec(html)) !== null) {
            btns.push({ name: nm[1], key: "" });
          }
        }
        postIds.forEach(function(pid) {
          btns.forEach(function(b) {
            addPlayer2(pid, b.name, b.key);
          });
        });
      }
      if (players.length === 0) return [];
      var nonces = [];
      if (videoNonce) nonces.push(videoNonce);
      var nonceMatches = [...html.matchAll(/data-nonce="([a-z0-9]+)"/gi)].map(function(m) {
        return m[1];
      });
      for (var ni = 0; ni < nonceMatches.length; ni++) {
        if (nonces.indexOf(nonceMatches[ni]) === -1) nonces.push(nonceMatches[ni]);
      }
      if (nonces.length === 0) return [];
      var seenUrls = /* @__PURE__ */ new Set();
      for (var i = 0; i < Math.min(players.length, 4); i++) {
        var gotStreamForPlayer = false;
        for (var nIdx = 0; nIdx < nonces.length && !gotStreamForPlayer; nIdx++) {
          try {
            var pl = players[i];
            var form = new URLSearchParams();
            form.append("action", "get_video_url");
            form.append("nonce", nonces[nIdx]);
            form.append("post_id", pl.id);
            form.append("player_name", pl.name);
            form.append("part_key", pl.key);
            var aRes = yield fetchWithTimeout(ajaxUrl, {
              method: "POST",
              headers: {
                "User-Agent": HEADERS["User-Agent"],
                "Referer": pageUrl,
                "Origin": BASE_URL,
                "X-Requested-With": "XMLHttpRequest",
                "Content-Type": "application/x-www-form-urlencoded"
              },
              body: form.toString()
            }, 15e3);
            if (!aRes.ok) continue;
            var aj = yield aRes.json();
            if (!aj || aj.success === false) continue;
            var setplayUrl = aj && aj.data && (aj.data.stream && aj.data.stream.url || aj.data.url);
            if (!setplayUrl) continue;
            setplayUrl = setplayUrl.replace(/\\\//g, "/");
            if (seenUrls.has(setplayUrl)) {
              gotStreamForPlayer = true;
              continue;
            }
            seenUrls.add(setplayUrl);
            var spRes = yield fetchWithTimeout(setplayUrl, {
              headers: { "User-Agent": HEADERS["User-Agent"], "Referer": pageUrl }
            }, 15e3);
            if (!spRes.ok) continue;
            var spHtml = yield spRes.text();
            var cerMatch = spHtml.match(/SPG\.cerceve\(\s*"[^"]*"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/) || spHtml.match(/SPG\.cerceve\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/);
            var fastplayUrl = null;
            if (cerMatch && cerMatch[1] && cerMatch[2]) {
              fastplayUrl = spgDecode(cerMatch[1], cerMatch[2]);
            }
            if (!fastplayUrl) {
              var fMatch = spHtml.match(/https?:\/\/fastplay\.[a-z]+\/stfplay\.php\?[^"'<>\s\\]+/i);
              if (fMatch) fastplayUrl = fMatch[0].replace(/\\+/g, "");
            }
            if (!fastplayUrl || !fastplayUrl.startsWith("http")) {
              var extStreams = yield extractByEmbedUrl(setplayUrl, { sourceLabel: "SetFilm\u0130zle", provider: "setfilmizle", referer: pageUrl });
              if (extStreams.length > 0) {
                extStreams.forEach(function(es) {
                  streams.push(es);
                });
                gotStreamForPlayer = true;
                break;
              }
              continue;
            }
            var fp = yield resolveFastplay(fastplayUrl, spRes.url || setplayUrl);
            if (!fp || !fp.manifestUrl) continue;
            var fpOrigMatch = String(fp.referer || fastplayUrl).match(/^https?:\/\/[^/]+/);
            var fpOrig = fpOrigMatch ? fpOrigMatch[0] : "https://fastplay.mom";
            var sHeaders = {
              "User-Agent": "ExoPlayerLib/2.19.1",
              "Referer": fpOrig + "/",
              "Origin": fpOrig
            };
            streams.push(buildNuvioStream({
              name: "SetFilm\u0130zle",
              title: "\u231C SetFilm\u0130zle \u231F | FastPlay (1080p HLS)",
              url: fp.manifestUrl,
              quality: "1080p",
              format: "hls",
              isHls: true,
              provider: "setfilmizle",
              headers: sHeaders,
              subtitles: fp.subtitles || []
            }));
            gotStreamForPlayer = true;
            if (streams.length > 0) break;
          } catch (e) {
          }
        }
      }
    } catch (e) {
    }
    return streams;
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      var query = args && args.search || args && args.extra && args.extra.search || args && args.query || "";
      var catalogId = args && args.id || "";
      var catalogType = args && args.type || "";
      var wantSeries = catalogId.includes("series") || catalogType === "tv" || catalogType === "series";
      var wantMovies = catalogId.includes("movie") || catalogType === "movie";
      var url = query ? BASE_URL + "/?s=" + encodeURIComponent(query) : wantSeries ? BASE_URL + "/dizi/" : BASE_URL + "/tur/aksiyon/";
      var res = yield fetchWithTimeout(url, { headers: HEADERS }, 15e3);
      if (!res.ok) return { metas: [] };
      var html = yield res.text();
      var cards = parseCards(html);
      if (wantSeries && !wantMovies) {
        var filteredSeries = cards.filter(function(c) {
          return c.isTv;
        });
        if (filteredSeries.length > 0 || !query) cards = filteredSeries;
      } else if (wantMovies && !wantSeries && query) {
        var filteredMovies = cards.filter(function(c) {
          return !c.isTv;
        });
        if (filteredMovies.length > 0) cards = filteredMovies;
      }
      var metas = cards.slice(0, 30).map(function(c) {
        return {
          id: "setfilmizle:" + (c.isTv ? "show:" : "movie:") + encodeURIComponent(c.href),
          type: c.isTv ? "tv" : "movie",
          name: c.title,
          poster: c.poster || "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
          background: c.poster || "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
          genres: [c.isTv ? "Yabanc\u0131 Dizi" : "Film", "SetFilmIzle"],
          description: c.title + " - SetFilmIzle"
        };
      });
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
      if (!rawId || !rawId.startsWith("setfilmizle:")) return { meta: null };
      var href = decodeURIComponent(rawId.split(":").slice(2).join(":"));
      var res = yield fetchWithTimeout(href, { headers: HEADERS }, 15e3);
      if (!res.ok) return { meta: null };
      var html = yield res.text();
      var titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").replace(/\s*\(20\d\d\)\s*/g, "").trim() : "SetFilmIzle";
      var ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      var poster = ogImg ? ogImg[1] : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
      if (href.includes("/dizi/")) {
        var videos = [];
        var seen = /* @__PURE__ */ new Set();
        var panelRe = /<div[^>]+class="[^"]*season-panel[^"]*"[^>]*data-season="(\d+)"[^>]*>([\s\S]*?)(?=<div[^>]+class="[^"]*season-panel[^"]*"|$)/gi;
        var pmm;
        while ((pmm = panelRe.exec(html)) !== null) {
          var sN = parseInt(pmm[1]) || 1;
          var panelHtml = pmm[2];
          var fepRe = /<a[^>]+class="[^"]*fep[^"]*"[^>]*href="([^"]+)"[^>]*>/gi;
          var fm;
          var eIdx = 0;
          while ((fm = fepRe.exec(panelHtml)) !== null) {
            var fepHref = absUrl(fm[1]);
            if (!fepHref || seen.has(fepHref)) continue;
            eIdx++;
            var slugM = fepHref.match(/-(\d+)-sezon-(\d+)-bolum/);
            var eN = slugM ? parseInt(slugM[2]) : eIdx;
            var sN2 = slugM ? parseInt(slugM[1]) : sN;
            seen.add(fepHref);
            videos.push({
              id: "setfilmizle:ep:" + encodeURIComponent(fepHref),
              title: sN2 + ". Sezon " + eN + ". B\xF6l\xFCm",
              season: sN2,
              episode: eN
            });
          }
        }
        if (videos.length === 0) {
          var epRe = /<a[^>]+href="([^"]+)"[^>]*>([^<]*\d+\.\s*Sezon[^<]*\d+\.\s*Bölüm[^<]*)<\/a>/gi;
          var em;
          while ((em = epRe.exec(html)) !== null) {
            var epHref = absUrl(em[1]);
            if (!epHref || seen.has(epHref)) continue;
            var epTxt = em[2].replace(/\s+/g, " ").trim();
            var seMatch = epTxt.match(/(\d+)\.\s*Sezon[^\d]*(\d+)\.\s*Bölüm/);
            var sN3 = seMatch ? parseInt(seMatch[1]) : 1;
            var eN3 = seMatch ? parseInt(seMatch[2]) : 1;
            seen.add(epHref);
            videos.push({
              id: "setfilmizle:ep:" + encodeURIComponent(epHref),
              title: epTxt || sN3 + ". Sezon " + eN3 + ". B\xF6l\xFCm",
              season: sN3,
              episode: eN3
            });
          }
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
            description: title + " - SetFilmIzle",
            genres: ["Yabanc\u0131 Dizi", "SetFilmIzle"],
            videos
          }
        };
      }
      return {
        meta: {
          id: rawId,
          type: "movie",
          name: title,
          poster,
          background: poster,
          description: title + " - SetFilmIzle",
          genres: ["Film", "SetFilmIzle"],
          videos: [{ id: rawId, title, released: (/* @__PURE__ */ new Date()).toISOString().split("T")[0] }]
        }
      };
    } catch (e) {
      return { meta: null };
    }
  });
}
function getStreams(tmdbIdOrArgs, mediaType2, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      if (typeof tmdbIdOrArgs === "object" && tmdbIdOrArgs !== null) {
        mediaType2 = tmdbIdOrArgs.type || mediaType2;
        seasonNum = tmdbIdOrArgs.season || seasonNum;
        episodeNum = tmdbIdOrArgs.episode || episodeNum;
        tmdbIdOrArgs = tmdbIdOrArgs.id;
      }
      if (typeof tmdbIdOrArgs === "string" && tmdbIdOrArgs.indexOf(":") !== -1 && !tmdbIdOrArgs.startsWith("setfilmizle:")) {
        var parts = tmdbIdOrArgs.split(":");
        if (parts.length >= 3) {
          var s = parseInt(parts[parts.length - 2]);
          var e = parseInt(parts[parts.length - 1]);
          if (!isNaN(s)) seasonNum = s;
          if (!isNaN(e)) episodeNum = e;
          mediaType2 = "tv";
          tmdbIdOrArgs = parts[0];
        }
      }
      if (typeof tmdbIdOrArgs === "string" && tmdbIdOrArgs.startsWith("setfilmizle:ep:")) {
        var epHref = decodeURIComponent(tmdbIdOrArgs.replace("setfilmizle:ep:", ""));
        return yield extractStreamsFromContentPage(epHref);
      }
      if (typeof tmdbIdOrArgs === "string" && (tmdbIdOrArgs.startsWith("setfilmizle:show:") || tmdbIdOrArgs.startsWith("setfilmizle:movie:"))) {
        var href2 = decodeURIComponent(tmdbIdOrArgs.split(":").slice(2).join(":"));
        if (tmdbIdOrArgs.startsWith("setfilmizle:show:")) {
          var meta = yield getMeta(tmdbIdOrArgs);
          var vids = meta && meta.meta && meta.meta.videos || [];
          var target = vids.find(function(v) {
            return v.season === (parseInt(seasonNum) || 1) && v.episode === (parseInt(episodeNum) || 1);
          }) || vids[0];
          if (target) return yield getStreams(target.id);
          return yield extractStreamsFromContentPage(href2);
        }
        return yield extractStreamsFromContentPage(href2);
      }
      var season = parseInt(seasonNum) || 1;
      var episode = parseInt(episodeNum) || 1;
      var info2 = yield resolveTmdbInfo(tmdbIdOrArgs, mediaType2);
      var searchTitles = [info2.title, info2.origTitle].filter(Boolean);
      if (searchTitles.length === 0) return [];
      for (var t = 0; t < searchTitles.length; t++) {
        var cards = yield searchSite(searchTitles[t]);
        if (!cards || cards.length === 0) continue;
        var wantTv = mediaType2 === "tv" || mediaType2 === "series";
        var filtered = cards.filter(function(c) {
          return wantTv ? c.isTv : !c.isTv;
        });
        var best = pickBest(filtered.length > 0 ? filtered : cards, searchTitles[t]);
        if (!best) continue;
        if (best.isTv) {
          var streams = yield extractStreamsFromContentPage(best.href);
          if (streams.length > 0) {
            if (season === 1 && episode === 1) return streams;
          }
          var showMeta = yield getMeta("setfilmizle:show:" + encodeURIComponent(best.href));
          var vids2 = showMeta && showMeta.meta && showMeta.meta.videos || [];
          var tgt = vids2.find(function(v) {
            return v.season === season && v.episode === episode;
          });
          if (tgt) {
            var epStreams = yield getStreams(tgt.id);
            if (epStreams.length > 0) return epStreams;
          }
          if (streams.length > 0) return streams;
        } else {
          var mStreams = yield extractStreamsFromContentPage(best.href);
          if (mStreams.length > 0) {
            if (info2.imdbId) {
              var vixAlso = yield extractVixolity({ imdbId: info2.imdbId, sourceLabel: "SetFilm\u0130zle", provider: "setfilmizle" }).catch(function() {
                return [];
              });
              vixAlso.forEach(function(vs) {
                mStreams.push(vs);
              });
            }
            return mStreams;
          }
        }
      }
      if (info2.imdbId && !(mediaType2 === "tv" || mediaType2 === "series")) {
        var vixFallback = yield extractVixolity({ imdbId: info2.imdbId, sourceLabel: "SetFilm\u0130zle", provider: "setfilmizle" });
        if (vixFallback.length > 0) return vixFallback;
      }
      return [];
    } catch (e2) {
      if (info2.imdbId && !(mediaType2 === "tv" || mediaType2 === "series")) {
        var vixFallback = yield extractVixolity({ imdbId: info2.imdbId, sourceLabel: "SetFilm\u0130zle", provider: "setfilmizle" });
        if (vixFallback.length > 0) return vixFallback;
      }
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

