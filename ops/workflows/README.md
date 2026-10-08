# Agent work reconciliation

GitHub Issues and the Pen Pad Golf Operations Project are the work-state authority. These scripts keep recurring work, lifecycle state, review decisions, founder approvals, and WIP limits aligned without treating same-author GitHub pull-request reviews as Brand approval.

## Commands

```powershell
npm run ops:test
npm run ops:sync-recurring
npm run ops:reconcile
```

Both synchronization commands are report-only unless `--apply` is supplied. Live Project reconciliation requires `PPG_PROJECT_TOKEN`; the token must be able to read and write the founder-owned Project v2. Repository issue and label changes use the workflow's scoped `GITHUB_TOKEN` in Actions.

The scheduled workflow runs hourly. On scheduled runs it creates one open issue per recurring template when no prior open occurrence exists. Closing that issue allows the next cadence occurrence to be created. It does not create daily duplicates while work remains open.

## State signals

The producing or reviewing agent records decisions with repository labels. The reconciler converts those auditable signals into Project fields.

| Signal | Result |
| --- | --- |
| `status:in-progress` | `Agent working` |
| `status:review` | `Agent review` |
| `brand:pending` or `status:brand-review` | `Brand review` |
| `brand:changes-requested` | `Agent working` |
| `brand:approved` + controlled Action type + `evidence:complete` | `Founder approval` + `Approval: Pending` |
| Project `Approval: Approved` or `approval:approved` | `Approved execution` |
| Project `Approval: Changes requested` | `Agent working` |
| `status:verification` | `Verification` |
| `status:blocked` | `Blocked external` |
| closed issue | `Done` |

For Internal work, `brand:approved` leaves the issue in Agent review for merge or internal verification; it never invents a founder gate.

## Exact approval packets

Controlled work must use the correct `Action type`. Publish and Product claim packets marked `evidence:complete` require an exact 40-character commit and at least one SHA-256 fingerprint in the issue evidence. Missing or conflicting evidence blocks movement to Founder approval and makes the reconciliation check fail visibly.

Brand records a decision against the exact revision and fingerprints in an issue or pull-request comment, then replaces `brand:pending` with either `brand:approved` or `brand:changes-requested`. GitHub's formal PR approval is not used as the Brand gate when author and reviewer share the same GitHub identity.

The founder may decide through the Project `Approval` field. The reconciler respects `Approved`, `Changes requested`, and `Declined`; it does not overwrite those decisions with a derived pending state.

## WIP policy

- Agent working: 5
- Agent review: 2
- Brand review: 2
- Founder approval: 5

A WIP exception is reported in the Actions summary. Marketing may advance past a founder-controlled wait, but it must not create a new campaign while Agent review or Brand review is already over its internal limit. The Business Manager clears internal handoffs before accepting more production.

## Recurring work versus controlled actions

Recurring checks are Internal work. When a review identifies a proposed publication, spend, price, refund exception, product claim, inventory commitment, or account-security action, the owning agent opens a separate Agent Work issue for that exact action. This prevents a recurring monitoring task from becoming a blanket approval request.

## Required repository setup

1. Add an Actions secret named `PPG_PROJECT_TOKEN` with read/write access to Project 6. Repository issue writes use the workflow's scoped `GITHUB_TOKEN`; use the narrowest supported project permission for the secret.
2. Run **Reconcile agent work** manually once with `apply: true`.
3. Confirm the workflow created the labels listed in `reconciliation-core.mjs`, added agent-work issues to the Project, and updated Status and Approval together.
4. Disable the Project workflow named **Code review approved**. It is not the Brand gate and its `Agent working` target is incorrect.
5. Keep **Pull request linked to issue → Agent review** enabled as the initial evidence-submission handoff.
