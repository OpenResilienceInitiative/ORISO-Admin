ARG DOCKER_MATRIX=ghcr.io
FROM node:18-bookworm-slim AS node-runtime

FROM $DOCKER_MATRIX/onlineberatung/onlineberatung-nginx/onlineberatung-nginx:dockerimage.v.005-main

# The nginx base image does not include Node.js; auth BFF sidecar requires it.
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
RUN node --version

COPY build /usr/share/nginx/html/admin
COPY scripts /usr/share/nginx/html/admin-auth-bff
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
