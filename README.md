# pg_redact()

A live demo of **content-aware PII redaction, enforced in Postgres**: a support inbox stored in **Neon Postgres**, where **Jev** (TypeSafe's System One model) decides per span whether each piece of text is personal data and of what kind. Switch your role (Guest → Support Agent → Admin) and watch a `redact()` SQL function seal or reveal every field in real time.

It is content-aware, not pattern-based: "the front office" stays visible, a phone number does not. The decision carries a calibrated confidence, and the redaction is enforced inside Postgres by a `redact()` SQL function gated on the viewer's clearance.

Built with Next.js, React 19, Tailwind v4, [Neon UI](https://ui.neon.com) components, `@neondatabase/serverless`, and the Jev API.

## How it works

1. **Candidate generation** (`src/lib/pii.ts`): tokenizes a message into candidate spans (structured shapes, capitalized runs, number-led runs). This part is deliberately dumb.
2. **Jev classification** (`src/lib/jev.ts`): one System One request with one `choice` question per candidate, decided in a single parallel pass. Jev returns a typed label (`name`, `email`, `phone`, `address`, `id_number`, or `none`) with calibrated probabilities. Only confident PII spans are kept.
3. **Storage**: spans are stored as JSONB next to the message in Neon Postgres.
4. **Masking**: each PII type has a sensitivity, each role a clearance. A span is revealed only when clearance ≥ sensitivity. The API strips unauthorized values before they ever reach the browser, and the same rule is enforced in-database by `redact(body, spans, clearance)` (see the "what Postgres returns for this role" panel on each message).

| Role          | Clearance | Sees               |
| ------------- | --------- | ------------------ |
| Guest         | 0         | nothing            |
| Support Agent | 2         | name, email, phone |
| Admin         | 3         | everything         |

## Setup

Requires Node 20+.

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and TYPESAFE_API_KEY
npm run db:setup       # create the table + pii_sensitivity() + redact()
npm run db:seed        # classify the seed messages through Jev and insert them
npm run db:prewarm     # optional: warm the buffer cache after a cold start
npm run dev            # http://localhost:3000
```

### Environment

- `DATABASE_URL` — Neon Postgres connection string.
- `TYPESAFE_API_KEY` — Jev API key from https://typesafe.ai (server-side only, never shipped to the client).

## Deploying to Vercel

1. Push this directory to a git repository and import it into Vercel.
2. Add `DATABASE_URL` and `TYPESAFE_API_KEY` as Project Environment Variables.
3. Deploy. Run `npm run db:setup && npm run db:seed` once against the production database (locally with the prod `DATABASE_URL`, or from a one-off shell) to provision the schema and seed data.

## Project layout

```
src/
  app/
    page.tsx              the interactive console (client)
    api/messages/route.ts GET masked messages for a role
    api/classify/route.ts POST text -> Jev -> store -> masked response
    api/reveal/route.ts   GET the in-database redact() output for a message + role
  lib/
    pii.ts                PII types, sensitivity/clearance, candidates, segment builder
    jev.ts                Jev System One client
    db.ts                 single Neon HTTP client
  components/             Neon UI components (added via the shadcn registry)
scripts/
  setup.ts               schema + masking functions
  seed.ts                seed messages classified through Jev
```

## Rate limiting

`POST /api/classify` (the "add your own message" flow) is capped at **10 new queries per IP per day**. The client IP comes from `@vercel/functions` `ipAddress()` on Vercel, falling back to the first `x-forwarded-for` hop locally. Counts are kept in a `rate_limits(ip, day, count)` table and reset each calendar day; over the limit returns `429` with a `Retry-After` header. The UI shows how many queries are left after each run.

## Indexes and caching

No secondary indexes are defined, on purpose. The list query reads every row ordered by `id` (a full scan an index cannot beat), and the per-message lookup already uses the `messages_pkey` primary-key index. `npm run db:prewarm` uses `pg_prewarm` to pull the table and its index into the buffer cache, which only helps after a Neon scale-to-zero cold start.

## Notes on Jev's "zero hallucinations"

Jev guarantees the output conforms to the schema (it is always one of your labels), not that the label is always correct. That is exactly why the confidence is surfaced on every span and why the reveal threshold is a knob you can tune.
