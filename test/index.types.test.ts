import { describe, expectTypeOf, it } from "vitest";
import type { AiRunner } from "../src/analyze.ts";
import type { AnalyzeResult } from "../src/schema.ts";

// src/index.ts imports cloudflare:workers, so these are compile-time checks only.
type SlopDetector = InstanceType<typeof import("../src/index.ts").default>;

describe("Worker entrypoint types", () => {
	it("the AI binding satisfies AiRunner", () => {
		expectTypeOf<Env["AI"]>().toExtend<AiRunner>();
	});

	it("exposes a typed analyze() RPC method", () => {
		expectTypeOf<SlopDetector["analyze"]>().parameter(0).toEqualTypeOf<{
			text: string;
			model?: "clef" | "clef-flash" | undefined;
		}>();
		expectTypeOf<
			SlopDetector["analyze"]
		>().returns.resolves.toEqualTypeOf<AnalyzeResult>();
	});
});
