package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/falsisdev/nuviotr/pkg/engine"
	"github.com/falsisdev/nuviotr/pkg/models"
	"github.com/falsisdev/nuviotr/pkg/providers/m3u"
)

func main() {
	id := flag.String("id", "", "TMDB ID (e.g. 550, 1396)")
	mediaType := flag.String("type", "movie", "Media type: movie, tv, live")
	season := flag.Int("season", 1, "Season number for tv series")
	episode := flag.Int("episode", 1, "Episode number for tv series")
	provFilter := flag.String("provider", "", "Optional provider filter (e.g. sinewix, diziyou, vidmody)")
	liveQuery := flag.String("live", "", "Search live TV channel by name/ID or 'list' to show all")
	timeoutSec := flag.Int("timeout", 4, "Timeout in seconds for each provider")
	flag.Parse()

	ctx := context.Background()

	// Handle Live TV query
	if *liveQuery != "" {
		m3uProv := m3u.New()
		if *liveQuery == "list" {
			channels, err := m3uProv.GetLiveChannels(ctx)
			if err != nil {
				fmt.Printf("❌ Canlı kanallar alınamadı: %v\n", err)
				os.Exit(1)
			}
			fmt.Printf("📺 Toplam %d Canlı Kanal Listelendi:\n", len(channels))
			for i, ch := range channels {
				fmt.Printf("[%3d] %-25s | Grup: %-20s | ID: %s\n", i+1, ch.Name, ch.Group, ch.ID)
			}
			return
		}

		fmt.Printf("🔍 Canlı Kanal Aranıyor: %s\n", *liveQuery)
		stream, err := m3uProv.GetLiveStreamByID(ctx, *liveQuery)
		if err != nil {
			fmt.Printf("❌ Kanal bulunamadı: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("✅ KANAL BULUNDU: %s\n", stream.Name)
		fmt.Printf("▶ Yayın URL: %s\n", stream.URL)
		return
	}

	if *id == "" {
		fmt.Println("Kullanım: go run cmd/cli/main.go -id <TMDB_ID> [-type movie|tv] [-season 1] [-episode 1] [-provider sinewix]")
		fmt.Println("Örnekler:")
		fmt.Println("  go run cmd/cli/main.go -id 550 -type movie                     # Fight Club")
		fmt.Println("  go run cmd/cli/main.go -id 1396 -type tv -season 1 -episode 1  # Breaking Bad S01E01")
		fmt.Println("  go run cmd/cli/main.go -live TRT1tr                             # TRT 1 Canlı Yayın")
		fmt.Println("  go run cmd/cli/main.go -live list                              # Tüm Canlı Kanallar")
		os.Exit(0)
	}

	mType := models.MediaTypeMovie
	if *mediaType == "tv" || *mediaType == "series" {
		mType = models.MediaTypeTV
	}

	eng := engine.New("", time.Duration(*timeoutSec)*time.Second)

	fmt.Printf("\n🚀 Nuviotr Arama Başlatılıyor...\n")
	fmt.Printf("TMDB ID: %s | Tür: %s", *id, mType)
	if mType == models.MediaTypeTV {
		fmt.Printf(" | Sezon: %d | Bölüm: %d", *season, *episode)
	}
	fmt.Println()

	start := time.Now()
	res, err := eng.Search(ctx, *id, mType, *season, *episode, *provFilter)
	if err != nil {
		fmt.Printf("❌ Arama sırasında hata oluştu: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("\n======================================================\n")
	fmt.Printf("🎬 İÇERİK: %s", res.Media.Title)
	if res.Media.OriginalTitle != "" && res.Media.OriginalTitle != res.Media.Title {
		fmt.Printf(" (%s)", res.Media.OriginalTitle)
	}
	if res.Media.Year != "" {
		fmt.Printf(" [%s]", res.Media.Year)
	}
	if res.Media.IMDbID != "" {
		fmt.Printf(" [IMDb: %s]", res.Media.IMDbID)
	}
	fmt.Printf("\nToplam Süre: %v\n", time.Since(start))
	fmt.Printf("======================================================\n")

	fmt.Println("\n📊 Sağlayıcı Durumları:")
	for _, st := range res.Stats {
		status := fmt.Sprintf("%d stream bulundu", st.Count)
		if st.Error != "" {
			status = fmt.Sprintf("HATA: %s", st.Error)
		}
		fmt.Printf("  • %-18s (%-10s): %s [%d ms]\n", st.Name, st.ProviderID, status, st.Duration)
	}

	fmt.Printf("\n🎥 Bulunan Akışlar (Toplam: %d):\n", len(res.Streams))
	if len(res.Streams) == 0 {
		fmt.Println("  Hiçbir sağlayıcıdan oynatılabilir yayın bulunamadı.")
	} else {
		for i, s := range res.Streams {
			fmt.Printf("\n[%2d] %s (%s)\n", i+1, s.Title, s.Provider)
			fmt.Printf("     ▶ URL: %s\n", s.URL)
			if s.Quality != "" {
				fmt.Printf("     ⭐ Kalite: %s\n", s.Quality)
			}
			if len(s.Headers) > 0 {
				var hPairs []string
				for k, v := range s.Headers {
					hPairs = append(hPairs, fmt.Sprintf("%s: %s", k, v))
				}
				fmt.Printf("     🏷️ Headers: %s\n", strings.Join(hPairs, " | "))
			}
		}
	}
	fmt.Printf("\n")
}
