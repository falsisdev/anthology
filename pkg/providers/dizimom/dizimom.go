package dizimom

import (
	"bytes"
	"context"
	"encoding/json"
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
	ID      = "dizimom"
	Name    = "Dizimom"
	BaseURL = "https://www.dizimom.diy"
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
		if !exists || (!strings.HasPrefix(href, BaseURL) && !strings.HasPrefix(href, "/")) {
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

	// Episode URL: https://www.dizimom.diy/dizi/{showSlug}/{season}-sezon-{episode}-bolum/
	epURL := fmt.Sprintf("%s/dizi/%s/%d-sezon-%d-bolum/", BaseURL, showSlug, media.Season, media.Episode)
	epBody, err := utils.DefaultClient.Get(ctx, epURL, headers)
	if err != nil {
		epURL = fmt.Sprintf("%s/%s-%d-sezon-%d-bolum/", BaseURL, showSlug, media.Season, media.Episode)
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
		if src == "" || strings.Contains(src, "facebook") || strings.Contains(src, "youtube") || strings.Contains(src, "disqus") {
			return
		}
		if strings.HasPrefix(src, "//") {
			src = "https:" + src
		}

		serverName := "Dizimom Player"
		if strings.Contains(src, "vidmoly") {
			serverName = "VidMoly"
		} else if strings.Contains(src, "sibnet") {
			serverName = "Sibnet"
		}

		iframeURL := src

		if strings.Contains(iframeURL, "hdplayersystem.com") {
			u, err := url.Parse(iframeURL)
			if err == nil {
				dataID := u.Query().Get("data")
				if dataID != "" {
					apiURL := fmt.Sprintf("https://hdplayersystem.com/player/index.php?data=%s&do=getVideo", dataID)
					postData := url.Values{
						"hash": {dataID},
						"r":    {"https://www.dizimom.diy/"},
					}
					apiHeaders := map[string]string{
						"Content-Type":     "application/x-www-form-urlencoded",
						"X-Requested-With": "XMLHttpRequest",
						"Referer":          iframeURL,
					}

					apiResp, err := utils.DefaultClient.Request(ctx, "POST", apiURL, strings.NewReader(postData.Encode()), apiHeaders)
					if err == nil {
						var res struct {
							SecuredLink string `json:"securedLink"`
						}
						json.NewDecoder(apiResp.Body).Decode(&res)
						apiResp.Body.Close()

						if res.SecuredLink != "" {
							streams = append(streams, models.Stream{
								Name:     media.Title,
								Title:    "⌜ Dizimom ⌟ | HLS Player",
								Quality:  "1080p",
								Provider: ID,
								URL:      res.SecuredLink,
								Headers: map[string]string{
									"Referer": "https://hdplayersystem.com/",
									"Origin":  "https://hdplayersystem.com",
								},
							})
							return
						}
					}
				}
			}
		}

		streams = append(streams, models.Stream{
			Name:     media.Title,
			Title:    fmt.Sprintf("⌜ Dizimom ⌟ | %s", serverName),
			Quality:  "1080p",
			Provider: ID,
			URL:      iframeURL,
			Headers: map[string]string{
				"Referer": BaseURL + "/",
			},
		})
	})

	return streams, nil
}
