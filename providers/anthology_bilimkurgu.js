/**
 * Anthology Bilim Kurgu & Fantastik Motoru
 * Bilim kurgu, fantastik ve uzay sineması için doğrudan HD HLS akışları sunar.
 */

const { searchFilmStreams } = require('./m3u_engine');

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv' || mediaType === 'series') return [];
    return searchFilmStreams(tmdbId, {
        sourceName: 'Anthology Bilim Kurgu',
        genreFilter: ['bilim kurgu', 'sci-fi', 'science fiction', 'fantastik', 'fantasy', 'fantezi']
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
