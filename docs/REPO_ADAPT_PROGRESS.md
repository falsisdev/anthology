# Repo Adaptasyon İlerleme Logu (breadcrumb)

> Amaç: 6 harici repodaki bizde olmayan eklentileri Nuvio/Anthology JS sistemine uyarlamak + spor kataloğunu çok kaynaklı hale getirmek. Mevcut sistemi bozmadan, her adım testli, commitli.
> Bu dosya, limit biterse sonraki modelin kaldığı yeri bulması için güncellenir. En son durum en alttadır.

## 2026-09-13 — Başlangıç envanteri (Muse Spark)

### Mevcut Anthology sağlayıcıları (35 adet .js)
AnthologyDiziM3U, AnthologyFilmM3U, animecix, anthology_aksiyon, anthology_animasyon, anthology_belgesel, anthology_bilimkurgu, anthology_cocuk, anthology_haber, anthology_komedi, anthology_korku, anthology_spor, anthology_toprated, anthology_ulusal, anthology_yabancidizi, anthology_yerlidizi, anthology_yerlifilm, cizgimax, ddizi, dizibox, dizimom, dizipal, diziyou, filmmodu, jetfilmizle, m3u_engine, mahsundizi, sezonlukdizi, sinemacx, sinewix, turkanime, vidlink, vidmody, webteizle, yabancidizi.

### Harici repo envanteri (/tmp/repo_analysis)
- Cloudstream-BronzeCloud: BCSports, BelgeselX, CineJoy, CineStream, CizgiMax(mevcut), Ddizi(m), DiziBox(m), DiziMom(m), DiziPal(m), DiziPalOriginal, DiziYou(m), Dizilla(YENİ), FilmMakinesi(YENİ), FilmModu(m), FullHDFilm(YENİ), FullHDFilmizlesene(YENİ), HDFilmCehennemi(YENİ), HDFilmDelisi(YENİ), InatBox(YENİ), JetFilmizle(m), KultFilmler(YENİ), RecTV(YENİ), SetFilmIzle(YENİ), SezonlukDizi(m), SinemaCX(m), Sinewix(m), TLCtr(YENİ), Vavoo(YENİ), Watch2Movies(YENİ), WebteIzle(m), YabanciDizi(m). (m = bizde mevcut)
- cloudstream-repo (Ripplay): DDizi(m), DiziBox(m), DiziMom(m), DiziPal(m), FilmMakinesi(YENİ), FilmModu(m), FullHDFilmizlesene(YENİ), HDFilmCehennemi(YENİ), HDFilmIzle(YENİ), JetFilmizle(m), SinemaCX(m), YabanciDizi(m).
- cs-plugins (manitux): DiziBox(m), Dizilla(YENİ), Dizipal(m), DiziYou(m), FilmMakinesi(YENİ), FullHDFilmizlesene(YENİ), HDFilmCehennemi(YENİ), SetFilm(YENİ=setfilmizle.ltd), WebDramaTurkey(YENİ).
- TurkSpor: Kotlin kaynak YOK (sadece domains.json + catalogs/netvgold.json + assets). builds dalında sadece .cs3 binary. 27 spor sağlayıcı listesi README'de. domains.json aday domainler içeriyor.
- WioSpor: WioChannels.kt + SourceAggregator.kt mevcut; turkspor.* per-source Kotlin dosyaları repoda YOK (build.gradle sibling dizin bekliyor ama yok). Yani per-source extraction mantığı kapalı kutu.
- TurkSinema: PROVIDERS.md 60 eklenti listeliyor (SalooRepo 29 + BronzeCloud 8 + Ripplay 13 + CNCVerse 5 + Wiojelt Gold 5). domains.json küçük.

### Spor mekanik bulguları (canlı probe)
- Mevcut anthology_spor.js: providers/M3U/Liste/canli.m3u içinden group-title SPOR olanları katalog yapar; getStreams tek URL döner (çoğu andro.evrenesoglu99.click). Katalog ID'leri tv:* sabit kalmalı.
- TurkSpor catalogs/netvgold.json: 20 satır, her biri {id,title,url,referer}. URL'ler turbo-guacamole/androstream + trt resmi. Bunlar doğrudan m3u8 + referer ile Nuvio'ya verilebilir. En hızlı çok-kaynak kazanımı.
- SelçukSports (selcuksportshdbd813bd00f.xyz): kanal listesi `data-url="https://main.uxsyplayer.../index.php?id=selcukXXX#poster=..."` şeklinde. Player `baseStreamUrl='https://<hash>.click/live/'` + `streamId/playlist.m3u8`. Örn selcukbeinsports1 playlisti weeblybeenpro.site segmentli; selcukobs1 playlisti tiktokcdn PNG-wrapped segmentli (WASM ile PNG→TS decode, CustomFragmentLoader). SONUÇ: Selçuk doğrudan Nuvio'da sorunlu (özellikle tiktokcdn'li olanlar). Öncelik DÜŞÜK, WASM decode JS'e taşınamaz.
- ZbahisTV (zbahistv65.com): ana sayfada BEIN 1 için iframe `/channel.html?id=zirve`. channel.html mantığı: `GET https://data-reality.com/domain.php -> {baseurl}` sonra `baseurl + id + '/mono.m3u8'`. Server-side probe'da domain.php Cloudflare 403 verdi (browser'da çalışır). SONUÇ: taşınabilir kalıp ama CF engeli var; fail-soft denenebilir, öncelik ORTA.
- Arda/İnter/Mackeyfi/BeyazElma: ana sayfa fetch OK ama kanal linkleri JS-gömülü; tek tek çözmek zaman alır. Öncelik ORTA/DÜŞÜK.

