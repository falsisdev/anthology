package catalog

import (
	"bytes"
	"context"
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/falsisdev/anthology/pkg/extractors"
	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/utils"
)

const ddiziBase = "https://www.ddizi.im"

func ddiziHeaders() map[string]string {
	return map[string]string{
		"User-Agent":   utils.DefaultUserAgent,
		"Referer":      ddiziBase + "/",
		"Content-Type": "application/x-www-form-urlencoded",
	}
}

func searchDdizi(ctx context.Context, query string) ([]MetaItem, error) {
	postData := url.Values{"arama": {query}}
	resp, err := utils.DefaultClient.Request(ctx, "POST", ddiziBase+"/arama/", strings.NewReader(postData.Encode()), ddiziHeaders())
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	var results []MetaItem
	doc.Find(".dizi-boxpost-cat").Each(func(i int, s *goquery.Selection) {
		a := s.Find("a").First()
		href, _ := a.Attr("href")
		if !strings.Contains(href, "/diziler/") {
			return
		}

		name := strings.TrimSpace(a.Text())
		img := a.Find("img")
		poster, _ := img.Attr("data-src")
		if poster == "" {
			poster, _ = img.Attr("src")
		}
		desc := strings.TrimSpace(s.Find("p").First().Text())

		parts := strings.Split(strings.Trim(href, "/"), "/")
		if len(parts) < 2 {
			return
		}
		slugPart := strings.Join(parts[len(parts)-2:], ":")
		id := "ddizi:show:" + slugPart

		results = append(results, MetaItem{
			ID:          id,
			Type:        "series",
			Name:        name,
			Poster:      poster,
			Background:  poster,
			Description: desc,
			Genres:      []string{"Ddizi", "Yerli Dizi"},
		})
	})
	return results, nil
}

func defaultDdizi(ctx context.Context) ([]MetaItem, error) {
	body, err := utils.DefaultClient.Get(ctx, ddiziBase+"/", ddiziHeaders())
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	reCleanTitle := regexp.MustCompile(`(?i)[\s\-_]*\d+[\.\s\-_]*b[oö]l[uü]m.*`)
	reStripHTML := regexp.MustCompile(`<[^>]*>`)

	var results []MetaItem
	seen := make(map[string]bool)

	// 1. Episode cards with posters
	doc.Find("img[data-src]").Each(func(i int, img *goquery.Selection) {
		src, _ := img.Attr("data-src")
		if src == "" || !strings.Contains(src, "/diziresimleri/") {
			return
		}

		a := img.Closest("a")
		if a.Length() == 0 {
			a = img.Parent()
		}
		href, _ := a.Attr("href")
		if href == "" || strings.Contains(href, "iletisim") {
			return
		}

		alt, _ := img.Attr("alt")
		title := reCleanTitle.ReplaceAllString(alt, "")
		title = reStripHTML.ReplaceAllString(title, "")
		title = strings.TrimSpace(title)

		parts := strings.Split(strings.Trim(href, "/"), "/")
		if len(parts) < 2 {
			return
		}

		var id string
		if strings.Contains(href, "/izle/") {
			slugPart := strings.Join(parts[len(parts)-2:], ":")
			id = "ddizi:ep:" + slugPart
		} else if strings.Contains(href, "/diziler/") {
			slugPart := strings.Join(parts[len(parts)-2:], ":")
			id = "ddizi:show:" + slugPart
		} else {
			return
		}

		if seen[title] {
			return
		}
		seen[title] = true

		results = append(results, MetaItem{
			ID:          id,
			Type:        "series",
			Name:        title,
			Poster:      src,
			Background:  src,
			Description: title + " - Ddizi Popüler Dizi",
			Genres:      []string{"Ddizi", "Popüler Dizi"},
		})
	})

	// 2. Series links
	doc.Find("a").Each(func(i int, a *goquery.Selection) {
		href, _ := a.Attr("href")
		if !strings.Contains(href, "/diziler/") {
			return
		}
		title := strings.TrimSpace(a.Text())
		if title == "" || len(title) < 2 {
			title, _ = a.Attr("title")
		}
		title = regexp.MustCompile(`(?i)[\s\-_]*(?:son[\s\-_]+bolum[\s\-_]+izle|dizisi|izle)$`).ReplaceAllString(title, "")
		title = reStripHTML.ReplaceAllString(title, "")
		title = strings.TrimSpace(title)
		if title == "" || seen[title] {
			return
		}

		parts := strings.Split(strings.Trim(href, "/"), "/")
		if len(parts) < 2 {
			return
		}
		slugPart := strings.Join(parts[len(parts)-2:], ":")
		id := "ddizi:show:" + slugPart
		seen[title] = true

		results = append(results, MetaItem{
			ID:          id,
			Type:        "series",
			Name:        title,
			Description: title + " - Ddizi Dizi Arşivi",
			Genres:      []string{"Ddizi", "Dizi"},
		})
	})

	return results, nil
}

