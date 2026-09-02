package extractors

import (
	"context"
	"regexp"
	"strings"

	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/utils"
)

var (
	reVidmolySources = regexp.MustCompile(`(?:sources:\s*\[\s*{\s*file:\s*|file:\s*)["'](https?://[^"']+\.(?:m3u8|mp4)[^"']*)["']`)
)

func ExtractVidmoly(ctx context.Context, embedURL, referer string) ([]models.Stream, error) {
	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
	}
	if referer != "" {
		headers["Referer"] = referer
	} else {
		headers["Referer"] = "https://vidmoly.to/"
	}

	body, err := utils.DefaultClient.Get(ctx, embedURL, headers)
	if err != nil {
		return nil, err
	}

	bodyStr := string(body)
	matches := reVidmolySources.FindAllStringSubmatch(bodyStr, -1)
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
		if seen[rawURL] {
			continue
		}
		seen[rawURL] = true

		quality := "Auto"
		title := "VidMoly (HLS)"
		if strings.Contains(rawURL, ".mp4") {
			title = "VidMoly (MP4)"
			quality = "1080p"
		}

		streams = append(streams, models.Stream{
			Title:   title,
			URL:     rawURL,
			Quality: quality,
			Headers: map[string]string{
				"Referer": embedURL,
				"Origin":  "https://vidmoly.to",
			},
		})
	}

	return streams, nil
}
