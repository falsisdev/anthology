package catalog

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/falsisdev/anthology/pkg/extractors"
	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/utils"
)

const dizimomBase = "https://www.dizimom.diy"

func dizimomHeaders() map[string]string {
	return map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    dizimomBase + "/",
	}
}

var reDizimomEmbed = regexp.MustCompile(`"embedUrl"\s*:\s*"(https?://[^"]+)"`)

func searchDizimom(ctx context.Context, query string) ([]MetaItem, error) {
	searchURL := fmt.Sprintf("%s/?s=%s", dizimomBase, url.QueryEscape(query))
	body, err := utils.DefaultClient.Get(ctx, searchURL, dizimomHeaders())
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	var results []MetaItem
	seen := make(map[string]bool)

	doc.Find(".categorytitle a, .cat-img a, article a").Each(func(i int, s *goquery.Selection) {
		href, _ := s.Attr("href")
		if !strings.Contains(href, "/diziler/") {
			return
		}

		clean := strings.Trim(href, "/")
		parts := strings.Split(clean, "/")
		slug := parts[len(parts)-1]

		title := strings.TrimSpace(s.Text())
		if title == "" {
			title, _ = s.Attr("title")
		}

		// Find surrounding card to extract image and title if missing
		parent := s.Closest("div, article")
		if parent.Length() > 0 {
			if title == "" {
				title = strings.TrimSpace(parent.Find(".categorytitle, h2, h3, a").Text())
			}
		}

		if title == "" {
			title = strings.ReplaceAll(strings.TrimPrefix(slug, "diziler/"), "-", " ")
		}

		if seen[slug] {
			return
		}
		seen[slug] = true

		poster, _ := parent.Find("img").Attr("src")
		if poster == "" {
			poster, _ = parent.Find("img").Attr("data-src")
		}

		cleanTitle := title
		cleanTitle = regexp.MustCompile(`^\d+[\s\-_]+`).ReplaceAllString(cleanTitle, "")
		cleanTitle = regexp.MustCompile(`(?i)[\s\-_]+(?:son[\s\-_]+bolum[\s\-_]+izle|izle[\s\-_]+hd|izle|dizi)$`).ReplaceAllString(cleanTitle, "")
		cleanTitle = strings.ReplaceAll(cleanTitle, "-", " ")
		cleanTitle = strings.Title(strings.TrimSpace(cleanTitle))

		results = append(results, MetaItem{
			ID:          "dizimom:show:" + slug,
			Type:        "series",
			Name:        cleanTitle,
			Poster:      poster,
			Background:  poster,
			Description: cleanTitle + " Dizimom dizisi",
			Genres:      []string{"Dizimom", "Dizi"},
		})
	})

	return results, nil
}

func defaultDizimom(ctx context.Context) ([]MetaItem, error) {
	body, err := utils.DefaultClient.Get(ctx, dizimomBase+"/tum-diziler/", dizimomHeaders())
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	var results []MetaItem
	seen := make(map[string]bool)

	doc.Find(".categorytitle a, .cat-img a").Each(func(i int, s *goquery.Selection) {
		href, _ := s.Attr("href")
		if !strings.Contains(href, "/diziler/") || seen[href] {
			return
		}
		seen[href] = true

		title := strings.TrimSpace(s.Text())
		clean := strings.Trim(href, "/")
		parts := strings.Split(clean, "/")
		slug := parts[len(parts)-1]

		results = append(results, MetaItem{
			ID:          "dizimom:show:" + slug,
			Type:        "series",
			Name:        title,
			Genres:      []string{"Dizimom", "Popüler Dizi"},
		})
	})

	return results, nil
}

