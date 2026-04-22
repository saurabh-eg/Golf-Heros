This is the Digital Heros web app built with Next.js, Supabase, Stripe, and Resend.

## Billing Webhook Endpoint

- Canonical webhook endpoint: `POST /api/billing/webhook`
- Configure Stripe webhook destination to point to this route.

## Getting Started

1. Install dependencies.

```bash
npm install
```

2. Create local environment config.

```bash
cp .env.example .env.local
```

- Set `ADMIN_EMAIL` in `.env.local` to the email that should always get admin access after sign-in.

3. Run the development server.

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Notification Dispatch

- Queued email notifications are processed by `GET /api/internal/notifications/dispatch`.
- Vercel cron is configured in `vercel.json` to call this endpoint every 5 minutes.
- Secure the endpoint in production with `CRON_SECRET` (Vercel Authorization bearer secret) and optionally `NOTIFICATION_DISPATCH_SECRET` for manual POST dispatch.

## Monthly Draw Scheduler

- Monthly official draw publish endpoint: `GET /api/internal/draw/publish`
- Vercel cron is configured in `vercel.json` to call this endpoint monthly (`0 3 1 * *`, UTC).
- Endpoint uses `CRON_SECRET` bearer authorization, same as notification cron routes.
- Optional manual trigger:
	- `POST /api/internal/draw/publish` with payload `{ "mode": "random" | "weighted", "drawYear": 2026, "drawMonth": 4 }`
	- `GET /api/internal/draw/publish?mode=random&drawYear=2026&drawMonth=4`

## Independent Donations

- Donation checkout endpoint: `POST /api/donations/checkout`
- Donation checkouts are created as Stripe one-time payment sessions.
- Successful donation payments are persisted from webhook `checkout.session.completed` events into `donations` table.

## Charity Profile and CMS

- Public charity directory route: `/charities`
- Public charity profile route: `/charities/[slug]`
- Charity profile API: `GET /api/charities/[slug]` (returns charity details, media gallery, and published events)
- Admin charity CMS now supports charity media and event CRUD under:
	- `GET/POST /api/admin/charities/[charityId]/media`
	- `PATCH/DELETE /api/admin/charities/[charityId]/media/[mediaId]`
	- `GET/POST /api/admin/charities/[charityId]/events`
	- `PATCH/DELETE /api/admin/charities/[charityId]/events/[eventId]`

## Dashboard Participation Summary

- Subscriber participation summary API: `GET /api/draw/participation`
- Dashboard module includes participation rate, wins, payout summary, and recent draw entries.

## Quality Checks

```bash
npm run lint
npm run test
npm run test:e2e
```

## CI and Release Verification

- CI workflow: `.github/workflows/ci.yml` (lint + unit tests + production build).
- E2E baseline tests live under `tests/e2e`.
- Release evidence checklist for CHK-01 to CHK-11 is maintained in `../release-evidence/README.md`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Deploy on Vercel

Set the same environment values from `.env.example` in Vercel Project Settings, including `CRON_SECRET` and `RESEND_API_KEY`, before enabling production traffic.
