/**
 * Anthology Yabancı Dizi Motoru
 * Yabancı popüler diziler için doğrudan HD HLS master akışları sunar.
 */

const { searchDiziStreams } = require('./m3u_engine');

async function getStreams(rawId, type, seasonInput, episodeInput) {
    return searchDiziStreams(rawId, type, seasonInput, episodeInput, {
        sourceName: 'Anthology Yabancı Dizi',
        originFilter: 'foreign'
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
