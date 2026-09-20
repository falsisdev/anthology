/**
 * Anthology - Series Identity Resolution Module
 * Fully dynamic, zero hand-maintained dictionaries.
 *
 * Nuvio's bundled CineMata/TMDB metadata layer passes a variety of ID shapes
 * (numeric TMDB id, IMDb id, prefixed forms, colon separated season:episode,
 * raw titles). This module resolves ANY of them through the public TMDB API
 * (find/details/external_ids/translations/alternative_titles/search) into a
 * set of searchable titles that provider sites can be queried with.
 *
 * No per-show data is hardcoded: what TMDB does not carry about a title is
 * derived from the provider's own site search, never from static maps.
 *
 * Everything here is plain ES2015+ / QuickJS compatible (var, no optional
 * chaining, no Node-only builtins). Duplicated into every provider bundle at
 * build time.
 */

var TMDB_API_BASE = 'https://api.themoviedb.org/3';

/**
 * Normalize a raw id coming from Nuvio/Stremio into { id, kind, season, episode }.
 * Handles object args indirectly via callers; here we work on strings.
 * Prefixes: cinemata: / cine: / tmdb: / tvdb: / imdb: / metadata: / id: / mal:
 * Formats: "213194", "tt13410526", "213194:1:2", "tt13410526:1:2",
 *          "cinemata:213194:1:2", "id:213194:1:2", and raw titles.
 */
function normalizeSeriesId(raw) {
  var out = { id: '', kind: 'unknown', season: 0, episode: 0 };
  if (typeof raw !== 'string') return out;
  var val = raw.trim();
  var seg = val.split(':');
  if (seg.length >= 3 && /^\d+$/.test(seg[seg.length - 1]) && /^\d+$/.test(seg[seg.length - 2])) {
    out.season = parseInt(seg[seg.length - 2], 10);
    out.episode = parseInt(seg[seg.length - 1], 10);
    seg = seg.slice(0, seg.length - 2);
    val = seg.join(':');
  } else if (seg.length === 2 && /^\d+$/.test(seg[1])) {
    out.episode = parseInt(seg[1], 10);
    val = seg[0];
  }
  var core = String(val).trim();
  core = core.replace(/^(cinemata|cine|tmdb|tvdb|imdb|metadata|mal|id|movieid|seriesid|showid|slug|tv):/i, '');
  if (/^tt\d+$/i.test(core)) {
    out.id = core;
    out.kind = 'imdb';
  } else if (/^\d+$/.test(core)) {
    out.id = core;
    out.kind = 'tmdb';
  } else if (core) {
    out.id = core;
    out.kind = 'title';
  }
  return out;
}

function asciiFold(s) {
  s = String(s || '');
  try { if (typeof s.normalize === 'function') s = s.normalize('NFD'); } catch (e) {}
  s = s.replace(/[\u0300-\u036f]/g, '');
  s = s.toLowerCase();
  var map = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
  var out = '';
  for (var i = 0; i < s.length; i++) {
    var ch = s.charAt(i);
    out += (map[ch] !== undefined ? map[ch] : ch);
  }
  return out;
}

