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

## Reader AI features (RAG, translation, card suggestions)

"Ask this book", the translation panel and AI card suggestions run in the separate `srs-llm-api` service (FastAPI + LangGraph + OpenAI). This app keeps the database, sessions and permissions; the service never touches the database and reads book data through `/api/internal/rag/*`.

Set in `.env` (and the same token in the service's `.env`; the OpenAI key lives only there):

```text
LLM_API_URL=http://localhost:8000
LLM_SERVICE_TOKEN=...  # openssl rand -hex 32, at least 32 characters
```

On free hosting that sleeps when idle (Render's free plan), the app wakes the service before calling it, waiting up to `LLM_WAKE_TIMEOUT_MS` (90 s by default; `0` for an always-on host). The first translation, card suggestion or question after a pause can therefore take up to a minute, and the UI says so.

Run the three processes locally: `npm run dev`, `npm run inngest` (indexing is queued there) and, in the other repo, `uv run uvicorn app.main:app --port 8000`. Without an OpenAI key, start the service with `LLM_PROVIDER=fake` to exercise everything offline for free. After pulling these changes run `npx drizzle-kit migrate`: migration `0014` discards the old Gemini vectors and every book is re-indexed on its next question. Architecture and contract: `docs/plans/epub-reader-fase-3-langgraph.md` and `AGENTS.md` §6.5.

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
