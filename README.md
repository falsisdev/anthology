<div align="center">
  <img src="assets/logo_1_transparent.png" alt="Anthology Logo" width="140" />
  <h1>Anthology</h1>
  <p><strong>Nuvio için Doğrulanmış Türkçe Film, Dizi, Anime, Canlı TV ve Zengin Katalog Eklenti Deposu</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Nuvio-Eklenti_Deposu-00e676?style=for-the-badge&logo=github&logoColor=white" alt="Nuvio" />
    <img src="https://img.shields.io/badge/Stremio-Canlı_TV-ff0055?style=for-the-badge&logo=stremio&logoColor=white" alt="Stremio Canlı TV" />
    <img src="https://img.shields.io/badge/Eklenti-37_Doğrulanmış-3b82f6?style=for-the-badge" alt="37 Aktif Eklenti" />
    <img src="https://img.shields.io/badge/Katalog-6_Canlı_TV_Kataloğu-8b5cf6?style=for-the-badge" alt="6 Canlı TV Kataloğu" />
    <img src="https://img.shields.io/badge/Kanal-100_Canlı_Kanal-00e676?style=for-the-badge" alt="100 Canlı Kanal" />
  </p>

  <a href="https://falsisdev.github.io/anthology">🌐 Web Sitesi</a> &nbsp;|&nbsp;
  <a href="#-kurulum-rehberi-çift-katmanlı-kusursuz-deneyim">📲 Kurulum</a> &nbsp;|&nbsp;
  <a href="#-canlı-tv-katalogları-6-katalog">📚 Canlı TV Katalogları</a> &nbsp;|&nbsp;
  <a href="#-doğrulanmış-eklentiler-37-aktif">🎬 Eklentiler (37)</a> &nbsp;|&nbsp;
  <a href="#-canlı-tv--spor-kanalları">📡 Canlı TV & Spor</a>
</div>

---

## 📲 Kurulum Rehberi (Çift Katmanlı Kusursuz Deneyim)

Nuvio ve Stremio'da yerli dizileri, animeleri, çizgi dizileri ve **100 Canlı TV kanalını** hem **ana sayfada vitrin olarak görmek** hem de **doğrulanmış resmi CDN akışlarıyla doğrudan oynatmak** için aşağıdaki adımları tamamlayın:

---

### 1️⃣ Adım: Video Oynatma Motorunu Ekleyin (Nuvio Pluginleri)
Bu adım, bir içerik açtığınızda arka planda çalışan 37 Türkçe/yabancı video scraper'ını Nuvio oynatıcısına yükler.

1. **Nuvio** uygulamasında **Ayarlar** → **Genel** → **İçerik & Keşif** → **Pluginler** → **Depo Ekle** bölümüne gidin.
2. Aşağıdaki bağlantıyı yapıştırıp **Ekle** butonuna basın:

```text
https://raw.githubusercontent.com/falsisdev/anthology/main/manifest.json
```

---

### 2️⃣ Adım: Canlı TV Ana Sayfa Kataloglarını Ekleyin (Anthology — Canlı TV)
Bu adım; 100 Canlı TV kanalını 6 kategoride (**Tüm Kanallar**, **Ulusal**, **Canlı Spor**, **Canlı Haber**, **Belgesel & Çocuk**, **Müzik & Eğlence**) **Nuvio veya Stremio'nun ana sayfa vitrinine** taşır. Tüm kanalların kapakları standart **221x126** banner formatındadır.

1. **Nuvio** veya **Stremio** uygulamasında **Eklentiler / Addons** → **Depo / Addon Ekle** bölümüne gidin.
2. Aşağıdaki statik katalog bağlantısını yapıştırıp **Ekle / Install** butonuna basın:

```text
https://falsisdev.github.io/anthology/stremio/manifest.json
```
*(Alternatif GitHub Raw bağlantısı: `https://raw.githubusercontent.com/falsisdev/anthology/main/stremio/manifest.json`)*

---

> [!TIP]
> **Nasıl Birlikte Çalışırlar?**
> Nuvio veya Stremio'da 2. Adımı eklediğinizde ana sayfanızda **Anthology — Canlı TV** vitrinleri (Tüm Kanallar, Ulusal Kanallar, Canlı Spor, Canlı Haber, Belgesel & Çocuk, Müzik & Eğlence) görünür. Dilediğiniz kanala tıkladığınız anda resmi CDN akışları (`.m3u8`) üzerinden canlı yayın kesintisiz başlar. 1. Adım ise Nuvio içerisinde film, dizi ve animeleri en yüksek kalitede izlemenizi sağlayan video motorudur.

