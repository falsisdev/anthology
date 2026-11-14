const { createLiveTvProvider } = require('../shared/live_tv_engine.js');

/**
 * Anthology Müzik & Eğlence Paketi
 * Kral Pop TV, Power TV, PowerTürk TV, Number 1 TV, Power Dance, Power Love, TRT Müzik
 */
var provider = createLiveTvProvider({
    streamName: '⌜ Anthology Müzik ⌟',
    genre: 'Müzik & Eğlence',
    matchGroup: function (group) {
        var g = group || '';
        return g.indexOf('MÜZİK') !== -1 || g.indexOf('EĞLENCE') !== -1;
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
