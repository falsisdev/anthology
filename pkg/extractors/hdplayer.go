package extractors

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/utils"
)

// ExtractHDPlayer extracts direct HLS streams from hdplayersystem.com /
// hdstreamable.com embed pages. These are the most common Turkish embed
// players (used by dizimom, dizibox, dizigom, dizimag, dizipal, sinewix,
// diziyou and many others).
func ExtractHDPlayer(ctx context.Context, embedURL, referer string) ([]models.Stream, error) {
	u, err := url.Parse(embedURL)
	if err != nil {
		return nil, nil
	}

	// Some sites embed with mixed-case hosts (e.g. "Player.filmizle.in")
	// which breaks the API request; normalize to lowercase.
	u.Host = strings.ToLower(u.Host)

	// Extract the data ID from the query string or the last path segment
	dataID := u.Query().Get("data")
	if dataID == "" {
		parts := strings.Split(strings.Trim(u.Path, "/"), "/")
		if len(parts) > 0 {
			dataID = parts[len(parts)-1]
		}
	}
	if dataID == "" {
		return nil, nil
	}

	// Build the HDPlayer API URL. All known variants (hdplayersystem.com,
	// hdstreamable.com, player.filmizle.in aka FirePlayer) serve the API on
	// the embed's own host under /player/index.php.
	apiURL := fmt.Sprintf("https://%s/player/index.php?data=%s&do=getVideo", u.Host, dataID)
	if strings.Contains(u.Host, "hdstreamable") {
		apiURL = fmt.Sprintf("https://%s%s?do=getVideo", u.Host, u.Path)
	}

	// Use the referer (provider page URL) as the 'r' parameter; fall back to
	// the embed URL origin so the API accepts the request.
	refererParam := referer
	if refererParam == "" {
		refererParam = fmt.Sprintf("https://%s/", u.Host)
	}

	postData := url.Values{
		"hash": {dataID},
		"r":    {refererParam},
	}

	apiHeaders := map[string]string{
		"Content-Type":     "application/x-www-form-urlencoded",
		"X-Requested-With": "XMLHttpRequest",
		"Referer":          embedURL,
		"User-Agent":       utils.DefaultUserAgent,
	}

	resp, err := utils.DefaultClient.Request(ctx, "POST", apiURL, strings.NewReader(postData.Encode()), apiHeaders)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var res struct {
		SecuredLink  string `json:"securedLink"`
		VideoSource  string `json:"videoSource"`
		VideoSources []struct {
			File  string `json:"file"`
			Label string `json:"label"`
		} `json:"videoSources"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	targetLink := res.SecuredLink
	if targetLink == "" {
		targetLink = res.VideoSource
	}
	if targetLink == "" && len(res.VideoSources) > 0 {
		targetLink = res.VideoSources[0].File
	}

	if targetLink == "" {
		return nil, nil
	}

	// Some streams (e.g. Twitter/X) don't need Referer/Origin spoofing
	var headers map[string]string
	if !strings.Contains(targetLink, "twimg.com") {
		headers = map[string]string{
			"Referer": fmt.Sprintf("https://%s/", u.Host),
			"Origin":  fmt.Sprintf("https://%s", u.Host),
		}
	}

	return []models.Stream{
		{
			Title:   "HLS (1080p)",
			URL:     targetLink,
			Quality: "1080p",
			Headers: headers,
		},
	}, nil
}
