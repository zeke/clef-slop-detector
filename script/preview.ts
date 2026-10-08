#!/usr/bin/env node
// Deploy or destroy a Worker Preview for a pull request, and report it to the
// PR with the GitHub Deployments API. Runs in .github/workflows/preview.yml.
//
//   node script/preview.ts deploy
//   node script/preview.ts destroy

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const WORKER = "clef-slop-detector";

const env = (name: string): string => {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is required`);
	return value;
};

const action = process.argv[2];
const pr = env("PREVIEW_PR_NUMBER");
const sha = env("PREVIEW_SHA");
const repo = env("GITHUB_REPOSITORY");
const accountId = env("CLOUDFLARE_ACCOUNT_ID");
const cfToken = env("CLOUDFLARE_API_TOKEN");
const ghToken = env("GITHUB_TOKEN");
const logUrl = `${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${repo}/actions/runs/${env("GITHUB_RUN_ID")}`;

const previewName = `pr-${pr}`;
// One environment per PR, so a new deploy doesn't deactivate other PRs' previews.
const environment = `preview/pr-${pr}`;

async function api<T>(
	url: string,
	token: string,
	init: { method?: string; body?: unknown } = {},
): Promise<T> {
	const res = await fetch(url, {
		method: init.method ?? "GET",
		headers: {
			accept: "application/json",
			authorization: `Bearer ${token}`,
			"content-type": "application/json",
			"x-github-api-version": "2022-11-28",
		},
		body: init.body === undefined ? undefined : JSON.stringify(init.body),
	});
	if (!res.ok)
		throw new Error(
			`${init.method ?? "GET"} ${url} failed: ${res.status} ${await res.text()}`,
		);
	return (res.status === 204 ? undefined : await res.json()) as T;
}

const github = <T>(path: string, init?: { method?: string; body?: unknown }) =>
	api<T>(`https://api.github.com/repos/${repo}${path}`, ghToken, init);

const cloudflare = <T>(path: string, init?: { method?: string }) =>
	api<{ result: T }>(
		`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/workers/${WORKER}${path}`,
		cfToken,
		init,
	).then((r) => r.result);

type State = "in_progress" | "success" | "failure" | "inactive";

const setStatus = (
	id: number,
	state: State,
	description: string,
	environmentUrl = "",
) =>
	github(`/deployments/${id}/statuses`, {
		method: "POST",
		body: {
			state,
			environment,
			description,
			log_url: logUrl,
			environment_url: environmentUrl,
			auto_inactive: false,
		},
	});

async function deactivateDeployments(exceptId?: number) {
	const deployments = await github<{ id: number }[]>(
		`/deployments?environment=${encodeURIComponent(environment)}&per_page=100`,
	);
	await Promise.all(
		deployments
			.filter((d) => d.id !== exceptId)
			.map((d) => setStatus(d.id, "inactive", "Preview replaced or deleted.")),
	);
}

async function deploy() {
	const deployment = await github<{ id: number }>("/deployments", {
		method: "POST",
		body: {
			ref: sha,
			environment,
			description: `Preview for PR #${pr}`,
			auto_merge: false,
			required_contexts: [],
			transient_environment: true,
			production_environment: false,
		},
	});
	await setStatus(deployment.id, "in_progress", "Deploying preview.");

	try {
		const { stdout } = await promisify(execFile)(
			"npx",
			["cf", "previews", "deploy", previewName],
			{ maxBuffer: 16 * 1024 * 1024 },
		);
		// Build logs come first; the result is the trailing JSON object.
		const result = JSON.parse(stdout.slice(stdout.indexOf("\n{") + 1)) as {
			preview_urls: string[];
		};
		const url = result.preview_urls[0];
		if (!url) throw new Error(`No preview URL in cf output:\n${stdout}`);

		// Free route, no Clef call.
		const probe = await fetch(`${url}/v1/factors`);
		if (!probe.ok)
			throw new Error(`${url}/v1/factors returned ${probe.status}`);

		const head = await github<{ head: { sha: string } }>(`/pulls/${pr}`);
		if (head.head.sha !== sha) {
			await setStatus(
				deployment.id,
				"inactive",
				"Superseded by a newer commit.",
			);
			return;
		}

		await setStatus(deployment.id, "success", "Preview deployed.", url);
		await deactivateDeployments(deployment.id);
		console.log(`Preview: ${url}`);
	} catch (err) {
		await setStatus(deployment.id, "failure", "Preview deploy failed.");
		throw err;
	}
}

async function destroy() {
	const previews = await cloudflare<{ id: string; name: string }[]>(
		`/previews?name=${encodeURIComponent(previewName)}`,
	);
	for (const preview of previews.filter((p) => p.name === previewName)) {
		await cloudflare(`/previews/${preview.id}`, { method: "DELETE" });
		console.log(`Deleted preview ${previewName} (${preview.id})`);
	}
	await deactivateDeployments();
}

if (action === "deploy") await deploy();
else if (action === "destroy") await destroy();
else throw new Error("Usage: node script/preview.ts <deploy|destroy>");
