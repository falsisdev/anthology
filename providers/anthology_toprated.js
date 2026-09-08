/**
 * Anthology IMDb Top Rated Motoru
 * IMDb'nin en yüksek puanlı kült ve başyapıt filmleri için doğrudan HD HLS akışları sunar.
 */

const { searchFilmStreams } = require('./m3u_engine');

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv' || mediaType === 'series') return [];
    return searchFilmStreams(tmdbId, {
        sourceName: 'Anthology Top Rated',
        genreFilter: ['top rated', 'imdb', 'seri film', 'aksiyon', 'dram', 'bilim kurgu']
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
