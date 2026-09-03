package animecix

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/provider"
	"github.com/falsisdev/anthology/pkg/utils"
)

const (
	ID      = "animecix"
	Name    = "AnimeciX"
	BaseURL = "https://animecix.tv"
	XEHKey  = "7Y2ozlO+QysR5w9Q6Tupmtvl9jJp7ThFH8SB+Lo7NvZjgjqRSqOgcT2v4ISM9sP10LmnlYI8WQ==.xrlyOBFS5BHjQ2Lk"
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
	ID         int         `json:"id"`
	Name       string      `json:"name"`
	Extra      string      `json:"extra"`
	URL        string      `json:"url"`
	Type       string      `json:"type"`
	Quality    string      `json:"quality"`
	SeasonNum  interface{} `json:"season_num"`
	EpisodeNum interface{} `json:"episode_num"`
	Language   string      `json:"language"`
	Category   string      `json:"category"`
}

type relatedVideosResponse struct {
	Videos []videoItem `json:"videos"`
}

type titleDetailResponse struct {
	Title struct {
		ID        int         `json:"id"`
		Name      string      `json:"name"`
		TitleType string      `json:"title_type"`
		Videos    []videoItem `json:"videos"`
	} `json:"title"`
}

type tauVideoResponse struct {
	ID   string `json:"_id"`
	URLs []struct {
		Label string `json:"label"`
		URL   string `json:"url"`
		Size  int64  `json:"size"`
	} `json:"urls"`
}

var (
	reTauEmbed = regexp.MustCompile(`tau-video\.xyz/embed/([a-zA-Z0-9_-]+)`)
)

func parseNum(val interface{}) int {
	if val == nil {
		return 0
	}
	switch v := val.(type) {
	case float64:
		return int(v)
	case int:
		return v
	case string:
		n, _ := strconv.Atoi(v)
		return n
	default:
		return 0
	}
}

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	searchQuery := media.Title
	if searchQuery == "" {
		searchQuery = media.OriginalTitle
	}

	searchURL := fmt.Sprintf("%s/secure/search/%s?limit=20", BaseURL, url.PathEscape(searchQuery))
	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	}

	body, err := utils.DefaultClient.Get(ctx, searchURL, headers)
	if err != nil {
		if media.OriginalTitle != "" && media.OriginalTitle != searchQuery {
			searchURL = fmt.Sprintf("%s/secure/search/%s?limit=20", BaseURL, url.PathEscape(media.OriginalTitle))
			body, err = utils.DefaultClient.Get(ctx, searchURL, headers)
		}
		if err != nil {
			return nil, err
		}
	}

	var sResp searchResponse
	if err := json.Unmarshal(body, &sResp); err != nil || len(sResp.Results) == 0 {
		return nil, nil
	}

	var matchedItem *searchItem
	titleNorm := utils.NormalizeTurkish(media.Title)
	origNorm := utils.NormalizeTurkish(media.OriginalTitle)

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

		nameNorm := utils.NormalizeTurkish(item.Name)
		engNorm := utils.NormalizeTurkish(item.NameEnglish)
		romNorm := utils.NormalizeTurkish(item.NameRomanji)

		if (titleNorm != "" && (nameNorm == titleNorm || engNorm == titleNorm || romNorm == titleNorm)) ||
			(origNorm != "" && (nameNorm == origNorm || engNorm == origNorm || romNorm == origNorm)) {
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

	apiHeaders := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
		"x-e-h":      XEHKey,
	}

	var candidateVideos []videoItem

	season := media.Season
	if season <= 0 {
		season = 1
	}
	episode := media.Episode
	if episode <= 0 {
		episode = 1
	}

	if media.Type == models.MediaTypeTV {
		relURL := fmt.Sprintf("%s/secure/related-videos?episode=%d&season=%d&videoId=0&titleId=%d", BaseURL, episode, season, matchedItem.ID)
		if rBody, err := utils.DefaultClient.Get(ctx, relURL, apiHeaders); err == nil {
			var rResp relatedVideosResponse
			if err := json.Unmarshal(rBody, &rResp); err == nil && len(rResp.Videos) > 0 {
				candidateVideos = append(candidateVideos, rResp.Videos...)
			}
		}
	}

	// Also fetch title details as fallback or for movies
	if len(candidateVideos) == 0 {
		detailsURL := fmt.Sprintf("%s/secure/titles/%d?titleId=%d", BaseURL, matchedItem.ID, matchedItem.ID)
		if dBody, err := utils.DefaultClient.Get(ctx, detailsURL, apiHeaders); err == nil {
			var dResp titleDetailResponse
			if err := json.Unmarshal(dBody, &dResp); err == nil {
				candidateVideos = append(candidateVideos, dResp.Title.Videos...)
			}
		}
	}

	var streams []models.Stream

	for _, v := range candidateVideos {
		if v.URL == "" || v.Category == "trailer" || v.Category == "opening credits" || v.Category == "ending credits" {
			continue
		}

		if media.Type == models.MediaTypeTV {
			sNum := parseNum(v.SeasonNum)
			eNum := parseNum(v.EpisodeNum)
			if sNum > 0 && sNum != season {
				continue
			}
			if eNum > 0 && eNum != episode {
				continue
			}
		}

		fullURL := v.URL
		if !strings.HasPrefix(fullURL, "http") {
			fullURL = fmt.Sprintf("%s/%s", BaseURL, strings.TrimPrefix(v.URL, "/"))
		}

		// Follow redirect to resolve tau-video embed URL
		req, err := http.NewRequestWithContext(ctx, "GET", fullURL, nil)
		if err != nil {
			continue
		}
		for k, val := range apiHeaders {
			req.Header.Set(k, val)
		}

		client := &http.Client{
			Timeout: 10 * time.Second,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				return nil
			},
		}

		resp, err := client.Do(req)
		if err != nil {
			continue
		}
		finalURL := resp.Request.URL.String()
		resp.Body.Close()

		// If finalURL is a tau-video embed
		if tauMatches := reTauEmbed.FindStringSubmatch(finalURL); len(tauMatches) > 1 {
			videoKey := tauMatches[1]
			tauAPIURL := fmt.Sprintf("https://tau-video.xyz/api/video/%s", videoKey)
			tauHeaders := map[string]string{
				"User-Agent": utils.DefaultUserAgent,
				"Referer":    BaseURL + "/",
			}

			if tBody, err := utils.DefaultClient.Get(ctx, tauAPIURL, tauHeaders); err == nil {
				var tResp tauVideoResponse
				if err := json.Unmarshal(tBody, &tResp); err == nil && len(tResp.URLs) > 0 {
					for _, u := range tResp.URLs {
						if u.URL == "" {
							continue
						}
						quality := u.Label
						if quality == "" {
							quality = "HD"
						}
						streamTitle := fmt.Sprintf("⌜ AnimeciX ⌟ | TauVideo [%s]", strings.ToUpper(quality))
						if v.Extra != "" {
							streamTitle = fmt.Sprintf("⌜ AnimeciX ⌟ | %s [%s]", v.Extra, strings.ToUpper(quality))
						}

						streams = append(streams, models.Stream{
							Name:     matchedItem.Name,
							Title:    streamTitle,
							URL:      u.URL,
							Quality:  quality,
							Provider: ID,
							Headers: map[string]string{
								"Referer":    BaseURL + "/",
								"User-Agent": utils.DefaultUserAgent,
							},
						})
					}
				}
			}
		}
	}

	return streams, nil
}
