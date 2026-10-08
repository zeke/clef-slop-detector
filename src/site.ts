export const SITE_HOST = "slop.how";
export const API_ORIGIN = "https://api.slop.how";
const REPO_URL = "https://github.com/zeke/clef-slop-detector";

// A real response for the sample text below, captured from production.
// Tests validate it against AnalyzeResponse so it can't drift from the schema.
import exampleResponse from "./example-response.json" with { type: "json" };

/** Pretty-print JSON, collapsing single-property objects onto one line. */
function compactJson(value: unknown): string {
	return JSON.stringify(value, null, 2).replace(
		/\{\n\s*([^{},\n]*)\n\s*\}/g,
		"{ $1 }",
	);
}

/** Origin to advertise for API calls. The website host defers to the API host. */
export function apiOrigin(requestUrl: string): string {
	const url = new URL(requestUrl);
	return url.hostname === SITE_HOST ? API_ORIGIN : url.origin;
}

const prompt = `Use https://${SITE_HOST}/llms.txt to review this text:

In today's fast-paced digital landscape, remote work isn't just a trend. It's a revolution. By leveraging cutting-edge collaboration tools, teams can unlock unprecedented productivity and foster a culture of innovation. The result? A seamless, empowered workforce. Let's dive in.`;

// GitHub's mark-github octicon (16px).
const octocat = `<svg viewBox="0 0 16 16" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`;

export const siteHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>slop.how</title>
<meta name="description" content="Find the slop before your readers do.">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Creepster&text=slop.how&display=swap">
<style>
:root { color-scheme: light dark; --slime: light-dark(#3f8f00, #9be22d); }
body { margin: 0; min-height: 100vh; display: grid; place-items: center; grid-template-columns: minmax(0, 1fr); font: 16px/1.5 system-ui, sans-serif; }
main { width: 100%; max-width: 42rem; padding: 3rem 1.5rem; box-sizing: border-box; text-align: center; }
h1 { font-family: "Creepster", system-ui, sans-serif; font-weight: 400; font-size: 5.5rem; line-height: 1; color: var(--slime); margin: 0 0 0.75rem; }
.tagline { font-size: 1.35rem; margin: 0 0 3rem; text-wrap: balance; }
.label { font-size: 0.8rem; opacity: 0.6; margin: 0 0 0.5rem; text-align: left; }
.label code { font-size: inherit; }
.block { position: relative; text-align: left; margin: 0 0 2.5rem; border-radius: 8px; background: color-mix(in srgb, currentColor 7%, transparent); }
pre { margin: 0; padding: 1rem 1.25rem; font-size: 0.8rem; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
#prompt { padding-right: 5rem; }
#response { white-space: pre; overflow-x: auto; }
button { position: absolute; top: 0.6rem; right: 0.6rem; font: inherit; font-size: 0.75rem; padding: 0.2rem 0.75rem; cursor: pointer; color: inherit; background: light-dark(#fff, #222); border: 1px solid color-mix(in srgb, currentColor 25%, transparent); border-radius: 6px; }
button:hover { border-color: var(--slime); }
a { color: inherit; opacity: 0.6; }
a:hover { opacity: 1; color: var(--slime); }
</style>
</head>
<body>
<main>
<h1>slop.how</h1>
<p class="tagline">Find the slop before your readers do.</p>
<p class="label">Paste this into your agent</p>
<div class="block">
<button type="button" id="copy">Copy</button>
<pre id="prompt">${prompt}</pre>
</div>
<p class="label">Response from <code>POST ${API_ORIGIN}/v1/analyze</code></p>
<div class="block">
<pre id="response">${compactJson(exampleResponse)}</pre>
</div>
<a href="${REPO_URL}" aria-label="GitHub repository">${octocat}</a>
</main>
<script>
const copy = document.getElementById("copy");
copy.addEventListener("click", async () => {
	await navigator.clipboard.writeText(document.getElementById("prompt").textContent);
	copy.textContent = "Copied";
	setTimeout(() => { copy.textContent = "Copy"; }, 1500);
});
</script>
</body>
</html>
`;
