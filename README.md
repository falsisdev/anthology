<div align="center">
  <img src="assets/logo_1.png" alt="Anthology Logo" width="180" style="border-radius: 16px; margin-bottom: 12px;" />
  <h1>Anthology - Stremio Addon</h1>
  <p>Golang tabanlı, yüksek performanslı, dahili video extractor motoruna ve proxy desteğine sahip Türkçe Dizi, Film, Anime ve Canlı TV eklentisi.</p>
</div>

## 🚀 Özellikler

- **Dahili Video Extractor Motoru (`pkg/extractors`):** Stremio'nun web sayfalarını (iframe) oynatamama sorununu ortadan kaldırır. OK.ru, Vidmoly, Sibnet, VideoPlay, JWPlayer vb. gömülü oynatıcılardan doğrudan `.m3u8` ve `.mp4` video akışlarını ayıklar.
- **Çoklu Kaynak:** Birçok popüler Türkçe film, dizi ve anime platformundan içerik çeker.
- **Akıllı Proxy & Fallback:** Cloudflare WAF veya IP kısıtlamalarına karşı yedekli bağlantı desteği.
- **Canlı TV:** M3U desteği ile ulusal kanallar, haber kanalları ve sinema kanalları.
- **Hızlı:** Eşzamanlı (concurrent) tarama sayesinde saniyeler içinde sonuç üretir.

## 📊 Kaynak (Sağlayıcı) Durumları

> **Son Güncelleme:** 2 Eylül 2026

Aşağıdaki tablo, sağlayıcıların ve video extractor motorunun en güncel çalışma durumlarını göstermektedir.
Bulut sunucular (Vercel vb.) veri merkezi (datacenter) IP adresleri kullandığı için bazı sitelerin güvenlik duvarlarına (Cloudflare WAF) takılabilir.

| Sağlayıcı (Kaynak) | Kategori | Durum (Vercel / Cloud) | Durum (Local / Ev Ağı) | Açıklama |
| :--- | :---: | :---: | :---: | :--- |
| **Diziwatch** | Dizi / Anime | ✅ Aktif | ✅ Aktif | VideoPlay extractor ile doğrudan `.m3u8` video akışı çeker. Çok hızlı ve sorunsuz. |
| **DiziYou** | Dizi | ✅ Aktif | ✅ Aktif | (YENİ) `diziyou.one` entegre edildi. Cloudflare CDN üzerinden 1080p doğrudan HLS akışı getirir. |
| **SeiCode** | Anime | ✅ Aktif | ✅ Aktif | (YENİ) `seicode.net` entegre edildi. Sibnet, Ok.ru ve Vidmoly extractorları ile saf video çeker. |
| **SineWix** | Film & Dizi | ✅ Aktif | ✅ Aktif | Doğrudan CDN & MediaFire MP4 akışları sağlar. |
| **Filmifullizle** | Film | ✅ Aktif | ✅ Aktif | Sorunsuz çalışıyor. |
| **Dizipal** | Dizi & Film | ⚠️ Kısmi | ✅ Aktif | (YENİ) `dizipal1578.com` PBKDF2/SHA512 istemci şifre çözücüsü entegre edildi. |
| **SetFilmizle** | Film | ✅ Aktif | ✅ Aktif | Kodlar sağlam, veritabanında mevcut olan içerikleri getirir. |
| **Vidmody** | API | ✅ Aktif | ✅ Aktif | TMDB ID ile çalışan API, içerik varsa getirir. |
| **M3U Provider** | IPTV / Canlı | ✅ Aktif | ✅ Aktif | M3U Canlı TV ayrıştırması sorunsuz. |
| **Ddizi** | Dizi | ❌ Cloudflare WAF | ✅ Aktif | Streambox JWPlayer extractor eklendi. Local ağda sorunsuz `.m3u8` verir. |
| **SezonlukDizi** | Dizi | ❌ Cloudflare WAF | ✅ Aktif | Tüm alternatifler Vidmoly/Sibnet/Okru extractorları ile doğrudan videoya dönüştürülür. |
| **Dizimom** | Dizi | ❌ Cloudflare WAF | ✅ Aktif | HLS Player API üzerinden çalışır. |
| **Film Makinesi** | Film | ❌ Cloudflare WAF | ✅ Aktif | Vercel IP'lerine 403 Forbidden atıyor. |
| **Dizibox** | Dizi | ❌ Cloudflare WAF | ✅ Aktif | Vercel IP'lerine 403 Forbidden atıyor. |
| **AnimeciX** | Anime | ❌ Cloudflare WAF | ⚠️ Kısmi | Sıkı Cloudflare koruması. |
| **Tranimeizle** | Anime | ❌ Cloudflare WAF | ⚠️ Kısmi | Sıkı Cloudflare koruması. |
| **TurkAnime** | Anime | ❌ Cloudflare WAF | ⚠️ Kısmi | Sıkı Bot koruması mevcut. |
| **YabancıDizi** | Dizi | ❌ Cloudflare WAF | ⚠️ Kısmi | Cloudflare Challenge koruması. |
| **Anizium** | Anime | ❌ SPA | ⚠️ Kısmi | İstemci taraflı SPA mimarisi. |
| Diğer Kaynaklar | Karışık | ❌ Bozuk | ❌ Bozuk | (Animexe, Dizigom, Filmhane vb.) Sitelerin altyapıları tamamen değişmiş veya kapanmış. |

*Emoji Anlamları:*
* ✅ **Aktif**: Doğrudan `.mp4` veya `.m3u8` video akışı üretir ve Stremio'da tıklandığında anında oynatılır.
* ❌ **Cloudflare WAF**: Kod çalışıyor ve doğrudan video akışı üretiyor ancak hedef site bulut sunucu IP'sini engellediği için akış alınamıyor (Localhost / ev IP'sinde çalışır).
* ⚠️ **Kısmi**: Çok sıkı bot/captcha koruması mevcut.

## 🛠️ Kurulum (Vercel)

Anthology'yi ücretsiz olarak Vercel üzerinde barındırabilirsiniz:

1. Projeyi kendi GitHub hesabınıza Fork'layın.
2. Vercel'de yeni bir proje oluşturup bu repoyu seçin.
3. Çevresel Değişkenleri (Environment Variables) ayarlayın:
   - `TMDB_API_KEY`: Kendi TMDB API anahtarınız (Opsiyonel, standart bir key gömülüdür).
   - `PROXY_URL`: Cloudflare Workers Proxy adresiniz (Opsiyonel).
4. Deploy (Yayınla) butonuna basın.

## 🔌 Stremio'ya Ekleme

Vercel veya kendi sunucunuzda (PC/VPS) yayınladıktan sonra Stremio'ya eklemek için:

1. Stremio uygulamasını açın.
2. Arama çubuğuna uygulamanızın adresini sonuna `/manifest.json` ekleyerek yazın.
   - Örnek: `https://senin-anthology-uygulaman.vercel.app/manifest.json` (Veya yerelde çalışıyorsa `http://127.0.0.1:8080/manifest.json`)
3. "Yükle" (Install) butonuna tıklayın.

Hepsi bu kadar! Artık dizi veya filmlere girdiğinizde Anthology kaynakları listelenecektir.
