package catalog

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/providers/sinewix"
)

func sinewixRequest(ctx context.Context, endpoint string) ([]byte, error) {
	reqURL := fmt.Sprintf("%s%s", sinewix.APIBase, endpoint)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("hash256", sinewix.Hash256)
	req.Header.Set("signature", sinewix.Signature)
	req.Header.Set("User-Agent", "EasyPlex (Android 14; SM-A546B; Samsung Galaxy A54 5G; tr)")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	return io.ReadAll(resp.Body)
}

func searchSineWix(ctx context.Context, mediaType, query string) ([]MetaItem, error) {
	endpoint := fmt.Sprintf("/search/%s/%s", url.PathEscape(query), sinewix.APIKey)
	data, err := sinewixRequest(ctx, endpoint)
	if err != nil {
		return nil, err
	}

	var res struct {
		Search []struct {
			ID          int    `json:"id"`
			Name        string `json:"name"`
			Title       string `json:"title"`
			Type        string `json:"type"`
			PosterPath  string `json:"poster_path"`
			Backdrop    string `json:"backdrop_path"`
			Overview    string `json:"overview"`
			ReleaseDate string `json:"release_date"`
		} `json:"search"`
	}

	if err := json.Unmarshal(data, &res); err != nil {
		return nil, err
	}

	var results []MetaItem
	for _, it := range res.Search {
		name := it.Name
		if name == "" {
			name = it.Title
		}

		isMovie := it.Type == "movie"
		if mediaType == "series" && isMovie {
			continue
		}
		if mediaType == "movie" && !isMovie {
			continue
		}

		mType := "series"
		idPrefix := "sinewix:show:"
		if isMovie {
			mType = "movie"
			idPrefix = "sinewix:movie:"
		}

		poster := it.PosterPath
		if poster != "" && !strings.HasPrefix(poster, "http") {
			poster = "https://image.tmdb.org/t/p/w500" + poster
		}

		results = append(results, MetaItem{
			ID:          idPrefix + strconv.Itoa(it.ID),
			Type:        mType,
			Name:        name,
			Poster:      poster,
			Background:  poster,
			Description: it.Overview,
			Genres:      []string{"SineWix", strings.Title(mType)},
		})
	}

	return results, nil
}

func getSineWixMeta(ctx context.Context, rawID string) (*MetaDetail, error) {
	isMovie := strings.HasPrefix(rawID, "sinewix:movie:")
	idStr := strings.TrimPrefix(rawID, "sinewix:movie:")
	idStr = strings.TrimPrefix(idStr, "sinewix:show:")

	id, err := strconv.Atoi(idStr)
	if err != nil {
		return nil, err
	}

	pathType := "series/show"
	if isMovie {
		pathType = "media/detail"
	}

	endpoint := fmt.Sprintf("/%s/%d/%s", pathType, id, sinewix.APIKey)
	data, err := sinewixRequest(ctx, endpoint)
	if err != nil {
		return nil, err
	}

	var item struct {
		ID         int    `json:"id"`
		Name       string `json:"name"`
		Title      string `json:"title"`
		PosterPath string `json:"poster_path"`
		Overview   string `json:"overview"`
		Seasons    []struct {
			SeasonNumber interface{} `json:"season_number"`
			Episodes     []struct {
				ID            int         `json:"id"`
				Name          string      `json:"name"`
				EpisodeNumber interface{} `json:"episode_number"`
			} `json:"episodes"`
		} `json:"seasons"`
	}

	if err := json.Unmarshal(data, &item); err != nil {
		return nil, err
	}

	name := item.Name
	if name == "" {
		name = item.Title
	}

	poster := item.PosterPath
	if poster != "" && !strings.HasPrefix(poster, "http") {
		poster = "https://image.tmdb.org/t/p/w500" + poster
	}

	var videos []VideoItem
	if !isMovie {
		for _, s := range item.Seasons {
			sNum := 1
			switch v := s.SeasonNumber.(type) {
			case float64:
				sNum = int(v)
			case string:
				sNum, _ = strconv.Atoi(v)
			}

			for _, ep := range s.Episodes {
				eNum := 1
				switch v := ep.EpisodeNumber.(type) {
				case float64:
					eNum = int(v)
				case string:
					eNum, _ = strconv.Atoi(v)
				}

				title := ep.Name
				if title == "" {
					title = fmt.Sprintf("%d. Bölüm", eNum)
				}

				videos = append(videos, VideoItem{
					ID:      fmt.Sprintf("sinewix:ep:%d:%d:%d", item.ID, sNum, eNum),
					Title:   title,
					Season:  sNum,
					Episode: eNum,
				})
			}
		}
	}

	mType := "series"
	if isMovie {
		mType = "movie"
	}

	return &MetaDetail{
		ID:          rawID,
		Type:        mType,
		Name:        name,
		Poster:      poster,
		Background:  poster,
		Description: item.Overview,
		Genres:      []string{"SineWix"},
		Videos:      videos,
	}, nil
}

