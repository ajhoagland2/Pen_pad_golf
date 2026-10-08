export const STATUSES = Object.freeze([
  "Backlog",
  "Agent working",
  "Agent review",
  "Brand review",
  "Founder approval",
  "Approved execution",
  "Verification",
  "Blocked external",
  "Done",
]);

export const APPROVALS = Object.freeze([
  "Not required",
  "Pending",
  "Approved",
  "Changes requested",
  "Declined",
  "Superseded",
  "Expired",
]);

export const WIP_LIMITS = Object.freeze({
  "Agent working": 5,
  "Agent review": 2,
  "Brand review": 2,
  "Founder approval": 5,
});

export const CONTROLLED_ACTIONS = new Set([
  "Publish",
  "Spend",
  "Price",
  "Refund exception",
  "Product claim",
  "Inventory",
  "Account security",
]);

const OWNER_NAMES = new Set([
  "Marketing Agent",
  "Sales Agent",
  "Brand Agent",
  "Purchasing Agent",
  "Distribution Agent",
  "Business Manager",
]);

export const REQUIRED_LABELS = Object.freeze({
  "agent-work": { color: "1f6feb", description: "Accountable Pen Pad Golf agent work" },
  "status:backlog": { color: "d0d7de", description: "Accepted but not started" },
  "status:in-progress": { color: "fbca04", description: "Accountable agent is actively working" },
  "status:review": { color: "bfdadc", description: "Producing agent submitted evidence" },
  "status:brand-review": { color: "a371f7", description: "Waiting for an exact Brand decision" },
  "status:verification": { color: "0e8a16", description: "Execution evidence is being verified" },
  "status:blocked": { color: "d73a4a", description: "Blocked by a specific external dependency" },
  "evidence:complete": { color: "0e8a16", description: "Required evidence and exact fingerprints are attached" },
  "brand:pending": { color: "d4c5f9", description: "Brand review requested for the exact revision" },
  "brand:approved": { color: "0e8a16", description: "Brand approved the exact recorded revision" },
  "brand:changes-requested": { color: "d73a4a", description: "Brand requested changes to the exact revision" },
  "approval:pending": { color: "fbca04", description: "Founder decision required for the exact request" },
  "approval:approved": { color: "0e8a16", description: "Founder approved the exact recorded request" },
  "approval:changes-requested": { color: "d73a4a", description: "Founder requested changes" },
  "approval:declined": { color: "b60205", description: "Founder declined the requested action" },
});

function normalizeLabels(labels = []) {
  return new Set(labels.map((label) => typeof label === "string" ? label : label.name).filter(Boolean));
}

export function readHeading(body, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(body ?? "").match(new RegExp(`^#{2,4}\\s+${escaped}\\s*\\r?\\n+([^\\r\\n]+)`, "im"));
  return match?.[1]?.trim() ?? "";
}

export function parseWorkItem(body) {
  const rawOwner = readHeading(body, "Owning agent");
  const owner = [...OWNER_NAMES].find((name) => rawOwner.startsWith(name)) ?? "";
  const actionType = readHeading(body, "Action type");
  return { owner, actionType };
}

export function extractEvidence(body) {
  const text = String(body ?? "");
  const hashes = [...new Set(text.match(/\b[a-f0-9]{64}\b/gi) ?? [])];
  const commits = [...new Set(text.match(/\b[a-f0-9]{40}\b/gi) ?? [])];
  const hasEvidenceSection = /^#{2,4}\s+Evidence(?: and exact artifacts)?\s*$/im.test(text);
  return { hashes, commits, hasEvidenceSection };
}

export function validateApprovalPacket(item) {
  const labels = normalizeLabels(item.labels);
  const { owner, actionType } = parseWorkItem(item.body);
  const evidence = extractEvidence(item.body);
  const errors = [];
  const warnings = [];
  const statusSignals = [...labels].filter((label) => label.startsWith("status:"));
  const brandDecisions = ["brand:pending", "brand:approved", "brand:changes-requested"].filter((label) => labels.has(label));
  const approvalDecisions = ["approval:pending", "approval:approved", "approval:changes-requested", "approval:declined"].filter((label) => labels.has(label));

  if (!owner) errors.push("missing a recognized accountable owner");
  if (!["Internal", ...CONTROLLED_ACTIONS].includes(actionType)) errors.push("missing a recognized Action type");
  if (!evidence.hasEvidenceSection) errors.push("missing an Evidence section");

  if (labels.has("evidence:complete") && CONTROLLED_ACTIONS.has(actionType)) {
    if (["Publish", "Product claim"].includes(actionType) && evidence.commits.length === 0) {
      errors.push("publish or product-claim approval evidence lacks an exact 40-character commit");
    }
    if (["Publish", "Product claim"].includes(actionType) && evidence.hashes.length === 0) {
      errors.push("publish or product-claim approval evidence lacks SHA-256 artifact fingerprints");
    }
  }

  if (statusSignals.length > 1) errors.push(`has conflicting lifecycle labels: ${statusSignals.join(", ")}`);
  if (brandDecisions.length > 1) errors.push(`has conflicting Brand labels: ${brandDecisions.join(", ")}`);
  if (approvalDecisions.length > 1) errors.push(`has conflicting founder-approval labels: ${approvalDecisions.join(", ")}`);
  if (labels.has("brand:approved") && !labels.has("evidence:complete")) {
    warnings.push("Brand approval exists without evidence:complete");
  }

  return { owner, actionType, evidence, errors, warnings };
}

