const { createLiveTvProvider } = require('../shared/live_tv_engine.js');

/**
 * Anthology Sinema Paketi
 * Cine 1, FX, TRT Nostalji ve canli.m3u içindeki SİNEMA KANALLARI grubunun tamamı.
 * Kanal açıklamaları yayın dili etiketi ile üretilir (ör. "Cine 1 HD Canlı [Türkçe]").
 */
var provider = createLiveTvProvider({
    streamName: '⌜ Anthology Sinema ⌟',
    genre: 'Sinema',
    matchGroup: function (group) {
        // "🇹🇷 SİNEMA KANALLARI" — Türkçe büyük İ (U+0130) nedeniyle locale güvenli karşılaştırma
        var g = (group || '').toString().toUpperCase().replace(/İ/g, 'I');
        return g.indexOf('SINEMA') !== -1;
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
