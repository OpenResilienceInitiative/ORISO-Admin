ARG DOCKER_MATRIX=ghcr.io
FROM $DOCKER_MATRIX/onlineberatung/onlineberatung-nginx/onlineberatung-nginx:dockerimage.v.005-main

# The nginx base image does not include Node.js; auth BFF sidecar requires it.
RUN set -eux; \
    if [ -f /etc/alpine-release ]; then \
        apk add --no-cache nodejs; \
    elif command -v apt-get >/dev/null 2>&1; then \
        apt-get update; \
        apt-get install -y --no-install-recommends ca-certificates curl gnupg; \
        mkdir -p /etc/apt/keyrings; \
        curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg; \
        echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_18.x nodistro main" > /etc/apt/sources.list.d/nodesource.list; \
        apt-get update; \
        apt-get install -y --no-install-recommends nodejs; \
        rm -rf /var/lib/apt/lists/*; \
    else \
        echo "Unsupported base image for Node.js installation" >&2; \
        exit 1; \
    fi; \
    node --version

COPY build /usr/share/nginx/html/admin
COPY scripts /usr/share/nginx/html/admin-auth-bff
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