func getSineWixStream(ctx context.Context, rawID string) ([]models.Stream, error) {
	// Either sinewix:movie:{id} or sinewix:ep:{showID}:{season}:{episode}
	if strings.HasPrefix(rawID, "sinewix:movie:") {
		idStr := strings.TrimPrefix(rawID, "sinewix:movie:")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			return nil, err
		}

		endpoint := fmt.Sprintf("/media/detail/%d/%s", id, sinewix.APIKey)
		data, err := sinewixRequest(ctx, endpoint)
		if err != nil {
			return nil, err
		}

		var item struct {
			Title  string `json:"title"`
			Videos []struct {
				Server string `json:"server"`
				Link   string `json:"link"`
			} `json:"videos"`
		}
		if err := json.Unmarshal(data, &item); err != nil {
			return nil, err
		}

		var streams []models.Stream
		for _, v := range item.Videos {
			if v.Link != "" {
				streams = append(streams, models.Stream{
					Title:    fmt.Sprintf("⌜ SineWix ⌟ | %s (1080p)", v.Server),
					Quality:  "1080p",
					Provider: "sinewix",
					URL:      v.Link,
				})
			}
		}
		return streams, nil
	}

	// Episode: sinewix:ep:{showID}:{season}:{episode}
	clean := strings.TrimPrefix(rawID, "sinewix:ep:")
	parts := strings.Split(clean, ":")
	if len(parts) < 3 {
		return nil, fmt.Errorf("invalid episode id")
	}

	showID, _ := strconv.Atoi(parts[0])
	targetSeason, _ := strconv.Atoi(parts[1])
	targetEpisode, _ := strconv.Atoi(parts[2])

	endpoint := fmt.Sprintf("/series/show/%d/%s", showID, sinewix.APIKey)
	data, err := sinewixRequest(ctx, endpoint)
	if err != nil {
		return nil, err
	}

	var item struct {
		Name    string `json:"name"`
		Seasons []struct {
			SeasonNumber interface{} `json:"season_number"`
			Episodes     []struct {
				EpisodeNumber interface{} `json:"episode_number"`
				Videos        []struct {
					Server string `json:"server"`
					Link   string `json:"link"`
				} `json:"videos"`
			} `json:"episodes"`
		} `json:"seasons"`
	}

	if err := json.Unmarshal(data, &item); err != nil {
		return nil, err
	}

	var streams []models.Stream
	for _, s := range item.Seasons {
		sNum := 1
		switch v := s.SeasonNumber.(type) {
		case float64:
			sNum = int(v)
		case string:
			sNum, _ = strconv.Atoi(v)
		}

		if sNum != targetSeason {
			continue
		}

		for _, ep := range s.Episodes {
			eNum := 1
			switch v := ep.EpisodeNumber.(type) {
			case float64:
				eNum = int(v)
			case string:
				eNum, _ = strconv.Atoi(v)
			}

			if eNum != targetEpisode {
				continue
			}

			for _, v := range ep.Videos {
				if v.Link != "" {
					streams = append(streams, models.Stream{
						Title:    fmt.Sprintf("⌜ SineWix ⌟ | %s (1080p)", v.Server),
						Quality:  "1080p",
						Provider: "sinewix",
						URL:      v.Link,
					})
				}
			}
		}
	}

	return streams, nil
}

func defaultSineWixSeries(ctx context.Context) ([]MetaItem, error) {
	endpoint := fmt.Sprintf("/series/popular/%s", sinewix.APIKey)
	data, err := sinewixRequest(ctx, endpoint)
	if err != nil {
		return nil, err
	}

	var res struct {
		PopularSeries []struct {
			ID          int     `json:"id"`
			Name        string  `json:"name"`
			PosterPath  string  `json:"poster_path"`
			Backdrop    string  `json:"backdrop_path"`
			Overview    string  `json:"overview"`
			VoteAverage float64 `json:"vote_average"`
		} `json:"popularSeries"`
	}
	if err := json.Unmarshal(data, &res); err != nil {
		return nil, err
	}

	var items []MetaItem
	for _, s := range res.PopularSeries {
		poster := strings.Replace(s.PosterPath, "http://", "https://", 1)
		backdrop := strings.Replace(s.Backdrop, "http://", "https://", 1)
		items = append(items, MetaItem{
			ID:          "sinewix:series:" + strconv.Itoa(s.ID),
			Type:        "series",
			Name:        s.Name,
			Poster:      poster,
			Background:  backdrop,
			Description: s.Overview,
			Genres:      []string{"SineWix", "Popüler Dizi"},
		})
	}
	return items, nil
}

func defaultSineWixMovies(ctx context.Context) ([]MetaItem, error) {
	endpoint := fmt.Sprintf("/search/film/%s", sinewix.APIKey)
	data, err := sinewixRequest(ctx, endpoint)
	if err != nil {
		return nil, err
	}

	var res struct {
		Search []struct {
			ID         int    `json:"id"`
			Name       string `json:"name"`
			Title      string `json:"title"`
			Type       string `json:"type"`
			PosterPath string `json:"poster_path"`
			Backdrop   string `json:"backdrop_path"`
			Overview   string `json:"overview"`
		} `json:"search"`
	}
	if err := json.Unmarshal(data, &res); err != nil {
		return nil, err
	}

	var items []MetaItem
	for _, m := range res.Search {
		if m.Type != "movie" && m.Title == "" {
			continue
		}
		title := m.Title
		if title == "" {
			title = m.Name
		}
		poster := strings.Replace(m.PosterPath, "http://", "https://", 1)
		backdrop := strings.Replace(m.Backdrop, "http://", "https://", 1)
		items = append(items, MetaItem{
			ID:          "sinewix:movie:" + strconv.Itoa(m.ID),
			Type:        "movie",
			Name:        title,
			Poster:      poster,
			Background:  backdrop,
			Description: m.Overview,
			Genres:      []string{"SineWix", "Film"},
		})
	}
	return items, nil
}

