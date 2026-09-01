<div align="center">
  <h1>NuvioTR - Stremio Addon</h1>
  <p>Golang tabanlı, yüksek performanslı ve proxy destekli Türkçe Dizi, Film ve Canlı TV eklentisi.</p>
</div>

## 🚀 Özellikler

- **Çoklu Kaynak:** Birçok popüler Türkçe film ve dizi sitesinden içerik çeker.
- **Proxy Desteği:** Yurt dışı sunucularında (Vercel vb.) çalışan bot engellemelerini aşmak için Cloudflare Proxy entegrasyonu.
- **Canlı TV:** M3U desteği ile ulusal kanallar, haber kanalları ve sinema kanalları.
- **Hızlı:** Eşzamanlı (concurrent) tarama sayesinde saniyeler içinde sonuç üretir.

## 📺 Aktif Kaynaklar (Sağlayıcılar)

Şu an itibarıyla sorunsuz çalışan ve aktif olan kaynaklar:

- **Dizimom** (Diziler)
- **SineWix** (Film & Dizi)
- **SetFilmizle** (Film)
- **Diziwatch** (Dizi)
- **Animexe** (Anime)
- **Acheriya** (Anime)
- **Animpow** (Anime)
- **Ddizi** (Dizi)
- **Filmhane** (Film)
- **Dizigom** (Dizi)
- **DiziYou** (Dizi)
- **Filmzal** (Film)
- **Dizimag** (Dizi)
- **SinemaCX** (Film)
- **M3U Provider** (Canlı TV & IPTV Kanalları)

> **⚠️ Not (SezonlukDizi, HDFilmCehennemi, Dizibox, vb.):** Bu platformlar çok sıkı Cloudflare WAF (Bot Koruması) kullanmaktadır. Eğer NuvioTR uygulamasını **Vercel** veya **Render** gibi bulut sunucularında (Datacenter IP) barındırıyorsanız, bu siteler `POST` isteklerini otomatik olarak engeller (403 Forbidden). Kendi bilgisayarınızda (Localhost) veya ev ağınızda çalıştırdığınızda sorunsuz çalışırlar.

## 🛠️ Kurulum (Vercel)

NuvioTR'yi ücretsiz olarak Vercel üzerinde barındırabilirsiniz.

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