export function deriveDesiredState(item) {
  const labels = normalizeLabels(item.labels);
  const validation = validateApprovalPacket(item);
  const controlled = CONTROLLED_ACTIONS.has(validation.actionType);
  let status = "Backlog";
  let approval = "Not required";
  const reasons = [];

  if (item.state === "closed" || labels.has("status:done")) {
    status = "Done";
    approval = item.currentApproval === "Approved" ? "Approved" : "Not required";
    reasons.push("work item is closed");
  } else if (labels.has("status:verification")) {
    status = "Verification";
    approval = labels.has("approval:approved") ? "Approved" : item.currentApproval || "Not required";
    reasons.push("execution evidence awaits verification");
  } else if (labels.has("status:blocked")) {
    status = "Blocked external";
    approval = labels.has("approval:pending") ? "Pending" : item.currentApproval || "Not required";
    reasons.push("a specific external dependency is recorded");
  } else if (labels.has("brand:changes-requested")) {
    status = "Agent working";
    approval = ["Approved", "Pending"].includes(item.currentApproval) ? "Superseded" : "Not required";
    reasons.push("Brand requested changes");
  } else if (labels.has("brand:pending") || labels.has("status:brand-review")) {
    status = "Brand review";
    approval = ["Approved", "Pending"].includes(item.currentApproval) ? "Superseded" : "Not required";
    reasons.push("an exact Brand decision is pending");
  } else if (labels.has("approval:approved") || item.currentApproval === "Approved") {
    status = "Approved execution";
    approval = "Approved";
    reasons.push("founder approved the exact request");
  } else if (labels.has("approval:changes-requested") || item.currentApproval === "Changes requested") {
    status = "Agent working";
    approval = "Changes requested";
    reasons.push("founder requested changes");
  } else if (labels.has("approval:declined") || item.currentApproval === "Declined") {
    status = "Blocked external";
    approval = "Declined";
    reasons.push("founder declined the requested action");
  } else if (labels.has("brand:approved") && controlled) {
    if (labels.has("evidence:complete") && validation.errors.length === 0) {
      status = "Founder approval";
      approval = "Pending";
      reasons.push("Brand approved a complete controlled-action packet");
    } else {
      status = "Agent review";
      reasons.push("controlled work cannot advance until its approval packet is complete");
    }
  } else if (labels.has("brand:approved")) {
    status = "Agent review";
    reasons.push("Brand approved internal tracked work; merge or verification remains");
  } else if (labels.has("status:review")) {
    status = "Agent review";
    reasons.push("the producing agent submitted evidence");
  } else if (labels.has("status:in-progress")) {
    status = "Agent working";
    reasons.push("the accountable agent is actively working");
  } else {
    reasons.push("no start signal is recorded");
  }

  return { status, approval, validation, reasons };
}

export function findInvariantViolations(item, desired) {
  const problems = [];
  if (desired.status === "Founder approval" && desired.approval !== "Pending") {
    problems.push("Founder approval status must have Approval: Pending");
  }
  if (desired.approval === "Pending" && !["Founder approval", "Blocked external"].includes(desired.status)) {
    problems.push("Approval: Pending must be visible in Founder approval or Blocked external");
  }
  if (item.currentStatus === "Founder approval" && item.currentApproval !== "Pending") {
    problems.push("current project fields are inconsistent: Founder approval without Approval: Pending");
  }
  return problems;
}

export function summarizeWip(items, limits = WIP_LIMITS) {
  const counts = new Map(STATUSES.map((status) => [status, 0]));
  for (const item of items) counts.set(item.desired.status, (counts.get(item.desired.status) ?? 0) + 1);
  return Object.entries(limits).map(([status, limit]) => ({
    status,
    count: counts.get(status) ?? 0,
    limit,
    overLimit: (counts.get(status) ?? 0) > limit,
  }));
}
