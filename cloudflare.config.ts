import { bindings, defineConfig } from "cf/config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

export default defineConfig(({ isPreview }) => ({
	worker: {
		name: "clef-slop-detector",
		compatibilityDate: "2026-10-01",
		entrypoint,
		// Previews are served on workers.dev and can't claim custom domains.
		...(isPreview ? {} : { domains: ["slop.how", "api.slop.how"] }),
		// Serves PR previews at <name>-clef-slop-detector.ziki.workers.dev. Set in
		// both modes so production deploys don't switch it back off.
		previewUrls: true,
		env: {
			AI: bindings.ai({ dev: { remote: true } }),
		},
	},
}));
