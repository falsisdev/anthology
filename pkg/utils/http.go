package utils

import (
	"bytes"
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"
)

const (
	DefaultUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

// proxyBaseURL is resolved at startup from the PROXY_URL env var.
var proxyBaseURL = os.Getenv("PROXY_URL")

// ProxyBaseURL returns the active proxy URL (empty string = direct mode).
func ProxyBaseURL() string { return proxyBaseURL }

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
				TLSClientConfig: &tls.Config{
					InsecureSkipVerify: true,
				},
			},
		},
	}
}

// DefaultClient is a shared client with a 10-second timeout.
var DefaultClient = NewHTTPClient(10 * time.Second)

// Request performs an HTTP request with custom headers and context.
func (c *HTTPClient) Request(ctx context.Context, method, targetURL string, body io.Reader, headers map[string]string) (*http.Response, error) {
	// Buffer body if present so it can be reused for fallback
	var bodyBytes []byte
	if body != nil {
		b, err := io.ReadAll(body)
		if err == nil {
			bodyBytes = b
		}
	}

	doDirect := func() (*http.Response, error) {
		var reqBody io.Reader
		if len(bodyBytes) > 0 {
			reqBody = bytes.NewReader(bodyBytes)
		}
		req, err := http.NewRequestWithContext(ctx, method, targetURL, reqBody)
		if err != nil {
			return nil, fmt.Errorf("failed to create request: %w", err)
		}
		req.Header.Set("User-Agent", DefaultUserAgent)
		req.Header.Set("Accept", "*/*")
		for k, v := range headers {
			req.Header.Set(k, v)
		}
		return c.client.Do(req)
	}

	if proxyBaseURL == "" {
		return doDirect()
	}

	// Try proxy request first
	var proxyReqBody io.Reader
	if len(bodyBytes) > 0 {
		proxyReqBody = bytes.NewReader(bodyBytes)
	}
	proxyURL := proxyBaseURL + "/?url=" + url.QueryEscape(targetURL)
	req, err := http.NewRequestWithContext(ctx, method, proxyURL, proxyReqBody)
	if err != nil {
		return doDirect()
	}

	req.Header.Set("User-Agent", DefaultUserAgent)
	req.Header.Set("x-ph-user-agent", DefaultUserAgent)
	for k, v := range headers {
		req.Header.Set("x-ph-"+k, v)
	}

	resp, err := c.client.Do(req)
	if err != nil || resp.StatusCode >= 400 {
		if resp != nil {
			resp.Body.Close()
		}
		// Fallback to direct request
		return doDirect()
	}

	return resp, nil
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
