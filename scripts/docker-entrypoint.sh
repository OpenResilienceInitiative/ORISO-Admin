#!/bin/sh
set -eu

TARGET="${RUNTIME_ENV_FILE:-/usr/share/nginx/html/admin/env.js}"

pick() {
    for key in "$@"; do
        value=$(eval "printf '%s' \"\${$key:-}\"")
        if [ -n "$value" ]; then
            printf '%s' "$value"
            return 0
        fi
    done
    return 1
}

API_URL=$(pick VITE_API_URL REACT_APP_API_URL || true)
APP_URL=$(pick VITE_APP_URL REACT_APP_APP_URL || true)
MATRIX_URL=$(pick VITE_MATRIX_URL REACT_APP_MATRIX_URL || true)
KEYCLOAK_REALM=$(pick VITE_KEYCLOAK_REALM REACT_APP_KEYCLOAK_REALM || true)
KEYCLOAK_CLIENT_ID=$(pick VITE_KEYCLOAK_CLIENT_ID REACT_APP_KEYCLOAK_CLIENT_ID || true)
USE_API_URL=$(pick VITE_USE_API_URL REACT_APP_USE_API_URL || true)
USE_HTTPS=$(pick VITE_USE_HTTPS REACT_APP_USE_HTTPS || true)
COOKIE_DOMAIN=$(pick VITE_COOKIE_DOMAIN REACT_APP_COOKIE_DOMAIN || true)
COOKIE_SECURE=$(pick VITE_COOKIE_SECURE REACT_APP_COOKIE_SECURE || true)
CSRF_WHITELIST_HEADER=$(pick VITE_CSRF_WHITELIST_HEADER VITE_CSRF_WHITELIST_HEADER_FOR_LOCAL_DEVELOPMENT REACT_APP_CSRF_WHITELIST_HEADER || true)
COOKIES_ALLOWEDLIST=$(pick VITE_COOKIES_ALLOWEDLIST REACT_APP_COOKIES_ALLOWEDLIST || true)

mkdir -p "$(dirname "$TARGET")"

{
    printf '%s\n' 'window.__APP_CONFIG__ = {'
    [ -n "$API_URL" ] && printf '  "API_URL": "%s",\n' "$API_URL"
    [ -n "$APP_URL" ] && printf '  "APP_URL": "%s",\n' "$APP_URL"
    [ -n "$MATRIX_URL" ] && printf '  "MATRIX_URL": "%s",\n' "$MATRIX_URL"
    [ -n "$KEYCLOAK_REALM" ] && printf '  "KEYCLOAK_REALM": "%s",\n' "$KEYCLOAK_REALM"
    [ -n "$KEYCLOAK_CLIENT_ID" ] && printf '  "KEYCLOAK_CLIENT_ID": "%s",\n' "$KEYCLOAK_CLIENT_ID"
    [ -n "$USE_API_URL" ] && printf '  "USE_API_URL": "%s",\n' "$USE_API_URL"
    [ -n "$USE_HTTPS" ] && printf '  "USE_HTTPS": "%s",\n' "$USE_HTTPS"
    [ -n "$COOKIE_DOMAIN" ] && printf '  "COOKIE_DOMAIN": "%s",\n' "$COOKIE_DOMAIN"
    [ -n "$COOKIE_SECURE" ] && printf '  "COOKIE_SECURE": "%s",\n' "$COOKIE_SECURE"
    [ -n "$CSRF_WHITELIST_HEADER" ] && printf '  "CSRF_WHITELIST_HEADER": "%s",\n' "$CSRF_WHITELIST_HEADER"
    [ -n "$COOKIES_ALLOWEDLIST" ] && printf '  "COOKIES_ALLOWEDLIST": "%s",\n' "$COOKIES_ALLOWEDLIST"
    printf '%s\n' '};'
} > "$TARGET"

AUTH_BFF_PORT="${AUTH_BFF_PORT:-3001}"

if ! command -v node >/dev/null 2>&1; then
    echo "ERROR: node is required for auth BFF but was not found in PATH" >&2
    exit 1
fi

node /usr/share/nginx/html/admin-auth-bff/auth-bff-server.mjs &
AUTH_BFF_PID=$!

i=0
while [ "$i" -lt 50 ]; do
    if node -e "const n=require('net');const c=n.connect(${AUTH_BFF_PORT},'127.0.0.1',()=>{c.end();process.exit(0)});c.on('error',()=>process.exit(1));" 2>/dev/null; then
        break
    fi
    if ! kill -0 "$AUTH_BFF_PID" 2>/dev/null; then
        echo "ERROR: Auth BFF exited before becoming ready on port ${AUTH_BFF_PORT}" >&2
        exit 1
    fi
    i=$((i + 1))
    sleep 0.1
done

if [ "$i" -ge 50 ]; then
    echo "ERROR: Auth BFF did not start listening on port ${AUTH_BFF_PORT} within 5s" >&2
    kill "$AUTH_BFF_PID" 2>/dev/null || true
    exit 1
fi

exec nginx -g 'daemon off;'
