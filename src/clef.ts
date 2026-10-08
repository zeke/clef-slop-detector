import { z } from "zod";
import { type FactorId, factorIds, factors } from "./factors.ts";

/**
 * Decision models that speak the System One API (state + typed questions in,
 * probabilities out). Prices are USD per million input tokens; none of them
 * bill output tokens. Chunk sizes leave headroom under each context window
 * (Clef 64k tokens, Jev 32k) after the ~1,700 tokens of factor questions.
 */
export const models = {
	clef: {
		runId: "@cf/cloudflare/clef",
		pricePerMillionInputTokens: 0.24,
		maxChunkWords: 20_000,
		description:
			"Default. Cloudflare's 27B decision model. The most precise in testing, with no false positives.",
	},
	"clef-flash": {
		runId: "@cf/cloudflare/clef-flash",
		pricePerMillionInputTokens: 0.09,
		maxChunkWords: 20_000,
		description:
			"Clef's faster, cheaper 9B sibling. Misses a few more subtle cases.",
	},
	// TypeSafe's Jev, a third-party model routed through AI Gateway and billed from AI Gateway credits.
	jev: {
		runId: "typesafe/jev",
		pricePerMillionInputTokens: 0.042,
		maxChunkWords: 10_000,
		description:
			"TypeSafe's Jev, via Cloudflare AI Gateway. About 6x cheaper than clef and a bit more sensitive, but flags slightly more false positives.",
	},
} as const;

export type Model = keyof typeof models;
export const modelIds = Object.keys(models) as [Model, ...Model[]];

export interface ClefRequest {
	/** Clef's model selector. Jev doesn't take one. */
	model?: "clef" | "clef-flash";
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

export function buildClefRequest(text: string, model: Model): ClefRequest {
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
	return model === "jev"
		? { state: text, questions }
		: { model, state: text, questions };
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

/** Jev can wrap its answers in a { state, result } envelope. */
function unwrap(raw: unknown): unknown {
	if (raw && typeof raw === "object" && "result" in raw && !("answers" in raw))
		return raw.result;
	return raw;
}

/** Validate a raw Clef or Jev response and pull out one probability per factor. */
export function parseClefResponse(raw: unknown): ParsedClefResponse {
	const { answers, usage } = ClefResponse.parse(unwrap(raw));
	const probabilities = Object.fromEntries(
		factorIds.map((id) => [id, answers[id].noul]),
	) as Record<FactorId, number>;
	return { probabilities, inputTokens: usage.input_tokens };
}
