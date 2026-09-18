const { sortStreamsByQuality } = require("../shared/quality.js");
const { loadConfig, val, wrapAll } = require("../shared/config.js");

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v;
            v = val('urls.anime.turkanime.base'); if (v) BASE_URL = String(v).replace(/\/+$/, '');
        });
    }
    return _cfgReady;
}

/**
 * Anthology - TurkAnime Provider
 * Anime dizileri ve filmleri için doğrudan Sibnet MP4 ve ArtPlayer HLS akışları sunar.
 */

var BASE_URL = 'https://www.turkanime.tv';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Cookie': 'yasOnay=1'
};

// ---- Saf-JS crypto (tarayıcı/statik eklenti ortamı; node crypto'ya bağımlı değil) ----
// TurkAnime'nin /embed/#/url/<b64> şifreli embed formatı: {ct, iv, s} = CryptoJS AesJson.
// Şifreleme: AES-256-CBC + EvpKDF(MD5, salt) + PKCS7. Anahtar chunk 0x1a0 modülünden çıkarıldı.

var TK_EMBED_PASS = '710^8A@3@>T2}#zN5xK?kR7KNKb@-A!LzYL5~M1qU0UfdWsZoBm4UUat%}ueUv6E--*hDPPbH7K2bp9^3o41hw,khL:}Kx8080@M';

function tkGfMul(a, b) {
  var p = 0;
  while (b) {
    if (b & 1) p ^= a;
    a = (a << 1) ^ ((a & 0x80) ? 0x11b : 0);
    b >>= 1;
  }
  return p & 0xff;
}
function tkGfPow(a, e) {
  var r = 1;
  while (e > 0) {
    if (e & 1) r = tkGfMul(r, a) & 0xff;
    a = tkGfMul(a, a) & 0xff;
    e >>= 1;
  }
  return r & 0xff;
}
function tkSbox() {
  var s = new Uint8Array(256), inv = new Uint8Array(256);
  function rotl8(v, n) { return ((v << n) | (v >>> (8 - n))) & 0xff; }
  for (var p = 0; p < 256; p++) {
    var m = (p === 0) ? 0 : tkGfPow(p, 254);
    var x = m ^ rotl8(m, 1) ^ rotl8(m, 2) ^ rotl8(m, 3) ^ rotl8(m, 4) ^ 0x63;
    s[p] = x;
    inv[x] = p;
  }
  return { s: s, inv: inv };
}
var TK_SBOX = tkSbox();

function tkRotl(x, c) { return (x << c) | (x >>> (32 - c)); }

function tkMd5(input) {
  var buf = (input instanceof Uint8Array) ? input : new Uint8Array(input);
  var i = buf.byteLength >>> 0;
  var padded = new Uint8Array((i + 9 + 64) & ~63);
  padded.set(buf);
  padded[i] = 0x80;
  var bitLen = i * 8;
  var dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, bitLen >>> 0, true);
  dv.setUint32(padded.length - 4, Math.floor(bitLen / 0x100000000), true);
  var a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  var K = new Int32Array([0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8, 0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665, 0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391]);
  var sArr = new Int32Array([7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21]);
  var w = new Int32Array(16);
  for (var off = 0; off < padded.length; off += 64) {
    var a = a0, b = b0, c = c0, d = d0;
    for (var k = 0; k < 64; k++) {
      if (k < 16) { w[k] = padded[off + k * 4] | (padded[off + k * 4 + 1] << 8) | (padded[off + k * 4 + 2] << 16) | (padded[off + k * 4 + 3] << 24); }
      var f, g;
      if (k < 16) { f = (b & c) | (~b & d); g = k; }
      else if (k < 32) { f = (d & b) | (~d & c); g = (5 * k + 1) & 15; }
      else if (k < 48) { f = b ^ c ^ d; g = (3 * k + 5) & 15; }
      else { f = c ^ (b | ~d); g = (7 * k) & 15; }
      var oldA = a, oldB = b;
      a = d; d = c; c = b;
      b = (oldB + tkRotl(((oldA + f + K[k] + w[g]) | 0), sArr[k])) | 0;
    }
    a0 = (a0 + a) | 0; b0 = (b0 + b) | 0; c0 = (c0 + c) | 0; d0 = (d0 + d) | 0;
  }
  var out = new Uint8Array(16);
  var res = new Int32Array([a0, b0, c0, d0]);
  for (var r = 0; r < 4; r++) {
    out[r * 4] = res[r] & 0xff;
    out[r * 4 + 1] = (res[r] >>> 8) & 0xff;
    out[r * 4 + 2] = (res[r] >>> 16) & 0xff;
    out[r * 4 + 3] = (res[r] >>> 24) & 0xff;
  }
  return out;
}

function tkUtf8(s) {
  var out = [], i = 0;
  while (i < s.length) {
    var c = s.charCodeAt(i);
    if (c < 0x80) { out.push(c); i++; }
    else if (c < 0x800) { out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f)); i++; }
    else if (c >= 0xd800 && c < 0xdc00 && i + 1 < s.length) {
      var c2 = s.charCodeAt(i + 1);
      if (c2 >= 0xdc00 && c2 < 0xe000) {
        var cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
        i += 2; continue;
      }
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f)); i++;
    } else { out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f)); i++; }
  }
  return new Uint8Array(out);
}

