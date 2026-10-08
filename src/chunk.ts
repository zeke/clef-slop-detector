/**
 * Clef's context window is 65,536 tokens and it silently truncates longer
 * state. The factor questions take ~2,000 tokens, and English prose runs about
 * 1.3 tokens per word, so 20,000 words leaves headroom for denser text.
 */
export const MAX_CHUNK_WORDS = 20_000;

export function countWords(text: string): number {
	return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Split text into chunks of at most `maxWords` words, breaking at sentence
 * ends or newlines where possible. Lossless: `chunks.join("") === text`.
 */
export function chunkText(text: string, maxWords = MAX_CHUNK_WORDS): string[] {
	// Each unit keeps its trailing whitespace so concatenation is exact.
	const units = text
		.split(/(?<=[.!?]\s+|\n)(?=\S)/)
		.flatMap((u) => (countWords(u) > maxWords ? splitWords(u, maxWords) : [u]));

	const chunks: string[] = [];
	let current = "";
	let currentWords = 0;
	for (const unit of units) {
		const words = countWords(unit);
		if (currentWords + words > maxWords && current) {
			chunks.push(current);
			current = "";
			currentWords = 0;
		}
		current += unit;
		currentWords += words;
	}
	if (current) chunks.push(current);
	return chunks;
}

function splitWords(text: string, maxWords: number): string[] {
	const words = text.split(/(?<=\s)(?=\S)/);
	const out: string[] = [];
	for (let i = 0; i < words.length; i += maxWords)
		out.push(words.slice(i, i + maxWords).join(""));
	return out;
}
