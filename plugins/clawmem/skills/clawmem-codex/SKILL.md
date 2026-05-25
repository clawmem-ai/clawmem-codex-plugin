---
name: clawmem-codex
description: >
  ClawMem durable memory protocol for Codex. Use when the ClawMem bundle is installed
  and the task may benefit from recalling prior user preferences, project history,
  decisions, lessons, workflows, active tasks, or shared repo memory in ClawMem; or
  when Codex should store, update, or retire durable ClawMem knowledge through the
  hosted `memory_*` MCP tools.
---

# ClawMem For Codex

ClawMem is the durable memory system for this Codex bundle.

Codex does not get OpenClaw-style lifecycle hooks here, so follow this protocol deliberately on every task boundary.

Hard rule:
- For ClawMem durable knowledge, use ClawMem `memory_*` tools.
- Do not write that durable knowledge into Codex local file-based memories, `MEMORY.md`, or other Codex-native memory artifacts.

## Activation And Bootstrap

Codex loading the plugin, showing MCP tools, or restarting the session does not prove that ClawMem has provisioned an agent identity yet. Restart only reloads marketplace and plugin configuration.

When a task first needs ClawMem, or when the user asks whether ClawMem is installed, active, provisioned, or working:
- Call `clawmem_codex_bootstrap` first. It is the Codex-specific activation and verification tool.
- Treat a successful bootstrap result as the source of truth for the current agent login, default repo, state path, optional hooks, and pending repo invitations.
- If `clawmem_codex_bootstrap` is unavailable, call `memory_repos` as the fallback provisioning trigger and tell the user the installed `clawmem-mcp-server` may need to be updated.
- Do not ask the user to restart repeatedly to activate ClawMem. Restart only helps after marketplace/plugin config changes.

## V1 Tool Surface

Use these tools for the V1 memory-first loop:
- `clawmem_codex_bootstrap`
- `memory_repos`
- `memory_labels`
- `memory_recall`
- `memory_list`
- `memory_get`
- `memory_store`
- `memory_update`
- `memory_forget`

## Core Loop

1. Before answering, ask whether prior memory could materially improve the answer.
   - Default to yes for user preferences, project history, decisions, lessons, conventions, recurring problems, workflows, and active tasks.
   - If the target repo is unclear, call `memory_repos` first.
   - If relevant memory may exist, call `memory_recall` with a short natural-language intent.
   - If recall is weak or empty and correctness depends on whether memory exists, cross-check with `memory_list` or `memory_get`.

2. While answering, keep memory transparency visible but short.
   - If recalled memory materially shaped the answer, say so in the user's current language.
   - Use the communication rules in `references/communication.md`.

3. After meaningful work, ask whether the turn created or changed durable knowledge.
   - Store one durable fact per memory.
   - Use `memory_update` when an existing canonical node already covers the same fact, decision, workflow, or task.
   - Use `memory_store` only for genuinely new orthogonal knowledge.
   - Use `memory_forget` when old memory is stale, superseded, or harmful if reused.

4. Before inventing new schema, inspect `memory_labels`.
   - Reuse existing `kind:*` and `topic:*` labels first.
   - Keep structural labels machine-readable.

## Repo-Aware Behavior

ClawMem is repo-backed and repo-aware.

- Do not assume the default repo is the only place relevant memory can live.
- Personal preferences usually belong in the default repo.
- Project conventions, architecture, and ongoing work often belong in a project repo.
- Shared knowledge often belongs in a shared repo.
- If likely memory lives outside the default repo, choose the repo deliberately before `memory_recall`, `memory_list`, `memory_get`, `memory_store`, `memory_update`, or `memory_forget`.

Read `references/routing.md` whenever repo selection is ambiguous.

## Schema Discipline

Read `references/schema.md` before the first write in a task segment, and again whenever you need to decide:
- which `kind:*` label applies
- whether this should be an update versus a new node
- whether a stale node should be retired
- how to shape a `kind:skill` memory body

Important distinction:
- A ClawMem `kind:skill` memory is a durable memory node stored through `memory_store` or `memory_update`.
- It is not a file-based Codex skill package.
- If the user says "remember this procedure" or "save this as a skill", default to a ClawMem `kind:skill` memory unless they explicitly ask for an on-disk skill package.

## Read The Right Reference

- `references/routing.md`: repo selection, explicit retrieval, and query discipline
- `references/schema.md`: memory kinds, update-vs-new rules, and `kind:skill` template
- `references/communication.md`: user-visible transparency and confirmation rules
- `references/examples.md`: example V1 flows for recall, update, forget, and task promotion
