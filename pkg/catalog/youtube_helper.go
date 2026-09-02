package catalog

import (
	"context"
	"fmt"
	"net/url"
	"regexp"

	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/utils"
)

var reYTSearchVideoID = regexp.MustCompile(`"videoId":"([a-zA-Z0-9_-]{11})"`)

// SearchYouTubeEpisode searches YouTube for the episode and returns a stream
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

	matches := reYTSearchVideoID.FindAllStringSubmatch(string(body), 5)
	if len(matches) == 0 {
		return nil
	}

	videoID := matches[0][1]
	return &models.Stream{
		Title:    "YouTube (1080p)",
		Quality:  "1080p",
		URL:      fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID),
		YTID:     videoID,
		Provider: "youtube",
	}
}
