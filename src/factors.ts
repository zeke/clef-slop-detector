/**
 * Slop factor definitions. Each becomes a Clef `noul` (yes/no) question.
 *
 * The wording here *is* the model: changing it changes results. Bump
 * FACTORS_VERSION whenever you add, remove, or reword a factor.
 */
export const FACTORS_VERSION = "2026-10-07";

export interface FactorDefinition {
	label: string;
	instructions: string;
	criteria: { true: string; false: string };
	/** How to fix it. Shown to agents in llms.txt; not sent to Clef. */
	advice: string;
}

export const factors = {
	negation_reframe: {
		label: "Negation reframe",
		instructions:
			'Does the text set up a contrast with a throwaway clause before making its point, e.g. "It\'s not X, it\'s Y", "Not just X, but Y", "This isn\'t about X. It\'s about Y"?',
		criteria: {
			true: "Uses the pattern for rhythm or emphasis, especially more than once",
			false:
				"No such pattern, or a single contrast where the distinction is the actual point",
		},
		advice: 'State the point directly. Drop the "it\'s not X" setup.',
	},
	reflexive_triplets: {
		label: "Reflexive triplets",
		instructions:
			"Does the text habitually group things in threes (three adjectives, three parallel clauses, three-item lists) regardless of how many things there really are?",
		criteria: {
			true: "Repeated triplets that feel like cadence, not content",
			false: "Lists vary in length or reflect the real number of items",
		},
		advice: "Use as many items as there really are. Two or four is fine.",
	},
	grandiose_stakes: {
		label: "Grandiose stakes",
		instructions:
			'Does the text inflate the significance of ordinary things, e.g. "pave the way", "a testament to", "game-changer", "revolutionize", "reshape the future of"?',
		criteria: {
			true: "Claims of broad importance that the content doesn't support",
			false: "Significance is stated plainly or backed by specifics",
		},
		advice: "Cut the inflated claim, or back it with a specific result.",
	},
	rhetorical_qa: {
		label: "Rhetorical Q&A",
		instructions:
			'Does the text pose a question or fragment only to answer it immediately for dramatic effect, e.g. "The catch? It\'s free.", "The result? A 40% speedup."?',
		criteria: {
			true: "Uses this device, especially repeatedly",
			false: "Questions are genuine or absent",
		},
		advice: "Turn the question and answer into one plain statement.",
	},
	canned_opening: {
		label: "Canned opening",
		instructions:
			'Does the text open with a generic scene-setter about the era, the world, or the importance of the topic, e.g. "In today\'s fast-paced digital landscape", "In an era where", "X has become increasingly important"?',
		criteria: {
			true: "The opening could be pasted onto any article on the topic",
			false: "The opening is specific to this piece",
		},
		advice: "Start with the specific point, fact, or example.",
	},
	announced_conclusion: {
		label: "Announced conclusion",
		instructions:
			'Does the text end by announcing that it is concluding and restating what it already said, e.g. "In conclusion", "Ultimately", "In summary", "By embracing these strategies"?',
		criteria: {
			true: "The ending summarizes or moralizes instead of adding anything",
			false: "The ending is short, specific, or just stops",
		},
		advice: "End on the last useful point. Cut the recap.",
	},
	buzzwords: {
		label: "AI buzzwords",
		instructions:
			"Does the text lean on vocabulary common in AI-generated prose, such as delve, tapestry, leverage (as a verb), harness, unlock, seamless, robust, journey, landscape, elevate, realm, foster, crucial, pivotal?",
		criteria: {
			true: "Several such words used where an ordinary word would do",
			false: "None, or used as precise technical terms",
		},
		advice: "Swap each one for the plain word: use, help, improve, area.",
	},
	hollow_transitions: {
		label: "Hollow transitions",
		instructions:
			"Does the text join sentences with filler transitions like moreover, furthermore, additionally, it's worth noting that, it's important to note, that said?",
		criteria: {
			true: "Filler transitions appear repeatedly",
			false: "Sentences connect with plain words (and, but, so) or none",
		},
		advice: "Delete the transition, or use and, but, or so.",
	},
	hype_adjectives: {
		label: "Hype adjectives",
		instructions:
			"Does the text pile on enthusiastic intensifiers like incredibly, truly, remarkably, powerful, amazing, stunning, without concrete support?",
		criteria: {
			true: "Enthusiasm is asserted rather than shown",
			false: "Tone is matter-of-fact, or praise is backed by specifics",
		},
		advice: "Remove the intensifier, or show the evidence that earns it.",
	},
	vague_claims: {
		label: "Vague claims",
		instructions:
			"Does the text make general claims without concrete names, numbers, examples, quotes, or first-hand detail?",
		criteria: {
			true: "Mostly abstractions that could apply to anything",
			false: "Grounded in specific, checkable details",
		},
		advice: "Add a name, number, example, or first-hand detail.",
	},
	hedging: {
		label: "Excessive hedging",
		instructions:
			'Does the text pile on qualifiers that avoid committing to a position, e.g. "can potentially", "may help to", "it could be argued", "in many cases", "generally speaking"?',
		criteria: {
			true: "Hedges stack up and blur what's actually being said",
			false:
				"Claims are direct, or uncertainty is stated once where it matters",
		},
		advice: "Commit to the claim, or state the real uncertainty once.",
	},
	over_structuring: {
		label: "Over-structuring",
		instructions:
			"Does the text impose heavy formatting (headings, bullet lists, bold labels, emoji bullets) on content that would read fine as a few paragraphs?",
		criteria: {
			true: "Formatting outweighs the content it organizes",
			false: "Formatting is light or proportionate to the content",
		},
		advice: "Merge into paragraphs. Keep lists for real lists.",
	},
	signposting: {
		label: "Signposting",
		instructions:
			'Does the text narrate its own structure with phrases like "Let\'s dive in", "Here\'s the thing", "Let\'s break it down", "Here\'s why that matters"?',
		criteria: {
			true: "Repeated announcements of what's coming next",
			false: "The text just proceeds",
		},
		advice: "Delete the announcement and get to the content.",
	},
	chatbot_artifacts: {
		label: "Chatbot artifacts",
		instructions:
			'Does the text contain residue from a chat assistant, e.g. "I hope this helps", "Let me know if you\'d like", "Great question!", "As an AI", "Certainly! Here\'s", or praise directed at the reader?',
		criteria: {
			true: "Any assistant-style framing addressed to a requester",
			false: "None",
		},
		advice: "Delete the assistant framing.",
	},
} as const satisfies Record<string, FactorDefinition>;

export type FactorId = keyof typeof factors;

export const factorIds = Object.keys(factors) as [FactorId, ...FactorId[]];
