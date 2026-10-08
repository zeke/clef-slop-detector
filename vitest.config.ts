import { defineConfig } from "vitest/config";

// Tests run in Node against the Hono app with a mocked AI binding.
// Kept separate from vite.config.ts so the Cloudflare plugin isn't loaded.
export default defineConfig({
	test: {
		include: ["test/**/*.test.ts"],
	},
});