func getDizimomMeta(ctx context.Context, showID string) (*MetaDetail, error) {
	slug := strings.TrimPrefix(showID, "dizimom:show:")
	showURL := fmt.Sprintf("%s/diziler/%s/", dizimomBase, slug)

	body, err := utils.DefaultClient.Get(ctx, showURL, dizimomHeaders())
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	title := strings.TrimSpace(doc.Find("h1, .dizi-baslik").First().Text())
	if title == "" {
		title = slug
	}

	poster, _ := doc.Find(".dizidetayresim img, .dizi-poster img, article img").First().Attr("src")
	if poster == "" {
		poster, _ = doc.Find(".dizidetayresim img, .dizi-poster img, article img").First().Attr("data-src")
	}

	desc := strings.TrimSpace(doc.Find(".dizikonu, .ozet, p").First().Text())

	reEp := regexp.MustCompile(`(\d+)\.\s*bölüm`)
	reSeasEp := regexp.MustCompile(`(\d+)\.\s*sezon\s*(\d+)\.\s*bölüm`)
	reHrefEp := regexp.MustCompile(`[-_](\d+)[-_]bolum`)

	var videos []VideoItem
	seen := make(map[string]bool)

	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		href, _ := s.Attr("href")
		epTitle := strings.TrimSpace(s.Text())
		if epTitle == "" {
			epTitle, _ = s.Attr("title")
		}

		hrefLower := strings.ToLower(href)
		if strings.Contains(hrefLower, "/diziler/") || strings.Contains(hrefLower, "bolumler") || strings.Contains(hrefLower, "bolumleri") || strings.Contains(hrefLower, "/category/") || strings.Contains(hrefLower, "/tag/") {
			return
		}

		if !strings.Contains(hrefLower, "-bolum") {
			return
		}

		season := 1
		episode := 0

		lower := strings.ToLower(epTitle)
		if m := reSeasEp.FindStringSubmatch(lower); len(m) > 2 {
			fmt.Sscanf(m[1], "%d", &season)
			fmt.Sscanf(m[2], "%d", &episode)
		} else if m := reEp.FindStringSubmatch(lower); len(m) > 1 {
			fmt.Sscanf(m[1], "%d", &episode)
		} else if m := reHrefEp.FindStringSubmatch(hrefLower); len(m) > 1 {
			fmt.Sscanf(m[1], "%d", &episode)
		}

		if episode == 0 {
			return // Ignore any links that are not actual episodes!
		}

		if seen[href] {
			return
		}
		seen[href] = true

		clean := strings.Trim(href, "/")
		parts := strings.Split(clean, "/")
		epSlug := parts[len(parts)-1]

		displayTitle := fmt.Sprintf("%d. Bölüm", episode)
		if season > 1 {
			displayTitle = fmt.Sprintf("%d. Sezon %d. Bölüm", season, episode)
		}

		videos = append(videos, VideoItem{
			ID:      "dizimom:ep:" + epSlug,
			Title:   displayTitle,
			Season:  season,
			Episode: episode,
		})
	})

	// Reverse so episodes are in ascending order
	for i, j := 0, len(videos)-1; i < j; i, j = i+1, j-1 {
		videos[i], videos[j] = videos[j], videos[i]
	}

	return &MetaDetail{
		ID:          showID,
		Type:        "series",
		Name:        title,
		Poster:      poster,
		Background:  poster,
		Description: desc,
		Genres:      []string{"Dizimom", "Dizi"},
		Videos:      videos,
	}, nil
}