func getDdiziMeta(ctx context.Context, showID string) (*MetaDetail, error) {
	if strings.HasPrefix(showID, "ddizi:ep:") {
		clean := strings.TrimPrefix(showID, "ddizi:ep:")
		parts := strings.Split(clean, ":")
		if len(parts) < 2 {
			return nil, fmt.Errorf("invalid episode id")
		}
		epURL := fmt.Sprintf("%s/izle/%s/%s", ddiziBase, parts[0], parts[1])
		body, err := utils.DefaultClient.Get(ctx, epURL, ddiziHeaders())
		if err != nil {
			return nil, err
		}
		doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
		if err != nil {
			return nil, err
		}
		title := strings.TrimSpace(doc.Find(".title_con h1, .white_back h1, title").First().Text())
		title = strings.TrimSuffix(title, " izle")
		title = strings.TrimSpace(title)

		poster, _ := doc.Find(".dizi-resmi img, .img-back-cat, .content_ img, img.lazyload").First().Attr("data-src")
		if poster == "" {
			poster, _ = doc.Find(".dizi-resmi img, .img-back-cat, .content_ img, img.lazyload").First().Attr("src")
		}

		return &MetaDetail{
			ID:          showID,
			Type:        "series",
			Name:        title,
			Poster:      poster,
			Background:  poster,
			Description: title + " - Ddizi",
			Genres:      []string{"Ddizi", "Dizi"},
			Videos: []VideoItem{
				{
					ID:      showID,
					Title:   title,
					Season:  1,
					Episode: 1,
				},
			},
		}, nil
	}

	clean := strings.TrimPrefix(showID, "ddizi:show:")
	parts := strings.Split(clean, ":")
	if len(parts) < 2 {
		return nil, fmt.Errorf("invalid show id")
	}
	showURL := fmt.Sprintf("%s/diziler/%s/%s", ddiziBase, parts[0], parts[1])

	body, err := utils.DefaultClient.Get(ctx, showURL, ddiziHeaders())
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	title := strings.TrimSpace(doc.Find(".title_con h1, .white_back h1, title").First().Text())
	title = strings.TrimSuffix(title, " izle")
	title = strings.TrimSpace(title)

	poster, _ := doc.Find(".dizi-resmi img, .img-back-cat, .content_ img").First().Attr("data-src")
	if poster == "" {
		poster, _ = doc.Find(".dizi-resmi img, .img-back-cat, .content_ img").First().Attr("src")
	}

	desc := strings.TrimSpace(doc.Find(".dizi-ozeti, .content_ p").First().Text())

	reSayfaNum := regexp.MustCompile(`/sayfa-(\d+)`)
	reEpNum := regexp.MustCompile(`(\d+)\.\s*bölüm`)
	reHrefEpNum := regexp.MustCompile(`[-_](\d+)[-_]bolum`)

	maxPage := 0
	doc.Find(".content_ nav a, nav[aria-label='Page navigation'] a").Each(func(i int, s *goquery.Selection) {
		href, _ := s.Attr("href")
		if m := reSayfaNum.FindStringSubmatch(href); len(m) > 1 {
			var p int
			fmt.Sscanf(m[1], "%d", &p)
			if p > maxPage {
				maxPage = p
			}
		}
	})

	var allDocs []*goquery.Document
	allDocs = append(allDocs, doc)

	for p := 1; p <= maxPage; p++ {
		pageURL := fmt.Sprintf("%s/sayfa-%d", showURL, p)
		pBody, err := utils.DefaultClient.Get(ctx, pageURL, ddiziHeaders())
		if err == nil {
			pDoc, err := goquery.NewDocumentFromReader(bytes.NewReader(pBody))
			if err == nil {
				allDocs = append(allDocs, pDoc)
			}
		}
	}

	var videos []VideoItem
	seen := make(map[string]bool)

	for _, d := range allDocs {
		d.Find(".content_ .dizi-boxpost-cat a").Each(func(i int, s *goquery.Selection) {
			href, _ := s.Attr("href")
			epTitle := strings.TrimSpace(s.Text())
			if epTitle == "" {
				epTitle, _ = s.Attr("title")
			}
			if !strings.Contains(href, "/izle/") || seen[href] {
				return
			}
			seen[href] = true

			epNum := 1
			if m := reEpNum.FindStringSubmatch(strings.ToLower(epTitle)); len(m) > 1 {
				fmt.Sscanf(m[1], "%d", &epNum)
			} else if m := reHrefEpNum.FindStringSubmatch(strings.ToLower(href)); len(m) > 1 {
				fmt.Sscanf(m[1], "%d", &epNum)
			}

			epParts := strings.Split(strings.Trim(href, "/"), "/")
			epID := strings.Join(epParts[len(epParts)-2:], ":")

			videos = append(videos, VideoItem{
				ID:      "ddizi:ep:" + epID,
				Title:   epTitle,
				Season:  1,
				Episode: epNum,
			})
		})
	}

	// Reverse so episodes are in ascending order (1, 2, 3...)
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
		Genres:      []string{"Ddizi", "Dizi"},
		Videos:      videos,
	}, nil
}