---

## 📚 Canlı TV Katalogları (6 Katalog)

Nuvio ve Stremio ana ekranında canlı TV kanallarını kategorilere ayrılmış vitrinler olarak sunan resmi kataloglar:

| Katalog | Sağlayıcı | Tür | Kanal Sayısı | Açıklama |
|---|---|:---:|:---:|---|
| <img src="assets/logo_1_transparent.png" width="16" height="16" valign="middle" /> **📺 Canlı TV — Tüm Kanallar** | `ListM3u.js` | Canlı TV | 100 | Türkiye'nin tüm ulusal, haber, spor, belgesel, çocuk ve müzik kanalları |
| <img src="assets/canli/trt1.png" width="16" height="16" valign="middle" /> **🇹🇷 Ulusal Kanallar** | `anthology_ulusal.js` | Canlı TV | 19 | TRT 1, ATV, Kanal D, Show, Star, NOW, TV8, TVNET, Ülke TV, TRT World vb. |
| <img src="assets/canli/aspor.png" width="16" height="16" valign="middle" /> **⚽ Canlı Spor** | `anthology_spor.js` | Canlı TV | 49 | TRT Spor, A Spor, HT Spor, FB TV, TJK TV, BeIN Sports, S Sport, Tivibu |
| <img src="assets/canli/ntv.png" width="16" height="16" valign="middle" /> **📰 Canlı Haber** | `anthology_haber.js` | Canlı TV | 18 | NTV, Habertürk, TRT Haber, TV100, Sözcü TV, Ülke TV, Ekotürk, TVNET |
| <img src="assets/canli/trtbelgesel.png" width="16" height="16" valign="middle" /> **🦁 Belgesel & Çocuk** | `anthology_belgesel_cocuk.js` | Canlı TV | 7 | TRT Belgesel, Minika Çocuk, Minika GO, TRT Çocuk, TRT EBA İlkokul/Orta/Lise |
| <img src="assets/canli/kralpop.png" width="16" height="16" valign="middle" /> **🎵 Müzik & Eğlence** | `anthology_muzik.js` | Canlı TV | 7 | Kral Pop TV, Power TV, PowerTürk TV, Number 1 TV, Power Dance, TRT Müzik |

---

## 🎬 Doğrulanmış Eklentiler (37 Aktif)

> [!NOTE]
> Tüm eklentiler doğrudan Nuvio video oynatıcısına uygun `.m3u8` HLS veya `.mp4`/`.mkv` doğrudan akışları döndürür. Bozuk iframe veya oynatılamayan bağlantı kesinlikle içermez.

### 🍿 Film Kaynakları & Tür Paketleri

