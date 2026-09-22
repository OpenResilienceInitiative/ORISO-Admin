#!/usr/bin/env bash
# ORISO-Helm#368: Admin CI guard. Every runtime URL comes from env.js / container env, so no ORISO
# environment host and no invented localhost may be baked into the production bundle. Runs as
# `postbuild`; tests and fixtures use example.org.
set -euo pipefail

DIST="${1:-build}"

if [[ ! -d "$DIST" ]]; then
	echo "Build output directory not found: $DIST" >&2
	exit 1
fi

PATTERNS=(
	'oriso.org'
	'oriso-dev.site'
	'oriso.site'
)

# A quoted localhost URL, with or without port, path or query. Anchored on the host boundary so
# names like `localhost.example.org` do not match.
REGEX_PATTERNS=(
	"[\"'\`]https?://localhost([:/?\"'\`])"
)

# Source maps embed the original sources, comments included; a real hardcoded value also lands in
# the emitted .js/.css/.html, so skipping maps costs no coverage.
for pattern in "${PATTERNS[@]}"; do
	matches=$(grep -R -n -F --exclude='*.map' "$pattern" "$DIST" 2>/dev/null || true)
	if [[ -n "$matches" ]]; then
		echo "Hardcoded deployment value found in $DIST: $pattern" >&2
		echo "$matches" | cut -c1-200 >&2
		exit 1
	fi
done

# Third-party defaults that never become an ORISO request: the OpenTelemetry OTLP exporter's
# built-in default (the app always passes an explicit metrics URL) and react-router's base for
# parsing relative paths. Matched on the surrounding code, so any other localhost URL still fails.
ALLOWED_CONTEXT='localhost:4318/|location\.origin===|location\.origin ==='

for pattern in "${REGEX_PATTERNS[@]}"; do
	matches=$(grep -R -o -E --exclude='*.map' ".{0,60}${pattern}.{0,60}" "$DIST" 2>/dev/null |
		grep -v -E "$ALLOWED_CONTEXT" || true)
	if [[ -n "$matches" ]]; then
		echo "Hardcoded deployment value found in $DIST: /$pattern/" >&2
		echo "$matches" | cut -c1-200 >&2
		exit 1
	fi
done

echo "No forbidden hardcoded deployment values found in $DIST"
