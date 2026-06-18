# ClawMem Memory Schema

Vendored and condensed from the current ClawMem runtime schema rules for Codex V1.

## Records

- `type:conversation`: mandatory transcript mirror and raw episodic source
- `type:memory`: durable distilled memory

Conversation issues are provenance, audit trail, and rebuild input. They are not
the normal online recall layer. If a transcript fact should affect future answers
or behavior, write it into a `type:memory` issue.

Wiki pages are context maps, not memory records. They summarize important current
context and cite issue memories with visible references.

When one memory depends on, refines, supersedes, or generalizes another, mention
the related `#ID` explicitly in the body.

## Labels

Plugin-managed memories always include:
- `type:memory`

Plugin-managed memories may also include:
- one `kind:*`
- zero or more `topic:*`

Lifecycle stays in native issue state:
- open issue = active memory
- closed issue = stale or superseded memory

Do not use `scope:*` labels by default. Scope is represented by repo/org/team
boundaries. Do not add lifecycle labels by default; issue state is lifecycle.

## Default Kinds

| Label | Use for |
| --- | --- |
| `kind:fact` | Stable declarative truth about a user, project, system, or world state |
| `kind:preference` | A person's or team's preferred style, default, taste, or recurring choice |
| `kind:convention` | Standing agreement, rule, policy, or norm |
| `kind:decision` | A choice that has been made and should guide future work |
| `kind:task` | Ongoing or future work that should remain active until resolved |
| `kind:skill` | When/how to use, create, or update a skill, doc, or runbook |
| `kind:lesson` | Correction, mistake, postmortem, or rule learned from experience |
| `kind:profile` | Compact model of a person, project, team, repo, or agent |
| `kind:insight` | Synthesized pattern, interpretation, hypothesis, or mental model |

Use `kind:insight` sparingly. If the memory is a direct truth, prefer
`kind:fact`; if it came from a correction or failure, prefer `kind:lesson`.

`kind:skill` issues should remember when a reusable procedure should be used,
created, or updated. Do not bury long executable workflows in memory issues; put
those in skills, repo docs, or runbooks.

## Body Format

Use GitHub Flavored Markdown:

```markdown
## Memory

The durable fact, preference, decision, task, lesson, profile note, insight, or
skill trigger. Include exact values and boundaries needed for future answers.

## Relations

- Source: #123
- Supersedes: #88

## Notes

Optional caveats or review notes.

<!-- clawmem
schema_version: clawmem/v2
valid_from: 2026-04-24
valid_to:
-->
```

The hidden metadata block is lifecycle metadata. Do not use it as a substitute
for answerable event details in `## Memory`.

Default metadata:

- `schema_version`: schema identifier
- `valid_from`: when the memory statement becomes valid for future use, when
  known
- `valid_to`: when the statement stops being valid, if known

Do not add `memory_id` by default; the GitHub issue number is the durable
human-facing identifier. Do not add `confidence` unless ClawMem has a concrete
confidence policy or review workflow that uses it. Do not add agent-only
authorship fields by default; GitHub records issue and comment authors.

## Answerable Text

`## Memory` must contain enough visible detail for future recall and answering
without reopening raw transcript comments.

Preserve:

- subject, fact, scope, condition, trigger, exception, and uncertainty boundary
- exact names, places, organizations, dates, months, years, durations, quantities
- list items, relation targets, causes, stated reasons, and constraints
- event date plus source date or original relative phrase when useful
- supported likely/counterfactual answer shape when the source supports it

Do not generalize away answer-bearing values. If the source says `Sweden`, do
not store only `home country`. If the source lists exact hobbies, do not store
only `hobbies`.

One memory may contain several details only when they support the same
subject-property, canonical set, event, decision, skill trigger, lesson, or
causal link. Otherwise split it.

Useful body shapes:

- `atomic fact`: one subject, one answer-bearing fact
- `canonical set`: current known set of activities, people, places, tools, pets,
  constraints, or preferences
- `profile capsule`: compact durable model of a person, team, repo, or project
- `temporal event`: event date, source date, and useful original relative phrase
- `literal anchor ledger`: scoped bullets for short exact values that would
  otherwise be lost
- `causal link`: cause, effect, and affected entity or decision
- `supported inference`: likely yes/no, preference, leaning, status,
  counterfactual answer, suitable option, or recommendation with basis and
  boundary visible

Literal anchor ledgers are usually `kind:fact`; do not create a new `kind:*`
label for anchors.

## Temporal Semantics

`valid_from` and `valid_to` describe the validity of the memory statement, not
necessarily the event date.

Rules:

- event dates belong in visible `## Memory` text
- convert relative dates only when the source date is known
- preserve the original relative phrase when it may matter for review
- preserve temporal granularity
- do not invent exact dates from vague source timestamps
- use `as of <source_date>` for ongoing states when event timing is not exact
- do not rely on `valid_from` to answer event-date questions

## Update Versus New

Durable knowledge should evolve by updating canonical nodes instead of spawning near-duplicates.

- Before `memory_store`, recall the same topic first
- If an open memory already covers the same fact, decision, workflow, or task, use `memory_update`
- Only create a new node when the new fact is semantically orthogonal to every existing canonical node
- If a memory is simply no longer true and has no replacement, use `memory_forget`
- If semantics changed enough that one node cannot carry both, open a replacement node and retire the old one with `superseded-by: #<new-id>`
- If support is uncertain or not durable enough, choose `NONE` and ask the user
  when the uncertainty matters. Do not create candidate issues or candidate
  labels.

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

## Wiki Context Maps

Issue memory is ground truth. Wiki is a context map.

Use wiki pages for context that is:

- high-importance
- high-frequency
- cross-task
- current project/user/topic/workflow background
- useful for fast agent startup

Recommended page families:

- `users/{user}`
- `projects/{project}`
- `topics/{topic}`
- `decisions/{area}`
- `workflows/{workflow}`

Avoid default `sessions/*` wiki pages; conversation issues already mirror raw
episodes.

Wiki pages should:

- summarize the current useful view
- cite issue memories with visible `#123` or `owner/repo#123` references
- preserve enough refs for traceability and recall boosting
- avoid unsupported claims
- avoid copying every memory

Wiki references are relation and ranking signals, not filters. Retrieval must
search issue memories directly in parallel with wiki search so orphan memories
remain discoverable.

If wiki conflicts with an open memory issue, trust the issue and update the wiki.
