import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { type AiRunner, analyze } from "./analyze.ts";
import { FACTORS_VERSION, factorIds, factors } from "./factors.ts";
import { llmsTxt } from "./llms.ts";
import {
	AnalyzeRequest,
	AnalyzeResponse,
	ErrorResponse,
	FactorsResponse,
} from "./schema.ts";
import {
	API_ORIGIN,
	apiOrigin,
	REPO_URL,
	SITE_HOST,
	siteHtml,
} from "./site.ts";

export interface Bindings {
	AI: AiRunner;
}

const json = <T>(schema: T, description: string) => ({
	content: { "application/json": { schema } },
	description,
});

const analyzeRoute = createRoute({
	method: "post",
	path: "/v1/analyze",
	summary: "Score text against the slop factors",
	request: {
		body: { ...json(AnalyzeRequest, "Text to analyze"), required: true },
	},
	responses: {
		200: json(AnalyzeResponse, "Per-factor probabilities"),
		400: json(ErrorResponse, "Invalid request"),
		502: json(
			ErrorResponse,
			"Clef returned an error or an unexpected response",
		),
	},
});

const factorsRoute = createRoute({
	method: "get",
	path: "/v1/factors",
	summary: "List the slop factors and the questions sent to Clef",
	responses: { 200: json(FactorsResponse, "Factor definitions") },
});

export const app = new OpenAPIHono<{ Bindings: Bindings }>({
	defaultHook: (result, c) => {
		if (!result.success)
			return c.json(
				{ error: "Invalid request", issues: result.error.issues },
				400,
			);
	},
})
	.openapi(analyzeRoute, async (c) => {
		try {
			return c.json(await analyze(c.env.AI, c.req.valid("json")), 200);
		} catch (err) {
			console.error("Clef request failed", err);
			return c.json({ error: "Clef request failed" }, 502);
		}
	})
	.openapi(factorsRoute, (c) =>
		c.json(
			{
				version: FACTORS_VERSION,
				factors: factorIds.map((id) => ({ id, ...factors[id] })),
			},
			200,
		),
	);

const openApiConfig = {
	openapi: "3.1.0",
	info: {
		title: "slop.how",
		summary: "A fast and free API for detecting sloppy text",
		version: FACTORS_VERSION,
		description: `Scores text against slop factors (stylistic tells common in AI-generated prose) using Cloudflare's Clef decision model. Returns a probability per factor. It does not judge whether a human or an AI wrote the text. Agent instructions: https://${SITE_HOST}/llms.txt`,
		contact: { name: "slop.how on GitHub", url: REPO_URL },
		license: { name: "MIT", identifier: "MIT" },
	},
	servers: [{ url: API_ORIGIN }],
	externalDocs: { description: "Source code and README", url: REPO_URL },
};

export const openApiDocument = () => app.getOpenAPI31Document(openApiConfig);

app.doc31("/openapi.json", openApiConfig);
// The API host has no homepage of its own, so send visitors to the spec.
app.get("/", (c) =>
	new URL(c.req.url).hostname === new URL(API_ORIGIN).hostname
		? c.redirect("/openapi.json")
		: c.html(siteHtml),
);
app.get("/llms.txt", (c) =>
	c.body(llmsTxt(apiOrigin(c.req.url)), 200, {
		"content-type": "text/markdown; charset=utf-8",
	}),
);

app.onError((err, c) => {
	if (err instanceof HTTPException)
		return c.json({ error: err.message }, err.status);
	console.error(err);
	return c.json({ error: "Internal error" }, 500);
});

export type AppType = typeof app;
