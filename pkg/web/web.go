// Package web renders the Anthology landing page and its htmx fragments.
// The HTML markup lives in separate embedded template files (landing.html,
// status.html) so both the Vercel serverless handler (api) and the local
// server (cmd/server) share a single copy instead of inlining markup in Go.
package web

import (
	_ "embed"
	"fmt"
	"html/template"
	"net/http"
	"strings"
	"time"

	"github.com/falsisdev/anthology/pkg/provider"
	"github.com/falsisdev/anthology/pkg/tester"
)

// Version is the addon version shown on the landing page and /health endpoints.
const Version = "1.2.0"

//go:embed landing.html
var landingHTML string

//go:embed status.html
var statusHTML string

//go:embed tests.html
var testsHTML string

var (
	landingTmpl = template.Must(template.New("landing").Parse(landingHTML))
	statusTmpl  = template.Must(template.New("status").Parse(statusHTML))
	testsTmpl   = template.Must(template.New("tests").Parse(testsHTML))
)

// IsHomePath reports whether path refers to the site root.
// Vercel rewrites "/" to the serverless entry file, so "api/index.go" counts too.
func IsHomePath(path string) bool {
	trimmed := strings.Trim(path, "/")
	return trimmed == "" || trimmed == "api" || trimmed == "api/index" || trimmed == "api/index.go"
}

// ServeLanding renders the HTML landing page for root requests.
func ServeLanding(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	scheme := "https"
	if r.TLS == nil && !strings.HasPrefix(r.Header.Get("X-Forwarded-Proto"), "https") {
		scheme = "http"
	}
	data := struct {
		ManifestURL   string
		StremioURL    string
		ProviderCount int
	}{
		ManifestURL:   fmt.Sprintf("%s://%s/manifest.json", scheme, r.Host),
		StremioURL:    fmt.Sprintf("stremio://%s/manifest.json", r.Host),
		ProviderCount: len(provider.All()),
	}
	_ = landingTmpl.Execute(w, data)
}

// ServeStatus renders the htmx status fragment used on the landing page.
func ServeStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	data := struct {
		Version       string
		ProviderCount int
	}{
		Version:       Version,
		ProviderCount: len(provider.All()),
	}
	_ = statusTmpl.Execute(w, data)
}

// testResultsView is the data model for the tests fragment template.
type testResultsView struct {
	Results      []tester.TestResult
	Summary      bool
	SummaryClass string
	Total        int
	OKCount      int
	ElapsedMS    int64
}

// ServeProviderTests live-tests every stream provider and renders the results
// fragment for the dashboard.
func ServeProviderTests(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")

	start := time.Now()
	results := tester.TestProviders(r.Context())
	_ = testsTmpl.Execute(w, buildTestView(results, time.Since(start)))
}

// ServeChannelTests live-tests every live TV channel and renders the results
// fragment for the dashboard.
func ServeChannelTests(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")

	start := time.Now()
	results := tester.TestChannels(r.Context())
	_ = testsTmpl.Execute(w, buildTestView(results, time.Since(start)))
}

func buildTestView(results []tester.TestResult, elapsed time.Duration) testResultsView {
	view := testResultsView{
		Results:   results,
		Total:     len(results),
		ElapsedMS: elapsed.Milliseconds(),
	}
	for _, res := range results {
		if res.OK {
			view.OKCount++
		}
	}
	if view.Total > 0 {
		view.Summary = true
		switch {
		case view.OKCount == view.Total:
			view.SummaryClass = "all-ok"
		case view.OKCount > 0:
			view.SummaryClass = "partial"
		default:
			view.SummaryClass = "all-fail"
		}
	}
	return view
}
