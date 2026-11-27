# syntax=docker/dockerfile:1

# ---- build -----------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app
ENV CI=true

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime ---------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.31-alpine AS runtime

LABEL org.opencontainers.image.title="DC UPS Sizing Studio" \
      org.opencontainers.image.description="DC UPS load list and battery sizing workbench" \
      org.opencontainers.image.licenses="MIT"

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
