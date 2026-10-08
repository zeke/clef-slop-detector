import { z } from "@hono/zod-openapi";
import { modelIds, models } from "./clef.ts";
import { FACTORS_VERSION, type FactorId, factorIds } from "./factors.ts";

/** Hard cap on request size (~90k words, at most 5 Clef calls) since the API is unauthenticated. */
export const MAX_TEXT_CHARS = 500_000;

const Probability = z.number().min(0).max(1);

const Model = z.enum(modelIds);

const modelList = modelIds
	.map((id) => `- \`${id}\`: ${models[id].description}`)
	.join("\n");

const RequestModel = Model.openapi({
	description: `Which decision model to score with:\n\n${modelList}`,
	"x-enumDescriptions": Object.fromEntries(
		modelIds.map((id) => [id, models[id].description]),
	),
});

const fmt = (n: number) => n.toLocaleString("en-US");

export const AnalyzeRequest = z
	.object({
		text: z
			.string()
			.max(MAX_TEXT_CHARS)
			.regex(/\S/, "text must contain non-whitespace characters")
			.openapi({
				description: `The text to analyze, up to ${fmt(MAX_TEXT_CHARS)} characters. Text over ${fmt(models.clef.maxChunkWords)} words (${fmt(models.jev.maxChunkWords)} on jev) is split into chunks, one model call each.`,
				example:
					"In today's fast-paced digital landscape, it's important to note that...",
			}),
		model: RequestModel.default("clef"),
	})
	.openapi("AnalyzeRequest");

const FactorResult = z
	.object({ probability: Probability })
	.openapi("FactorResult", {
		description: "Probability (0 to 1) that the text exhibits this factor",
	});

export const AnalyzeResponse = z
	.object({
		version: z.string().openapi({
			description:
				"Factor definition version. Results change when this changes.",
			example: FACTORS_VERSION,
		}),
		model: Model.openapi({
			description: "The model that produced these scores",
		}),
		factors: z
			.object(
				Object.fromEntries(factorIds.map((id) => [id, FactorResult])) as Record<
					FactorId,
					typeof FactorResult
				>,
			)
			.openapi({
				description:
					"Probability for every factor, keyed by factor id. See GET /v1/factors for definitions.",
			}),
		usage: z
			.object({
				chunks: z.number().int().positive().openapi({
					description: "Number of model calls. Long text is split into chunks.",
				}),
				words: z
					.number()
					.int()
					.nonnegative()
					.openapi({ description: "Word count of the submitted text" }),
				inputTokens: z.number().int().nonnegative().openapi({
					description:
						"Input tokens billed across all chunks, including the factor questions",
				}),
				costUsd: z.number().nonnegative().openapi({
					description:
						"Estimated cost of this request in USD, from the model's per-token price",
				}),
			})
			.openapi("Usage", { description: "What the request cost" }),
	})
	.openapi("AnalyzeResponse");

export const Factor = z
	.object({
		id: z.enum(factorIds),
		label: z.string(),
		instructions: z.string(),
		criteria: z.object({ true: z.string(), false: z.string() }),
		advice: z
			.string()
			.openapi({ description: "How to fix writing that shows this factor" }),
	})
	.openapi("Factor");

export const FactorsResponse = z
	.object({
		version: z.string(),
		factors: z.array(Factor),
	})
	.openapi("FactorsResponse");

export const ErrorResponse = z
	.object({
		error: z.string(),
		issues: z.array(z.unknown()).optional(),
	})
	.openapi("ErrorResponse");

export type AnalyzeInput = z.output<typeof AnalyzeRequest>;
export type AnalyzeResult = z.output<typeof AnalyzeResponse>;