func getDizimomStream(ctx context.Context, rawID string) ([]models.Stream, error) {
	epSlug := strings.TrimPrefix(rawID, "dizimom:ep:")
	epURL := fmt.Sprintf("%s/%s/", dizimomBase, epSlug)

	body, err := utils.DefaultClient.Get(ctx, epURL, dizimomHeaders())
	if err != nil {
		return nil, err
	}

	var streams []models.Stream
	bodyStr := string(body)

	// Check schema embedUrl
	if m := reDizimomEmbed.FindStringSubmatch(bodyStr); len(m) > 1 {
		embedURL := m[1]
		if strings.Contains(embedURL, "hdplayersystem.com") {
			if s := fetchHDPlayer(ctx, embedURL); s != nil {
				streams = append(streams, *s)
			}
		} else {
			extracted, err := extractors.Extract(ctx, embedURL, epURL)
			if err == nil {
				for _, es := range extracted {
					streams = append(streams, models.Stream{
						Title:    fmt.Sprintf("⌜ Dizimom ⌟ | %s", es.Title),
						Quality:  es.Quality,
						Provider: "dizimom",
						URL:      es.URL,
						YTID:     es.YTID,
						Headers:  es.Headers,
					})
				}
			}
		}
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err == nil {
		doc.Find("iframe").Each(func(i int, s *goquery.Selection) {
			src, _ := s.Attr("src")
			if src == "" || src == "about:blank" {
				src, _ = s.Attr("data-src")
			}
			if src == "" || strings.Contains(src, "facebook") || strings.Contains(src, "disqus") {
				return
			}
			if strings.HasPrefix(src, "//") {
				src = "https:" + src
			}

			if strings.Contains(src, "hdplayersystem.com") {
				if stream := fetchHDPlayer(ctx, src); stream != nil {
					streams = append(streams, *stream)
				}
				return
			}

			extracted, err := extractors.Extract(ctx, src, epURL)
			if err == nil {
				for _, es := range extracted {
					streams = append(streams, models.Stream{
						Title:    fmt.Sprintf("⌜ Dizimom ⌟ | %s", es.Title),
						Quality:  es.Quality,
						Provider: "dizimom",
						URL:      es.URL,
						YTID:     es.YTID,
						Headers:  es.Headers,
					})
				}
			}
		})
	}

	if len(streams) == 0 {
		cleanSlug := epSlug
		reEp := regexp.MustCompile(`[-_](\d+)[-_]bolum`)
		epNum := 1
		if m := reEp.FindStringSubmatch(cleanSlug); len(m) > 1 {
			fmt.Sscanf(m[1], "%d", &epNum)
		}
		showName := reEp.ReplaceAllString(cleanSlug, "")
		showName = regexp.MustCompile(`^[a-]+`).ReplaceAllString(showName, "")
		showName = regexp.MustCompile(`[-_](?:izle|final|sezon|hd\d*).*$`).ReplaceAllString(showName, "")
		showName = strings.ReplaceAll(showName, "-", " ")
		showName = strings.Title(strings.TrimSpace(showName))

		ytQuery := fmt.Sprintf("%s %d. Bölüm", showName, epNum)
		if ytStream := SearchYouTubeEpisode(ctx, ytQuery); ytStream != nil {
			ytStream.Title = "⌜ Dizimom ⌟ | YouTube (1080p)"
			ytStream.Provider = "dizimom"
			streams = append(streams, *ytStream)
		}
	}

	return streams, nil
}

func fetchHDPlayer(ctx context.Context, embedURL string) *models.Stream {
	u, err := url.Parse(embedURL)
	if err != nil {
		return nil
	}
	dataID := u.Query().Get("data")
	if dataID == "" {
		parts := strings.Split(strings.Trim(u.Path, "/"), "/")
		dataID = parts[len(parts)-1]
	}
	if dataID == "" {
		return nil
	}

	apiURL := fmt.Sprintf("https://hdplayersystem.com/player/index.php?data=%s&do=getVideo", dataID)
	postData := url.Values{
		"hash": {dataID},
		"r":    {"https://www.dizimom.diy/"},
	}
	apiHeaders := map[string]string{
		"Content-Type":     "application/x-www-form-urlencoded",
		"X-Requested-With": "XMLHttpRequest",
		"Referer":          embedURL,
		"User-Agent":       utils.DefaultUserAgent,
	}

	resp, err := utils.DefaultClient.Request(ctx, "POST", apiURL, strings.NewReader(postData.Encode()), apiHeaders)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	var res struct {
		SecuredLink string `json:"securedLink"`
		VideoSource string `json:"videoSource"`
	}
	json.NewDecoder(resp.Body).Decode(&res)

	targetLink := res.SecuredLink
	if targetLink == "" {
		targetLink = res.VideoSource
	}

	if targetLink == "" {
		return nil
	}

	return &models.Stream{
		Title:    "⌜ Dizimom ⌟ | HLS (1080p)",
		Quality:  "1080p",
		Provider: "dizimom",
		URL:      targetLink,
		Headers: map[string]string{
			"Referer": "https://hdplayersystem.com/",
			"Origin":  "https://hdplayersystem.com",
		},
	}
}
