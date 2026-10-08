# AGENTS.md

Technical notes for agents working on this repo. Keep this file current: update
it in the same change whenever you alter the stack, scripts, API shape, factor
list, deploy process, or anything a future agent would trip over.

## What this is

An HTTP API on Cloudflare Workers that scores text against a list of "slop
factors" (stylistic tells common in AI-generated prose) using Cloudflare's Clef
decision model (`@cf/cloudflare/clef`). It returns a probability per factor.
It does not try to say whether a human or an AI wrote the text; see "Spike
findings" for why.

Production: https://slop.how (website) and https://api.slop.how (API), both served by one Worker via custom domains in `cloudflare.config.ts`. No auth yet.

## Domain

`slop.how` was registered on Cloudflare Registrar on 2026-10-08 ($20.20/yr, same renewal) in the personal account. Zone ID `11e2c7374bb602cd831d2b60f721a464`.

## Stack

- Cloudflare Workers, configured with `cloudflare.config.ts` (the `cf` CLI
  format, not wrangler). Deploy with `cf deploy`.
- Hono + `@hono/zod-openapi` for routing and OpenAPI generation
- Zod 4 schemas as the single source of truth for request/response types
- Vitest 4 for tests (in Node, with a mocked AI binding)
- Biome for lint + format
- TypeScript 7
- Node 26 (`.node-version`), which runs `.ts` scripts directly

## Layout

- `src/factors.ts`: factor definitions. `instructions` and `criteria` are the Clef questions; bump `FACTORS_VERSION` whenever they change. `advice` is how to fix the problem; it's shown to agents in llms.txt and `/v1/factors` but never sent to Clef, so changing it doesn't need a version bump.
- `src/clef.ts`: builds Clef requests, validates Clef responses with Zod, model prices
- `src/chunk.ts`: lossless sentence-aligned chunking for long text
- `src/analyze.ts`: core: chunk, call Clef per chunk in parallel, take max probability per factor, sum usage
- `src/schema.ts`: public API schemas (`AnalyzeRequest`, `AnalyzeResponse`, `FactorsResponse`, `ErrorResponse`)
- `src/llms.ts`: generates `/llms.txt` from the factor definitions, with links built from the request origin
- `src/site.ts`: the slop.how homepage (one inline HTML page: slime heading in Creepster from Google Fonts, subset with `text=slop.how`; copy-paste agent prompt; example API response) and `apiOrigin()`, which makes `/llms.txt` on slop.how link to api.slop.how
- `src/example-response.json`: a real production response for the homepage's sample text. A test validates it against `AnalyzeResponse`. Recapture it (POST the sample text to api.slop.how) when factors or the response shape change.
- `src/app.ts`: Hono app, routes, OpenAPI document. Exports `AppType` for `hc<AppType>` typed clients.
- `src/index.ts`: Worker entrypoint. `fetch` delegates to the Hono app; `analyze()` is a JS RPC method for service bindings. Only file that imports `cloudflare:workers`.
- `openapi.json`: generated, committed. A test fails if it's stale.
- `test/`: Vitest tests. `*.types.test.ts` and `expectTypeOf` calls are type tests, enforced by `tsc` in `script/typecheck`.
- `test/fixtures/`: real Clef responses recorded during the spike

## Scripts

Follows "Scripts to Rule Them All". Use these instead of raw npm commands.

- `script/bootstrap`: install dependencies
- `script/test`: unit tests (free, offline, Clef is mocked)
- `script/typecheck`: generate Worker types, run `tsc` for Worker code and tests, then `tsc -p tsconfig.node.json` for Node scripts
- `script/lint`: Biome check, fails on warnings; `script/lint --fix` to apply fixes
- `script/openapi`: regenerate `openapi.json` after changing schemas or routes
- `script/server`: local dev server via `cf dev`. The AI binding is remote, so it calls real Clef and costs money.
- `script/smoke [base-url]`: real Clef calls against crafted samples via the typed client. Defaults to production. Under $0.01 per run. Run it after changing factor wording.

## API

- `POST /v1/analyze` `{ text, model? }` returns `{ version, model, factors: { <id>: { probability } }, usage }`
- `GET /v1/factors` returns factor definitions
- `GET /openapi.json`
- `GET /llms.txt`: agent-facing summary (llmstxt.org format). Includes a review workflow telling agents to give writing feedback (flag factors at 0.5 or higher, quote passages, suggest rewrites, end with a revised text) rather than dump scores. Keep it in sync with API changes; tests check it lists every factor with its advice.
- `GET /` serves the homepage on every host

