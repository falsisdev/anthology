package filmmakinesi

import (
	"bytes"
	"context"
	"fmt"
	"net/url"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/falsisdev/anthology/pkg/extractors"
	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/provider"
	"github.com/falsisdev/anthology/pkg/utils"
)

const (
	ID      = "filmmakinesi"
	Name    = "Film Makinesi"
	BaseURL = "https://filmmakinesi.to"
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

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	if media.Type != models.MediaTypeMovie {
		return nil, nil
	}

	searchQuery := media.Title
	if searchQuery == "" {
		searchQuery = media.OriginalTitle
	}

	searchURL := fmt.Sprintf("%s/arama/?s=%s", BaseURL, url.QueryEscape(searchQuery))
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

	cleanQuery := strings.ToLower(utils.NormalizeTurkish(searchQuery))
	origQuery := strings.ToLower(utils.NormalizeTurkish(media.OriginalTitle))
	var filmURL string

	doc.Find("div.film-list a.item, div.film-list a, article a, .film-box a, .content-poster a, .post-title a, a").EachWithBreak(func(i int, s *goquery.Selection) bool {
		href, exists := s.Attr("href")
		if !exists || !strings.HasPrefix(href, BaseURL) || strings.Contains(href, "/category/") || strings.Contains(href, "/tur/") || strings.Contains(href, "/arama/") {
			return true
		}

		title := s.AttrOr("data-title", "")
		if title == "" {
			title, _ = s.Find("img").Attr("alt")
		}
		if title == "" {
			title = s.Text()
		}
		title = strings.ToLower(utils.NormalizeTurkish(strings.TrimSpace(title)))
		if title == "" || len(title) < 3 {
			return true
		}

		if strings.Contains(title, cleanQuery) || (origQuery != "" && strings.Contains(title, origQuery)) {
			filmURL = href
			return false
		}
		if filmURL == "" {
			filmURL = href
		}
		return true
	})

	if filmURL == "" {
		return nil, nil
	}

	filmBody, err := utils.DefaultClient.Get(ctx, filmURL, headers)
	if err != nil {
		return nil, err
	}

	filmDoc, err := goquery.NewDocumentFromReader(bytes.NewReader(filmBody))
	if err != nil {
		return nil, err
	}

	var streams []models.Stream
	filmDoc.Find("iframe").Each(func(i int, s *goquery.Selection) {
		src, exists := s.Attr("src")
		if !exists || src == "" {
			src, _ = s.Attr("data-src")
		}
		if src == "" || strings.Contains(src, "facebook") || strings.Contains(src, "youtube") || strings.Contains(src, "disqus") {
			return
		}
		if strings.HasPrefix(src, "//") {
			src = "https:" + src
		}

		extracted, err := extractors.Extract(ctx, src, filmURL)
		if err == nil && len(extracted) > 0 {
			for _, es := range extracted {
				streams = append(streams, models.Stream{
					Name:     media.Title,
					Title:    fmt.Sprintf("⌜ Film Makinesi ⌟ | %s", es.Title),
					URL:      es.URL,
					Quality:  es.Quality,
					Provider: ID,
					Headers:  es.Headers,
				})
			}
		}
	})

	return streams, nil
}
