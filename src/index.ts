import { WorkerEntrypoint } from "cloudflare:workers";
import type { z } from "zod";
import { analyze } from "./analyze.ts";
import { app } from "./app.ts";
import { AnalyzeRequest, type AnalyzeResult } from "./schema.ts";

/**
 * HTTP via fetch(), and JS RPC via analyze() for other Workers with a service
 * binding to this one, e.g. `await env.SLOP.analyze({ text })`.
 */
export default class SlopDetector extends WorkerEntrypoint<Env> {
	override fetch(request: Request): Response | Promise<Response> {
		return app.fetch(request, this.env, this.ctx);
	}

	async analyze(input: z.input<typeof AnalyzeRequest>): Promise<AnalyzeResult> {
		return analyze(this.env.AI, AnalyzeRequest.parse(input));
	}
}