function tkEvpKDF(passStr, saltU8) {
  var p = tkUtf8(passStr);
  var total = new Uint8Array(48);
  var offset = 0, prev = new Uint8Array(0);
  while (offset < 48) {
    var h = new Uint8Array(prev.length + p.length + saltU8.length);
    h.set(prev, 0);
    h.set(p, prev.length);
    h.set(saltU8, prev.length + p.length);
    prev = tkMd5(h);
    total.set(prev, offset);
    offset += 16;
  }
  return { key: total.slice(0, 32), iv: total.slice(32, 48) };
}

function tkHexToU8(h) {
  var out = new Uint8Array(h.length / 2);
  for (var i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
  return out;
}
function tkB64ToU8(b) {
  var bin = (typeof atob === 'function') ? atob(b) : '';
  var out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
  return out;
}
function tkU8ToStr(u8) {
  var s = '', i = 0;
  while (i < u8.length) {
    var b = u8[i++];
    if (b < 0x80) s += String.fromCharCode(b);
    else if (b < 0xe0) s += String.fromCharCode(((b & 0x1f) << 6) | (u8[i++] & 0x3f));
    else if (b < 0xf0) {
      var c1 = ((b & 0x0f) << 12) | ((u8[i++] & 0x3f) << 6) | (u8[i++] & 0x3f);
      s += String.fromCharCode(c1);
    } else {
      var cp = ((b & 7) << 18) | ((u8[i++] & 0x3f) << 12) | ((u8[i++] & 0x3f) << 6) | (u8[i++] & 0x3f);
      s += String.fromCodePoint(cp);
    }
  }
  return s;
}
function tkU8FromStr(s) { return tkUtf8(s); }

function tkAesExpandKey(keyU8) {
  var sbox = TK_SBOX.s;
  var Nk = 8, Nr = 14, Nb = 4;
  var w = new Uint8Array(4 * Nb * (Nr + 1));
  w.set(keyU8, 0);
  var Rcon = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d];
  var i = Nk;
  while (i < Nb * (Nr + 1)) {
    var temp = new Uint8Array(4);
    temp[0] = w[(i - 1) * 4]; temp[1] = w[(i - 1) * 4 + 1]; temp[2] = w[(i - 1) * 4 + 2]; temp[3] = w[(i - 1) * 4 + 3];
    if (i % Nk === 0) {
      var t = temp[0];
      temp[0] = sbox[temp[1]] ^ Rcon[(i / Nk) - 1];
      temp[1] = sbox[temp[2]];
      temp[2] = sbox[temp[3]];
      temp[3] = sbox[t];
    } else if (i % Nk === 4) {
      temp[0] = sbox[temp[0]]; temp[1] = sbox[temp[1]]; temp[2] = sbox[temp[2]]; temp[3] = sbox[temp[3]];
    }
    for (var j = 0; j < 4; j++) {
      w[i * 4 + j] = w[(i - Nk) * 4 + j] ^ temp[j];
    }
    i++;
  }
  return w;
}

function tkAesDecryptBlock(state, rk, Nr) {
  var sbox = TK_SBOX.inv;
  function addRoundKey(s, k) {
    for (var i = 0; i < 16; i++) s[i] ^= k[i];
  }
  function invShiftRows(s) {
    return new Uint8Array([s[0], s[13], s[10], s[7], s[4], s[1], s[14], s[11], s[8], s[5], s[2], s[15], s[12], s[9], s[6], s[3]]);
  }
  function invSubBytes(s) {
    for (var i = 0; i < 16; i++) s[i] = sbox[s[i]];
  }
  function gfMul(a, b) {
    var p = 0;
    while (b) { if (b & 1) p ^= a; a = (a << 1) ^ ((a & 0x80) ? 0x11b : 0); b >>= 1; }
    return p & 0xff;
  }
  function invMixColumns(s) {
    var t = new Uint8Array(16);
    for (var c = 0; c < 4; c++) {
      var o = c * 4;
      var a0 = s[o], a1 = s[o + 1], a2 = s[o + 2], a3 = s[o + 3];
      t[o]     = gfMul(a0, 14) ^ gfMul(a1, 11) ^ gfMul(a2, 13) ^ gfMul(a3, 9);
      t[o + 1] = gfMul(a0, 9) ^ gfMul(a1, 14) ^ gfMul(a2, 11) ^ gfMul(a3, 13);
      t[o + 2] = gfMul(a0, 13) ^ gfMul(a1, 9) ^ gfMul(a2, 14) ^ gfMul(a3, 11);
      t[o + 3] = gfMul(a0, 11) ^ gfMul(a1, 13) ^ gfMul(a2, 9) ^ gfMul(a3, 14);
    }
    return t;
  }
  addRoundKey(state, rk.subarray(Nr * 16, (Nr + 1) * 16));
  for (var rnd = Nr - 1; rnd > 0; rnd--) {
    state = invShiftRows(state);
    invSubBytes(state);
    addRoundKey(state, rk.subarray(rnd * 16, (rnd + 1) * 16));
    state = invMixColumns(state);
  }
  state = invShiftRows(state);
  invSubBytes(state);
  addRoundKey(state, rk.subarray(0, 16));
  return state;
}

