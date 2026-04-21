This is the Digital Heros web app built with Next.js, Supabase, Stripe, and Resend.

## Getting Started

1. Install dependencies.

```bash
npm install
```

2. Create local environment config.

```bash
cp .env.example .env.local
```

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

## Quality Checks

```bash
npm run lint
npm run test
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Deploy on Vercel

Set the same environment values from `.env.example` in Vercel Project Settings, including `CRON_SECRET` and `RESEND_API_KEY`, before enabling production traffic.
