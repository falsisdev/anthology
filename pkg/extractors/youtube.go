package extractors

import (
	"context"
	"fmt"
	"net/url"
	"regexp"

	"github.com/falsisdev/anthology/pkg/models"
)

var reYTID = regexp.MustCompile(`(?i)(?:embed\/|v\/|vi\/|youtu\.be\/|\/v=|\/embed\?v=|\/watch\?v=|id=)([a-zA-Z0-9_-]{11})`)

// ExtractYouTube extracts the YouTube video ID and returns a Stream with YTID and URL.
func ExtractYouTube(ctx context.Context, embedURL, referer string) ([]models.Stream, error) {
	m := reYTID.FindStringSubmatch(embedURL)
	if len(m) < 2 {
		// Try parsing query param id or v
		u, err := url.Parse(embedURL)
		if err == nil {
			id := u.Query().Get("id")
			if id == "" {
				id = u.Query().Get("v")
			}
			if len(id) == 11 {
				m = []string{id, id}
			}
		}
	}

	if len(m) < 2 {
		return nil, nil
	}

	videoID := m[1]
	streamURL := fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID)

	return []models.Stream{
		{
			Title:    "YouTube (1080p)",
			Quality:  "1080p",
			URL:      streamURL,
			YTID:     videoID,
			Provider: "youtube",
		},
	}, nil
}
