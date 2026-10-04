# Agent board intake and ownership protocol

The private **Pen Pad Golf Operations** GitHub Project is the authoritative queue. An agent does not start from the local generated queue when a live Project item exists.

## Intake order

Each agent reads the board at the start of a run and selects one item in this order:

1. Its own item with `Approval: Approved` and `Status: Approved execution`, ordered by Priority and Target date.
2. Its own previously claimed item in `Agent working` or `Verification`.
3. Its highest-priority safe item in `Backlog` for which approval is not required.

Items with `Approval: Pending`, `Changes requested`, `Declined`, `Superseded`, or `Expired` cannot enter approved execution. The agent may continue safe preparation but must not perform the gated action.

## Claim

Before material work, the agent records its value in the Project `Agent` field and moves a newly selected safe item to `Agent working`. An approved controlled action remains in `Approved execution` while it is being executed. One agent owns the item until it hands the item off explicitly.

The issue is the durable work record. Never put credentials, private customer data, payment data, recovery codes, or full private messages in it.

## Closeout

An item may move to `Done` only when its issue records:

- the completed outcome;
- repository path, commit, pull request, or non-secret external evidence;
- verification performed and its result; and
- the next recommended action, even when that action is `None`.

## Blocked work

If work cannot continue, move it to `Blocked external` and record all four fields:

- **Blocker:** the concrete condition preventing progress;
- **Completed:** safe work already finished;
- **Next step:** one executable action that resumes progress;
- **Needed from:** the founder, an agent, or an external system responsible for that action.

The agent then returns to intake and claims the next eligible item. It does not repeatedly report the same unchanged blocker as new work.

## Read command

Use a classic personal access token or GitHub App token that can read the private repository and Project. Keep the token only in the environment.

```powershell
$env:GITHUB_TOKEN = '<session token>'
npm run ops:board:read -- --agent "Sales Agent"
```

The command reads Project #6 and prints claimable work with approved execution first. It does not mutate GitHub.
