# Multi-stage build for the OTLS backend (Bun + Hono).
# Stage 1 installs workspace deps against the frozen lockfile.
# Stage 2 is a slim runtime that copies deps + backend source only.
# No transpile step — Bun runs TS directly in prod, same as in dev.

FROM oven/bun:1 AS install
WORKDIR /app

# Copy root workspace manifests first so `bun install` can resolve workspaces
# without needing the full source tree. `--production` excludes devDependencies.
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/backend/package.json ./apps/backend/
RUN bun install --frozen-lockfile --production

# ── Runtime ─────────────────────────────────────────────────────────────
FROM oven/bun:1-slim AS release
WORKDIR /app

# Deps from the install stage (hoisted to root node_modules by bun workspaces)
COPY --from=install /app/node_modules ./node_modules
COPY --from=install /app/package.json ./
COPY --from=install /app/tsconfig.base.json ./

# Backend source + package manifest
COPY apps/backend ./apps/backend

# Drop to unprivileged user bundled in the base image
USER bun

WORKDIR /app/apps/backend

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Liveness: /health returns JSON with db_reachable. Fly's http_checks use it.
CMD ["bun", "run", "src/index.ts"]
