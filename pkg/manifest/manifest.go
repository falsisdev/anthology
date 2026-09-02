// Package manifest embeds the canonical addon manifest (manifest.json) so the
// standalone server (cmd/server) and the Vercel serverless function
// (api/index.go) serve byte-identical manifests.
//
// This package lives outside the repo root on purpose: Vercel's Go runtime
// generates its "package main" wrapper (main__vc__go__.go) in the project
// root, so the root must not contain any other Go package. The repo-root
// manifest.json is a symlink to this package's manifest.json — edit either
// path and both entry points pick the change up at build time.
package manifest

import _ "embed"

// ManifestJSON is the raw content of manifest.json, embedded at build time. It
// includes the stremioAddonsConfig verification block for stremio-addons.net.
//
//go:embed manifest.json
var ManifestJSON []byte
