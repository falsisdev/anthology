package catalog

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/falsisdev/anthology/pkg/extractors"
	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/utils"
)

const (
	diziwatchBase = "https://diziwatch8.com"
)

var (
	reDiziwatchEncoded = regexp.MustCompile(`encodedContent\s*=\s*['"]([A-Za-z0-9+/=]+)['"]`)
	reDiziwatchIframe  = regexp.MustCompile(`src=['"](https?://videoplay\.vip/[^'"]+)['"]`)
	reDiziwatchSeasEp  = regexp.MustCompile(`(\d+)\.\s*sezon\s*(\d+)\.\s*bölüm`)
	reDiziwatchSlugEp  = regexp.MustCompile(`-(\d+)-sezon-(\d+)-bolum`)
)

func diziwatchHeaders() map[string]string {
	return map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    diziwatchBase + "/",
	}
}

func searchDiziwatch(ctx context.Context, query string) ([]MetaItem, error) {
	searchURL := fmt.Sprintf("%s/?s=%s", diziwatchBase, url.QueryEscape(query))
	body, err := utils.DefaultClient.Get(ctx, searchURL, diziwatchHeaders())
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	var results []MetaItem
	seen := make(map[string]bool)

	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		href, _ := s.Attr("href")
		if !strings.Contains(href, "/dizi/") {
			return
		}

		clean := strings.Trim(href, "/")
		parts := strings.Split(clean, "/")
		slug := parts[len(parts)-1]
		if slug == "dizi" || slug == "" || seen[slug] {
			return
		}
		seen[slug] = true

		title := ""
		for _, l := range strings.Split(s.Text(), "\n") {
			l = strings.TrimSpace(l)
			if l != "" && !strings.Contains(l, "Türkçe") && !strings.Contains(l, "Altyazı") && !strings.Contains(l, "Dublaj") && !strings.Contains(l, "★") && !strings.Contains(l, "Hemen İzle") && !strings.Contains(l, "play_arrow") {
				title = l
				break
			}
		}
		if title == "" {
			title = strings.Title(strings.ReplaceAll(slug, "-", " "))
		}

		img := s.Find("img").First()
		poster, _ := img.Attr("src")
		if poster == "" {
			poster, _ = img.Attr("data-src")
		}

		results = append(results, MetaItem{
			ID:          "diziwatch:show:" + slug,
			Type:        "series",
			Name:        title,
			Poster:      poster,
			Background:  poster,
			Description: fmt.Sprintf("%s - Diziwatch Anime & Dizi", title),
			Genres:      []string{"Anime", "Diziwatch"},
		})
	})

	return results, nil
}

func defaultDiziwatch(ctx context.Context) ([]MetaItem, error) {
	return searchDiziwatch(ctx, "anime")
}

func getDiziwatchMeta(ctx context.Context, rawID string) (*MetaDetail, error) {
	slug := strings.TrimPrefix(rawID, "diziwatch:show:")
	showURL := fmt.Sprintf("%s/dizi/%s", diziwatchBase, slug)

	body, err := utils.DefaultClient.Get(ctx, showURL, diziwatchHeaders())
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	title := strings.TrimSpace(doc.Find("h1, .dizi-title, .title").First().Text())
	if title == "" {
		title = strings.Title(strings.ReplaceAll(slug, "-", " "))
	}

	poster, _ := doc.Find(".poster img, .dizi-poster img, img.wp-post-image").First().Attr("src")
	if poster == "" {
		poster, _ = doc.Find(".poster img, .dizi-poster img").First().Attr("data-src")
	}

	desc := strings.TrimSpace(doc.Find(".synopsis, .description, .story, p").First().Text())

	var videos []VideoItem
	seen := make(map[string]bool)

	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		href, _ := s.Attr("href")
		if !strings.Contains(href, "/bolum/") || seen[href] {
			return
		}
		seen[href] = true

		clean := strings.Trim(href, "/")
		parts := strings.Split(clean, "/")
		epSlug := parts[len(parts)-1]

		season := 1
		episode := 1
		epText := strings.ToLower(s.Text())

		if m := reDiziwatchSeasEp.FindStringSubmatch(epText); len(m) > 2 {
			fmt.Sscanf(m[1], "%d", &season)
			fmt.Sscanf(m[2], "%d", &episode)
		} else if m := reDiziwatchSlugEp.FindStringSubmatch(epSlug); len(m) > 2 {
			fmt.Sscanf(m[1], "%d", &season)
			fmt.Sscanf(m[2], "%d", &episode)
		}

		epTitle := fmt.Sprintf("%d. Sezon %d. Bölüm", season, episode)
		videos = append(videos, VideoItem{
			ID:      "diziwatch:ep:" + epSlug,
			Title:   epTitle,
			Season:  season,
			Episode: episode,
		})
	})

	return &MetaDetail{
		ID:          rawID,
		Type:        "series",
		Name:        title,
		Poster:      poster,
		Background:  poster,
		Description: desc,
		Genres:      []string{"Anime", "Diziwatch"},
		Videos:      videos,
	}, nil
}

func getDiziwatchStream(ctx context.Context, rawID string) ([]models.Stream, error) {
	epSlug := strings.TrimPrefix(rawID, "diziwatch:ep:")
	epURL := fmt.Sprintf("%s/bolum/%s", diziwatchBase, epSlug)

	body, err := utils.DefaultClient.Get(ctx, epURL, diziwatchHeaders())
	if err != nil {
		return nil, err
	}

	bodyStr := string(body)
	var embedURL string

	if m := reDiziwatchEncoded.FindStringSubmatch(bodyStr); len(m) > 1 {
		decoded, err := base64.StdEncoding.DecodeString(m[1])
		if err == nil {
			if im := reDiziwatchIframe.FindStringSubmatch(string(decoded)); len(im) > 1 {
				embedURL = im[1]
			}
		}
	}

	if embedURL == "" {
		if im := reDiziwatchIframe.FindStringSubmatch(bodyStr); len(im) > 1 {
			embedURL = im[1]
		}
	}

	var streams []models.Stream
	if embedURL != "" {
		extracted, err := extractors.ExtractVideoplay(ctx, embedURL, diziwatchBase+"/")
		if err == nil {
			for _, s := range extracted {
				streams = append(streams, models.Stream{
					Title:    fmt.Sprintf("⌜ Diziwatch ⌟ | %s", s.Title),
					Quality:  s.Quality,
					Provider: "diziwatch",
					URL:      s.URL,
					Headers:  s.Headers,
				})
			}
		}
	}

	// Fallback to official YouTube search if Diziwatch had 0 streams
	if len(streams) == 0 {
		cleanSlug := epSlug
		cleanSlug = strings.ReplaceAll(cleanSlug, "-sezon-", " ")
		cleanSlug = strings.ReplaceAll(cleanSlug, "-bolum", ". Bölüm")
		cleanSlug = strings.ReplaceAll(cleanSlug, "-", " ")
		cleanTitle := strings.Title(cleanSlug)

		if ytStream := SearchYouTubeEpisode(ctx, cleanTitle); ytStream != nil {
			ytStream.Title = "⌜ Diziwatch ⌟ | YouTube (1080p)"
			ytStream.Provider = "diziwatch"
			streams = append(streams, *ytStream)
		}
	}

	return streams, nil
}
