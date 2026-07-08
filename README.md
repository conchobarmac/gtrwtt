This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

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

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Before running a live session

Phase transitions (writing → review → complete) are pushed to participants via
a Supabase Realtime subscription, with a polling fallback that checks every
few seconds if Realtime doesn't fire. Two manual steps in the Supabase
dashboard are still required and aren't something the app can do for you:

1. **Enable Realtime on the `sessions` table** — Database → Replication →
   toggle the `sessions` table on. Without this, screens will still advance
   (via the polling fallback) but with up to a few seconds of extra lag.
2. **Warm up the project before the session if you're on the free tier** —
   free-tier Supabase projects pause after a period of inactivity. Open the
   project dashboard a few minutes before participants join to confirm it's
   not paused and is responding.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
