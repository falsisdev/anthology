package sezonlukdizi

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/url"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/falsisdev/anthology/pkg/extractors"
	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/provider"
	"github.com/falsisdev/anthology/pkg/utils"
)

const (
	ID      = "sezonlukdizi"
	Name    = "SezonlukDizi"
	BaseURL = "https://sezonlukdizi.cc"
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

type altData struct {
	ID     int    `json:"id"`
	Baslik string `json:"baslik"`
	Dil    string `json:"dil"`
}

type alternatifResponse struct {
	Status string    `json:"status"`
	Data   []altData `json:"data"`
}

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	if media.Type != models.MediaTypeTV {
		return nil, nil
	}

	slug := utils.ToSlug(media.Title)
	if slug == "" {
		slug = utils.ToSlug(media.OriginalTitle)
	}

	epURL := fmt.Sprintf("%s/diziler/%s/%d-sezon-%d-bolum.html", BaseURL, slug, media.Season, media.Episode)
	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	}

	body, err := utils.DefaultClient.Get(ctx, epURL, headers)
	if err != nil {
		if media.OriginalTitle != "" && media.OriginalTitle != media.Title {
			origSlug := utils.ToSlug(media.OriginalTitle)
			altURL := fmt.Sprintf("%s/diziler/%s/%d-sezon-%d-bolum.html", BaseURL, origSlug, media.Season, media.Episode)
			body, err = utils.DefaultClient.Get(ctx, altURL, headers)
			if err != nil {
				return nil, nil
			}
			epURL = altURL
		} else {
			return nil, nil
		}
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, nil
	}

	bid := ""
	if v, exists := doc.Find("#dilsec").Attr("data-id"); exists && v != "" {
		bid = v
	} else if v, exists := doc.Find("#topBarBtn").Attr("bid"); exists && v != "" {
		bid = v
	}

	var streams []models.Stream

	if bid != "" {
		for _, dil := range []string{"1", "0"} {
			altURL := fmt.Sprintf("%s/ajax/dataAlternatif22.asp", BaseURL)
			postData := url.Values{
				"bid": {bid},
				"dil": {dil},
			}

			altHeaders := map[string]string{
				"Content-Type":     "application/x-www-form-urlencoded",
				"Referer":          epURL,
				"X-Requested-With": "XMLHttpRequest",
			}
			altResp, err := utils.DefaultClient.Request(ctx, "POST", altURL, strings.NewReader(postData.Encode()), altHeaders)
			if err != nil {
				continue
			}

			var aResp alternatifResponse
			decErr := json.NewDecoder(altResp.Body).Decode(&aResp)
			altResp.Body.Close()

			if decErr == nil && aResp.Status == "success" {
				for _, alt := range aResp.Data {
					if alt.Baslik == "reCAPTCHA" || alt.Baslik == "Pixel" {
						continue
					}

					embedReqURL := fmt.Sprintf("%s/ajax/dataEmbed22.asp", BaseURL)
					ePost := url.Values{"id": {fmt.Sprintf("%d", alt.ID)}}

					embedHeaders := map[string]string{
						"Content-Type":     "application/x-www-form-urlencoded",
						"Referer":          epURL,
						"X-Requested-With": "XMLHttpRequest",
					}
					eResp, err := utils.DefaultClient.Request(ctx, "POST", embedReqURL, strings.NewReader(ePost.Encode()), embedHeaders)
					if err != nil {
						continue
					}
					eBody, _ := io.ReadAll(eResp.Body)
					eResp.Body.Close()

					eDoc, err := goquery.NewDocumentFromReader(bytes.NewReader(eBody))
					if err == nil {
						eDoc.Find("iframe").Each(func(i int, s *goquery.Selection) {
							src, _ := s.Attr("src")
							if src == "" || strings.Contains(src, "reCAPTCHA") {
								return
							}
							if strings.HasPrefix(src, "//") {
								src = "https:" + src
							}

							tag := "[Altyazı]"
							if dil == "0" {
								tag = "[Dublaj]"
							}

							extracted, err := extractors.Extract(ctx, src, epURL)
							if err == nil && len(extracted) > 0 {
								for _, es := range extracted {
									streams = append(streams, models.Stream{
										Name:     media.Title,
										Title:    fmt.Sprintf("⌜ SezonlukDizi ⌟ | %s %s (%s)", alt.Baslik, tag, es.Title),
										URL:      es.URL,
										Quality:  es.Quality,
										Provider: ID,
										Headers:  es.Headers,
									})
								}
							}
						})
					}
				}
			}
		}
	}

	// Document-level iframes
	doc.Find("iframe").Each(func(i int, s *goquery.Selection) {
		src, _ := s.Attr("src")
		if src == "" || src == "about:blank" {
			src, _ = s.Attr("data-src")
		}
		if src == "" || strings.Contains(src, "reCAPTCHA") || strings.Contains(src, "facebook") || strings.Contains(src, "youtube") {
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
					Title:    fmt.Sprintf("⌜ SezonlukDizi ⌟ | %s", es.Title),
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
