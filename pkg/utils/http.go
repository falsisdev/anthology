package utils

import (
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	DefaultUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

// ProxyBaseURL returns the active proxy URL (empty string = direct mode).
func ProxyBaseURL() string { return "" }

// HTTPClient wraps standard http.Client with common options.
type HTTPClient struct {
	client *http.Client
}

// NewHTTPClient creates a new configured HTTPClient with the specified timeout.
func NewHTTPClient(timeout time.Duration) *HTTPClient {
	return &HTTPClient{
		client: &http.Client{
			Timeout: timeout,
			Transport: &http.Transport{
				ForceAttemptHTTP2: true,
				TLSClientConfig: &tls.Config{
					InsecureSkipVerify: true,
					MinVersion:         tls.VersionTLS12,
					CipherSuites: []uint16{
						tls.TLS_AES_128_GCM_SHA256,
						tls.TLS_AES_256_GCM_SHA384,
						tls.TLS_CHACHA20_POLY1305_SHA256,
						tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
						tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
						tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
						tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
						tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256,
						tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256,
					},
				},
			},
		},
	}
}

// DefaultClient is a shared client with a 10-second timeout.
var DefaultClient = NewHTTPClient(10 * time.Second)

// Request performs an HTTP request directly with custom headers and context.
func (c *HTTPClient) Request(ctx context.Context, method, targetURL string, body io.Reader, headers map[string]string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, method, targetURL, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", DefaultUserAgent)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
	req.Header.Set("Accept-Language", "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7")
	req.Header.Set("Sec-Ch-Ua", `"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"`)
	req.Header.Set("Sec-Ch-Ua-Mobile", "?0")
	req.Header.Set("Sec-Ch-Ua-Platform", `"Windows"`)
	req.Header.Set("Sec-Fetch-Dest", "document")
	req.Header.Set("Sec-Fetch-Mode", "navigate")
	req.Header.Set("Sec-Fetch-Site", "none")
	req.Header.Set("Sec-Fetch-User", "?1")
	req.Header.Set("Upgrade-Insecure-Requests", "1")

	for k, v := range headers {
		req.Header.Set(k, v)
	}

	return c.client.Do(req)
}

// Get performs a GET request and returns the response body as bytes.
func (c *HTTPClient) Get(ctx context.Context, targetURL string, headers map[string]string) ([]byte, error) {
	resp, err := c.Request(ctx, http.MethodGet, targetURL, nil, headers)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 400 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	return io.ReadAll(resp.Body)
}

// CheckAlive verifies if an endpoint responds with a successful status.
func (c *HTTPClient) CheckAlive(ctx context.Context, targetURL string, headers map[string]string) bool {
	ctxCheck, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	resp, err := c.Request(ctxCheck, http.MethodHead, targetURL, nil, headers)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode >= 200 && resp.StatusCode < 400
}
