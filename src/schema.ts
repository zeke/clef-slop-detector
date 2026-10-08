import { z } from "@hono/zod-openapi";
import { clefModels } from "./clef.ts";
import { FACTORS_VERSION, type FactorId, factorIds } from "./factors.ts";

/** Hard cap on request size (~90k words, at most 5 Clef calls) since the API is unauthenticated. */
export const MAX_TEXT_CHARS = 500_000;

const Probability = z.number().min(0).max(1);

export const Model = z.enum(clefModels).openapi({
	description:
		"Clef variant. clef is the 27B model; clef-flash is the faster, cheaper 9B model.",
});

export const AnalyzeRequest = z
	.object({
		text: z
			.string()
			.max(MAX_TEXT_CHARS)
			.regex(/\S/, "text must contain non-whitespace characters")
			.openapi({
				example:
					"In today's fast-paced digital landscape, it's important to note that...",
			}),
		model: Model.default("clef"),
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
		model: Model,
		factors: z.object(
			Object.fromEntries(factorIds.map((id) => [id, FactorResult])) as Record<
				FactorId,
				typeof FactorResult
			>,
		),
		usage: z
			.object({
				chunks: z.number().int().positive().openapi({
					description: "Number of Clef calls. Long text is split into chunks.",
				}),
				words: z.number().int().nonnegative(),
				inputTokens: z.number().int().nonnegative(),
				costUsd: z.number().nonnegative(),
			})
			.openapi("Usage"),
	})
	.openapi("AnalyzeResponse");

export const Factor = z
	.object({
		id: z.enum(factorIds),
		label: z.string(),
		instructions: z.string(),
		criteria: z.object({ true: z.string(), false: z.string() }),
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
