# Registry mirrors can override the full digest-pinned Alpine image reference.
ARG ADMIN_RUNTIME_IMAGE=docker.io/library/nginx:1.30.7-alpine3.24@sha256:bef154735288bc38d99fac41ae63730684bcc661503673a04a0f9bc526ba8598
FROM ${ADMIN_RUNTIME_IMAGE}

# nginx proxies Admin authentication to the Node.js BFF.
RUN apk upgrade --no-cache \
    && apk add --no-cache nodejs 'libxml2>=2.13.9-r3' \
    && node --version

COPY build /usr/share/nginx/html/admin
COPY scripts/auth-bff-server.mjs scripts/auth-bff-handlers.mjs /opt/oriso/admin-auth-bff/
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-headers.conf /etc/nginx/admin-response-headers.conf
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
