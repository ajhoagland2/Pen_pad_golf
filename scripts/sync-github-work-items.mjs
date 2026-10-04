import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const outputPath = resolve('apps/dashboard/public/data/work-items.json');
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;

if (!repository || !token) {
  console.log('GitHub context unavailable; preserving the local preview dataset.');
  process.exit(0);
}

const response = await fetch(`https://api.github.com/repos/${repository}/issues?state=all&labels=agent-work&per_page=100`, {
  headers: {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  },
});

if (!response.ok) {
  throw new Error(`GitHub issue sync failed: ${response.status} ${await response.text()}`);
}

const issues = (await response.json()).filter(issue => !issue.pull_request);
const fallback = JSON.parse(await readFile(outputPath, 'utf8'));

const labelValue = (labels, prefix, fallbackValue) => {
  const label = labels.map(entry => entry.name).find(name => name.startsWith(prefix));
  return label ? label.slice(prefix.length).replaceAll('-', ' ').replace(/\b\w/g, character => character.toUpperCase()) : fallbackValue;
};

const bodyField = (body, heading, fallbackValue) => {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = body?.match(new RegExp(`###\\s+${escaped}\\s*\\n+([\\s\\S]*?)(?=\\n###|$)`, 'i'));
  const value = match?.[1]?.trim();
  return value && value !== '_No response_' ? value : fallbackValue;
};

const items = issues.map(issue => {
  const labels = issue.labels.filter(label => typeof label === 'object');
  const id = bodyField(issue.body, 'Work item ID', `GH-${issue.number}`);
  return {
    id,
    title: issue.title.replace(/^\[[^\]]+\]\s*/, ''),
    agent: labelValue(labels, 'agent:', bodyField(issue.body, 'Owning agent', 'Business Manager')),
    status: labelValue(labels, 'status:', issue.state === 'closed' ? 'Approved execution' : 'Agent working'),
    type: labelValue(labels, 'type:', 'Operations'),
    updated: new Date(issue.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    decision: bodyField(issue.body, 'Decision requested', 'Review the linked issue, evidence, and exact scope.'),
    commit: bodyField(issue.body, 'Commit or artifact reference', 'Not linked'),
    brandReview: bodyField(issue.body, 'Brand review', 'Pending'),
    issueUrl: issue.html_url,
    evidence: [issue.html_url],
    checks: [['Issue evidence reviewed', false], ['Founder decision recorded', issue.state === 'closed']],
    activity: [['GitHub', `Issue #${issue.number} synchronized`, 'Latest run']],
  };
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: 'github',
  projectUrl: `https://github.com/${repository}/projects`,
  items: items.length ? items : fallback.items,
}, null, 2)}\n`);

console.log(`Synchronized ${items.length} agent work items from ${repository}.`);
