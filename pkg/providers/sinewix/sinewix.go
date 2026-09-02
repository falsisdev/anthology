package sinewix

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/provider"
	"github.com/falsisdev/anthology/pkg/utils"
)

const (
	ID        = "sinewix"
	Name      = "SineWix"
	APIBase   = "https://ydfvfdizipanel.ru/public/api"
	APIKey    = "9iQNC5HQwPlaFuJDkhncJ5XTJ8feGXOJatAA"
	Hash256   = "711bff4afeb47f07ab08a0b07e85d3835e739295e8a6361db77eebd93d96306b"
	Signature = "3082058830820370a00302010202145bbfbba9791db758ad12295636e094ab4b07dc24300d06092a864886f70d01010b05003074310b3009060355040613025553311330110603550408130a43616c69666f726e6961311630140603550407130d4d6f756e7461696e205669657731143012060355040a130b476f6f676c6520496e632e3110300e060355040b1307416e64726f69643110300e06035504031307416e64726f69643020170d3231313231353232303433335a180f32303531313231353232303433335a3074310b3009060355040613025553311330110603550408130a43616c69666f726e6961311630140603550407130d4d6f756e7461696e205669657731143012060355040a130b476f6f676c6520496e632e3110300e060355040b1307416e64726f69643110300e06035504031307416e64726f696430820222300d06092a864886f70d01010105000382020f003082020a0282020100a5106a24bb3f9c0aaf3a2b228f794b5eaf1757ba758b19736a39d1bdc73fc983a7237b8d5ca5156cfa999c1dab3418bbc2be0920e0ee001c8aa4812d1dae75d080f09e91e0abda83ff9a76e8384a4429f4849248069a59505b12ac2c14ba2e4d1a13afcdaf54e508697ff928a9f738e6f4a6fc27409c55329eb149b5ff89c5a2d7c06bf9e62086f955cad17d7be2623ee9d5ec56068eadc23cb0965a13ff97d49fe10ef41afc6eeca36b4ace9582097faff89f590bc831cdb3a69eec5d15b67c3f2cad49e37ed053733e3d2d400c47755b932bdbe15d749fd6ad1dce30ba5e66094dfb6ee6f64cafb807e11b19a990c5d078c6d6701cda0bdeb21e99404ff166074f4c89b04c418f4e7940db5c78647c475bcfb85d4c4e836ee7d7c1d53e9e736b5d96d4b4d8b98209064b729ac6a682d55a6a930e518d849898bb28329ca0aaa133b5e5270a9d5940cac6af4802a57fd971efda91abb602882dd6aa6ce2b236b57b52ee2481498f0cacbcc2c36c238bc84becad7eaaf1125b9a1ca9ded6c79f3f283a52050377809b2a9995d66e1636b0ed426fdd8685c47cb18e82077f4aefcc07887e1dc58b4d64be1632f0e7b4625da6f40c65a8512a6454a4b96963e7f876136e6c0069a519a79ad632078ed965aa12482458060c030ed50db706d854f88cb004630b49285d8af8b471ff8f6070687826412287b50049bcb7d1b6b62ef90203010001a310300e300c0603551d13040530030101ff300d06092a864886f70d01010b0500038202010051c0b7bd793181dc29ca777d3773f928a366c8469ecf2fa3cfb076e8831970d19bb2b96e44e8ccc647cf0696bb824ac61c23d958525d283cab26037b04d58aa79bf92192db843adf5c26a980f081d2f0e14f759fc5ff4c5bb3dce0860299bfe7b349a8155a2efaf731ba25ce796a80c1442c7bf80f8c1a7912ff0b6f6592264315337251a846460194fa594f81f38f9e5233a63201e931ad9cab5bf119f24025613f307194eaa6eb39a83f3c05a49ba34455b1aff7c6839bbb657d9392ffdf397432af6e56ba9534a8b07d7060fe09691c6cf07cb5324f67b3cc0871a8c621d81fe71d71085c55206a4f57e25f774fd4b979b299e8bb076b50fca42fa57da2d519fd35a4a7c0137babaed4345f8031b63b6a71f5e8268f709d658ccd7c2a58849379d25bfa598c3f4a2c3d9b7d89285fefeb7f0ec65137d38b08ce432a15688b624a179e6a4a505ebc3bcdfbc4d4330508ee2d8d0f016924dcec21a6838ef7d834c6f43bde4a5201ed0b3bb4e9bd377b470e36bcf5bc3d56169dbd8e39567aa7dce4d1a8a8a54a5e1aa6fb1a8aab0062669a966f96e15ccce6fe12ea5e6a8b8c8823bdc94988ca39759fd1cc8fd8ae5c3d74db50b174cf7d77655016c075c91d439ed01cc0a9f695c99fad3b5495fb6cb1e01a5fa020cc6022a85c07ec55f9eba89719f86e49d34ab5bd208c5f70cced2b7b7963c014f8404432979b506de29e"
)

func init() {
	provider.Register(New())
}

type Provider struct {
	client *http.Client
}

