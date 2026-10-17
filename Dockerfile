FROM node:24.14.1-alpine AS build
WORKDIR /source
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2.10-alpine
LABEL org.opencontainers.image.source="https://github.com/Anas-Abukhadir97/happy-inventory-web"
RUN apk add --no-cache curl \
    && mkdir -p /data /config /srv \
    && chown -R 10001:10001 /data /config /srv
COPY --from=build --chown=10001:10001 /source/dist/ /srv/
COPY Caddyfile /etc/caddy/Caddyfile
USER 10001:10001
EXPOSE 8443
HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 \
  CMD curl --fail --silent --insecure https://localhost:8443/health/web >/dev/null || exit 1
