/**
 * Anthology Aksiyon & Macera Motoru
 * Aksiyon, macera, suç ve gerilim sineması için doğrudan HD HLS akışları sunar.
 */

const { searchFilmStreams } = require('./m3u_engine');

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv' || mediaType === 'series') return [];
    return searchFilmStreams(tmdbId, {
        sourceName: 'Anthology Aksiyon',
        genreFilter: ['aksiyon', 'action', 'macera', 'adventure', 'suc', 'crime']
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
