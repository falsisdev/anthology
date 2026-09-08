/**
 * Anthology Yerli Dizi Motoru
 * Yerli diziler, Türk televizyon arşivi ve güncel Türk dizileri için doğrudan MP4/HLS akışları sunar.
 */

const { searchDiziStreams } = require('./m3u_engine');

async function getStreams(rawId, type, seasonInput, episodeInput) {
    return searchDiziStreams(rawId, type, seasonInput, episodeInput, {
        sourceName: 'Anthology Yerli Dizi',
        originFilter: 'tr'
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
