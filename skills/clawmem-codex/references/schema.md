# ClawMem Memory Schema

Vendored and condensed from the current ClawMem runtime schema rules for Codex V1.

## Graph Model

- Issues are nodes
- Labels are schema
- `#ID` references are edges

When one memory depends on, refines, supersedes, or generalizes another, mention the related `#ID` explicitly in the body.

## Managed Labels

Plugin-managed memories always include:
- `type:memory`

Plugin-managed memories may also include:
- one `kind:*`
- zero or more `topic:*`

Lifecycle stays in native issue state:
- open issue = active memory
- closed issue = stale or superseded memory

## Kinds

| Kind | Label | Use |
|---|---|---|
| Core fact | `kind:core-fact` | Stable truths that should update in place |
| Convention | `kind:convention` | Agreed rules or policies |
| Lesson | `kind:lesson` | Corrections, postmortems, mistakes worth preserving |
| Skill | `kind:skill` | Repeatable workflows or playbooks |
| Task | `kind:task` | Ongoing work that should stay visible over time |

## Update Versus New

Durable knowledge should evolve by updating canonical nodes instead of spawning near-duplicates.

- Before `memory_store`, recall the same topic first
- If an open memory already covers the same fact, decision, workflow, or task, use `memory_update`
- Only create a new node when the new fact is semantically orthogonal to every existing canonical node
- If a memory is simply no longer true and has no replacement, use `memory_forget`
- If semantics changed enough that one node cannot carry both, open a replacement node and retire the old one with `superseded-by: #<new-id>`

## Schema Evolution

- Before inventing a new `kind` or `topic`, call `memory_labels`
- Reuse existing schema whenever it fits
- If no existing label fits, create one short stable machine-readable label
- Stay within `kind:*` and `topic:*`
- Do not create translated variants or near-duplicate synonyms

## `kind:skill` Body Template

In ClawMem, a "skill" means a durable `kind:skill` memory node, not a file-based Codex skill package.

When writing a new `kind:skill`, shape the memory body with this YAML-on-top skeleton:

```yaml
trigger: When this skill applies.
steps:
  - First action.
  - Next action.
  - Final action.
checks:
  - Signals that the skill succeeded.
  - Signals that the skill is the wrong fit.
last_validated: 2026-04-20
evidence:
  - "#42"
  - "#77"
```

Narrative notes can follow below the YAML block.

When the skill is re-used successfully, `memory_update` it to:
- bump `last_validated`
- append new supporting evidence
- refine `steps` or `checks` only when the formulation clearly improved

## Storage Language

- For new memories, write human-readable title and body in the user's current language by default
- For updates, preserve the existing node language unless the user explicitly asks for a rewrite
- Keep machine-readable labels and structural markers unchanged

## Final Rule

If you are writing something so Codex remembers it later, store it in ClawMem. If you are writing something for a tool or human to read directly, write a file instead.
