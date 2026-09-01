package utils

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	DefaultUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

// HTTPClient wraps standard http.Client with common options.
type HTTPClient struct {
	client *http.Client
}

// NewHTTPClient creates a new configured HTTPClient with the specified timeout.
func NewHTTPClient(timeout time.Duration) *HTTPClient {
	return &HTTPClient{
		client: &http.Client{
			Timeout: timeout,
		},
	}
}

// DefaultClient is a shared client with a 10-second timeout.
var DefaultClient = NewHTTPClient(10 * time.Second)

// Request performs an HTTP request with custom headers and context.
func (c *HTTPClient) Request(ctx context.Context, method, url string, body io.Reader, headers map[string]string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, method, url, body)
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

// Get performs a GET request and returns the response body as bytes.
func (c *HTTPClient) Get(ctx context.Context, url string, headers map[string]string) ([]byte, error) {
	resp, err := c.Request(ctx, http.MethodGet, url, nil, headers)
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
func (c *HTTPClient) CheckAlive(ctx context.Context, url string, headers map[string]string) bool {
	ctxCheck, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	resp, err := c.Request(ctxCheck, http.MethodHead, url, nil, headers)
	if err == nil {
		defer resp.Body.Close()
		if resp.StatusCode >= 200 && resp.StatusCode < 400 {
			return true
		}
	}

	// Fallback to GET with range
	getHeaders := make(map[string]string)
	for k, v := range headers {
		getHeaders[k] = v
	}
	getHeaders["Range"] = "bytes=0-100"

	resp, err = c.Request(ctxCheck, http.MethodGet, url, nil, getHeaders)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode >= 200 && resp.StatusCode < 400
}
