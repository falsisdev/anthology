/**
 * FullHDFilmizlesene Local Scraper - CloudStream3 Kotlin Mantığına Uyarlanmış
 * Özellikler: scx parse, ROT13+Base64 çözme, çoklu video kaynakları
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.fullhdfilmizlesene.live';
var TMDB_API_KEY = '4ef0d7355d9ffb5151e987764708ce96';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Accept-Encoding': 'identity',
    'Origin': BASE_URL,
    'Referer': BASE_URL + '/',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'DNT': '1'
};

/**
 * ROT13 şifre çözme (Kotlin'deki rtt fonksiyonu)
 */
function rtt(s) {
    if (!s) return '';
    var result = '';
    for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        if (c >= 97 && c <= 122) { // a-z
            result += String.fromCharCode(((c - 97 + 13) % 26) + 97);
        } else if (c >= 65 && c <= 90) { // A-Z
            result += String.fromCharCode(((c - 65 + 13) % 26) + 65);
        } else {
            result += s.charAt(i);
        }
    }
    return result;
}

/**
 * Base64 decode (atob yerine Buffer kullanımı - React Native uyumlu)
 */
function atob(s) {
    if (!s) return '';
    try {
        // React Native için Buffer, tarayıcı için atob
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(s, 'base64').toString('utf-8');
        } else if (typeof window !== 'undefined' && window.atob) {
            return window.atob(s);
        }
        return '';
    } catch (e) {
        console.error('[FHD] Base64 decode hatası:', e.message);
        return '';
    }
}

/**
 * scx verisini script tag'lerinden ayıklama
 */
function extractScxData(html) {
    console.log('[FHD] scx verisi aranıyor...');
    
    var scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
    if (!scxMatch) {
        console.log('[FHD] scx değişkeni bulunamadı');
        return null;
    }
    
    try {
        var scxJson = scxMatch[1]
            .replace(/'/g, '"')
            .replace(/(\w+):/g, '"$1":')
            .replace(/,\s*([\}\]])/g, '$1');
        
        var data = JSON.parse(scxJson);
        console.log('[FHD] scx parse edildi, anahtarlar:', Object.keys(data).join(', '));
        return data;
    } catch (e) {
        console.error('[FHD] scx JSON parse hatası:', e.message);
        return null;
    }
}

/**
 * Video linklerini scx verisinden çıkarma ve çözme
 */
function extractVideoLinks(scxData) {
    console.log('[FHD] Video linkleri çıkarılıyor...');
    var links = [];
    
    var keys = ['atom', 'advid', 'advidprox', 'proton', 'fast', 'fastly', 'tr', 'en'];
    
    keys.forEach(function(key) {
        if (!scxData[key] || !scxData[key].sx || !scxData[key].sx.t) {
            return;
        }
        
        var t = scxData[key].sx.t;
        console.log('[FHD] İşleniyor:', key, '- Tip:', typeof t);
        
        var decodedLinks = [];
        
        if (Array.isArray(t)) {
            // Array formatı: ["encoded1", "encoded2"]
            t.forEach(function(encoded) {
                if (typeof encoded === 'string') {
                    var decoded = atob(rtt(encoded)).trim();
                    if (decoded) decodedLinks.push(decoded);
                }
            });
        } else if (typeof t === 'object' && t !== null) {
            // Object formatı: {"1080p": "encoded", "720p": "encoded"}
            Object.keys(t).forEach(function(quality) {
                var encoded = t[quality];
                if (typeof encoded === 'string') {
                    var decoded = atob(rtt(encoded)).trim();
                    if (decoded) {
                        decodedLinks.push({ quality: quality, url: decoded });
                    }
                }
            });
        }
        
        if (decodedLinks.length > 0) {
            console.log('[FHD]', key, 'için', decodedLinks.length, 'link bulundu');
            links.push({
                server: key,
                links: decodedLinks
            });
        }
    });
    
    console.log('[FHD] Toplam sunucu sayısı:', links.length);
    return links;
}

/**
 * Sitede arama yapma
 */
function searchSite(query) {
    console.log('[FHD] Arama yapılıyor:', query);
    var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
    
    return fetch(searchUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var $ = cheerio.load(html);
            var results = [];
            
            $('li.film').each(function() {
                var el = $(this);
                var titleEl = el.find('span.film-title').first();
                var linkEl = el.find('a').first();
                var imgEl = el.find('img').first();
                
                var title = titleEl.text().trim();
                var href = linkEl.attr('href');
                var poster = imgEl.attr('data-src') || imgEl.attr('src');
                var filmCount = el.find('span.film-cnt').text().trim();
                
                if (title && href) {
                    results.push({
                        title: title,
                        url: href.startsWith('http') ? href : BASE_URL + href,
                        poster: poster ? (poster.startsWith('http') ? poster : BASE_URL + poster) : null,
                        isSeries: !!filmCount || href.includes('/serifilm/'),
                        filmCount: filmCount
                    });
                }
            });
            
            console.log('[FHD] Arama sonucu:', results.length, 'bulundu');
            return results;
        });
}

/**
 * En iyi eşleşmeyi bulma (benzerlik skoru)
 */
function findBestMatch(results, query) {
    if (!results || results.length === 0) return null;
    
    var queryLower = query.toLowerCase().trim();
    var bestScore = 0;
    var bestMatch = null;
    
    results.forEach(function(item) {
        var titleLower = item.title.toLowerCase();
        var score = 0;
        
        if (titleLower === queryLower) {
            score = 1;
        } else {
            var queryWords = queryLower.split(/\s+/);
            var titleWords = titleLower.split(/\s+/);
            var matches = 0;
            
            queryWords.forEach(function(word) {
                if (titleWords.indexOf(word) !== -1) matches++;
            });
            
            score = matches / Math.max(queryWords.length, titleWords.length);
        }
        
        if (score > bestScore) {
            bestScore = score;
            bestMatch = item;
        }
    });
    
    console.log('[FHD] En iyi eşleşme:', bestMatch ? bestMatch.title : 'Yok', 'Skor:', bestScore.toFixed(2));
    return bestMatch && bestScore > 0.3 ? bestMatch : null;
}

