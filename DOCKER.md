# Running GitMind with Docker

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

That's it — Node.js, PostgreSQL, and all npm packages are handled inside the containers.

---

## Quick Start

### 1. Copy the environment file

```bash
cp .env.example .env
```

### 2. Fill in your API keys

Open `.env` and fill in every blank value. See the table below for where to get each key.

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | [Clerk Dashboard](https://dashboard.clerk.com) → Your App → API Keys |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard → Webhooks → your endpoint |
| `GROQ_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys) |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `GITHUB_TOKEN` | [GitHub Settings → Tokens](https://github.com/settings/tokens) |
| `ASSEMBLYAI_API_KEY` | [AssemblyAI Dashboard](https://www.assemblyai.com/dashboard) |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase Console → Project Settings → Your apps |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | [Stripe Dashboard → API Keys](https://dashboard.stripe.com/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → your endpoint |

> **DATABASE_URL** does not need to be changed — Docker Compose overrides it automatically to connect the app to the built-in Postgres container.

### 3. Build and start

```bash
docker compose up --build
```

The first build takes a few minutes (installing all npm packages inside the container). Subsequent starts are fast.

### 4. Open the app

```
http://localhost:3000
```

---

## What happens on startup

1. Postgres container starts and passes a health check.
2. App container runs `prisma db push` to create all database tables automatically.
3. Next.js server starts on port 3000.

---

## Useful commands

```bash
# Start in background
docker compose up --build -d

# View live logs
docker compose logs -f app

# Stop everything
docker compose down

# Stop and wipe the database volume (full reset)
docker compose down -v

# Rebuild just the app after code changes
docker compose up --build app
```

---

## Ports

| Service | Host port |
|---|---|
| Next.js app | 3000 |
| PostgreSQL | 5432 |
