package catalog

import (
	"bytes"
	"context"
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/utils"
)

const diziyouBase = "https://www.diziyou.one"

func diziyouHeaders() map[string]string {
	return map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    diziyouBase + "/",
	}
}

func searchDiziYou(ctx context.Context, query string) ([]MetaItem, error) {
	ajaxURL := fmt.Sprintf("%s/wp-admin/admin-ajax.php", diziyouBase)
	postData := url.Values{
		"action":  {"data_fetch"},
		"keyword": {query},
	}
	ajaxHeaders := map[string]string{
		"User-Agent":       utils.DefaultUserAgent,
		"Referer":          diziyouBase + "/",
		"Content-Type":     "application/x-www-form-urlencoded; charset=UTF-8",
		"X-Requested-With": "XMLHttpRequest",
	}

	resp, err := utils.DefaultClient.Request(ctx, "POST", ajaxURL, strings.NewReader(postData.Encode()), ajaxHeaders)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	var results []MetaItem
	seen := make(map[string]bool)

	doc.Find("#searchelement").Each(func(i int, s *goquery.Selection) {
		a := s.Find("a").First()
		href, _ := a.Attr("href")
		if href == "" {
			return
		}

		clean := strings.Trim(href, "/")
		parts := strings.Split(clean, "/")
		slug := parts[len(parts)-1]
		if seen[slug] {
			return
		}
		seen[slug] = true

		title := strings.TrimSpace(s.Find("a").Last().Text())
		if title == "" {
			title = strings.Title(strings.ReplaceAll(slug, "-", " "))
		}

		img := s.Find("img").First()
		poster, _ := img.Attr("src")

		results = append(results, MetaItem{
			ID:          "diziyou:show:" + slug,
			Type:        "series",
			Name:        title,
			Poster:      poster,
			Background:  poster,
			Description: fmt.Sprintf("%s - DiziYou", title),
			Genres:      []string{"DiziYou", "Dizi"},
		})
	})

	return results, nil
}

func defaultDiziYou(ctx context.Context) ([]MetaItem, error) {
	body, err := utils.DefaultClient.Get(ctx, diziyouBase+"/", diziyouHeaders())
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	var results []MetaItem
	seen := make(map[string]bool)

	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		href, _ := s.Attr("href")
		if !strings.HasPrefix(href, diziyouBase) || strings.Contains(href, "-bolum") || strings.Contains(href, "/category/") || seen[href] {
			return
		}

		clean := strings.Trim(href, "/")
		parts := strings.Split(clean, "/")
		if len(parts) != 4 {
			return
		}
		slug := parts[len(parts)-1]

		title := strings.TrimSpace(s.Text())
		if title == "" || len(title) < 3 {
			return
		}
		seen[href] = true

		results = append(results, MetaItem{
			ID:     "diziyou:show:" + slug,
			Type:   "series",
			Name:   title,
			Genres: []string{"DiziYou", "Popüler Dizi"},
		})
	})

	return results, nil
}

func getDiziYouMeta(ctx context.Context, showID string) (*MetaDetail, error) {
	slug := strings.TrimPrefix(showID, "diziyou:show:")
	showURL := fmt.Sprintf("%s/%s/", diziyouBase, slug)

	body, err := utils.DefaultClient.Get(ctx, showURL, diziyouHeaders())
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	title := strings.TrimSpace(doc.Find("h1").First().Text())
	if title == "" {
		title = slug
	}

	poster, _ := doc.Find("article img, .poster img").First().Attr("src")
	if poster == "" {
		poster, _ = doc.Find("article img, .poster img").First().Attr("data-src")
	}

	desc := strings.TrimSpace(doc.Find(".summary, .ozet, p").First().Text())

	reSeasEp := regexp.MustCompile(`(\d+)\.\s*sezon\s*(\d+)\.\s*bölüm`)
	reEp := regexp.MustCompile(`(\d+)\.\s*bölüm`)

	var videos []VideoItem
	seen := make(map[string]bool)

	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		href, _ := s.Attr("href")
		epTitle := strings.TrimSpace(s.Text())
		if epTitle == "" {
			epTitle, _ = s.Attr("title")
		}

		if !strings.Contains(href, "-bolum") || seen[href] {
			return
		}
		seen[href] = true

		season := 1
		episode := 1

		lower := strings.ToLower(epTitle)
		if m := reSeasEp.FindStringSubmatch(lower); len(m) > 2 {
			fmt.Sscanf(m[1], "%d", &season)
			fmt.Sscanf(m[2], "%d", &episode)
		} else if m := reEp.FindStringSubmatch(lower); len(m) > 1 {
			fmt.Sscanf(m[1], "%d", &episode)
		}

		clean := strings.Trim(href, "/")
		parts := strings.Split(clean, "/")
		epSlug := parts[len(parts)-1]

		videos = append(videos, VideoItem{
			ID:      "diziyou:ep:" + epSlug,
			Title:   epTitle,
			Season:  season,
			Episode: episode,
		})
	})

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
		Genres:      []string{"DiziYou", "Dizi"},
		Videos:      videos,
	}, nil
}

func getDiziYouStream(ctx context.Context, rawID string) ([]models.Stream, error) {
	epSlug := strings.TrimPrefix(rawID, "diziyou:ep:")
	epURL := fmt.Sprintf("%s/%s/", diziyouBase, epSlug)

	body, err := utils.DefaultClient.Get(ctx, epURL, diziyouHeaders())
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	var playerURL string
	doc.Find("iframe").EachWithBreak(func(i int, s *goquery.Selection) bool {
		src, _ := s.Attr("src")
		if src == "" {
			src, _ = s.Attr("data-src")
		}
		if strings.Contains(src, "/player/") {
			playerURL = src
			return false
		}
		return true
	})

	if playerURL == "" {
		return nil, nil
	}

	pBody, err := utils.DefaultClient.Get(ctx, playerURL, diziyouHeaders())
	if err != nil {
		return nil, err
	}

	reHLS := regexp.MustCompile(`(https?://[^"']+\.m3u8)`)
	m := reHLS.FindStringSubmatch(string(pBody))
	if len(m) < 2 {
		return nil, nil
	}

	hlsURL := m[1]
	return []models.Stream{
		{
			Title:    "⌜ DiziYou ⌟ | HLS (1080p)",
			Quality:  "1080p",
			Provider: "diziyou",
			URL:      hlsURL,
			Headers: map[string]string{
				"Referer": playerURL,
			},
		},
	}, nil
}
