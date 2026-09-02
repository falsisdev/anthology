package ddizi

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
	ID      = "ddizi"
	Name    = "Ddizi"
	BaseURL = "https://www.ddizi.im"
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

	searchURL := fmt.Sprintf("%s/arama/", BaseURL)
	postData := url.Values{
		"arama": {searchQuery},
	}
	headers := map[string]string{
		"User-Agent":   utils.DefaultUserAgent,
		"Referer":      BaseURL + "/",
		"Content-Type": "application/x-www-form-urlencoded",
	}

	resp, err := utils.DefaultClient.Request(ctx, "POST", searchURL, strings.NewReader(postData.Encode()), headers)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	var showURL string
	doc.Find(".dizi-boxpost-cat a").EachWithBreak(func(i int, s *goquery.Selection) bool {
		href, exists := s.Attr("href")
		if exists && strings.Contains(href, "/diziler/") {
			showURL = href
			if !strings.HasPrefix(showURL, "http") {
				showURL = BaseURL + showURL
			}
			return false
		}
		return true
	})

	if showURL == "" {
		return nil, nil
	}

	showBody, err := utils.DefaultClient.Get(ctx, showURL, headers)
	if err != nil {
		return nil, err
	}

	showDoc, err := goquery.NewDocumentFromReader(bytes.NewReader(showBody))
	if err != nil {
		return nil, err
	}

	var epURL string
	expectedHref := fmt.Sprintf("-%d-bolum", media.Episode)
	expectedTitle := fmt.Sprintf("%d.bölüm", media.Episode)

	showDoc.Find("a").EachWithBreak(func(i int, s *goquery.Selection) bool {
		href, _ := s.Attr("href")
		title, _ := s.Attr("title")

		titleLower := strings.ToLower(title)
		hrefLower := strings.ToLower(href)

		if strings.Contains(hrefLower, "/izle/") && (strings.Contains(hrefLower, expectedHref) || strings.Contains(titleLower, expectedTitle)) {
			epURL = href
			if !strings.HasPrefix(epURL, "http") {
				epURL = BaseURL + epURL
			}
			return false
		}
		return true
	})

	if epURL == "" {
		return nil, nil
	}

	epBody, err := utils.DefaultClient.Get(ctx, epURL, headers)
	if err != nil {
		return nil, err
	}

	epDoc, err := goquery.NewDocumentFromReader(bytes.NewReader(epBody))
	if err != nil {
		return nil, err
	}

	var streams []models.Stream
	epDoc.Find("iframe").Each(func(i int, s *goquery.Selection) {
		src, _ := s.Attr("src")
		if src == "" || src == "about:blank" {
			src, _ = s.Attr("data-src")
		}
		if src == "" || strings.Contains(src, "facebook") || strings.Contains(src, "youtube") {
			return
		}
		if strings.HasPrefix(src, "//") {
			src = "https:" + src
		} else if strings.HasPrefix(src, "/") {
			src = BaseURL + src
		}

		extracted, err := extractors.Extract(ctx, src, epURL)
		if err == nil && len(extracted) > 0 {
			for _, es := range extracted {
				streams = append(streams, models.Stream{
					Name:     media.Title,
					Title:    fmt.Sprintf("⌜ Ddizi ⌟ | %s", es.Title),
					Quality:  es.Quality,
					Provider: ID,
					URL:      es.URL,
					Headers:  es.Headers,
				})
			}
		}
	})

	return streams, nil
}
