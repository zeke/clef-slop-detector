import { describe, expect, it } from "vitest";
import { analyze } from "../src/analyze.ts";
import { buildClefRequest } from "../src/clef.ts";
import { FACTORS_VERSION, factorIds } from "../src/factors.ts";
import { fakeAi } from "./helpers.ts";

describe("analyze", () => {
	it("sends one Clef request for short text and returns per-factor probabilities", async () => {
		const ai = fakeAi(
			(id) => (id === "chatbot_artifacts" ? 0.99 : 0.1),
			() => 2500,
		);
		const result = await analyze(ai, {
			text: "Great question! I hope this helps.",
			model: "clef",
		});

		expect(ai.calls).toEqual([
			{
				model: "@cf/cloudflare/clef",
				inputs: buildClefRequest("Great question! I hope this helps.", "clef"),
			},
		]);
		expect(result.version).toBe(FACTORS_VERSION);
		expect(result.model).toBe("clef");
		expect(Object.keys(result.factors)).toEqual(factorIds);
		expect(result.factors.chatbot_artifacts).toEqual({ probability: 0.99 });
		expect(result.factors.hedging).toEqual({ probability: 0.1 });
		expect(result.usage).toEqual({
			chunks: 1,
			words: 6,
			inputTokens: 2500,
			costUsd: 0.0006,
		});
	});

	it("uses the clef-flash model id and price", async () => {
		const ai = fakeAi(undefined, () => 1_000_000);
		const result = await analyze(ai, {
			text: "Hello there.",
			model: "clef-flash",
		});
		expect(ai.calls[0]?.model).toBe("@cf/cloudflare/clef-flash");
		expect(result.usage.costUsd).toBe(0.09);
	});

	it("splits long text into chunks, takes the max probability per factor, and sums usage", async () => {
		const ai = fakeAi(
			(id, state) =>
				id === "canned_opening"
					? state.startsWith("First")
						? 0.9
						: 0.2
					: state.startsWith("First")
						? 0.1
						: 0.4,
			() => 100,
		);
		const result = await analyze(
			ai,
			{ text: "First chunk here. Second chunk here.", model: "clef" },
			{ maxChunkWords: 3 },
		);

		expect(ai.calls.map((c) => c.inputs.state)).toEqual([
			"First chunk here. ",
			"Second chunk here.",
		]);
		expect(result.factors.canned_opening.probability).toBe(0.9);
		expect(result.factors.hedging.probability).toBe(0.4);
		expect(result.usage).toMatchObject({
			chunks: 2,
			words: 6,
			inputTokens: 200,
		});
	});

	it("fails loudly when Clef returns something unexpected", async () => {
		const ai = { run: async () => ({ errors: ["boom"] }) };
		await expect(analyze(ai, { text: "Hi.", model: "clef" })).rejects.toThrow();
	});
});
