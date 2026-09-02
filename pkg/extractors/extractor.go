package extractors

import (
	"context"
	"strings"

	"github.com/falsisdev/nuviotr/pkg/models"
)

// Extract attempts to extract direct playable video streams (.m3u8 or .mp4) from known embed players.
func Extract(ctx context.Context, embedURL, referer string) ([]models.Stream, error) {
	embedURL = strings.TrimSpace(embedURL)
	if embedURL == "" {
		return nil, nil
	}

	lowerURL := strings.ToLower(embedURL)

	// 1. Videoplay.vip
	if strings.Contains(lowerURL, "videoplay.vip") {
		return ExtractVideoplay(ctx, embedURL, referer)
	}

	// 2. OK.ru / Odnoklassniki
	if strings.Contains(lowerURL, "ok.ru/videoembed/") || strings.Contains(lowerURL, "odnoklassniki.ru/videoembed/") || strings.Contains(lowerURL, "ok.ru/video/") {
		return ExtractOkru(ctx, embedURL, referer)
	}

	// 3. Vidmoly
	if strings.Contains(lowerURL, "vidmoly.") {
		return ExtractVidmoly(ctx, embedURL, referer)
	}

	// 4. Sibnet
	if strings.Contains(lowerURL, "sibnet.ru") {
		return ExtractSibnet(ctx, embedURL, referer)
	}

	// 5. Generic JWPlayer / Player pages (ddizi, dizibox, etc.)
	if strings.Contains(lowerURL, "/player/") || strings.Contains(lowerURL, "streambox.") || strings.Contains(lowerURL, "jwplayer") || strings.Contains(lowerURL, "king.php") {
		return ExtractJWPlayer(ctx, embedURL, referer)
	}

	return nil, nil
}
