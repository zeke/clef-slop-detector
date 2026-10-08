export const SITE_HOST = "slop.how";
export const API_ORIGIN = "https://api.slop.how";
export const REPO_URL = "https://github.com/zeke/slop.how";

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

// Cloudflare's cloud glyph, from the "cloudflare" symbol in https://www.cloudflare.com/icons.svg.
const cloudflareLogo = `<svg viewBox="0 0 341 156" width="44" height="20" aria-hidden="true"><g fill="currentColor"><path d="M275.125 68.25C311.507 68.25 341 97.9335 341 134.55C341 141.077 340.063 147.385 338.317 153.343C337.848 154.943 336.363 156 334.706 156H243.056C241.697 156 240.76 154.628 241.247 153.351L242.999 148.76C248.595 134.03 264.56 121.963 279.331 121.256L307.33 119.813C308.826 119.736 310 118.492 310 116.985C310 115.485 308.838 114.245 307.351 114.157L281.059 112.601C266.924 111.877 260.018 99.2932 263.82 86.179L268.195 71.0866C268.64 69.5514 269.971 68.4343 271.557 68.3476C272.738 68.2831 273.928 68.25 275.125 68.25Z"/><path d="M184.062 0C222 0 253.868 26.1297 262.882 61.4824C263.26 62.967 263.142 64.5333 262.601 65.9662L255.383 85.0897C249.787 99.8196 235.406 112.593 219.134 112.593L93.7928 114.043C92.2801 114.061 91.063 115.3 91.0625 116.823C91.0625 118.344 92.2776 119.585 93.789 119.605L217.365 121.248C231.531 121.248 238.406 134.556 234.606 147.671L233.011 153.189C232.53 154.855 231.014 156 229.291 156H3.90889C1.98075 156 0.330745 154.574 0.17634 152.64C0.0594555 151.175 0 149.695 0 148.2C0 119.723 21.6617 96.3403 49.306 93.8266C48.7387 91.2419 48.4375 88.5564 48.4375 85.8C48.4375 65.3379 64.919 48.75 85.25 48.75C93.3413 48.75 100.822 51.3789 106.897 55.8321C117.716 23.3806 148.176 0 184.062 0Z"/></g></svg>`;

export const siteHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>slop.how</title>
<meta name="description" content="A fast and free API for detecting sloppy text">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Creepster&text=slop.how&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Special+Elite&display=swap">
<style>
:root { color-scheme: light dark; --slime: light-dark(#3f8f00, #9be22d); }
body { margin: 0; min-height: 100vh; display: grid; place-items: center; grid-template-columns: minmax(0, 1fr); font: 19px/1.5 "Special Elite", system-ui, sans-serif; }
main { width: 100%; max-width: 42rem; padding: 3rem 1.5rem; box-sizing: border-box; text-align: center; }
h1 { font-family: "Creepster", system-ui, sans-serif; font-weight: 400; font-size: clamp(4rem, 18vw, 8rem); line-height: 1; color: var(--slime); margin: 0 0 0.75rem; }
.tagline { font-size: 1.35rem; margin: 0 0 3rem; text-wrap: balance; }
.label { font-size: 1.05rem; opacity: 0.6; margin: 0 0 0.5rem; text-align: left; }
.block { position: relative; text-align: left; margin: 0 0 2.5rem; border-radius: 8px; background: color-mix(in srgb, currentColor 7%, transparent); }
pre { margin: 0; padding: 1rem 1.25rem; font-size: 0.925rem; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
#prompt { padding-right: 5rem; }
#response { white-space: pre; overflow-x: auto; }
.reply { padding: 1rem 1.25rem; font-family: monospace; font-size: 0.925rem; line-height: 1.6; }
.reply p { margin: 0 0 0.75rem; }
.reply blockquote { margin: 0; padding-left: 1rem; border-left: 3px solid var(--slime); }
button { position: absolute; top: 0.6rem; right: 0.6rem; font: inherit; font-size: 0.8rem; font-weight: 600; padding: 0.2rem 0.75rem; cursor: pointer; color: light-dark(#fff, #111); background: var(--slime); border: 0; border-radius: 6px; }
button:hover { filter: brightness(1.15); }
a { color: inherit; opacity: 0.6; }
a:hover { opacity: 1; color: var(--slime); }
.label a { opacity: 1; }
.corner { position: absolute; top: 1.25rem; right: 1.25rem; }
footer { display: flex; justify-content: center; align-items: center; gap: 1.25rem; }
footer a { position: relative; display: inline-flex; }
footer a::after { content: attr(data-tip); position: absolute; bottom: calc(100% + 0.5rem); left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 4px; color: light-dark(#fff, #111); background: light-dark(#222, #eee); opacity: 0; pointer-events: none; transition: opacity 0.15s; }
footer a:hover::after, footer a:focus-visible::after { opacity: 1; }
</style>
</head>
<body>
<a class="corner" href="${REPO_URL}" aria-label="Open Source on GitHub">${octocat}</a>
<main>
<h1>slop.how</h1>
<p class="tagline">A fast and free API for detecting sloppy text</p>
<p class="label">Paste this into your agent</p>
<div class="block">
<button type="button" id="copy">Copy</button>
<pre id="prompt">${prompt}</pre>
</div>
<p class="label"><a href="${API_ORIGIN}">api.slop.how</a> responds with slop score data:</p>
<div class="block">
<pre id="response">${compactJson(exampleResponse)}</pre>
</div>
<p class="label">Your agent checks the scores and responds:</p>
<div class="block reply">
<p>The text is built from stock parts: a generic opener, buzzwords like "leveraging" and "unlock," a fake contrast between trend and revolution, a rhetorical question, and a "Let's dive in" sign-off. It makes big claims with no specifics to back them.</p>
<p>Here is a revised version:</p>
<blockquote>Remote work is here to stay. With good collaboration tools, teams can get more done and try new ideas more easily.</blockquote>
</div>
<footer>
<a href="${REPO_URL}#cloudflare" aria-label="Sponsored by Cloudflare" data-tip="Sponsored by Cloudflare">${cloudflareLogo}</a>
<a href="${REPO_URL}" aria-label="Open Source on GitHub" data-tip="Open Source on GitHub">${octocat}</a>
</footer>
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
