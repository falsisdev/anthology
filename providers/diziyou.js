var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.diziyou.one'; 
var STORAGE_URL = 'https://storage.diziyou.one';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl, { headers: { 'User-Agent': HEADERS['User-Agent'] } })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = (data.name || '').trim();
                var orgName = (data.original_name || '').trim();
                
                console.error('[DiziYou Search] Aranan: ' + query);

                var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(query);
                return fetch(searchUrl, { headers: HEADERS }).then(function(res) { 
                    return res.text().then(function(html) {
                        return { html: html, query: query, orgName: orgName };
                    });
                });
            })
            .then(function(obj) {
                var $ = cheerio.load(obj.html);
                var searchTitleLower = obj.query.toLowerCase().trim();
                var orgTitleLower = obj.orgName.toLowerCase().trim();
                var foundLink = null;

                var results = $('.list-series a, .post-title a, #categorytitle a, .entry-title a');

                results.each(function() {
                    var currentTitle = $(this).text().toLowerCase().replace('izle', '').trim();
                    var currentHref = $(this).attr('href');
                    if (!currentHref || currentHref.includes('/kategori/')) return;

                    var isExact = (currentTitle === searchTitleLower || currentTitle === orgTitleLower);
                    var isBrackets = (currentTitle.includes(searchTitleLower + ' (') || currentTitle.includes(orgTitleLower + ' ('));
                    var isDiziSuffix = (currentTitle.includes(searchTitleLower + ' dizi') || currentTitle.includes(orgTitleLower + ' dizi'));

                    if (isExact || isBrackets || isDiziSuffix) {
                        foundLink = currentHref;
                        return false; 
                    }
                });

                if (!foundLink && results.length > 0 && results.length < 5) {
                    foundLink = results.first().attr('href');
                }

                if (!foundLink) throw new Error('Dizi bulunamadı');

                var slug = foundLink.split('/').filter(Boolean).pop();
                var epUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum/';
                
                console.error('[DiziYou Match] Hedef: ' + epUrl);
                return fetch(epUrl, { headers: HEADERS }).then(function(res) {
                    return res.text().then(function(html) {
                        return { html: html, query: obj.query }; // ismi sonraki aşamaya taşı
                    });
                });
            })
            .then(function(resObj) {
                var epHtml = resObj.html;
                var diziIsmi = resObj.query;
                var $ = cheerio.load(epHtml);
                var playerSrc = $('#diziyouPlayer').attr('src');
                if (!playerSrc) throw new Error('Player yok');

                var itemId = playerSrc.split('/').pop().replace('.html', '').split('?')[0];
                var streams = [];
                
                var hasSub = epHtml.indexOf('turkceAltyazili') !== -1;
                var hasDub = epHtml.indexOf('turkceDublaj') !== -1;

                // Nuvio formatı: Sağlayıcı | Dil Bilgisi
                if (hasSub) {
                    streams.push({
                        label: '⌜ DiziYou ⌟ | 🌐 Türkçe Altyazılı',
                        url: STORAGE_URL + '/episodes/' + itemId + '/play.m3u8'
                    });
                }
                if (hasDub) {
                    streams.push({
                        label: '⌜ DiziYou ⌟ | 🇹🇷 Türkçe Dublaj',
                        url: STORAGE_URL + '/episodes/' + itemId + '_tr/play.m3u8'
                    });
                }

                if (streams.length === 0) {
                    streams.push({
                        label: '⌜ DiziYou ⌟ | 🌐 Video',
                        url: STORAGE_URL + '/episodes/' + itemId + '/play.m3u8'
                    });
                }

                resolve(streams.map(function(s) {
                    return {
                        name: diziIsmi,  // ÜSTTE GÖRÜNEN: Dizi İsmi
                        title: s.label,   // ALTTA GÖRÜNEN: ⌜ DiziYou ⌟ | Dil Bilgisi
                        url: s.url,
                        quality: '1080p',
                        headers: { 'Referer': BASE_URL + '/' },
                        subtitles: [{ label: 'Turkish', url: STORAGE_URL + '/subtitles/' + itemId + '/tr.vtt' }]
                    };
                }));
            })
            .catch(function(err) {
                console.error('[DiziYou Hata]: ' + err.message);
                resolve([]);
            });
    });
}

module.exports = { getStreams: getStreams };
