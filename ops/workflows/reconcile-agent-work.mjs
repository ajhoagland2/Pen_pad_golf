import fs from "node:fs/promises";
import {
  APPROVALS,
  REQUIRED_LABELS,
  STATUSES,
  deriveDesiredState,
  findInvariantViolations,
  summarizeWip,
} from "./reconciliation-core.mjs";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const snapshotIndex = process.argv.indexOf("--snapshot");
const snapshotPath = snapshotIndex >= 0 ? process.argv[snapshotIndex + 1] : null;
const repository = process.env.PPG_REPOSITORY || process.env.GITHUB_REPOSITORY || "ajhoagland2/Pen_pad_golf";
const projectOwner = process.env.PPG_PROJECT_OWNER || "ajhoagland2";
const projectNumber = Number(process.env.PPG_PROJECT_NUMBER || 6);
const founder = process.env.PPG_FOUNDER_LOGIN || "ajhoagland2";
const projectToken = process.env.PPG_PROJECT_TOKEN || process.env.GITHUB_TOKEN;
const repositoryToken = process.env.GITHUB_TOKEN || projectToken;

const [owner, repo] = repository.split("/");
if (!owner || !repo) throw new Error(`Invalid repository: ${repository}`);

async function rest(path, options = {}, authToken = repositoryToken) {
  if (!authToken) throw new Error("GITHUB_TOKEN or PPG_PROJECT_TOKEN is required for live reconciliation");
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${authToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "pen-pad-golf-workflow-reconciler",
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`${options.method || "GET"} ${path}: ${response.status} ${await response.text()}`);
  if (response.status === 204) return null;
  return response.json();
}

async function graphql(query, variables = {}) {
  return rest("/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  }, projectToken).then((result) => {
    if (result.errors?.length) throw new Error(`GraphQL: ${result.errors.map((error) => error.message).join("; ")}`);
    return result.data;
  });
}

async function fetchIssues() {
  const issues = [];
  for (let page = 1; ; page += 1) {
    const batch = await rest(`/repos/${owner}/${repo}/issues?state=all&labels=agent-work&per_page=100&page=${page}`);
    issues.push(...batch.filter((item) => !item.pull_request));
    if (batch.length < 100) break;
  }
  return issues.map((issue) => ({
    id: issue.node_id,
    number: issue.number,
    title: issue.title,
    body: issue.body || "",
    state: issue.state,
    labels: issue.labels.map((label) => label.name),
    assignees: issue.assignees.map((assignee) => assignee.login),
    url: issue.html_url,
  }));
}

async function fetchProject() {
  const query = `
    query Project($login: String!, $number: Int!, $cursor: String) {
      user(login: $login) {
        projectV2(number: $number) {
          id
          title
          fields(first: 50) {
            nodes {
              ... on ProjectV2Field { id name }
              ... on ProjectV2SingleSelectField { id name options { id name } }
            }
          }
          items(first: 100, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id
              content {
                ... on Issue { id number repository { nameWithOwner } }
              }
              fieldValues(first: 20) {
                nodes {
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    field { ... on ProjectV2SingleSelectField { name } }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  let cursor = null;
  let project = null;
  const nodes = [];
  do {
    const data = await graphql(query, { login: projectOwner, number: projectNumber, cursor });
    const page = data.user?.projectV2;
    if (!page) throw new Error(`Project ${projectOwner}/${projectNumber} was not found or is not accessible`);
    project ||= page;
    nodes.push(...page.items.nodes);
    cursor = page.items.pageInfo.hasNextPage ? page.items.pageInfo.endCursor : null;
  } while (cursor);
  if (!project) throw new Error(`Project ${projectOwner}/${projectNumber} was not found or is not accessible`);
  project.items.nodes = nodes;
  return project;
}

function fieldValue(item, name) {
  return item?.fieldValues?.nodes?.find((value) => value?.field?.name === name)?.name || "";
}

function indexProject(project) {
  const fields = new Map(project.fields.nodes.filter(Boolean).map((field) => [field.name, field]));
  for (const [name, values] of [["Status", STATUSES], ["Approval", APPROVALS]]) {
    const field = fields.get(name);
    if (!field?.options) throw new Error(`Project is missing the ${name} single-select field`);
    for (const value of values) if (!field.options.some((option) => option.name === value)) {
      throw new Error(`Project ${name} is missing option: ${value}`);
    }
  }
  const items = new Map();
  for (const item of project.items.nodes) {
    if (item.content?.repository?.nameWithOwner?.toLowerCase() !== repository.toLowerCase()) continue;
    items.set(item.content.number, item);
  }
  return { fields, items };
}

async function ensureLabels() {
  const existing = await rest(`/repos/${owner}/${repo}/labels?per_page=100`);
  const known = new Set(existing.map((label) => label.name));
  for (const [name, definition] of Object.entries(REQUIRED_LABELS)) {
    if (known.has(name)) continue;
    await rest(`/repos/${owner}/${repo}/labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ...definition }),
    });
  }
}

