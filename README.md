<div align="center">
  <img src="assets/logo_1_transparent.png" alt="Anthology Logo" width="130" />
  <h1>Anthology</h1>
  <p><strong>Nuvio ve Stremio için Doğrulanmış Türkçe Film, Dizi, Anime, Canlı TV ve Zengin Katalog Deposu</strong></p>

  <p>
    <a href="https://github.com/falsisdev/anthology"><img src="https://img.shields.io/badge/Nuvio-Eklenti_Deposu-00e676?style=for-the-badge&logo=github&logoColor=white" alt="Nuvio" /></a>
    <a href="stremio://falsisdev.github.io/anthology/stremio/manifest.json"><img src="https://img.shields.io/badge/Stremio-Canlı_TV-a855f7?style=for-the-badge&logo=stremio&logoColor=white" alt="Stremio Canlı TV" /></a>
    <a href="https://stremio-addons.net/addons/anthology"><img src="https://img.shields.io/badge/Stremio_Addons-anthology-8a2be2?style=for-the-badge&logo=stremio&logoColor=white" alt="Stremio Addons Directory" /></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Sürüm-1.8.40-blue?style=for-the-badge" alt="Sürüm 1.8.40" />
    <img src="https://img.shields.io/badge/Eklenti-41_Aktif-3b82f6?style=for-the-badge" alt="41 Aktif Eklenti" />
    <img src="https://img.shields.io/badge/Lisans-MIT-green?style=for-the-badge" alt="MIT Lisansı" />
    <img src="https://img.shields.io/badge/Katalog-7_Canlı_Katalog-8b5cf6?style=for-the-badge" alt="7 Canlı TV Kataloğu" />
    <img src="https://img.shields.io/badge/Kanal-388_Canlı_Kanal-00e676?style=for-the-badge" alt="388 Canlı Kanal" />
  </p>

  <p>
    <a href="https://falsisdev.github.io/anthology">🌐 <strong>Web Sitesini Ziyaret Et</strong></a> &nbsp;|&nbsp;
    <a href="https://stremio-addons.net/addons/anthology">📦 <strong>Stremio-Addons.net Dizini</strong></a> &nbsp;|&nbsp;
    <a href="stremio://falsisdev.github.io/anthology/stremio/manifest.json">🚀 <strong>Stremio'ya Tek Tıkla Ekle</strong></a> &nbsp;|&nbsp;
    <a href="https://web.stremio.com/#/addons?addon=https%3A%2F%2Ffalsisdev.github.io%2Fanthology%2Fstremio%2Fmanifest.json">📱 <strong>Web Stremio'da Aç</strong></a> &nbsp;|&nbsp;
    <a href="#-sıkça-sorulan-sorular-sss">❓ <strong>SSS</strong></a>
  </p>
</div>

---