func New() *Provider {
	return &Provider{
		client: &http.Client{Timeout: 10 * time.Second},
	}
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

type apiVideo struct {
	Server string `json:"server"`
	Link   string `json:"link"`
}

type searchItem struct {
	ID int `json:"id"`
}

type searchResponse struct {
	Search []searchItem `json:"search"`
}

type episodeItem struct {
	EpisodeNumber interface{} `json:"episode_number"`
	Videos        []apiVideo  `json:"videos"`
}

type seasonItem struct {
	SeasonNumber interface{}   `json:"season_number"`
	Episodes     []episodeItem `json:"episodes"`
}

type detailItem struct {
	ID             int          `json:"id"`
	Name           string       `json:"name"`
	Title          string       `json:"title"`
	IMDb           string       `json:"imdb_external_id"`
	ReleaseDate    string       `json:"release_date"`
	FirstAirDate   string       `json:"first_air_date"`
	Videos         []apiVideo   `json:"videos"`
	Seasons        []seasonItem `json:"seasons"`
}

func (p *Provider) requestAPI(ctx context.Context, endpoint string) ([]byte, error) {
	reqURL := fmt.Sprintf("%s%s", APIBase, endpoint)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("hash256", Hash256)
	req.Header.Set("signature", Signature)
	req.Header.Set("User-Agent", "EasyPlex (Android 14; SM-A546B; Samsung Galaxy A54 5G; tr)")
	req.Header.Set("Accept", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	return io.ReadAll(resp.Body)
}

func resolveMediaFire(ctx context.Context, link string) string {
	if !strings.Contains(link, "mediafire.com") {
		return link
	}
	body, err := utils.DefaultClient.Get(ctx, link, nil)
	if err != nil {
		return link
	}
	re := regexp.MustCompile(`href="(https://download\d+\.mediafire\.com[^"]+)"`)
	matches := re.FindSubmatch(body)
	if len(matches) > 1 {
		return string(matches[1])
	}
	return link
}

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	searchQuery := media.OriginalTitle
	if searchQuery == "" {
		searchQuery = media.Title
	}

	searchEndpoint := fmt.Sprintf("/search/%s/%s", url.PathEscape(searchQuery), APIKey)
	data, err := p.requestAPI(ctx, searchEndpoint)
	if err != nil {
		return nil, err
	}

	var resp searchResponse
	if err := json.Unmarshal(data, &resp); err != nil || len(resp.Search) == 0 {
		// Fallback to title query if original title had no search hits
		if media.Title != "" && media.Title != searchQuery {
			fallbackEndpoint := fmt.Sprintf("/search/%s/%s", url.PathEscape(media.Title), APIKey)
			fallbackData, fErr := p.requestAPI(ctx, fallbackEndpoint)
			if fErr == nil {
				_ = json.Unmarshal(fallbackData, &resp)
			}
		}
	}

	if len(resp.Search) == 0 {
		return nil, nil
	}

	pathType := "media/detail"
	if media.Type == models.MediaTypeTV {
		pathType = "series/show"
	}

	var detailedItems []*detailItem
	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, sItem := range resp.Search {
		wg.Add(1)
		go func(itemId int) {
			defer wg.Done()
			detailEndpoint := fmt.Sprintf("/%s/%d/%s", pathType, itemId, APIKey)
			dData, dErr := p.requestAPI(ctx, detailEndpoint)
			if dErr != nil {
				return
			}
			var item detailItem
			if err := json.Unmarshal(dData, &item); err == nil {
				mu.Lock()
				detailedItems = append(detailedItems, &item)
				mu.Unlock()
			}
		}(sItem.ID)
	}

	wg.Wait()

	if len(detailedItems) == 0 {
		return nil, nil
	}

	origNorm := strings.ToLower(strings.TrimSpace(media.OriginalTitle))
	titleNorm := strings.ToLower(strings.TrimSpace(media.Title))

	var bestMatch *detailItem
	for _, item := range detailedItems {
		if item.IMDb != "" && media.IMDbID != "" && item.IMDb == media.IMDbID {
			bestMatch = item
			break
		}

		itemName := strings.ToLower(strings.TrimSpace(item.Name))
		if itemName == "" {
			itemName = strings.ToLower(strings.TrimSpace(item.Title))
		}

		itemDate := item.ReleaseDate
		if itemDate == "" {
			itemDate = item.FirstAirDate
		}
		itemYear := ""
		if len(itemDate) >= 4 {
			itemYear = itemDate[:4]
		}

		nameMatches := (itemName == origNorm || itemName == titleNorm ||
			utils.NormalizeTurkish(itemName) == utils.NormalizeTurkish(origNorm) ||
			utils.NormalizeTurkish(itemName) == utils.NormalizeTurkish(titleNorm))

		if nameMatches && (media.Year == "" || itemYear == "" || itemYear == media.Year) {
			bestMatch = item
			break
		}
	}

	if bestMatch == nil && len(detailedItems) > 0 {
		bestMatch = detailedItems[0]
	}

	if bestMatch == nil {
		return nil, nil
	}

	streamHeaders := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    "https://ydfvfdizipanel.ru/",
		"Origin":     "https://ydfvfdizipanel.ru",
	}

	var videoList []apiVideo

	if media.Type == models.MediaTypeMovie {
		videoList = bestMatch.Videos
	} else if media.Type == models.MediaTypeTV {
		for _, s := range bestMatch.Seasons {
			sNum := parseNumber(s.SeasonNumber)
			if sNum == media.Season {
				for _, ep := range s.Episodes {
					eNum := parseNumber(ep.EpisodeNumber)
					if eNum == media.Episode {
						videoList = ep.Videos
						break
					}
				}
				break
			}
		}
	}

	var streams []models.Stream
	displayName := bestMatch.Name
	if displayName == "" {
		displayName = media.Title
	}

	for _, v := range videoList {
		finalURL := resolveMediaFire(ctx, v.Link)
		serverName := v.Server
		if serverName == "" {
			serverName = "Sunucu"
		}
		if strings.Contains(v.Link, "mediafire.com") {
			serverName = "MediaFire"
		}

		streams = append(streams, models.Stream{
			Name:     displayName,
			Title:    fmt.Sprintf("⌜ SİNEWİX ⌟ | %s", strings.ToUpper(serverName)),
			URL:      finalURL,
			Quality:  "Auto",
			Provider: ID,
			Headers:  streamHeaders,
		})
	}

	return streams, nil
}

func parseNumber(val interface{}) int {
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
