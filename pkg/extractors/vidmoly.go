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
	reVidmolyDomain  = regexp.MustCompile(`https?://(?:www\.)?vidmoly\.[a-z]+(/embed-[a-zA-Z0-9]+(?:\.html)?)`)
)

func ExtractVidmoly(ctx context.Context, embedURL, referer string) ([]models.Stream, error) {
	// Normalize vidmoly mirrors (vidmoly.me, vidmoly.to, vidmoly.net, etc.)
	// to the currently active domain. vidmoly.biz is now dead – vidmoly.to
	// is the live mirror.
	if m := reVidmolyDomain.FindStringSubmatch(embedURL); len(m) > 1 {
		cleanPath := m[1]
		if !strings.HasSuffix(cleanPath, ".html") {
			cleanPath += ".html"
		}
		// Don't redirect if already pointing at a possibly-live domain;
		// only rewrite when the hostname is not a known-active vidmoly TLD.
		lowerURL := strings.ToLower(embedURL)
		if !strings.Contains(lowerURL, "vidmoly.to") {
			embedURL = "https://vidmoly.to" + cleanPath
		}
	}

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
