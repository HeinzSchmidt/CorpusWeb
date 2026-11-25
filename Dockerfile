# syntax=docker/dockerfile:1

# =============================================================================
# CorpusWeb — local Docker deployment (multi-stage)
#
# Stage 1 (build):   install the full toolchain (dev deps included), run
#                    `vite build` (static SPA -> dist/) and bundle the
#                    Express entrypoint (server.ts) with esbuild.
# Stage 2 (runtime): small node:22-alpine image carrying only production
#                    deps, the built client bundle and the bundled server.
#
# Build:  docker build -t corpusweb:local .
# Run:    docker compose up -d          (host port 3500 -> container 3000)
# Logs:   docker logs corpusweb
#
# No secrets are baked into this image. Optional runtime env vars (never
# commit a .env file; see .env.example):
#   APP_URL, RECAPTCHA_SECRET_KEY, VITE_RECAPTCHA_SITE_KEY, RECAPTCHA_MIN_SCORE
# =============================================================================

# ---------- Stage 1: build ----------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Copy the dependency manifest first so `npm install` is layer-cached and
# only re-runs when package.json actually changes (keeps rebuilds fast).
# This repo has no committed lockfile, hence `npm install` (not `npm ci`).
COPY package.json ./
RUN npm install --no-audit --no-fund

# Copy the remaining source and build the client bundle into dist/.
# (Vite also copies public/ and re-copies src/assets per vite.config.ts.)
# `npm run build` instead of a bare `vite build`: the node image's shell PATH
# does not include node_modules/.bin — npm run does (that is why bare
# `vite` resolves only inside npm script lifecycles).
COPY . .
RUN npm run build

# Bundle the Express entrypoint (server.ts) into a single ESM file at the
# project root (server.mjs). Location matters: server.ts resolves the client
# bundle as path.resolve(__dirname, 'dist'), so the bundle must sit next to
# dist/ — in a subdirectory the runtime would look in <subdir>/dist/.
# --packages=external keeps express/dotenv un-bundled so the runtime stage
# resolves them from its production-only node_modules (smaller, cleaner image).
RUN ./node_modules/.bin/esbuild server.ts \
  --bundle \
  --platform=node \
  --format=esm \
  --target=node22 \
  --packages=external \
  --outfile=server.mjs

# ---------- Stage 2: runtime ---------------------------------------------------
# Small runtime image: production dependencies only — no build toolchain,
# no devDependencies, no TypeScript sources.
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

# Install production dependencies only, then drop the npm cache to keep the
# final image small.
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund \
 && npm cache clean --force

# Built client assets and the bundled Express server, straight from stage 1.
# server.mjs must live at /app (project root) so its __dirname-relative lookup
# finds ./dist (see build-stage comment above).
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.mjs ./server.mjs

# The app listens on PORT (3000 inside the container); compose publishes it
# on host port 3500 only.
EXPOSE 3000

# Liveness probe: the /api/recaptcha/config endpoint is cheap and always 200,
# so a failing server is reported (and restarted) by the restart policy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/recaptcha/config >/dev/null 2>&1 || exit 1

# If the server process crashes, the container exits so `unless-stopped`
# restart policy takes over instead of a hung, dead-looking container.
CMD ["node", "server.mjs"]
