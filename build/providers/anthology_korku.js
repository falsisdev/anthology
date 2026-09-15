var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
const { searchFilmStreams } = require("./m3u_engine");
function getStreams(tmdbId, mediaType) {
  return __async(this, null, function* () {
    if (mediaType === "tv" || mediaType === "series") return [];
    return searchFilmStreams(tmdbId, {
      sourceName: "Anthology Korku & Gerilim",
      genreFilter: ["korku", "horror", "gerilim", "thriller", "gizem", "mystery"]
    });
  });
}
if (typeof module !== "undefined") module.exports = { getStreams };
if (typeof globalThis !== "undefined") globalThis.getStreams = getStreams;
