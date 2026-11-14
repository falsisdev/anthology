const { createLiveTvProvider } = require('../shared/live_tv_engine.js');

/**
 * Anthology Belgesel & Çocuk Paketi
 * TRT Belgesel, Minika Çocuk, Minika GO, TRT Çocuk, TRT EBA İlkokul, Ortaokul, Lise
 */
var provider = createLiveTvProvider({
    streamName: '⌜ Anthology Belgesel & Çocuk ⌟',
    genre: 'Belgesel & Çocuk',
    matchGroup: function (group) {
        var g = group || '';
        return g.indexOf('BELGESEL') !== -1 || g.indexOf('ÇOCUK') !== -1;
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
