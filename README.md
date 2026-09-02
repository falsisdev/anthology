<div align="center">
  <img src="assets/logo_1_transparent.png" alt="Anthology Logo" width="180" style="margin-bottom: 12px;" />
  <h1>Anthology - Stremio Addon</h1>
  <p>Golang tabanlı, yüksek performanslı, dahili video extractor motoruna ve HLS akış proxy'sine sahip Türkçe Dizi, Film, Anime ve Canlı TV eklentisi. htmx destekli <strong>canlı durum paneli</strong> ve <strong>kaynak/yayın canlı test konsolu</strong> ile birlikte gelir.</p>
</div>

## 🚀 Özellikler

- **CloudStream Tarzı Doğrudan Sağlayıcı Katalogları (`pkg/catalog`):** Stremio ve Nuvio arama çubuğuna bir içerik yazıldığında (Örn: *Son Yaz*, *Yarım Kalan Aşklar*, *Solo Leveling*, *Dövüş Kulübü*), Cinemeta/TMDB ID bağımlılığı olmadan doğrudan sağlayıcı sitelerinde canlı arama yapılır:
  - `Anthology - Ddizi` (Yerli diziler, tüm sezon & bölüm listesiyle)
  - `Anthology - Dizimom` (Yerli & yabancı diziler, HDPlayer ve YouTube entegrasyonu)
  - `Anthology - DiziYou` (Popüler diziler, AJAX tabanlı anlık arama)
  - `Anthology - Diziwatch (Anime & Dizi)` (Tüm popüler animeler ve diziler, 1080p VideoPlay HLS akışları)
  - `Anthology - SineWix Dizi` (Diziler ve animeler)
  - `Anthology - SineWix Film` (Yerli ve yabancı filmler)
  - `Anthology - HDFilmCehennemi` (Filmler)
  - `Canlı TV (Ulusal & Haber & Sinema)` (35+ ulusal, haber, spor, belgesel kanalı)
  - Arama sonucundaki dizilere tıklandığında tüm bölümler (1. Bölümden Finale kadar) doğrudan o sağlayıcıdan çekilip listelenir ve doğrudan oynatılır!
- **Dahili HLS Akış Proxy Motoru (`pkg/proxy`):** Stremio ve Nuvio oynatıcılarının alt segment (`.ts`, `.jpg`, `.js`, `.woff`) isteklerinde `Referer` / `Origin` başlıklarını iletememesinden kaynaklanan HTTP 403 ve 2 saniyede bir donma/takılma sorunlarını çözer. Playlistleri dinamik olarak yeniden yazıp CORS açık şekilde aracı olarak oynatır.
- **Dahili Video Extractor Motoru (`pkg/extractors`):** Stremio'nun web iframe'lerini oynatamama sorununu ortadan kaldırır. OK.ru, Vidmoly, Sibnet, VideoPlay, JWPlayer, Streambox, HDPlayer, YouTube vb. gömülü oynatıcılardan doğrudan `.m3u8`, `.mp4` ve yerel YouTube (`ytId`) video akışlarını ayıklar. Fragman/tanıtım videoları otomatik olarak filtrelenip tam bölümler getirilir.
- **Canlı TV ve IPTV:** Her kanala özel yüksek çözünürlüklü logo, kategori ve doğrudan çalışan HLS yayınları.
- **Web Paneli (`pkg/web`):** Ana sayfa (kök `/`) tarayıcıda artık her zaman şık bir HTML karşılama sayfası döndürür; HTML/JS/CSS `//go:embed` ile ayrı şablon dosyalarında (`landing.html`, `status.html`, `tests.html`) tutulur ve `html/template` ile render edilir. Tek tıkla **Stremio'ya Yükle**, **manifest kopyalama** ve **Stremio Web** butonları içerir.
- **Canlı Kaynak & Yayın Testi (`pkg/tester`):** Ana sayfadaki htmx bazlı panel ile her sağlayıcıya gerçek bir akış arama isteği (her site için ayrıca seçilmiş, o sitede bulunacağı emin içeriklerle — ör. ddizi→Arka Sokaklar, anime siteleri→One Piece/Naruto, film siteleri→Interstellar) ve 35+ canlı TV kanalının yayın URL'ine HTTP `Range` isteği gönderilir; sonuçlar (çevrimiçi/kapalı, gecikme ms, akış sayısı, hata detayı) anlık kartlar hâlinde listelenir.

## 📺 Canlı TV Kanalları & Yayın Durumları

Anthology, tüm kanallara özel logo ve kategori desteğiyle 35+ canlı TV yayını sunar:

