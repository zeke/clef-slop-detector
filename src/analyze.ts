import { chunkText, countWords } from "./chunk.ts";
import { buildClefRequest, models, parseClefResponse } from "./clef.ts";
import { FACTORS_VERSION, factorIds } from "./factors.ts";
import type { AnalyzeInput, AnalyzeResult } from "./schema.ts";

/** The subset of the Workers AI binding this code uses. */
export interface AiRunner {
	run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
}

export async function analyze(
	ai: AiRunner,
	{ text, model }: AnalyzeInput,
	{
		maxChunkWords = models[model].maxChunkWords,
	}: { maxChunkWords?: number } = {},
): Promise<AnalyzeResult> {
	const chunks = chunkText(text, maxChunkWords);
	const responses = await Promise.all(
		chunks.map(async (chunk) =>
			parseClefResponse(
				await ai.run(models[model].runId, {
					...buildClefRequest(chunk, model),
				}),
			),
		),
	);

	// A factor applies to the document if it applies to any chunk.
	// Keys are inserted highest probability first; ties keep factor order.
	const factors = Object.fromEntries(
		factorIds
			.map(
				(id) =>
					[
						id,
						{
							probability: Math.max(
								...responses.map((r) => r.probabilities[id]),
							),
						},
					] as const,
			)
			.sort(([, a], [, b]) => b.probability - a.probability),
	) as AnalyzeResult["factors"];

	const inputTokens = responses.reduce((sum, r) => sum + r.inputTokens, 0);
	const costUsd = round(
		(inputTokens * models[model].pricePerMillionInputTokens) / 1_000_000,
	);

	return {
		version: FACTORS_VERSION,
		model,
		factors,
		usage: {
			chunks: chunks.length,
			words: countWords(text),
			inputTokens,
			costUsd,
		},
	};
}

function round(n: number): number {
	return Math.round(n * 1e10) / 1e10;
}
