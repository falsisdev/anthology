package webteizle

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/falsisdev/anthology/pkg/extractors"
	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/provider"
	"github.com/falsisdev/anthology/pkg/utils"
)

const (
	ID      = "webteizle"
	Name    = "Webteİzle"
	BaseURL = "https://webteizle3.xyz"
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

type altData struct {
	ID       int    `json:"id"`
	Baslik   string `json:"baslik"`
	Kalitesi int    `json:"kalitesi"`
}

type dataAlternatifResponse struct {
	Status string    `json:"status"`
	Data   []altData `json:"data"`
}

var (
	reVidMoly  = regexp.MustCompile(`vidmoly\(['"]([^'"]+)['"]`)
	reFileMoon = regexp.MustCompile(`filemoon\(['"]([^'"]+)['"]`)
	reDzenRu   = regexp.MustCompile(`var\s+vid\s*=\s*['"]([^'"]+)['"]`)
)

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	if media.Type != models.MediaTypeMovie {
		return nil, nil
	}

	searchQuery := media.Title
	if searchQuery == "" {
		searchQuery = media.OriginalTitle
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			// Don't follow redirect automatically so we can read 302 Location header
			return http.ErrUseLastResponse
		},
	}

	filterURL := fmt.Sprintf("%s/filtre?a=%s", BaseURL, url.QueryEscape(searchQuery))
	req, err := http.NewRequestWithContext(ctx, "GET", filterURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", utils.DefaultUserAgent)
	req.Header.Set("Referer", BaseURL+"/")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var filmURL string

	// Check if 302 redirect directly points to the movie page (/hakkinda/{slug})
	if resp.StatusCode == http.StatusFound || resp.StatusCode == http.StatusMovedPermanently {
		loc := resp.Header.Get("Location")
		if loc != "" {
			if strings.HasPrefix(loc, "http") {
				filmURL = loc
			} else {
				filmURL = BaseURL + loc
			}
		}
	}

	// If no direct redirect, parse search results from body
	if filmURL == "" {
		bodyBytes, err := utils.DefaultClient.Get(ctx, filterURL, map[string]string{
			"User-Agent": utils.DefaultUserAgent,
			"Referer":    BaseURL + "/",
		})
		if err == nil {
			doc, err := goquery.NewDocumentFromReader(bytes.NewReader(bodyBytes))
			if err == nil {
				doc.Find("div.filmname a, div.golgever a").EachWithBreak(func(i int, s *goquery.Selection) bool {
					href, exists := s.Attr("href")
					if exists && href != "" {
						if strings.HasPrefix(href, "http") {
							filmURL = href
						} else {
							filmURL = BaseURL + href
						}
						return false
					}
					return true
				})
			}
		}
	}

	if filmURL == "" {
		slug := utils.ToSlug(media.Title)
		if slug == "" {
			slug = utils.ToSlug(media.OriginalTitle)
		}
		filmURL = fmt.Sprintf("%s/hakkinda/%s", BaseURL, slug)
	}

	// Fetch movie page
	filmBody, err := utils.DefaultClient.Get(ctx, filmURL, map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	})
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(filmBody))
	if err != nil {
		return nil, err
	}

	filmID, exists := doc.Find("button#wip").Attr("data-id")
	if !exists || filmID == "" {
		// Fallback regex for data-id
		reDataID := regexp.MustCompile(`data-id=["'](\d+)["']`)
		m := reDataID.FindStringSubmatch(string(filmBody))
		if len(m) > 1 {
			filmID = m[1]
		}
	}

	if filmID == "" {
		return nil, nil
	}

	var streams []models.Stream
	seenURLs := make(map[string]bool)

	addStream := func(streamURL, title, quality string) {
		if streamURL == "" || seenURLs[streamURL] {
			return
		}
		seenURLs[streamURL] = true
		streams = append(streams, models.Stream{
			Name:     media.Title,
			Title:    fmt.Sprintf("⌜ Webteİzle ⌟ | %s", title),
			Quality:  quality,
			URL:      streamURL,
			Provider: ID,
			Headers: map[string]string{
				"Referer":    BaseURL + "/",
				"User-Agent": utils.DefaultUserAgent,
			},
		})
	}

	// Query both Altyazı (dil=1) and Dublaj (dil=0)
	for _, dil := range []string{"1", "0"} {
		dilLabel := "Altyazılı"
		if dil == "0" {
			dilLabel = "Dublaj"
		}

		altAPIURL := fmt.Sprintf("%s/ajax/dataAlternatif3.asp", BaseURL)
		postVals := url.Values{
			"filmid": {filmID},
			"dil":    {dil},
			"s":      {""},
			"b":      {""},
			"bot":    {"0"},
		}

		headers := map[string]string{
			"User-Agent":       utils.DefaultUserAgent,
			"Referer":          filmURL,
			"Origin":           BaseURL,
			"X-Requested-With": "XMLHttpRequest",
			"Content-Type":     "application/x-www-form-urlencoded",
		}

		resp, err := utils.DefaultClient.Request(ctx, "POST", altAPIURL, strings.NewReader(postVals.Encode()), headers)
		if err != nil {
			continue
		}

		var altRes dataAlternatifResponse
		decodeErr := json.NewDecoder(resp.Body).Decode(&altRes)
		resp.Body.Close()
		if decodeErr != nil || altRes.Status != "success" {
			continue
		}

		for _, item := range altRes.Data {
			embedAPIURL := fmt.Sprintf("%s/ajax/dataEmbed.asp", BaseURL)
			embedPost := url.Values{
				"id": {fmt.Sprintf("%d", item.ID)},
			}

			eResp, err := utils.DefaultClient.Request(ctx, "POST", embedAPIURL, strings.NewReader(embedPost.Encode()), headers)
			if err != nil {
				continue
			}

			buf := new(bytes.Buffer)
			buf.ReadFrom(eResp.Body)
			eResp.Body.Close()
			embedHTML := buf.String()

			serverName := item.Baslik
			if serverName == "" {
				serverName = "Alternatif"
			}

			// 1. Check for VidMoly
			if vm := reVidMoly.FindStringSubmatch(embedHTML); len(vm) > 1 {
				vidmolyURL := fmt.Sprintf("https://vidmoly.net/embed-%s.html", vm[1])
				extracted, err := extractors.Extract(ctx, vidmolyURL, filmURL)
				if err == nil && len(extracted) > 0 {
					for _, es := range extracted {
						addStream(es.URL, fmt.Sprintf("%s [%s]", es.Title, dilLabel), es.Quality)
					}
				} else {
					addStream(vidmolyURL, fmt.Sprintf("VidMoly [%s]", dilLabel), "1080p")
				}
			}

			// 2. Check for FileMoon
			if fm := reFileMoon.FindStringSubmatch(embedHTML); len(fm) > 1 {
				filemoonURL := fmt.Sprintf("https://filemoon.sx/e/%s", fm[1])
				extracted, err := extractors.Extract(ctx, filemoonURL, filmURL)
				if err == nil && len(extracted) > 0 {
					for _, es := range extracted {
						addStream(es.URL, fmt.Sprintf("%s [%s]", es.Title, dilLabel), es.Quality)
					}
				} else {
					addStream(filemoonURL, fmt.Sprintf("FileMoon [%s]", dilLabel), "1080p")
				}
			}

			// 3. Check for DzenRu
			if dz := reDzenRu.FindStringSubmatch(embedHTML); len(dz) > 1 {
				dzenURL := fmt.Sprintf("https://dzen.ru/embed/%s", dz[1])
				addStream(dzenURL, fmt.Sprintf("DzenRu [%s]", dilLabel), "1080p")
			}

			// 4. Check for iframe
			eDoc, err := goquery.NewDocumentFromReader(strings.NewReader(embedHTML))
			if err == nil {
				eDoc.Find("iframe").Each(func(i int, s *goquery.Selection) {
					src, exists := s.Attr("src")
					if exists && src != "" {
						if strings.HasPrefix(src, "//") {
							src = "https:" + src
						}
						extracted, err := extractors.Extract(ctx, src, filmURL)
						if err == nil && len(extracted) > 0 {
							for _, es := range extracted {
								addStream(es.URL, fmt.Sprintf("%s [%s]", es.Title, dilLabel), es.Quality)
							}
						} else {
							addStream(src, fmt.Sprintf("%s [%s]", serverName, dilLabel), "1080p")
						}
					}
				})
			}
		}
	}

	return streams, nil
}
