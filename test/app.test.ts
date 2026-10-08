import { describe, expect, it } from "vitest";
import committedOpenApi from "../openapi.json" with { type: "json" };
import { app, openApiDocument } from "../src/app.ts";
import { FACTORS_VERSION, factorIds, factors } from "../src/factors.ts";
import {
	AnalyzeResponse,
	ErrorResponse,
	FactorsResponse,
} from "../src/schema.ts";
import { fakeAi } from "./helpers.ts";

const post = (body: unknown, env = { AI: fakeAi() }) =>
	app.request(
		"/v1/analyze",
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		},
		env,
	);

describe("POST /v1/analyze", () => {
	it("returns factor probabilities for valid text", async () => {
		const ai = fakeAi((id) => (id === "buzzwords" ? 0.8 : 0.05));
		const res = await post(
			{ text: "Let's delve into this robust tapestry." },
			{ AI: ai },
		);
		expect(res.status).toBe(200);
		const body = AnalyzeResponse.parse(await res.json());
		expect(body.model).toBe("clef");
		expect(body.factors.buzzwords.probability).toBe(0.8);
		expect(ai.calls).toHaveLength(1);
	});

	it("returns 400 with issues for an invalid body, without calling Clef", async () => {
		const ai = fakeAi();
		const res = await post({ text: "   ", model: "nope" }, { AI: ai });
		expect(res.status).toBe(400);
		const body = ErrorResponse.parse(await res.json());
		expect(body.issues?.length).toBeGreaterThan(0);
		expect(ai.calls).toHaveLength(0);
	});

	it("returns 400 for a non-JSON body", async () => {
		const res = await app.request(
			"/v1/analyze",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: "{",
			},
			{ AI: fakeAi() },
		);
		expect(res.status).toBe(400);
		ErrorResponse.parse(await res.json());
	});

	it("returns 502 when Clef fails", async () => {
		const res = await post({ text: "Hello." }, {
			AI: { run: async () => ({ nope: true }) },
		} as never);
		expect(res.status).toBe(502);
		expect(ErrorResponse.parse(await res.json()).error).toMatch(/Clef/);
	});
});

describe("GET /v1/factors", () => {
	it("lists every factor with its definition", async () => {
		const res = await app.request("/v1/factors", {}, { AI: fakeAi() });
		expect(res.status).toBe(200);
		const body = FactorsResponse.parse(await res.json());
		expect(body.version).toBe(FACTORS_VERSION);
		expect(body.factors.map((f) => f.id)).toEqual(factorIds);
		expect(body.factors[0]).toEqual({
			id: "negation_reframe",
			...factors.negation_reframe,
		});
	});
});

describe("OpenAPI", () => {
	it("serves the document at /openapi.json", async () => {
		const res = await app.request("/openapi.json", {}, { AI: fakeAi() });
		expect(res.status).toBe(200);
		const doc = (await res.json()) as {
			openapi: string;
			paths: Record<string, unknown>;
		};
		expect(doc.openapi).toMatch(/^3\.1/);
		expect(Object.keys(doc.paths)).toEqual(
			expect.arrayContaining(["/v1/analyze", "/v1/factors"]),
		);
	});

	it("committed openapi.json matches the schemas (run script/openapi to update)", () => {
		expect(committedOpenApi).toEqual(openApiDocument());
	});
});

describe("GET /", () => {
	it("redirects to the OpenAPI document", async () => {
		const res = await app.request("/", {}, { AI: fakeAi() });
		expect(res.status).toBe(302);
		expect(res.headers.get("location")).toBe("/openapi.json");
	});
});
