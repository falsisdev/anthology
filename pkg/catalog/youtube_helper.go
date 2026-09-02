package catalog

import (
	"context"
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/utils"
)

var reYTRenderer = regexp.MustCompile(`"videoRenderer":\{"videoId":"([a-zA-Z0-9_-]{11})".*?"title":\{"runs":\[\{"text":"([^"]+)"\}`)

// SearchYouTubeEpisode searches YouTube for the full episode and filters out fragmans/trailers
func SearchYouTubeEpisode(ctx context.Context, query string) *models.Stream {
	searchURL := fmt.Sprintf("https://www.youtube.com/results?search_query=%s", url.QueryEscape(query))
	headers := map[string]string{
		"User-Agent":      utils.DefaultUserAgent,
		"Accept-Language": "tr-TR,tr;q=0.9",
	}

	body, err := utils.DefaultClient.Get(ctx, searchURL, headers)
	if err != nil {
		return nil
	}

	matches := reYTRenderer.FindAllStringSubmatch(string(body), 15)
	if len(matches) == 0 {
		// Fallback to simple videoId match if renderer regex missed
		reSimple := regexp.MustCompile(`"videoId":"([a-zA-Z0-9_-]{11})"`)
		sMatches := reSimple.FindAllStringSubmatch(string(body), 5)
		if len(sMatches) == 0 {
			return nil
		}
		videoID := sMatches[0][1]
		return &models.Stream{
			Title:    "YouTube (1080p)",
			Quality:  "1080p",
			URL:      fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID),
			YTID:     videoID,
			Provider: "youtube",
		}
	}

	for _, m := range matches {
		videoID := m[1]
		title := strings.ToLower(m[2])

		// Exclude trailers, teasers, summaries, and clips
		if strings.Contains(title, "fragman") ||
			strings.Contains(title, "fragmanı") ||
			strings.Contains(title, "teaser") ||
			strings.Contains(title, "tanıtım") ||
			strings.Contains(title, "trailer") ||
			strings.Contains(title, "özet") ||
			strings.Contains(title, "kesit") ||
			strings.Contains(title, "sahne") ||
			strings.Contains(title, "kamera arkası") {
			continue
		}

		return &models.Stream{
			Title:    fmt.Sprintf("⌜ YouTube ⌟ | %s (1080p)", m[2]),
			Quality:  "1080p",
			URL:      fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID),
			YTID:     videoID,
			Provider: "youtube",
		}
	}

	return nil
}
