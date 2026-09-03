package filmkovasi

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/falsisdev/anthology/pkg/extractors"
	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/provider"
	"github.com/falsisdev/anthology/pkg/utils"
)

const (
	ID      = "filmkovasi"
	Name    = "FilmKovası"
	BaseURL = "https://filmkovasi.co"
)

func init() {
	provider.Register(New())
}

type Provider struct{}

func New() *Provider {
	return &Provider{}
}

func (p *Provider) ID() string {
	return ID
}

func (p *Provider) Name() string {
	return Name
}

func (p *Provider) SupportedTypes() []models.MediaType {
	return []models.MediaType{models.MediaTypeMovie}
}

var (
	reAtob = regexp.MustCompile(`atob\(['"]([^'"]+)['"]\)`)
)

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	if media.Type != models.MediaTypeMovie {
		return nil, nil
	}

	searchQuery := media.Title
	if searchQuery == "" {
		searchQuery = media.OriginalTitle
	}

	searchURL := fmt.Sprintf("%s/?s=%s", BaseURL, url.QueryEscape(searchQuery))
	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	}

	body, err := utils.DefaultClient.Get(ctx, searchURL, headers)
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	var movieURL string
	cleanQuery := strings.ToLower(utils.NormalizeTurkish(searchQuery))
	origQuery := strings.ToLower(utils.NormalizeTurkish(media.OriginalTitle))

	doc.Find("div.movie-box").EachWithBreak(func(i int, s *goquery.Selection) bool {
		a := s.Find("div.film-ismi a")
		if a.Length() == 0 {
			a = s.Find("a")
		}
		href, exists := a.Attr("href")
		if !exists || href == "" {
			return true
		}

		title := strings.ToLower(utils.NormalizeTurkish(a.Text()))
		if strings.Contains(title, cleanQuery) || (origQuery != "" && strings.Contains(title, origQuery)) {
			movieURL = href
			return false
		}
		if movieURL == "" {
			movieURL = href
		}
		return true
	})

	if movieURL == "" {
		return nil, nil
	}

	// Fetch main movie page
	movieBody, err := utils.DefaultClient.Get(ctx, movieURL, headers)
	if err != nil {
		return nil, err
	}

	movieDoc, err := goquery.NewDocumentFromReader(bytes.NewReader(movieBody))
	if err != nil {
		return nil, err
	}

	// Collect page URLs for all sources (Page 1, Page 2, etc.)
	pages := []string{movieURL}
	movieDoc.Find("div.sources a").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if exists && href != "" && !strings.Contains(href, "javascript:") {
			pages = append(pages, href)
		}
	})

	var streams []models.Stream
	seenURLs := make(map[string]bool)

	addStream := func(streamURL, title, quality string) {
		if streamURL == "" || seenURLs[streamURL] {
			return
		}
		seenURLs[streamURL] = true
		streams = append(streams, models.Stream{
			Name:     media.Title,
			Title:    fmt.Sprintf("⌜ FilmKovası ⌟ | %s", title),
			Quality:  quality,
			URL:      streamURL,
			Provider: ID,
			Headers: map[string]string{
				"Referer":    BaseURL + "/",
				"User-Agent": utils.DefaultUserAgent,
			},
		})
	}

	for pageIdx, pageURL := range pages {
		var pageHTML string
		if pageIdx == 0 {
			pageHTML = string(movieBody)
		} else {
			pBody, err := utils.DefaultClient.Get(ctx, pageURL, headers)
			if err != nil {
				continue
			}
			pageHTML = string(pBody)
		}

		matches := reAtob.FindAllStringSubmatch(pageHTML, -1)
		for _, m := range matches {
			if len(m) < 2 {
				continue
			}
			decBytes, err := base64.StdEncoding.DecodeString(m[1])
			if err != nil {
				continue
			}

			// Could be JSON array: ["https:\/\/..."] or direct string URL
			decStr := string(decBytes)
			var urls []string
			if err := json.Unmarshal(decBytes, &urls); err != nil {
				if strings.HasPrefix(decStr, "http") {
					urls = []string{decStr}
				}
			}

			for _, u := range urls {
				u = strings.ReplaceAll(u, `\/`, `/`)
				if strings.HasPrefix(u, "//") {
					u = "https:" + u
				}

				extracted, err := extractors.Extract(ctx, u, pageURL)
				if err == nil && len(extracted) > 0 {
					for _, es := range extracted {
						addStream(es.URL, es.Title, es.Quality)
					}
				} else {
					addStream(u, fmt.Sprintf("Kaynak %d", pageIdx+1), "1080p")
				}
			}
		}
	}

	return streams, nil
}
