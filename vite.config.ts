import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig, type Plugin } from "vite";

/**
 * Dev-only live reload. The Worker renders its own HTML, so Vite never injects
 * its client. This adds the client to HTML responses and reloads the page
 * whenever a file in src/ changes.
 */
function liveReload(): Plugin {
	return {
		name: "live-reload",
		apply: "serve",
		configureServer(server) {
			server.watcher.on("change", (file) => {
				if (file.includes("/src/")) server.ws.send({ type: "full-reload" });
			});
			server.middlewares.use((_req, res, next) => {
				const writeHead = res.writeHead.bind(res);
				const write = res.write.bind(res);
				const end = res.end.bind(res);
				const decoder = new TextDecoder();
				let html = false;
				let body = "";
				res.writeHead = ((
					status: number,
					headers?: Record<string, unknown>,
				) => {
					const type =
						headers?.["content-type"] ?? res.getHeader("content-type");
					html = String(type ?? "").includes("text/html");
					if (html && headers) delete headers["content-length"];
					if (html) res.removeHeader("content-length");
					return writeHead(status, headers as never);
				}) as typeof res.writeHead;
				res.write = ((chunk: unknown, ...args: never[]) => {
					if (!html) return write(chunk as never, ...args);
					if (typeof chunk === "string") body += chunk;
					else if (chunk instanceof Uint8Array)
						body += decoder.decode(chunk, { stream: true });
					return true;
				}) as typeof res.write;
				res.end = ((chunk?: unknown, ...args: never[]) => {
					if (!html) return end(chunk as never, ...args);
					if (typeof chunk === "string") body += chunk;
					else if (chunk instanceof Uint8Array)
						body += decoder.decode(chunk, { stream: true });
					return end(
						(body + decoder.decode()).replace(
							"</body>",
							'<script type="module" src="/@vite/client"></script></body>',
						),
					);
				}) as typeof res.end;
				next();
			});
		},
	};
}

export default defineConfig({
	plugins: [liveReload(), cloudflare()],
	server: { port: 5190, strictPort: true },
});