| Eklenti | Kaynak / Altyapı | Kalite & Format | İçerik Detayı |
|---|---|:---:|:---:|
| <img src="assets/logo_1_transparent.png" width="16" height="16" valign="middle" /> **Anthology Film (M3U)** | Lunedor / Zerk / PowerBoard | 1080p HLS | Dublaj & Altyazı Film Arşivi |
| <img src="assets/logo_1_transparent.png" width="16" height="16" valign="middle" /> **Anthology Aksiyon & Macera** | Lunedor & Zerk HLS Master | 1080p HLS | Aksiyon, Suç ve Gerilim Sineması |
| <img src="assets/logo_1_transparent.png" width="16" height="16" valign="middle" /> **Anthology Bilim Kurgu** | Lunedor & Zerk HLS Master | 1080p HLS | Bilim Kurgu, Uzay ve Fantastik |
| <img src="assets/logo_1_transparent.png" width="16" height="16" valign="middle" /> **Anthology Korku & Gerilim** | Lunedor & Zerk HLS Master | 1080p HLS | Korku, Gizem ve Gerilim |
| <img src="assets/logo_1_transparent.png" width="16" height="16" valign="middle" /> **Anthology Komedi** | Lunedor & Zerk HLS Master | 1080p HLS | Yerli & Yabancı Komedi |
| <img src="assets/logo_1_transparent.png" width="16" height="16" valign="middle" /> **Anthology Animasyon** | Lunedor & Zerk HLS Master | 1080p HLS | Animasyon & Çizgi Sinema |
| <img src="assets/logo_1_transparent.png" width="16" height="16" valign="middle" /> **Anthology Yerli Film & Yeşilçam** | Zerk & Lunedor Türk Sineması | 1080p HLS / MP4 | Klasik Yeşilçam & Yerli Sinema |
| <img src="assets/canli/trtbelgesel.png" width="16" height="16" valign="middle" /> **Anthology Belgesel & Doğa** | Lunedor & Zerk Belgesel Arşivi | 1080p HLS | Doğa, Bilim ve Tarih Belgeselleri |
| <img src="assets/canli/trtcocuk.png" width="16" height="16" valign="middle" /> **Anthology Çocuk & Aile** | Lunedor & Zerk Aile Arşivi | 1080p HLS | Aile & Çocuk Sineması |
| <img src="assets/logo_1_transparent.png" width="16" height="16" valign="middle" /> **Anthology IMDb Top Rated** | En Yüksek Puanlı Başyapıtlar | 1080p HLS | Kült & IMDb Top 250 Ödüllü Sinema |
| **FilmModu** | filmmodu.one (ImgsAPI) | 4K & 1080p HLS | Dublaj & Altyazı Seçenekleri |
| **DiziPal** | dizipal2127.com (Imagestoo) | 1080p HLS | Dublaj & Altyazı Seçenekleri |
| **JetFilmİzle** | jetfilmizle.now (Videopark & PlayerX) | 1080p MP4 / HLS | Dublaj & Çoklu Dil Seçenekleri |
| **SinemaCX** | sinema.gg (Player.filmizle.in) | 1080p HLS | Dublaj & Altyazı Seçenekleri |
| **SineWix** | sinewix (snwixdepo) | 1080p Direct MKV | Çift Ses DUAL |
| **Vidlink** | vidlink.pro (Global CDN) | 4K & 1080p MP4 | Türkçe & Global Çok Dilli |
| **Vidmody** | vidmody.com (Multi-Audio HLS) | 1080p HLS | Çift Ses (Türkçe & İngilizce) + Altyazı |
| **Webteİzle** | webteizle.info (VidMoly Master) | 1080p HLS | Dublaj & Altyazı Seçenekleri |

### 📺 Dizi Kaynakları & Arşivleri

| Eklenti | Kaynak / Altyapı | Kalite & Format | İçerik Detayı |
|---|---|:---:|:---:|
| **Mahsun Dizi** | mahsundizi8.com (DosyaLoad BEPLAYER+) | 1080p HLS | Popüler Yabancı Diziler & Filmler (TR/EN Altyazı) |
| **DDizi** | ddizi.im (Fast CDN / Akamai / Google Direct) | 1080p MP4 / HLS | Yerli Dizi & Güncel Bölümler Arşivi |
| **DiziBox** | dizibox.live (VidMoly Master) | 1080p HLS Master | Popüler Yabancı Diziler Arşivi |
| **DiziMom** | dizimom.diy (HDPlayer Fire HLS) | 1080p HLS Master | Popüler Yabancı Diziler (Dublaj & Altyazı) |
| <img src="assets/logo_1_transparent.png" width="16" height="16" valign="middle" /> **Anthology Dizi (M3U)** | Zerk / Ciner CDN | 1080p MP4 / HLS | Yerli & Yabancı Dizi Arşivi |
| <img src="assets/logo_1_transparent.png" width="16" height="16" valign="middle" /> **Anthology Yerli Dizi** | Ciner & Zerk CDN | 1080p MP4 / HLS | Güncel & Klasik Türk Dizileri |
| <img src="assets/logo_1_transparent.png" width="16" height="16" valign="middle" /> **Anthology Yabancı Dizi** | Zerk DUAL Master CDN | 1080p HLS | Popüler Yabancı Dizi Arşivi |
| **YabancıDizi** | yabancidizi.news (VidMoly Master) | 1080p HLS | Popüler Yabancı Diziler (Dublaj & Altyazı) |
| **SezonlukDizi** | sezonlukdizi.cc (VidMoly) | 1080p HLS | Dublaj & Altyazı |
| **DiziPal** | dizipal2127.com (FormationFeed) | 1080p HLS | Dublaj & Altyazı |
| **DiziYou** | diziyou.one (Storage CDN) | 1080p HLS | Dublaj + TR VTT |
| **SineWix** | sinewix (snwixdepo) | 1080p Direct MKV | Çift Ses DUAL |
| **Vidlink** | vidlink.pro (Global CDN) | 1080p MP4 | Türkçe & Global |
| **Vidmody** | vidmody.com (Multi-Audio HLS) | 1080p HLS | Çift Ses (Türkçe & İngilizce) + Altyazı |

### ⛩️ Anime & Çizgi Dizi Kaynakları

