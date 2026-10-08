import { bindings, defineConfig } from "cf/config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

export default defineConfig({
	worker: {
		name: "clef-slop-detector",
		compatibilityDate: "2026-10-01",
		entrypoint,
		domains: ["slop.how", "api.slop.how"],
		env: {
			AI: bindings.ai({ dev: { remote: true } }),
		},
	},
});
