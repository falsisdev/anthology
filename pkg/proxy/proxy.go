package proxy

import (
	"bufio"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"

	"github.com/falsisdev/anthology/pkg/utils"
)

var reURIAttr = regexp.MustCompile(`URI="([^"]+)"`)

// FormatProxyURL constructs the proxied stream URL for Stremio / Nuvio clients
func FormatProxyURL(proxyBase, rawURL string, headers map[string]string) string {
	if rawURL == "" {
		return ""
	}
	
	// If it's already an open direct stream without header requirements (like SineWix direct MKV/MP4 or M3U)
	// and doesn't need Referer spoofing, we still check if proxyBase is set.
	referer := ""
	origin := ""
	if headers != nil {
		referer = headers["Referer"]
		if referer == "" {
			referer = headers["referer"]
		}
		origin = headers["Origin"]
		if origin == "" {
			origin = headers["origin"]
		}
	}

	u := fmt.Sprintf("%s?url=%s", proxyBase, url.QueryEscape(rawURL))
	if referer != "" {
		u += fmt.Sprintf("&referer=%s", url.QueryEscape(referer))
	}
	if origin != "" {
		u += fmt.Sprintf("&origin=%s", url.QueryEscape(origin))
	}
	return u
}

// HandleProxy handles all incoming stream and HLS playlist requests
func HandleProxy(w http.ResponseWriter, r *http.Request) {
	// CORS Headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
	w.Header().Set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	targetURL := r.URL.Query().Get("url")
	if targetURL == "" {
		http.Error(w, "missing url param", http.StatusBadRequest)
		return
	}

	referer := r.URL.Query().Get("referer")
	origin := r.URL.Query().Get("origin")

	parsedTarget, err := url.Parse(targetURL)
	if err != nil {
		http.Error(w, "invalid target url", http.StatusBadRequest)
		return
	}

	// Auto-infer referer/origin if not explicitly provided
	if referer == "" {
		referer = fmt.Sprintf("%s://%s/", parsedTarget.Scheme, parsedTarget.Host)
	}
	if origin == "" {
		origin = fmt.Sprintf("%s://%s", parsedTarget.Scheme, parsedTarget.Host)
	}

	reqHeaders := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    referer,
		"Origin":     origin,
	}

	// Forward Range header if player requested a byte range (e.g. seeking in video)
	if rangeHeader := r.Header.Get("Range"); rangeHeader != "" {
		reqHeaders["Range"] = rangeHeader
	}

	resp, err := utils.DefaultClient.Request(r.Context(), r.Method, targetURL, nil, reqHeaders)
	if err != nil {
		http.Error(w, fmt.Sprintf("upstream error: %v", err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	lowerCT := strings.ToLower(resp.Header.Get("Content-Type"))
	isM3U8 := strings.Contains(lowerCT, "mpegurl") ||
		strings.Contains(lowerCT, "text/plain") ||
		strings.Contains(lowerCT, "application/octet-stream") ||
		strings.HasSuffix(strings.ToLower(parsedTarget.Path), ".m3u8") ||
		strings.HasSuffix(strings.ToLower(parsedTarget.Path), ".txt") ||
		strings.Contains(strings.ToLower(parsedTarget.Path), "/hls/")

	// Determine proxy base URL for playlist rewriting
	scheme := "https"
	if r.TLS == nil && !strings.HasPrefix(r.Header.Get("X-Forwarded-Proto"), "https") && (strings.HasPrefix(r.Host, "localhost") || strings.HasPrefix(r.Host, "127.0.0.1")) {
		scheme = "http"
	}
	proxyPath := "/api/proxy"
	if strings.HasPrefix(r.URL.Path, "/proxy") {
		proxyPath = "/proxy"
	}
	proxyEndpoint := fmt.Sprintf("%s://%s%s", scheme, r.Host, proxyPath)

	if isM3U8 {
		bodyBytes, err := io.ReadAll(resp.Body)
		if err != nil {
			http.Error(w, "failed to read playlist", http.StatusBadGateway)
			return
		}

		bodyStr := string(bodyBytes)
		if strings.HasPrefix(strings.TrimSpace(bodyStr), "#EXTM3U") {
			rewritten := rewriteM3U8(bodyStr, parsedTarget, proxyEndpoint, referer, origin)
			w.Header().Set("Content-Type", "application/vnd.apple.mpegurl")
			w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(rewritten))
			return
		}

		// If it did not start with #EXTM3U, it might be a binary segment served with text/plain, fall through
		w.Header().Set("Content-Type", "video/MP2T")
		w.WriteHeader(resp.StatusCode)
		w.Write(bodyBytes)
		return
	}

	// For video segments (.ts, .jpg, .js, .css, .woff, .mp4, .mkv)
	for k, vv := range resp.Header {
		lowerK := strings.ToLower(k)
		if lowerK == "content-type" || lowerK == "content-length" || lowerK == "content-range" || lowerK == "accept-ranges" {
			for _, v := range vv {
				w.Header().Add(k, v)
			}
		}
	}

	w.Header().Set("Accept-Ranges", "bytes")
	// If content-type was obfuscated as javascript/css/woff on a segment, normalize it
	if strings.Contains(lowerCT, "javascript") || strings.Contains(lowerCT, "css") || strings.Contains(lowerCT, "font") || strings.Contains(lowerCT, "image") {
		w.Header().Set("Content-Type", "video/MP2T")
	}

	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func resolveReference(base *url.URL, ref string) string {
	u, err := url.Parse(ref)
	if err != nil {
		return ref
	}
	return base.ResolveReference(u).String()
}

func rewriteM3U8(content string, baseURL *url.URL, proxyEndpoint, referer, origin string) string {
	var sb strings.Builder
	scanner := bufio.NewScanner(strings.NewReader(content))

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			sb.WriteString("\n")
			continue
		}

		if strings.HasPrefix(line, "#") {
			if strings.Contains(line, `URI="`) {
				rewrittenLine := reURIAttr.ReplaceAllStringFunc(line, func(m string) string {
					sub := reURIAttr.FindStringSubmatch(m)
					if len(sub) > 1 {
						origURI := sub[1]
						absURI := resolveReference(baseURL, origURI)
						proxiedURI := fmt.Sprintf("%s?url=%s&referer=%s&origin=%s", proxyEndpoint, url.QueryEscape(absURI), url.QueryEscape(referer), url.QueryEscape(origin))
						return fmt.Sprintf(`URI="%s"`, proxiedURI)
					}
					return m
				})
				sb.WriteString(rewrittenLine + "\n")
			} else {
				sb.WriteString(line + "\n")
			}
			continue
		}

		// It is a media segment or sub-playlist URL
		absURI := resolveReference(baseURL, line)
		proxiedURI := fmt.Sprintf("%s?url=%s&referer=%s&origin=%s", proxyEndpoint, url.QueryEscape(absURI), url.QueryEscape(referer), url.QueryEscape(origin))
		sb.WriteString(proxiedURI + "\n")
	}

	return sb.String()
}
