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

json_escape() {
    printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

emit_config_value() {
    key="$1"
    value="$2"
    if [ -n "$value" ]; then
        printf '  "%s": "%s",\n' "$key" "$(json_escape "$value")"
    fi
}

API_URL=$(pick VITE_API_URL REACT_APP_API_URL || true)
APP_URL=$(pick VITE_APP_URL REACT_APP_APP_URL || true)
MATRIX_URL=$(pick VITE_MATRIX_URL REACT_APP_MATRIX_URL || true)
USER_SERVICE_ORIGIN=$(pick VITE_USER_SERVICE_ORIGIN REACT_APP_USER_SERVICE_ORIGIN || true)
AGENCY_SERVICE_ORIGIN=$(pick VITE_AGENCY_SERVICE_ORIGIN REACT_APP_AGENCY_SERVICE_ORIGIN || true)
TENANT_SERVICE_ORIGIN=$(pick VITE_TENANT_SERVICE_ORIGIN REACT_APP_TENANT_SERVICE_ORIGIN || true)
CONSULTING_TYPE_SERVICE_ORIGIN=$(pick VITE_CONSULTING_TYPE_SERVICE_ORIGIN REACT_APP_CONSULTING_TYPE_SERVICE_ORIGIN || true)
KEYCLOAK_ORIGIN=$(pick VITE_KEYCLOAK_ORIGIN REACT_APP_KEYCLOAK_ORIGIN || true)
KEYCLOAK_URL=$(pick VITE_KEYCLOAK_URL REACT_APP_KEYCLOAK_URL || true)
KEYCLOAK_REALM=$(pick VITE_KEYCLOAK_REALM REACT_APP_KEYCLOAK_REALM || true)
KEYCLOAK_CLIENT_ID=$(pick VITE_KEYCLOAK_CLIENT_ID REACT_APP_KEYCLOAK_CLIENT_ID || true)
USE_API_URL=$(pick VITE_USE_API_URL REACT_APP_USE_API_URL || true)
USE_HTTPS=$(pick VITE_USE_HTTPS REACT_APP_USE_HTTPS || true)
COOKIE_DOMAIN=$(pick VITE_COOKIE_DOMAIN REACT_APP_COOKIE_DOMAIN || true)
COOKIE_SECURE=$(pick VITE_COOKIE_SECURE REACT_APP_COOKIE_SECURE || true)
CSRF_WHITELIST_HEADER=$(pick VITE_CSRF_WHITELIST_HEADER VITE_CSRF_WHITELIST_HEADER_FOR_LOCAL_DEVELOPMENT REACT_APP_CSRF_WHITELIST_HEADER || true)
COOKIES_ALLOWEDLIST=$(pick VITE_COOKIES_ALLOWEDLIST REACT_APP_COOKIES_ALLOWEDLIST || true)
OBSERVABILITY_ENABLED=$(pick VITE_OBSERVABILITY_ENABLED REACT_APP_OBSERVABILITY_ENABLED || true)
OTEL_METRICS_URL=$(pick VITE_OTEL_METRICS_URL REACT_APP_OTEL_METRICS_URL || true)
OTEL_EXPORT_INTERVAL_MS=$(pick VITE_OTEL_EXPORT_INTERVAL_MS REACT_APP_OTEL_EXPORT_INTERVAL_MS || true)
PLATFORM_VERSION=$(pick VITE_PLATFORM_VERSION REACT_APP_PLATFORM_VERSION || true)

mkdir -p "$(dirname "$TARGET")"

{
    printf '%s\n' 'window.__APP_CONFIG__ = {'
    emit_config_value "API_URL" "$API_URL"
    emit_config_value "APP_URL" "$APP_URL"
    emit_config_value "MATRIX_URL" "$MATRIX_URL"
    emit_config_value "USER_SERVICE_ORIGIN" "$USER_SERVICE_ORIGIN"
    emit_config_value "AGENCY_SERVICE_ORIGIN" "$AGENCY_SERVICE_ORIGIN"
    emit_config_value "TENANT_SERVICE_ORIGIN" "$TENANT_SERVICE_ORIGIN"
    emit_config_value "CONSULTING_TYPE_SERVICE_ORIGIN" "$CONSULTING_TYPE_SERVICE_ORIGIN"
    emit_config_value "KEYCLOAK_ORIGIN" "$KEYCLOAK_ORIGIN"
    emit_config_value "KEYCLOAK_URL" "$KEYCLOAK_URL"
    emit_config_value "KEYCLOAK_REALM" "$KEYCLOAK_REALM"
    emit_config_value "KEYCLOAK_CLIENT_ID" "$KEYCLOAK_CLIENT_ID"
    emit_config_value "USE_API_URL" "$USE_API_URL"
    emit_config_value "USE_HTTPS" "$USE_HTTPS"
    emit_config_value "COOKIE_DOMAIN" "$COOKIE_DOMAIN"
    emit_config_value "COOKIE_SECURE" "$COOKIE_SECURE"
    emit_config_value "CSRF_WHITELIST_HEADER" "$CSRF_WHITELIST_HEADER"
    emit_config_value "COOKIES_ALLOWEDLIST" "$COOKIES_ALLOWEDLIST"
    emit_config_value "OBSERVABILITY_ENABLED" "$OBSERVABILITY_ENABLED"
    emit_config_value "OTEL_METRICS_URL" "$OTEL_METRICS_URL"
    emit_config_value "OTEL_EXPORT_INTERVAL_MS" "$OTEL_EXPORT_INTERVAL_MS"
    emit_config_value "PLATFORM_VERSION" "$PLATFORM_VERSION"
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
