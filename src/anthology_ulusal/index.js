const { createLiveTvProvider } = require('../shared/live_tv_engine.js');

/**
 * Anthology Ulusal Kanallar Paketi
 * TRT 1, ATV, Kanal D, Show TV, Star TV, NOW TV, TV8, Kanal 7 vb.
 */
var provider = createLiveTvProvider({
    streamName: '⌜ Anthology Ulusal ⌟',
    genre: 'Ulusal',
    matchGroup: function (group) {
        return (group || '').indexOf('ULUSAL') !== -1;
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