| Kanal Adı | Kategori | Çözünürlük | Logo Durumu | Yayın Durumu |
| :--- | :---: | :---: | :---: | :---: |
| **TRT 1** | Ulusal | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **ATV** | Ulusal | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **Kanal D** | Ulusal | 720p / 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **Show TV** | Ulusal | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **Star TV** | Ulusal | 720p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **NOW TV** | Ulusal | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **TV8** | Ulusal | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **Kanal 7** | Ulusal | 720p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **Beyaz TV** | Ulusal | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **Teve2** | Ulusal | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **A2 TV** | Ulusal | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **360 TV** | Ulusal | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **TRT 2** | Ulusal / Sanat | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **TRT Avaz** | Ulusal | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **TRT Türk** | Ulusal | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **Kanal 7 Avrupa**| Ulusal | 720p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **TRT Haber** | Haber | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **A Haber** | Haber | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **NTV** | Haber | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **Habertürk** | Haber | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **Halk TV** | Haber | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **Tele 1** | Haber | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **TGRT Haber** | Haber | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **Haber Global** | Haber | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **24 TV** | Haber | 720p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **Bloomberg HT** | Haber / Ekonomi| 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **Bengü Türk** | Haber | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **Flash Haber** | Haber | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **Lider Haber** | Haber | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **Türk Haber** | Haber | 720p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **A Spor** | Spor | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **HT Spor** | Spor | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **TRT Belgesel** | Belgesel | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **TRT Çocuk** | Çocuk | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |
| **TRT Müzik** | Müzik | 1080p | ✅ Özel Logo | ✅ Canlı / Aktif |

## 📊 Kaynak (Sağlayıcı) Durumları

> **Son Güncelleme:** 2 Eylül 2026

Aşağıdaki tablo, sağlayıcıların, video extractor ve HLS proxy motorunun en güncel çalışma durumlarını göstermektedir:

| Sağlayıcı (Kaynak) | Kategori | Durum (Vercel / Cloud) | Durum (Local / Ev Ağı) | Açıklama |
| :--- | :---: | :---: | :---: | :--- |
| **Diziwatch** | Dizi / Anime | ✅ Aktif | ✅ Aktif | VideoPlay HLS extractor + proxy ile 1080p doğrudan ve donmasız oynatılır. Yerel anime kataloğu mevcut. |
| **Dizimom** | Dizi | ✅ Aktif | ✅ Aktif | HDPlayer API ve akıllı YouTube yedekleme ile 1080p doğrudan video oynatılır. Fragmanlar filtrelenir. |
| **DiziYou** | Dizi | ✅ Aktif | ✅ Aktif | `diziyou.one` admin-ajax arama entegre edildi. Cloudflare CDN üzerinden 1080p doğrudan HLS akışı getirir. |
| **Ddizi** | Dizi | ✅ Aktif | ✅ Aktif | Resmi YouTube 1080p yedekleme ve Streambox proxy ile donmasız oynatma. |
| **M3U Canlı TV** | IPTV / Canlı | ✅ Aktif | ✅ Aktif | 35+ kanalda tam logo desteği ve test edilmiş HLS akışları. |
| **SineWix** | Film & Dizi | ✅ Aktif | ✅ Aktif | Doğrudan CDN & MediaFire MP4/MKV akışları sağlar. |
| **HDFilmCehennemi**| Film | ✅ Aktif | ✅ Aktif | AJAX player URL'leri extractor motoruna bağlanarak video akışlarına dönüştürüldü. |
| **SeiCode** | Anime | ✅ Aktif | ✅ Aktif | `seicode.net` entegre edildi. Sibnet, Ok.ru ve Vidmoly extractorları ile saf video çeker. |
| **Filmifullizle** | Film | ✅ Aktif | ✅ Aktif | Extractor motoru entegre edildi, doğrudan video akışları sunar. |
| **Sinezy** | Film | ✅ Aktif | ✅ Aktif | Extractor motoru ile doğrudan video akışları sunar. |
| **Filmzal** | Film & Dizi | ✅ Aktif | ✅ Aktif | Extractor motoru ile doğrudan video akışları sunar. |
| **Dizipal** | Dizi & Film | ⚠️ Kısmi | ✅ Aktif | `dizipal1578.com` PBKDF2/SHA512 istemci şifre çözücüsü entegre edildi. |
| **SetFilmizle** | Film | ✅ Aktif | ✅ Aktif | Kodlar sağlam, veritabanında mevcut olan içerikleri getirir. |
| **Vidmody** | API | ✅ Aktif | ✅ Aktif | TMDB ID ile çalışan API, içerik varsa getirir. |
| **SezonlukDizi** | Dizi | ❌ Cloudflare WAF | ✅ Aktif | Vidmoly/Sibnet/Okru extractorları ile doğrudan videoya dönüştürülür. |
| **Film Makinesi** | Film | ❌ Cloudflare WAF | ✅ Aktif | Vercel IP'lerine 403 Forbidden atıyor. |
| **Dizibox** | Dizi | ❌ Cloudflare WAF | ✅ Aktif | Vercel IP'lerine 403 Forbidden atıyor. |
| **AnimeciX** | Anime | ❌ Cloudflare WAF | ⚠️ Kısmi | Sıkı Cloudflare koruması. |
| **Tranimeizle** | Anime | ❌ Cloudflare WAF | ⚠️ Kısmi | Sıkı Cloudflare koruması. |
| **TurkAnime** | Anime | ❌ Cloudflare WAF | ⚠️ Kısmi | Sıkı Bot koruması mevcut. |
| **YabancıDizi** | Dizi | ❌ Cloudflare WAF | ⚠️ Kısmi | Cloudflare Challenge koruması. |
| **Anizium** | Anime | ❌ SPA | ⚠️ Kısmi | İstemci taraflı SPA mimarisi. |