| Eklenti | Kaynak / Altyapı | Kalite & Format | Dil Desteği |
|---|---|:---:|:---:|
| **AnimeciX** | animecix.tv (TauVideo CDN) | 1080p / 720p / 480p MP4 | Türkçe Altyazı |
| **ÇizgiMax** | cizgimax.online (TauVideo & Sibnet) | 1080p / 720p Direct MP4 | Dublaj & Altyazı |
| **TurkAnime** | turkanime.tv (Sibnet & ArtPlayer) | 1080p MP4 / HLS | Türkçe Altyazı |

### 📡 Canlı TV & Spor Paketleri

| Eklenti | Kaynak / Altyapı | Kanal Sayısı | İçerik Detayı |
|---|---|:---:|:---:|
| <img src="assets/logo_1_transparent.png" width="16" height="16" valign="middle" /> **Anthology Canlı TV** | M3U Canlı Akış Kataloğu | 80+ Kanal | Tüm Ulusal, Spor, Haber ve Belgesel |
| <img src="assets/canli/aspor.png" width="16" height="16" valign="middle" /> **Anthology Canlı Spor** | Yüksek Hızlı Spor Akışları | 49 Kanal | BeIN Sports 1-5, S Sport, Exxen Spor, Tivibu |
| <img src="assets/canli/ntv.png" width="16" height="16" valign="middle" /> **Anthology Canlı Haber** | 7/24 Kesintisiz Haber | 18 Kanal | NTV, Habertürk, TRT Haber, Sözcü TV, CNN Türk, TVNET, Ülke TV |
| <img src="assets/canli/trt1.png" width="16" height="16" valign="middle" /> **Anthology Ulusal Kanallar** | Ulusal Televizyon Yayınları | 18 Kanal | TRT 1, ATV, Kanal D, Show, Star, TV8, NOW, TVNET, Ülke TV |
| <img src="assets/canli/trtbelgesel.png" width="16" height="16" valign="middle" /> **Anthology Belgesel & Çocuk** | Belgesel ve Çocuk Kanalları | 7 Kanal | TRT Belgesel, Minika Çocuk, Minika GO, TRT Çocuk, TRT EBA |
| <img src="assets/canli/kralpop.png" width="16" height="16" valign="middle" /> **Anthology Müzik & Eğlence** | 7/24 Canlı Müzik & Video Klip | 7 Kanal | Kral Pop TV, Power TV, PowerTürk TV, Number 1 TV, Power Dance |

---

## 📡 Canlı TV & Spor Kanalları (100 Kanal)

### ⚽ Spor Kanalları (49 Canlı Kanal)

<div align="center">
  <img src="https://i.pinimg.com/736x/20/f8/53/20f853787e15c584b40cb92aee225029.jpg" width="48" height="48" alt="BeIN Sports" /> &nbsp;&nbsp;
  <img src="https://upload.wikimedia.org/wikipedia/commons/9/91/S_Sport_Plus_Logo.png" width="48" height="48" alt="S Sport" /> &nbsp;&nbsp;
  <img src="https://upload.wikimedia.org/wikipedia/tr/thumb/3/36/Tivibu_spor_logosu.jpg/250px-Tivibu_spor_logosu.jpg" width="48" height="48" alt="Tivibu Spor" /> &nbsp;&nbsp;
  <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTK9InesAS1UOC0SncC59Td7MRuowocxr7VkTw3zMisTjzQ0kQICzZj8qWI&s=10" width="48" height="48" alt="Exxen Spor" /> &nbsp;&nbsp;
  <img src="https://images.seeklogo.com/logo-png/39/2/trt-logo-png_seeklogo-399831.png" width="48" height="48" alt="TRT Spor" /> &nbsp;&nbsp;
  <img src="assets/canli/aspor.png" width="48" height="48" alt="A Spor" /> &nbsp;&nbsp;
  <img src="assets/canli/htspor.png" width="48" height="48" alt="HT Spor" /> &nbsp;&nbsp;
  <img src="assets/canli/tv8.png" width="48" height="48" alt="TV8,5" />
</div>

<br>

