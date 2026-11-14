const { createLiveTvProvider } = require('../shared/live_tv_engine.js');

/**
 * Anthology Canlı Haber Paketi
 * NTV, Habertürk, TRT Haber, A Haber, CNN Türk, Sözcü TV, Halk TV vb.
 */
var provider = createLiveTvProvider({
    streamName: '⌜ Anthology Haber ⌟',
    genre: 'Haber',
    matchGroup: function (group) {
        return (group || '').indexOf('HABER') !== -1;
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = provider;
}
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = provider.getStreams;
    globalThis.getCatalog = provider.getCatalog;
    globalThis.getMeta = provider.getMeta;
}
