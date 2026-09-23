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

## Oral exams

The study page offers a one-card oral exam before revealing the answer. Gemini 3.8 Live runs the voice conversation through the separate `srs-llm-api` FastAPI service. This Next.js app grades the final transcript with Gemini Flash and commits the rating through the existing FSRS service.

Set these server-side values in `.env.local` or your deployment environment:

```text
GEMINI_API_KEY=...
VOICE_SERVICE_TOKEN=...  # same random value in both services
VOICE_WS_URL=ws://localhost:8000/v1/voice/ws
```

Set `NEXT_INTERNAL_BASE_URL=http://localhost:3000`, the same `VOICE_SERVICE_TOKEN`, `GEMINI_API_KEY`, and `ALLOWED_ORIGIN=http://localhost:3000` in the FastAPI service. For production, use an `https://` internal base URL and a `wss://` voice URL. Run `npx drizzle-kit generate` after schema changes, then `npx drizzle-kit migrate` against the intended database. The voice migration creates `voice_exam_attempts`; the Inngest daily job clears transcripts after 30 days. The separate service has its own README and Dockerfile for Railway.

For local use, start the FastAPI service in its own terminal with `.venv/bin/uvicorn app.main:app --env-file .env --port 8000`, then start this app with `npm run dev`. Restart Next.js after adding `VOICE_WS_URL` or `VOICE_SERVICE_TOKEN`. Confirm the gateway at `http://localhost:8000/health`. A Vercel deployment requires the same Next.js variables in Vercel and a deployed FastAPI gateway with a public `wss://` URL; the local `ws://localhost:8000` value works only on your own machine.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
