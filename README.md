# clef-slop-detector

An HTTP API that scores text for "slop": the stylistic tells that show up in a lot of AI-generated writing, like canned openings, negation reframes ("It's not X, it's Y"), buzzwords, and chatbot residue.

Paste this into your coding agent:

```
Use https://clef-slop-detector.ziki.workers.dev/llms.txt to review this text:

In today's fast-paced digital landscape, remote work isn't just a trend. It's a
revolution. By leveraging cutting-edge collaboration tools, teams can unlock
unprecedented productivity and foster a culture of innovation. The result? A
seamless, empowered workforce. Let's dive in.
```

## Usage

Send text to `POST /v1/analyze`:

```sh
curl -s https://clef-slop-detector.ziki.workers.dev/v1/analyze \
  -H 'content-type: application/json' \
  -d '{"text": "Great question! In today'\''s fast-paced digital landscape, it'\''s not just about speed. It'\''s about trust. Let'\''s dive in."}'
```

You get back a probability for each factor, plus usage and cost:

```json
{
  "version": "2026-10-07",
  "model": "clef",
  "factors": {
    "chatbot_artifacts": { "probability": 0.9579 },
    "canned_opening": { "probability": 0.9343 },
    "negation_reframe": { "probability": 0.8499 },
    "hedging": { "probability": 0.0457 },
    ...
  },
  "usage": { "chunks": 1, "words": 18, "inputTokens": 1706, "costUsd": 0.00040944 }
}
```

Add `"model": "clef-flash"` for a faster, cheaper model. There's no auth for now.

Other endpoints:

- `GET /v1/factors`: every factor and the exact question asked about it
- `GET /openapi.json`: the full API contract
- `GET /llms.txt`: a summary for agents

TypeScript callers can get a typed client from Hono with the exported `AppType`. Other Workers can call `analyze({ text })` directly over a service binding.

## How it works

[Clef](https://developers.cloudflare.com/workers-ai/models/clef/) is a decision model from Cloudflare. Instead of generating text, it reads an input and a set of typed questions, then returns a probability for each answer.

This API asks Clef one yes/no question per factor, all in a single call. For example, `canned_opening` asks "Does the text open with a generic scene-setter about the era, the world, or the importance of the topic?" The questions live in [src/factors.ts](./src/factors.ts). Long text is split into chunks, and each factor takes its highest score across chunks.

Clef only charges for input tokens. A 500-word page costs about $0.0005.

It doesn't tell you whether a human or an AI wrote something. I tried that first, since this started as a cheaper alternative to [Pangram](https://www.pangram.com) for [zeke/slop-detector](https://github.com/zeke/slop-detector). Clef is good at spotting the clichés but not at judging authorship. Polished AI writing scored as human, and stiff human writing scored as AI. So this API reports the factors and leaves authorship alone.

See [AGENTS.md](./AGENTS.md) for development details.
