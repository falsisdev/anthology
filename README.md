# 🚀 Nuviotr — Nuvio & Stremio Türkçe Akış Motoru

[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat&logo=go)](https://golang.org)
[![Vercel Deployment](https://img.shields.io/badge/Vercel-Serverless%20Active-black?style=flat&logo=vercel)](https://nuviotr.vercel.app/manifest.json)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Repository](https://img.shields.io/badge/GitHub-falsisdev%2Fnuviotr-blue?logo=github)](https://github.com/falsisdev/nuviotr)

**nuviotr**, Golang ile yazılmış, eşzamanlı (goroutine destekli), 30'dan fazla Türkçe dizi, film, anime ve canlı IPTV sağlayıcısını paralel tarayan yüksek performanslı bir **Nuvio & Stremio Eklentisidir (Addon)**.

---

## ⚡ Nuvio Uygulamasına Nasıl Eklenir? (Hızlı Kurulum)

Nuvio uygulamasını bilgisayarınızda, telefonunuzda veya Android TV'nizde kullanıyorsanız eklentiyi eklemek yalnızca **10 saniye** sürer:

1. **Nuvio** uygulamasını açın.
2. **Ayarlar (Settings)** menüsünden **Eklentiler (Addons)** sekmesine gidin.
3. **"URL ile Ekle"** veya sağ üstteki **[ + ]** butonuna tıklayın.
4. Aşağıdaki eklenti adresini yapıştırın ve **Yükle / Install** butonuna basın:

```text
https://nuviotr.vercel.app/manifest.json
```

🎉 **Hazır!** 
* Artık herhangi bir film veya diziye tıkladığınızda onlarca Türkçe 1080p Dublaj ve Altyazı kaynağı anında listelenecektir.
* Ana sayfada açılan **"Canlı TV"** kataloğundan TRT, ATV, Kanal D, Show TV gibi 42+ ulusal kanalı tek tıkla izleyebilirsiniz.

---

## 📦 Desteklenen Aktif Sağlayıcılar (30+ Kaynak)

Tüm sağlayıcılar istek geldiğinde **aynı anda eşzamanlı (paralel goroutine)** olarak taranır ve 1-2 saniye içinde tüm aktif yayınlar toplanır:

### 📺 1. Yabancı & Yerli Dizi Sağlayıcıları (10 Kaynak)
| Sağlayıcı | Tür | Kalite & Format | Özellik |
| :--- | :--- | :--- | :--- |
| **DiziYou** | Dizi | 1080p HLS (`.m3u8`) | Türkçe Dublaj & Altyazı doğrudan akış |
| **Dizigom** | Dizi | 1080p HD | Yerleşik ve alternatif oynatıcılar |
| **Dizibox** | Dizi | 1080p HD | Yabancı dizi arşivi, King Player |
| **SezonlukDizi** | Dizi | 1080p HD | Okru, Upstream, Filemoon, Sibnet kaynakları |
| **Diziyo** | Dizi | 1080p HD | Dizi arşivi ve alternatif sunucular |
| **Dizimom** | Dizi | 1080p HD | Çoklu sunucu ve HD oynatıcılar |
| **Dizimag** | Dizi | 1080p HD | Yabancı dizi bölümleri |
| **Ddizi** | Dizi | 1080p HD | Yerli ve yabancı dizi arşivi |
| **Filmhane** | Dizi & Film | 1080p HD | Dizi ve film yayınları |
| **Filmzal** | Dizi & Film | 1080p HD | Dizi ve film akışları |

### 🎬 2. Film Sağlayıcıları (12 Kaynak)
| Sağlayıcı | Tür | Kalite & Format | Özellik |
| :--- | :--- | :--- | :--- |
| **SineWix** | Film & Dizi | 1080p / 4K (`.mkv`/`.mp4`) | EasyPlex doğrudan indirme & oynatma linkleri |
| **HDFilmCehennemi** | Film & Dizi | 1080p HD | Rapidrame ve alternatif film sunucuları |
| **Film Makinesi** | Film & Dizi | 1080p Full HD | Dublaj ve Altyazı film akışları |
| **Jetfilmizle** | Film | 1080p Full HD | Güncel film yayınları |
| **Filmifullizle** | Film | 1080p HD | Film arşivi |
| **Filmekseni** | Film | 1080p HD | Film yayınları |
| **Tekfullfilmizle** | Film | 1080p HD | Film yayınları |
| **HDFilmdelisi** | Film | 1080p HD | Film yayınları |
| **Sinezy** | Film | 1080p HD | Film yayınları |
| **SetFilmizle** | Film & Dizi | 1080p HD | Alternatif sunucular |
| **SinemaCX** | Film & Dizi | 1080p HD | Sinema.gg kaynakları |
| **Vidmody** | Film & Dizi | 1080p HD | IMDb doğrulamalı video oynatıcılar |

### ⛩️ 3. Anime Sağlayıcıları (7 Kaynak)
| Sağlayıcı | Tür | Kalite & Format | Özellik |
| :--- | :--- | :--- | :--- |
| **AnimeciX** | Anime (Dizi/Film) | 1080p / 720p HD | Resmi JSON API, çoklu fansub seçenekleri |
| **Diziwatch** | Anime & Dizi | 1080p HD | Diziwatch player, VidMoly, Sibnet |
| **Tranimeizle** | Anime | 1080p HD | Anime bölüm ve film kaynakları |
| **Animexe** | Anime | 1080p HD | Türkçe altyazılı animeler |
| **Animpow** | Anime | 1080p HD | Anime yayınları |
| **Asyaanimeleri** | Anime & Dizi | 1080p HD | Asya animeleri ve dizileri |
| **Acheriya** | Anime | 1080p HD | Anime kaynakları |

### 📡 4. Canlı IPTV & VOD (1 Kaynak)
| Sağlayıcı | Tür | Format | Özellik |
| :--- | :--- | :--- | :--- |
| **MoOnCrOwN IPTV** | Canlı TV | HLS (`.m3u8`) | 42+ Ulusal, Haber, Spor ve Belgesel kanalı |

---

## 🛠️ Yerel Geliştirme ve Sunucu Kurulumu (Self-Hosting)

Kendi bilgisayarınızda veya sunucunuzda çalıştırmak isterseniz:

### Gereksinimler
* Go 1.22+

### 1. Depoyu Klonlayın ve Derleyin
```bash
git clone https://github.com/falsisdev/nuviotr.git
cd nuviotr
make build
```

### 2. REST API Sunucusunu Başlatın
```bash
go run cmd/server/main.go -port 8080
```
Sunucu başladığında Nuvio'ya yerel adresinizi ekleyebilirsiniz:  
`http://localhost:8080/manifest.json` *(veya `http://<YEREL-IP>:8080/manifest.json`)*

---

## 💻 CLI (Terminal Arama Aracı) ile Kullanım

Terminalden herhangi bir film, dizi veya IPTV kanalını tek komutla test edebilirsiniz:

```bash
# 1. Film Arama (Örn: Fight Club - TMDB 550)
go run cmd/cli/main.go -id 550 -type movie

# 2. Dizi Arama (Örn: Breaking Bad S01E01 - TMDB 1396)
go run cmd/cli/main.go -id 1396 -type tv -season 1 -episode 1

# 3. Mini Dizi Arama (Örn: Fatma S01E01 - TMDB 123138)
go run cmd/cli/main.go -id 123138 -type tv -season 1 -episode 1

# 4. Canlı TV Kanalı Akışı Bulma (Örn: TRT 1)
go run cmd/cli/main.go -live TRT1tr

# 5. Tüm Canlı Kanalları Listeleme
go run cmd/cli/main.go -live list
```

---

## 🧪 Testleri Çalıştırma

```bash
go test -v ./...
```

---

## 📄 Lisans

Bu proje [MIT](LICENSE) lisansı altında geliştirilmektedir.