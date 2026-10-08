import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveDesiredState,
  extractEvidence,
  parseWorkItem,
  summarizeWip,
  validateApprovalPacket,
} from "./reconciliation-core.mjs";

const body = ({ action = "Publish", hashes = true } = {}) => `## Owning agent
Marketing Agent — accountable owner: @founder

## Action type
${action}

## Evidence and exact artifacts
Commit: \`0123456789abcdef0123456789abcdef01234567\`
${hashes ? "SHA-256: `" + "a".repeat(64) + "`" : ""}`;

test("parses work ownership and evidence", () => {
  assert.deepEqual(parseWorkItem(body()), { owner: "Marketing Agent", actionType: "Publish" });
  assert.equal(extractEvidence(body()).hashes.length, 1);
  assert.equal(extractEvidence(body()).commits.length, 1);
});

test("moves complete Brand-approved publish work to founder approval", () => {
  const desired = deriveDesiredState({
    state: "open",
    body: body(),
    labels: ["agent-work", "brand:approved", "evidence:complete"],
  });
  assert.equal(desired.status, "Founder approval");
  assert.equal(desired.approval, "Pending");
  assert.deepEqual(desired.validation.errors, []);
});

test("holds incomplete controlled work in agent review", () => {
  const desired = deriveDesiredState({
    state: "open",
    body: body({ hashes: false }),
    labels: ["agent-work", "brand:approved", "evidence:complete"],
  });
  assert.equal(desired.status, "Agent review");
  assert.match(desired.validation.errors.join(" "), /fingerprints/);
});

test("does not require founder approval for internal Brand-approved work", () => {
  const desired = deriveDesiredState({
    state: "open",
    body: body({ action: "Internal" }),
    labels: ["agent-work", "brand:approved", "evidence:complete"],
  });
  assert.equal(desired.status, "Agent review");
  assert.equal(desired.approval, "Not required");
});

test("founder decisions and verification take precedence", () => {
  const approved = deriveDesiredState({ state: "open", body: body(), labels: ["approval:approved"] });
  assert.equal(approved.status, "Approved execution");
  assert.equal(approved.approval, "Approved");

  const verifying = deriveDesiredState({ state: "open", body: body(), labels: ["approval:approved", "status:verification"] });
  assert.equal(verifying.status, "Verification");
});

test("a new Brand review supersedes an approval on an older revision", () => {
  const desired = deriveDesiredState({
    state: "open",
    body: body(),
    labels: ["brand:pending", "evidence:complete"],
    currentApproval: "Approved",
  });
  assert.equal(desired.status, "Brand review");
  assert.equal(desired.approval, "Superseded");
});

test("reports WIP limit breaches", () => {
  const items = [1, 2, 3].map(() => ({ desired: { status: "Brand review" } }));
  const brand = summarizeWip(items).find((entry) => entry.status === "Brand review");
  assert.equal(brand.count, 3);
  assert.equal(brand.limit, 2);
  assert.equal(brand.overLimit, true);
});

test("recognizes conflicting approval labels", () => {
  const result = validateApprovalPacket({
    body: body(),
    labels: ["approval:approved", "approval:pending"],
  });
  assert.match(result.errors.join(" "), /conflicting founder/);
});