### Karar (spor)
1. Faz-1 (bu tur): anthology_spor.js çok-kaynaklı: birincil canli.m3u + NetVGold alternatı (remote fetch + cache + yerel gömülü fallback). Katalog değişmez. beIN Sports 1 HD -> [Anthology, NetVGold/Atom, ...] gibi etiketli streamler. Test: getCatalog sayısı sabit, getStreams('tv:beINSports1.tr') >= 2.
2. Faz-2 (sonraki): Zbahis mono.m3u8 (CF bypass denenirse), Arda/İnter tek tek player çözümleme. Selçuk WASM'lılar atlanacak.

### Karar (film/dizi)
- Öncelik sırası (taşınabilirlik + değer): 1) SetFilmIzle (setfilmizle.ltd, standart WP admin-ajax get_video_url, 218 satır, portable), 2) FullHDFilmizlesene (scx rot13+base64, portable), 3) Dizilla (AES __NEXT_DATA__, orta-zor), 4) FilmMakinesi/HDFilmCehennemi/HDFilmDelisi/HDFilmIzle/InatBox/RecTV/TLCtr/Vavoo/Watch2Movies/KultFilmler/FullHDFilm/WebDramaTurkey/BelgeselX/CineJoy (sonra).
- Bu tur: SetFilmIzle + FullHDFilmizlesene (ikisi de movie; SetFilmIzle tv de destekler). Test hedefleri: movie 603 The Matrix; tv 1396 Breaking Bad S01E01 (SetFilmIzle için).

## 2026-09-13 — Uygulama başladı
- [x] anthology_spor.js multi-source (NetVGold): katalog 49 sabit; beIN1 2 stream, beIN2/3 3 stream, S Sport doğru ayrıştı.
- [x] providers/setfilmizle.js (YENİ) — 1. committe pushlandı (266c780).
- [x] FullHDFilmizlesene / FilmMakinesi / HDFilmCehennemi canlılık: 403 Cloudflare → atlandı (JS taşınamaz).
- [x] providers/kultfilmler.js (YENİ), providers/hdfilmdelisi.js (YENİ), providers/hdfilmizle.js (YENİ) — SetFilmIzle fastplay/X-Sp zinciri genelleştirildi.
- [x] providers/filmmakinesi.js denendi → search AJAX boş (knl_ajax_search cookie+bypass gerektiriyor), rafa kaldırıldı (dosya silindi).
- [x] manifest.json 39 sağlayıcıya çıkarıldı; test 39/39 PASS.

## 2026-09-13 ~23:18 — Ara commit sonrası durum (hızlı devam)
> - anthology_spor.js çok-kaynaklı (49 katalog sabit; beIN1 2, beIN2/3 3, S Sport ayrışık) — ilk committe.
> - Yeni film sağlayıcıları: SetFilmIzle (Matrix 603 + BB S01E01 1080p+altyazı), KultFilmler (Matrix 603 Vidpapi HLS), HDFilmDelisi (Matrix VidMody via player.vidmody.com/WkVo… → vidmody.com/vs/tt0133093), HDFilmIzle (Ink/Vip FastPlay + SPG.cerceve → /video/wKhq… → X-Sp master.txt).
> - test_all_providers: 37→39, 39/39 PASS (önce 2 FAIL olan dizibox/yabancidizi toparladı; diziyou dalgalı ama şu tur PASS).
> - Sırada: Dizilla (516 satır, AES NextData+Hotlinger/ContentX → orta-zor), FullHDFilm (hdfilm.us self-signed cert dalgalı), BelgeselX (Google CSE tokenli arama), InatBox/RecTV/TLCtr/Vavoo(lokke.app imzası)/Watch2Movies — hepsi için canlılık + port edilebilirlik notlandı.

## 2026-09-14 — Stabilizasyon turu (kullanıcı geri bildirimi)
> - FilmModu: Matrix 603 artık doğru film (the-matrix-hd-film-izle, id 2433) + format/isHls eklendi; 5 kalite 1080p+ doğrulandı.
> - SetFilmIzle/HDFilmIzle: STF_AJAX nonceleri çoklu deneme (video nonce + data-nonce) ve `aj.success===false` kontrolü; X-Sp master doğrulaması kaldırıldı (anlık 404'lere rağmen Nuvio fetch'i taze X-Sp ile 200 veriyor — testte 200 doğrulandı). İki sağlayıcı da 603'te 1×1080p HLS + altyazı.
> - DDizi/DiziBox 3 sn takılma: master yerine en yüksek varyantın media playlist'i doğrudan döndürülüyor (`resolveHighestVariant` → chunklist_b3128000 / index-v1-a1.m3u8) ve .ts segmentler birleşik akış olarak oynatılıyor; hedef 49 katalog sabit, tek parça buffer.
> - Canlı TV: `anthology_spor` artık `tv:` dışı film/dizi aramalarında 0 döndürüyor (plugin kirliliği bitti); `m3u.anthology.addon` sadece tv/channel; katalog 49 sabit, beIN1 için 3 etiketli stream (Anthology + AtomSpor/NetVGold + SelcukSports doğrudan playlist) — kullanıcı isteği karşılandı; kapsam sadece katalogdan.
> - Test: 39/39 PASS (son committe).

## SON DURUM (2026-09-14)
> - 39 sağlayıcı, 100% PASS. Spor çok kaynaklı (3 etiket), film/dizi oynatma düzeltmeleri commitlenmeye hazır.
> - Kalan adaylar: Dizilla/BelgeselX/InatBox/Vavoo/Watch2Movies gibi ağır ekstrakörler bir sonraki tura bırakıldı (CF/WASM/TLS engelleri notlu).