func getDdiziStream(ctx context.Context, rawID string) ([]models.Stream, error) {
	// rawID: ddizi:ep:73733:son-yaz-1-bolum-izle-hd1.htm
	clean := strings.TrimPrefix(rawID, "ddizi:ep:")
	parts := strings.Split(clean, ":")
	if len(parts) < 2 {
		return nil, fmt.Errorf("invalid episode id")
	}

	epURL := fmt.Sprintf("%s/izle/%s/%s", ddiziBase, parts[0], parts[1])
	body, err := utils.DefaultClient.Get(ctx, epURL, ddiziHeaders())
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	var streams []models.Stream
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
		} else if strings.HasPrefix(src, "/") {
			src = ddiziBase + src
		}

		extracted, err := extractors.Extract(ctx, src, epURL)
		if err == nil && len(extracted) > 0 {
			for _, es := range extracted {
				streams = append(streams, models.Stream{
					Name:     "Ddizi",
					Title:    fmt.Sprintf("⌜ Ddizi ⌟ | %s", es.Title),
					Quality:  es.Quality,
					Provider: "ddizi",
					URL:      es.URL,
					YTID:     es.YTID,
					Headers:  es.Headers,
				})
			}
		}
	})

	// Fallback to official YouTube search if Ddizi has 0 streams (e.g. DMCA notice)
	if len(streams) == 0 {
		epPageTitle := strings.TrimSpace(doc.Find("h1, .title_con h1").First().Text())
		if epPageTitle == "" {
			epPageTitle = strings.TrimSpace(doc.Find("title").First().Text())
		}
		cleanTitle := strings.TrimSuffix(epPageTitle, " izle")
		cleanTitle = strings.TrimSuffix(cleanTitle, " Full izle")
		cleanTitle = strings.TrimSuffix(cleanTitle, " | Ddizi")
		cleanTitle = strings.TrimSpace(cleanTitle)

		if cleanTitle == "" && len(parts) > 1 {
			cleanSlug := strings.TrimSuffix(parts[1], ".htm")
			cleanSlug = strings.ReplaceAll(cleanSlug, "-", " ")
			cleanTitle = strings.Title(cleanSlug)
		}

		if cleanTitle != "" {
			if ytStream := SearchYouTubeEpisode(ctx, cleanTitle); ytStream != nil {
				ytStream.Title = "⌜ Ddizi ⌟ | YouTube (1080p)"
				ytStream.Provider = "ddizi"
				streams = append(streams, *ytStream)
			}
		}
	}

	return streams, nil
}