/**
 * Dizi bölümlerini çekme
 */
function loadSeriesEpisodes(seriesUrl) {
    console.log('[FHD] Dizi bölümleri yükleniyor:', seriesUrl);
    
    return fetch(seriesUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var $ = cheerio.load(html);
            var episodes = [];
            
            $('ul.list li.film').each(function(index) {
                var el = $(this);
                var linkEl = el.find('a.tt').first();
                var titleEl = el.find('span.film-title').first() || linkEl;
                var imgEl = el.find('img').first();
                
                var epUrl = linkEl.attr('href');
                var epTitle = titleEl.text().trim() || ('Bölüm ' + (index + 1));
                var epPoster = imgEl.attr('data-src') || imgEl.attr('src');
                
                if (epUrl) {
                    episodes.push({
                        title: epTitle,
                        url: epUrl.startsWith('http') ? epUrl : BASE_URL + epUrl,
                        poster: epPoster ? (epPoster.startsWith('http') ? epPoster : BASE_URL + epPoster) : null,
                        episodeNum: index + 1
                    });
                }
            });
            
            console.log('[FHD]', episodes.length, 'bölüm bulundu');
            return episodes;
        });
}

/**
 * Ana fonksiyon - TMDB ID'den streamleri getirme
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        console.log('[FHD] Başlatıldı - TMDB:', tmdbId, 'Tip:', mediaType, 'S:', seasonNum, 'E:', episodeNum);
        
        // 1. TMDB'den bilgi al
        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=' + TMDB_API_KEY;
        
        fetch(tmdbUrl)
            .then(function(res) { 
                console.log('[FHD] TMDB yanıtı:', res.status);
                return res.json(); 
            })
            .then(function(tmdbData) {
                var query = tmdbData.title || tmdbData.name;
                if (!query) throw new Error('TMDB ismi bulunamadı');
                
                console.log('[FHD] TMDB ismi:', query);
                return searchSite(query).then(function(results) {
                    return { results: results, query: query, tmdbData: tmdbData };
                });
            })
            .then(function(obj) {
                var bestMatch = findBestMatch(obj.results, obj.query);
                if (!bestMatch) {
                    console.log('[FHD] Eşleşme bulunamadı');
                    return resolve([]);
                }
                
                console.log('[FHD] Seçilen:', bestMatch.title, 'Dizi mi:', bestMatch.isSeries);
                
                // Dizi ise ve bölüm belirtilmişse ilgili bölümü bul
                if (bestMatch.isSeries && mediaType === 'tv' && episodeNum) {
                    return loadSeriesEpisodes(bestMatch.url).then(function(episodes) {
                        var targetEp = episodes[parseInt(episodeNum) - 1];
                        if (!targetEp) {
                            console.log('[FHD] Bölüm bulunamadı:', episodeNum);
                            return resolve([]);
                        }
                        console.log('[FHD] Hedef bölüm:', targetEp.title);
                        return { url: targetEp.url, title: bestMatch.title, isSeries: true };
                    });
                }
                
                return { url: bestMatch.url, title: bestMatch.title, isSeries: bestMatch.isSeries };
            })
            .then(function(target) {
                if (!target) return resolve([]);
                
                console.log('[FHD] Sayfa yükleniyor:', target.url);
                return fetch(target.url, { headers: HEADERS })
                    .then(function(res) { return res.text(); })
                    .then(function(html) {
                        return { html: html, title: target.title, isSeries: target.isSeries };
                    });
            })
            .then(function(obj) {
                if (!obj) return resolve([]);
                
                // scx verisini çıkar
                var scxData = extractScxData(obj.html);
                if (!scxData) {
                    console.log('[FHD] Video verisi bulunamadı');
                    return resolve([]);
                }
                
                var videoLinks = extractVideoLinks(scxData);
                if (videoLinks.length === 0) {
                    console.log('[FHD] Çözülebilir link bulunamadı');
                    return resolve([]);
                }
                
                // Stream formatına dönüştür
                var streams = [];
                var year = obj.html.match(/(\d{4})/) ? obj.html.match(/(\d{4})/)[1] : '';
                
                videoLinks.forEach(function(serverGroup) {
                    serverGroup.links.forEach(function(link) {
                        var streamUrl = typeof link === 'object' ? link.url : link;
                        var quality = typeof link === 'object' ? link.quality : 'HD';
                        
                        if (!streamUrl) return;
                        
                        // turbo.imgz.me kontrolü (orijinal koddaki gibi)
                        var name = '⌜ FullHD ⌟ | ' + serverGroup.server.toUpperCase();
                        if (streamUrl.includes('turbo.imgz.me')) {
                            name += ' (Mirror)';
                        }
                        
                        streams.push({
                            name: name,
                            title: obj.title + (year ? ' (' + year + ')' : '') + ' · ' + quality,
                            url: streamUrl,
                            quality: quality === 'HD' ? '1080p' : quality,
                            size: 'Unknown',
                            headers: STREAM_HEADERS,
                            provider: 'fullhdfilmizlesene'
                        });
                    });
                });
                
                console.log('[FHD] Toplam stream:', streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[FHD] Hata:', err.message);
                console.error('[FHD] Stack:', err.stack);
                resolve([]);
            });
    });
}

//
