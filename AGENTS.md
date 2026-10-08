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

## Stack

- Cloudflare Workers, configured with `cloudflare.config.ts` (the `cf` CLI
  format, not wrangler). Deploy with `cf deploy`.
- Hono for routing
- Zod 4 schemas as the single source of truth for request/response types
- Vitest 4 for tests (in Node, with a mocked AI binding)
- Biome for lint + format
- TypeScript 7

## Scripts

Follows "Scripts to Rule Them All". Use these instead of raw npm commands.

- `script/bootstrap`: install dependencies
- `script/test`: unit tests (free, offline, Clef is mocked)
- `script/typecheck`: generate Worker types and run `tsc` (includes type tests)
- `script/lint`: Biome check; `script/lint --fix` to apply fixes
- `script/server`: local dev server via `cf dev` (calls real Clef)

## Gotchas

- If `cf` commands fail with `[10000] Authentication error` while logged in,
  a stray `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_API_KEY`/`CLOUDFLARE_ACCOUNT_ID`
  env var is overriding OAuth. Run with
  `env -u CLOUDFLARE_API_KEY -u CLOUDFLARE_ACCOUNT_ID -u CLOUDFLARE_API_TOKEN`.
- The generated Workers types (`.cloudflare/types`) don't include Clef models,
  so `env.AI.run("@cf/cloudflare/clef", ...)` hits the untyped fallback
  overload. Clef responses are validated with a Zod schema at the boundary.
- `vitest.config.ts` exists separately from `vite.config.ts` so Vitest doesn't
  load the Cloudflare Vite plugin.
