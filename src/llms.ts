import { factorIds, factors } from "./factors.ts";
import { MAX_TEXT_CHARS } from "./schema.ts";

/** llms.txt (https://llmstxt.org) for agents, generated from the factor definitions so it can't drift. */
export function llmsTxt(origin: string): string {
	return `# slop.how

> HTTP API that scores text against ${factorIds.length} "slop factors" (stylistic tells common in AI-generated prose) using Cloudflare's Clef decision model. It returns a probability from 0 to 1 for each factor. It does not detect whether a human or an AI wrote the text.

To analyze text, send POST ${origin}/v1/analyze with a JSON body like \`{"text": "..."}\`. No auth. Text can be up to ${MAX_TEXT_CHARS.toLocaleString("en-US")} characters. Add \`"model": "clef-flash"\` for a faster, cheaper, less precise model, or \`"model": "jev"\` to use TypeSafe's Jev, which is the cheapest and a bit more sensitive but flags slightly more false positives.

\`\`\`sh
curl -s ${origin}/v1/analyze -H 'content-type: application/json' -d '{"text": "Great question! Let'\\''s dive in."}'
\`\`\`

The response has \`factors.<id>.probability\` for every factor, plus \`usage\` (words, input tokens, cost in USD). In testing, text written to show a factor scores above 0.7 on it, and plain human writing scores below 0.3 on everything. The API returns probabilities only, not the passages that triggered them.

When someone asks you to review text with this API, give them writing feedback, not a score report:

1. POST the text to ${origin}/v1/analyze.
2. Focus on factors scoring 0.5 or higher. Treat 0.7 or higher as a strong signal. Ignore the rest. Don't show the raw JSON or a table of every score unless asked.
3. For each flagged factor, strongest first: name the problem in plain words, quote one to three passages from the text that show it (find them yourself), and suggest a concrete rewrite for each. Use the advice below.
4. Finish with a revised version of the whole text that fixes the flagged problems. Keep the author's meaning and voice, and don't add new claims or facts.
5. If no factor reaches 0.5, say the text reads clean in a sentence or two, and point out anything else you'd change.

Factors and how to fix them:

${factorIds.map((id) => `- \`${id}\` (${factors[id].label}): ${factors[id].advice}`).join("\n")}

## API

- [OpenAPI spec](${origin}/openapi.json): request and response schemas
- [Factor definitions](${origin}/v1/factors): the exact question sent to Clef for each factor, plus fix advice

## Optional

- [Source code](https://github.com/zeke/slop.how)
- [Clef model](https://developers.cloudflare.com/workers-ai/models/clef/)
`;
}
