# Pen Pad Golf local business operations

This folder is the local control layer for an agent-run PPG business. It creates recurring work queues for the operating agents while keeping product development and final approvals with the founder. GitHub Issues and the PPG Operations Project are the source of truth for work state, evidence, and approvals. The Google Sheet remains a reporting and analytics surface; it is not the authoritative task queue.

## Roles

- Marketing Agent: GPT-5.6 Sol-authored static Instagram content, tagged traffic, lead generation, campaign tests, and performance review. Source imagery comes from `C:\Users\hoagl\Documents\PPG_Course_Map` and approved project assets; no video or Higgsfield work is in scope.
- Sales Agent: Etsy listing operations, conversion tests, order imports, and Amazon readiness evidence.
- Brand Agent: webpage-derived brand system, narrative development, product claims, visual asset library, and publishing review.
- Purchasing Agent: supplier quotes, cost control, reorder recommendations, and purchase-order drafts.
- Distribution Agent: pick-pack-ship procedure, service levels, returns, and shipment exceptions.
- Business Manager: KPI close, task routing, blockers, and founder approval queue.

Agents actively steward their assigned systems: they discover work, produce artifacts, run checks, and advance approved work through execution. They may not publish externally, spend money, commit inventory, change pricing, or approve product claims without founder approval. Each controlled action must point to a GitHub work item containing its exact evidence and approval record.

## Run locally

From the repository root:

```powershell
npm run ops:run
```

The command writes `ops/state/agent_queue.json` and `ops/state/agent_log.csv`. It is safe to rerun; stable task IDs prevent duplicate daily, weekly, and monthly work.

Use `npm run ops:dashboard` to rebuild the Google Sheets-ready workbook in `outputs/ppg-agent-ops/`.

Use `npm run ops:board:read -- --agent "Sales Agent"` with a project-capable `GITHUB_TOKEN` to read claimable live Project work. Approved execution is returned before in-progress and safe backlog work. The full claim, completion, and blocker contract is in `agent-board-protocol.md`.

## Daily operating loop

1. Run the local queue generator.
2. Assign queued tasks to local agents using the matching file in `ops/agents/`.
3. Require an evidence path or URL for completed work.
4. Update the matching GitHub Issue and Project card with evidence, status, and any approval request.
5. Import Etsy orders into `Orders`, campaign data into `Marketing`, and inventory counts into `Inventory`.
6. The Business Manager reviews exceptions and presents approval-ready Project cards to the founder; reporting metrics can then be synchronized to the Google Sheet.

Founder approval gates are packet-level waits, not a reason for Marketing to idle. When a `C-###` launch packet is waiting on the founder, Marketing records the gate, preserves the ready work, and advances the next sequential packet that has autonomous work available.

## Stage gates

- Etsy launch: approved listing, fulfillment SOP, inventory buffer, and expense plan.
- Scale: at least 100 units per month, at most $5 all-in expense per unit, and at least 40% Actual Real Revenue.
- Amazon readiness: at least 300 lifetime Etsy units, stable 40%+ ARR, repeatable fulfillment, documented return rate, and founder approval.

The workbook includes sample rows so formulas and charts are visible. Delete or replace those rows before using the file for live reporting.
