import type { AiRunner } from "../src/analyze.ts";
import { type FactorId, factorIds } from "../src/factors.ts";

export interface Call {
	model: string;
	inputs: Record<string, unknown>;
}

/** Fake AI binding that answers every factor with the probability from `answer` and records calls. */
export function fakeAi(
	answer: (factor: FactorId, state: string) => number = () => 0.5,
	inputTokens: (state: string) => number = () => 1000,
): AiRunner & { calls: Call[] } {
	const calls: Call[] = [];
	return {
		calls,
		async run(model, inputs) {
			calls.push({ model, inputs });
			const state = String(inputs.state);
			return {
				model: inputs.model,
				answers: Object.fromEntries(
					factorIds.map((id) => [
						id,
						{ type: "noul", noul: answer(id, state) },
					]),
				),
				usage: { input_tokens: inputTokens(state), output_tokens: 0 },
			};
		},
	};
}
