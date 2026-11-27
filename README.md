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
    <img src="https://img.shields.io/badge/Sürüm-1.8.44-blue?style=for-the-badge" alt="Sürüm 1.8.44" />
    <img src="https://img.shields.io/badge/Eklenti-33_Aktif-3b82f6?style=for-the-badge" alt="33 Aktif Eklenti" />
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
>
> ### ⚠️ Platformlar Arasındaki Kapsam ve Kullanım Farkı:
>
> - 🌟 **Nuvio Kullanıcıları:** Anthology'nin sunduğu **tüm özellikleri sorunsuz, sınırsız ve eksiksiz** kullanabilir. Vessel mimarisiyle birebir hizalanmış **33 aktif eklentinin tamamı** (birleşik **Anthology Canlı TV** + **Anthology+** TMDB motoru ve **31** Türkçe/yabancı film, dizi, anime kaynağı) ile **388 Canlı TV kanalı** Nuvio oynatıcısında tek çatı altında eksiksiz çalışır.
> - 🟣 **Stremio Kullanıcıları:** Stremio eklentisi olarak kullanım **yalnızca Canlı TV katalogları (7 vitrin ve 388 canlı yayın kanalı) ile sınırlıdır**. Stremio'nun eklenti protokolü gereği film ve dizi video scraper'ları statik olarak Stremio üzerinde çalışmaz; bu nedenle Stremio'da yalnızca canlı televizyon ve spor akışları sunulmaktadır.
> - 🚢 **Vessel Kullanıcıları (Native TypeScript):** Vessel kendi native TypeScript eklenti sistemine özel ayrı ve hafif [**anthology-vessel**](https://github.com/falsisdev/anthology-vessel) deposuna sahiptir (`gh:falsisdev/anthology-vessel`). Birleşik Canlı TV (`anthology-tv`, 7 kategori / 388 kanal), toggle ayarlı TMDB birleşik motoru (`Anthology+`) ve 31 site eklentisiyle toplam **33 native TypeScript eklentisi** sunar; aynı zamanda Vessel eklenti geliştiricileri için ilk resmi **referans mimari** örneğidir.
> - 🌐 **Stremio Topluluk Sayfası:** Eklentiyi resmi Stremio topluluk dizininde incelemek için [stremio-addons.net/addons/anthology](https://stremio-addons.net/addons/anthology) adresini ziyaret edebilirsiniz.

---

## ⚡ 30 Saniyede Hızlı Kurulum

| Platform                            |            Kapsam Durumu            | Kurulum Yöntemi                                                                                                                                                                                                                                                                                                                       | Ne İşe Yarar?                                                                                                                                                                |
| ----------------------------------- | :---------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🚢 **Vessel** _(Native TypeScript)_ |     **33 Native TS Eklentisi**      | [**Vessel'da Doğrudan Aç (`vessel://`)**](vessel://install?src=gh:falsisdev/anthology-vessel) veya `Extensions` → `Add Repository` alanına şunu yapıştırın:<br>`gh:falsisdev/anthology-vessel` _(Depo: [anthology-vessel](https://github.com/falsisdev/anthology-vessel))_                                                            | **Sıfır şişkinlikli TypeScript SDK:** Birleşik `anthology-tv` (388 kanal) + toggle ayarlı `Anthology+` TMDB motoru + 31 site kaynağını doğrudan `repo.json` üzerinden kurar. |
| 🌟 **Nuvio** _(Önerilen)_           | **Tüm Eklenti Sorunsuz & Eksiksiz** | `Ayarlar` → `Pluginler` → `Depo Ekle` yoluna aşağıdaki URL'yi yapıştırın:<br> `https://raw.githubusercontent.com/falsisdev/anthology/main/manifest.json`                                                                                                                                                                              | **33 aktif eklentiyi** (`Anthology Canlı TV`, `Anthology+` ve 31 film/dizi/anime kaynağı) yükler.                                                                            |
| 🟣 **Stremio** _(Tek Tık)_          |  **Yalnızca Canlı TV ile Sınırlı**  | [**Stremio'ya Doğrudan Ekle (Tıklayın)**](stremio://falsisdev.github.io/anthology/stremio/manifest.json) veya [**Web Stremio'da Aç**](https://web.stremio.com/#/addons?addon=https%3A%2F%2Ffalsisdev.github.io%2Fanthology%2Fstremio%2Fmanifest.json)<br>_(Dizin: [stremio-addons.net](https://stremio-addons.net/addons/anthology))_ | **388 Canlı TV kanalını** 7 vitrin kataloğu olarak Stremio ana sayfasına ekler.                                                                                              |

---

## 📲 Kurulum Rehberi

Nuvio ve Stremio'da yerli dizileri, animeleri, sinema filmlerini ve **388 Canlı TV kanalını** hem **ana sayfanızda vitrin olarak görmek** hem de **doğrulanmış resmi CDN ve Anthology-Live akışlarıyla doğrudan oynatmak** için aşağıdaki adımları uygulayın:

---

### 1️⃣ Adım: Video Oynatma Motorunu Ekleyin (Nuvio Pluginleri)

> **Zorunlu (Yalnızca Nuvio):** Bu adım, bir film, dizi veya anime açtığınızda arka planda çalışan **33 aktif Türkçe/yabancı video ve Canlı TV eklentisini** Nuvio video motoruna yükler. _(Stremio'da scraper motorları desteklenmez; bu adım Nuvio içindir)._

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

_(Stremio uygulaması yüklüyse doğrudan **[Buraya Tıklayarak](stremio://falsisdev.github.io/anthology/stremio/manifest.json)** tek tıkla yükleyebilir veya [stremio-addons.net/addons/anthology](https://stremio-addons.net/addons/anthology) topluluk sayfasından kurabilirsiniz.)_

---

> [!TIP]
> **Nasıl Birlikte Çalışırlar?**
>
> - **Nuvio'da:** 1. Adım ve 2. Adımı birlikte eklediğinizde, Nuvio ana sayfanızda hem zengin Canlı TV vitrinleri görünür hem de içerik aradığınızda 33 Nuvio eklentisi en kaliteli (1080p, 4K, Çift Ses) akışları anında oynatır.
> - **Stremio'da:** Stremio kullanıcıları yalnızca 2. Adımı ekleyerek 388 Canlı TV kanalını kesintisiz resmi CDN ve Anthology-Live çoklu kaynak bağlantılarıyla izleyebilir.

## ☁️ Anthology WebDAV Sunucusu (Infuse, VidHub, SenPlayer, Kodi & VLC)

Nuvio veya Stremio dışında **Apple TV, iOS, macOS, Android TV ve Windows** cihazlarınızda **Infuse, VidHub, SenPlayer, Kodi, Nova Player ve VLC** gibi yerel medya oynatıcıları veya doğrudan dosya yöneticilerini (Finder / Windows Explorer) kullanmak isterseniz **Anthology WebDAV** projesini kullanabilirsiniz!

- **Sıfır Disk Alanı (In-Memory VFS):** Cihazınızda yer kaplamadan film, dizi ve anime arşivlerini sanal dosya sistemi olarak doğrudan medya oynatıcınıza bağlar.
- **Çoklu Kaynak & HLS/Range Proxy:** Anthology'nin doğrulanmış içerik sağlayıcılarını yerel oynatıcılarla tam uyumlu hale getirir.
- **Kolay Kurulum & Canlı Kullanım:** İster hazır sunucu üzerinden hesabınızla, ister kendi sisteminizde (Self-Hosted) çalıştırarak kullanabilirsiniz.

👉 **Detaylı bilgi, kurulum rehberi ve kullanım için:** [**github.com/falsisdev/anthology-dav**](https://github.com/falsisdev/anthology-dav) _(veya [Kullanım Wiki Rehberi](https://github.com/falsisdev/anthology-dav/wiki))_

---

## ✅ **Sağlayıcı Durum Notu**

Repoda yer alan **33 aktif eklenti** (birleşik `Anthology Canlı TV` — 7 kategori / 388 kanal, `Anthology+` birleşik TMDB/IMDb motoru ve 31 film/dizi/anime sağlayıcısı) Vessel mimarisiyle hizalı biçimde sunulur:

- **SineWix (`sinewix`):** Eski repo indeksinden kaldırılmıştır.
- **Yedekli Sağlayıcılar (`Anthology+`, `SinemaCX`, `SetFilmİzle`, `KultFilmler`, `HDFilmCehennemi`, `Anizm`, `TR Dizi İzle` vb.):** Origin CDN veya alternatif oynatıcı kesintilerine karşı paylaşılan `extractors.js` motoru, Vixolity, DiziWatch/AnizmPlayer ve doğrulanmış YouTube Innertube yedek akış çözücüleriyle desteklenmiştir.

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
<p><strong>Nuvio Kullanıcıları:</strong> Anthology'nin tüm özelliklerini sınırsız kullanabilir. 33 aktif Nuvio eklentisi (birleşik Anthology Canlı TV, Anthology+ ve 31 film/dizi/anime sağlayıcısı) Nuvio'da eksiksiz çalışır.</p>
<p><strong>Stremio Kullanıcıları:</strong> Stremio eklentisi olarak kullanım <strong>yalnızca Canlı TV katalogları (7 vitrin ve 388 kanal)</strong> ile sınırlıdır. Film ve dizi motorları Stremio'da yer almaz. Resmi topluluk dizini için <a href="https://stremio-addons.net/addons/anthology">stremio-addons.net/addons/anthology</a> adresini ziyaret edebilirsiniz.</p>
</details>

<details>
<summary><strong>3. TV Box ve Android TV'de en iyi oynatıcı hangisidir?</strong></summary>
<br>
Nuvio ayarlarında oynatıcı olarak <strong>ExoPlayer</strong> veya <strong>VLC</strong> seçilmesi önerilir. Donanım hızlandırma (HW Acceleration) açık olduğunda 1080p ve 4K yayınlar sıfır takılmayla oynatılır.
</details>

<details>
<summary><strong>4. Eklenti ve yayın güncellemelerini nasıl alırım?</strong></summary>
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

### DMCA Sorumluluk Reddi Beyanı

İşbu bildirimle, bu uzantıların internetten video dosyalarını getiren ve işlevsel olarak sıradan bir tarayıcıdan farkı olmadığını; bu nedenle Dijital Binyıl Telif Hakkı Yasası’nın (DMCA) hükümlerini ihlal etmediğini bildiririz. Bu uzantıların erişebileceği içerikler ne bizim tarafımızdan ne de Stremio veya Nuvio uygulamaları tarafından barındırılmakta olup, uzantılar bu içeriklere özerk tarama modunda eriştikleri web siteleri üzerinden ulaşmaktadır. İçeriklerin kullanımı ve bununla ilgili tüm yasal sorumluluk tamamen kullanıcıya ve kullanıcının ülke ya da eyalet yasalarına aittir. Eğer herhangi bir fikri mülkiyet hakkı ihlali olduğunu düşünüyorsanız, lütfen bu depo sahipleri ya da Stremio veya Nuvio uygulamaları yerine içeriklerin barındırıldığı gerçek sunucularla iletişime geçiniz.
