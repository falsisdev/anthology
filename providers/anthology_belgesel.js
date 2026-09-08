/**
 * Anthology Belgesel & Doğa Motoru
 * Belgeseller, doğa, bilim ve tarih yapımları için doğrudan HD HLS akışları sunar.
 */

const { searchFilmStreams } = require('./m3u_engine');

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv' || mediaType === 'series') return [];
    return searchFilmStreams(tmdbId, {
        sourceName: 'Anthology Belgesel',
        genreFilter: ['belgesel', 'documentary', 'doga', 'tarih', 'history']
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
