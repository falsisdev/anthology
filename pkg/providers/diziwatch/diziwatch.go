package diziwatch

import (
	"bytes"
	"context"
	"fmt"
	"net/url"
	"path"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/falsisdev/nuviotr/pkg/models"
	"github.com/falsisdev/nuviotr/pkg/provider"
	"github.com/falsisdev/nuviotr/pkg/utils"
)

const (
	ID      = "diziwatch"
	Name    = "Diziwatch"
	BaseURL = "https://diziwatch8.com"
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
	return []models.MediaType{models.MediaTypeTV}
}

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	if media.Type != models.MediaTypeTV {
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

	var showURL string
	doc.Find("article a, .post-title a, .film-content a, .entry-title a, a").EachWithBreak(func(i int, s *goquery.Selection) bool {
		href, exists := s.Attr("href")
		if !exists || !strings.HasPrefix(href, BaseURL) || strings.Contains(href, "/studyolar") || strings.Contains(href, "/studio/") {
			return true
		}
		if strings.Contains(href, "/dizi/") || strings.Contains(href, "/anime/") {
			showURL = href
			return false
		}
		return true
	})

	if showURL == "" {
		// Try direct slug based fallback
		slug := utils.ToSlug(media.OriginalTitle)
		if slug == "" {
			slug = utils.ToSlug(media.Title)
		}
		showURL = fmt.Sprintf("%s/dizi/%s", BaseURL, slug)
	}

	cleanShow := strings.Trim(showURL, "/")
	showSlug := path.Base(cleanShow)

	// Episode URL format: https://diziwatch8.com/{showSlug}-{season}-sezon-{episode}-bolum/
	epURL := fmt.Sprintf("%s/%s-%d-sezon-%d-bolum/", BaseURL, showSlug, media.Season, media.Episode)
	epBody, err := utils.DefaultClient.Get(ctx, epURL, headers)
	if err != nil {
		// Try alternate format: /dizi/{slug}/{season}-sezon-{episode}-bolum
		altURL := fmt.Sprintf("%s/dizi/%s/%d-sezon-%d-bolum", BaseURL, showSlug, media.Season, media.Episode)
		epBody, err = utils.DefaultClient.Get(ctx, altURL, headers)
		if err != nil {
			return nil, nil
		}
	}

	epDoc, err := goquery.NewDocumentFromReader(bytes.NewReader(epBody))
	if err != nil {
		return nil, nil
	}

	var streams []models.Stream
	epDoc.Find("iframe").Each(func(i int, s *goquery.Selection) {
		src, exists := s.Attr("src")
		if !exists || src == "" {
			src, _ = s.Attr("data-src")
		}
		if src == "" || strings.Contains(src, "facebook") || strings.Contains(src, "disqus") {
			return
		}

		serverName := "Diziwatch Player"
		if strings.Contains(src, "vidmoly") {
			serverName = "VidMoly"
		} else if strings.Contains(src, "sibnet") {
			serverName = "Sibnet"
		} else if strings.Contains(src, "odnoklassniki") {
			serverName = "OK.ru"
		}

		streams = append(streams, models.Stream{
			Name:     media.Title,
			Title:    fmt.Sprintf("⌜ Diziwatch ⌟ | %s", serverName),
			URL:      src,
			Quality:  "1080p",
			Provider: ID,
			Headers: map[string]string{
				"Referer": BaseURL + "/",
			},
		})
	})

	return streams, nil
}
