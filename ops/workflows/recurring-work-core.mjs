import crypto from "node:crypto";

export function periodKeys(now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  const weekStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - ((now.getUTCDay() + 6) % 7),
  )).toISOString().slice(0, 10);
  return { daily: day, weekly: weekStart, monthly: day.slice(0, 7) };
}

export function templateKey(template) {
  return crypto.createHash("sha256")
    .update(`${template.agent}\n${template.cadence}\n${template.task}`)
    .digest("hex")
    .slice(0, 16);
}

export function buildOccurrences(templates, now = new Date()) {
  const keys = periodKeys(now);
  const prefix = { daily: "D", weekly: "W", monthly: "M" };
  return templates.map((template, index) => {
    const key = templateKey(template);
    const workId = `${prefix[template.cadence]}-${keys[template.cadence]}-${String(index + 1).padStart(2, "0")}`;
    return {
      ...template,
      templateKey: key,
      workId,
      periodKey: keys[template.cadence],
      marker: `<!-- recurring-template:${key} -->`,
      title: `[RECURRING] ${template.agent}: ${template.task}`,
    };
  });
}

export function occurrenceBody(occurrence) {
  return `${occurrence.marker}
<!-- work-id:${occurrence.workId} -->

## Owning agent
${occurrence.agent}

## Lifecycle status
Backlog

## Action type
${occurrence.action_type || "Internal"}

## Required outcome
${occurrence.task}

Cadence: ${occurrence.cadence}. Period: ${occurrence.periodKey}. KPI: ${occurrence.kpi}. Target: ${occurrence.target}.

If this review identifies a controlled Publish, Spend, Price, Refund exception, Product claim, Inventory, or Account security action, open a separate Agent Work issue for that exact action and evidence. Do not convert this recurring internal review into a blanket approval request.

## Evidence and exact artifacts
Attach repository paths, issue or pull-request links, non-secret external evidence, and the measured result before closure.

## Approval gates and risks
This recurring review is Internal and does not itself authorize an external action. Controlled actions require their own exact approval packet.

## Safety confirmation
- [x] No credentials, private customer data, payment data, recovery codes, or other secrets are included.
- [x] Any requested approval is scoped to the exact action and evidence above.
`;
}
