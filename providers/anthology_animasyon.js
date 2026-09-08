/**
 * Anthology Animasyon & Anime Motoru
 * Animasyon, anime ve çizgi sinema için doğrudan HD HLS akışları sunar.
 */

const { searchFilmStreams } = require('./m3u_engine');

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv' || mediaType === 'series') return [];
    return searchFilmStreams(tmdbId, {
        sourceName: 'Anthology Animasyon',
        genreFilter: ['animasyon', 'animation', 'anime', 'çizgi']
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
