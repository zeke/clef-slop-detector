import { z } from "zod";
import { type FactorId, factorIds, factors } from "./factors.ts";

export const clefModels = ["clef", "clef-flash"] as const;
export type ClefModel = (typeof clefModels)[number];

/** USD per million input tokens. Clef doesn't bill output tokens. */
export const clefPricePerMillionInputTokens: Record<ClefModel, number> = {
	clef: 0.24,
	"clef-flash": 0.09,
};

export interface ClefRequest {
	model: ClefModel;
	state: string;
	questions: Record<
		FactorId,
		{
			type: "noul";
			instructions: string;
			criteria: { true: string; false: string };
		}
	>;
}

export function buildClefRequest(text: string, model: ClefModel): ClefRequest {
	const questions = Object.fromEntries(
		factorIds.map((id) => [
			id,
			{
				type: "noul",
				instructions: factors[id].instructions,
				criteria: factors[id].criteria,
			},
		]),
	) as ClefRequest["questions"];
	return { model, state: text, questions };
}

const NoulAnswer = z.object({
	type: z.literal("noul"),
	noul: z.number().min(0).max(1),
});

const ClefResponse = z.object({
	answers: z.object(
		Object.fromEntries(factorIds.map((id) => [id, NoulAnswer])) as Record<
			FactorId,
			typeof NoulAnswer
		>,
	),
	usage: z.object({ input_tokens: z.number().int().nonnegative() }),
});

export interface ParsedClefResponse {
	probabilities: Record<FactorId, number>;
	inputTokens: number;
}

/** Validate a raw Clef response and pull out one probability per factor. */
export function parseClefResponse(raw: unknown): ParsedClefResponse {
	const { answers, usage } = ClefResponse.parse(raw);
	const probabilities = Object.fromEntries(
		factorIds.map((id) => [id, answers[id].noul]),
	) as Record<FactorId, number>;
	return { probabilities, inputTokens: usage.input_tokens };
}
