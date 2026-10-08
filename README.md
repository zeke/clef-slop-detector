# slop.how

A fast and free API for detecting sloppy text

It scores text for "slop": the stylistic tells that show up in a lot of AI-generated writing, like canned openings, negation reframes ("It's not X, it's Y"), buzzwords, and chatbot residue. It lives at [slop.how](https://slop.how).

Paste this into your coding agent:

```
Use https://slop.how/llms.txt to review this text:

In today's fast-paced digital landscape, remote work isn't just a trend. It's a
revolution. By leveraging cutting-edge collaboration tools, teams can unlock
unprecedented productivity and foster a culture of innovation. The result? A
seamless, empowered workforce. Let's dive in.
```

## Usage

Send text to `POST /v1/analyze`:

```sh
curl -s https://api.slop.how/v1/analyze \
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

To use a different model, add `"model": "clef-flash"` or `"model": "jev"`. See the options below.

## API

The base URL is `https://api.slop.how`. There's no auth for now.

| Method | Path            | What it does                                                         |
| ------ | --------------- | -------------------------------------------------------------------- |
| POST   | `/v1/analyze`   | Score text against every factor                                      |
| GET    | `/v1/factors`   | List the factors, the question asked about each, and how to fix it   |
| GET    | `/openapi.json` | The full request and response contract                               |
| GET    | `/llms.txt`     | Instructions for agents, including how to turn scores into feedback  |

`POST /v1/analyze` takes a JSON body with these options:

| Option  | Type   | Required | Description                                                                                         |
| ------- | ------ | -------- | --------------------------------------------------------------------------------------------------- |
| `text`  | string | yes      | The text to analyze, up to 500,000 characters. Long text is split into chunks, one model call each. |
| `model` | string | no       | Which decision model to use: `clef` (default), `clef-flash`, or `jev`.                              |

The models:

| Model        | Description                                                                                                                                | $ per million input tokens |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| `clef`       | Default. Cloudflare's 27B decision model. The most precise in testing, with no false positives.                                            | 0.24                       |
| `clef-flash` | Clef's faster, cheaper 9B sibling. Misses a few more subtle cases.                                                                         | 0.09                       |
| `jev`        | TypeSafe's Jev, via Cloudflare AI Gateway. About 6x cheaper than `clef` and a bit more sensitive, but flags slightly more false positives. | 0.042                      |

The response has these fields:

| Field                         | Description                                                                 |
| ----------------------------- | --------------------------------------------------------------------------- |
| `version`                     | Factor definition version. Scores can change when this changes.             |
| `model`                       | The model that produced these scores                                        |
| `factors.<id>.probability`    | 0 to 1, how likely the text shows that factor. One entry per factor.        |
| `usage.chunks`                | Number of model calls. Long text is split into chunks.                      |
| `usage.words`                 | Word count of the submitted text                                            |
| `usage.inputTokens`           | Input tokens billed across all chunks, including the factor questions       |
| `usage.costUsd`               | Estimated cost of the request in USD                                        |

Errors come back as `{ "error": "...", "issues": [...] }`, with status 400 for an invalid request (with `issues` listing what's wrong) and 502 if the model call fails.

The OpenAPI spec at [api.slop.how/openapi.json](https://api.slop.how/openapi.json) is generated from the Zod schemas in [src/schema.ts](./src/schema.ts), and a copy is committed as [openapi.json](./openapi.json). TypeScript callers can get a typed client from Hono with the exported `AppType`. Other Workers can call `analyze({ text })` directly over a service binding.

## How it works

Most AI models people use today are large language models. You give them a prompt and they write text back, one token at a time. That's great for drafting and chatting, but it's slow and expensive when all you want is the answer to a yes-or-no question, and you still have to parse whatever the model wrote.

[Clef](https://developers.cloudflare.com/workers-ai/models/clef/) is a different kind of model. Cloudflare calls it a decision model. TypeSafe AI, which makes a similar model called [Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev), calls the category "System One models." Instead of writing text, a decision model takes some input plus a list of typed questions, and returns a probability for every allowed answer. It reads the input once and answers all the questions in parallel, so there's no output to wait for and nothing to parse. Clef runs on Workers AI, Cloudflare's GPU network, and this API is a Cloudflare Worker that calls it.

A factor is one specific habit that shows up a lot in AI-generated writing: opening with "In today's fast-paced world," setting up "it's not X, it's Y," answering your own question for drama ("The result?"), or leaning on words like "leverage" and "seamless." There are 14 of them. Each factor is a yes-or-no question for Clef, with a short description of what yes and no look like, plus a note on how to fix it. They all live in [src/factors.ts](./src/factors.ts).

When you send text, the API passes it to Clef along with all 14 questions in a single call. Clef returns, for each factor, the probability that the text has it. A 0.95 means Clef is confident the habit is there, and 0.05 means it's confident it isn't. Long text gets split into chunks, and each factor keeps its highest score across chunks. The API returns those probabilities as they are. It doesn't roll them up into a single "slop score," because any weighting would be a number I made up.

The whole thing is meant to be fast and cheap. A 580-word blog post comes back in about a second. Clef charges $0.24 per million input tokens and nothing for output. The 14 questions add about 1,700 tokens to every call, so a 500-word page costs about $0.0005, or about 1,800 checks for a dollar. `clef-flash` costs $0.09 per million tokens, and `jev` costs $0.042.

It doesn't tell you whether a human or an AI wrote something. I tried that first, since this started as a cheaper alternative to [Pangram](https://www.pangram.com) for [zeke/slop-detector](https://github.com/zeke/slop-detector). Clef is good at spotting the clichés but not at judging authorship. Polished AI writing scored as human, and stiff human writing scored as AI. So this API reports the factors and leaves authorship alone.

## Cloudflare

slop.how is sponsored by Cloudflare and built entirely on Cloudflare:

- [Workers](https://developers.cloudflare.com/workers/) runs the API and the website, from one Worker
- [Workers AI](https://developers.cloudflare.com/workers-ai/) runs the `clef` and `clef-flash` decision models
- [AI Gateway](https://developers.cloudflare.com/ai-gateway/) routes calls to TypeSafe's `jev` model and bills them through Unified Billing
- [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) serve the Worker on slop.how and api.slop.how
- [Registrar](https://developers.cloudflare.com/registrar/) and [DNS](https://developers.cloudflare.com/dns/) handle the slop.how domain
- The [`cf` CLI](https://developers.cloudflare.com/cf/) handles local dev and deploys

See [AGENTS.md](./AGENTS.md) for development details.
