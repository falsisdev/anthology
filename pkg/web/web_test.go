package web

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestServeLanding(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "http://example.com/", nil)
	w := httptest.NewRecorder()
	ServeLanding(w, r)

	if ct := w.Header().Get("Content-Type"); !strings.HasPrefix(ct, "text/html") {
		t.Fatalf("expected text/html, got %q", ct)
	}
	body := w.Body.String()
	for _, want := range []string{
		"Anthology",
		"htmx.org@2.0.4",
		"Eklenti Durumu",
		`hx-get="/fragments/status"`,
	} {
		if !strings.Contains(body, want) {
			t.Errorf("landing page missing %q", want)
		}
	}
	// html/template JS-escapes "/" as "\/" inside <script> strings; JS treats
	// both identically, so normalize before verifying the substituted URLs.
	// The request is non-TLS, so scheme detection should resolve to "http".
	jsNormalized := strings.ReplaceAll(body, `\/`, "/")
	for _, want := range []string{
		"http://example.com/manifest.json",
		"stremio://example.com/manifest.json",
	} {
		if !strings.Contains(jsNormalized, want) {
			t.Errorf("landing page missing %q", want)
		}
	}
	// Over TLS (or behind an https proxy) the same template must produce https URLs.
	r2 := httptest.NewRequest(http.MethodGet, "https://example.com/", nil)
	r2.Header.Set("X-Forwarded-Proto", "https")
	w2 := httptest.NewRecorder()
	ServeLanding(w2, r2)
	body2 := strings.ReplaceAll(w2.Body.String(), `\/`, "/")
	if !strings.Contains(body2, "https://example.com/manifest.json") {
		t.Errorf("landing page did not switch to https for TLS request")
	}
	// The fmt.Sprintf-era "%" escaping should be gone; CSS may use % freely.
	if strings.Contains(body, "%%") {
		t.Errorf("landing page still contains unresolved %% escapes")
	}
}

func TestServeStatus(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/fragments/status", nil)
	w := httptest.NewRecorder()
	ServeStatus(w, r)

	if ct := w.Header().Get("Content-Type"); !strings.HasPrefix(ct, "text/html") {
		t.Fatalf("expected text/html, got %q", ct)
	}
	body := w.Body.String()
	if !strings.Contains(body, "Aktif Video Kaynağı") {
		t.Errorf("status fragment missing provider count")
	}
	if !strings.Contains(body, "v"+Version) {
		t.Errorf("status fragment missing version")
	}
}

func TestIsHomePath(t *testing.T) {
	cases := map[string]bool{
		"/":                 true,
		"":                  true,
		"/api":              true,
		"/api/index.go":     true,
		"/manifest.json":    false,
		"/catalog/series/x": false,
	}
	for path, want := range cases {
		if got := IsHomePath(path); got != want {
			t.Errorf("IsHomePath(%q) = %v, want %v", path, got, want)
		}
	}
}
