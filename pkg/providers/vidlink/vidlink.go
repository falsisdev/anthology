package vidlink

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/falsisdev/nuviotr/pkg/models"
	"github.com/falsisdev/nuviotr/pkg/provider"
	"github.com/falsisdev/nuviotr/pkg/utils"
)

const (
	ID          = "vidlink"
	Name        = "Vidlink"
	EncDecAPI   = "https://enc-dec.app/api/enc-tmdb-id?id="
	VidlinkBase = "https://vidlink.pro"
)

func init() {
	provider.Register(New())
}

type Provider struct{}

func New() *Provider {
	return &Provider{}
}

func (p *Provider) ID() string {
	return ID
}

func (p *Provider) Name() string {
	return Name
}

func (p *Provider) SupportedTypes() []models.MediaType {
	return []models.MediaType{models.MediaTypeMovie, models.MediaTypeTV}
}

type encResponse struct {
	Result string `json:"result"`
}

type vidlinkSubtitle struct {
	Label string `json:"label"`
	File  string `json:"file"`
}

type vidlinkQualities struct {
	Q1080 string `json:"1080p,omitempty"`
	Q720  string `json:"720p,omitempty"`
	Q480  string `json:"480p,omitempty"`
	Q360  string `json:"360p,omitempty"`
}

type vidlinkStreamData struct {
	Playlist  string           `json:"playlist"`
	Qualities vidlinkQualities `json:"qualities"`
	Tracks    []vidlinkSubtitle `json:"tracks"`
}

type vidlinkResponse struct {
	Stream *vidlinkStreamData `json:"stream"`
}

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	// 1. Encrypt TMDB ID
	encURL := fmt.Sprintf("%s%s", EncDecAPI, media.TMDBID)
	body, err := utils.DefaultClient.Get(ctx, encURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt tmdb id: %w", err)
	}

	var encResp encResponse
	if err := json.Unmarshal(body, &encResp); err != nil || encResp.Result == "" {
		return nil, fmt.Errorf("invalid encryption response")
	}

	// 2. Fetch Vidlink API
	var apiURL string
	if media.Type == models.MediaTypeMovie {
		apiURL = fmt.Sprintf("%s/api/b/movie/%s", VidlinkBase, encResp.Result)
	} else if media.Type == models.MediaTypeTV {
		apiURL = fmt.Sprintf("%s/api/b/tv/%s/%d/%d", VidlinkBase, encResp.Result, media.Season, media.Episode)
	} else {
		return nil, nil
	}

	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    VidlinkBase + "/",
		"Origin":     VidlinkBase,
	}

	apiBody, err := utils.DefaultClient.Get(ctx, apiURL, headers)
	if err != nil {
		return nil, err
	}

	var vResp vidlinkResponse
	if err := json.Unmarshal(apiBody, &vResp); err != nil || vResp.Stream == nil {
		return nil, nil
	}

	streamHeaders := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    VidlinkBase + "/",
		"Origin":     VidlinkBase,
	}

	var subtitles []models.Subtitle
	for _, t := range vResp.Stream.Tracks {
		if strings.TrimSpace(t.File) != "" {
			subtitles = append(subtitles, models.Subtitle{
				Label: t.Label,
				URL:   t.File,
			})
		}
	}

	var streams []models.Stream

	// Add qualities if available
	qMap := map[string]string{
		"1080p": vResp.Stream.Qualities.Q1080,
		"720p":  vResp.Stream.Qualities.Q720,
		"480p":  vResp.Stream.Qualities.Q480,
		"360p":  vResp.Stream.Qualities.Q360,
	}

	for quality, link := range qMap {
		if link != "" {
			streams = append(streams, models.Stream{
				Name:      media.Title,
				Title:     fmt.Sprintf("⌜ Vidlink ⌟ | %s [EN/SUB]", quality),
				URL:       link,
				Quality:   quality,
				Provider:  ID,
				Headers:   streamHeaders,
				Subtitles: subtitles,
			})
		}
	}

	if len(streams) == 0 && vResp.Stream.Playlist != "" {
		streams = append(streams, models.Stream{
			Name:      media.Title,
			Title:     "⌜ Vidlink ⌟ | Auto HLS",
			URL:       vResp.Stream.Playlist,
			Quality:   "Auto",
			Provider:  ID,
			Headers:   streamHeaders,
			Subtitles: subtitles,
		})
	}

	return streams, nil
}
