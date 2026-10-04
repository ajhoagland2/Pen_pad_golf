# GitHub Project setup

The private [Pen Pad Golf Operations Project](https://github.com/users/ajhoagland2/projects/6) is live and uses the umbrella repository as its default repository. Website work from `PPG_site` can be added to the same Project when cross-repository coordination is needed.

## Board fields

- **Status**: Backlog, Agent working, Agent review, Brand review, Founder approval, Approved execution, Verification, Blocked external, Done
- **Agent**: Marketing, Sales, Brand, Purchasing, Distribution, Business Manager
- **Approval**: Not required, Pending, Approved, Changes requested, Declined, Superseded, Expired
- **Action type**: Internal, Publish, Spend, Price, Refund exception, Product claim, Inventory, Account security
- **Priority**: Urgent, High, Normal, Low
- **Target date**: date
- **Evidence complete**: checkbox

## Views

1. **Founder approvals** — filter `Approval:Pending`; group by Action type.
2. **Agent board** — board grouped by Status; filter out Done.
3. **Brand queue** — filter `Status:"Brand review"`.
4. **External execution** — filter `Status:"Approved execution"`.
5. **Blocked** — filter `Status:"Blocked external"`.
6. **Completed** — filter `Status:Done`; sort by newest update.

## Notifications

Assign the founder to issues entering Founder approval. Request founder PR review for code and tracked-artifact changes. Use a protected `production` environment for deployments once the remote repository is configured. GitHub Mobile notifications should be enabled for assignments, review requests, mentions, and deployment approvals.

## Automations

- Automatically add new issues from both repositories.
- Set new items to Backlog.
- Set merged pull requests and closed issues to Done.
- Move PR-backed work to Agent review when marked ready for review.
- Require execution evidence before closing controlled external actions.

The Project is the work-state authority. The dashboard is a focused view over Project and Issue data; Google Sheets is reporting only.

## Private dashboard delivery

The `Publish approval dashboard` workflow always uploads a private `approval-dashboard-build` artifact. Public Pages deployment remains disabled unless the repository variable `ENABLE_GITHUB_PAGES` is explicitly set to `true` after Pages becomes available and its visibility has been reviewed. Do not make the umbrella repository public merely to enable Pages; its work items and approval evidence are operational records.
