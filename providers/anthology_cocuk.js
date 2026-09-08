/**
 * Anthology Çocuk & Aile Motoru
 * Çocuk filmleri, çizgi diziler ve aile sineması için doğrudan HD HLS akışları sunar.
 */

const { searchFilmStreams } = require('./m3u_engine');

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv' || mediaType === 'series') return [];
    return searchFilmStreams(tmdbId, {
        sourceName: 'Anthology Çocuk',
        genreFilter: ['çocuk', 'cocuk', 'aile', 'family', 'kids', 'animasyon']
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
