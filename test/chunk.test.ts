import { describe, expect, it } from "vitest";
import { chunkText, countWords } from "../src/chunk.ts";

describe("countWords", () => {
	it("counts whitespace-separated words", () => {
		expect(countWords("  one two\n\nthree  ")).toBe(3);
		expect(countWords("")).toBe(0);
	});
});

describe("chunkText", () => {
	it("returns short text as a single chunk", () => {
		expect(chunkText("One. Two. Three.", 100)).toEqual(["One. Two. Three."]);
	});

	it("splits at sentence boundaries without exceeding the word limit", () => {
		const text = "One two three. Four five six. Seven eight nine. Ten.";
		const chunks = chunkText(text, 6);
		expect(chunks).toEqual([
			"One two three. Four five six. ",
			"Seven eight nine. Ten.",
		]);
	});

	it("treats newlines as boundaries and preserves formatting", () => {
		const text = "## Heading\n\n- one two\n- three four\n";
		const chunks = chunkText(text, 4);
		expect(chunks.join("")).toBe(text);
		for (const c of chunks) expect(countWords(c)).toBeLessThanOrEqual(4);
	});

	it("hard-splits a single sentence longer than the limit", () => {
		const text = "a b c d e f g h i j";
		const chunks = chunkText(text, 4);
		expect(chunks.join("")).toBe(text);
		expect(chunks.map(countWords)).toEqual([4, 4, 2]);
	});

	it("is lossless on long mixed text", () => {
		const text = Array.from(
			{ length: 500 },
			(_, i) =>
				`Sentence ${i} has a few words in it.${i % 7 === 0 ? "\n\n" : " "}`,
		).join("");
		const chunks = chunkText(text, 100);
		expect(chunks.join("")).toBe(text);
		for (const c of chunks) expect(countWords(c)).toBeLessThanOrEqual(100);
	});
});
