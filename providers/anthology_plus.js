/**
 * Anthology Provider: anthology_plus
 * Built from src/anthology_plus/index.js
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
    var DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    function timeoutSignal2(ms) {
      if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
        return AbortSignal.timeout(ms);
      }
      var controller = new AbortController();
      setTimeout(function() {
        controller.abort();
      }, ms);
      return controller.signal;
    }
    function fetchWithTimeout(url, options, ms) {
      ms = ms || 1e4;
      options = options || {};
      if (!options.signal) {
        options.signal = timeoutSignal2(ms);
      }
      if (!options.headers) {
        options.headers = {};
      }
      if (!options.headers["User-Agent"] && !options.headers["user-agent"]) {
        options.headers["User-Agent"] = DEFAULT_UA;
      }
      return fetch(url, options);
    }
    module2.exports = {
      DEFAULT_UA,
      timeoutSignal: timeoutSignal2,
      fetchWithTimeout
    };
  }
});

// src/shared/extractors.js
var require_extractors = __commonJS({
  "src/shared/extractors.js"(exports2, module2) {
    var { timeoutSignal: timeoutSignal2 } = require_http();
    var DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
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
    function buildNuvioStream(opts) {
      var url = opts.url;
      var isHls = opts.isHls !== void 0 ? Boolean(opts.isHls) : opts.format === "hls" || url.indexOf(".m3u8") !== -1;
      var format = opts.format || (isHls ? "hls" : "mp4");
      var hdrs = Object.assign({ "User-Agent": DEFAULT_UA }, opts.headers || {});
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
            headers: { "User-Agent": DEFAULT_UA, "Referer": normalized, "Accept": "application/json, text/plain, */*" },
            signal: timeoutSignal2(9e3)
          });
          if (r1.ok) videoData = yield r1.json();
        } catch (e) {
        }
        if ((!videoData || (!videoData.sources || !videoData.sources.length) && !videoData.playback) && origin !== "https://bysezoxexe.com") {
          try {
            var dRes = yield fetch(origin + "/api/videos/" + encodeURIComponent(code) + "/details", {
              headers: { "User-Agent": DEFAULT_UA, "Referer": normalized },
              signal: timeoutSignal2(8e3)
            });
            if (dRes.ok) {
              var det = yield dRes.json();
              if (det && det.embed_frame_url) {
                var tOrig = new URL(det.embed_frame_url).origin;
                var r2 = yield fetch(tOrig + "/api/videos/" + encodeURIComponent(code), {
                  headers: { "User-Agent": DEFAULT_UA, "Referer": det.embed_frame_url },
                  signal: timeoutSignal2(9e3)
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
        var sHdr = { "User-Agent": DEFAULT_UA, "Referer": origin + "/" };
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
          out.push(buildNuvioStream({
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
              headers: { "User-Agent": DEFAULT_UA, "Referer": opts.referer || origin + "/" },
              signal: timeoutSignal2(1e4)
            });
            if (!r.ok) continue;
            var html = yield r.text();
            var fm = /file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i.exec(html) || /sources\s*:\s*\[\s*\{\s*file\s*:\s*["'](https?:\/\/[^"']+)["']/i.exec(html);
            if (!fm || !fm[1]) continue;
            var tag = opts.audioType === "dub" ? "\u{1F1F9}\u{1F1F7} TR Dublaj" : opts.audioType === "sub" ? "\u{1F310} TR Altyaz\u0131" : "VidMoly";
            return [buildNuvioStream({
              name: opts.streamName || opts.sourceLabel || "Anthology",
              title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | VidMoly | " + tag,
              url: fm[1],
              quality: "1080p",
              format: "hls",
              isHls: true,
              provider: opts.provider,
              headers: { "User-Agent": DEFAULT_UA, "Referer": origin + "/" },
              subtitles: extractInlineVttSubtitles(html, { "User-Agent": DEFAULT_UA, "Referer": origin + "/" })
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
            headers: { "User-Agent": DEFAULT_UA, "Referer": opts.referer || "https://ok.ru/" },
            signal: timeoutSignal2(1e4)
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
          var hdrs = { "User-Agent": DEFAULT_UA, "Referer": "https://ok.ru/" };
          var out = [];
          var tag = opts.audioType === "dub" ? "\u{1F1F9}\u{1F1F7} TR Dublaj" : opts.audioType === "sub" ? "\u{1F310} TR Altyaz\u0131" : "OK.ru";
          (meta.videos || []).forEach(function(v) {
            if (!v.url) return;
            var q = qMap[String(v.name || "").toLowerCase()] || "720p";
            out.push(buildNuvioStream({
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
            out.push(buildNuvioStream({
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
            headers: { "User-Agent": DEFAULT_UA, "Referer": opts.referer || "https://video.sibnet.ru/" },
            signal: timeoutSignal2(1e4)
          });
          if (!r.ok) return [];
          var html = yield r.text();
          var m = /player\.src\(\[\s*\{\s*src\s*:\s*["']([^"']+)["']/i.exec(html);
          if (!m || !m[1]) return [];
          var src = m[1].indexOf("http") === 0 ? m[1] : "https://video.sibnet.ru" + (m[1].charAt(0) === "/" ? "" : "/") + m[1];
          var tag = opts.audioType === "dub" ? "\u{1F1F9}\u{1F1F7} TR Dublaj" : opts.audioType === "sub" ? "\u{1F310} TR Altyaz\u0131" : "Sibnet";
          return [buildNuvioStream({
            name: opts.streamName || opts.sourceLabel || "Anthology",
            title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | Sibnet MP4 | " + tag,
            url: src,
            quality: "720p",
            format: "mp4",
            isHls: false,
            provider: opts.provider,
            headers: { "User-Agent": DEFAULT_UA, "Referer": "https://video.sibnet.ru/" }
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
          "User-Agent": DEFAULT_UA,
          "Referer": "https://pl.vixolity.com/",
          "Origin": "https://pl.vixolity.com",
          "Accept": "*/*"
        };
        try {
          var r = yield fetch(targetUrl, { headers: vixHeaders, signal: timeoutSignal2(7e3) });
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
          return [buildNuvioStream({
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
            var er = yield fetch(pu, { headers: { "User-Agent": DEFAULT_UA, "Referer": opts.referer || pu }, signal: timeoutSignal2(1e4) });
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
          var jsRes = yield fetch(scriptUrl, { headers: { "User-Agent": DEFAULT_UA, "Referer": opts.referer || scriptOrig + "/" }, signal: timeoutSignal2(1e4) });
          if (!jsRes.ok) return [];
          var jsText = yield jsRes.text();
          var jm = /window\.__PLAYER__\s*=\s*(\{[\s\S]*?\});/.exec(jsText);
          if (!jm) return [];
          var payload = JSON.parse(jm[1]);
          if (!payload || !payload.stream) return [];
          var sHdr = { "User-Agent": DEFAULT_UA, "Referer": scriptOrig + "/", "Origin": scriptOrig };
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
          return [buildNuvioStream({
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
            var r = yield fetch(url, { headers: { "User-Agent": DEFAULT_UA, "Referer": opts.referer || "https://my.mail.ru/" }, signal: timeoutSignal2(8e3) });
            if (r.ok) {
              var h = yield r.text();
              var mm = /metadataUrl["']?\s*:\s*["']([^"']+)["']/.exec(h) || /(\/+\/my\.mail\.ru\/\+\/video\/meta\/[^"'\s]+)/.exec(h);
              if (mm) metaUrl = normalizeUrl(mm[1]);
            }
          }
          if (!metaUrl) return [];
          var mr = yield fetch(metaUrl, { headers: { "User-Agent": DEFAULT_UA, "Referer": ref }, signal: timeoutSignal2(8e3) });
          if (!mr.ok) return [];
          var data = yield mr.json();
          var out = [];
          (data.videos || []).forEach(function(v) {
            if (!v.url) return;
            var q = v.key || "720p";
            out.push(buildNuvioStream({
              name: opts.streamName || opts.sourceLabel || "Anthology",
              title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | Mail.ru " + q.toUpperCase(),
              url: normalizeUrl(v.url),
              quality: q,
              format: "mp4",
              isHls: false,
              provider: opts.provider,
              headers: { "User-Agent": DEFAULT_UA, "Referer": ref }
            }));
          });
          return out;
        } catch (e) {
          return [];
        }
      });
    }
    function spgDecode(encodedB64, keyB64) {
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
            headers: { "User-Agent": DEFAULT_UA, "Referer": opts.referer || fpOrig + "/" },
            signal: timeoutSignal2(12e3)
          });
          if (!res.ok) return [];
          var fpHtml = yield res.text();
          var manMatch = /(?:src|stream)\s*:\s*["'](\/manifests\/[^"']+)["']/.exec(fpHtml);
          if (!manMatch) return [];
          var manPath = manMatch[1].replace(/&amp;/g, "&");
          var manifestUrl = manPath.indexOf("http") === 0 ? manPath : fpOrig + manPath;
          var subs = extractInlineVttSubtitles(fpHtml, { "User-Agent": DEFAULT_UA, "Referer": fpOrig + "/" });
          var fpHdrs = { "User-Agent": EXOPLAYER_UA, "Referer": fpOrig + "/", "Origin": fpOrig };
          return [buildNuvioStream({
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
            headers: { "User-Agent": DEFAULT_UA, "Referer": opts.referer || spOrig + "/" },
            signal: timeoutSignal2(12e3)
          });
          if (!res.ok) return [];
          var spHtml = yield res.text();
          var cerMatch = /SPG\.cerceve\(\s*["'][^"']*["']\s*,\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/.exec(spHtml) || /SPG\.cerceve\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/.exec(spHtml);
          var fastplayUrl = cerMatch ? spgDecode(cerMatch[1], cerMatch[2]) : null;
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
    function extractByEmbedUrl(rawUrl, opts) {
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
      DEFAULT_UA,
      EXOPLAYER_UA,
      decodeHtmlEntities,
      base64DecodeString,
      buildNuvioStream,
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
      extractByEmbedUrl
    };
  }
});

// src/hdfilmdelisi/index.js
var require_hdfilmdelisi = __commonJS({
  "src/hdfilmdelisi/index.js"(exports2, module2) {
    var { sortStreamsByQuality: sortStreamsByQuality2 } = require_quality();
    var { loadConfig: loadConfig2, val: val2, wrapAll: wrapAll2 } = require_config();
    var _cfgReady2 = null;
    function cfgReady2() {
      if (!_cfgReady2) {
        _cfgReady2 = loadConfig2().then(function() {
          var v;
          v = val2("urls.movies.hdfilmdelisi.base");
          if (v) BASE_URL = String(v).replace(/\/+$/, "");
          if (HEADERS) HEADERS.Referer = BASE_URL + "/";
        });
      }
      return _cfgReady2;
    }
    var BASE_URL = "https://hdfilmdelisi.one";
    var TMDB_API_KEY2 = "500330721680edb6d5f7f12ba7cd9023";
    var HEADERS = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
      "Referer": BASE_URL + "/"
    };
    var VIDMODY_HEADERS = {
      "User-Agent": HEADERS["User-Agent"],
      "Referer": "https://pl.vixolity.com/",
      "Origin": "https://pl.vixolity.com"
    };
    var VIXOLITY_HEADERS = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://pl.vixolity.com/",
      "Origin": "https://pl.vixolity.com",
      "Accept": "*/*"
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
    function resolveTmdbInfo(id, mediaType) {
      return __async(this, null, function* () {
        try {
          var cleanId = String(id || "").trim().replace(/^(?:movie|tv|series|tmdb|imdb):+/i, "");
          if (cleanId.includes(":")) cleanId = cleanId.split(":")[0];
          var title = "";
          var origTitle = "";
          var imdbId = "";
          if (cleanId.startsWith("tt")) {
            imdbId = cleanId;
            var findRes = yield fetchWithTimeout("https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_API_KEY2 + "&external_source=imdb_id", {}, 1e4);
            if (findRes.ok) {
              var fd = yield findRes.json();
              var match = mediaType === "tv" || mediaType === "series" ? fd.tv_results && fd.tv_results[0] : fd.movie_results && fd.movie_results[0];
              if (!match) match = fd.movie_results && fd.movie_results[0] || fd.tv_results && fd.tv_results[0];
              if (match) {
                title = match.name || match.title || "";
                origTitle = match.original_name || match.original_title || "";
              }
            }
          } else {
            var type = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
            var tRes = yield fetchWithTimeout("https://api.themoviedb.org/3/" + type + "/" + cleanId + "?api_key=" + TMDB_API_KEY2 + "&language=tr-TR", {}, 1e4);
            if (tRes.ok) {
              var td = yield tRes.json();
              title = td.name || td.title || "";
              origTitle = td.original_name || td.original_title || "";
              if (td.imdb_id) imdbId = td.imdb_id;
            }
            if (!imdbId && (mediaType === "tv" || mediaType === "series")) {
              var extRes = yield fetchWithTimeout("https://api.themoviedb.org/3/tv/" + cleanId + "/external_ids?api_key=" + TMDB_API_KEY2, {}, 6e3);
              if (extRes.ok) {
                var extData = yield extRes.json();
                if (extData && extData.imdb_id) imdbId = extData.imdb_id;
              }
            }
          }
          return { title, origTitle, imdbId };
        } catch (e) {
          return { title: "", origTitle: "", imdbId: "" };
        }
      });
    }
    function apiSearch(query) {
      return __async(this, null, function* () {
        try {
          var res = yield fetchWithTimeout(BASE_URL + "/api/search?q=" + encodeURIComponent(query), {
            headers: { "User-Agent": HEADERS["User-Agent"], "Referer": BASE_URL + "/" }
          }, 15e3);
          if (!res.ok) return [];
          var data = yield res.json();
          return data && (data.results || data.films) || [];
        } catch (e) {
          return [];
        }
      });
    }
    function pickBest(results, title) {
      if (!results || results.length === 0) return null;
      var cleanTarget = ultraClean(title);
      var nameOf = function(r) {
        return r.baslik || r.orijinalBaslik || r.title || "";
      };
      for (var i = 0; i < results.length; i++) {
        if (ultraClean(nameOf(results[i])) === cleanTarget) return results[i];
      }
      for (var j = 0; j < results.length; j++) {
        var c = ultraClean(nameOf(results[j]));
        if (c.includes(cleanTarget) || cleanTarget.includes(c)) return results[j];
      }
      return results[0];
    }
    function vidmodyDecrypt(hex, key) {
      try {
        var sb = "";
        for (var i = 0; i < hex.length; i += 2) {
          sb += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }
        var rev = sb.split("").reverse().join("");
        var decoded;
        if (typeof Buffer !== "undefined") {
          decoded = Buffer.from(rev, "base64");
        } else if (typeof atob === "function") {
          var bin = atob(rev);
          decoded = [];
          for (var k = 0; k < bin.length; k++) decoded.push(bin.charCodeAt(k));
        } else {
          return "";
        }
        var out = "";
        for (var b = 0; b < decoded.length; b++) {
          var byte = typeof decoded[b] === "number" ? decoded[b] : decoded.charCodeAt(b);
          out += String.fromCharCode((byte - key + 256) % 256);
        }
        return out.replace(/\\x([0-9a-fA-F]{2})/g, function(m, h) {
          return String.fromCharCode(parseInt(h, 16));
        });
      } catch (e) {
        return "";
      }
    }
    function extractVidmodyFile(pageUrl) {
      return __async(this, null, function* () {
        try {
          var res = yield fetchWithTimeout(pageUrl, { headers: HEADERS }, 15e3);
          if (!res.ok) return null;
          var html = yield res.text();
          var vm = html.match(/https?:[\\/]+player\.vidmody\.com[\\/][a-zA-Z0-9=\\/]+/);
          if (!vm) return null;
          var playerUrl = vm[0].split("\\").join("/");
          var pRes = yield fetchWithTimeout(playerUrl, {
            headers: { "User-Agent": HEADERS["User-Agent"], "Referer": pageUrl }
          }, 15e3);
          if (!pRes.ok) return null;
          var pHtml = yield pRes.text();
          var dMatch = pHtml.match(/(?:decrypt|\))\s*\(\s*["']([0-9a-fA-F]+)["']\s*,\s*(\d+)\s*\)/);
          if (!dMatch) return null;
          var block = vidmodyDecrypt(dMatch[1], parseInt(dMatch[2]));
          var fMatch = block.match(/file:\s*['"](https?:\/\/[^'"]+)['"]/);
          if (!fMatch) return null;
          var subs = [];
          var subRe = /https?:\/\/[^\s"'\\]+\.vtt/gi;
          var sm;
          var seen = /* @__PURE__ */ new Set();
          while ((sm = subRe.exec(pHtml + " " + block)) !== null) {
            if (seen.has(sm[0]) || /thumb/i.test(sm[0])) continue;
            seen.add(sm[0]);
            var lang = /tur/i.test(sm[0]) ? "tur" : "eng";
            subs.push({ id: lang, lang, url: sm[0] });
          }
          return { file: fMatch[1], playerUrl, subtitles: subs };
        } catch (e) {
          return null;
        }
      });
    }
    function parseVixolitySubtitles(playlistText) {
      var subs = [];
      var subRe = /#EXT-X-MEDIA:TYPE=SUBTITLES.*?NAME="([^"]+)".*?LANGUAGE="([^"]+)".*?URI="([^"]+)"/gi;
      var sm;
      var seen = /* @__PURE__ */ new Set();
      while ((sm = subRe.exec(playlistText)) !== null) {
        var name = sm[1];
        var lang = sm[2].toLowerCase();
        var uri = sm[3];
        if (seen.has(uri)) continue;
        seen.add(uri);
        subs.push({
          id: lang,
          lang: lang === "tr" ? "tur" : lang === "en" ? "eng" : lang,
          language: lang,
          label: name,
          name,
          title: name,
          url: uri,
          format: "vtt",
          type: "text/vtt",
          headers: VIXOLITY_HEADERS
        });
      }
      return subs;
    }
    function toVixolityStream(url, subtitles, isSeries, sNum, eNum) {
      var tag = isSeries ? "S" + (sNum || 1) + "E" + (eNum || 1) + " \u2022 [TR Dublaj & Altyaz\u0131l\u0131]" : "[TR Dublaj & Altyaz\u0131l\u0131]";
      return {
        name: "HDFilmDelisi",
        title: "\u231C HDFilmDelisi \u231F | Vixolity \u2022 " + tag + " (1080p HLS)",
        url,
        quality: "1080p",
        provider: "hdfilmdelisi",
        headers: VIXOLITY_HEADERS,
        format: "hls",
        isHls: true,
        behaviorHints: { notWebReady: true, proxyHeaders: { request: VIXOLITY_HEADERS } },
        subtitles: subtitles || []
      };
    }
    function toStream(file, subtitles) {
      var isHls = /\.m3u8/i.test(file) || file.includes("vixolity.com/vs/") || file.includes("vidmody.com/vs/");
      var headers = file.includes("vixolity.com") ? VIXOLITY_HEADERS : isHls && file.includes("vidmody.com") ? { "User-Agent": HEADERS["User-Agent"], "Referer": "https://vidmody.com/" } : { "User-Agent": HEADERS["User-Agent"], "Referer": "https://player.vidmody.com/" };
      return {
        name: "HDFilmDelisi",
        title: "\u231C HDFilmDelisi \u231F | 1080p HLS",
        url: file,
        quality: "1080p",
        provider: "hdfilmdelisi",
        headers,
        format: "hls",
        isHls: true,
        behaviorHints: { notWebReady: true, proxyHeaders: { request: headers } },
        subtitles: subtitles || []
      };
    }
    function getCatalog(args) {
      return __async(this, null, function* () {
        try {
          var query = args && args.search || args && args.extra && args.extra.search || args && args.query || "";
          var url = query ? BASE_URL + "/api/search?q=" + encodeURIComponent(query) : BASE_URL + "/api/films?page=1&sort=newest&limit=20";
          var res = yield fetchWithTimeout(url, { headers: { "User-Agent": HEADERS["User-Agent"] } }, 15e3);
          if (!res.ok) return { metas: [] };
          var data = yield res.json();
          var items = data.results || data.films || [];
          var metas = items.slice(0, 30).map(function(f) {
            var title = f.baslik || f.title || "Film";
            return {
              id: "hdfilmdelisi:movie:" + (f.slug || f.id),
              type: "movie",
              name: title + (f.yayinYili ? " (" + f.yayinYili + ")" : ""),
              poster: f.afis || "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
              background: f.afis || "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
              genres: [f.kategoriler && f.kategoriler[0] && f.kategoriler[0].ad || "Film", "HDFilmDelisi"],
              description: (f.orijinalBaslik || title) + " - HDFilmDelisi"
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
          if (!rawId || !rawId.startsWith("hdfilmdelisi:")) return { meta: null };
          var slug = rawId.split(":").slice(2).join(":");
          var pageUrl = BASE_URL + "/film/" + slug;
          var res = yield fetchWithTimeout(pageUrl, { headers: HEADERS }, 15e3);
          if (!res.ok) return { meta: null };
          var html = yield res.text();
          var titleMatch = html.match(/<title>([^<]+)<\/title>/i);
          var title = titleMatch ? titleMatch[1].split("|")[0].split("-")[0].trim() : "HDFilmDelisi";
          var ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
          var poster = ogImg ? ogImg[1] : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
          return {
            meta: {
              id: rawId,
              type: "movie",
              name: title,
              poster,
              background: poster,
              description: title + " - HDFilmDelisi",
              genres: ["Film", "HDFilmDelisi"],
              videos: [{ id: rawId, title, released: (/* @__PURE__ */ new Date()).toISOString().split("T")[0] }]
            }
          };
        } catch (e) {
          return { meta: null };
        }
      });
    }
    function getStreams2(tmdbIdOrArgs, mediaType, seasonNum, episodeNum) {
      return __async(this, null, function* () {
        try {
          var id = tmdbIdOrArgs;
          var isSeries = mediaType === "tv" || mediaType === "series";
          var s = seasonNum || 1;
          var e = episodeNum || 1;
          if (typeof tmdbIdOrArgs === "object" && tmdbIdOrArgs && tmdbIdOrArgs.id) {
            id = tmdbIdOrArgs.id;
            if (tmdbIdOrArgs.type) isSeries = tmdbIdOrArgs.type === "tv" || tmdbIdOrArgs.type === "series";
            if (tmdbIdOrArgs.season) s = tmdbIdOrArgs.season;
            if (tmdbIdOrArgs.episode) e = tmdbIdOrArgs.episode;
          }
          var streams = [];
          var seenUrls = /* @__PURE__ */ new Set();
          if (typeof id === "string" && id.startsWith("hdfilmdelisi:movie:")) {
            var slug = id.split(":").slice(2).join(":");
            var apiRes = yield fetchWithTimeout(BASE_URL + "/api/films/" + slug, { headers: HEADERS }, 1e4);
            if (apiRes.ok) {
              var fData = yield apiRes.json();
              if (fData && fData.imdbId && fData.imdbId.startsWith("tt")) {
                var directVix = "https://ha.vixolity.com/vs/" + fData.imdbId;
                var vr = yield fetchWithTimeout(directVix, { headers: VIXOLITY_HEADERS }, 8e3);
                if (vr.ok) {
                  var vt = yield vr.text();
                  var subs = parseVixolitySubtitles(vt);
                  streams.push(toVixolityStream(directVix, subs, false));
                  seenUrls.add(directVix);
                }
              }
            }
            var found = yield extractVidmodyFile(BASE_URL + "/film/" + slug);
            if (found && !seenUrls.has(found.file)) {
              streams.push(toStream(found.file, found.subtitles));
              seenUrls.add(found.file);
            }
            if (streams.length > 0) return streams;
          }
          var info = yield resolveTmdbInfo(id, isSeries ? "tv" : "movie");
          if (info && info.imdbId && info.imdbId.startsWith("tt")) {
            var vixUrl = isSeries ? "https://ha.vixolity.com/vs/" + info.imdbId + "/s" + s + "/e" + (e < 10 ? "0" + e : e) : "https://ha.vixolity.com/vs/" + info.imdbId;
            var vRes = yield fetchWithTimeout(vixUrl, { headers: VIXOLITY_HEADERS }, 8e3);
            if (vRes.ok) {
              var vTxt = yield vRes.text();
              if (vTxt.includes("#EXTM3U")) {
                var vSubs = parseVixolitySubtitles(vTxt);
                streams.push(toVixolityStream(vixUrl, vSubs, isSeries, s, e));
                seenUrls.add(vixUrl);
              }
            }
          }
          var searchTitles = [info.title, info.origTitle].filter(Boolean);
          for (var t = 0; t < searchTitles.length; t++) {
            var results = yield apiSearch(searchTitles[t]);
            if (!results || results.length === 0) continue;
            var best = pickBest(results, searchTitles[t]);
            if (!best || !best.slug) continue;
            if (best.imdbId && best.imdbId.startsWith("tt") && !seenUrls.has("https://ha.vixolity.com/vs/" + best.imdbId)) {
              var sUrl = "https://ha.vixolity.com/vs/" + best.imdbId;
              var sRes = yield fetchWithTimeout(sUrl, { headers: VIXOLITY_HEADERS }, 8e3);
              if (sRes.ok) {
                var sTxt = yield sRes.text();
                if (sTxt.includes("#EXTM3U")) {
                  var sSubs = parseVixolitySubtitles(sTxt);
                  streams.push(toVixolityStream(sUrl, sSubs, false));
                  seenUrls.add(sUrl);
                }
              }
            }
            var vf = yield extractVidmodyFile(BASE_URL + "/film/" + best.slug);
            if (vf && !seenUrls.has(vf.file)) {
              streams.push(toStream(vf.file, vf.subtitles));
              seenUrls.add(vf.file);
            }
            if (streams.length > 0) break;
          }
          return streams;
        } catch (e2) {
          return [];
        }
      });
    }
    if (typeof getStreams2 === "function") {
      _origGetStreams = getStreams2;
      getStreams2 = function() {
        return __async(this, arguments, function* () {
          var res = yield _origGetStreams.apply(this, arguments);
          return sortStreamsByQuality2(res);
        });
      };
    }
    var _origGetStreams;
    if (typeof module2 !== "undefined" && module2.exports) {
      module2.exports = wrapAll2({ getStreams: getStreams2, getMeta, getCatalog }, cfgReady2);
    }
    if (typeof globalThis !== "undefined") {
      globalThis.getStreams = getStreams2;
      globalThis.getMeta = getMeta;
      globalThis.getCatalog = getCatalog;
    }
  }
});

// src/sinemacx/index.js
var require_sinemacx = __commonJS({
  "src/sinemacx/index.js"(exports2, module2) {
    var { sortStreamsByQuality: sortStreamsByQuality2 } = require_quality();
    var { loadConfig: loadConfig2, val: val2, wrapAll: wrapAll2 } = require_config();
    var _cfgReady2 = null;
    function cfgReady2() {
      if (!_cfgReady2) {
        _cfgReady2 = loadConfig2().then(function() {
          var v;
          v = val2("urls.movies.sinemacx.base");
          if (v && String(v).indexOf("sinema.gg") === -1) BASE_URL = String(v).replace(/\/+$/, "");
          if (WORKING_HEADERS) WORKING_HEADERS.Referer = BASE_URL + "/";
        });
      }
      return _cfgReady2;
    }
    var cheerio = require("cheerio-without-node-native");
    var { timeoutSignal: timeoutSignal2 } = require_http();
    var { extractVixolity: extractVixolity2, buildNuvioStream, DEFAULT_UA } = require_extractors();
    var BASE_URL = "https://sinemacc.com";
    var TMDB_API_KEY2 = "500330721680edb6d5f7f12ba7cd9023";
    var WORKING_HEADERS = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": BASE_URL + "/"
    };
    function decodeBase64Safe(str) {
      try {
        if (typeof atob === "function") return atob(str);
        if (typeof Buffer !== "undefined") return Buffer.from(str, "base64").toString("utf8");
      } catch (e) {
      }
      return str;
    }
    function resolveTmdbInfo(id, mediaType) {
      return __async(this, null, function* () {
        try {
          let cleanId = String(id || "").trim();
          if (cleanId.includes(":")) cleanId = cleanId.split(":")[0];
          let numericId = null;
          let imdbId = cleanId.startsWith("tt") ? cleanId : "";
          let title = "";
          let origTitle = "";
          let year = "";
          if (cleanId.startsWith("tt")) {
            const findRes = yield fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY2}&external_source=imdb_id`);
            if (findRes.ok) {
              const fData = yield findRes.json();
              const item = mediaType === "tv" || mediaType === "series" ? fData.tv_results && fData.tv_results[0] : fData.movie_results && fData.movie_results[0];
              if (item) {
                numericId = item.id;
                title = item.name || item.title || "";
                origTitle = item.original_name || item.original_title || "";
                year = (item.first_air_date || item.release_date || "").slice(0, 4);
              }
            }
          } else {
            numericId = cleanId;
          }
          if (numericId && (!title || !origTitle || !imdbId)) {
            const type = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
            const tRes = yield fetch(`https://api.themoviedb.org/3/${type}/${numericId}?api_key=${TMDB_API_KEY2}&language=tr-TR&append_to_response=external_ids`);
            if (tRes.ok) {
              const tData = yield tRes.json();
              title = tData.name || tData.title || title;
              origTitle = tData.original_name || tData.original_title || origTitle;
              year = (tData.first_air_date || tData.release_date || "").slice(0, 4);
              imdbId = imdbId || tData.imdb_id || tData.external_ids && tData.external_ids.imdb_id || "";
            }
          }
          return { title, origTitle, year, numericId, imdbId };
        } catch (e) {
          return { title: "", origTitle: "", year: "", numericId: id, imdbId: "" };
        }
      });
    }
    function searchOnSite(query, year) {
      return __async(this, null, function* () {
        if (!query || query.length < 2) return null;
        const cleanQuery = query.toLowerCase().trim();
        const searchUrl = `${BASE_URL}/?s=` + encodeURIComponent(cleanQuery);
        try {
          const res = yield fetch(searchUrl, { headers: WORKING_HEADERS });
          if (!res.ok) return null;
          const html = yield res.text();
          const $ = cheerio.load(html);
          const results = [];
          const stopWords = /* @__PURE__ */ new Set(["the", "a", "an", "ve", "ile", "der", "die", "das", "le", "la"]);
          const significantWords = cleanQuery.split(/\s+/).filter((w) => w.length > 1 && !stopWords.has(w));
          $("a.baslik, a.resim").each(function() {
            const url = $(this).attr("href") || "";
            const rawTitle = $(this).attr("title") || $(this).find("span").first().text().trim() || $(this).text().trim();
            const titleLower = rawTitle.toLowerCase();
            if (!url.includes("/film/") || url.includes("/category/") || url.includes("/search/") || url.includes("/tag/") || rawTitle.length < 2) return;
            let score = 0;
            let matchedWordCount = 0;
            significantWords.forEach((w) => {
              if (titleLower.includes(w) || url.includes(w)) {
                score += 10;
                matchedWordCount++;
              }
            });
            if (matchedWordCount === significantWords.length && significantWords.length > 0) {
              score += 15;
            }
            if (year && (titleLower.includes(year) || url.includes(year))) score += 10;
            if (url.includes(cleanQuery.replace(/\s+/g, "-"))) score += 8;
            const extraWords = titleLower.split(/\s+/).filter((w) => !stopWords.has(w) && !significantWords.includes(w));
            const hasSequel = /[\s\-_]([2-9]|ii|iii|iv|v)($|[\s\-_])/i.test(titleLower) || /[\s\-_]([2-9]|ii|iii|iv|v)($|[\s\-_])/i.test(url);
            if (hasSequel && !/[\s\-_]([2-9]|ii|iii|iv|v)/i.test(cleanQuery)) {
              score -= 25;
            }
            score -= extraWords.length * 2;
            if (score > 5) {
              results.push({ url, siteTitle: rawTitle, score });
            }
          });
          if (results.length > 0) {
            results.sort((a, b) => b.score - a.score);
            return results[0];
          }
          return null;
        } catch (err) {
          return null;
        }
      });
    }
    function getStreams2(tmdbId, mediaType, seasonNum, episodeNum) {
      return __async(this, null, function* () {
        try {
          const info = yield resolveTmdbInfo(tmdbId, mediaType);
          const trTitle = (info.title || "").trim();
          const orgTitle = (info.origTitle || "").trim();
          const displayTitle = trTitle || orgTitle || "Film";
          const releaseYear = info.year;
          let result = null;
          const searchCandidates = [];
          if (orgTitle) {
            searchCandidates.push(orgTitle);
            const withoutThe = orgTitle.replace(/^the\s+/i, "").trim();
            if (withoutThe && withoutThe !== orgTitle) searchCandidates.push(withoutThe);
          }
          if (trTitle && trTitle !== orgTitle) {
            searchCandidates.push(trTitle);
            const withoutTheTr = trTitle.replace(/^the\s+/i, "").trim();
            if (withoutTheTr && withoutTheTr !== trTitle) searchCandidates.push(withoutTheTr);
          }
          for (const cand of searchCandidates) {
            result = yield searchOnSite(cand, releaseYear);
            if (result && result.score >= 10) break;
          }
          let langInfo = "\u{1F1F9}\u{1F1F7} TR Dublaj & \u{1F310} Altyaz\u0131";
          if (!result || !result.url) {
            const slugCand = (orgTitle || trTitle || "").toLowerCase().replace(/^the\s+/i, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
            if (slugCand) {
              result = { url: `${BASE_URL}/film/${slugCand}/`, siteTitle: displayTitle, score: 10 };
            }
          }
          if (result && result.url) {
            try {
              const pageRes = yield fetch(result.url, { headers: WORKING_HEADERS, signal: timeoutSignal2(5e3) });
              if (pageRes.ok) {
                const html = yield pageRes.text();
                const $page = cheerio.load(html);
                const pageText = $page("body").text().toLowerCase();
                if (pageText.includes("dublaj")) {
                  langInfo = "\u{1F1F9}\u{1F1F7} TR Dublaj";
                } else if (pageText.includes("altyaz\u0131")) {
                  langInfo = "\u{1F310} TR Altyaz\u0131";
                }
                let iframeUrl = "";
                $page("iframe").each(function() {
                  let src = $page(this).attr("data-vsrc") || $page(this).attr("src") || "";
                  if (src && !/^https?:\/\//i.test(src) && !src.startsWith("//")) {
                    src = decodeBase64Safe(src);
                  }
                  if (src.toLowerCase().includes("filmizle.in")) {
                    iframeUrl = src.split("?")[0];
                    return false;
                  }
                });
                if (iframeUrl) {
                  const videoId = iframeUrl.split("/").pop().split("?")[0];
                  const apiURL = "https://player.filmizle.in/player/index.php?data=" + videoId + "&do=getVideo";
                  const params = new URLSearchParams();
                  params.append("hash", videoId);
                  params.append("r", result.url);
                  const r = yield fetch(apiURL, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                      "X-Requested-With": "XMLHttpRequest",
                      "Referer": iframeUrl.toLowerCase(),
                      "User-Agent": WORKING_HEADERS["User-Agent"]
                    },
                    body: params.toString(),
                    signal: timeoutSignal2(4e3)
                  });
                  if (r.ok) {
                    const json = yield r.json();
                    if (json && json.securedLink) {
                      const fpHeaders = {
                        "Referer": "https://player.filmizle.in/",
                        "Origin": "https://player.filmizle.in",
                        "User-Agent": DEFAULT_UA
                      };
                      let fpPlayable = false;
                      try {
                        const mRes = yield fetch(json.securedLink, { headers: fpHeaders, signal: timeoutSignal2(4e3) });
                        if (mRes.ok) {
                          const mTxt = yield mRes.text();
                          const sub = mTxt.split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith("#"));
                          if (sub) {
                            const subUrl = new URL(sub, mRes.url || json.securedLink).toString();
                            const vRes = yield fetch(subUrl, { headers: fpHeaders, signal: timeoutSignal2(4e3) });
                            fpPlayable = vRes.ok;
                          }
                        }
                      } catch (e) {
                      }
                      if (fpPlayable) {
                        return [buildNuvioStream({
                          name: displayTitle,
                          title: `\u231C SinemaCX \u231F | ${langInfo}`,
                          url: json.securedLink,
                          quality: "1080p",
                          format: "hls",
                          isHls: true,
                          provider: "sinemacx",
                          headers: fpHeaders
                        })];
                      }
                    }
                  }
                }
              }
            } catch (e) {
            }
          }
          if (info.imdbId) {
            const vixStreams = yield extractVixolity2({
              imdbId: info.imdbId,
              sourceLabel: "SinemaCX",
              streamName: displayTitle,
              provider: "sinemacx"
            });
            if (vixStreams.length > 0) return vixStreams;
          }
          return [];
        } catch (err) {
          return [];
        }
      });
    }
    if (typeof getStreams2 === "function") {
      _origGetStreams = getStreams2;
      getStreams2 = function() {
        return __async(this, arguments, function* () {
          var res = yield _origGetStreams.apply(this, arguments);
          return sortStreamsByQuality2(res);
        });
      };
    }
    var _origGetStreams;
    if (typeof module2 !== "undefined" && module2.exports) {
      module2.exports = wrapAll2({ getStreams: getStreams2 }, cfgReady2);
    }
    if (typeof globalThis !== "undefined") {
      globalThis.getStreams = getStreams2;
    }
  }
});

// src/animecix/index.js
var require_animecix = __commonJS({
  "src/animecix/index.js"(exports2, module2) {
    var { sortStreamsByQuality: sortStreamsByQuality2 } = require_quality();
    var { loadConfig: loadConfig2, val: val2, wrapAll: wrapAll2 } = require_config();
    var _cfgReady2 = null;
    function cfgReady2() {
      if (!_cfgReady2) {
        _cfgReady2 = loadConfig2().then(function() {
          var v;
          v = val2("urls.anime.animecix.base");
          if (v) BASE_URL = String(v).replace(/\/+$/, "");
          if (HEADERS) HEADERS.Referer = BASE_URL + "/";
        });
      }
      return _cfgReady2;
    }
    var BASE_URL = "https://animecix.tv";
    var XEH_KEY = "7Y2ozlO+QysR5w9Q6Tupmtvl9jJp7ThFH8SB+Lo7NvZjgjqRSqOgcT2v4ISM9sP10LmnlYI8WQ==.xrlyOBFS5BHjQ2Lk";
    var TMDB_API_KEY2 = "500330721680edb6d5f7f12ba7cd9023";
    var HEADERS = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Referer": BASE_URL + "/",
      "x-e-h": XEH_KEY
    };
    function ultraClean(str) {
      if (!str) return "";
      return str.toString().toLowerCase().replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[^a-z0-9]/g, "").trim();
    }
    function resolveTmdbInfo(id, mediaType) {
      return __async(this, null, function* () {
        try {
          let cleanId = String(id || "").trim();
          if (cleanId.includes(":")) cleanId = cleanId.split(":")[0];
          let numericId = null;
          let title = "";
          let origTitle = "";
          if (cleanId.startsWith("tt")) {
            const findRes = yield fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY2}&external_source=imdb_id`);
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
            const tRes = yield fetch(`https://api.themoviedb.org/3/${type}/${numericId}?api_key=${TMDB_API_KEY2}&language=tr-TR`);
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
    function getStreams2(tmdbId, mediaType, seasonNum, episodeNum) {
      return __async(this, null, function* () {
        try {
          if (typeof tmdbId === "object" && tmdbId && tmdbId.id) {
            return getStreams2(tmdbId.id, mediaType || "tv", seasonNum, episodeNum);
          }
          const isTv = mediaType === "tv" || mediaType === "series" || !mediaType;
          const season = parseInt(seasonNum) || 1;
          const episode = parseInt(episodeNum) || 1;
          if (typeof tmdbId === "string" && tmdbId.startsWith("animecix:title:")) {
            const showMeta = yield getMeta(tmdbId);
            if (showMeta && showMeta.meta && Array.isArray(showMeta.meta.videos) && showMeta.meta.videos.length > 0) {
              return yield getStreams2(showMeta.meta.videos[0].id);
            }
          }
          if (typeof tmdbId === "string" && tmdbId.startsWith("animecix:ep:")) {
            const parts = tmdbId.replace("animecix:ep:", "").split(":");
            const titleId = parts[0];
            const targetSeason = parseInt(parts[1]) || season;
            const targetEp = parseInt(parts[2]) || episode;
            const videoUrl2 = `${BASE_URL}/secure/best-video?titleId=${titleId}&episode=${targetEp}&season=${targetSeason}`;
            const bestRes2 = yield fetch(videoUrl2, { headers: HEADERS, redirect: "follow" });
            const finalUrl2 = bestRes2.url || "";
            const m2 = finalUrl2.match(/tau-video\.xyz\/embed\/([a-zA-Z0-9_-]+)/);
            if (!m2) return [];
            const tauId2 = m2[1];
            const tauRes2 = yield fetch(`https://tau-video.xyz/api/video/${tauId2}`, {
              headers: { "User-Agent": HEADERS["User-Agent"], "Referer": BASE_URL + "/" }
            });
            if (!tauRes2.ok) return [];
            const tauData2 = yield tauRes2.json();
            if (!tauData2.urls || tauData2.urls.length === 0) return [];
            return tauData2.urls.map((u) => ({
              name: "AnimeciX",
              title: `\u231C AnimeciX \u231F | TauVideo [${u.label || "HD"}]`,
              url: u.url,
              quality: u.label || "1080p",
              provider: "animecix",
              headers: { "User-Agent": HEADERS["User-Agent"], "Referer": BASE_URL + "/" }
            }));
          }
          if (typeof tmdbId === "string" && tmdbId.startsWith("animecix:title:")) {
            const titleId = tmdbId.replace("animecix:title:", "");
            const videoUrl2 = `${BASE_URL}/secure/best-video?titleId=${titleId}&episode=${episode}&season=${season}`;
            const bestRes2 = yield fetch(videoUrl2, { headers: HEADERS, redirect: "follow" });
            const finalUrl2 = bestRes2.url || "";
            const m2 = finalUrl2.match(/tau-video\.xyz\/embed\/([a-zA-Z0-9_-]+)/);
            if (!m2) return [];
            const tauId2 = m2[1];
            const tauRes2 = yield fetch(`https://tau-video.xyz/api/video/${tauId2}`, {
              headers: { "User-Agent": HEADERS["User-Agent"], "Referer": BASE_URL + "/" }
            });
            if (!tauRes2.ok) return [];
            const tauData2 = yield tauRes2.json();
            if (!tauData2.urls || tauData2.urls.length === 0) return [];
            return tauData2.urls.map((u) => ({
              name: "AnimeciX",
              title: `\u231C AnimeciX \u231F | TauVideo [${u.label || "HD"}]`,
              url: u.url,
              quality: u.label || "1080p",
              provider: "animecix",
              headers: { "User-Agent": HEADERS["User-Agent"], "Referer": BASE_URL + "/" }
            }));
          }
          const info = yield resolveTmdbInfo(tmdbId, mediaType);
          const queries = [info.title, info.origTitle].filter(Boolean);
          if (queries.length === 0) return [];
          let matchedItem = null;
          for (const q of queries) {
            const searchRes = yield fetch(`${BASE_URL}/secure/search/${encodeURIComponent(q)}?limit=10`, { headers: HEADERS });
            if (!searchRes.ok) continue;
            const sData = yield searchRes.json();
            if (sData.results && sData.results.length > 0) {
              const qClean = ultraClean(q);
              for (const item of sData.results) {
                if (info.numericId && String(item.tmdb_id) === String(info.numericId)) {
                  matchedItem = item;
                  break;
                }
                const itemClean = ultraClean(item.name || "");
                if (qClean && itemClean && (itemClean.includes(qClean) || qClean.includes(itemClean))) {
                  matchedItem = item;
                  break;
                }
              }
              if (matchedItem) break;
            }
          }
          if (!matchedItem) return [];
          let videoUrl = isTv ? `${BASE_URL}/secure/best-video?titleId=${matchedItem.id}&episode=${episode}&season=${season}` : `${BASE_URL}/secure/best-video?titleId=${matchedItem.id}&episode=1&season=1`;
          const bestRes = yield fetch(videoUrl, { headers: HEADERS, redirect: "follow" });
          const finalUrl = bestRes.url || "";
          const m = finalUrl.match(/tau-video\.xyz\/embed\/([a-zA-Z0-9_-]+)/);
          if (!m) return [];
          const tauId = m[1];
          const tauRes = yield fetch(`https://tau-video.xyz/api/video/${tauId}`, {
            headers: {
              "User-Agent": HEADERS["User-Agent"],
              "Referer": BASE_URL + "/"
            }
          });
          if (!tauRes.ok) return [];
          const tauData = yield tauRes.json();
          if (!tauData.urls || tauData.urls.length === 0) return [];
          const displayTitle = isTv ? `${matchedItem.name} S${season}E${episode}` : matchedItem.name;
          const aHeaders = {
            "User-Agent": HEADERS["User-Agent"],
            "Referer": BASE_URL + "/"
          };
          return tauData.urls.map((u) => ({
            name: displayTitle,
            title: `\u231C AnimeciX \u231F | TauVideo [${u.label || "HD"}]`,
            url: u.url,
            quality: u.label || "1080p",
            provider: "animecix",
            headers: aHeaders,
            behaviorHints: {
              notWebReady: true,
              proxyHeaders: {
                request: aHeaders
              }
            }
          }));
        } catch (err) {
          return [];
        }
      });
    }
    if (typeof getStreams2 === "function") {
      _origGetStreams = getStreams2;
      getStreams2 = function() {
        return __async(this, arguments, function* () {
          var res = yield _origGetStreams.apply(this, arguments);
          return sortStreamsByQuality2(res);
        });
      };
    }
    var _origGetStreams;
    if (typeof module2 !== "undefined") module2.exports = { getStreams: getStreams2 };
    if (typeof globalThis !== "undefined") globalThis.getStreams = getStreams2;
    function getCatalog(args) {
      return __async(this, null, function* () {
        try {
          const query = args && args.search || args && args.extra && args.extra.search || args && args.query || "";
          let items = [];
          if (query) {
            const res = yield fetch(`${BASE_URL}/secure/search/${encodeURIComponent(query)}?limit=20`, { headers: HEADERS });
            if (res.ok) {
              const data = yield res.json();
              items = data.results || [];
            }
          } else {
            const res = yield fetch(`${BASE_URL}/secure/titles?limit=20`, { headers: HEADERS });
            if (res.ok) {
              const data = yield res.json();
              items = data.pagination && data.pagination.data || [];
            }
          }
          const metas = items.map((item) => ({
            id: `animecix:title:${item.id}`,
            type: "tv",
            name: item.name,
            poster: item.poster || "https://www.google.com/s2/favicons?domain=animecix.tv&sz=128",
            background: item.backdrop || item.poster || "https://www.google.com/s2/favicons?domain=animecix.tv&sz=128",
            description: item.description || `${item.name} - AnimeciX`,
            genres: ["Anime", "AnimeciX"]
          }));
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
          if (!rawId || !rawId.startsWith("animecix:title:")) return { meta: null };
          const titleId = rawId.replace("animecix:title:", "");
          const dRes = yield fetch(`${BASE_URL}/secure/titles/${titleId}`, { headers: HEADERS });
          if (!dRes.ok) return { meta: null };
          const dData = yield dRes.json();
          const titleObj = dData.title || {};
          const name = titleObj.name || titleObj.name_english || "Anime";
          const poster = titleObj.poster || "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
          const bg = titleObj.backdrop || poster;
          const desc = titleObj.description || `${name} - AnimeciX`;
          const videos = [];
          const seasons = titleObj.seasons || [];
          if (seasons.length > 0) {
            seasons.forEach((s) => {
              const sNum = s.number !== void 0 && s.number !== null && !isNaN(parseInt(s.number)) ? parseInt(s.number) : 1;
              const epCount = parseInt(s.episode_count) || 0;
              for (let ep = 1; ep <= epCount; ep++) {
                videos.push({
                  id: `animecix:ep:${titleId}:${sNum}:${ep}`,
                  title: `${name} ${sNum}. Sezon ${ep}. B\xF6l\xFCm`,
                  season: sNum,
                  episode: ep
                });
              }
            });
          }
          if (videos.length === 0) {
            const epCount = parseInt(titleObj.episode_count) || 1;
            for (let ep = 1; ep <= epCount; ep++) {
              videos.push({
                id: `animecix:ep:${titleId}:1:${ep}`,
                title: `${name} ${ep}. B\xF6l\xFCm`,
                season: 1,
                episode: ep
              });
            }
          }
          return {
            meta: {
              id: rawId,
              type: "tv",
              name,
              poster,
              background: bg,
              description: desc,
              genres: ["Anime", "AnimeciX"],
              videos
            }
          };
        } catch (e) {
          return { meta: null };
        }
      });
    }
    if (typeof module2 !== "undefined") {
      module2.exports = wrapAll2({ getStreams: getStreams2, getCatalog, getMeta }, cfgReady2);
    }
    if (typeof globalThis !== "undefined") {
      globalThis.getStreams = getStreams2;
      globalThis.getCatalog = getCatalog;
      globalThis.getMeta = getMeta;
    }
  }
});

// src/seicode/index.js
var require_seicode = __commonJS({
  "src/seicode/index.js"(exports2, module2) {
    var { sortStreamsByQuality: sortStreamsByQuality2 } = require_quality();
    var { loadConfig: loadConfig2, val: val2, wrapAll: wrapAll2 } = require_config();
    var _cfgReady2 = null;
    function cfgReady2() {
      if (!_cfgReady2) {
        _cfgReady2 = loadConfig2().then(function() {
          var v;
          v = val2("urls.anime.seicode.base");
          if (v) BASE_URL = String(v).replace(/\/+$/, "");
          v = val2("urls.anime.seicode.api_base");
          if (v) API_BASE = String(v).replace(/\/+$/, "");
          if (HEADERS) HEADERS.Referer = BASE_URL + "/";
        });
      }
      return _cfgReady2;
    }
    var BASE_URL = "https://seicode.net";
    var API_BASE = "https://next.seicode.net";
    var TMDB_API_KEY2 = "500330721680edb6d5f7f12ba7cd9023";
    var HEADERS = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Referer": BASE_URL + "/"
    };
    function timeoutSignal2(ms) {
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
            var findUrl = "https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_API_KEY2 + "&external_source=imdb_id";
            var findRes = yield fetch(findUrl, { signal: timeoutSignal2(6e3) });
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
            var enRes = yield fetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY2, { signal: timeoutSignal2(6e3) });
            if (enRes.ok) {
              var enData = yield enRes.json();
              if (enData.name) titles.push(enData.name);
              if (enData.title) titles.push(enData.title);
              if (enData.original_name) titles.push(enData.original_name);
              if (enData.original_title) titles.push(enData.original_title);
            }
            var trRes = yield fetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY2 + "&language=tr-TR", { signal: timeoutSignal2(6e3) });
            if (trRes.ok) {
              var trData = yield trRes.json();
              if (trData.name) titles.push(trData.name);
              if (trData.title) titles.push(trData.title);
            }
            var altRes = yield fetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "/alternative_titles?api_key=" + TMDB_API_KEY2, { signal: timeoutSignal2(6e3) });
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
          var res = yield fetch(url, { headers: HEADERS, signal: timeoutSignal2(7e3) });
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
          var res = yield fetch(url, { headers: HEADERS, signal: timeoutSignal2(8e3) });
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
            signal: timeoutSignal2(7e3)
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
          var res = yield fetch(fullUrl, { headers: { "User-Agent": HEADERS["User-Agent"] }, signal: timeoutSignal2(7e3) });
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
            signal: timeoutSignal2(7e3)
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
            signal: timeoutSignal2(7e3)
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
            signal: timeoutSignal2(7e3)
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
            var res = yield fetch(url, { headers: HEADERS, signal: timeoutSignal2(8e3) });
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
    function getStreams2(tmdbId, mediaType, seasonNum, episodeNum) {
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
    if (typeof getStreams2 === "function") {
      _origGetStreams = getStreams2;
      getStreams2 = function() {
        return __async(this, arguments, function* () {
          var res = yield _origGetStreams.apply(this, arguments);
          return sortStreamsByQuality2(res);
        });
      };
    }
    var _origGetStreams;
    if (typeof module2 !== "undefined") module2.exports = wrapAll2({ getStreams: getStreams2, getCatalog, getMeta }, cfgReady2);
    if (typeof globalThis !== "undefined") {
      globalThis.getStreams = getStreams2;
      globalThis.getCatalog = getCatalog;
      globalThis.getMeta = getMeta;
    }
  }
});

// src/sonanime/index.js
var require_sonanime = __commonJS({
  "src/sonanime/index.js"(exports2, module2) {
    var { loadConfig: loadConfig2, val: val2, wrapAll: wrapAll2 } = require_config();
    var _cfgReady2 = null;
    function cfgReady2() {
      if (!_cfgReady2) {
        _cfgReady2 = loadConfig2().then(function() {
          var v;
          v = val2("urls.anime.sonanime.base");
          if (v) BASE_URL = String(v).replace(/\/+$/, "");
          v = val2("urls.anime.sonanime.api_base");
          if (v) API_BASE = String(v).replace(/\/+$/, "");
        });
      }
      return _cfgReady2;
    }
    var BASE_URL = "https://sonanime.com";
    var API_BASE = "https://api.sonanime.com";
    var TMDB_API_KEY2 = "500330721680edb6d5f7f12ba7cd9023";
    var DEFAULT_HEADERS = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://sonanime.com/",
      "Accept": "application/json, text/plain, */*"
    };
    function timeoutSignal2(ms) {
      if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
        return AbortSignal.timeout(ms);
      }
      var controller = new AbortController();
      setTimeout(function() {
        controller.abort();
      }, ms);
      return controller.signal;
    }
    function cleanStr(str) {
      if (!str) return "";
      var s = str.toString().toLowerCase();
      try {
        if (typeof s.normalize === "function") {
          s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }
      } catch (e) {
      }
      return s.replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[âîûÂÎÛ]/g, function(c) {
        return { "\xE2": "a", "\xEE": "i", "\xFB": "u", "\xC2": "a", "\xCE": "i", "\xDB": "u" }[c] || c;
      }).replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
    }
    function fetchJson(url, timeoutMs) {
      return __async(this, null, function* () {
        try {
          var res = yield fetch(url, {
            headers: DEFAULT_HEADERS,
            signal: timeoutSignal2(timeoutMs || 8e3)
          });
          if (!res.ok) return null;
          return yield res.json();
        } catch (e) {
          return null;
        }
      });
    }
    function resolveTmdbInfo(id, mediaType) {
      return __async(this, null, function* () {
        try {
          var cleanId = String(id || "").trim();
          if (cleanId.indexOf(":") !== -1) cleanId = cleanId.split(":")[0];
          var numericId = null;
          var titles = [];
          if (cleanId.indexOf("tt") === 0) {
            var findData = yield fetchJson("https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_API_KEY2 + "&external_source=imdb_id", 6e3);
            if (findData) {
              var item = mediaType === "tv" || mediaType === "series" ? findData.tv_results && findData.tv_results[0] : findData.movie_results && findData.movie_results[0];
              if (item) {
                numericId = item.id;
                if (item.name) titles.push(item.name);
                if (item.title) titles.push(item.title);
                if (item.original_name) titles.push(item.original_name);
                if (item.original_title) titles.push(item.original_title);
              }
            }
          } else {
            numericId = cleanId;
          }
          if (numericId) {
            var type = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
            var enData = yield fetchJson("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY2, 6e3);
            if (enData) {
              if (enData.name) titles.push(enData.name);
              if (enData.title) titles.push(enData.title);
              if (enData.original_name) titles.push(enData.original_name);
              if (enData.original_title) titles.push(enData.original_title);
            }
            var trData = yield fetchJson("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY2 + "&language=tr-TR", 6e3);
            if (trData) {
              if (trData.name) titles.push(trData.name);
              if (trData.title) titles.push(trData.title);
            }
            var altData = yield fetchJson("https://api.themoviedb.org/3/" + type + "/" + numericId + "/alternative_titles?api_key=" + TMDB_API_KEY2, 6e3);
            if (altData) {
              var alts = altData.titles || altData.results || [];
              for (var i = 0; i < Math.min(alts.length, 8); i++) {
                if (alts[i].title) titles.push(alts[i].title);
              }
            }
          }
          var uniqueTitles = [];
          for (var j = 0; j < titles.length; j++) {
            var t = titles[j].trim();
            if (t && uniqueTitles.indexOf(t) === -1) {
              uniqueTitles.push(t);
            }
          }
          return { numericId: numericId ? parseInt(numericId) : null, titles: uniqueTitles };
        } catch (e) {
          return { numericId: null, titles: [] };
        }
      });
    }
    function searchSonAnime(titles, targetTmdb, isMovie) {
      return __async(this, null, function* () {
        if (!titles || !titles.length) return null;
        var seenSlugs = {};
        var candidateList = [];
        for (var i = 0; i < titles.length; i++) {
          var q = titles[i];
          var searchRes = yield fetchJson(API_BASE + "/api/anime/search?q=" + encodeURIComponent(q), 6e3);
          if (searchRes && Array.isArray(searchRes) && searchRes.length > 0) {
            for (var k = 0; k < searchRes.length; k++) {
              var item = searchRes[k];
              if (!item || !item.anime_link) continue;
              if (targetTmdb && item.tmdb_id && parseInt(item.tmdb_id) === targetTmdb) {
                return item;
              }
              if (!seenSlugs[item.anime_link]) {
                seenSlugs[item.anime_link] = true;
                candidateList.push({ item, query: q });
              }
            }
          }
        }
        if (candidateList.length === 0) return null;
        var bestItem = null;
        var bestScore = -1;
        for (var j = 0; j < candidateList.length; j++) {
          var cand = candidateList[j];
          var a = cand.item;
          var cleanTarget = cleanStr(cand.query);
          var name1 = cleanStr(a.anime_name || "");
          var name2 = cleanStr(a.anime_name_en || "");
          var score = 0;
          if (name1 === cleanTarget || name2 === cleanTarget) score += 100;
          else if (name1.indexOf(cleanTarget) !== -1 || cleanTarget.indexOf(name1) !== -1) score += 50;
          else if (name2 && (name2.indexOf(cleanTarget) !== -1 || cleanTarget.indexOf(name2) !== -1)) score += 40;
          var itemIsMovie = a.anime_type === "movie";
          if (isMovie && itemIsMovie) score += 20;
          else if (!isMovie && !itemIsMovie) score += 20;
          if (score > bestScore) {
            bestScore = score;
            bestItem = a;
          }
        }
        return bestItem || candidateList[0].item;
      });
    }
    function fetchStreamsBySlug(slug, sNum, eNum, isMovie) {
      return __async(this, null, function* () {
        var detail = yield fetchJson(API_BASE + "/api/anime/link/" + encodeURIComponent(slug), 8e3);
        if (!detail || !detail.episodes || !detail.episodes.length) return [];
        var ep = null;
        if (isMovie) {
          ep = detail.episodes[0];
        } else {
          ep = detail.episodes.find(function(e) {
            return parseInt(e.anime_season) === sNum && parseInt(e.episode_number) === eNum;
          });
          if (!ep) {
            ep = detail.episodes.find(function(e) {
              return parseInt(e.episode_number) === eNum;
            });
          }
        }
        if (!ep) return [];
        var streams = [];
        var qualities = [
          { key: "episode_link_1080", q: "1080p" },
          { key: "episode_link_720", q: "720p" },
          { key: "episode_link_480", q: "480p" },
          { key: "episode_link_360", q: "360p" }
        ];
        for (var k = 0; k < qualities.length; k++) {
          var item = qualities[k];
          var url = ep[item.key];
          if (url && typeof url === "string" && url.trim().length > 0) {
            streams.push({
              name: "SonAnime",
              title: "\u231C SonAnime \u231F | T\xFCrk\xE7e Altyaz\u0131l\u0131 [" + item.q + "]",
              url: url.trim(),
              quality: item.q,
              format: "mp4",
              isHls: false,
              contentLanguage: "ja",
              provider: "sonanime",
              headers: {
                "Referer": "https://sonanime.com/"
              },
              behaviorHints: {
                notWebReady: false
              }
            });
          }
        }
        return streams;
      });
    }
    function getStreams2(id, mediaType, season, episode) {
      return __async(this, null, function* () {
        try {
          var rawId = id;
          var finalMediaType = mediaType;
          var finalSeason = season;
          var finalEpisode = episode;
          if (typeof id === "object" && id !== null) {
            finalMediaType = id.type || id.mediaType || finalMediaType;
            finalSeason = id.season !== void 0 ? id.season : finalSeason;
            finalEpisode = id.episode !== void 0 ? id.episode : finalEpisode;
            rawId = id.id;
          }
          if (!rawId) return [];
          if (typeof rawId === "string" && rawId.indexOf(":") !== -1) {
            var parts = rawId.split(":");
            if (rawId.indexOf("sonanime:ep:") === 0) {
              var epSlug = parts[2];
              var epS = parseInt(parts[3]) || 1;
              var epE = parseInt(parts[4]) || 1;
              return yield fetchStreamsBySlug(epSlug, epS, epE, false);
            } else if (rawId.indexOf("sonanime:movie:") === 0) {
              var movieSlug = parts[2];
              return yield fetchStreamsBySlug(movieSlug, 1, 1, true);
            } else if (parts[0].indexOf("tt") === 0 || !isNaN(parseInt(parts[0]))) {
              rawId = parts[0];
              if (parts[1]) finalSeason = parseInt(parts[1]) || finalSeason;
              if (parts[2]) finalEpisode = parseInt(parts[2]) || finalEpisode;
            }
          }
          if (typeof rawId === "string" && rawId.indexOf("sonanime:") === 0) {
            var directSlug = rawId.replace(/^sonanime:(?:show:|anime:|movie:)?/, "");
            var isDirectMovie = finalMediaType === "movie" || rawId.indexOf("sonanime:movie:") === 0;
            return yield fetchStreamsBySlug(directSlug, parseInt(finalSeason) || 1, parseInt(finalEpisode) || 1, isDirectMovie);
          }
          var isTv = finalMediaType === "tv" || finalMediaType === "series";
          var sNum = parseInt(finalSeason) || 1;
          var eNum = parseInt(finalEpisode) || 1;
          var tmdbInfo = yield resolveTmdbInfo(rawId, finalMediaType);
          if (!tmdbInfo.titles || !tmdbInfo.titles.length) return [];
          var matchedAnime = yield searchSonAnime(tmdbInfo.titles, tmdbInfo.numericId, !isTv);
          if (!matchedAnime || !matchedAnime.anime_link) return [];
          return yield fetchStreamsBySlug(matchedAnime.anime_link, sNum, eNum, !isTv);
        } catch (e) {
          return [];
        }
      });
    }
    function getCatalog(args) {
      return __async(this, null, function* () {
        try {
          var searchExtra = args && args.extra && args.extra.search;
          if (searchExtra) {
            var sList = yield fetchJson(API_BASE + "/api/anime/search?q=" + encodeURIComponent(searchExtra), 6e3);
            if (!sList || !Array.isArray(sList)) return { metas: [] };
            var searchMetas = [];
            for (var i = 0; i < sList.length; i++) {
              var a = sList[i];
              if (!a || !a.anime_link) continue;
              var isMov = a.anime_type === "movie";
              searchMetas.push({
                id: isMov ? "sonanime:movie:" + a.anime_link : "sonanime:show:" + a.anime_link,
                type: isMov ? "movie" : "series",
                name: a.anime_name || a.anime_name_en || "Anime",
                poster: a.anime_photo || void 0,
                description: a.anime_description || a.anime_name + " - SonAnime T\xFCrk\xE7e Anime",
                genres: ["Anime", "SonAnime"]
              });
            }
            return { metas: searchMetas };
          }
          var browse = yield fetchJson(API_BASE + "/api/anime/browse?type=series&sortBy=rating&sortDir=desc", 8e3);
          if (!browse || !Array.isArray(browse)) return { metas: [] };
          var metas = [];
          var limit = Math.min(browse.length, 50);
          for (var j = 0; j < limit; j++) {
            var item = browse[j];
            if (!item || !item.anime_link) continue;
            metas.push({
              id: "sonanime:show:" + item.anime_link,
              type: "series",
              name: item.anime_name || item.anime_name_en || "Anime",
              poster: item.anime_photo || void 0,
              description: item.anime_description || item.anime_name + " - SonAnime",
              genres: item.anime_genres && Array.isArray(item.anime_genres) && item.anime_genres.length > 0 ? item.anime_genres : ["Anime", "SonAnime"]
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
          if (!rawId || rawId.indexOf("sonanime:") !== 0) return { meta: null };
          var slug = rawId.replace(/^sonanime:(?:show:|anime:|movie:)?/, "").replace(/\/$/, "");
          var detail = yield fetchJson(API_BASE + "/api/anime/link/" + encodeURIComponent(slug), 8e3);
          if (!detail) return { meta: null };
          var isMovie = detail.anime_type === "movie" || rawId.indexOf("sonanime:movie:") === 0;
          var name = detail.anime_name || detail.anime_name_en || slug;
          var poster = detail.anime_photo || "";
          var desc = detail.anime_description || name + " - SonAnime";
          var genres = ["Anime", "SonAnime"];
          if (detail.anime_genres) {
            if (Array.isArray(detail.anime_genres)) genres = detail.anime_genres;
            else if (typeof detail.anime_genres === "string") {
              try {
                genres = JSON.parse(detail.anime_genres);
              } catch (e) {
              }
            }
          }
          var videos = [];
          if (!isMovie && detail.episodes && Array.isArray(detail.episodes)) {
            var sortedEps = detail.episodes.slice().sort(function(a, b) {
              var sDiff = (parseInt(a.anime_season) || 1) - (parseInt(b.anime_season) || 1);
              if (sDiff !== 0) return sDiff;
              return (parseInt(a.episode_number) || 1) - (parseInt(b.episode_number) || 1);
            });
            for (var k = 0; k < sortedEps.length; k++) {
              var ep = sortedEps[k];
              var sNum = parseInt(ep.anime_season) || 1;
              var eNum = parseInt(ep.episode_number) || k + 1;
              videos.push({
                id: "sonanime:ep:" + slug + ":" + sNum + ":" + eNum,
                title: sNum + ". Sezon " + eNum + ". B\xF6l\xFCm",
                season: sNum,
                episode: eNum,
                released: ep.upload_date || void 0
              });
            }
          }
          return {
            meta: {
              id: rawId,
              type: isMovie ? "movie" : "series",
              name,
              poster,
              background: poster,
              description: desc,
              genres,
              videos: videos.length > 0 ? videos : void 0
            }
          };
        } catch (e) {
          return { meta: null };
        }
      });
    }
    function sortStreamsByQuality2(streams) {
      if (!Array.isArray(streams) || streams.length <= 1) return streams || [];
      function getQualityScore(s) {
        if (!s) return 0;
        var score = 0;
        if (s.quality) {
          var q = String(s.quality).toLowerCase().trim();
          if (/\b(4k|2160p?|uhd)\b/.test(q)) score = 2160;
          else if (/\b(2k|1440p?|qhd)\b/.test(q)) score = 1440;
          else if (/\b(1080p?|fhd|full[\s-]?hd)\b/.test(q)) score = 1080;
          else if (/\b(720p?|hd)\b/.test(q)) score = 720;
          else if (/\b(540p?)\b/.test(q)) score = 540;
          else if (/\b(480p?|sd)\b/.test(q)) score = 480;
          else if (/\b(360p?)\b/.test(q)) score = 360;
          else if (/\b(240p?)\b/.test(q)) score = 240;
        }
        if (!score) {
          var text = [s.title, s.name, s.resolution].filter(Boolean).join(" ").toLowerCase();
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
        }
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
    if (typeof getStreams2 === "function") {
      _origGetStreams = getStreams2;
      getStreams2 = function() {
        return __async(this, arguments, function* () {
          var res = yield _origGetStreams.apply(this, arguments);
          return sortStreamsByQuality2(res);
        });
      };
    }
    var _origGetStreams;
    if (typeof module2 !== "undefined") {
      module2.exports = wrapAll2({
        getStreams: getStreams2,
        getCatalog,
        getMeta
      }, cfgReady2);
    }
    if (typeof globalThis !== "undefined") {
      globalThis.getStreams = getStreams2;
      globalThis.getCatalog = getCatalog;
      globalThis.getMeta = getMeta;
    }
  }
});

// src/anthology_plus/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var { timeoutSignal } = require_http();
var { extractVixolity } = require_extractors();
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var VIXOLITY_BASE = "https://ha.vixolity.com";
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var vix = val("urls.vod.vixolity_base");
      if (vix) VIXOLITY_BASE = String(vix).replace(/\/+$/, "");
    });
  }
  return _cfgReady;
}
var hdfilmdelisiMod = require_hdfilmdelisi();
var sinemacxMod = require_sinemacx();
var animecixMod = require_animecix();
var seicodeMod = require_seicode();
var sonanimeMod = require_sonanime();
function resolveTmdbIdentity(rawId, mediaType) {
  return __async(this, null, function* () {
    try {
      var clean = String(rawId || "").trim().replace(/^(?:movie|tv|series|tmdb|imdb|anthology_plus):+/i, "");
      if (clean.indexOf(":") !== -1) clean = clean.split(":")[0];
      var isTv = mediaType === "tv" || mediaType === "series" || mediaType === "anime";
      var imdbId = clean.indexOf("tt") === 0 ? clean : "";
      var tmdbId = imdbId ? "" : clean;
      if (imdbId) {
        var fRes = yield fetch("https://api.themoviedb.org/3/find/" + imdbId + "?api_key=" + TMDB_API_KEY + "&external_source=imdb_id", { signal: timeoutSignal(7e3) });
        if (fRes.ok) {
          var fd = yield fRes.json();
          var item = isTv ? fd.tv_results && fd.tv_results[0] : fd.movie_results && fd.movie_results[0];
          if (!item) item = fd.movie_results && fd.movie_results[0] || fd.tv_results && fd.tv_results[0];
          if (item) {
            tmdbId = String(item.id);
            isTv = Boolean(item.first_air_date && !item.release_date);
          }
        }
      }
      if (tmdbId) {
        var typePath = isTv ? "tv" : "movie";
        var tRes = yield fetch("https://api.themoviedb.org/3/" + typePath + "/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR&append_to_response=external_ids", { signal: timeoutSignal(7e3) });
        if (tRes.ok) {
          var td = yield tRes.json();
          imdbId = imdbId || td.imdb_id || td.external_ids && td.external_ids.imdb_id || "";
          var genres = Array.isArray(td.genres) ? td.genres.map(function(g) {
            return g.id;
          }) : [];
          var isAnime = genres.indexOf(16) !== -1 || td.original_language === "ja";
          return { tmdbId, imdbId, isTv, isAnime };
        }
      }
      return imdbId ? { tmdbId, imdbId, isTv, isAnime: false } : null;
    } catch (e) {
      return null;
    }
  });
}
function getStreams(tmdbIdOrArgs, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      var id = tmdbIdOrArgs;
      var mType = mediaType || "movie";
      var sNum = parseInt(seasonNum, 10) || 1;
      var eNum = parseInt(episodeNum, 10) || 1;
      if (typeof tmdbIdOrArgs === "object" && tmdbIdOrArgs) {
        id = tmdbIdOrArgs.id || "";
        mType = tmdbIdOrArgs.type || mType;
        sNum = parseInt(tmdbIdOrArgs.season, 10) || sNum;
        eNum = parseInt(tmdbIdOrArgs.episode, 10) || eNum;
      }
      var rawStr = String(id || "").trim();
      var parts = rawStr.split(":");
      if (parts.length >= 3 && /^\d+$/.test(parts[parts.length - 1]) && /^\d+$/.test(parts[parts.length - 2])) {
        sNum = parseInt(parts[parts.length - 2], 10) || sNum;
        eNum = parseInt(parts[parts.length - 1], 10) || eNum;
        mType = "tv";
      }
      var identity = yield resolveTmdbIdentity(rawStr, mType);
      if (!identity) return [];
      var tasks = [];
      if (identity.imdbId) {
        tasks.push(extractVixolity({
          imdbId: identity.imdbId,
          season: identity.isTv ? sNum : void 0,
          episode: identity.isTv ? eNum : void 0,
          baseUrl: VIXOLITY_BASE,
          sourceLabel: "Anthology+",
          provider: "anthology_plus"
        }));
      }
      var reqId = identity.tmdbId || identity.imdbId;
      var reqType = identity.isTv ? "tv" : "movie";
      if (!identity.isTv) {
        tasks.push(hdfilmdelisiMod.getStreams(reqId, "movie").catch(function() {
          return [];
        }));
        tasks.push(sinemacxMod.getStreams(reqId, "movie").catch(function() {
          return [];
        }));
      }
      if (identity.isAnime) {
        tasks.push(animecixMod.getStreams(reqId, reqType, sNum, eNum).catch(function() {
          return [];
        }));
        tasks.push(seicodeMod.getStreams(reqId, reqType, sNum, eNum).catch(function() {
          return [];
        }));
        tasks.push(sonanimeMod.getStreams(reqId, reqType, sNum, eNum).catch(function() {
          return [];
        }));
      }
      var settled = yield Promise.all(tasks);
      var out = [];
      var seen = {};
      for (var i = 0; i < settled.length; i++) {
        var arr = Array.isArray(settled[i]) ? settled[i] : [];
        for (var j = 0; j < arr.length; j++) {
          var s = arr[j];
          if (!s || !s.url || seen[s.url]) continue;
          seen[s.url] = true;
          out.push(Object.assign({}, s, {
            name: "Anthology+",
            title: String(s.title || s.name || "").replace(/⌜\s*[^⌟]+\s*⌟/, "\u231C Anthology+ \u231F"),
            provider: "anthology_plus"
          }));
        }
      }
      return sortStreamsByQuality(out);
    } catch (e) {
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = wrapAll({ getStreams }, cfgReady);
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