Text over 20,000 words is split into chunks at sentence boundaries, one Clef
call per chunk. Each factor's document probability is the max across chunks.
Requests are capped at 500,000 characters because the API is unauthenticated.

## CI/CD

`.github/workflows/ci.yml` runs lint, typecheck, and tests on PRs and pushes
to main. Pushes to main then deploy with `cf deploy`, using the
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repo secrets. The token is
named "clef-slop-detector GitHub Actions deploy" and is scoped to Workers
Scripts Write and Account Settings Read on the personal account, plus Zone
Read, DNS Write, and Workers Routes Write on the slop.how zone (needed for the
custom domains). The cf OAuth session can create tokens but not update or
delete them; change permissions by creating a new token, swapping the secret,
and deleting the old token in the dashboard (Profile > API Tokens).

## Pricing

Clef bills input tokens only: $0.24/M for `clef`, $0.09/M for `clef-flash`. The
14 factor questions add about 1,700 tokens to every call. A 500-word page costs
about 2,300 tokens, or $0.00055 on `clef`.

## Spike findings (2026-10-07)

- Factors trigger reliably on text written to exhibit them (0.7 to 0.99) and stay low (under 0.3) on Zeke's human-written pages.
- Clef can't count. A page with 14 em dashes in 527 words scored 0.35 on an em dash question. `em_dash_overuse` was dropped for this reason, and `uniform_rhythm` was dropped because it scored 0.4 to 0.6 on nearly everything.
- Provenance (human vs AI) doesn't work zero-shot. Two pages Pangram flagged at 1.0 AI scored 0.10 to 0.36 with three different prompt phrasings, while a stiff human-style paragraph scored 0.80+. Clef detects cliché style, not authorship.
- Numbered segments in one Clef call with one question per segment work: Clef keeps them apart, and it's cheaper than one call per segment.

## Future ideas

- Per-segment factors using the numbered-segment approach (up to 64 questions per call), to show where the slop is
- Provenance, labeled as a style signal rather than an authorship detector
- Deterministic counters (em dashes, buzzwords, transitions) in a separate `metrics` field, not mixed into Clef probabilities
- Fine-tuning Clef via Cloudflare's RL program, if labeled data ever exists
- Auth and rate limiting

## Gotchas

- The repo was renamed from `zeke/clef-slop-detector` to `zeke/slop.how` (GitHub redirects the old URL). The Worker is still named `clef-slop-detector` in `cloudflare.config.ts` on purpose: renaming it would create a new Worker, move the custom domains, and orphan the old one, for no user-visible benefit.

- Declaring `domains` in `cloudflare.config.ts` disables the workers.dev URL
  (and preview URLs) unless workers.dev is enabled explicitly. The old
  clef-slop-detector.ziki.workers.dev URL now returns 404.

- If `cf` commands fail with `[10000] Authentication error` while logged in,
  a stray `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_API_KEY`/`CLOUDFLARE_ACCOUNT_ID`
  env var is overriding OAuth. Run with
  `env -u CLOUDFLARE_API_KEY -u CLOUDFLARE_ACCOUNT_ID -u CLOUDFLARE_API_TOKEN`.
- The generated Workers types (`.cloudflare/types`) don't include Clef models,
  so `env.AI.run("@cf/cloudflare/clef", ...)` hits the untyped fallback
  overload. Clef responses are validated with a Zod schema at the boundary.
- The AI binding needs `dev: { remote: true }` in `cloudflare.config.ts`, or `cf dev` fails with "Binding AI needs to be run remotely".
- `vitest.config.ts` exists separately from `vite.config.ts` so Vitest doesn't
  load the Cloudflare Vite plugin.
- `@cloudflare/vitest-pool-workers` was renamed to `@cloudflare/vitest-plugin`. It isn't used, because Clef is always mocked in tests.
- `@hono/zod-openapi`: calling `.openapi({ description })` on a named schema mutates the shared component. Don't attach per-use descriptions to named schemas.
- Biome sometimes needs a second pass to settle formatting; `script/lint --fix` runs check then format.
