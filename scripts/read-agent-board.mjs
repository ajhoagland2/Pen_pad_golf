const owner = process.env.PPG_GITHUB_OWNER || 'ajhoagland2';
const projectNumber = Number(process.env.PPG_GITHUB_PROJECT_NUMBER || 6);
const token = process.env.GITHUB_TOKEN;
const args = process.argv.slice(2);
const agentIndex = args.indexOf('--agent');
const requestedAgent = agentIndex >= 0 ? args[agentIndex + 1] : null;
const jsonOutput = args.includes('--json');

if (!token) {
  console.error('GITHUB_TOKEN is required. Use a token with read access to the private repository and Project.');
  process.exit(2);
}

const query = `
  query AgentBoard($login: String!, $number: Int!) {
    user(login: $login) {
      projectV2(number: $number) {
        title
        url
        items(first: 100) {
          nodes {
            id
            fieldValues(first: 30) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { name } } }
                ... on ProjectV2ItemFieldDateValue { date field { ... on ProjectV2Field { name } } }
              }
            }
            content {
              ... on Issue {
                number
                title
                url
                state
                repository { nameWithOwner }
              }
            }
          }
        }
      }
    }
  }
`;

const response = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  },
  body: JSON.stringify({ query, variables: { login: owner, number: projectNumber } }),
});

if (!response.ok) throw new Error(`GitHub Project read failed: ${response.status} ${await response.text()}`);
const payload = await response.json();
if (payload.errors?.length) throw new Error(payload.errors.map(error => error.message).join('; '));
const project = payload.data?.user?.projectV2;
if (!project) throw new Error(`Project ${owner}/${projectNumber} was not found or the token cannot read it.`);

const fieldMap = nodes => Object.fromEntries(nodes.flatMap(node => {
  const name = node.field?.name;
  const value = node.name ?? node.date;
  return name && value ? [[name, value]] : [];
}));

const statusRank = status => ({ 'Approved execution': 0, 'Agent working': 1, Verification: 2, Backlog: 3 }[status] ?? 9);
const priorityRank = priority => ({ Urgent: 0, High: 1, Normal: 2, Low: 3 }[priority] ?? 4);

const items = project.items.nodes
  .filter(item => item.content?.number)
  .map(item => ({
    projectItemId: item.id,
    number: item.content.number,
    title: item.content.title,
    url: item.content.url,
    repository: item.content.repository.nameWithOwner,
    ...fieldMap(item.fieldValues.nodes),
  }))
  .filter(item => !requestedAgent || item.Agent === requestedAgent)
  .filter(item => item.Approval === 'Approved' || ['Agent working', 'Verification'].includes(item.Status) || (item.Status === 'Backlog' && item.Approval === 'Not required'))
  .sort((a, b) => {
    const approvedDifference = Number(b.Approval === 'Approved') - Number(a.Approval === 'Approved');
    return approvedDifference || statusRank(a.Status) - statusRank(b.Status) || priorityRank(a.Priority) - priorityRank(b.Priority) || String(a['Target date'] || '9999').localeCompare(String(b['Target date'] || '9999'));
  });

if (jsonOutput) {
  console.log(JSON.stringify({ project: project.title, url: project.url, agent: requestedAgent, items }, null, 2));
} else {
  console.log(`${project.title}: ${project.url}`);
  console.log(requestedAgent ? `Eligible work for ${requestedAgent}:` : 'Eligible work for all agents:');
  if (!items.length) console.log('No eligible work found.');
  for (const [index, item] of items.entries()) {
    console.log(`${index + 1}. #${item.number} [${item.Status || 'No status'}] [${item.Approval || 'No approval'}] ${item.title}`);
    console.log(`   Agent: ${item.Agent || 'Unassigned'} | Priority: ${item.Priority || 'Unranked'} | ${item.url}`);
  }
}
