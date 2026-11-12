# Site estático do IGNIS (Expo web) servido pelo Caddy.
# A URL da API é gravada no build: docker build --build-arg EXPO_PUBLIC_API_URL=https://api.exemplo.com .

FROM node:22-bookworm-slim AS build
WORKDIR /app

ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL \
    CI=1 \
    EXPO_NO_TELEMETRY=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx expo export --platform web


FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv

EXPOSE 80
