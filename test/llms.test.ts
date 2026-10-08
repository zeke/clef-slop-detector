import { describe, expect, it } from "vitest";
import { app } from "../src/app.ts";
import { factorIds, factors } from "../src/factors.ts";
import { fakeAi } from "./helpers.ts";

const get = (url: string) => app.request(url, {}, { AI: fakeAi() });

describe("GET /llms.txt", () => {
	it("serves markdown following the llms.txt format", async () => {
		const res = await get("http://localhost/llms.txt");
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toMatch(/^text\/markdown/);
		const body = await res.text();
		expect(body).toMatch(/^# slop.how\n\n> \S/);
		// Only H1 and H2 headings are allowed by the format.
		expect(body).not.toMatch(/^###/m);
	});

	it("lists every factor with its label and advice", async () => {
		const body = await (await get("http://localhost/llms.txt")).text();
		for (const id of factorIds)
			expect(body).toContain(
				`- \`${id}\` (${factors[id].label}): ${factors[id].advice}`,
			);
	});

	it("tells agents to review the writing, not dump scores", async () => {
		const body = await (await get("http://localhost/llms.txt")).text();
		expect(body).toMatch(/0\.5 or higher/);
		expect(body).toMatch(/quote/i);
		expect(body).toMatch(/revised version/i);
		expect(body).toMatch(/Don't show the raw JSON/);
	});

	it("links to the API using the request origin", async () => {
		const body = await (await get("https://example.dev/llms.txt")).text();
		expect(body).toContain("POST https://example.dev/v1/analyze");
		expect(body).toContain("[OpenAPI spec](https://example.dev/openapi.json)");
		expect(body).toContain(
			"[Factor definitions](https://example.dev/v1/factors)",
		);
	});
});
