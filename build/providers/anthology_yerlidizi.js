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
const { searchDiziStreams } = require("./m3u_engine");
function getStreams(rawId, type, seasonInput, episodeInput) {
  return __async(this, null, function* () {
    return searchDiziStreams(rawId, type, seasonInput, episodeInput, {
      sourceName: "Anthology Yerli Dizi",
      originFilter: "tr"
    });
  });
}
if (typeof module !== "undefined") module.exports = { getStreams };
if (typeof globalThis !== "undefined") globalThis.getStreams = getStreams;
