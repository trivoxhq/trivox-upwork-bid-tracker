# Upwork Bid Tracker

Internal dashboard for logging bids, targets, and stats (Next.js App Router, Prisma, MySQL).

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **MySQL** 8.x (or compatible) with an empty database created for this app

## Setup

```bash
git clone <repository-url>
cd upwork-bid-tracker
npm install
```

Copy the environment template and fill in secrets:

```bash
cp .env.example .env.local
```

**Required in `.env.local`**

| Variable        | Purpose                                      |
|-----------------|----------------------------------------------|
| `DATABASE_URL`  | MySQL connection string for Prisma           |
| `JWT_SECRET`    | Long random string for session signing (32+ chars recommended) |

Prisma CLI does not load `.env.local` by default. This project uses **dotenv-cli** in npm scripts so `DATABASE_URL` is available for Prisma commands.

## Database

Pick one workflow:

- **Prototypes / quick local DB:** sync schema without migration history  
  `npm run db:push`
- **Tracked migrations (recommended for teams/production):**  
  `npm run db:migrate`  
  Deploy elsewhere with:  
  `npm run db:deploy`

Seed default users (optional):

```bash
npm run db:seed
```

Override seed passwords with `SEED_ADMIN_PASSWORD` and `SEED_MEMBER_PASSWORD` in `.env.local` if needed.

Open Prisma Studio:

```bash
npm run db:studio
```

## Run locally

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) and sign in.

## Build & production

```bash
npm run build
npm run start
```

`npm run build` runs `prisma generate` using `.env.local`, then `next build`. On your host (e.g. Vercel), set the same env vars in the project settings and run migrations (`npm run db:deploy`) as part of deploy or CI.

## Lint & types

```bash
npm run lint
npx tsc --noEmit
```

## Optional environment variables

See [`.env.example`](.env.example) for full comments. Summary:

- **`ALLOWED_OFFICE_IPS`** — Comma-separated public IPs; when set, `/api/*` and `/dashboard` are restricted (login stays available for messaging).
- **`ADMIN_DESTRUCTIVE_PIN`** — If set, admin “reset all bid data” requires this PIN in the request body.
- **`CRON_SECRET`**, **`RESEND_API_KEY`**, **`DAILY_SUMMARY_TO`**, **`DAILY_SUMMARY_FROM`** — Daily summary email via Resend; cron hits `POST /api/cron/daily-summary` with header `Authorization: Bearer <CRON_SECRET>`.
- **`NEXT_PUBLIC_DASH_POLL_SEC`** — Dashboard stats refresh interval in seconds (5–120); omit or `0` to disable polling.

## Security notes

- Never commit `.env` or `.env.local`; only `.env.example` belongs in git.
- Use a strong `JWT_SECRET` in production.
- Restrict destructive actions with `ADMIN_DESTRUCTIVE_PIN` when the app is exposed beyond trusted networks.
