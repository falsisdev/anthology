package sezonlukdizi

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/falsisdev/nuviotr/pkg/models"
	"github.com/falsisdev/nuviotr/pkg/provider"
	"github.com/falsisdev/nuviotr/pkg/utils"
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

type alternatifResponse struct {
	Status string `json:"status"`
	Data   []struct {
		ID     int    `json:"id"`
		Baslik string `json:"baslik"`
		Kalite int    `json:"kalite"`
	} `json:"data"`
}

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	if media.Type != models.MediaTypeTV {
		return nil, nil
	}

	slug := utils.ToSlug(media.OriginalTitle)
	if slug == "" {
		slug = utils.ToSlug(media.Title)
	}

	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	}

	// Episode URL format: https://sezonlukdizi.cc/{slug}/{season}-sezon-{episode}-bolum.html
	epURL := fmt.Sprintf("%s/%s/%d-sezon-%d-bolum.html", BaseURL, slug, media.Season, media.Episode)
	body, err := utils.DefaultClient.Get(ctx, epURL, headers)
	if err != nil {
		trSlug := utils.ToSlug(media.Title)
		if trSlug != "" && trSlug != slug {
			epURL = fmt.Sprintf("%s/%s/%d-sezon-%d-bolum.html", BaseURL, trSlug, media.Season, media.Episode)
			body, err = utils.DefaultClient.Get(ctx, epURL, headers)
			if err != nil {
				return nil, nil
			}
		} else {
			return nil, nil
		}
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, nil
	}

	// Extract episode bid (data-id on #dilsec or bid on #topBarBtn)
	bid := ""
	if v, exists := doc.Find("#dilsec").Attr("data-id"); exists && v != "" {
		bid = v
	} else if v, exists := doc.Find("#topBarBtn").Attr("bid"); exists && v != "" {
		bid = v
	}

	var streams []models.Stream

	if bid != "" {
		// Fetch alternatives for both subtitle (dil=1) and dubbing (dil=0)
		for _, dil := range []string{"1", "0"} {
			altURL := fmt.Sprintf("%s/ajax/dataAlternatif22.asp", BaseURL)
			postData := url.Values{
				"bid": {bid},
				"dil": {dil},
			}

			req, err := http.NewRequestWithContext(ctx, "POST", altURL, strings.NewReader(postData.Encode()))
			if err != nil {
				continue
			}
			req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
			req.Header.Set("User-Agent", utils.DefaultUserAgent)
			req.Header.Set("Referer", epURL)
			req.Header.Set("X-Requested-With", "XMLHttpRequest")

			client := &http.Client{Timeout: 3 * time.Second}
			resp, err := client.Do(req)
			if err != nil {
				continue
			}

			var aResp alternatifResponse
			decErr := json.NewDecoder(resp.Body).Decode(&aResp)
			resp.Body.Close()

			if decErr == nil && aResp.Status == "success" {
				for _, alt := range aResp.Data {
					if alt.Baslik == "reCAPTCHA" || alt.Baslik == "Pixel" {
						continue
					}

					embedReqURL := fmt.Sprintf("%s/ajax/dataEmbed22.asp", BaseURL)
					ePost := url.Values{"id": {fmt.Sprintf("%d", alt.ID)}}

					eReq, err := http.NewRequestWithContext(ctx, "POST", embedReqURL, strings.NewReader(ePost.Encode()))
					if err != nil {
						continue
					}
					eReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
					eReq.Header.Set("User-Agent", utils.DefaultUserAgent)
					eReq.Header.Set("Referer", epURL)
					eReq.Header.Set("X-Requested-With", "XMLHttpRequest")

					eResp, err := client.Do(eReq)
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

							streamTitle := fmt.Sprintf("⌜ SezonlukDizi ⌟ | %s", alt.Baslik)
							if dil == "1" {
								streamTitle += " [Altyazı]"
							} else {
								streamTitle += " [Dublaj]"
							}

							streams = append(streams, models.Stream{
								Name:     media.Title,
								Title:    streamTitle,
								URL:      src,
								Quality:  "1080p",
								Provider: ID,
								Headers: map[string]string{
									"Referer": BaseURL + "/",
								},
							})
						})
					}
				}
			}
		}
	}

	// Fallback check on standard iframes in document
	doc.Find("iframe").Each(func(i int, s *goquery.Selection) {
		src, _ := s.Attr("src")
		if src == "" || src == "about:blank" {
			src, _ = s.Attr("data-src")
		}
		if src == "" || strings.Contains(src, "facebook") || strings.Contains(src, "youtube") || strings.Contains(src, "disqus") || strings.Contains(src, "reCAPTCHA") {
			return
		}
		if strings.HasPrefix(src, "//") {
			src = "https:" + src
		}

		serverName := "SezonlukDizi Player"
		if strings.Contains(src, "vidmoly") {
			serverName = "VidMoly"
		} else if strings.Contains(src, "sibnet") {
			serverName = "Sibnet"
		} else if strings.Contains(src, "odnoklassniki") {
			serverName = "OK.ru"
		}

		streams = append(streams, models.Stream{
			Name:     media.Title,
			Title:    fmt.Sprintf("⌜ SezonlukDizi ⌟ | %s", serverName),
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
