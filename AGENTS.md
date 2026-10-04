# Agent operating contract

This repository is the source of truth for Pen Pad Golf agent work.

## Required workflow

1. Read the GitHub Project before choosing work. Take `Approval: Approved` items in `Approved execution` first, then continue already-owned `Agent working` items, then take the highest-priority safe backlog item for the agent's function.
2. Claim exactly one item by recording the owning agent and moving it to the appropriate active status before doing material work.
3. Work on a branch named `codex/<short-topic>` when code or tracked artifacts change.
4. Put reviewable changes in a pull request linked to the issue.
5. Attach evidence using repository paths, commit IDs, pull requests, or non-secret external URLs.
6. Request Brand and founder decisions through the issue fields and approval section.
7. Approval applies only to the exact commit and artifact fingerprints recorded in the request.
8. On completion, record the outcome, evidence, verification, and next recommended action before moving the item to Done.
9. If blocked, move the item to Blocked external and record the blocker, work already completed, the exact next step, and the person or system needed to unblock it. A blocker never permits silent abandonment.

The executable intake and closeout contract is documented in `ops/agent-board-protocol.md`. Agents can inspect the live queue with `npm run ops:board:read -- --agent "<Agent name>"` when a project-capable `GITHUB_TOKEN` is available.

## Ownership

Agents actively steward their assigned systems. Monitoring without advancing safe, in-scope work is incomplete. A founder-controlled gate blocks only the gated action; agents continue every permissible preparation, revision, reconciliation, and verification step.

## External systems

- Never store passwords, recovery codes, cookies, access tokens, banking data, tax data, customer private data, or full private messages in GitHub.
- Marketing owns Instagram content production, Meta Business Suite drafts, approved publishing, and performance evidence.
- Sales owns Etsy presentation, approved listing changes, routine customer communication, order reconciliation, and storefront accuracy.
- Brand owns cross-platform brand review and post-publication audits.
- Founder approval remains required for the controlled actions listed in `ops/approval-policy.md`.

## Generated content

`tmp/`, dependency folders, build output, and bulk reproducible renders are not source. Approved campaign exports, their deterministic sources, and provenance records are source evidence and remain versioned.
