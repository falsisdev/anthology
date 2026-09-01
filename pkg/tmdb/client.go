package tmdb

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/falsisdev/nuviotr/pkg/models"
)

const (
	DefaultTMDBKey = "500330721680edb6d5f7f12ba7cd9023"
	BaseURL        = "https://api.themoviedb.org/3"
)

// Client handles communication with TMDB API.
type Client struct {
	apiKey     string
	httpClient *http.Client
	cache      map[string]*models.MediaInfo
	mu         sync.RWMutex
}

// NewClient creates a new TMDB client.
func NewClient(apiKey string) *Client {
	if apiKey == "" {
		apiKey = DefaultTMDBKey
	}
	return &Client{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 8 * time.Second,
		},
		cache: make(map[string]*models.MediaInfo),
	}
}

type tmdbResponse struct {
	ID            int    `json:"id"`
	Title         string `json:"title"`
	Name          string `json:"name"`
	OriginalTitle string `json:"original_title"`
	OriginalName  string `json:"original_name"`
	ReleaseDate   string `json:"release_date"`
	FirstAirDate  string `json:"first_air_date"`
	ExternalIDs   struct {
		IMDbID string `json:"imdb_id"`
	} `json:"external_ids"`
}

type tmdbFindResponse struct {
	MovieResults []struct {
		ID            int    `json:"id"`
		Title         string `json:"title"`
		OriginalTitle string `json:"original_title"`
		ReleaseDate   string `json:"release_date"`
	} `json:"movie_results"`
	TVResults []struct {
		ID           int    `json:"id"`
		Name         string `json:"name"`
		OriginalName string `json:"original_name"`
		FirstAirDate string `json:"first_air_date"`
	} `json:"tv_results"`
}

// GetMediaInfo fetches complete media information for a given TMDB ID or IMDb ID.
func (c *Client) GetMediaInfo(ctx context.Context, idStr string, mediaType models.MediaType, season, episode int) (*models.MediaInfo, error) {
	idStr = strings.TrimPrefix(idStr, "tmdb:")
	idStr = strings.TrimPrefix(idStr, "kitsu:")
	idStr = strings.TrimPrefix(idStr, "animecix:")

	cacheKey := fmt.Sprintf("%s:%s:%d:%d", idStr, mediaType, season, episode)

	c.mu.RLock()
	if cached, ok := c.cache[cacheKey]; ok {
		c.mu.RUnlock()
		return cached, nil
	}
	c.mu.RUnlock()

	// Handle IMDb ID (e.g. tt0137523 or tt0903747)
	if strings.HasPrefix(idStr, "tt") {
		findURL := fmt.Sprintf("%s/find/%s?api_key=%s&external_source=imdb_id&language=tr-TR",
			BaseURL, url.PathEscape(idStr), c.apiKey)

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, findURL, nil)
		if err == nil {
			resp, err := c.httpClient.Do(req)
			if err == nil && resp.StatusCode == http.StatusOK {
				defer resp.Body.Close()
				var fData tmdbFindResponse
				if err := json.NewDecoder(resp.Body).Decode(&fData); err == nil {
					if mediaType == models.MediaTypeTV && len(fData.TVResults) > 0 {
						r := fData.TVResults[0]
						year := ""
						if len(r.FirstAirDate) >= 4 {
							year = r.FirstAirDate[:4]
						}
						info := &models.MediaInfo{
							TMDBID:        strconv.Itoa(r.ID),
							IMDbID:        idStr,
							Title:         r.Name,
							OriginalTitle: r.OriginalName,
							Year:          year,
							Season:        season,
							Episode:       episode,
							Type:          models.MediaTypeTV,
						}
						c.mu.Lock()
						c.cache[cacheKey] = info
						c.mu.Unlock()
						return info, nil
					} else if len(fData.MovieResults) > 0 {
						r := fData.MovieResults[0]
						year := ""
						if len(r.ReleaseDate) >= 4 {
							year = r.ReleaseDate[:4]
						}
						info := &models.MediaInfo{
							TMDBID:        strconv.Itoa(r.ID),
							IMDbID:        idStr,
							Title:         r.Title,
							OriginalTitle: r.OriginalTitle,
							Year:          year,
							Season:        season,
							Episode:       episode,
							Type:          models.MediaTypeMovie,
						}
						c.mu.Lock()
						c.cache[cacheKey] = info
						c.mu.Unlock()
						return info, nil
					}
				}
			}
		}
	}

	typePath := "movie"
	if mediaType == models.MediaTypeTV {
		typePath = "tv"
	}

	reqURL := fmt.Sprintf("%s/%s/%s?api_key=%s&language=tr-TR&append_to_response=external_ids",
		BaseURL, typePath, url.PathEscape(idStr), c.apiKey)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("tmdb new request failed: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("tmdb request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("tmdb returned HTTP %d", resp.StatusCode)
	}

	var data tmdbResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, fmt.Errorf("failed to decode tmdb response: %w", err)
	}

	title := data.Title
	if title == "" {
		title = data.Name
	}

	origTitle := data.OriginalTitle
	if origTitle == "" {
		origTitle = data.OriginalName
	}

	dateStr := data.ReleaseDate
	if dateStr == "" {
		dateStr = data.FirstAirDate
	}
	year := ""
	if len(dateStr) >= 4 {
		year = dateStr[:4]
	}

	info := &models.MediaInfo{
		TMDBID:        idStr,
		IMDbID:        data.ExternalIDs.IMDbID,
		Title:         title,
		OriginalTitle: origTitle,
		Year:          year,
		Season:        season,
		Episode:       episode,
		Type:          mediaType,
	}

	c.mu.Lock()
	c.cache[cacheKey] = info
	c.mu.Unlock()

	return info, nil
}
