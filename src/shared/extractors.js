/**
 * Anthology - Shared Video Host Extractors (QuickJS & Node Compatible)
 * Mirrors anthology-vessel/extractors/* for Nuvio scrapers with strict
 * format, isHls, headers, and behaviorHints.proxyHeaders support.
 */

var { timeoutSignal } = require('./http.js');

var DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
var EXOPLAYER_UA = 'ExoPlayerLib/2.19.1';

function decodeHtmlEntities(str) {
  if (!str) return '';
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, function (_, num) {
      var c = parseInt(num, 10);
      return isNaN(c) ? '' : String.fromCharCode(c);
    });
}

function normalizeUrl(rawUrl) {
  var t = String(rawUrl || '').trim();
  if (t.indexOf('//') === 0) return 'https:' + t;
  return t;
}

function base64DecodeBytes(b64) {
  var std = String(b64 || '').trim().replace(/-/g, '+').replace(/_/g, '/');
  while (std.length % 4 !== 0) std += '=';
  var bin = '';
  if (typeof atob === 'function') {
    try { bin = atob(std); } catch (e) { bin = ''; }
  } else if (typeof Buffer !== 'undefined') {
    try { bin = Buffer.from(std, 'base64').toString('binary'); } catch (e) { bin = ''; }
  }
  var out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
  return out;
}

