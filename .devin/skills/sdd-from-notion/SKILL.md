---
name: sdd-from-notion
description: Turn a task from the Notion TUDOLAR backlog page into an OpenSpec change folder (proposal, specs, design, tasks), validate it with the OpenSpec CLI, and write the change id and status back into the backlog.
argument-hint: "[T03 | title fragment | empty]"
allowed-tools:
  - read
  - grep
  - glob
  - exec
  - mcp__notion__*
triggers:
  - user
---

# SDD from Notion

Bridge one task from the Notion TUDOLAR backlog page into the OpenSpec workflow. This skill plans;
it never implements. Planning artifacts are the deliverable, and the human reviews them before any
code exists.

## Step 0 - Load the bridge configuration

Read `.devin/notion-sdd.json`.

- `backlogPageUrl` is the Notion page holding the sequential backlog. If it is empty, stop and ask
  the user for the page URL. Do not guess one.
- Keep `changeIdPrefix`, `sddMarker`, `doneMarker`, and `statuses` for later steps.

If the Notion MCP is not authenticated, stop and ask the user to run `devin mcp login notion`.

## Step 1 - Read the backlog page

Call `notion-fetch` on `backlogPageUrl`. The backlog is a page, not a database:

- Section `## Cadena de tareas` holds one `### Tnn — Title` heading per task.
- Each task body carries **Responsable sugerido**, **Depende de**, bullets, and
  **Criterios de aceptación**.
- `## Reglas para el handoff entre agentes` defines the state convention: a task is eligible only
  when its predecessor is `doneMarker`, and a reviewer marks it Done or returns it with concrete
  defects.

Parse the page into a list of tasks: id (`T00`…), title, dependency, body, and acceptance criteria.
Also detect whether a task already carries an `sddMarker` line.

## Step 2 - Select the task

- **Argument is a task id** (`T03`): select it.
- **Argument is a title fragment**: match it against the task titles and select the unique match.
  If several match, list them and ask.
- **No argument**: select the first task in the chain that has no `sddMarker` line. Because the
  backlog is strictly sequential, that is the active task. If its predecessor is not marked
  `doneMarker`, say so and ask whether to proceed anyway; do not silently skip the handoff rule.
- **Several candidate tasks**: never batch them. One task becomes one change. List them with their
  status and ask which one to plan.

## Step 3 - Completeness gate

The page already provides acceptance criteria. Confirm the selected task has all three of:

1. the problem or motivation,
2. the scope, including what is explicitly out of scope,
3. acceptance criteria observable from outside the system.

This mirrors `tdd-red-first` step 1.

- If any of the three is missing or ambiguous in a way that would change scope, externally
  observable behavior, compatibility, or acceptance criteria, ask **one** focused question and
  offer the reading you would otherwise assume.
- Never invent an endpoint shape, error semantics, monetary rule, market boundary, or business
  invariant. Several backlog tasks explicitly forbid this; when a task depends on an undecided
  product decision, surface the dependency instead of choosing for the user. For minor details,
  make a reasonable assumption and record it in the proposal.
- Decide up front whether behavior changes at all. Audit, decision, documentation, and tooling
  tasks (T00, T01, T02 are the clear cases) have no spec delta and must set `skip_specs: true`
  instead of inventing a requirement.

## Step 4 - Derive the change id

Build the id as `<changeIdPrefix><nn>-<slug>` from the task id and a kebab-case slug of its title:
lowercase, ASCII, no date, and describing a durable behavior rather than the work item. For
example, `T03 — Integrar Prisma sin romper persistencia existente` becomes
`t03-integrate-prisma-persistence`.

Run `openspec list` to check for a collision. If a change with that id already exists, do not
create a second one: ask whether to continue it with `/openspec-update-change` or to pick another
id.

## Step 5 - Create the change through the OpenSpec workflow

Create the change with the `openspec-propose` skill. This is an **explicit** OpenSpec request: say
so, so the propose workflow does not fall back to "answer normally without OpenSpec".

- Invoke `openspec-propose` with the derived change id and everything gathered in steps 1 to 3:
  the task body, its dependency, and its acceptance criteria, not just the title.
- Let it drive the CLI (`openspec new change`, `openspec status --change`,
  `openspec instructions`) and write artifacts to the paths it resolves. Its instructions and
  templates are authoritative, and `openspec/config.yaml` carries this project's rules.
- **Never hand-create `openspec/changes/<id>/` or write the artifacts from memory.** Doing so skips
  `.openspec.yaml` and the schema templates.
- Turn the task's acceptance criteria into the change's requirements and scenarios. The proposal
  must state what is out of scope, and `tasks.md` must put the failing test before the
  implementation for each behavior, naming the exact test file and command.

## Step 6 - Record traceability

Add the Notion origin to `proposal.md` so the change can be traced both ways. Keep it to one line,
in this shape:

```
Source: Notion <task id> — <page-url> — <task title>
```

## Step 7 - Validate

Run `openspec validate <change-id> --strict` and read the output. Do not present the plan as ready
while validation fails. Fix the artifacts and rerun.

If the change is correctly a no-behavior change, confirm `skip_specs: true` is set in
`.openspec.yaml` rather than adding a placeholder requirement.

## Step 8 - Write back to the backlog page

Read the MCP resource `notion://docs/enhanced-markdown-spec` once before writing page content, or
`notion-fetch` that URI if the client cannot read resources. Then make the smallest edit.

Record the SDD state directly under the task heading, on one line:

```
**SDD:** <change-id> · <status> · openspec/changes/<change-id>
```

Use `notion-update-page` on the backlog page:

- **No marker yet**: `command: "update_content"` with `content_updates` whose `old_str` is the
  exact `### Tnn — Title` heading line and whose `new_str` is that heading followed by the marker
  line. This inserts the state immediately below the heading without touching the rest of the task.
- **Marker already present**: match the existing marker line as `old_str` and replace it with the
  updated one. Never insert a second marker.

Status starts as `statuses.planning`.

Then post the audit trail. Call `notion-get-comments` on the page first and look for a comment
already starting with the change id; if one exists, update it with `notion-update-comment` instead
of posting another. Otherwise call `notion-create-comment` with `page_id` and the **`markdown`**
parameter (not `text`): the change id, the folder path, and a one-line summary of what the plan
covers.

If an edit would remove content the user did not ask to remove, stop and ask for confirmation
first. Report any `warnings` the tool returns.

## Step 9 - Report

Summarize for the user:

- the Notion task id and title,
- the change id and folder path,
- which artifacts were created and which conditional artifact was skipped and why,
- the `openspec validate --strict` result,
- what was written back to Notion,
- the next step: review the artifacts, then run `/openspec-apply-change` in a fresh session.

## Guardrails

- **Planning only.** Do not edit project code, do not implement tasks, and do not start the apply
  workflow. The user reviews the artifacts first.
- One task becomes one change. Do not batch backlog tasks into a single change unless the user
  explicitly asks.
- Respect the hexagonal architecture, PostgreSQL/PostGIS, and monetary rules in `AGENTS.md`. A
  design that puts domain rules in a controller or an HTTP DTO in `application/` is wrong.
- Respect the backlog's own sequencing and its rule that no agent invents product decisions.
