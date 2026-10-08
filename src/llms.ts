import { factorIds, factors } from "./factors.ts";
import { MAX_TEXT_CHARS } from "./schema.ts";

/** llms.txt (https://llmstxt.org) for agents, generated from the factor definitions so it can't drift. */
export function llmsTxt(origin: string): string {
	return `# clef-slop-detector

> HTTP API that scores text against ${factorIds.length} "slop factors" (stylistic tells common in AI-generated prose) using Cloudflare's Clef decision model. It returns a probability from 0 to 1 for each factor. It does not detect whether a human or an AI wrote the text.

To analyze text, send POST ${origin}/v1/analyze with a JSON body like \`{"text": "..."}\`. No auth. Text can be up to ${MAX_TEXT_CHARS.toLocaleString("en-US")} characters. Add \`"model": "clef-flash"\` for a faster, cheaper, less precise model.

\`\`\`sh
curl -s ${origin}/v1/analyze -H 'content-type: application/json' -d '{"text": "Great question! Let'\\''s dive in."}'
\`\`\`

The response has \`factors.<id>.probability\` for every factor, plus \`usage\` (words, input tokens, cost in USD). In testing, text written to show a factor scores above 0.7 on it, and plain human writing scores below 0.3 on everything. The API returns probabilities only, not the passages that triggered them; quote the passages yourself if you need to.

Factors:

${factorIds.map((id) => `- \`${id}\`: ${factors[id].label}`).join("\n")}

## API

- [OpenAPI spec](${origin}/openapi.json): request and response schemas
- [Factor definitions](${origin}/v1/factors): the exact question sent to Clef for each factor

## Optional

- [Source code](https://github.com/zeke/clef-slop-detector)
- [Clef model](https://developers.cloudflare.com/workers-ai/models/clef/)
`;
}