function cleanTitle(t) {
  return asciiFold(String(t || ''))
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokensMatch(a, b) {
  var ta = cleanTitle(a).split(' ').filter(function (x) { return x.length > 1; });
  var tb = cleanTitle(b).split(' ').filter(function (x) { return x.length > 1; });
  if (!ta.length || !tb.length) return 0;
  var hits = 0;
  for (var i = 0; i < ta.length; i++) {
    for (var j = 0; j < tb.length; j++) {
      if (ta[i] === tb[j]) { hits++; break; }
    }
  }
  return hits / Math.max(ta.length, tb.length);
}

async function tmdbJson(url) {
  try {
    var res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
}

function pickResults(data, preferTv) {
  if (!data) return null;
  if (preferTv) {
    if (data.tv_results && data.tv_results[0]) return { type: 'tv', item: data.tv_results[0] };
    if (data.movie_results && data.movie_results[0]) return { type: 'movie', item: data.movie_results[0] };
  } else {
    if (data.movie_results && data.movie_results[0]) return { type: 'movie', item: data.movie_results[0] };
    if (data.tv_results && data.tv_results[0]) return { type: 'tv', item: data.tv_results[0] };
  }
  return null;
}

/**
 * Resolve any id to a rich series/film identity using ONLY the public TMDB API.
 *
 * Returns:
 *   { title, origTitle, numericId, imdbId, aliases, seasons, kind, type }
 * - title/origTitle: preferred names, ordered for site search
 * - aliases: additional titles (Turkish translations, alternative titles)
 * - seasons: season list (tv)
 * - type: 'tv' | 'movie'
 * - kind: 'imdb' | 'tmdb' | 'title'
 */
async function resolveSeriesInfo(rawId, mediaType, apiKey) {
  var out = { title: '', origTitle: '', numericId: '', imdbId: '', aliases: [], seasons: [], kind: 'unknown', type: 'tv' };
  var key = apiKey || '500330721680edb6d5f7f12ba7cd9023';
  var norm = normalizeSeriesId(rawId);
  if (!norm.id) return out;
  out.kind = norm.kind;

  var wantTv = (mediaType === 'tv' || mediaType === 'series' || mediaType === 'show' || norm.season > 0 || norm.kind !== 'movie');
  if (mediaType === 'movie') wantTv = false;

  var numericId = '';
  var name = '';
  var original = '';
  var foundType = wantTv ? 'tv' : 'movie';

  if (norm.kind === 'imdb') {
    var fd = await tmdbJson(TMDB_API_BASE + '/find/' + norm.id + '?api_key=' + key + '&external_source=imdb_id&language=tr-TR');
    var hit = pickResults(fd, wantTv);
    if (!hit && wantTv) {
      hit = pickResults(fd, false);
    }
    if (hit) {
      foundType = hit.type;
      numericId = String(hit.item.id);
      name = hit.item.name || hit.item.title || '';
      original = hit.item.original_name || hit.item.original_title || '';
    }
  } else if (norm.kind === 'tmdb') {
    numericId = norm.id;
  } else {
    // Raw title: search TMDB, best fuzzy match first.
    var sd = await tmdbJson(TMDB_API_BASE + '/search/tv?query=' + encodeURIComponent(norm.id) + '&api_key=' + key + '&language=tr-TR&page=1');
    var results = (sd && sd.results) || [];
    var best = null;
    var bestScore = -1;
    var target = cleanTitle(norm.id);
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      var score = tokensMatch(r.name, norm.id);
      if (cleanTitle(r.name) === target) score = 1;
      if (score > bestScore) { bestScore = score; best = r; }
    }
    if (!best && results.length > 0) best = results[0];
    if (best) {
      numericId = String(best.id);
      name = best.name || '';
      original = best.original_name || '';
    }
  }

  if (!numericId) return out;
  out.numericId = numericId;
  out.type = foundType;

  // Details (tr-TR gives Turkish primary names for most Turkish series).
  var dres = await tmdbJson(TMDB_API_BASE + '/' + foundType + '/' + numericId + '?api_key=' + key + '&language=tr-TR');
  if (dres) {
    name = dres.name || dres.title || name;
    original = dres.original_name || dres.original_title || original;
    if (foundType === 'tv' && dres.seasons) out.seasons = dres.seasons;
  }
  out.title = name || norm.id;
  out.origTitle = original || name || norm.id;

  // External ids (imdb) + translations (Turkish aliases) + alternative titles.
  var ext = await tmdbJson(TMDB_API_BASE + '/' + foundType + '/' + numericId + '/external_ids?api_key=' + key);
  if (ext && ext.imdb_id) {
    out.imdbId = ext.imdb_id;
    out.aliases.push(ext.imdb_id);
  }
  var trs = await tmdbJson(TMDB_API_BASE + '/' + foundType + '/' + numericId + '/translations?api_key=' + key);
  if (trs && trs.translations) {
    for (var t = 0; t < trs.translations.length; t++) {
      var trName = trs.translations[t].data && trs.translations[t].data.name;
      if (trName && trName !== name && trName !== original) {
        out.aliases.push(trName);
      }
    }
  }
  if (foundType === 'movie') {
    var alt = await tmdbJson(TMDB_API_BASE + '/movie/' + numericId + '/alternative_titles?api_key=' + key + '&country=TR');
    if (alt && alt.titles) {
      for (var a = 0; a < alt.titles.length; a++) {
        var tn = alt.titles[a].title;
        if (tn && tn !== name && tn !== original && out.aliases.indexOf(tn) === -1) out.aliases.push(tn);
      }
    }
  }

  // Dedup aliases against known names.
  var seen = {};
  seen[asciiFold(name)] = true;
  seen[asciiFold(original)] = true;
  var aliases = [];
  for (var k = 0; k < out.aliases.length; k++) {
    var fa = asciiFold(out.aliases[k]);
    if (!fa || seen[fa]) continue;
    seen[fa] = true;
    aliases.push(out.aliases[k]);
  }
  if (aliases.length > 8) aliases.length = 8;
  out.aliases = aliases;
  return out;
}

/**
 * Build ordered title list to search the provider site with:
 * canonical title first, then original name, then aliases/translations.
 */
function seriesSearchTitles(show) {
  var titles = [];
  function push(t) {
    t = String(t || '').trim();
    if (!t) return;
    for (var k = 0; k < titles.length; k++) {
      if (asciiFold(titles[k]) === asciiFold(t)) return;
      if (asciiFold(titles[k]) === asciiFold(t).replace(/[^a-z0-9]+/g, ' ').trim() && asciiFold(t).replace(/[^a-z0-9]+/g, ' ').trim() === asciiFold(titles[k]).replace(/[^a-z0-9]+/g, ' ').trim()) return;
    }
    titles.push(t);
  }
  push(show && show.title);
  push(show && (show.orig || show.origTitle));
  push(show && show.name);
  var als = show && (show.alt || show.aliases);
  if (als) {
    for (var j = 0; j < als.length; j++) push(als[j]);
  }
  return titles;
}

module.exports = {
  normalizeSeriesId: normalizeSeriesId,
  resolveSeriesInfo: resolveSeriesInfo,
  seriesSearchTitles: seriesSearchTitles,
  asciiFold: asciiFold
};