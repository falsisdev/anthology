<div align="center">
  <h1>NuvioTR - Stremio Addon</h1>
  <p>Golang tabanlı, yüksek performanslı ve proxy destekli Türkçe Dizi, Film ve Canlı TV eklentisi.</p>
</div>

## 🚀 Özellikler

- **Çoklu Kaynak:** Birçok popüler Türkçe film ve dizi sitesinden içerik çeker.
- **Proxy Desteği:** Yurt dışı sunucularında (Vercel vb.) çalışan bot engellemelerini aşmak için Cloudflare Proxy entegrasyonu.
- **Canlı TV:** M3U desteği ile ulusal kanallar, haber kanalları ve sinema kanalları.
- **Hızlı:** Eşzamanlı (concurrent) tarama sayesinde saniyeler içinde sonuç üretir.

## 📊 Kaynak (Sağlayıcı) Durumları

> **Son Güncelleme:** 2 Eylül 2026

Aşağıdaki tablo, sağlayıcıların en güncel çalışma durumlarını göstermektedir.
Bulut sunucular (Vercel vb.) veri merkezi (datacenter) IP adresleri kullandığı için bazı sitelerin güvenlik duvarlarına (Cloudflare WAF) takılmaktadır.

| Sağlayıcı (Kaynak) | Kategori | Durum (Vercel / Cloud) | Durum (Local / Ev Ağı) | Açıklama |
| :--- | :---: | :---: | :---: | :--- |
| **Dizimom** | Dizi | ✅ Aktif | ✅ Aktif | Şifreli .m3u8 API bypass edildi, sorunsuz. |
| **SineWix** | Film & Dizi | ✅ Aktif | ✅ Aktif | Sorunsuz çalışıyor. |
| **Filmifullizle** | Film | ✅ Aktif | ✅ Aktif | Sorunsuz çalışıyor. |
| **M3U Provider** | IPTV / Canlı | ✅ Aktif | ✅ Aktif | M3U parse sorunsuz. |
| **SezonlukDizi** | Dizi | ❌ Cloudflare WAF | ✅ Aktif | Vercel'de POST istekleri (alternatifler) Cloudflare tarafından engelleniyor. |
| **Film Makinesi** | Film | ❌ Cloudflare WAF | ✅ Aktif | Vercel IP'lerine 403 Forbidden atıyor. |
| **Dizibox** | Dizi | ❌ Cloudflare WAF | ✅ Aktif | Vercel IP'lerine 403 Forbidden atıyor. |
| **AnimeciX** | Anime | ❌ Cloudflare WAF | ⚠️ Kısmi | Sıkı Cloudflare koruması, ev ağında çalışabilir. |
| **Tranimeizle** | Anime | ❌ Cloudflare WAF | ⚠️ Kısmi | Sıkı Cloudflare koruması, ev ağında çalışabilir. |
| **Vidlink** | Yabancı API | ❌ Cloudflare WAF | ⚠️ Kısmi | Sıkı Cloudflare koruması. |
| **HDFilmCehennemi** | Film | ❌ Bozuk | ❌ Bozuk | Sitedeki tema/altyapı değişikliği nedeniyle HTML parse işlemi güncellenmeli. |
| **Diziwatch** | Dizi | ❌ Bozuk | ❌ Bozuk | Güncellenmesi gerekiyor. |
| **Ddizi** | Dizi | ❌ Bozuk | ❌ Bozuk | Güncellenmesi gerekiyor. |
| **Vidmody** | Film/Dizi | ❌ Bozuk | ❌ Bozuk | Güncellenmesi gerekiyor. |
| **SetFilmizle** | Film | ❌ Bozuk | ❌ Bozuk | Güncellenmesi gerekiyor. |
| Diğer Tüm Sağlayıcılar | Karışık | ❌ Bozuk | ❌ Bozuk | (Animexe, Dizigom, Filmhane vb.) Sitelerdeki Cloudflare V2 Captcha veya DOM değişiklikleri sebebiyle kodların güncellenmesi gerekiyor. |

*Emoji Anlamları:*
* ✅ **Aktif**: Sorunsuz bir şekilde çalışıyor ve akış (stream) getiriyor.
* ❌ **Cloudflare WAF**: Kod çalışıyor ancak hedef site bulut sunucu IP'sini engellediği için akış alınamıyor (Localhost'ta çalışır).
* ❌ **Bozuk**: Sitenin kapanması veya HTML yapısının değişmesi sebebiyle sağlayıcının kodlarının güncellenmesi gerekiyor.

## 🛠️ Kurulum (Vercel)

NuvioTR'yi ücretsiz olarak Vercel üzerinde barındırabilirsiniz. Ancak tablodaki WAF kısıtlamalarını dikkate alınız.

1. Projeyi kendi GitHub hesabınıza Fork'layın.
2. Vercel'de yeni bir proje oluşturup bu repoyu seçin.
3. Çevresel Değişkenleri (Environment Variables) ayarlayın:
   - `TMDB_API_KEY`: Kendi TMDB API anahtarınız (Opsiyonel, standart bir key gömülüdür).
   - `PROXY_URL`: Cloudflare Workers Proxy adresiniz (Örn: `https://nuviotr-proxy.kullaniciadi.workers.dev`). Yurt dışı IP engellerini aşmak için önerilir.
4. Deploy (Yayınla) butonuna basın.

## 🔌 Stremio'ya Ekleme

Vercel veya kendi sunucunuzda yayınladıktan sonra Stremio'ya eklemek için:

1. Stremio uygulamasını açın.
2. Arama çubuğuna uygulamanızın adresini sonuna `/manifest.json` ekleyerek yazın.
   - Örnek: `https://senin-nuviotr-uygulaman.vercel.app/manifest.json`
3. "Yükle" (Install) butonuna tıklayın.

Hepsi bu kadar! Artık dizi veya filmlere girdiğinizde NuvioTR kaynakları listelenecektir.
