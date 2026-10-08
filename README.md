# clef-slop-detector

An HTTP API that scores text for "slop": the stylistic tells that show up in a lot of AI-generated writing, like canned openings, negation reframes ("It's not X, it's Y"), buzzwords, and chatbot residue.

It runs on Cloudflare Workers and uses [Clef](https://developers.cloudflare.com/workers-ai/models/clef/), Cloudflare's decision model, to return a probability for each factor. A typical check costs a fraction of a cent.

This started as a cheaper alternative to [Pangram](https://www.pangram.com) for [zeke/slop-detector](https://github.com/zeke/slop-detector). It turned out Clef is good at spotting slop factors but not at telling whether a human or an AI wrote something, so this API reports the factors and leaves authorship alone.

See [AGENTS.md](./AGENTS.md) for development details.

## Try it

```sh
curl -s https://clef-slop-detector.ziki.workers.dev/v1/analyze \
  -H 'content-type: application/json' \
  -d '{"text": "Great question! In today'\''s fast-paced digital landscape..."}'
```

The full contract is in [openapi.json](./openapi.json), generated from the Zod schemas in [src/schema.ts](./src/schema.ts). TypeScript callers can use Hono's typed client with the exported `AppType`, and other Workers can call `analyze()` over a service binding.
