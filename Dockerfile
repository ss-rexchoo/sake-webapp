# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Sake Discovery — production image for ECS.
#
# Three stages so the runtime image carries neither the npm cache nor the dev
# dependencies nor the source: deps installs, builder compiles, runner ships
# `.next/standalone` (see `output: "standalone"` in next.config.ts) plus the
# static assets. Expect roughly 200 MB rather than the ~1.5 GB a naive
# single-stage build produces.
# ─────────────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=22-alpine

# ─── deps ────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# Only the manifests, so this layer is cached until a dependency actually
# changes — editing a component does not reinstall node_modules.
COPY package.json package-lock.json ./
RUN npm ci

# ─── builder ─────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next inlines NEXT_PUBLIC_* variables at build time. This app has none — every
# secret it reads (DATABASE_URL, ADMIN_PASSWORD_HASH, SESSION_SECRET) is read at
# runtime from the environment, which is what lets one image be promoted from
# staging to production unchanged, and what keeps secrets out of image layers.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── runner ──────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# The AWS RDS CA bundle, baked in so `PGSSLROOTCERT` can point at a real file
# and the database connection verifies the server certificate properly. Without
# it `src/lib/db.ts` still uses TLS but logs that it is not verifying the peer.
ADD --chmod=644 https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
    /etc/ssl/rds/rds-ca-bundle.pem

# Non-root. `node:alpine` ships a `node` user (uid 1000) already; reusing it is
# one less thing to get wrong than minting another.
USER node

# The standalone output is a complete server: `server.js`, a minimal traced
# `node_modules`, and the compiled app. `.next/static` and `public` are not
# included in it and must be copied alongside, or every asset 404s.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

EXPOSE 3000
ENV PORT=3000
# Without this Next binds to localhost inside the container and the ALB health
# check gets connection-refused on every task. This is the single most common
# way a containerised Next app fails to come into service.
ENV HOSTNAME=0.0.0.0

# The ALB is the real health check (see deploy/README.md). This one is for
# `docker run` and for ECS's own container-level check, and mirrors the ALB's
# path so there is only one endpoint to reason about.
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
