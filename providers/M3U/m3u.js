/**
 * MoOnCrOwN - Ultimate Provider (V17)
 * - M3U etiketlerinden Dil ve Kalite bilgilerini çeker.
 * - Modern "Dizi" formatına bu bilgileri ekler.
 * - Boş verileri otomatik gizler.
 */

const SOURCES = {
    movie: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/film.m3u",
    tv: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/dizi.m3u"
};

const getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType === 'live') return resolve([]);

        let cleanId = tmdbId ? tmdbId.toString().replace(/^[a-z0-9]+:/i, "") : "";
        let isSeries = (mediaType === 'series' || (mediaType === 'tv' && seasonNum));
        let targetM3U = isSeries ? SOURCES.tv : SOURCES.movie;

        const normalize = (text) => {
            if (!text) return "";
            return text.toString().toLowerCase()
                .replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '')
                .replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u')
                .replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
                .replace(/[^a-z0-9]/g, '').trim();
        };

        const runSearch = (trName, enName) => {
            const queryTR = normalize(trName);
            const queryEN = normalize(enName);
            
            let sNum = parseInt(seasonNum);
            let eNum = parseInt(episodeNum);
            let sPad = sNum < 10 ? "0" + sNum : sNum;
            let ePad = eNum < 10 ? "0" + eNum : eNum;

            const episodeTags = ["s" + sPad + "e" + ePad, sNum + "x" + ePad, sNum + "x" + eNum];

            fetch(targetM3U).then(res => res.text()).then(content => {
                const lines = content.split('\n');
                let results = [];
                
                for (let i = 0; i < lines.length; i++) {
                    let line = lines[i];
                    if (line.includes("#EXTINF")) {
                        let normLine = normalize(line);
                        let isMatch = false;

                        if (isSeries) {
                            let nameMatch = normLine.includes(queryTR) || normLine.includes(queryEN);
                            let epMatch = episodeTags.some(tag => normLine.includes(tag)) || 
                                          (normLine.includes(sNum + "s") && normLine.includes("bolum" + eNum));
                            if (nameMatch && epMatch) isMatch = true;
                        } else {
                            let match = line.match(/tvg-name="([^"]+)"/i) || line.match(/,(.*)$/);
                            let m3uName = match ? (match[1] || match[0]).replace(",", "").trim() : "";
                            if (normalize(m3uName) === queryTR || normalize(m3uName) === queryEN) isMatch = true;
                        }

                        if (isMatch) {
                            // DİL VE KALİTE ETİKETLERİNİ ÇEK
                            let quality = (line.match(/tvg-quality="([^"]*)"/i) || ["", ""])[1].trim();
                            let language = (line.match(/tvg-language="([^"]*)"/i) || ["", ""])[1].trim();
                            
                            // Gösterim formatı oluştur (Eğer boşsa ekleme)
                            let extraInfo = "";
                            if (language) extraInfo += ` [${language}]`;
                            if (quality) extraInfo += ` [${quality}]`;

                            let foundUrl = "";
                            for (let j = 1; j <= 3; j++) {
                                if (lines[i+j] && lines[i+j].trim().startsWith("http")) {
                                    foundUrl = lines[i+j].trim();
                                    break;
                                }
                            }

                            if (foundUrl) {
                                results.push({
                                    // Örn: 🎬 Dizi: S01 | E01 [Dublaj] [1080p] (#1)
                                    name: isSeries 
                                        ? `🎬 Dizi: S${sPad} | E${ePad}${extraInfo} (#${results.length + 1})` 
                                        : `🎞️ Sinema${extraInfo} (#${results.length + 1})`,
                                    title: line.split(',').pop().trim(), 
                                    url: foundUrl,
                                    http_headers: { "User-Agent": "VLC/3.0.18" }
                                });
                            }
                        }
                    }
                }
                resolve(results);
            }).catch(() => resolve([]));
        };

        const tmdbKey = "4ef0d7355d9ffb5151e987764708ce96";
        const tmdbType = isSeries ? 'tv' : 'movie';
        
        fetch(`https://api.themoviedb.org/3/${tmdbType}/${cleanId}?api_key=${tmdbKey}&language=tr-TR`)
            .then(r => r.json())
            .then(d => {
                runSearch(d.title || d.name || "", d.original_title || d.original_name || "");
            })
            .catch(() => resolve([]));
    });
};

globalThis.getStreams = getStreams;
