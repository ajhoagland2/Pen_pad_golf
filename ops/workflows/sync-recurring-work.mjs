import fs from "node:fs/promises";
import { buildOccurrences, occurrenceBody } from "./recurring-work-core.mjs";
import { REQUIRED_LABELS } from "./reconciliation-core.mjs";

const apply = process.argv.includes("--apply");
const repository = process.env.PPG_REPOSITORY || process.env.GITHUB_REPOSITORY || "ajhoagland2/Pen_pad_golf";
const token = process.env.GITHUB_TOKEN || process.env.PPG_PROJECT_TOKEN;
const [owner, repo] = repository.split("/");
const templates = JSON.parse(await fs.readFile(new URL("../task_templates.json", import.meta.url), "utf8"));
const occurrences = buildOccurrences(templates);

async function api(path, options = {}) {
  if (!token) throw new Error("GITHUB_TOKEN or PPG_PROJECT_TOKEN is required with --apply");
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "pen-pad-golf-recurring-work",
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`${options.method || "GET"} ${path}: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

let openIssues = [];
if (apply) {
  const existingLabels = await api(`/repos/${owner}/${repo}/labels?per_page=100`);
  const knownLabels = new Set(existingLabels.map((label) => label.name));
  for (const [name, definition] of Object.entries(REQUIRED_LABELS)) {
    if (knownLabels.has(name)) continue;
    await api(`/repos/${owner}/${repo}/labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ...definition }),
    });
  }

  for (let page = 1; ; page += 1) {
    const batch = await api(`/repos/${owner}/${repo}/issues?state=open&labels=agent-work&per_page=100&page=${page}`);
    openIssues.push(...batch.filter((item) => !item.pull_request));
    if (batch.length < 100) break;
  }
}

const report = [];
for (const occurrence of occurrences) {
  const existing = openIssues.find((issue) => issue.body?.includes(occurrence.marker));
  if (existing) {
    report.push({ workId: occurrence.workId, result: "reused", issue: existing.html_url });
    continue;
  }

  if (!apply) {
    report.push({ workId: occurrence.workId, result: "would create", title: occurrence.title });
    continue;
  }

  const created = await api(`/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: occurrence.title,
      body: occurrenceBody(occurrence),
      labels: ["agent-work", "status:backlog"],
    }),
  });
  report.push({ workId: occurrence.workId, result: "created", issue: created.html_url });
}

console.log(JSON.stringify({ apply, repository, occurrences: report }, null, 2));
