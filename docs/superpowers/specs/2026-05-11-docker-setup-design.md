# Docker Setup Design — lechoppe

**Date:** 2026-05-11  
**Status:** Approved

---

## Context

**Project:** lechoppe — Next.js 16.2.4 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase (external hosted).

Supabase is fully external (`pkmmiozhmvjvevmihsjn.supabase.co`). No database container is required. The Docker setup only needs to containerize the Next.js application.

**Goals:**
- Works for both local development (hot reload) and production deployment (VPS/cloud VM)
- Secrets injected at runtime via `env_file` — never baked into the image
- Reverse proxy handled externally (not in Compose)
- Node 22 LTS base image

---

## Section 1: Dockerfile (Multistage, Approach A — Standalone Output)

### `next.config.ts` change
Add `output: 'standalone'` to the existing config. This instructs `next build` to emit a minimal `server.js` + only the node_modules the app actually imports, producing a significantly smaller final image (~150–250 MB vs 800 MB+).

### Stage 1 — `deps` (node:22-alpine)
- Copy `package.json` and `package-lock.json`
- Run `npm ci` to install all dependencies (prod + dev) using the lockfile

### Stage 2 — `builder` (node:22-alpine)
- Copy source code and `node_modules` from `deps`
- Set `NEXT_TELEMETRY_DISABLED=1`
- Run `next build`
- Produces: `.next/standalone/`, `.next/static/`, `public/`

### Stage 3 — `runner` (node:22-alpine)
- Create non-root user `nextjs` in group `nodejs` for security
- Copy from `builder`:
  - `.next/standalone/` → `/app/`
  - `.next/static/` → `/app/.next/static/`
  - `public/` → `/app/public/`
- Set `NODE_ENV=production`, `NEXT_TELEMETRY_DISABLED=1`
- Expose port `3000`
- Entrypoint: `node server.js`

### Healthcheck
```
CMD wget -qO- http://localhost:3000/ || exit 1
interval: 30s | timeout: 10s | retries: 3 | start_period: 10s
```
Uses `wget` (built into Alpine) — no extra install needed.

---

## Section 2: `.dockerignore`

Excludes from build context to minimize size and build time:

| Category | Patterns |
|---|---|
| Build artifacts | `.next/`, `out/` |
| Dependencies | `node_modules/` |
| Version control | `.git/`, `.gitignore` |
| Environment/secrets | `.env*` |
| Editor & OS noise | `.vscode/`, `.idea/`, `*.DS_Store`, `Thumbs.db` |
| Docs & specs | `README.md`, `docs/` |
| Docker files | `Dockerfile`, `docker-compose*.yml` |
| Test files | `**/*.test.*`, `**/*.spec.*` |
| Supabase local dev | `supabase/` |

Only source code, config files (`next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`), `public/`, and `package*.json` enter the build context.

---

## Section 3: Docker Compose

### `docker-compose.yml` (production baseline)
- Service name: `lechoppe`
- Image tag: `lechoppe:latest`
- Build from local `Dockerfile`
- Port: `3000:3000`
- Restart: `unless-stopped`
- `env_file: .env` — secrets injected at runtime from host `.env` file (never committed)
- Healthcheck inherited from Dockerfile

### `docker-compose.override.yml` (dev — auto-merged)
- Same service `lechoppe`
- `build.target: builder` — stops at builder stage, full source available
- Volume mount: `.:/app` with anonymous `node_modules` volume to protect container deps
- Command: `npm run dev` (hot reload)
- `NODE_ENV=development`

**Dev usage:** `docker compose up --build` (override auto-applied)  
**Prod usage:** `docker compose -f docker-compose.yml up --build -d` (override skipped)

### `.env.example`
Documents all required environment variables with empty placeholders. Safe to commit. Serves as onboarding reference.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSPHRASE=
```

### `README.md` updates
Replace default create-next-app boilerplate with two sections:
- **Development** — `docker compose up --build`
- **Production** — `docker compose -f docker-compose.yml up --build -d`

---

## What else could be brought in (future consideration)

- **GitHub Actions workflow** — build and push image to a container registry (GHCR or Docker Hub) on push to `main`
- **`/api/health` route** — a dedicated lightweight health endpoint instead of checking `/` (avoids triggering full page SSR on every healthcheck)
- **`docker/nginx.conf` reference** — a sample Nginx config for the external reverse proxy (TLS termination, HTTP→HTTPS redirect, proxy_pass to port 3000)
