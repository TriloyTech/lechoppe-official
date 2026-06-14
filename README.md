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
