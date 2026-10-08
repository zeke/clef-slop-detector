import { describe, expect, it } from "vitest";
import { app } from "../src/app.ts";
import { AnalyzeResponse } from "../src/schema.ts";
import { fakeAi } from "./helpers.ts";

const get = (url: string) => app.request(url, {}, { AI: fakeAi() });

describe("GET / (website)", () => {
	it("serves a minimal HTML page", async () => {
		const res = await get("https://slop.how/");
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toMatch(/^text\/html/);
		const html = await res.text();
		expect(html).toMatch(/^<!doctype html>/i);
		expect(html).toContain("<title>slop.how</title>");
		expect(html).toContain(
			'<p class="tagline">A fast and free API for detecting sloppy text</p>',
		);
		expect(html).toContain(
			'<meta name="description" content="A fast and free API for detecting sloppy text">',
		);
	});

	it("includes a copy-paste agent prompt pointing at llms.txt", async () => {
		const html = await (await get("https://slop.how/")).text();
		expect(html).toContain(
			"Use https://slop.how/llms.txt to review this text:",
		);
		expect(html).toContain("In today's fast-paced digital landscape");
	});

	it("puts the copy button inside the prompt block", async () => {
		const html = await (await get("https://slop.how/")).text();
		expect(html).toMatch(
			/<div class="block">\s*<button[^>]*>Copy<\/button>\s*<pre id="prompt">/,
		);
	});

	it("uses a drippy display font for the heading", async () => {
		const html = await (await get("https://slop.how/")).text();
		expect(html).toContain("family=Creepster");
		expect(html).toMatch(/h1 \{[^}]*font-family: "Creepster"/);
	});

	it("shows an example agent reply after the API response", async () => {
		const html = await (await get("https://slop.how/")).text();
		const responseAt = html.indexOf('<pre id="response">');
		const replyAt = html.indexOf("Your agent checks the scores and responds:");
		expect(responseAt).toBeGreaterThan(-1);
		expect(replyAt).toBeGreaterThan(responseAt);
		expect(html).toContain("The text is built from stock parts");
		expect(html).toMatch(/<blockquote>\s*Remote work is here to stay\./);
	});

	it("shows an example API response that matches the response schema", async () => {
		const html = await (await get("https://slop.how/")).text();
		expect(html).toMatch(
			/<a href="https:\/\/api\.slop\.how">api\.slop\.how<\/a> responds with slop score data:/,
		);
		const json = html.match(/<pre id="response">([\s\S]*?)<\/pre>/)?.[1];
		expect(json).toBeDefined();
		const parsed = AnalyzeResponse.parse(JSON.parse(json ?? ""));
		expect(parsed.factors.canned_opening.probability).toBeGreaterThan(0.7);
	});

	it("links to the GitHub repo with an Octocat icon", async () => {
		const html = await (await get("https://slop.how/")).text();
		expect(html).toMatch(
			/<a [^>]*href="https:\/\/github\.com\/zeke\/slop\.how"[^>]*>\s*<svg/,
		);
	});

	it("redirects the API host to the OpenAPI document", async () => {
		const res = await get("https://api.slop.how/");
		expect(res.status).toBe(302);
		expect(res.headers.get("location")).toBe("/openapi.json");
	});

	it("is served on local dev hosts", async () => {
		const res = await get("http://localhost:5190/");
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toMatch(/^text\/html/);
	});
});

describe("GET /llms.txt host handling", () => {
	it("points slop.how readers at the API host", async () => {
		const body = await (await get("https://slop.how/llms.txt")).text();
		expect(body).toContain("POST https://api.slop.how/v1/analyze");
		expect(body).not.toContain("https://slop.how/v1/");
	});

	it("uses the request origin elsewhere", async () => {
		const body = await (await get("http://localhost:5174/llms.txt")).text();
		expect(body).toContain("POST http://localhost:5174/v1/analyze");
	});
});
