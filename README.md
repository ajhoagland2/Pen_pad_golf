# Pen Pad Golf workspace

This repository is the operating and product-development umbrella for Pen Pad Golf. It owns agent policies, approval infrastructure, campaign source packages, product-generation scripts, canonical brand assets, and the founder dashboard.

The public website remains independently deployable from the `PPG_site` repository and is attached here as a Git submodule. An umbrella commit therefore records the exact website revision used by the business workflow without flattening or duplicating the site's history.

## Source of truth

GitHub Issues and Projects are the authoritative work queue. Every meaningful agent task must have one issue with an owner, lifecycle state, evidence, approval state, and completion record. Pull requests contain reviewable code and asset changes. Google Sheets may receive reporting exports, but it does not control workflow state.

The founder dashboard under `apps/dashboard/` is the mobile-friendly approval surface. Until its GitHub connection is configured, it runs in clearly labelled local-preview mode using fixture data.

## Workspace map

- `apps/dashboard/` — founder approval dashboard
- `src/` — Pen Pad Golf course designer prototype
- `PPG_site/` — Git submodule for the GitHub Pages site
- `ops/agents/` — agent ownership and safety policies
- `ops/workflows/` — work-item and approval contracts
- `outputs/brand/` — brand decisions and approved identity work
- `outputs/marketing/` — campaign packages, deterministic sources, final exports, and provenance
- `scripts/` — deterministic render and reporting tools
- `.github/` — issue forms, pull-request policy, and automation

## Work lifecycle

`Backlog → Agent working → Agent review → Brand review → Founder approval → Approved execution → Verification → Done`

External publication, spend, pricing changes, refund exceptions, product claims, inventory commitments, and account-security changes require the applicable founder approval. Agents own all safe preparation and routine stewardship within their written policies.

## Local commands

```powershell
pnpm install
pnpm dashboard:dev
pnpm dashboard:build
pnpm ops:run
```

## Repository setup

The outer repository still needs a GitHub remote. After creating the remote, push the baseline branch and create a GitHub Project using `docs/github-project-setup.md`. Do not run `git add .` inside `PPG_site`; commit and push website work from within that repository, then update the submodule pointer here.
