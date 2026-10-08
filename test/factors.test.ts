import { describe, expect, it } from "vitest";
import { factorIds, factors } from "../src/factors.ts";

describe("factors", () => {
	it("defines the 14 v1 factors in a stable order", () => {
		expect(factorIds).toEqual([
			"negation_reframe",
			"reflexive_triplets",
			"grandiose_stakes",
			"rhetorical_qa",
			"canned_opening",
			"announced_conclusion",
			"buzzwords",
			"hollow_transitions",
			"hype_adjectives",
			"vague_claims",
			"hedging",
			"over_structuring",
			"signposting",
			"chatbot_artifacts",
		]);
	});

	it.each(factorIds)(
		"%s has a label, instructions, and true/false criteria",
		(id) => {
			const f = factors[id];
			expect(f.label.length).toBeGreaterThan(0);
			expect(f.instructions).toMatch(/\?$/);
			expect(f.criteria.true.length).toBeGreaterThan(0);
			expect(f.criteria.false.length).toBeGreaterThan(0);
			expect(f.advice).toMatch(/^[A-Z].*\.$/);
		},
	);
});