- <img src="https://i.pinimg.com/736x/20/f8/53/20f853787e15c584b40cb92aee225029.jpg" width="18" height="18" valign="middle" /> **BeIN Sports:** BeIN Sports 1, 2, 3, 4, 5 & Max 1, Max 2 HD
- <img src="https://upload.wikimedia.org/wikipedia/commons/9/91/S_Sport_Plus_Logo.png" width="18" height="18" valign="middle" /> **S Sport:** S Sport 1 HD, S Sport 2 HD & S Sport Plus HD
- <img src="https://upload.wikimedia.org/wikipedia/tr/thumb/3/36/Tivibu_spor_logosu.jpg/250px-Tivibu_spor_logosu.jpg" width="18" height="18" valign="middle" /> **Tivibu Spor:** Tivibu Spor HD, Tivibu Spor 1, 2, 3, 4 HD
- <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTK9InesAS1UOC0SncC59Td7MRuowocxr7VkTw3zMisTjzQ0kQICzZj8qWI&s=10" width="18" height="18" valign="middle" /> **Exxen Spor:** Exxen TV & Exxen Spor 1, 2, 3, 4, 5, 6, 7, 8 HD
- <img src="https://images.seeklogo.com/logo-png/39/2/trt-logo-png_seeklogo-399831.png" width="18" height="18" valign="middle" /> **Ulusal & Diğer Spor:** TRT Spor HD, TRT Spor Yıldız HD, A Spor HD, HT Spor HD, TV8,5 HD, Smart Spor 1-2, EuroSport 1-2, NBA TV, FB TV, TJK TV, Sports TV, CBC Sport, iDMAN TV

### 📺 Ulusal, Haber, Belgesel & Müzik Kanalları

<div align="center">
  <img src="assets/canli/atv.png" width="48" height="48" alt="ATV" /> &nbsp;&nbsp;
  <img src="assets/canli/kanald.png" width="48" height="48" alt="Kanal D" /> &nbsp;&nbsp;
  <img src="assets/canli/showtv.png" width="48" height="48" alt="Show TV" /> &nbsp;&nbsp;
  <img src="assets/canli/startv.png" width="48" height="48" alt="Star TV" /> &nbsp;&nbsp;
  <img src="assets/canli/now.png" width="48" height="48" alt="NOW" /> &nbsp;&nbsp;
  <img src="assets/canli/ntv.png" width="48" height="48" alt="NTV" /> &nbsp;&nbsp;
  <img src="assets/canli/haberturk.png" width="48" height="48" alt="Habertürk" /> &nbsp;&nbsp;
  <img src="assets/canli/trtbelgesel.png" width="48" height="48" alt="TRT Belgesel" /> &nbsp;&nbsp;
  <img src="assets/canli/kralpop.png" width="48" height="48" alt="Kral Pop" /> &nbsp;&nbsp;
  <img src="assets/canli/powerturk.png" width="48" height="48" alt="PowerTürk" />
</div>

<br>

- <img src="assets/canli/trt1.png" width="18" height="18" valign="middle" /> **Ulusal Kanallar (19 Kanal):** TRT 1, ATV, Kanal D, Show TV, Star TV, NOW TV, TV8, Kanal 7, Beyaz TV, Teve2, A2 TV, TV360, TRT 2, TRT Türk, Kanal 7 Avrupa, TRT World, TRT Avaz, TRT Kurdî, TRT Arabi
- <img src="assets/canli/ntv.png" width="18" height="18" valign="middle" /> **Haber Kanalları (18 Kanal):** TRT Haber, NTV, Habertürk, TV100, A Haber, Halk TV, Tele 1, TGRT Haber, Haber Global, 24 TV, Bloomberg HT, TVNET, Ülke TV, Ekotürk, Bengü Türk, Flash Haber, Lider Haber, Türk Haber
- <img src="assets/canli/trtbelgesel.png" width="18" height="18" valign="middle" /> **Belgesel & Çocuk (7 Kanal):** TRT Belgesel HD, Minika Çocuk HD, Minika GO HD, TRT Çocuk HD, TRT EBA İlkokul, TRT EBA Ortaokul, TRT EBA Lise
- <img src="assets/canli/kralpop.png" width="18" height="18" valign="middle" /> **Müzik & Eğlence (7 Kanal):** Kral Pop TV HD, Power TV HD, PowerTürk TV HD, Number 1 TV HD, Power Dance HD, Power Love HD, TRT Müzik HD

---

## 🧪 Test ve Doğrulama

Tüm canlı TV eklentileri, katalogları ve sağlayıcılar entegrasyon testleriyle doğrulanabilir:

```bash
# Stremio Anthology — Canlı TV eklentisinin bütünlük ve meta testini çalıştırın:
node scripts/test_stremio_addon.js

# Tüm katalogların öğe çekme testini çalıştırın:
node scripts/test_all_catalogs.js
```
