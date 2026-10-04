import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const stateDir = path.join(here, "state");
const templates = JSON.parse(await fs.readFile(path.join(here, "task_templates.json"), "utf8"));
await fs.mkdir(stateDir, { recursive: true });

const now = new Date();
const day = now.toISOString().slice(0, 10);
const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((now.getUTCDay() + 6) % 7))).toISOString().slice(0, 10);
const month = day.slice(0, 7);

const cadenceKey = { daily: day, weekly: weekStart, monthly: month };
const prefix = { daily: "D", weekly: "W", monthly: "M" };
const queue = templates.map((template, index) => ({
  work_id: `${prefix[template.cadence]}-${cadenceKey[template.cadence]}-${String(index + 1).padStart(2, "0")}`,
  created_at: now.toISOString(),
  period_key: cadenceKey[template.cadence],
  status: "Queued",
  result: 0,
  evidence: "",
  ...template,
}));

const queuePath = path.join(stateDir, "agent_queue.json");
let existing = [];
try { existing = JSON.parse(await fs.readFile(queuePath, "utf8")); } catch {}
const byId = new Map(existing.map((item) => [item.work_id, item]));
for (const item of queue) if (!byId.has(item.work_id)) byId.set(item.work_id, item);
const merged = [...byId.values()].sort((a, b) => a.work_id.localeCompare(b.work_id));
await fs.writeFile(queuePath, `${JSON.stringify(merged, null, 2)}\n`);

const csvEscape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const headers = ["Work ID", "Date", "Agent", "Function", "Task", "KPI", "Target", "Result", "Status", "Evidence link", "Approval needed", "Owner note"];
const rows = merged.map((item) => [item.work_id, item.created_at.slice(0, 10), item.agent, item.function, item.task, item.kpi, item.target, item.result, item.status, item.evidence, item.approval_needed, ""]);
await fs.writeFile(path.join(stateDir, "agent_log.csv"), [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n") + "\n");

console.log(`PPG queue ready: ${merged.length} tasks in ${queuePath}`);
console.log("Next: assign queued items to the matching local agent and require evidence before marking Complete.");