> [!IMPORTANT]
> ### ⚠️ Platformlar Arasındaki Kapsam ve Kullanım Farkı:
> - 🌟 **Nuvio Kullanıcıları:** Anthology'nin sunduğu **tüm özellikleri sorunsuz, sınırsız ve eksiksiz** kullanabilir. **41 aktif eklentinin tamamı** (Türkçe/yabancı film, dizi, anime, Go VOD arşivi) ve **388 Canlı TV kanalı (7 vitrin kataloğu)** Nuvio oynatıcısında tek çatı altında eksiksiz çalışır.
> - 🟣 **Stremio Kullanıcıları:** Stremio eklentisi olarak kullanım **yalnızca Canlı TV katalogları (7 vitrin ve 388 canlı yayın kanalı) ile sınırlıdır**. Stremio'nun eklenti protokolü gereği film ve dizi video scraper'ları Stremio üzerinde çalışmaz; bu nedenle Stremio'da yalnızca canlı televizyon ve spor akışları sunulmaktadır.
> - 🚢 **Vessel Kullanıcıları (Native TypeScript):** Vessel kendi native TypeScript eklenti sistemine özel ayrı ve hafif [**anthology-vessel**](https://github.com/falsisdev/anthology-vessel) deposuna sahiptir (`gh:falsisdev/anthology-vessel`). Birleşik Canlı TV (`anthology-tv`, 7 kategori / 388 kanal), toggle ayarlı TMDB birleşik motoru (`Anthology+`) ve 31 site eklentisiyle toplam **33 native TypeScript eklentisi** sunar; aynı zamanda Vessel eklenti geliştiricileri için ilk resmi **referans mimari** örneğidir.
> - 🌐 **Stremio Topluluk Sayfası:** Eklentiyi resmi Stremio topluluk dizininde incelemek için [stremio-addons.net/addons/anthology](https://stremio-addons.net/addons/anthology) adresini ziyaret edebilirsiniz.

---

## ⚡ 30 Saniyede Hızlı Kurulum

| Platform | Kapsam Durumu | Kurulum Yöntemi | Ne İşe Yarar? |
|---|:---:|---|---|
| 🚢 **Vessel** *(Native TypeScript)* | **33 Native TS Eklentisi** | [**Vessel'da Doğrudan Aç (`vessel://`)**](vessel://install?src=gh:falsisdev/anthology-vessel) veya `Extensions` → `Add Repository` alanına şunu yapıştırın:<br>`gh:falsisdev/anthology-vessel` *(Depo: [anthology-vessel](https://github.com/falsisdev/anthology-vessel))* | **Sıfır şişkinlikli TypeScript SDK:** Birleşik `anthology-tv` (388 kanal) + toggle ayarlı `Anthology+` TMDB motoru + 31 site kaynağını doğrudan `repo.json` üzerinden kurar. |
| 🌟 **Nuvio** *(Önerilen)* | **Tüm Eklenti Sorunsuz & Eksiksiz** | `Ayarlar` → `Pluginler` → `Depo Ekle` yoluna aşağıdaki URL'yi yapıştırın:<br> `https://raw.githubusercontent.com/falsisdev/anthology/main/manifest.json` | **Tüm 41 aktif eklentiyi** (film, dizi, anime ve canlı TV kanalları) yükler. |
| 🟣 **Stremio** *(Tek Tık)* | **Yalnızca Canlı TV ile Sınırlı** | [**Stremio'ya Doğrudan Ekle (Tıklayın)**](stremio://falsisdev.github.io/anthology/stremio/manifest.json) veya [**Web Stremio'da Aç**](https://web.stremio.com/#/addons?addon=https%3A%2F%2Ffalsisdev.github.io%2Fanthology%2Fstremio%2Fmanifest.json)<br>*(Dizin: [stremio-addons.net](https://stremio-addons.net/addons/anthology))* |**388 Canlı TV kanalını** 7 vitrin kataloğu olarak Stremio ana sayfasına ekler. |

---

## 📲 Kurulum Rehberi

Nuvio ve Stremio'da yerli dizileri, animeleri, sinema filmlerini ve **388 Canlı TV kanalını** hem **ana sayfanızda vitrin olarak görmek** hem de **doğrulanmış resmi CDN ve Anthology-Live akışlarıyla doğrudan oynatmak** için aşağıdaki adımları uygulayın:

---

### 1️⃣ Adım: Video Oynatma Motorunu Ekleyin (Nuvio Pluginleri)
> **Zorunlu (Yalnızca Nuvio):** Bu adım, bir film, dizi veya anime açtığınızda arka planda çalışan **34 aktif Türkçe/yabancı video eklentisini** Nuvio video motoruna yükler. *(Stremio'da scraper motorları desteklenmez; bu adım Nuvio içindir).*

1. **Nuvio** uygulamasını açın.
2. Sırasıyla **Ayarlar** → **Genel** → **İçerik & Keşif** → **Pluginler** → **Depo Ekle** bölümüne gidin.
3. Aşağıdaki bağlantıyı yapıştırıp **Ekle** butonuna basın:

```text
https://raw.githubusercontent.com/falsisdev/anthology/main/manifest.json
```

---

### 2️⃣ Adım: Canlı TV Ana Sayfa Kataloglarını Ekleyin (Anthology — Canlı TV)
> **Önerilen (Nuvio & Stremio):** Bu adım; 388 Canlı TV kanalını 7 kategoride (**Tüm Kanallar**, **Canlı Spor**, **Ulusal**, **Canlı Haber**, **Belgesel & Çocuk**, **Sinema**, **Müzik & Eğlence**) **Nuvio veya Stremio'nun ana sayfa vitrinine** yerleştirir. Tüm kanallar standart **221x126** banner formatındadır.

1. **Nuvio** veya **Stremio** uygulamasında **Eklentiler / Addons** → **Depo / Addon Ekle** bölümüne gidin.
2. Aşağıdaki statik katalog bağlantısını yapıştırıp **Ekle / Install** butonuna basın:

```text
https://falsisdev.github.io/anthology/stremio/manifest.json
```

*(Stremio uygulaması yüklüyse doğrudan **[Buraya Tıklayarak](stremio://falsisdev.github.io/anthology/stremio/manifest.json)** tek tıkla yükleyebilir veya [stremio-addons.net/addons/anthology](https://stremio-addons.net/addons/anthology) topluluk sayfasından kurabilirsiniz.)*

---

> [!TIP]
> **Nasıl Birlikte Çalışırlar?**
> - **Nuvio'da:** 1. Adım ve 2. Adımı birlikte eklediğinizde, Nuvio ana sayfanızda hem zengin Canlı TV vitrinleri görünür hem de içerik aradığınızda 34 video eklentisi en kaliteli (1080p, 4K, Çift Ses) akışları anında oynatır.
> - **Stremio'da:** Stremio kullanıcıları yalnızca 2. Adımı ekleyerek 388 Canlı TV kanalını kesintisiz resmi CDN ve Anthology-Live çoklu kaynak bağlantılarıyla izleyebilir.

---

## ⚡ Anthology-Live (Go Çoklu Kaynak Proxy & VOD Motoru)

Canlı yayınları ve VOD arşivlerini yüksek hızla sunmak için geliştirilen **Anthology-Live** Go sunucusu (`v2`):

- **Çoklu Kaynak & Otomatik Failover:** Her canlı kanal için resmi CDN akışlarının yanı sıra **Kool.ws (`Kool S1 / S6 / S7` havuzları)**, **Alemdar**, **Mahsun**, **Taraftarium24** ve **Papaz** kaynaklarını otomatik test edip en hızlı aktif akışı sunar.
- **Native Go VOD RAM İndeksleyici (`/api/vod/streams`):** 9.200+ film ve 12.600+ dizi bölümünü doğrudan RAM üzerinde indeksleyerek Nuvio `Anthology M3U / VOD` sağlayıcısına milisaniyeler içinde döner.
- **Xtream Codes, M3U & Web TV:** Televizo, TiviMate, Kodi ve web tarayıcısı üzerinden doğrudan kullanılabilir.

👉 **Sunucu kaynak kodu ve kurulum için:** [**github.com/falsisdev/anthology-live**](https://github.com/falsisdev/anthology-live)

---

## ☁️ Anthology WebDAV Sunucusu (Infuse, VidHub, SenPlayer, Kodi & VLC)

Nuvio veya Stremio dışında **Apple TV, iOS, macOS, Android TV ve Windows** cihazlarınızda **Infuse, VidHub, SenPlayer, Kodi, Nova Player ve VLC** gibi yerel medya oynatıcıları veya doğrudan dosya yöneticilerini (Finder / Windows Explorer) kullanmak isterseniz **Anthology WebDAV** projesini kullanabilirsiniz!

- **Sıfır Disk Alanı (In-Memory VFS):** Cihazınızda yer kaplamadan film, dizi ve anime arşivlerini sanal dosya sistemi olarak doğrudan medya oynatıcınıza bağlar.
- **Çoklu Kaynak & HLS/Range Proxy:** Anthology'nin doğrulanmış içerik sağlayıcılarını yerel oynatıcılarla tam uyumlu hale getirir.
- **Kolay Kurulum & Canlı Kullanım:** İster hazır sunucu üzerinden hesabınızla, ister kendi sisteminizde (Self-Hosted) çalıştırarak kullanabilirsiniz.

👉 **Detaylı bilgi, kurulum rehberi ve kullanım için:** [**github.com/falsisdev/anthology-dav**](https://github.com/falsisdev/anthology-dav) *(veya [Kullanım Wiki Rehberi](https://github.com/falsisdev/anthology-dav/wiki))*

---

## 📺 Canlı TV Katalogları (7 Resmi Vitrin)

Nuvio ve Stremio ana sayfasında canlı TV kanallarını kategorilere ayrılmış vitrinler olarak sunan kataloglar:

| Katalog | Sağlayıcı | Tür | Kanal Sayısı | İçerik Özeti |
|---|---|:---:|:---:|---|
| <img src="assets/logo_1_transparent.png" width="16" height="16" valign="middle" /> **📺 Canlı TV — Tüm Kanallar** | `ListM3u.js` | Canlı TV | **388** | Türkiye'nin tüm ulusal, haber, spor, belgesel, çocuk, sinema, müzik ve yerel/diğer yayınları |
| <img src="assets/canli/stealth/binsports.png" width="16" height="16" valign="middle" /> **⚽ Canlı Spor** | `anthology_spor.js` | Canlı TV | **64** | B-In Sports 1-5, Es Sport 1-2, TV-Bu Spor 1-4, Eksen Spor 1-8, Tab11 Spor 1-8, TRT Spor, A Spor, HT Spor, Taraftarium24 canlı maç kanalı |
| <img src="assets/canli/trt1.png" width="16" height="16" valign="middle" /> **🇹🇷 Ulusal Kanallar** | `anthology_ulusal.js` | Canlı TV | **35** | TRT 1, ATV, Kanal D, Show, Star, NOW, TV8, Kanal 7, Beyaz TV, Teve2, A2 TV, TV360, TRT Genç vb. |
| <img src="assets/canli/ntv.png" width="16" height="16" valign="middle" /> **📰 Canlı Haber** | `anthology_haber.js` | Canlı TV | **37** | NTV, Habertürk, TRT Haber, Sözcü TV, TV100, A Haber, CNN Türk, CNBC-e, TBMM TV, BBC News |
| <img src="assets/canli/trtbelgesel.png" width="16" height="16" valign="middle" /> **🦁 Belgesel & Çocuk** | `anthology_belgesel_cocuk.js` | Canlı TV | **58** | TRT Belgesel, Discovery, National Geographic, BBC Earth, Minika Çocuk, Cartoon Network, TRT Çocuk, TLC, DMAX, TRT EBA |
| <img src="assets/canli/kralpop.png" width="16" height="16" valign="middle" /> **🎵 Müzik & Eğlence** | `anthology_muzik.js` | Canlı TV | **29** | Kral Pop TV, Power TV, PowerTürk TV, Number 1 TV, Dream Türk, TMB TV, Power Dance, Power Love, TRT Müzik |
| <img src="assets/canli/cine1.png" width="16" height="16" valign="middle" /> **🎬 Sinema** | `anthology_sinema.js` | Canlı TV | **112** | BeIN Movies, Sinema TV, Cinemaximum, Yeşilçam, FilmBox, Fix Cinema, Sinevizyon, FX vb. sinema kanalları |

---

## 🎬 Doğrulanmış Eklentiler (41 Aktif / 42 Toplam - Nuvio)

> [!NOTE]
> Aşağıdaki tüm video scraper motorları Nuvio oynatıcısına uygun doğrudan `.m3u8` HLS veya `.mp4`/`.mkv` akışları döndürür.

### 🍿 Film Kaynakları & Arşivleri

| Eklenti | Kaynak / Altyapı | Kalite & Format | İçerik Detayı |
|---|---|:---:|:---:|
| **SineWix** | sinewix.com (snwixdepo) | 1080p Direct MKV | Çift Ses DUAL (Türkçe Dublaj & Altyazı) |
| **HDFilmCehennemi** | hdfilmcehennemi.nl (CloseLoad) | 1080p HLS Master | Çift Ses DUAL (TR Dublaj & Orijinal) + Çoklu Altyazı |
| **FilmModu** | filmmodu.one (ImgsAPI) | 4K & 1080p HLS | Dublaj & Altyazı Seçenekleri |
| **Vidlink** | vidlink.pro (Global CDN) | 4K & 1080p MP4 | Türkçe & Global Çok Dilli |
| **Vidmody** | ha.vixolity.com (Vixolity Multi-Audio HLS) | 1080p HLS | Çift Ses (Türkçe & İngilizce) + Altyazı |
| **SinemaCX** | sinemacc.com (Filmizle / Vixolity Fallback) | 1080p HLS Master | Dublaj & Altyazı Seçenekleri |
| **Webteİzle** | webteizle.info (VidMoly Master) | 1080p HLS | Dublaj & Altyazı Seçenekleri |
| **KultFilmler** | kultfilmler.net (VidMoly/Vidpapi) | 1080p HLS | Kült ve Klasik Sinema Arşivi |
| **HDFilmDelisi** | hdfilmdelisi.one (Vixolity HLS) | 1080p HLS | Güncel Filmler ve JSON API Entegrasyonu |
| **HDFilmIzle** | hdfilmizle.vip (Vidrame/Vidmoxy/FastPlay) | 1080p HLS Master | Çift Ses DUAL (TR Dublaj & Altyazı) + Çoklu VTT |
| **LiderFilm** | liderfilmizle.vip (play.liderfilm.cc VOD / ag2m4 embed) | 1080p HLS Master | Yerli & Yabancı Film ve Dizi Arşivi, Senkronize VTT Altyazı |
| **YouTube Dizi & Film** | youtube.com (Resmi Kanallar & Arşivler) | 1080p Resmî Akış / MP4 | Klasik Yeşilçam & Türk Sineması, BKM, Arzu Film ve Fanatik Arşivleri |

---

### 📺 Dizi Kaynakları & Arşivleri

| Eklenti | Kaynak / Altyapı | Kalite & Format | İçerik Detayı |
|---|---|:---:|:---:|
| **DDizi** | ddizi.tel (Fast Ciner / YouTube / Yandex CDN) | 1080p MP4 / HLS | Yerli Dizi & Güncel Bölümler Arşivi |
| **DDiziBox** | ddizibox.com (Pilavyer / play2.pilavyerplay.top) | 1080p HLS Master | Güncel Yabancı & Yerli Dizi/Film Arşivi (Çift Ses Dublaj/Altyazı) |
| **DiziBak** | dizibak.net (Storage HLS) | 1080p HLS | Yerli ve Yabancı Dizi Arşivi |
| **DiziMom** | ddizimom.net (Pilavyer HLS Master) | 1080p HLS Master | Popüler Yabancı Diziler (Dublaj & Altyazı) |
| **DiziPod** | dizipod.com (player.dizipod.com) | 1080p / 720p HLS | Popüler Yabancı ve Yerli Dizi/Filmler (Altyazı) |
| **DiziBoxİzle** | diziboxizle.com (VidMoly & Ok.ru) | 1080p HLS / MP4 | Güncel Yabancı Diziler & Bölümler Arşivi |
| **DiziWatch** | diziwatch.org (AnizmPlayer / Ok.ru / Sibnet) | 1080p HLS / MP4 | Güncel Anime ve Yabancı Diziler Arşivi |
| **DiziYou** | diziyou.one (Storage CDN) | 1080p HLS | Doğrudan Storage CDN + Türkçe VTT Altyazı |
| **LiderFilm** | liderfilmizle.vip (JWPlayer / ag2m4) | 1080p HLS Master | Yerli & Yabancı Dizi Bölümleri, VTT Altyazı |
| **YouTube Dizi & Film** | youtube.com (Resmi TV & Yapımcı Kanalları) | 1080p Resmî Akış / MP4 | Resmî Türk Dizileri (Kurtlar Vadisi, Ezel, Aşk-ı Memnu vb.), Kümülatif Bölüm Eşleştirme |
| **SetFilmIzle** | setfilmizle.ltd (FastPlay/SetPlay) | 1080p HLS Master | Çift Ses DUAL + Türkçe/İngilizce Altyazı (Film & Dizi) |
| **YabancıDizi** | yabancidizi.news (VidMoly Master) | 1080p HLS | Popüler Yabancı Diziler Arşivi |
| **TvDiziler** | tvdiziler.tv (Twitter Amplify / Ciner / YouTube) | 1080p HLS / MP4 | Yerli TV Dizileri & Güncel Bölümler Arşivi |
| **Anthology Dizi** | NOW / Show TV / KanalD / Star TV / ATV / TRT1 (resmi arşivler) | 1080p HLS | TV Ağı bölümleri — TMDB eşleştirmeli, sabit harita yok |
| **PuhuTV** | puhutv.com (DYG → mncdn) | 1080p HLS | PuhuTV arşivi + Türkçe altyazı |
| **TR Dizi İzle** | trdiziizle.tv/tr2 (WP + YouTube Resmî Yedek) | HLS / MP4 | Yerli dizi arşivi + YouTube Innertube yedeği |
| **SineWix** | sinewix.com (snwixdepo) | 1080p MKV | Dizi Bölümleri Çift Ses DUAL *(manifest.json'da devre dışı)* |
| **Vidlink** | vidlink.pro (Global CDN) | 1080p MP4 | Yabancı Dizi Bölümleri |
| **Vidmody** | ha.vixolity.com (Vixolity Multi-Audio HLS) | 1080p HLS | Çift Ses + Altyazı Dizi Akışları |

---

### ⛩️ Anime & Çizgi Dizi Kaynakları

| Eklenti | Kaynak / Altyapı | Kalite & Format | Dil Desteği |
|---|---|:---:|:---:|
| **AnimeciX** | animecix.tv (TauVideo CDN) | 1080p / 720p / 480p MP4 | Türkçe Altyazı & Dublaj |
| **Anizium** | api.anizium.co (Backblaze CDN) | 4K UHD / 1080p MP4 | Türkçe Dublaj & Senkron WebVTT Altyazı |
| **AsyaAnimeleri** | asyaanimeleri.top (Sibnet & Ok.ru) | 1080p MP4 / HLS | Anime & Donghua Geniş Arşivi |
| **Anizm** | anizm.net (AnizmPlayer V3 & DiziWatch Yedeği) | 1080p HLS / MP4 | Türkçe Anime Akışları |
| **AniMOM** | animom.org (HDPlayer & Sibnet & YourUpload) | 720p HLS / MP4 | Türkçe Anime Akışları |
| **AnimePraX** | animeprax.com (Sibnet & Ok.ru & Dailymotion) | 1080p MP4 / HLS | Türkçe Anime Akışları |
| **SeiCode** | seicode.net (TauVideo, OkRu, Sibnet, VidMoly, MP4Upload) | 1080p MP4 / HLS | Güncel Anime Serileri & Doğrudan Akışlar |
| **SonAnime** | sonanime.com (Backblaze B2 & Cloudflare CDN) | 1080p / 720p / 480p MP4 | Türkçe Altyazılı Geniş Anime & Film Arşivi |

---

### 📦 Anthology M3U / VOD Paketi

| Eklenti | Tür | Kalite | Açıklama |
|---|:---:|:---:|---|
| <img src="assets/logo_1_transparent.png" width="16" height="16" valign="middle" /> **Anthology M3U** | Film / Dizi | 1080p HLS / MP4 | Anthology-Live Go VOD RAM Motoru (9.200+ film, 12.600+ dizi bölümü) + Vixolity & DiziYou doğrudan akışları |

---

## 📡 Canlı TV & Spor Kanalları (388 Kanal)

### ⚽ Spor Kanalları (64 Canlı Kanal)

<div align="center">
  <img src="assets/canli/stealth/binsports.png" width="44" height="44" alt="B-In Sports" /> &nbsp;&nbsp;
  <img src="assets/canli/stealth/essport.png" width="44" height="44" alt="Es Sport" /> &nbsp;&nbsp;
  <img src="assets/canli/stealth/tvbuspor.png" width="44" height="44" alt="TV-Bu Spor" /> &nbsp;&nbsp;
  <img src="assets/canli/stealth/eksenspor.png" width="44" height="44" alt="Eksen Spor" /> &nbsp;&nbsp;
  <img src="assets/canli/trtspor.png" width="44" height="44" alt="TRT Spor" /> &nbsp;&nbsp;
  <img src="assets/canli/aspor.png" width="44" height="44" alt="A Spor" /> &nbsp;&nbsp;
  <img src="assets/canli/htspor.png" width="44" height="44" alt="HT Spor" /> &nbsp;&nbsp;
  <img src="assets/canli/tv85.png" width="44" height="44" alt="TV8,5" />
</div>

<br>

- **B-In Sports:** B-In Sports 1, 2, 3, 4, 5 HD & B-In Sports Max 1, Max 2 HD
- **Es Sport:** Es Sport 1 HD, Es Sport 2 HD & Es Sport Plus HD
- **TV-Bu Spor:** TV-Bu Spor HD, TV-Bu Spor 1, 2, 3, 4 HD
- **Eksen Spor:** Eksen TV & Eksen Sports 1, 2, 3, 4, 5, 6, 7, 8 HD (Avrupa Maçları)
- **Akıllı Spor & Avro Sport & Tab11 Spor:** Akıllı Spor 1-2 HD, Avro Sport 1-2 HD, Tab11 Spor 1-8 HD
- **Ulusal & Kulüp Spor:** TRT Spor HD, TRT Spor Yıldız HD, A Spor HD, HT Spor HD, TV8,5 HD, FB TV HD, GS TV HD, TJK TV HD, Sports TV HD, NBA TV, CBC Sport HD, İdman TV HD
- **Özel & Uluslararası Spor:** Taraftarium24 (Canlı Maçlar & 7/24 Kanallar), Tay TV HD, Real Madrid TV HD, Red Bull TV HD, NHL Network HD, UFC Network HD, Sport Fishing TV HD

---

### 📺 Ulusal, Haber, Belgesel & Müzik Kanalları

<div align="center">
  <img src="assets/canli/trt1.png" width="44" height="44" alt="TRT 1" /> &nbsp;&nbsp;
  <img src="assets/canli/atv.png" width="44" height="44" alt="ATV" /> &nbsp;&nbsp;
  <img src="assets/canli/kanald.png" width="44" height="44" alt="Kanal D" /> &nbsp;&nbsp;
  <img src="assets/canli/showtv.png" width="44" height="44" alt="Show TV" /> &nbsp;&nbsp;
  <img src="assets/canli/startv.png" width="44" height="44" alt="Star TV" /> &nbsp;&nbsp;
  <img src="assets/canli/now.png" width="44" height="44" alt="NOW" /> &nbsp;&nbsp;
  <img src="assets/canli/ntv.png" width="44" height="44" alt="NTV" /> &nbsp;&nbsp;
  <img src="assets/canli/haberturk.png" width="44" height="44" alt="Habertürk" /> &nbsp;&nbsp;
  <img src="assets/canli/trtbelgesel.png" width="44" height="44" alt="TRT Belgesel" /> &nbsp;&nbsp;
  <img src="assets/canli/kralpop.png" width="44" height="44" alt="Kral Pop" />
</div>

<br>

- **🇹🇷 Ulusal Kanallar (35 Kanal):** TRT 1, ATV, Kanal D, Show TV, Star TV, NOW TV, TV8, Kanal 7, Beyaz TV, Teve2, A2 TV, TV360, TRT 2, TRT Türk, Kanal 7 Avrupa, TRT Genç, Euro D, TV4, TYT Türk, Kanal Avrupa, TRT World, TRT Avaz, TRT Kurdî, TRT Arabi, Diyanet TV ve uluslararası/bölgesel ulusal yayınlar
- **📰 Haber Kanalları (37 Kanal):** TRT Haber, NTV, Habertürk, TV100, A Haber, Halk TV, Tele 1, TGRT Haber, Haber Global, 24 TV, Bloomberg HT, TVNET, Ülke TV, Ekotürk, Bengü Türk, Flash Haber, Lider Haber, Türk Haber, CNBC-e, Akit TV, TBMM TV, Finans Türk, BBC News, CBS News, Fox News, France 24, Reuters TV
- **🦁 Belgesel & Çocuk (58 Kanal):** Discovery Channel, National Geographic, BBC Earth, History, Viasat Explore, TRT Belgesel HD, TRT Çocuk HD, Cartoon Network, Boomerang, Minika Çocuk HD, Minika GO HD, TRT EBA, Çiftçi TV, TLC HD, DMAX HD
- **🎵 Müzik & Eğlence (29 Kanal):** Kral Pop TV HD, PowerTürk TV HD, Power TV HD, Number 1 TV HD, TRT Müzik HD, Power Dance, Power Love, Dream Türk, TMB TV, Show Max, Powertürk Taptaze/Slow/Akustik, Number 1 Aşk/Damar/Dance
- **🎬 Sinema (112 Kanal):** BeIN Movies, Sinema TV, Cinemaximum, Yeşilçam 1-3, FilmBox, Fix Cinema, Sinevizyon, Cine 1 HD, FX HD, TRT Nostalji HD
- **📍 Yerel & Diğer Kanallar (43 Yerel + 10 Diğer):** Tüm Kanallar (`ListM3u.js`) altında Türkiye genelindeki yerel televizyonlar ve özel yayınlar

---

## ✅ **Sağlayıcı Durum Notu**

Repoda yer alan **41 aktif eklentinin tamamı** (34 film/dizi/anime/M3U video sağlayıcısı ve 7 Canlı TV kategorisi) çalışan ve doğrulanmış akışlarla aktif durumdadır:

- **SineWix (`sinewix`):** `manifest.json` içinde isteğe bağlı olarak `enabled: false` durumundadır (test ve otomatik derleme kapsamı dışında tutulur).
- **Yedekli Sağlayıcılar (`Anizm`, `AniMOM`, `AnimePraX`, `SinemaCX`, `TR Dizi İzle` vb.):** Origin CDN veya Cloudflare kesintilerine karşı Vixolity, DiziWatch/AnizmPlayer ve YouTube Innertube yedek akış çözücüleriyle desteklenmiştir.

---

## ❓ Sıkça Sorulan Sorular (SSS)

<details>
<summary><strong>1. Anthology tamamen ücretsiz mi? Reklam var mı?</strong></summary>
<br>
Evet! Anthology %100 açık kaynaklı ve kâr amacı gütmeyen bir topluluk projesidir. Kesinlikle üyelik, ücret ya da araya giren video reklamı içermez.
</details>

<details>
<summary><strong>2. Nuvio mu Stremio mu kullanmalıyım? Aralarındaki fark nedir?</strong></summary>
<br>
<p><strong>Nuvio Kullanıcıları:</strong> Anthology'nin tüm özelliklerini sınırsız kullanabilir. 34 adet aktif film, dizi ve anime video scraper motoru ile 7 Canlı TV kataloğu ve 388 canlı yayın kanalı Nuvio'da eksiksiz çalışır.</p>
<p><strong>Stremio Kullanıcıları:</strong> Stremio eklentisi olarak kullanım <strong>yalnızca Canlı TV katalogları (7 vitrin ve 388 kanal)</strong> ile sınırlıdır. Film ve dizi motorları Stremio'da yer almaz. Resmi topluluk dizini için <a href="https://stremio-addons.net/addons/anthology">stremio-addons.net/addons/anthology</a> adresini ziyaret edebilirsiniz.</p>
</details>

<details>
<summary><strong>3. Canlı TV yayınları neden donmuyor ve hızlı açılıyor?</strong></summary>
<br>
Yayınlar öncelikli olarak televizyon kanallarının resmi CDN (Akamai, Daion, Demirören ErCDN, Ciner vb.) altyapılarından doğrudan <code>.m3u8</code> HLS formatında temin edilir; alternatif ve yedek akışlar ise <strong>Anthology-Live</strong> Go proxy motoru üzerinden çoklu kaynak havuzlarıyla (Kool S1/S6/S7, Alemdar, Mahsun, Taraftarium24, Papaz) otomatik failover yapılarak sunulur.
</details>

<details>
<summary><strong>4. TV Box ve Android TV'de en iyi oynatıcı hangisidir?</strong></summary>
<br>
Nuvio ayarlarında oynatıcı olarak <strong>ExoPlayer</strong> veya <strong>VLC</strong> seçilmesi önerilir. Donanım hızlandırma (HW Acceleration) açık olduğunda 1080p ve 4K yayınlar sıfır takılmayla oynatılır.
</details>

<details>
<summary><strong>5. Eklenti ve yayın güncellemelerini nasıl alırım?</strong></summary>
<br>
Depoyu bir kez eklemeniz yeterlidir. Eklentiler ve yayın linkleri GitHub üzerinden güncellendikçe Nuvio ve Stremio her açılışta güncel listeyi otomatik olarak çeker.
</details>

---

## 🧪 Test ve Bütünlük Doğrulama

Tüm eklentiler, Stremio katalogları ve akış sağlayıcıları entegrasyon testleriyle doğrulanabilir:

```bash
# Stremio Anthology — Canlı TV meta ve katalog bütünlük testini çalıştırın:
node scripts/test_stremio_addon.js

# Tüm katalogların öğe çekme testini çalıştırın:
node scripts/test_all_catalogs.js
```

---

## 🤝 Katkıda Bulunanlar

Anthology açık kaynak topluluğunun katkılarıyla gelişmektedir. Katkı sağlayan geliştiricilere teşekkürler:

- **Mustafa Esat Temel** ([@MustafaEsatTemel](https://github.com/MustafaEsatTemel) / `metemel`) — **LiderFilm** (`liderfilmizle.vip`) ve **YouTube Dizi & Film** resmî arşiv sağlayıcı entegrasyonları.

---

## 📜 Krediler & Atıflar (Credits & Acknowledgements)

Anthology projesinin gelişiminde faydalanılan harici açık kaynak katalog, kaynak dizini ve veri sağlayıcılarına teşekkür ederiz:

- **Wiojelt** ([@Wiojelt](https://github.com/Wiojelt)) — [TurkSpor](https://github.com/Wiojelt/TurkSpor) ve [WioSpor](https://github.com/Wiojelt/WioSpor) projelerindeki spor kataloğu yapısı, NetVGold akış referansları ve alternatif canlı yayın akışı kaynakları.
- **iptv-org** ([iptv-org](https://github.com/iptv-org)) — Kamuya açık kanal dizinleri ve topluluk logo veritabanı.

---

## 📄 Lisans & Yasal Uyarı

Anthology açık kaynaklı bir topluluk projesidir. Anthology sunucularında hiçbir video veya yayın barındırılmaz; proje yalnızca kamuya açık resmi CDN ve web kaynaklarını dizinleyen bir arayüz ve eklenti deposudur.

> [!IMPORTANT]
> Anthology eklentisinin kullanıcıya sunduğu tüm içerikler “video paylaşım siteleri” aracılığıyla paylaşılmaktadır. Anthology kendi sunucularında herhangi bir içerik barındırmadığından, bu konuda bir telif hakkı sorumluluğu kabul etmemektedir.