function tkAesCbcDecrypt(keyU8, ivU8, ctU8) {
  var rk = tkAesExpandKey(keyU8);
  var out = new Uint8Array(ctU8.length);
  var prev = new Uint8Array(ivU8);
  var state = new Uint8Array(16);
  for (var off = 0; off < ctU8.length; off += 16) {
    for (var i = 0; i < 16; i++) state[i] = ctU8[off + i];
    state = tkAesDecryptBlock(state, rk, 14);
    for (var j = 0; j < 16; j++) {
      out[off + j] = state[j] ^ prev[j];
      prev[j] = ctU8[off + j];
    }
  }
  var pad = out[out.length - 1];
  if (pad > 0 && pad <= 16) {
    var ok = true;
    for (var z = out.length - pad; z < out.length; z++) {
      if (out[z] !== pad) { ok = false; break; }
    }
    if (ok) return out.slice(0, out.length - pad);
  }
  return out;
}

function tkDecryptEmbed(b64Json) {
  if (!b64Json) return '';
  var j;
  try { j = JSON.parse(tkB64ToStr(b64Json)); } catch (e) { return ''; }
  if (!j || !j.ct || !j.iv || !j.s) return '';
  var salt = tkHexToU8(j.s);
  var iv = tkHexToU8(j.iv);
  var pt = tkAesCbcDecrypt(tkEvpKDF(TK_EMBED_PASS, salt).key, iv, tkB64ToU8(j.ct));
  var txt = tkU8ToStr(pt);
  txt = txt.replace(/\\\//g, '/').replace(/^"|"$/g, '');
  return txt;
}
function tkB64ToStr(b) {
  try {
    if (typeof atob === 'function') return atob(b);
    if (typeof Buffer !== 'undefined') return Buffer.from(b, 'base64').toString('utf8');
  } catch (e) {}
  return '';
}
function tkU8ToB64(u8) {
  var bin = '';
  for (var i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  if (typeof btoa === 'function') return btoa(bin);
  if (typeof Buffer !== 'undefined') return Buffer.from(u8).toString('base64');
  return '';
}

function ultraClean(str) {
  if (!str) return '';
  return str.toString().toLowerCase()
    .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function toSlug(str) {
  if (!str) return '';
  return str.toString().toLowerCase()
    .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function resolveKitsu(kitsuId) {
  try {
    const cleanId = String(kitsuId).replace(/^kitsu:/, '').split(':')[0];
    const res = await fetch(`https://kitsu.io/api/edge/anime/${cleanId}`);
    if (!res.ok) return null;
    const data = await res.json();
    const attr = data && data.data && data.data.attributes;
    if (!attr) return null;
    const titles = [];
    if (attr.titles) {
      if (attr.titles.en_jp) titles.push(attr.titles.en_jp);
      if (attr.titles.en) titles.push(attr.titles.en);
      if (attr.titles.en_us) titles.push(attr.titles.en_us);
    }
    if (attr.canonicalTitle && !titles.includes(attr.canonicalTitle)) {
      titles.push(attr.canonicalTitle);
    }
    if (Array.isArray(attr.abbreviatedTitles)) {
      titles.push(...attr.abbreviatedTitles);
    }
    return {
      title: attr.canonicalTitle || titles[0] || '',
      origTitle: (attr.titles && attr.titles.en_jp) || titles[0] || '',
      queries: [...new Set(titles.filter(Boolean))]
    };
  } catch (e) {
    return null;
  }
}

async function resolveMediaInfo(idOrObj, mediaType, defaultSeason, defaultEpisode) {
  let id = idOrObj;
  let type = mediaType || 'tv';
  let season = parseInt(defaultSeason) || 1;
  let episode = parseInt(defaultEpisode) || 1;

  if (typeof idOrObj === 'object' && idOrObj !== null) {
    id = idOrObj.id || idOrObj.imdbId || idOrObj.tmdbId || '';
    type = idOrObj.type || type;
    if (idOrObj.season !== undefined) season = parseInt(idOrObj.season) || season;
    if (idOrObj.episode !== undefined) episode = parseInt(idOrObj.episode) || episode;
  }

  id = String(id || '').trim();
  const isTv = (type === 'tv' || type === 'series');

  if (id.includes(':')) {
    const parts = id.split(':');
    if (id.startsWith('kitsu:')) {
      season = 1;
      episode = parts.length >= 3 ? (parseInt(parts[2]) || 1) : (parseInt(parts[1]) || 1);
    } else {
      if (parts.length >= 3) {
        season = parseInt(parts[parts.length - 2]) || season;
        episode = parseInt(parts[parts.length - 1]) || episode;
      } else if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
        episode = parseInt(parts[1]) || episode;
      }
    }
  }

  if (id.startsWith('kitsu:')) {
    const kitsuData = await resolveKitsu(id);
    if (kitsuData) {
      return {
        numericId: null,
        title: kitsuData.title,
        origTitle: kitsuData.origTitle,
        queries: kitsuData.queries,
        season,
        episode,
        isTv
      };
    }
  }

  let cleanId = id;
  if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];

  let numericId = null;
  let title = '';
  let origTitle = '';
  const queries = [];

  if (cleanId.startsWith('tt')) {
    try {
      const fRes = await fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
      if (fRes.ok) {
        const fData = await fRes.json();
        const item = isTv ? (fData.tv_results && fData.tv_results[0]) : (fData.movie_results && fData.movie_results[0]);
        if (item) {
          numericId = item.id;
          title = item.name || item.title || '';
          origTitle = item.original_name || item.original_title || '';
        } else {
          const revItem = isTv ? (fData.movie_results && fData.movie_results[0]) : (fData.tv_results && fData.tv_results[0]);
          if (revItem) {
            numericId = revItem.id;
            title = revItem.name || revItem.title || '';
            origTitle = revItem.original_name || revItem.original_title || '';
          }
        }
      }
    } catch (e) {}
  } else if (!isNaN(parseInt(cleanId))) {
    numericId = parseInt(cleanId);
  }

  if (numericId) {
    const endpointType = isTv ? 'tv' : 'movie';
    try {
      const [resEn, resTr] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/${endpointType}/${numericId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=alternative_titles`),
        fetch(`https://api.themoviedb.org/3/${endpointType}/${numericId}?api_key=${TMDB_API_KEY}&language=tr-TR`)
      ]);

      let dataEn = resEn.ok ? await resEn.json() : null;
      let dataTr = resTr.ok ? await resTr.json() : null;

      if (!dataEn && !dataTr && isTv) {
        const mRes = await fetch(`https://api.themoviedb.org/3/movie/${numericId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=alternative_titles`);
        if (mRes.ok) dataEn = await mRes.json();
      }

      if (dataEn) {
        const nameEn = dataEn.name || dataEn.title || '';
        if (nameEn) queries.push(nameEn);
        const origName = dataEn.original_name || dataEn.original_title || '';
        if (origName && /^[a-zA-Z0-9\s:;.,'\"!?-]+$/.test(origName)) {
          queries.push(origName);
        }
        title = nameEn || title;
        origTitle = origName || origTitle;

        const alts = dataEn.alternative_titles ? (dataEn.alternative_titles.results || dataEn.alternative_titles.titles || []) : [];
        for (const a of alts) {
          const t = a.title || a.name || '';
          if (t && /^[a-zA-Z0-9\s:;.,'\"!?-]+$/.test(t) && !queries.includes(t)) {
            queries.push(t);
          }
        }
      }

      if (dataTr) {
        const nameTr = dataTr.name || dataTr.title || '';
        if (nameTr && !queries.includes(nameTr)) {
          queries.push(nameTr);
        }
      }
    } catch (e) {}
  }

  return {
    numericId,
    title,
    origTitle,
    queries: [...new Set(queries.filter(Boolean))],
    season,
    episode,
    isTv
  };
}

async function resolveSibnet(iframeUrl) {
  try {
    const fullUrl = iframeUrl.startsWith('//') ? 'https:' + iframeUrl : iframeUrl;
    const res = await fetch(fullUrl, {
      headers: {
        'User-Agent': HEADERS['User-Agent'],
        'Referer': BASE_URL + '/'
      }
    });
    const html = await res.text();
    const m = html.match(/player\.src\(\[\{src:\s*["']([^"']+)["']/);
    if (m) {
      const videoPath = m[1];
      const videoUrl = videoPath.startsWith('http') ? videoPath : `https://video.sibnet.ru${videoPath}`;
      return {
        url: videoUrl,
        headers: {
          'Referer': 'https://video.sibnet.ru/',
          'User-Agent': HEADERS['User-Agent']
        }
      };
    }
  } catch (e) {}
  return null;
}

// YourUpload embed → doğrudan vidcache.net MP4
async function resolveYourUpload(iframeUrl, referer) {
  try {
    const fullUrl = iframeUrl.startsWith('http') ? iframeUrl : (iframeUrl.startsWith('//') ? 'https:' + iframeUrl : BASE_URL + iframeUrl);
    const res = await fetch(fullUrl, {
      headers: {
        'User-Agent': HEADERS['User-Agent'],
        'Referer': referer || BASE_URL + '/'
      },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/file\s*:\s*['"]([^'"]+\.mp4[^'"]*)['"]/i) ||
              html.match(/['"]((?:https?:)?\/\/[^"']*vidcache\.net[^"']+)['"]/i);
    if (!m) return null;
    let url = m[1];
    if (url.startsWith('//')) url = 'https:' + url;
    return {
      url: url,
      headers: {
        'Referer': fullUrl,
        'User-Agent': HEADERS['User-Agent']
      }
    };
  } catch (e) {}
  return null;
}

// /embed/#/url/<b64> → AES çöz → /player/<token> → apiURL → /sources/<token>/ → stream
async function resolveEmbedStream(embedSrc, epHref) {
  try {
    if (!embedSrc || !embedSrc.includes('/embed/#/url/')) return null;
    let b64 = embedSrc.split('/url/')[1];
    if (!b64) return null;
    b64 = b64.split('?')[0].split('#')[0];
    const decrypted = tkDecryptEmbed(b64);
    if (!decrypted) return null;

    // Harici ayna (YourUpload vb.) doğrudan şifreli embed içinde olabilir
    if (decrypted.includes('yourupload.com')) {
      const yu = await resolveYourUpload(decrypted, epHref || BASE_URL + '/');
      if (yu && yu.url) {
        return {
          name: 'TurkAnime - YourUpload',
          title: 'TurkAnime | YourUpload [MP4]',
          url: yu.url,
          quality: '1080p',
          headers: yu.headers,
          behaviorHints: {
            notWebReady: true,
            proxyHeaders: {
              request: yu.headers
            }
          }
        };
      }
      return null;
    }

    if (!decrypted.includes('/player/')) return null;
    const token = decrypted.split('/player/')[1].split(/[?#]/)[0];
    if (!token) return null;

    const pRes = await fetch(`${BASE_URL}/player/${token}`, {
      headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' })
    });
    if (!pRes.ok) return null;
    const pHtml = await pRes.text();

    let apiURL = '';
    const apiMatch = pHtml.match(/apiURL\s*=\s*['"]([^'"]+)['"]/i);
    if (apiMatch) {
      apiURL = apiMatch[1].replace(/&#34;|&quot;/g, '');
    }
    if (!apiURL || apiURL.includes('undefined')) return null;
    apiURL = apiURL.trim();
    if (apiURL.startsWith('//')) apiURL = 'https:' + apiURL;
    else if (apiURL.startsWith('/')) apiURL = BASE_URL + apiURL;
    if (!/^https?:\/\//.test(apiURL)) return null;
    apiURL = apiURL.replace(/\/+$/, '') + '/';

    const sRes = await fetch(apiURL, {
      headers: Object.assign({}, HEADERS, {
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${BASE_URL}/player/${token}`,
        'Origin': BASE_URL,
        'Accept': 'application/json, text/javascript, */*; q=0.01'
      })
    });
    const txt = await sRes.text();
    let json = null;
    try { json = JSON.parse(txt); } catch (e) {}
    if (!json) return null;

    // Başarılı yapı: {"response": {"status": true, "stream": {"url": ..., "mimeType": ...}}}
    const resp = (json.response && typeof json.response === 'object') ? json.response : json;
    if (!(resp.status === true || resp.status === 'true')) return null;

    const st = (resp.stream && typeof resp.stream === 'object') ? resp.stream : resp;
    let url = st.url || st.file || resp.url || resp.file || '';
    if (!url && Array.isArray(st.sources) && st.sources.length > 0) {
      url = st.sources[0].url || '';
    }
    if (!url) return null;
    if (url.startsWith('//')) url = 'https:' + url;

    const isHls = /\.m3u8/i.test(url) || /mimeType/i.test(JSON.stringify(st)) && /mpegurl/i.test(String(st.mimeType || ''));
    const ref = /^https?:/.test(url) ? url : apiURL;
    return {
      name: 'TurkAnime - Fansub',
      title: isHls ? 'TurkAnime | Fansub [HLS]' : 'TurkAnime | Fansub [MP4]',
      url: url,
      quality: isHls ? 'HD' : '1080p',
      headers: {
        'Referer': ref,
        'User-Agent': HEADERS['User-Agent']
      },
      behaviorHints: {
        notWebReady: true,
        proxyHeaders: {
          request: {
            'Referer': ref,
            'User-Agent': HEADERS['User-Agent']
          }
        }
      }
    };
  } catch (e) {
    return null;
  }
}

async function getCatalog(args) {
  try {
    const query = (args && args.search) || (args && args.extra && args.extra.search) || (args && args.query) || '';
    const metas = [];
    const seen = new Set();

    if (query) {
      const searchRes = await fetch(`${BASE_URL}/arama`, {
        method: 'POST',
        headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
        body: `arama=${encodeURIComponent(query)}`
      });
      if (searchRes.ok) {
        const searchHtml = await searchRes.text();
        const itemRegex = /<div[^>]*class=["'][^"']*panel-title[^"']*["'][^>]*>\s*<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
        let match;
        while ((match = itemRegex.exec(searchHtml)) !== null) {
          const h = match[1];
          const t = match[2].replace(/<[^>]+>/g, '').trim();
          let cleanHref = h.startsWith('//') ? 'https:' + h : h;
          const slug = cleanHref.replace(/https?:\/\/www\.turkanime\.tv\/anime\//, '').replace(/^\//, '').replace(/\/$/, '');
          if (!slug || seen.has(slug)) continue;
          seen.add(slug);

          metas.push({
            id: `turkanime:anime:${slug}`,
            type: 'tv',
            name: t,
            poster: 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
            background: 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
            genres: ['Anime', 'TurkAnime'],
            description: `${t} - TurkAnime TV`
          });
        }
        return { metas };
      }
    }

    const res = await fetch(BASE_URL + '/', { headers: HEADERS });
    if (!res.ok) return { metas: [] };
    const html = await res.text();

    const matches = [...html.matchAll(/<a\b([^>]*)data-title=["']([^"']+)["']([^>]*)>/gi)];

    for (const m of matches) {
      const combinedAttrs = m[1] + m[3];
      const hMatch = combinedAttrs.match(/href=["']([^"']+)["']/i);
      const imgMatch = combinedAttrs.match(/data-img=["']([^"']+)["']/i);
      const title = m[2].trim();
      if (hMatch && title) {
        let href = hMatch[1];
        if (href.startsWith('//')) href = 'https:' + href;
        const slug = href.replace(/https?:\/\/www\.turkanime\.tv\/anime\//, '').replace(/^\//, '').replace(/\/$/, '');
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);

        let poster = imgMatch ? imgMatch[1] : '';
        if (poster.startsWith('//')) poster = 'https:' + poster;
        if (!poster) poster = 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';

        metas.push({
          id: `turkanime:anime:${slug}`,
          type: 'tv',
          name: title,
          poster: poster,
          background: poster,
          genres: ['Anime', 'TurkAnime'],
          description: `${title} - TurkAnime TV`
        });
      }
    }

    return { metas };
  } catch (e) {
    return { metas: [] };
  }
}

async function getMeta(args) {
  try {
    const rawId = (typeof args === 'string') ? args : (args && args.id ? args.id : '');
    if (!rawId || !rawId.startsWith('turkanime:')) return { meta: null };

    const slug = rawId.replace(/^turkanime:(?:anime:|ep:)?/, '');
    const animeHref = `${BASE_URL}/anime/${slug}`;
    const detRes = await fetch(animeHref, { headers: HEADERS });
    if (!detRes.ok) return { meta: null };
    const detHtml = await detRes.text();

    const titleMatch = detHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || detHtml.match(/<title>([^<]+)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Anime';
    const title = rawTitle.replace(/\s*izle\s*\|.*$/i, '').trim();

    const posterMatch = detHtml.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i) ||
                        detHtml.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                        detHtml.match(/src=["']([^"']*serilerb\/[^"']+)["']/i);
    let poster = posterMatch ? posterMatch[1] : '';
    if (poster.startsWith('//')) poster = 'https:' + poster;
    if (!poster) poster = 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';

    const videos = [];
    const ajaxMatch = detHtml.match(/ajax\/bolumler&animeId=(\d+)/i);
    if (ajaxMatch) {
      try {
        const tokenMatch = detHtml.match(/<meta[^>]*name=["']_token["'][^>]*content=["']([^"']+)["']/i) ||
                           detHtml.match(/token\s*=\s*['"]([^'"]+)['"]/);
        const token = tokenMatch ? tokenMatch[1] : '';
        const bolumlerUrl = `${BASE_URL}/${ajaxMatch[0]}`;
        const bRes = await fetch(bolumlerUrl, {
          headers: Object.assign({}, HEADERS, {
            'X-Requested-With': 'XMLHttpRequest',
            'token': token,
            'Referer': animeHref
          })
        });
        if (bRes.ok) {
          const bHtml = await bRes.text();
          const epRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
          let m;
          const seen = new Set();
          while ((m = epRegex.exec(bHtml)) !== null) {
            const attrs = m[1];
            const text = m[2].replace(/<[^>]+>/g, '').trim();
            if (attrs.includes('/video/')) {
              const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
              if (hrefMatch) {
                const rawUrl = hrefMatch[1];
                const epSlug = rawUrl.replace(/^.*?\/video\//, '').replace(/\/$/, '');
                if (epSlug && !seen.has(epSlug)) {
                  seen.add(epSlug);
                  const bolumMatch = text.match(/(\d+)\s*\.?\s*(?:bölüm|bolum)/i) || epSlug.match(/-(\d+)-bolum/i);
                  const epNum = bolumMatch ? parseInt(bolumMatch[1]) : (videos.length + 1);
                  const sezonMatch = text.match(/(\d+)\s*\.?\s*(?:sezon|season)/i);
                  const seasonNum = sezonMatch ? parseInt(sezonMatch[1]) : 1;
                  videos.push({
                    id: `turkanime:ep:${epSlug}`,
                    title: `${epNum}. Bölüm`,
                    season: seasonNum,
                    episode: epNum
                  });
                }
              }
            }
          }
          videos.sort((a, b) => a.episode - b.episode);
        }
      } catch (e) {}
    }

    return {
      meta: {
        id: rawId,
        type: 'tv',
        name: title,
        poster: poster,
        background: poster,
        description: `${title} - TurkAnime TV`,
        genres: ['Anime', 'TurkAnime'],
        videos: videos
      }
    };
  } catch (e) {
    return { meta: null };
  }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  try {
    let epHref = null;
    let animeHref = null;

    if (typeof tmdbId === 'string' && tmdbId.startsWith('turkanime:ep:')) {
      const epSlug = tmdbId.replace(/^turkanime:ep:/, '').replace(/^\//, '');
      epHref = `${BASE_URL}/video/${epSlug}`;
    } else if (typeof tmdbId === 'string' && tmdbId.startsWith('turkanime:')) {
      const slug = tmdbId.replace(/^turkanime:(?:anime:|ep:)?/, '');
      animeHref = `${BASE_URL}/anime/${slug}`;
    }

    const info = await resolveMediaInfo(tmdbId, mediaType, seasonNum, episodeNum);
    const finalEpisode = info.episode;
    const finalSeason = info.season;

    if (!animeHref && !epHref) {
      const queries = info.queries;
      if (!queries || queries.length === 0) return [];

      // 1. Direct slug prediction across all queries (Romaji, English, etc.)
      const slugCandidates = [];
      for (const q of queries) {
        const s = toSlug(q);
        if (s && s.length >= 2 && !slugCandidates.includes(s)) {
          slugCandidates.push(s);
          if (q.includes(':') || q.includes('-')) {
            const base = toSlug(q.split(/[:\-]/)[0]);
            if (base && base.length >= 2 && !slugCandidates.includes(base)) {
              slugCandidates.push(base);
            }
          }
        }
      }

      for (const s of slugCandidates) {
        const testUrl = `${BASE_URL}/anime/${s}`;
        try {
          const tRes = await fetch(testUrl, { headers: HEADERS });
          if (tRes.ok) {
            const tHtml = await tRes.text();
            if (tHtml.includes('ajax/bolumler&animeId=')) {
              animeHref = testUrl;
              break;
            }
          }
        } catch (e) {}
      }

      // 2. Search fallback
      if (!animeHref) {
        for (const q of queries.slice(0, 6)) {
          try {
            const searchRes = await fetch(`${BASE_URL}/arama`, {
              method: 'POST',
              headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
              body: `arama=${encodeURIComponent(q)}`
            });
            if (!searchRes.ok) continue;
            const searchHtml = await searchRes.text();
            const itemRegex = /<div[^>]*class=["'][^"']*panel-title[^"']*["'][^>]*>\s*<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
            let match;
            const candidates = [];
            const qClean = ultraClean(q);
            while ((match = itemRegex.exec(searchHtml)) !== null) {
              const h = match[1];
              const t = match[2].replace(/<[^>]+>/g, '').trim();
              candidates.push({ href: h, title: t });
              const cClean = ultraClean(t);
              if (cClean === qClean || (qClean && cClean.includes(qClean)) || (cClean && qClean.includes(cClean))) {
                animeHref = h;
                break;
              }
            }
            if (animeHref) break;
            if (!animeHref && candidates.length > 0) {
              animeHref = candidates[0].href;
              break;
            }
          } catch (e) {}
        }
      }
    }

    if (!epHref) {
      if (!animeHref) return [];
      if (animeHref.startsWith('//')) animeHref = 'https:' + animeHref;
      else if (!animeHref.startsWith('http')) animeHref = `${BASE_URL}/${animeHref.replace(/^\//, '')}`;

      const detRes = await fetch(animeHref, { headers: HEADERS });
      if (!detRes.ok) return [];
      const detHtml = await detRes.text();

      const ajaxMatch = detHtml.match(/ajax\/bolumler&animeId=(\d+)/i);
      if (!ajaxMatch) return [];

      const tokenMatch = detHtml.match(/<meta[^>]*name=["']_token["'][^>]*content=["']([^"']+)["']/i) ||
                         detHtml.match(/token\s*=\s*['"]([^'"]+)['"]/);
      const token = tokenMatch ? tokenMatch[1] : '';

      const bolumlerUrl = `${BASE_URL}/${ajaxMatch[0]}`;
      const bRes = await fetch(bolumlerUrl, {
        headers: Object.assign({}, HEADERS, {
          'X-Requested-With': 'XMLHttpRequest',
          'token': token,
          'Referer': animeHref
        })
      });
      if (!bRes.ok) return [];
      const bHtml = await bRes.text();

      const epRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
      let epMatch;
      const candidates = [];

      while ((epMatch = epRegex.exec(bHtml)) !== null) {
        const attrs = epMatch[1];
        const text = epMatch[2].replace(/<[^>]+>/g, '').trim();
        if (attrs.includes('/video/')) {
          const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
          const titleMatch = attrs.match(/title=["']([^"']+)["']/i);
          if (hrefMatch) {
            const h = hrefMatch[1];
            const t = titleMatch ? titleMatch[1] : text;
            candidates.push({ href: h, text: t });

            const epNumMatch = t.match(/(\d+)\s*\.?\s*(?:bölüm|bolum)/i) ||
                               h.match(/-(\d+)-bolum/i) ||
                               text.match(/(\d+)\s*$/);
            if (epNumMatch && parseInt(epNumMatch[1]) === finalEpisode) {
              epHref = h;
              break;
            }
          }
        }
      }

      if (!epHref && candidates.length > 0) {
        if (!info.isTv || candidates.length === 1 || finalEpisode === 1) {
          epHref = candidates[0].href;
        }
      }
    }

    if (!epHref) return [];
    if (epHref.startsWith('//')) epHref = 'https:' + epHref;
    else if (!epHref.startsWith('http')) epHref = `${BASE_URL}/${epHref.replace(/^\//, '')}`;

    const epRes = await fetch(epHref, { headers: HEADERS });
    if (!epRes.ok) return [];
    const epHtml = await epRes.text();

    const icerikRegex = /IndexIcerik\('([^']+)'/gi;
    let iMatch;
    const playerUrls = [];
    while ((iMatch = icerikRegex.exec(epHtml)) !== null) {
      const rel = iMatch[1];
      if (rel.includes('videosec')) {
        playerUrls.push(rel.startsWith('http') ? rel : `${BASE_URL}/${rel.replace(/^\//, '')}`);
      }
    }

    const streams = [];
    const seenUrls = new Set();

    for (const pUrl of playerUrls.slice(0, 5)) {
      try {
        const pRes = await fetch(pUrl, {
          headers: Object.assign({}, HEADERS, {
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': epHref
          })
        });
        if (!pRes.ok) continue;
        const pHtml = await pRes.text();

        // 1. Direct ArtPlayer M3U8
        const artMatch = pHtml.match(/class=["'][^"']*artplayer-app[^"']*["'][^>]*data-url=["']([^"']+)["']/i) ||
                         pHtml.match(/data-url=["']([^"']+\.m3u8[^"']*)["']/i);
        if (artMatch && !seenUrls.has(artMatch[1])) {
          seenUrls.add(artMatch[1]);
          streams.push({
            name: 'TurkAnime - HLS',
            title: 'TurkAnime | HLS [HD]',
            url: artMatch[1],
            quality: 'HD',
            headers: { 'Referer': pUrl }
          });
        }

        // 2. Direct Sibnet iframe
        const allIframes = [...pHtml.matchAll(/<iframe[^>]*src=["']([^"']+)["']/gi)].map(m => m[1]);
        const ifrMatch = allIframes[0] ? { 1: allIframes[0] } : null;
        if (ifrMatch && (ifrMatch[1].includes('sibnet.ru') || ifrMatch[1].includes('shell.php'))) {
          const sib = await resolveSibnet(ifrMatch[1]);
          if (sib && sib.url && !seenUrls.has(sib.url)) {
            seenUrls.add(sib.url);
            streams.push({
              name: 'TurkAnime - Sibnet',
              title: 'TurkAnime | Sibnet [1080p MP4]',
              url: sib.url,
              quality: '1080p',
              headers: sib.headers,
              behaviorHints: {
                notWebReady: true,
                proxyHeaders: {
                  request: sib.headers
                }
              }
            });
          }
        }

        // 2b. Şifreli fansub embed (yeni format): /embed/#/url/<b64>
        const embedSrc = allIframes.find(f => f.includes('/embed/#/url/'));
        if (embedSrc) {
          const emb = await resolveEmbedStream(embedSrc, epHref);
          if (emb && emb.url && !seenUrls.has(emb.url)) {
            seenUrls.add(emb.url);
            streams.push(emb);
          }
        }

        // 2c. Doğrudan YourUpload embed (direct mp4)
        const yuSrc = allIframes.find(f => f.includes('yourupload.com') && f.includes('/embed/'));
        if (yuSrc) {
          const yu = await resolveYourUpload(yuSrc, epHref);
          if (yu && yu.url && !seenUrls.has(yu.url)) {
            seenUrls.add(yu.url);
            streams.push({
              name: 'TurkAnime - YourUpload',
              title: 'TurkAnime | YourUpload [MP4]',
              url: yu.url,
              quality: '1080p',
              headers: yu.headers,
              behaviorHints: {
                notWebReady: true,
                proxyHeaders: {
                  request: yu.headers
                }
              }
            });
          }
        }

        // 3. SIBNET Button search directly inside pHtml
        const sibButtons = [...pHtml.matchAll(/IndexIcerik\(\s*['"]([^'"]+)['"][\s\S]*?SIBNET/gi)].map(m => m[1]);
        for (const sRel of sibButtons) {
          const sFull = `${BASE_URL}/${sRel.replace(/^\//, '')}`;
          const sRes = await fetch(sFull, {
            headers: Object.assign({}, HEADERS, {
              'X-Requested-With': 'XMLHttpRequest',
              'Referer': epHref
            })
          });
          if (!sRes.ok) continue;
          const sHtml = await sRes.text();
          const sIfr = sHtml.match(/<iframe[^>]*src=["']([^"']+)["']/i);
          if (sIfr && (sIfr[1].includes('sibnet.ru') || sIfr[1].includes('shell.php'))) {
            const sib = await resolveSibnet(sIfr[1]);
            if (sib && sib.url && !seenUrls.has(sib.url)) {
              seenUrls.add(sib.url);
              streams.push({
                name: 'TurkAnime - Sibnet',
                title: 'TurkAnime | Sibnet [1080p MP4]',
                url: sib.url,
                quality: '1080p',
                headers: sib.headers,
                behaviorHints: {
                  notWebReady: true,
                  proxyHeaders: {
                    request: sib.headers
                  }
                }
              });
              break;
            }
          }
        }

        if (streams.length > 0) break;
      } catch (e) {}
    }

    return streams;
  } catch (err) {
    return [];
  }
}

// ── Universal Quality Sorter ──────────────────────────────────────────
if (typeof getStreams === "function") {
    var _origGetStreams = getStreams;
    getStreams = async function() {
        var res = await _origGetStreams.apply(this, arguments);
        return sortStreamsByQuality(res);
    };
}

if (typeof module !== 'undefined') module.exports = wrapAll({ getStreams, getCatalog, getMeta }, cfgReady);
if (typeof globalThis !== 'undefined') {
  globalThis.getStreams = getStreams;
  globalThis.getCatalog = getCatalog;
  globalThis.getMeta = getMeta;
}
