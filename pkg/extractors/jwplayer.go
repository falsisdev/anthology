package extractors

import (
	"context"
	"regexp"
	"strings"

	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/utils"
)

var (
	reJWPlayerFile = regexp.MustCompile(`(?:sources:\s*\[\s*{\s*file:\s*|file:\s*|<source[^>]+src=)["'](https?://[^"']+)["']`)
)

func ExtractJWPlayer(ctx context.Context, pageURL, referer string) ([]models.Stream, error) {
	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
	}
	if referer != "" {
		headers["Referer"] = referer
	}

	body, err := utils.DefaultClient.Get(ctx, pageURL, headers)
	if err != nil {
		return nil, err
	}

	bodyStr := string(body)
	matches := reJWPlayerFile.FindAllStringSubmatch(bodyStr, -1)
	if len(matches) == 0 {
		return nil, nil
	}

	var streams []models.Stream
	seen := make(map[string]bool)

	for _, m := range matches {
		if len(m) < 2 {
			continue
		}
		rawURL := m[1]
		if seen[rawURL] || strings.Contains(rawURL, ".svg") || strings.Contains(rawURL, ".png") || strings.Contains(rawURL, ".jpg") || strings.Contains(rawURL, ".vtt") {
			continue
		}
		seen[rawURL] = true

		quality := "1080p"
		title := "HLS (1080p)"
		if strings.Contains(rawURL, ".mp4") {
			title = "MP4 (1080p)"
		}

		streams = append(streams, models.Stream{
			Title:   title,
			URL:     rawURL,
			Quality: quality,
			Headers: map[string]string{
				"Referer": pageURL,
			},
		})
	}

	return streams, nil
}