function base64DecodeString(b64) {
  var norm = String(b64 || '').replace(/\\\//g, '/').trim();
  if (typeof atob === 'function') {
    try { return atob(norm); } catch (e) {}
  }
  if (typeof Buffer !== 'undefined') {
    try { return Buffer.from(norm, 'base64').toString('binary'); } catch (e) {}
  }
  return '';
}

function buildNuvioStream(opts) {
  var url = opts.url;
  var isHls = opts.isHls !== undefined ? Boolean(opts.isHls) : (opts.format === 'hls' || url.indexOf('.m3u8') !== -1);
  var format = opts.format || (isHls ? 'hls' : 'mp4');
  var hdrs = Object.assign({ 'User-Agent': DEFAULT_UA }, opts.headers || {});
  var stream = {
    name: opts.name || opts.sourceLabel || 'Anthology',
    title: opts.title,
    url: url,
    quality: opts.quality || '1080p',
    type: format,
    format: format,
    isHls: isHls,
    provider: opts.provider || undefined,
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
  while ((m = re.exec(htmlText || '')) !== null) {
    var uri = m[0];
    if (!uri || seen[uri] || /thumb|sprite/i.test(uri)) continue;
    seen[uri] = true;
    var isEn = /eng|_en[_.]|english/i.test(uri);
    subs.push({
      id: isEn ? 'eng' : 'tur',
      lang: isEn ? 'eng' : 'tur',
      language: isEn ? 'en' : 'tr',
      label: isEn ? 'English' : 'Türkçe',
      url: uri,
      format: 'vtt',
      headers: headers || undefined
    });
  }
  return subs;
}

/* ==================== AES-256-GCM (Bysezo / FileMoon) ==================== */
var AES_SBOX = new Uint8Array([
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
]);
var AES_RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80];

function xtime(x) { return ((x << 1) ^ ((x & 0x80) ? 0x1b : 0)) & 0xff; }

function expandAes256Key(key) {
  var rk = new Uint8Array(240);
  rk.set(key.subarray(0, 32));
  var bg = 32, rci = 0;
  while (bg < 240) {
    var t0 = rk[bg - 4], t1 = rk[bg - 3], t2 = rk[bg - 2], t3 = rk[bg - 1];
    if (bg % 32 === 0) {
      var nt0 = AES_SBOX[t1] ^ AES_RCON[rci++];
      t1 = AES_SBOX[t2]; t2 = AES_SBOX[t3]; t3 = AES_SBOX[t0]; t0 = nt0;
    } else if (bg % 32 === 16) {
      t0 = AES_SBOX[t0]; t1 = AES_SBOX[t1]; t2 = AES_SBOX[t2]; t3 = AES_SBOX[t3];
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
    tmp = s[1]; s[1] = s[5]; s[5] = s[9]; s[9] = s[13]; s[13] = tmp;
    tmp = s[2]; s[2] = s[10]; s[10] = tmp; tmp = s[6]; s[6] = s[14]; s[14] = tmp;
    tmp = s[15]; s[15] = s[11]; s[11] = s[7]; s[7] = s[3]; s[3] = tmp;
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
    if ((x[i >>> 3] >>> (7 - (i & 7))) & 1) {
      for (var j = 0; j < 16; j++) z[j] ^= v[j];
    }
    var lsb = v[15] & 1;
    for (var j2 = 15; j2 > 0; j2--) v[j2] = (v[j2] >>> 1) | ((v[j2 - 1] & 1) << 7);
    v[0] = v[0] >>> 1;
    if (lsb) v[0] ^= 0xe1;
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
  lenBlock[12] = (bitLen >>> 24) & 0xff;
  lenBlock[13] = (bitLen >>> 16) & 0xff;
  lenBlock[14] = (bitLen >>> 8) & 0xff;
  lenBlock[15] = bitLen & 0xff;
  for (var k = 0; k < 16; k++) y[k] ^= lenBlock[k];
  return gfMul128(y, h);
}

function decodeUtf8(bytes) {
  if (typeof TextDecoder === 'function') return new TextDecoder('utf-8').decode(bytes);
  var out = '';
  for (var i = 0; i < bytes.length;) {
    var b0 = bytes[i++];
    if (b0 < 0x80) out += String.fromCharCode(b0);
    else if ((b0 & 0xe0) === 0xc0 && i < bytes.length) out += String.fromCharCode(((b0 & 0x1f) << 6) | (bytes[i++] & 0x3f));
    else if ((b0 & 0xf0) === 0xe0 && i + 1 < bytes.length) out += String.fromCharCode(((b0 & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
    else if ((b0 & 0xf8) === 0xf0 && i + 2 < bytes.length) {
      var cp = ((b0 & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
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
  j0.set(iv, 0); j0[15] = 1;
  var h = aes256EncryptBlock(new Uint8Array(16), rk);
  var tagMask = aes256EncryptBlock(j0, rk);
  var s = ghash(h, ct);
  var diff = 0;
  for (var i = 0; i < 16; i++) diff |= (tagMask[i] ^ s[i]) ^ tag[i];
  if (diff !== 0) return null;
  var ctr = new Uint8Array(j0);
  var plain = new Uint8Array(cipherLen);
  for (var off = 0; off < cipherLen; off += 16) {
    for (var c = 15; c >= 12; c--) { ctr[c] = (ctr[c] + 1) & 0xff; if (ctr[c] !== 0) break; }
    var ks = aes256EncryptBlock(ctr, rk);
    var end = Math.min(off + 16, cipherLen);
    for (var j = off; j < end; j++) plain[j] = ct[j] ^ ks[j - off];
  }
  return decodeUtf8(plain);
}

async function extractBysezo(rawUrl, opts) {
  opts = opts || {};
  var normalized = normalizeUrl(rawUrl);
  var origin = 'https://bysezoxexe.com';
  var code = '';
  try {
    var parsed = new URL(normalized);
    origin = parsed.origin;
    var segs = parsed.pathname.split('/').filter(Boolean);
    code = segs[segs.length - 1] || '';
  } catch (e) {
    var m = /\/([a-zA-Z0-9_-]{8,24})(?:[?#]|$)/.exec(normalized);
    code = m ? m[1] : '';
  }
  if (!code) return [];
  if (origin.indexOf('filemoon.') !== -1) origin = 'https://bysezoxexe.com';

  var videoData = null;
  try {
    var r1 = await fetch(origin + '/api/videos/' + encodeURIComponent(code), {
      headers: { 'User-Agent': DEFAULT_UA, 'Referer': normalized, 'Accept': 'application/json, text/plain, */*' },
      signal: timeoutSignal(9000)
    });
    if (r1.ok) videoData = await r1.json();
  } catch (e) {}

  if ((!videoData || ((!videoData.sources || !videoData.sources.length) && !videoData.playback)) && origin !== 'https://bysezoxexe.com') {
    try {
      var dRes = await fetch(origin + '/api/videos/' + encodeURIComponent(code) + '/details', {
        headers: { 'User-Agent': DEFAULT_UA, 'Referer': normalized },
        signal: timeoutSignal(8000)
      });
      if (dRes.ok) {
        var det = await dRes.json();
        if (det && det.embed_frame_url) {
          var tOrig = new URL(det.embed_frame_url).origin;
          var r2 = await fetch(tOrig + '/api/videos/' + encodeURIComponent(code), {
            headers: { 'User-Agent': DEFAULT_UA, 'Referer': det.embed_frame_url },
            signal: timeoutSignal(9000)
          });
          if (r2.ok) { videoData = await r2.json(); origin = tOrig; }
        }
      }
    } catch (e) {}
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
      var totalLen = decodedParts.reduce(function (a, b) { return a + b.length; }, 0);
      var key = new Uint8Array(totalLen);
      var off = 0;
      for (var pi = 0; pi < decodedParts.length; pi++) { key.set(decodedParts[pi], off); off += decodedParts[pi].length; }
      var plain = decryptAes256Gcm(key, base64DecodeBytes(pb.iv), base64DecodeBytes(pb.payload));
      if (plain) {
        var dec = JSON.parse(plain);
        if (dec && dec.sources) sources = dec.sources;
        if (dec && dec.tracks && tracks.length === 0) tracks = dec.tracks;
      }
    } catch (e) {}
  }
  if (!sources || sources.length === 0) return [];

  var sHdr = { 'User-Agent': DEFAULT_UA, 'Referer': origin + '/' };
  var subs = [];
  for (var ti = 0; ti < tracks.length; ti++) {
    var t = tracks[ti];
    var subU = t.file || t.url;
    if (!subU) continue;
    var lc = String(t.lang || 'tr').toLowerCase().slice(0, 2) || 'tr';
    subs.push({ id: lc + '_' + subs.length, lang: lc === 'en' ? 'eng' : 'tur', language: lc, label: t.label || (lc === 'en' ? 'English' : 'Türkçe'), url: subU, format: subU.indexOf('.srt') !== -1 ? 'srt' : 'vtt', headers: sHdr });
  }

  var prefix = opts.sourceLabel ? (opts.sourceLabel + ' • ') : '';
  var audioTag = opts.audioType === 'dub' ? 'TR Dublaj' : (opts.audioType === 'sub' ? 'TR Altyazı' : 'FileMoon');
  var out = [];
  for (var si = 0; si < sources.length; si++) {
    var src = sources[si];
    if (!src.url || src.url.indexOf('http') !== 0) continue;
    var q = src.label || (src.height ? (src.height + 'p') : '1080p');
    var isHls = (src.mime_type && src.mime_type.indexOf('mpegurl') !== -1) || src.url.indexOf('.m3u8') !== -1;
    out.push(buildNuvioStream({
      name: opts.streamName || opts.sourceLabel || 'Anthology',
      title: '⌜ ' + (opts.sourceLabel || 'Anthology') + ' ⌟ | ' + audioTag + ' • ' + q + (isHls ? ' HLS' : ' MP4'),
      url: src.url,
      quality: q,
      format: isHls ? 'hls' : 'mp4',
      isHls: isHls,
      provider: opts.provider,
      headers: sHdr,
      subtitles: subs
    }));
  }
  return out;
}

/* ==================== VIDMOLY ==================== */
async function extractVidmoly(rawUrl, opts) {
  opts = opts || {};
  var url = normalizeUrl(rawUrl);
  var idM = /(?:embed-|\/dl\/|\/)([a-zA-Z0-9]{8,20})(?:\.html)?/i.exec(url);
  var vidId = idM ? idM[1] : null;
  var candidates = [];
  if (url.indexOf('vidmoly') !== -1 && vidId && url.indexOf('embed-') === -1) {
    candidates.push('https://vidmoly.biz/embed-' + vidId + '.html');
  } else {
    candidates.push(url);
  }
  if (vidId) {
    ['vidmoly.biz', 'vidmoly.net', 'vidmoly.to'].forEach(function (h) {
      var u = 'https://' + h + '/embed-' + vidId + '.html';
      if (candidates.indexOf(u) === -1) candidates.push(u);
    });
  }

  for (var i = 0; i < candidates.length; i++) {
    var cand = candidates[i];
    var origin = 'https://vidmoly.biz';
    try { origin = new URL(cand).origin; } catch (e) {}
    try {
      var r = await fetch(cand, {
        headers: { 'User-Agent': DEFAULT_UA, 'Referer': opts.referer || (origin + '/') },
        signal: timeoutSignal(10000)
      });
      if (!r.ok) continue;
      var html = await r.text();
      var fm = /file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i.exec(html) ||
               /sources\s*:\s*\[\s*\{\s*file\s*:\s*["'](https?:\/\/[^"']+)["']/i.exec(html);
      if (!fm || !fm[1]) continue;
      var tag = opts.audioType === 'dub' ? '🇹🇷 TR Dublaj' : (opts.audioType === 'sub' ? '🌐 TR Altyazı' : 'VidMoly');
      return [buildNuvioStream({
        name: opts.streamName || opts.sourceLabel || 'Anthology',
        title: '⌜ ' + (opts.sourceLabel || 'Anthology') + ' ⌟ | VidMoly | ' + tag,
        url: fm[1],
        quality: '1080p',
        format: 'hls',
        isHls: true,
        provider: opts.provider,
        headers: { 'User-Agent': DEFAULT_UA, 'Referer': origin + '/' },
        subtitles: extractInlineVttSubtitles(html, { 'User-Agent': DEFAULT_UA, 'Referer': origin + '/' })
      })];
    } catch (e) {}
  }
  return [];
}

/* ==================== OK.RU ==================== */
async function extractOkRu(rawUrl, opts) {
  opts = opts || {};
  var url = normalizeUrl(rawUrl).replace('odnoklassniki.ru/', 'ok.ru/');
  try {
    var r = await fetch(url, {
      headers: { 'User-Agent': DEFAULT_UA, 'Referer': opts.referer || 'https://ok.ru/' },
      signal: timeoutSignal(10000)
    });
    if (!r.ok) return [];
    var html = await r.text();
    var m = /data-options=["']([^"']+)["']/i.exec(html);
    if (!m) return [];
    var outer = JSON.parse(decodeHtmlEntities(m[1]));
    var rawMeta = outer && outer.flashvars && outer.flashvars.metadata;
    var meta = typeof rawMeta === 'string' ? JSON.parse(rawMeta) : rawMeta;
    if (!meta) return [];
    var qMap = { ultra: '2160p', quad: '1440p', full: '1080p', hd: '720p', sd: '480p', low: '360p', lowest: '240p' };
    var hdrs = { 'User-Agent': DEFAULT_UA, 'Referer': 'https://ok.ru/' };
    var out = [];
    var tag = opts.audioType === 'dub' ? '🇹🇷 TR Dublaj' : (opts.audioType === 'sub' ? '🌐 TR Altyazı' : 'OK.ru');
    (meta.videos || []).forEach(function (v) {
      if (!v.url) return;
      var q = qMap[String(v.name || '').toLowerCase()] || '720p';
      out.push(buildNuvioStream({
        name: opts.streamName || opts.sourceLabel || 'Anthology',
        title: '⌜ ' + (opts.sourceLabel || 'Anthology') + ' ⌟ | OK.ru ' + q + ' | ' + tag,
        url: v.url,
        quality: q,
        format: 'mp4',
        isHls: false,
        provider: opts.provider,
        headers: hdrs
      }));
    });
    var hlsUrl = meta.hlsMasterPlaylistUrl || meta.hlsManifestUrl;
    if (hlsUrl) {
      out.push(buildNuvioStream({
        name: opts.streamName || opts.sourceLabel || 'Anthology',
        title: '⌜ ' + (opts.sourceLabel || 'Anthology') + ' ⌟ | OK.ru HLS | ' + tag,
        url: hlsUrl,
        quality: '1080p',
        format: 'hls',
        isHls: true,
        provider: opts.provider,
        headers: hdrs
      }));
    }
    return out;
  } catch (e) { return []; }
}

/* ==================== SIBNET ==================== */
async function extractSibnet(rawUrl, opts) {
  opts = opts || {};
  var url = normalizeUrl(rawUrl);
  var vm = /videoid=(\d+)/i.exec(url);
  if (vm) url = 'https://video.sibnet.ru/shell.php?videoid=' + vm[1];
  try {
    var r = await fetch(url, {
      headers: { 'User-Agent': DEFAULT_UA, 'Referer': opts.referer || 'https://video.sibnet.ru/' },
      signal: timeoutSignal(10000)
    });
    if (!r.ok) return [];
    var html = await r.text();
    var m = /player\.src\(\[\s*\{\s*src\s*:\s*["']([^"']+)["']/i.exec(html);
    if (!m || !m[1]) return [];
    var src = m[1].indexOf('http') === 0 ? m[1] : ('https://video.sibnet.ru' + (m[1].charAt(0) === '/' ? '' : '/') + m[1]);
    var tag = opts.audioType === 'dub' ? '🇹🇷 TR Dublaj' : (opts.audioType === 'sub' ? '🌐 TR Altyazı' : 'Sibnet');
    return [buildNuvioStream({
      name: opts.streamName || opts.sourceLabel || 'Anthology',
      title: '⌜ ' + (opts.sourceLabel || 'Anthology') + ' ⌟ | Sibnet MP4 | ' + tag,
      url: src,
      quality: '720p',
      format: 'mp4',
      isHls: false,
      provider: opts.provider,
      headers: { 'User-Agent': DEFAULT_UA, 'Referer': 'https://video.sibnet.ru/' }
    })];
  } catch (e) { return []; }
}

/* ==================== VIXOLITY ==================== */
async function extractVixolity(opts) {
  opts = opts || {};
  var imdbId = opts.imdbId;
  if (!imdbId || imdbId.indexOf('tt') !== 0) return [];
  var base = (opts.baseUrl || 'https://ha.vixolity.com').replace(/\/+$/, '');
  var targetUrl = opts.season !== undefined && opts.episode !== undefined
    ? (base + '/vs/' + imdbId + '/s' + opts.season + '/e' + (opts.episode < 10 ? '0' + opts.episode : opts.episode))
    : (base + '/vs/' + imdbId);
  var vixHeaders = {
    'User-Agent': DEFAULT_UA,
    'Referer': 'https://pl.vixolity.com/',
    'Origin': 'https://pl.vixolity.com',
    'Accept': '*/*'
  };
  try {
    var r = await fetch(targetUrl, { headers: vixHeaders, signal: timeoutSignal(7000) });
    if (!r.ok) return [];
    var text = await r.text();
    if (!text || text.indexOf('#EXTM3U') === -1) return [];
    var subs = [];
    var subRe = /#EXT-X-MEDIA:TYPE=SUBTITLES.*?NAME="([^"]+)".*?LANGUAGE="([^"]+)".*?URI="([^"]+)"/gi;
    var sm, seenSub = {};
    while ((sm = subRe.exec(text)) !== null) {
      if (seenSub[sm[3]]) continue;
      seenSub[sm[3]] = true;
      var lc = String(sm[2] || 'tr').toLowerCase();
      subs.push({ id: lc, lang: lc === 'tr' ? 'tur' : (lc === 'en' ? 'eng' : lc), language: lc, label: sm[1], url: sm[3], format: 'vtt', headers: vixHeaders });
    }
    var hasTr = /LANGUAGE="tr"|NAME="[^"]*Türk/i.test(text);
    var tag = hasTr ? 'Çift Ses (TR & Orijinal)' : '1080p HLS';
    return [buildNuvioStream({
      name: opts.streamName || opts.sourceLabel || 'Anthology',
      title: '⌜ ' + (opts.sourceLabel || 'Anthology') + ' ⌟ | Vixolity • ' + tag + ' (1080p HLS)',
      url: targetUrl,
      quality: '1080p',
      format: 'hls',
      isHls: true,
      provider: opts.provider,
      headers: vixHeaders,
      subtitles: subs
    })];
  } catch (e) { return []; }
}

/* ==================== PILAVYER ==================== */
async function extractPilavyer(opts) {
  opts = opts || {};
  var host = (opts.playerHost || 'https://play2.pilavyerplay.top').replace(/\/+$/, '');
  var scriptUrl = '';
  if (opts.pvId) {
    scriptUrl = host + '/assets/js/s.php?s=' + encodeURIComponent(opts.pvId);
  } else if (opts.playerUrl) {
    var pu = normalizeUrl(opts.playerUrl);
    try {
      var er = await fetch(pu, { headers: { 'User-Agent': DEFAULT_UA, 'Referer': opts.referer || pu }, signal: timeoutSignal(10000) });
      if (er.ok) {
        var eh = await er.text();
        var sm = /src=["']([^"']*assets\/js\/s\.php\?[^"']+)["']/i.exec(eh) || /\?s=([a-zA-Z0-9_-]+)/.exec(pu);
        if (sm && sm[1]) {
          var orig = new URL(pu).origin;
          scriptUrl = sm[1].indexOf('http') === 0 ? sm[1] : (sm[1].indexOf('s.php') !== -1 ? (orig + (sm[1].charAt(0) === '/' ? '' : '/') + sm[1]) : (orig + '/assets/js/s.php?s=' + encodeURIComponent(sm[1])));
        }
      }
    } catch (e) {}
  }
  if (!scriptUrl) return [];

  try {
    var scriptOrig = new URL(scriptUrl).origin;
    var jsRes = await fetch(scriptUrl, { headers: { 'User-Agent': DEFAULT_UA, 'Referer': opts.referer || (scriptOrig + '/') }, signal: timeoutSignal(10000) });
    if (!jsRes.ok) return [];
    var jsText = await jsRes.text();
    var jm = /window\.__PLAYER__\s*=\s*(\{[\s\S]*?\});/.exec(jsText);
    if (!jm) return [];
    var payload = JSON.parse(jm[1]);
    if (!payload || !payload.stream) return [];

    var sHdr = { 'User-Agent': DEFAULT_UA, 'Referer': scriptOrig + '/', 'Origin': scriptOrig };
    var cleanUrl = String(payload.stream).replace(/[?&]cdn=\d+/i, '').replace(/#.*$/, '');
    var finalUrl = cleanUrl + (cleanUrl.indexOf('?') !== -1 ? '&' : '?') + 'ext=.m3u8';
    var subs = [];
    (payload.subs || []).forEach(function (sub) {
      if (!sub || !sub.src) return;
      var su = sub.src.indexOf('http') === 0 ? sub.src : (scriptOrig + (sub.src.charAt(0) === '/' ? '' : '/') + sub.src);
      var isTr = String(sub.lang || '').toLowerCase() === 'tr' || /türkçe|tur/i.test(sub.label || '');
      subs.push({ id: sub.sid || (isTr ? 'tur' : 'eng'), lang: isTr ? 'tur' : 'eng', language: isTr ? 'tr' : 'en', label: sub.label || (isTr ? 'Türkçe' : 'English'), url: su, format: 'vtt', headers: sHdr });
    });

    var audios = Array.isArray(payload.audios) && payload.audios.length > 0 ? payload.audios : [{ label: 'Orijinal' }];
    var audioTag = 'Orijinal (TR Altyazılı)';
    if (audios.length > 1) {
      var hasTr = audios.some(function (a) { return /t[üu]rk[çc]e|\btr\b/i.test(a.label || a.name || ''); });
      audioTag = hasTr ? 'Çift Ses (TR Dublaj & Orijinal)' : 'Çoklu Ses';
    } else if (/t[üu]rk[çc]e|\btr\b/i.test(audios[0].label || audios[0].name || '')) {
      audioTag = 'Türkçe Dublaj';
    }

    return [buildNuvioStream({
      name: opts.streamName || opts.sourceLabel || 'Anthology',
      title: '⌜ ' + (opts.sourceLabel || 'Anthology') + ' ⌟ | ' + audioTag + ' • 1080p FHD',
      url: finalUrl,
      quality: '1080p',
      format: 'hls',
      isHls: true,
      provider: opts.provider,
      headers: sHdr,
      subtitles: subs
    })];
  } catch (e) { return []; }
}

/* ==================== MAIL.RU ==================== */
async function extractMailRu(rawUrl, opts) {
  opts = opts || {};
  var url = normalizeUrl(rawUrl);
  var vm = /\/embed\/(\d+)/.exec(url) || /meta\/(\d+)/.exec(url);
  var metaUrl = vm ? ('https://my.mail.ru/+/video/meta/' + vm[1]) : '';
  var ref = url.indexOf('http') === 0 ? url : 'https://my.mail.ru/';
  try {
    if (!metaUrl) {
      var r = await fetch(url, { headers: { 'User-Agent': DEFAULT_UA, 'Referer': opts.referer || 'https://my.mail.ru/' }, signal: timeoutSignal(8000) });
      if (r.ok) {
        var h = await r.text();
        var mm = /metadataUrl["']?\s*:\s*["']([^"']+)["']/.exec(h) || /(\/+\/my\.mail\.ru\/\+\/video\/meta\/[^"'\s]+)/.exec(h);
        if (mm) metaUrl = normalizeUrl(mm[1]);
      }
    }
    if (!metaUrl) return [];
    var mr = await fetch(metaUrl, { headers: { 'User-Agent': DEFAULT_UA, 'Referer': ref }, signal: timeoutSignal(8000) });
    if (!mr.ok) return [];
    var data = await mr.json();
    var out = [];
    (data.videos || []).forEach(function (v) {
      if (!v.url) return;
      var q = v.key || '720p';
      out.push(buildNuvioStream({
        name: opts.streamName || opts.sourceLabel || 'Anthology',
        title: '⌜ ' + (opts.sourceLabel || 'Anthology') + ' ⌟ | Mail.ru ' + q.toUpperCase(),
        url: normalizeUrl(v.url),
        quality: q,
        format: 'mp4',
        isHls: false,
        provider: opts.provider,
        headers: { 'User-Agent': DEFAULT_UA, 'Referer': ref }
      }));
    });
    return out;
  } catch (e) { return []; }
}

/* ==================== FASTPLAY / SETPLAY ==================== */
function spgDecode(encodedB64, keyB64) {
  try {
    var a = base64DecodeString(encodedB64);
    var b = base64DecodeString(keyB64);
    if (!a || !b) return null;
    var s = '';
    for (var i = 0; i < a.length; i++) {
      s += String.fromCharCode(a.charCodeAt(i) ^ b.charCodeAt(i % b.length));
    }
    return s.split('|')[0];
  } catch (e) { return null; }
}

async function extractFastplay(rawUrl, opts) {
  opts = opts || {};
  var url = normalizeUrl(rawUrl);
  try {
    var fpOrig = new URL(url).origin;
    var res = await fetch(url, {
      headers: { 'User-Agent': DEFAULT_UA, 'Referer': opts.referer || (fpOrig + '/') },
      signal: timeoutSignal(12000)
    });
    if (!res.ok) return [];
    var fpHtml = await res.text();
    var manMatch = /(?:src|stream)\s*:\s*["'](\/manifests\/[^"']+)["']/.exec(fpHtml);
    if (!manMatch) return [];
    var manPath = manMatch[1].replace(/&amp;/g, '&');
    var manifestUrl = manPath.indexOf('http') === 0 ? manPath : (fpOrig + manPath);
    var subs = extractInlineVttSubtitles(fpHtml, { 'User-Agent': DEFAULT_UA, 'Referer': fpOrig + '/' });
    var fpHdrs = { 'User-Agent': EXOPLAYER_UA, 'Referer': fpOrig + '/', 'Origin': fpOrig };
    return [buildNuvioStream({
      name: opts.streamName || opts.sourceLabel || 'Anthology',
      title: '⌜ ' + (opts.sourceLabel || 'Anthology') + ' ⌟ | FastPlay (1080p HLS)',
      url: manifestUrl,
      quality: '1080p',
      format: 'hls',
      isHls: true,
      provider: opts.provider,
      headers: fpHdrs,
      subtitles: subs
    })];
  } catch (e) { return []; }
}

async function extractSetplay(rawUrl, opts) {
  opts = opts || {};
  var url = normalizeUrl(rawUrl);
  try {
    var spOrig = new URL(url).origin;
    var res = await fetch(url, {
      headers: { 'User-Agent': DEFAULT_UA, 'Referer': opts.referer || (spOrig + '/') },
      signal: timeoutSignal(12000)
    });
    if (!res.ok) return [];
    var spHtml = await res.text();
    var cerMatch = /SPG\.cerceve\(\s*["'][^"']*["']\s*,\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/.exec(spHtml) ||
                   /SPG\.cerceve\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/.exec(spHtml);
    var fastplayUrl = cerMatch ? spgDecode(cerMatch[1], cerMatch[2]) : null;
    if (!fastplayUrl) {
      var fMatch = /https?:\/\/fastplay\.[a-z]+\/stfplay\.php\?[^"'<>\s\\]+/i.exec(spHtml);
      if (fMatch) fastplayUrl = fMatch[0].replace(/\\+/g, '');
    }
    if (!fastplayUrl || fastplayUrl.indexOf('http') !== 0) return [];
    return await extractFastplay(fastplayUrl, Object.assign({}, opts, { referer: res.url || url }));
  } catch (e) { return []; }
}

async function extractByEmbedUrl(rawUrl, opts) {
  opts = opts || {};
  var url = normalizeUrl(rawUrl);
  var lower = url.toLowerCase();
  if (lower.indexOf('setplay.') !== -1) return extractSetplay(url, opts);
  if (lower.indexOf('fastplay.') !== -1) return extractFastplay(url, opts);
  if (lower.indexOf('vidmoly.') !== -1) return extractVidmoly(url, opts);
  if (lower.indexOf('ok.ru') !== -1 || lower.indexOf('odnoklassniki.ru') !== -1) return extractOkRu(url, opts);
  if (lower.indexOf('sibnet.ru') !== -1) return extractSibnet(url, opts);
  if (lower.indexOf('bysezo') !== -1 || lower.indexOf('filemoon.') !== -1 || lower.indexOf('n1mwq.org') !== -1) return extractBysezo(url, opts);
  if (lower.indexOf('pilavyer') !== -1) return extractPilavyer(Object.assign({}, opts, { playerUrl: url }));
  if (lower.indexOf('mail.ru') !== -1) return extractMailRu(url, opts);
  return [];
}

module.exports = {
  DEFAULT_UA: DEFAULT_UA,
  EXOPLAYER_UA: EXOPLAYER_UA,
  decodeHtmlEntities: decodeHtmlEntities,
  base64DecodeString: base64DecodeString,
  buildNuvioStream: buildNuvioStream,
  extractInlineVttSubtitles: extractInlineVttSubtitles,
  extractBysezo: extractBysezo,
  extractVidmoly: extractVidmoly,
  extractOkRu: extractOkRu,
  extractSibnet: extractSibnet,
  extractVixolity: extractVixolity,
  extractPilavyer: extractPilavyer,
  extractMailRu: extractMailRu,
  extractFastplay: extractFastplay,
  extractSetplay: extractSetplay,
  extractByEmbedUrl: extractByEmbedUrl
};
