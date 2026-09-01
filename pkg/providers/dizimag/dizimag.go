package dizimag

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
	ID      = "dizimag"
	Name    = "Dizimag"
	BaseURL = "https://dizimag.eu"
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
	doc.Find("article a, .film-card a, .post-title a, a").EachWithBreak(func(i int, s *goquery.Selection) bool {
		href, exists := s.Attr("href")
		if !exists || strings.Contains(href, "/kategori/") {
			return true
		}
		if strings.Contains(href, "/dizi/") {
			showURL = href
			return false
		}
		return true
	})

	if showURL == "" {
		slug := utils.ToSlug(media.OriginalTitle)
		if slug == "" {
			slug = utils.ToSlug(media.Title)
		}
		showURL = fmt.Sprintf("%s/dizi/%s", BaseURL, slug)
	}

	cleanShow := strings.Trim(showURL, "/")
	showSlug := path.Base(cleanShow)

	// Episode URL: https://dizimag.eu/{showSlug}-{season}-sezon-{episode}-bolum/
	epURL := fmt.Sprintf("%s/%s-%d-sezon-%d-bolum/", BaseURL, showSlug, media.Season, media.Episode)
	epBody, err := utils.DefaultClient.Get(ctx, epURL, headers)
	if err != nil {
		epURL = fmt.Sprintf("%s/dizi/%s/%d-sezon-%d-bolum", BaseURL, showSlug, media.Season, media.Episode)
		epBody, err = utils.DefaultClient.Get(ctx, epURL, headers)
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
		if src == "" || strings.Contains(src, "facebook") || strings.Contains(src, "youtube") || strings.Contains(src, "disqus") {
			return
		}

		serverName := "Dizimag Player"
		if strings.Contains(src, "vidmoly") {
			serverName = "VidMoly"
		} else if strings.Contains(src, "sibnet") {
			serverName = "Sibnet"
		}

		streams = append(streams, models.Stream{
			Name:     media.Title,
			Title:    fmt.Sprintf("⌜ Dizimag ⌟ | %s", serverName),
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
