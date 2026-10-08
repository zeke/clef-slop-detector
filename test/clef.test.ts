import { describe, expect, it } from "vitest";
import { buildClefRequest, parseClefResponse } from "../src/clef.ts";
import { factorIds, factors } from "../src/factors.ts";
import kitchenSink from "./fixtures/clef-kitchen-sink.json" with {
	type: "json",
};

describe("buildClefRequest", () => {
	it("asks one noul question per factor about the given text", () => {
		const req = buildClefRequest("Some text.", "clef");
		expect(req.model).toBe("clef");
		expect(req.state).toBe("Some text.");
		expect(Object.keys(req.questions)).toEqual(factorIds);
		expect(req.questions.hedging).toEqual({
			type: "noul",
			instructions: factors.hedging.instructions,
			criteria: factors.hedging.criteria,
		});
	});

	it("passes the model selector through", () => {
		expect(buildClefRequest("x", "clef-flash").model).toBe("clef-flash");
	});
});

describe("parseClefResponse", () => {
	it("extracts a probability per factor and the input token count", () => {
		const parsed = parseClefResponse(kitchenSink);
		expect(parsed.inputTokens).toBe(2114);
		expect(Object.keys(parsed.probabilities).sort()).toEqual(
			[...factorIds].sort(),
		);
		expect(parsed.probabilities.canned_opening).toBe(0.9637);
		expect(parsed.probabilities.chatbot_artifacts).toBeLessThan(0.1);
	});

	it("rejects a response missing a factor", () => {
		const { hedging: _, ...answers } = kitchenSink.answers;
		expect(() => parseClefResponse({ ...kitchenSink, answers })).toThrow();
	});

	it("rejects a malformed response", () => {
		expect(() => parseClefResponse({ error: "nope" })).toThrow();
	});
});
