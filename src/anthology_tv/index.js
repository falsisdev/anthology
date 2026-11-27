/**
 * Anthology Canlı TV — Birleşik Nuvio Sağlayıcısı (388 Kanal, 7 Kategori)
 * Ulusal, Canlı Spor (5 Platform + Anthology-Live), Haber, Sinema, Belgesel & Çocuk, Müzik & Eğlence ve Yerel.
 */

const { createLiveTvProvider } = require('../shared/live_tv_engine.js');
const { loadConfig, val, wrapAll } = require('../shared/config.js');
const { sortStreamsByQuality } = require('../shared/quality.js');
const { initSportConfig, resolveMultiSportStreams } = require('../shared/sport_engine.js');

var allTvBase = createLiveTvProvider({
  streamName: 'Anthology Canlı TV',
  genre: 'Canlı TV',
  matchGroup: function () { return true; }
});

var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = Promise.all([loadConfig(), initSportConfig()]);
  }
  return _cfgReady;
}

async function getStreams(args) {
  var targetId = (typeof args === 'string') ? args : (args ? (args.id || args.name || '') : '');
  var mediaType = (args && typeof args === 'object') ? (args.type || args.mediaType || '') : '';
  if (mediaType === 'movie' || mediaType === 'series') return [];
  if (targetId && targetId.toLowerCase().indexOf('tv:') !== 0 && /^(?:tt\d+|\d+)(?::\d+:\d+)?$/i.test(targetId.trim())) {
    return [];
  }

  var baseStreams = await allTvBase.getStreams(args);
  var list = Array.isArray(baseStreams) ? baseStreams.slice() : [];

  // Spor kanalları için ek olarak çoklu spor motorunu da birleştir
  try {
    var sportMeta = await allTvBase.getMeta({ id: targetId });
    var chName = (sportMeta && sportMeta.meta && sportMeta.meta.name) ? sportMeta.meta.name : targetId.replace(/^tv:/i, '');
    if (/bein|sport|tivibu|trt\s*spor|a\s*spor|eurosport|nba|f1|exxen|tabii\s*spor|smart\s*spor/i.test(chName + ' ' + targetId)) {
      var sportStreams = await resolveMultiSportStreams(targetId, chName, { url: '', backup: '', backups: [] });
      var seen = {};
      list.forEach(function (s) { if (s && s.url) seen[s.url] = true; });
      (sportStreams || []).forEach(function (s) {
        if (s && s.url && !seen[s.url]) {
          seen[s.url] = true;
          list.push(s);
        }
      });
    }
  } catch (e) {}

  return sortStreamsByQuality(list);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = wrapAll({
    getStreams: getStreams,
    getCatalog: allTvBase.getCatalog,
    getMeta: allTvBase.getMeta
  }, cfgReady);
}
if (typeof globalThis !== 'undefined') {
  globalThis.getStreams = getStreams;
  globalThis.getCatalog = allTvBase.getCatalog;
  globalThis.getMeta = allTvBase.getMeta;
}
