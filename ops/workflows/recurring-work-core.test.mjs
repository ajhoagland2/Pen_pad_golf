import test from "node:test";
import assert from "node:assert/strict";
import { buildOccurrences, occurrenceBody, periodKeys } from "./recurring-work-core.mjs";

const template = {
  agent: "Business Manager",
  cadence: "daily",
  task: "Reconcile the queue",
  kpi: "Approvals prepared",
  target: 1,
  action_type: "Internal",
};

test("uses stable UTC cadence keys", () => {
  const keys = periodKeys(new Date("2026-10-08T23:00:00Z"));
  assert.deepEqual(keys, { daily: "2026-10-08", weekly: "2026-10-05", monthly: "2026-10" });
});

test("builds a stable recurring marker and auditable issue body", () => {
  const first = buildOccurrences([template], new Date("2026-10-08T12:00:00Z"))[0];
  const second = buildOccurrences([template], new Date("2026-10-09T12:00:00Z"))[0];
  assert.equal(first.templateKey, second.templateKey);
  assert.notEqual(first.workId, second.workId);
  assert.match(occurrenceBody(first), new RegExp(first.marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(occurrenceBody(first), /open a separate Agent Work issue/);
});
