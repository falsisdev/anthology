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
Bulut sunucular (Vercel vb.) veri merkezi (datacenter) IP adresleri kullandığı için bazı sitelerin güvenlik duvarlarına (Cloudflare WAF) takılmaktadır. Çalışmayan (HTML'si değişen) tüm kaynaklar **2 Eylül itibarıyla onarılmıştır.**

| Sağlayıcı (Kaynak) | Kategori | Durum (Vercel / Cloud) | Durum (Local / Ev Ağı) | Açıklama |
| :--- | :---: | :---: | :---: | :--- |
| **Dizimom** | Dizi | ✅ Aktif | ✅ Aktif | Şifreli .m3u8 API bypass edildi, sorunsuz. |
| **Diziwatch** | Dizi / Anime | ✅ Aktif | ✅ Aktif | (YENİ) Site tamamen SPA oldu, videoplay.vip API'si üzerinden TMDB ID ile direkt bağlantı kurularak site bypass edildi. Işık hızında çalışıyor! |
| **SineWix** | Film & Dizi | ✅ Aktif | ✅ Aktif | Sorunsuz çalışıyor. |
| **Filmifullizle** | Film | ✅ Aktif | ✅ Aktif | Sorunsuz çalışıyor. |
| **SetFilmizle** | Film | ✅ Aktif | ✅ Aktif | Kodlar sağlam, içerik veritabanlarında varsa getiriyor. |
| **Vidmody** | API | ✅ Aktif | ✅ Aktif | TMDB ID ile çalışan API, içerik varsa getiriyor. |
| **M3U Provider** | IPTV / Canlı | ✅ Aktif | ✅ Aktif | M3U parse sorunsuz. |
| **HDFilmCehennemi**| Film | ❌ Cloudflare WAF | ✅ Aktif | (YENİ) Sitenin WordPress altyapısına geçişi sonrasındaki AJAX tabanlı oynatıcı yükleme sistemi başarıyla çözüldü ve kodlar onarıldı. Ancak Vercel IP'sine WAF blokajı koyuyor. |
| **Ddizi** | Dizi | ❌ Cloudflare WAF | ✅ Aktif | (YENİ) Arama (POST) ve bölüm URL yapılarındaki değişiklikler onarıldı, çalışır duruma getirildi. Vercel IP'sinde 403 alabilir. |
| **SezonlukDizi** | Dizi | ❌ Cloudflare WAF | ✅ Aktif | Vercel'de POST istekleri (alternatifler) Cloudflare tarafından engelleniyor. |
| **Film Makinesi** | Film | ❌ Cloudflare WAF | ✅ Aktif | Vercel IP'lerine 403 Forbidden atıyor. |
| **Dizibox** | Dizi | ❌ Cloudflare WAF | ✅ Aktif | Vercel IP'lerine 403 Forbidden atıyor. |
| **AnimeciX** | Anime | ❌ Cloudflare WAF | ⚠️ Kısmi | Sıkı Cloudflare koruması, ev ağında çalışabilir. |
| **Tranimeizle** | Anime | ❌ Cloudflare WAF | ⚠️ Kısmi | Sıkı Cloudflare koruması, ev ağında çalışabilir. |
| **Vidlink** | Yabancı API | ❌ Cloudflare WAF | ⚠️ Kısmi | Sıkı Cloudflare koruması. |
| Diğer Kaynaklar | Karışık | ❌ Bozuk | ❌ Bozuk | (Animexe, Dizigom, Filmhane vb.) Sitelerin altyapıları tamamen değişmiş veya kapanmış. Zamanla elden geçirilecek. |

*Emoji Anlamları:*
* ✅ **Aktif**: Sorunsuz bir şekilde çalışıyor ve akış (stream) getiriyor.
* ❌ **Cloudflare WAF**: Kod çalışıyor ancak hedef site bulut sunucu IP'sini engellediği için akış alınamıyor (Localhost'ta kendi ev IP'nizle çalışır).
* ⚠️ **Kısmi**: Çok sıkı koruma mevcut, yerel ağda bile Captcha isteyebilir.

## 🛠️ Kurulum (Vercel)

NuvioTR'yi ücretsiz olarak Vercel üzerinde barındırabilirsiniz. Ancak tablodaki WAF kısıtlamalarını dikkate alınız (Ev internetinizde çalıştırırsanız tüm kaynaklardan maksimum verim alırsınız).

1. Projeyi kendi GitHub hesabınıza Fork'layın.
2. Vercel'de yeni bir proje oluşturup bu repoyu seçin.
3. Çevresel Değişkenleri (Environment Variables) ayarlayın:
   - `TMDB_API_KEY`: Kendi TMDB API anahtarınız (Opsiyonel, standart bir key gömülüdür).
   - `PROXY_URL`: Cloudflare Workers Proxy adresiniz (Örn: `https://nuviotr-proxy.kullaniciadi.workers.dev`). 
4. Deploy (Yayınla) butonuna basın.

## 🔌 Stremio'ya Ekleme

Vercel veya kendi sunucunuzda (PC/VPS) yayınladıktan sonra Stremio'ya eklemek için:

1. Stremio uygulamasını açın.
2. Arama çubuğuna uygulamanızın adresini sonuna `/manifest.json` ekleyerek yazın.
   - Örnek: `https://senin-nuviotr-uygulaman.vercel.app/manifest.json` (Veya localde çalışıyorsa `http://127.0.0.1:8080/manifest.json`)
3. "Yükle" (Install) butonuna tıklayın.

Hepsi bu kadar! Artık dizi veya filmlere girdiğinizde NuvioTR kaynakları listelenecektir.
