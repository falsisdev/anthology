package animecix

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/falsisdev/nuviotr/pkg/models"
	"github.com/falsisdev/nuviotr/pkg/provider"
	"github.com/falsisdev/nuviotr/pkg/utils"
)

const (
	ID      = "animecix"
	Name    = "AnimeciX"
	BaseURL = "https://animecix.tv"
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

type searchItem struct {
	ID            int         `json:"id"`
	Name          string      `json:"name"`
	NameEnglish   string      `json:"name_english"`
	NameRomanji   string      `json:"name_romanji"`
	OriginalTitle string      `json:"original_title"`
	TMDBID        interface{} `json:"tmdb_id"`
	IMDbID        string      `json:"imdb_id"`
}

type searchResponse struct {
	Results []searchItem `json:"results"`
}

type videoItem struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	Extra      string `json:"extra"`
	URL        string `json:"url"`
	Type       string `json:"type"`
	Quality    string `json:"quality"`
	SeasonNum  int    `json:"season_num"`
	EpisodeNum int    `json:"episode_num"`
	Language   string `json:"language"`
	Category   string `json:"category"`
}

type titleDetailResponse struct {
	Title struct {
		ID     int         `json:"id"`
		Name   string      `json:"name"`
		Videos []videoItem `json:"videos"`
	} `json:"title"`
}

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	searchQuery := media.OriginalTitle
	if searchQuery == "" {
		searchQuery = media.Title
	}

	searchURL := fmt.Sprintf("%s/secure/search/%s?type=&limit=10", BaseURL, url.PathEscape(searchQuery))
	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	}

	body, err := utils.DefaultClient.Get(ctx, searchURL, headers)
	if err != nil {
		return nil, err
	}

	var sResp searchResponse
	if err := json.Unmarshal(body, &sResp); err != nil || len(sResp.Results) == 0 {
		return nil, nil
	}

	var matchedItem *searchItem
	for _, item := range sResp.Results {
		if item.TMDBID != nil {
			var tmdbStr string
			switch v := item.TMDBID.(type) {
			case float64:
				tmdbStr = strconv.Itoa(int(v))
			case string:
				tmdbStr = v
			}
			if tmdbStr == media.TMDBID {
				matchedItem = &item
				break
			}
		}

		if item.IMDbID != "" && media.IMDbID != "" && item.IMDbID == media.IMDbID {
			matchedItem = &item
			break
		}

		origNorm := utils.NormalizeTurkish(media.OriginalTitle)
		nameNorm := utils.NormalizeTurkish(item.Name)
		engNorm := utils.NormalizeTurkish(item.NameEnglish)
		romNorm := utils.NormalizeTurkish(item.NameRomanji)

		if nameNorm == origNorm || engNorm == origNorm || romNorm == origNorm {
			matchedItem = &item
			break
		}
	}

	if matchedItem == nil && len(sResp.Results) > 0 {
		matchedItem = &sResp.Results[0]
	}

	if matchedItem == nil {
		return nil, nil
	}

	// Fetch title details
	detailsURL := fmt.Sprintf("%s/secure/titles/%d", BaseURL, matchedItem.ID)
	dBody, err := utils.DefaultClient.Get(ctx, detailsURL, headers)
	if err != nil {
		return nil, err
	}

	var dResp titleDetailResponse
	if err := json.Unmarshal(dBody, &dResp); err != nil || len(dResp.Title.Videos) == 0 {
		return nil, nil
	}

	var streams []models.Stream
	streamHeaders := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	}

	for _, v := range dResp.Title.Videos {
		if v.URL == "" || v.Category == "trailer" || v.Category == "opening credits" || v.Category == "ending credits" {
			continue
		}

		if media.Type == models.MediaTypeTV {
			if v.SeasonNum > 0 && v.SeasonNum != media.Season {
				continue
			}
			if v.EpisodeNum > 0 && v.EpisodeNum != media.Episode {
				continue
			}
		}

		fansub := v.Extra
		if fansub == "" {
			fansub = v.Name
		}
		if fansub == "" {
			fansub = "AnimeciX"
		}

		quality := v.Quality
		if quality == "" || quality == "regular" {
			quality = "HD"
		}

		streamTitle := fmt.Sprintf("⌜ AnimeciX ⌟ | %s [%s]", fansub, strings.ToUpper(quality))
		if v.Language != "" {
			streamTitle += fmt.Sprintf(" (%s)", strings.ToUpper(v.Language))
		}

		streams = append(streams, models.Stream{
			Name:     matchedItem.Name,
			Title:    streamTitle,
			URL:      v.URL,
			Quality:  quality,
			Provider: ID,
			Headers:  streamHeaders,
		})
	}

	return streams, nil
}
