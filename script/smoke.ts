/**
 * Regression check against a live deployment using the real Clef model.
 * Each sample is written to trigger specific factors; the human sample should
 * trigger none. This catches prompt regressions, it doesn't measure accuracy.
 *
 * Usage: script/smoke [base-url]   (costs well under $0.01 per run)
 */
import { hc } from "hono/client";
import type { AppType } from "../src/app.ts";
import type { FactorId } from "../src/factors.ts";

const baseUrl =
	process.argv[2] ?? "https://clef-slop-detector.ziki.workers.dev";
const client = hc<AppType>(baseUrl);

interface Sample {
	text: string;
	expectHigh: FactorId[];
	expectAllLow?: true;
}

const HIGH = 0.7;
const LOW = 0.3;

const samples: Record<string, Sample> = {
	kitchen_sink: {
		text: "In today's fast-paced digital landscape, developer tools have become more crucial than ever. Modern teams need solutions that are powerful, flexible, and seamless, tools that unlock their full potential and elevate their workflows. Moreover, by leveraging cutting-edge AI, organizations can foster innovation, drive efficiency, and pave the way for sustainable growth. It's worth noting that this is truly a game-changer, a testament to how far the industry has come. In conclusion, embracing these robust strategies will not only streamline your journey but also revolutionize the way your team builds software.",
		expectHigh: [
			"canned_opening",
			"announced_conclusion",
			"buzzwords",
			"grandiose_stakes",
			"vague_claims",
		],
	},
	negation_rqa: {
		text: "Most people think caching is about speed. It's not. It's about trust. When you put a cache in front of your API, you aren't just saving milliseconds, you're making a promise to every client. The catch? That promise is hard to keep. The result? Stale data, confused users, and late-night pages. This isn't a technical problem. It's a people problem. And here's the thing: nobody tells you that up front. Let's break it down.",
		expectHigh: ["negation_reframe", "rhetorical_qa", "signposting"],
	},
	chatbot: {
		text: "Great question! Certainly, here's an overview of how to set up a Python virtual environment. First, open your terminal and run python -m venv .venv. Then activate it with source .venv/bin/activate. Once activated, you can install packages with pip and they'll stay isolated from your system Python. I hope this helps! Let me know if you'd like me to explain how to use requirements.txt files or if you have any other questions.",
		expectHigh: ["chatbot_artifacts"],
	},
	over_structured: {
		text: "## 🚀 Overview\n\nThis is a quick note about our team lunch.\n\n## 📋 Key Details\n\n- 🍕 **Food:** Pizza\n- 📍 **Location:** Break room\n- ⏰ **Time:** Noon\n\n## ✅ Action Items\n\n- **RSVP:** Reply by Thursday\n\n## 🎯 Summary\n\n- **Bottom line:** Lunch is Friday.",
		expectHigh: ["over_structuring"],
	},
	hedgy: {
		text: "The results may suggest a possible association between sleep duration and reported mood, although it could be argued that other factors are potentially involved. In many cases, participants who generally slept longer tended to report somewhat higher scores, but this pattern was not observed in all subgroups. Further research would perhaps be needed before any firm conclusions can reasonably be drawn, and the findings should arguably be interpreted with some caution.",
		expectHigh: ["hedging"],
	},
	casual: {
		text: "ok so the dishwasher died again lol. third time since march. guy came out, said it's the pump, wants 340 bucks. I'm just gonna hand wash till black friday and see if Costco has anything decent. my sister swears by her bosch but she also bought a $90 toaster so I don't know.",
		expectHigh: [],
		expectAllLow: true,
	},
};

let failures = 0;
let cost = 0;
await Promise.all(
	Object.entries(samples).map(async ([name, sample]) => {
		const res = await client.v1.analyze.$post({ json: { text: sample.text } });
		if (res.status !== 200) {
			failures++;
			console.log(
				`✗ ${name}: HTTP ${res.status} ${JSON.stringify(await res.json())}`,
			);
			return;
		}
		const { factors, usage } = await res.json();
		cost += usage.costUsd;
		const problems = [
			...sample.expectHigh
				.filter((id) => factors[id].probability < HIGH)
				.map((id) => `${id}=${factors[id].probability} (want >= ${HIGH})`),
			...(sample.expectAllLow
				? Object.entries(factors)
						.filter(([, f]) => f.probability > LOW)
						.map(([id, f]) => `${id}=${f.probability} (want <= ${LOW})`)
				: []),
		];
		if (problems.length) failures++;
		console.log(
			`${problems.length ? "✗" : "✓"} ${name}${problems.length ? `: ${problems.join(", ")}` : ""}`,
		);
	}),
);
console.log(`cost: $${cost.toFixed(6)}`);
process.exit(failures ? 1 : 0);
