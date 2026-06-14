# Dockerize Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Containerize the lechoppe Next.js application with a multistage Dockerfile, `.dockerignore`, and docker-compose files for both development and production.

**Architecture:** Three-stage Dockerfile (deps → builder → runner) using Next.js standalone output to produce a minimal ~150–250 MB image. `docker-compose.yml` is the production baseline; `docker-compose.override.yml` adds dev hot-reload and is merged automatically by Docker Compose. Secrets are never baked into the image — injected at runtime via `env_file`.

**Tech Stack:** Node 22 Alpine, Next.js 16 standalone output, Docker Compose v2

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `next.config.ts` | Enable standalone output |
| Create | `Dockerfile` | Multistage build (deps / builder / runner) |
| Create | `.dockerignore` | Exclude non-essential files from build context |
| Create | `docker-compose.yml` | Production service definition |
| Create | `docker-compose.override.yml` | Dev hot-reload overrides |
| Create | `.env.example` | Documents required env vars (safe to commit) |
| Modify | `README.md` | Add Docker dev and production usage sections |

---

### Task 1: Enable Next.js standalone output

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Add `output: 'standalone'` to `next.config.ts`**

Replace the file with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Suppress TypeScript errors during Vercel builds
  typescript: {
    ignoreBuildErrors: true,
  },

  // Allow Next/Image to load images from Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pkmmiozhmvjvevmihsjn.supabase.co",
        port:     "",
        pathname: "/storage/v1/object/public/**",
      },
      // Legacy project (keep during transition)
      {
        protocol: "https",
        hostname: "hknctnpgrfkpvvfjwpeh.supabase.co",
        port:     "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 2: Verify standalone output is recognised (local build)**

Run:
```bash
npm run build
```

Expected: Build succeeds and the last lines include:
```
Route (app) ...
...
✓ Generating static pages
```

Also verify the output directory exists:
```bash
ls .next/standalone/
```
Expected: `server.js` and a `node_modules/` directory are present.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat: enable Next.js standalone output for Docker"
```

---

### Task 2: Create `.dockerignore`

**Files:**
- Create: `.dockerignore`

- [ ] **Step 1: Create `.dockerignore`**

```
# Build artifacts
.next/
out/

# Dependencies — reinstalled inside the image
node_modules/

# Version control
.git/
.gitignore

# Environment & secrets — injected at runtime, never in the image
.env*

# Editor & OS noise
.vscode/
.idea/
*.DS_Store
Thumbs.db

# Documentation
README.md
docs/

# Docker files — not needed inside build context
Dockerfile
docker-compose*.yml

# Tests
**/*.test.*
**/*.spec.*

# Supabase local dev tooling — not needed at runtime
supabase/
```

- [ ] **Step 2: Verify build context is lean**

Run:
```bash
docker build --no-cache --progress=plain . 2>&1 | head -20
```

Expected: The `COPY . .` step in the builder stage completes quickly and does not include `node_modules/` or `.next/` in the transferred context.

- [ ] **Step 3: Commit**

```bash
git add .dockerignore
git commit -m "chore: add .dockerignore to minimize build context"
```

---

### Task 3: Create the Dockerfile

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: Create `Dockerfile`**

```dockerfile
# Stage 1 — install all dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2 — build the Next.js application
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3 — minimal production runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
```

- [ ] **Step 2: Build the image and verify it succeeds**

Run:
```bash
docker build -t lechoppe:latest .
```

Expected: All three stages complete, ending with:
```
 => exporting to image
 => => naming to docker.io/library/lechoppe:latest
```

- [ ] **Step 3: Check image size**

Run:
```bash
docker image ls lechoppe:latest
```

Expected: SIZE column shows ~150–300 MB (not 800 MB+).

- [ ] **Step 4: Verify the non-root user**

Run:
```bash
docker run --rm lechoppe:latest whoami
```

Expected output: `nextjs`

- [ ] **Step 5: Commit**

```bash
git add Dockerfile
git commit -m "feat: add multistage Dockerfile with standalone output and healthcheck"
```

---

### Task 4: Create `docker-compose.yml` (production baseline)

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
services:
  lechoppe:
    build: .
    image: lechoppe:latest
    ports:
      - "3000:3000"
    restart: unless-stopped
    env_file:
      - .env
```

- [ ] **Step 2: Verify production compose starts (requires a `.env` file on host)**

Copy the example file and fill in real values:
```bash
cp .env.example .env
# then edit .env with real Supabase credentials
```

Run:
```bash
docker compose -f docker-compose.yml up --build -d
```

Expected:
```
✔ Container lechoppe-lechoppe-1  Started
```

Check it is healthy:
```bash
docker compose -f docker-compose.yml ps
```

Expected: STATUS column shows `healthy` (after ~40s start period).

Tear down:
```bash
docker compose -f docker-compose.yml down
```

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add docker-compose.yml for production"
```

---

### Task 5: Create `docker-compose.override.yml` (dev hot-reload)

**Files:**
- Create: `docker-compose.override.yml`

- [ ] **Step 1: Create `docker-compose.override.yml`**

```yaml
services:
  lechoppe:
    build:
      context: .
      target: builder
    command: npm run dev
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
```

- [ ] **Step 2: Verify dev compose starts with hot reload**

Run:
```bash
docker compose up --build
```

Expected: Container starts, and logs show:
```
▲ Next.js 16.x.x
- Local:        http://localhost:3000
✓ Ready in ...
```

Edit any source file (e.g. `app/page.tsx`) — the dev server should detect the change and recompile without restarting the container.

Tear down:
```bash
docker compose down
```

- [ ] **Step 3: Commit**

```bash
git add docker-compose.override.yml
git commit -m "feat: add docker-compose.override.yml for dev hot-reload"
```

---

### Task 6: Create `.env.example`

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create `.env.example`**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSPHRASE=
```

- [ ] **Step 2: Verify the file is NOT excluded by `.dockerignore`**

Wait — `.env*` in `.dockerignore` does match `.env.example`. This is intentional: `.env.example` is documentation only and does not belong in the Docker build context. Confirm this is expected by checking that the build still succeeds:

```bash
docker build -t lechoppe:latest .
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: add .env.example documenting required environment variables"
```

---

### Task 7: Update `README.md` with Docker usage

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README.md content**

```markdown
# lechoppe

A Next.js 16 application with React 19, TypeScript, Tailwind CSS v4, and Supabase.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2

## Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous (public) API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `ADMIN_PASSPHRASE` | Passphrase for the admin section |

## Development

Starts the app with hot reload. The `docker-compose.override.yml` is merged automatically.

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000).

## Production

Skips the override file. Runs the optimised standalone build in a detached container.

```bash
docker compose -f docker-compose.yml up --build -d
```

Check status:

```bash
docker compose -f docker-compose.yml ps
```

View logs:

```bash
docker compose -f docker-compose.yml logs -f
```

Stop:

```bash
docker compose -f docker-compose.yml down
```
```

- [ ] **Step 2: Verify README renders correctly**

Open `README.md` in your editor or run:
```bash
cat README.md
```

Confirm both Development and Production sections are present and the env var table is readable.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README with Docker development and production instructions"
```

---

## Verification Checklist

After all tasks are complete, run through this end-to-end check:

- [ ] `docker build -t lechoppe:latest .` — image builds successfully
- [ ] `docker image ls lechoppe:latest` — image size is under 400 MB
- [ ] `docker compose up --build` — dev server starts at `localhost:3000` with hot reload
- [ ] `docker compose -f docker-compose.yml up --build -d` — production container starts and becomes `healthy`
- [ ] `docker compose -f docker-compose.yml ps` — STATUS shows `healthy`
- [ ] `git log --oneline` on branch `dockerize-application` — 7 commits visible
