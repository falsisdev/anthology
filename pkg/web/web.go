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

	"github.com/falsisdev/anthology/pkg/provider"
)

// Version is the addon version shown on the landing page and /health endpoints.
const Version = "1.2.0"

//go:embed landing.html
var landingHTML string

//go:embed status.html
var statusHTML string

var (
	landingTmpl = template.Must(template.New("landing").Parse(landingHTML))
	statusTmpl  = template.Must(template.New("status").Parse(statusHTML))
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
		ManifestURL string
		StremioURL  string
	}{
		ManifestURL: fmt.Sprintf("%s://%s/manifest.json", scheme, r.Host),
		StremioURL:  fmt.Sprintf("stremio://%s/manifest.json", r.Host),
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
