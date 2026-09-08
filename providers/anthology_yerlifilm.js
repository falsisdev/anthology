/**
 * Anthology Yerli Film & Yeşilçam Motoru
 * Klasik Yeşilçam, Türk sineması ve yerli başyapıtlar için doğrudan HD HLS akışları sunar.
 */

const { searchFilmStreams } = require('./m3u_engine');

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv' || mediaType === 'series') return [];
    return searchFilmStreams(tmdbId, {
        sourceName: 'Anthology Yerli Film',
        genreFilter: ['yerli film', 'yerli', 'turk', 'türk', 'yesilcam', 'yeşilçam']
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
