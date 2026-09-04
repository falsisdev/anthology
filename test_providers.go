package main

import (
	"context"
	"fmt"
	"time"

	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/provider"
	_ "github.com/falsisdev/anthology/pkg/providers/diziyou"
	_ "github.com/falsisdev/anthology/pkg/providers/filmekseni"
	_ "github.com/falsisdev/anthology/pkg/providers/filmhane"
	_ "github.com/falsisdev/anthology/pkg/providers/hdfilmdelisi"
	_ "github.com/falsisdev/anthology/pkg/providers/jetfilmizle"
	_ "github.com/falsisdev/anthology/pkg/providers/sezonlukdizi"
	_ "github.com/falsisdev/anthology/pkg/providers/setfilmizle"
	_ "github.com/falsisdev/anthology/pkg/providers/tekfullfilmizle"
	_ "github.com/falsisdev/anthology/pkg/providers/sinezy"
	_ "github.com/falsisdev/anthology/pkg/providers/asyaanimeleri"
	_ "github.com/falsisdev/anthology/pkg/providers/dizimag"
	_ "github.com/falsisdev/anthology/pkg/providers/diziwatch"
	_ "github.com/falsisdev/anthology/pkg/providers/dizilla"
	_ "github.com/falsisdev/anthology/pkg/providers/sinewix"
	_ "github.com/falsisdev/anthology/pkg/providers/dizigom"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	queries := []struct {
		prov  string
		title string
		year  string
		typ   models.MediaType
		ep    int
		s     int
	}{
		{"dizilla", "Wednesday", "2022", models.MediaTypeTV, 1, 1},
		{"asyaanimeleri", "Solo Leveling", "2024", models.MediaTypeTV, 1, 1},
		{"dizimag", "Game of Thrones", "2011", models.MediaTypeTV, 1, 1},
		{"diziwatch", "Wednesday", "2022", models.MediaTypeTV, 1, 1},
		{"filmekseni", "Inception", "2010", models.MediaTypeMovie, 1, 1},
		{"filmhane", "Inception", "2010", models.MediaTypeMovie, 1, 1},
		{"hdfilmdelisi", "Inception", "2010", models.MediaTypeMovie, 1, 1},
		{"jetfilmizle", "Inception", "2010", models.MediaTypeMovie, 1, 1},
		{"sezonlukdizi", "Wednesday", "2022", models.MediaTypeTV, 1, 1},
		{"setfilmizle", "Inception", "2010", models.MediaTypeMovie, 1, 1},
		{"tekfullfilmizle", "Inception", "2010", models.MediaTypeMovie, 1, 1},
		{"sinezy", "Inception", "2010", models.MediaTypeMovie, 1, 1},
	}

	for _, q := range queries {
		fmt.Printf("\n--- Probing %s for '%s' ---\n", q.prov, q.title)
		p, ok := provider.Get(q.prov)
		if !ok {
			fmt.Println("Provider not found")
			continue
		}
		
		info := &models.MediaInfo{
			Title: q.title,
			OriginalTitle: q.title,
			Year: q.year,
			Type: q.typ,
			Season: q.s,
			Episode: q.ep,
		}

		results, err := p.GetStreams(ctx, *info)
		if err != nil {
			fmt.Printf("ERROR: %v\n", err)
			continue
		}
		if len(results) == 0 {
			fmt.Println("NO STREAMS FOUND.")
			continue
		}
		fmt.Printf("FOUND %d STREAMS:\n", len(results))
		for _, s := range results {
			fmt.Printf("  - [%s] %s\n", s.Quality, s.URL)
		}
	}
}
