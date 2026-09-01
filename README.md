# nuviotr 🚀

Golang tabanlı, yüksek performanslı ve eşzamanlı (goroutine destekli) Türkçe dizi, film ve Canlı IPTV yayın motoru.

> Repository: [https://github.com/falsisdev/nuviotr](https://github.com/falsisdev/nuviotr)

---

## ⚡ Özellikler

- **Eşzamanlı (Concurrent) Arama Motoru:** TMDB ID veya başlık ile yapılan aramalarda tüm sağlayıcıları paralel tarayarak 1-2 saniye içinde tüm stream linklerini toplar.
- **Akıllı Hata ve Zaman Aşımı Yönetimi:** Yanıt vermeyen veya yavaş kalan sağlayıcılar diğerlerini bekletmez (`context.WithTimeout`).
- **REST API Sunucusu:** Nuvio veya harici istemcilerin doğrudan kullanabileceği hafif ve hızlı HTTP API.
- **CLI Arama Aracı:** Terminalden tek komutla film/dizi arama veya canlı IPTV kanallarını izleme imkanı.
- **Entegre TMDB İstemcisi:** Otomatik başlık, orijinal ad, yıl ve IMDb ID çözümlemesi ve önbellekleme.

---

## 📁 Proje Mimarisi

```text
nuviotr/
├── cmd/
│   ├── server/           # REST API Web Sunucusu
│   │   └── main.go
│   └── cli/              # Komut Satırı Arama Aracı
│       └── main.go
├── pkg/
│   ├── models/           # Stream, MediaInfo, Channel modelleri
│   ├── tmdb/             # TMDB API istemcisi ve cache
│   ├── provider/         # Provider interface ve registry sistemi
│   ├── engine/           # Eşzamanlı arama motoru
│   ├── utils/            # HTTP client ve metin normalizasyon araçları
│   └── providers/        # Sağlayıcılar (Scrapers)
│       ├── sinewix/      # SineWix (EasyPlex API)
│       ├── diziyou/      # DiziYou (1080p Dublaj & Altyazı HLS)
│       ├── vidmody/      # Vidmody (HEAD check embed motoru)
│       ├── m3u/          # IPTV Canlı TV & VOD motoru
│       ├── sinemacx/     # SinemaCX (sinema.gg)
│       └── vidlink/      # Vidlink (Çoklu Kalite & Altyazı)
├── lists/                # IPTV ve VOD M3U Çalma Listeleri
│   ├── canli.m3u         # 40+ Ulusal ve Haber TV kanalları
│   ├── film.m3u          # Film çalma listesi
│   └── dizi.m3u          # Dizi çalma listesi
├── manifest.json         # Eklenti Manifestosu
├── go.mod
└── README.md
```

---

## 🛠️ Kurulum & Çalıştırma

### Gereksinimler
- Go 1.22+

### 1. CLI (Komut Satırı) ile Kullanım

#### Film Arama:
```bash
go run cmd/cli/main.go -id 550 -type movie
```

#### Dizi Arama:
```bash
go run cmd/cli/main.go -id 1396 -type tv -season 1 -episode 1
```

#### Canlı TV Yayını Bulma:
```bash
go run cmd/cli/main.go -live TRT1tr
```

#### Tüm Canlı Kanalları Listeleme:
```bash
go run cmd/cli/main.go -live list
```

---

### 2. REST API Sunucusunu Başlatma

```bash
go run cmd/server/main.go -port 8080
```

#### API Uç Noktaları (Endpoints):
- **Akış Arama:** `GET http://localhost:8080/streams?id=550&type=movie`
- **Dizi Akış Arama:** `GET http://localhost:8080/streams?id=1396&type=tv&season=1&episode=1`
- **Canlı Kanallar:** `GET http://localhost:8080/live`
- **Belirli Canlı Kanal:** `GET http://localhost:8080/live?channel=TRT1tr`
- **Sağlayıcı Listesi:** `GET http://localhost:8080/providers`
- **Manifest:** `GET http://localhost:8080/manifest`
- **Sağlık Kontrolü:** `GET http://localhost:8080/health`

---

## 🧪 Testleri Çalıştırma

```bash
go test -v ./...
```