<div align="center">
  <img src="assets/logo_1_transparent.png" alt="Anthology Logo" width="180" style="margin-bottom: 12px;" />
  <h1>Anthology - Nuvio Eklenti Deposu</h1>
  <p>Nuvio uygulaması için optimize edilmiş, 0 sunucu maliyetli, yerel çalışan 20+ Türkçe Dizi, Film, Anime ve Canlı TV/Spor eklenti deposu.</p>

  <p>
    <a href="#-kurulum-ve-ekleme"><img src="https://img.shields.io/badge/Nuvio-Eklenti_Deposu-00e676?style=for-the-badge&logo=github&logoColor=white" alt="Nuvio Deposu" /></a>
    <img src="https://img.shields.io/badge/Maliyet-0_TL_%2F_Sınırsız-blue?style=for-the-badge" alt="Ücretsiz" />
    <img src="https://img.shields.io/badge/Durum-Aktif_%26_Güncel-success?style=for-the-badge" alt="Durum" />
  </p>
</div>

---

## 📌 Hızlı Kurulum Linki

Nuvio uygulamasında eklenti deposu olarak aşağıdaki bağlantıyı ekleyin:

```text
https://raw.githubusercontent.com/falsisdev/anthology/main/manifest.json
```

---

## 🛠️ Kurulum ve Ekleme (Nuvio)

1. **Nuvio** uygulamasını açın.
2. **Ayarlar (Settings)** ➔ **Eklentiler (Plugins / Providers)** sekmesine girin.
3. **Depo Ekle (Add Repository)** kısmına aşağıdaki bağlantıyı yapıştırın:
   ```text
   https://raw.githubusercontent.com/falsisdev/anthology/main/manifest.json
   ```
4. **Ekle** butonuna tıklayın. Tüm dizi, film ve canlı TV eklentileri otomatik olarak cihazınıza yüklenecektir!

---

## 🌟 Neden Bu Sistem?

* ⚡ **0 Sunucu & Sınırsız Bant Genişliği:** Eklentiler doğrudan kullanıcının kendi cihazında (telefon, TV, PC) çalışır. Vercel veya Netlify gibi servislerin 100 GB kota sınırlarına takılmazsınız.
* 🔄 **Otomatik Güncelleme:** GitHub deposunda yapılan her düzeltme ve yeni eklenen kanal, Nuvio kullanıcılarına anında yansır.
* 🛡️ **Engelsiz Oynatma:** İstekler doğrudan sizin ev internetinizden / cihazınızdan çıktığı için sunucu IP engelleri ve bot korumaları aşılır.

---

## 🍿 Dahil Olan Eklentiler & Sağlayıcılar

| Eklenti Adı | Tür | Desteklenen Formatlar | Açıklama |
| :--- | :---: | :---: | :--- |
| **SineWix** | Film / Dizi / Anime | MP4, MKV | 5000+ HD Türkçe dublaj ve altyazılı içerik arşivi. |
| **DiziYou** | Dizi | HLS (m3u8) | Hızlı ve popüler yabancı dizi arşivi. |
| **Rec TV** | Film / Dizi | HLS (m3u8) | Güncel dizi ve popüler yayın kaynakları. |
| **SezonlukDizi** | Dizi | MP4, MKV | Türkçe dublaj & altyazılı geniş dizi kütüphanesi. |
| **FilmModu** | Film | MP4, MKV | Full HD film sağlayıcısı. |
| **Webteİzle** | Film | MP4, MKV | Vidmoly/Sibnet üzerinden yüksek kaliteli filmler. |
| **JetFilmİzle** | Film | MP4, MKV | Pixeldrain ve yerli MP4 akışları. |
| **SinemaCX** | Film / Dizi | MP4, MKV, m3u8 | Popüler yerli ve yabancı film arşivi. |
| **FullHDFilmİzlesene** | Film | MP4, MKV, m3u8 | Full HD film sağlayıcısı. |
| **AltiYuzAltmisAltiFilm** | Film | HLS (m3u8) | Türkçe dublaj ve altyazılı film kaynağı. |
| **CinemaCity** | Film / Dizi | MP4, m3u8 | Çok dilli film & dizi eklentisi. |
| **NetMirror** | Film / Dizi | MP4, m3u8 | Popüler yabancı platform kütüphaneleri. |
| **VidLink** | Film / Dizi | MP4, m3u8 | TMDB entegrasyonlu global yayın sağlayıcısı. |
| **Anthology M3U & Canlı TV** | Canlı TV / Spor | HLS, m3u8 | 100+ canlı ulusal kanal, spor kanalları ve canlı maçlar. |

---

## 📺 Canlı TV, Spor & Maç Yayınları

Eklentiyle birlikte 100'den fazla ulusal ve spor kanalı özel logolarıyla Nuvio'ya entegre gelir:

* ⚽ **Spor Kanalları:** BeIN Sports 1-5 & Max, S Sport 1-2 & Plus, Tivibu Spor 1-4, Exxen Spor 1-8, Tabii Spor 1-8, Smart Spor 1-2, Eurosport 1-2, TRT Spor & Yıldız, TV8,5, A Spor, HT Spor, Sports TV, FB TV, GS TV, TJK TV, NBA TV, CBC Sport, İdman TV.
* 🔴 **Canlı Maç Yayınları:** Günlük Süper Lig, Şampiyonlar Ligi ve Avrupa maçları için anlık canlı yayın akışları.
* 📡 **Ulusal & Haber:** TRT 1, ATV, Kanal D, Show TV, Star TV, NOW TV, TV8, Kanal 7, Beyaz TV, Teve2, A2, 360 TV, NTV, Habertürk, Halk TV, Sözcü TV, Tele1, TGRT Haber, Haber Global, 24 TV, TRT Haber, A Haber, Bloomberg HT.
* 🎬 **Belgesel & Çocuk:** TRT Belgesel, TRT Çocuk, TRT Müzik vb.

---

## 💻 Geliştirici & Katkıda Bulunma

Yeni bir eklenti veya kaynak eklemek için `providers/` dizini altına `.js` dosyanızı ekleyip `manifest.json` dosyasına kaydetmeniz yeterlidir.

Geri bildirim ve iletişim: [E-Posta](mailto:falsis@proton.me)
