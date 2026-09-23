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
	# Host names are case-insensitive.
	matches=$(grep -R -n -i -F --exclude='*.map' "$pattern" "$DIST" 2>/dev/null || true)
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

# Two third-party defaults that never become an ORISO request, allowed only in their own code:
# the OpenTelemetry OTLP exporter's built-in default, which appends the signal path
# (`url:"http://localhost:4318/"+path`; the app always passes an explicit metrics URL), and
# react-router's base for parsing relative paths, immediately replaced by `window.location.origin`.
# They are cut out of each file before the scan, so the same literal anywhere else still fails,
# whatever the chunk is called.
Q='["'"'"'`]'
OTLP_DEFAULT="url:${Q}http://localhost:4318/${Q}[+]"
NOT_Q='[^"'"'"'`]'
ROUTER_BASE="${Q}http://localhost${Q}${NOT_Q}{0,40}[.]location[.]origin"

matches=$(find "$DIST" -type f ! -name '*.map' -print0 |
	while IFS= read -r -d '' file; do
		sed -E -e "s#${OTLP_DEFAULT}##g" -e "s#${ROUTER_BASE}##g" "$file" |
			grep -n -i -o -E "$URL_PATTERN" | sed "s#^#${file}:#" || true
	done)
if [[ -n "$matches" ]]; then
	echo "Hardcoded deployment value found in $DIST: a localhost URL" >&2
	echo "$matches" | cut -c1-200 >&2
	exit 1
fi

echo "No forbidden hardcoded deployment values found in $DIST"
