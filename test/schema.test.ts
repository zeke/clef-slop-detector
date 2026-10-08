import { describe, expect, expectTypeOf, it } from "vitest";
import type { z } from "zod";
import type { FactorId } from "../src/factors.ts";
import {
	AnalyzeRequest,
	type AnalyzeResponse,
	type FactorsResponse,
	MAX_TEXT_CHARS,
} from "../src/schema.ts";

describe("AnalyzeRequest", () => {
	it("defaults model to clef", () => {
		expect(AnalyzeRequest.parse({ text: "Hello." })).toEqual({
			text: "Hello.",
			model: "clef",
		});
	});

	it("rejects empty, whitespace-only, and oversized text", () => {
		expect(AnalyzeRequest.safeParse({ text: "" }).success).toBe(false);
		expect(AnalyzeRequest.safeParse({ text: "  \n " }).success).toBe(false);
		expect(
			AnalyzeRequest.safeParse({ text: "a".repeat(MAX_TEXT_CHARS + 1) })
				.success,
		).toBe(false);
	});

	it("accepts jev", () => {
		expect(AnalyzeRequest.parse({ text: "Hi.", model: "jev" }).model).toBe(
			"jev",
		);
	});

	it("rejects unknown models", () => {
		expect(
			AnalyzeRequest.safeParse({ text: "Hi.", model: "gpt-5" }).success,
		).toBe(false);
	});
});

describe("types", () => {
	it("request input has optional model, output has required model", () => {
		expectTypeOf<z.input<typeof AnalyzeRequest>>().toEqualTypeOf<{
			text: string;
			model?: "clef" | "clef-flash" | "jev" | undefined;
		}>();
		expectTypeOf<z.output<typeof AnalyzeRequest>>().toEqualTypeOf<{
			text: string;
			model: "clef" | "clef-flash" | "jev";
		}>();
	});

	it("response factors are keyed by every FactorId", () => {
		type Factors = z.infer<typeof AnalyzeResponse>["factors"];
		expectTypeOf<keyof Factors>().toEqualTypeOf<FactorId>();
		expectTypeOf<Factors["negation_reframe"]>().toEqualTypeOf<{
			probability: number;
		}>();
	});

	it("factor list entries carry their id as a FactorId", () => {
		expectTypeOf<
			z.infer<typeof FactorsResponse>["factors"][number]["id"]
		>().toEqualTypeOf<FactorId>();
	});
});