*Emoji Anlamları:*
* ✅ **Aktif**: Doğrudan `.mp4` veya `.m3u8` video akışı üretir ve Stremio/Nuvio'da tıklandığında anında oynatılır.
* ❌ **Cloudflare WAF**: Kod çalışıyor ve doğrudan video akışı üretiyor ancak hedef site bulut sunucu IP'sini engellediği için akış alınamıyor (Localhost / ev IP'sinde çalışır).
* ⚠️ **Kısmi**: Çok sıkı bot/captcha koruması mevcut.

> 💡 Bu tablo statiktir; sağlayıcıların **anlık** çalışma durumunu (gecikme, akış sayısı, hata detayı) ana sayfadaki **🩺 Kaynak & Yayın Canlı Testi** panelinden saniyeler içinde görebilirsiniz.

## 🌐 Web Paneli ve Uç Noktalar

`//go:embed` + `html/template` ile ikili dosyaya (binary) gömülü, htmx destekli panel kök adreste (`/`) yayınlanır. Tarayıcıda açtığınızda:

- **Tek tıkla kurulum:** `Stremio'ya Yükle`, `Manifest Kopyala`, `Stremio Web` butonları,
- **Canlı eklenti durumu:** sunucu, sağlayıcı, katalog ve canlı TV sayıları (`/fragments/status`),
- **🩺 Kaynak & Yayın Canlı Test Konsolu:** tüm sağlayıcılara gerçek akış araması ve 35+ kanala yayın erişilebilirlik testi, tek tıkla (`pkg/tester`).

| Yöntem | Uç Nokta | Açıklama |
| :--- | :--- | :--- |
| GET | `/` | Web paneli (HTML): kurulum butonları + canlı durum + test konsolu |
| GET | `/manifest.json` | Stremio manifest (JSON) — depodaki `manifest.json` dosyası (`//go:embed`) birebir servis edilir, `stremioAddonsConfig` imza bloğu dahil |
| GET | `/fragments/status` | htmx parçası: eklenti durumu kartları |
| GET | `/fragments/test/providers` | htmx parçası: sağlayıcı canlı akış arama testi (her kaynağa kendi sitesinde kesin olan içeriklerle) |
| GET | `/fragments/test/channels` | htmx parçası: canlı TV kanallarının HTTP `Range` erişilebilirlik testi |
| GET | `/health` | Sağlık kontrolü (JSON) |
| GET | `/providers` | Kayıtlı sağlayıcı listesi (JSON) |
| GET | `/catalog/{type}/{id}.json` | Stremio katalog API |
| GET | `/meta/{type}/{id}.json` | Stremio meta API |
| GET | `/stream/{type}/{id}.json` | Stremio stream API |
| GET | `/proxy?url=...` | HLS akış proxy'si (Referer/Origin yeniden yazımı) |

### Yerel Çalıştırma

```bash
go run ./cmd/server -port 8080   # -port verilmezse PORT env değişkeni, o da yoksa 8080 kullanılır
# Panel:  http://127.0.0.1:8080
# Test:   http://127.0.0.1:8080/fragments/test/providers
```

## 🛠️ Kurulum (Vercel)

Anthology'yi ücretsiz olarak Vercel üzerinde barındırabilirsiniz:

1. Projeyi kendi GitHub hesabınıza Fork'layın veya Clone'layın.
2. Vercel'de yeni bir proje oluşturup bu repoyu seçin.
3. Çevresel Değişkenleri (Environment Variables) ayarlayın:
   - `TMDB_API_KEY`: Kendi TMDB API anahtarınız (Opsiyonel, standart bir key gömülüdür).
   - `PROXY_URL`: Cloudflare Workers Proxy adresiniz (Opsiyonel).
4. Deploy (Yayınla) butonuna basın.

## 🔌 Stremio'ya Ekleme

Vercel veya kendi sunucunuzda (PC/VPS) yayınladıktan sonra Stremio'ya eklemek için:

**Yol 1 — Web Paneli (Önerilen):** Uygulamanın ana sayfasını tarayıcıda açın ve **Stremio'ya Yükle** butonuna tıklayın. Dilerseniz **Manifest Kopyala** ile URL'i panoya alıp Stremio'ya yapıştırabilir ya da **Stremio Web** ile tarayıcıdan anında kullanabilirsiniz.

**Yol 2 — Manuel:**
1. Stremio uygulamasını açın.
2. Arama çubuğuna uygulamanızın adresini sonuna `/manifest.json` ekleyerek yazın.
   - Örnek: `https://senin-anthology-uygulaman.vercel.app/manifest.json` (Veya yerelde çalışıyorsa `http://127.0.0.1:8080/manifest.json`)
3. "Yükle" (Install) butonuna tıklayın.

Hepsi bu kadar! Artık dizi veya filmlere girdiğinizde Anthology kaynakları listelenecektir. Ekleme sonrası hangi kaynakların o an çalıştığını panelden **Kaynakları Test Et** ile doğrulayabilirsiniz.
