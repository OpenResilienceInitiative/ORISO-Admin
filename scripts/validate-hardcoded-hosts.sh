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

# A quoted localhost URL: either followed by port, path, query or fragment up to the closing
# quote, or closed right after the host. Both alternatives need a host boundary, so `localhost.example.org` and
# similar names never match.
URL_PATTERN='["'"'"'`]https?://localhost([:/?#][^"'"'"'`[:space:]]*["'"'"'`]?|["'"'"'`])'

# Two third-party defaults that never become an ORISO request: the OpenTelemetry OTLP exporter's
# built-in default (the app always passes an explicit metrics URL) and react-router's base for
# parsing relative paths, which only ever appears in a vendor chunk. Each is matched as a COMPLETE
# literal on its own `grep -o` line, so a forbidden URL next to one on the same line still fails.
OTLP_DEFAULT='["'"'"'`]http://localhost:4318/["'"'"'`]$'
ROUTER_BASE='^[^:]*vendor[^:]*:[0-9]+:["'"'"'`]http://localhost["'"'"'`]$'

matches=$(grep -R -n -o -E --exclude='*.map' "$URL_PATTERN" "$DIST" 2>/dev/null |
	grep -v -E "$OTLP_DEFAULT" |
	grep -v -E "$ROUTER_BASE" || true)
if [[ -n "$matches" ]]; then
	echo "Hardcoded deployment value found in $DIST: a localhost URL" >&2
	echo "$matches" | cut -c1-200 >&2
	exit 1
fi

echo "No forbidden hardcoded deployment values found in $DIST"