async function addProjectItem(projectId, contentId) {
  const data = await graphql(`
    mutation AddItem($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item { id }
      }
    }
  `, { projectId, contentId });
  return data.addProjectV2ItemById.item.id;
}

async function setProjectValue(projectId, itemId, field, value) {
  const option = field.options.find((candidate) => candidate.name === value);
  await graphql(`
    mutation SetField($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId,
        itemId: $itemId,
        fieldId: $fieldId,
        value: { singleSelectOptionId: $optionId }
      }) { projectV2Item { id } }
    }
  `, { projectId, itemId, fieldId: field.id, optionId: option.id });
}

async function assignFounder(issueNumber) {
  await rest(`/repos/${owner}/${repo}/issues/${issueNumber}/assignees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignees: [founder] }),
  });
}

function markdownReport(report) {
  const lines = [
    "# Agent workflow reconciliation",
    "",
    `Mode: **${report.apply ? "apply" : "report only"}**`,
    "",
    "| Issue | Current | Desired | Approval | Result |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const item of report.items) {
    const result = item.errors.length ? `Blocked: ${item.errors.join("; ")}` : item.changes.length ? item.changes.join("; ") : "No change";
    lines.push(`| [#${item.number}](${item.url}) ${item.title.replaceAll("|", "\\|")} | ${item.currentStatus || "Not in project"} | ${item.desiredStatus} | ${item.desiredApproval} | ${result.replaceAll("|", "\\|")} |`);
  }
  lines.push("", "## WIP", "", "| Status | Count | Limit |", "| --- | ---: | ---: |");
  for (const entry of report.wip) lines.push(`| ${entry.status}${entry.overLimit ? " ⚠️" : ""} | ${entry.count} | ${entry.limit} |`);
  return `${lines.join("\n")}\n`;
}

async function loadState() {
  if (snapshotPath) {
    const snapshot = JSON.parse(await fs.readFile(snapshotPath, "utf8"));
    return { issues: snapshot.issues, project: snapshot.project };
  }
  const [issues, project] = await Promise.all([fetchIssues(), fetchProject()]);
  return { issues, project };
}

const { issues, project } = await loadState();
const { fields, items: projectItems } = indexProject(project);
const evaluated = issues.map((issue) => {
  const projectItem = projectItems.get(issue.number);
  const item = {
    ...issue,
    currentStatus: fieldValue(projectItem, "Status"),
    currentApproval: fieldValue(projectItem, "Approval"),
  };
  const desired = deriveDesiredState(item);
  const invariantErrors = findInvariantViolations(item, desired);
  return { item, projectItem, desired, invariantErrors };
});

const report = { apply, repository, project: project.title, generatedAt: new Date().toISOString(), items: [], wip: [] };

if (apply) await ensureLabels();

for (const entry of evaluated) {
  const { item, desired } = entry;
  const errors = [...desired.validation.errors, ...entry.invariantErrors];
  const changes = [];
  let itemId = entry.projectItem?.id;

  if (!itemId) {
    changes.push("add to project");
    if (apply && !errors.length) itemId = await addProjectItem(project.id, item.id);
  }
  if (item.currentStatus !== desired.status) {
    changes.push(`Status: ${item.currentStatus || "unset"} → ${desired.status}`);
    if (apply && itemId && !errors.length) await setProjectValue(project.id, itemId, fields.get("Status"), desired.status);
  }
  if (item.currentApproval !== desired.approval) {
    changes.push(`Approval: ${item.currentApproval || "unset"} → ${desired.approval}`);
    if (apply && itemId && !errors.length) await setProjectValue(project.id, itemId, fields.get("Approval"), desired.approval);
  }
  if (desired.status === "Founder approval" && !item.assignees.includes(founder)) {
    changes.push(`assign founder @${founder}`);
    if (apply && !errors.length) await assignFounder(item.number);
  }

  report.items.push({
    number: item.number,
    title: item.title,
    url: item.url,
    currentStatus: item.currentStatus,
    currentApproval: item.currentApproval,
    desiredStatus: desired.status,
    desiredApproval: desired.approval,
    owner: desired.validation.owner,
    actionType: desired.validation.actionType,
    changes,
    errors,
    warnings: desired.validation.warnings,
  });
}

report.wip = summarizeWip(evaluated.map((entry) => ({ desired: entry.desired })));
const markdown = markdownReport(report);
console.log(markdown);
console.log(JSON.stringify(report, null, 2));

if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, markdown);
if (report.items.some((item) => item.errors.length)) process.exitCode = 1;
