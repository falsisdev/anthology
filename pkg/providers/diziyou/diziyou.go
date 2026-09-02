package diziyou

import (
	"bytes"
	"context"
	"fmt"
	"net/url"
	"path"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/falsisdev/nuviotr/pkg/extractors"
	"github.com/falsisdev/nuviotr/pkg/models"
	"github.com/falsisdev/nuviotr/pkg/provider"
	"github.com/falsisdev/nuviotr/pkg/utils"
)

const (
	ID      = "diziyou"
	Name    = "DiziYou"
	BaseURL = "https://www.diziyou.one"
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

	searchQuery := media.OriginalTitle
	if searchQuery == "" {
		searchQuery = media.Title
	}

	ajaxURL := fmt.Sprintf("%s/wp-admin/admin-ajax.php", BaseURL)
	postData := url.Values{
		"action":  {"data_fetch"},
		"keyword": {searchQuery},
	}
	headers := map[string]string{
		"User-Agent":   utils.DefaultUserAgent,
		"Referer":      BaseURL + "/",
		"Content-Type": "application/x-www-form-urlencoded",
	}

	resp, err := utils.DefaultClient.Request(ctx, "POST", ajaxURL, strings.NewReader(postData.Encode()), headers)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	var showURL string
	doc.Find("a").EachWithBreak(func(i int, s *goquery.Selection) bool {
		href, exists := s.Attr("href")
		if exists && strings.Contains(href, BaseURL) && !strings.Contains(href, "/wp-") {
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
		showURL = fmt.Sprintf("%s/%s/", BaseURL, slug)
	}

	cleanShow := strings.Trim(showURL, "/")
	showSlug := path.Base(cleanShow)

	// Episode URL format: https://www.diziyou.one/{showSlug}-{season}-sezon-{episode}-bolum/
	epURL := fmt.Sprintf("%s/%s-%d-sezon-%d-bolum/", BaseURL, showSlug, media.Season, media.Episode)
	epBody, err := utils.DefaultClient.Get(ctx, epURL, headers)
	if err != nil {
		epURL = fmt.Sprintf("%s/%s/%d-sezon-%d-bolum/", BaseURL, showSlug, media.Season, media.Episode)
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
					Title:    fmt.Sprintf("⌜ DiziYou ⌟ | %s", es.Title),
					Quality:  es.Quality,
					URL:      es.URL,
					Provider: ID,
					Headers:  es.Headers,
				})
			}
		}
	})

	return streams, nil
}
