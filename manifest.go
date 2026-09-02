// Package anthology embeds the canonical addon manifest (manifest.json) so the
// standalone server (cmd/server) and the Vercel serverless function
// (api/index.go) serve byte-identical manifests. The repo-root manifest.json is
// the single source of truth — edit that file and both entry points pick it up.
package anthology

import _ "embed"

// ManifestJSON is the raw content of the repo-root manifest.json, embedded at
// build time. It includes the stremioAddonsConfig verification block for
// stremio-addons.net.
//
//go:embed manifest.json
var ManifestJSON []byte
