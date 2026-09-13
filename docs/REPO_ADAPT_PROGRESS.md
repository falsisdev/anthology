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
- [x] anthology_spor.js multi-source (NetVGold): katalog 49 sabit; beIN1 2 stream, beIN2/3 3 stream, S Sport doğru ayrıştı (S Sport 2 karışması düzeltildi).
- [ ] providers/setfilmizle.js (YENİ)
- [ ] providers/fullhdfilmizlesene.js (YENİ)
- [ ] manifest.json kayıtları
- [ ] test_all_providers + spor multi-stream doğrulama
- [ ] commit + push

## SON DURUM (2026-09-13 ~22:5x)
> - anthology_spor.js çok-kaynaklı doğrulandı (katalog 49 sabit; beIN1 2, beIN2/3 3, S Sport ayrışık).
> - providers/setfilmizle.js YENİ yazıldı ve doğrulandı: Matrix 603 -> 1080p HLS + 2 altyazı; BB 1396 S01E01 -> 1080p HLS + 3 altyazı; katalog 24 meta; dizi meta 63 video.
> - manifest.json'a setfilmizle kaydedildi; spor açıklaması güncellendi.
> - test_all_providers: 34/36 PASS. Yeni SetFilmIzle PASS, spor katalog 49 PASS. 2 FAIL önceden mevcut ve bu değişiklikten bağımsız: dizibox + yabancidizi (ana sayfalar server-side fetch'e 403/CF dönüyor; dosyalarına dokunulmadı).
> - Sıradaki (sonraki tur): FullHDFilmizlesene (403 CF, riskli), Dizilla (AES, orta-zor), FilmMakinesi.ch (403), HDFilmCehennemi.nl (403), HDFilmIzle, InatBox, RecTV, TLCtr, Vavoo, Watch2Movies, KultFilmler, FullHDFilm, WebDramaTurkey, BelgeselX, CineJoy, DiziPalOriginal + spor Faz-2 (Zbahis CF bypass, Arda/İnter player çözümleme; Selçuk WASM atlandı).
