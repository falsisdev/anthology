package dizimag

import (
	"bytes"
	"context"
	"fmt"
	"net/url"
	"path"
	"regexp"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/falsisdev/anthology/pkg/extractors"
	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/provider"
	"github.com/falsisdev/anthology/pkg/utils"
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

	// Sitenin arama sonuçları dizi ismine yıl ekliyor (örn: breaking-bad-2008)
	// Ancak bölüm linklerinde yıl kullanılmıyor (örn: breaking-bad-1-sezon-1-bolum)
	// Sondaki yılı (ve tireyi) regex ile temizliyoruz.
	if m := regexp.MustCompile(`-(\d{4})$`).FindStringSubmatch(showSlug); len(m) > 0 {
		showSlug = strings.TrimSuffix(showSlug, m[0])
	}

	// Episode URL: https://dizimag.eu/bolum/{showSlug}-{season}-sezon-{episode}-bolum/
	epURL := fmt.Sprintf("%s/bolum/%s-%d-sezon-%d-bolum/", BaseURL, showSlug, media.Season, media.Episode)
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
		if strings.HasPrefix(src, "//") {
			src = "https:" + src
		}

		extracted, err := extractors.Extract(ctx, src, epURL)
		if err == nil && len(extracted) > 0 {
			for _, es := range extracted {
				streams = append(streams, models.Stream{
					Name:     media.Title,
					Title:    fmt.Sprintf("⌜ Dizimag ⌟ | %s", es.Title),
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
