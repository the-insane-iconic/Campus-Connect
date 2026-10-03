# AGENTS.md — Antigravity Project Operating Rules

## Purpose
This file is the persistent operating guide for coding agents working in this repository.

The primary goal is to minimize unnecessary repository exploration, token usage, duplicated investigation, and context loss when agents are changed or restarted.

---

## 1. Mandatory startup procedure

At the beginning of every task:

1. Read this `AGENTS.md`.
2. Read `docs/CURRENT_STATE.md`.
3. Read `docs/architecture.md`.
4. If the task is related to a previous investigation, read the relevant file under `docs/investigations/`.
5. Start from the files explicitly mentioned by the user or from the relevant area documented above.
6. Use targeted filename/symbol/reference search before opening unrelated files.

### Do NOT
- Scan the entire repository by default.
- Read large numbers of unrelated files.
- Re-discover architecture that is already documented.
- Re-read files that have already been analyzed unless their contents may have changed.
- Inspect generated/dependency/build directories unless the task explicitly requires it.
- Refactor unrelated code while completing a focused task.

If broader exploration becomes necessary, first identify why it is necessary and keep the scope as narrow as possible.

---

## 2. Context and token-efficiency rules

Prefer this order:

1. Existing documentation
2. Known relevant files
3. Symbol/reference search
4. Targeted code inspection
5. Broader repository exploration only when required

When possible:
- Search for a function/class/component name before reading whole directories.
- Read only relevant sections of large files.
- Reuse existing utilities, services, components, and patterns.
- Avoid duplicating existing functionality.
- Do not spend context explaining obvious repository structure that is already documented.

The agent should optimize for useful work, not maximum exploration.

---

## 3. Task execution workflow

For normal tasks:

1. Understand the requested outcome.
2. Read the persistent project context.
3. Identify the smallest relevant file set.
4. Inspect existing implementation.
5. Make the required changes.
6. Run targeted tests/checks.
7. Review the diff for unrelated changes.
8. Update the persistent documentation described in Section 4.
9. Give the user a concise summary of what changed and what remains.

For large/uncertain tasks:

1. Investigate first.
2. Create/update `docs/investigations/<task-name>.md`.
3. Record relevant files, architecture, findings, risks, and implementation plan.
4. Implement from the documented plan.
5. Update the investigation after implementation.

---

## 4. REQUIRED: update project memory after every completed task

This is mandatory.

After EACH meaningful work session/task, update:

### `docs/CURRENT_STATE.md`
Record:
- What was worked on
- What changed
- Current status
- Relevant files
- Tests/checks performed
- Any known problems
- The recommended next step

### `docs/architecture.md`
Update it ONLY if the architecture, data flow, important file locations, or major technical conventions changed.

### `docs/decisions.md`
Update it when an important technical decision, tradeoff, or convention was introduced.

### `docs/investigations/<task-name>.md`
Create/update this for substantial investigations or complex tasks.

Do not merely say "done." Record enough information for a NEW agent to continue without repeating the investigation.

---

## 5. Agent handoff protocol

When finishing work, leave the repository in a state where another agent can continue.

Before finishing:

- Update `docs/CURRENT_STATE.md`.
- Document unfinished work.
- Document important discoveries.
- Document failed approaches when they matter.
- Document exact relevant files.
- Document the next recommended action.

If the user switches agents, the new agent MUST use the documented state instead of restarting repository discovery.

Suggested handoff format:

- Current task:
- Completed:
- Changed files:
- Tests:
- Known issues:
- Important discoveries:
- Next step:

---

## 6. Scope control

Stay within the requested task.

Do not:
- Perform unrelated refactors.
- Rename unrelated files.
- Rewrite working systems without a reason.
- Modify generated files unless necessary.
- Change dependencies unless required.
- Change configuration unrelated to the task.

If you discover an unrelated issue, document it rather than silently expanding scope.

---

## 7. File exploration rules

Avoid recursively opening the entire project.

Prefer:
- Exact file lookup
- Symbol search
- Reference search
- Targeted directory inspection

Typical directories to avoid unless required:

- `node_modules/`
- `dist/`
- `build/`
- `.next/`
- `coverage/`
- `.cache/`
- generated output directories
- large log directories

Respect the project's ignore files (`.gitignore`, IDE ignore/context settings, etc.).

---

## 8. Testing rules

Use the narrowest useful validation first.

Example order:

1. Test the changed function/component.
2. Test the affected module.
3. Run the relevant integration test.
4. Run the full test suite when appropriate.

Do not run expensive full-repository operations unnecessarily.

---

## 9. Documentation quality

Documentation must be factual and concise.

Do not write speculative architecture.

If something is unknown, mark it as unknown and investigate only when required.

Prefer concrete information such as:

`src/payments/webhook.ts → validates Stripe events → updates order status`

over vague descriptions.

---

## 10. Final response after work

At the end of a task, report:

- Completed
- Files changed
- Tests/checks
- Remaining issues
- Documentation updated
- Next step, if any

Most importantly: **the persistent project documentation must already be updated before reporting completion.**
