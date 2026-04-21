# ClawMem Repo Routing For Codex

Use this reference when the right ClawMem repo is unclear, when relevant memory may live outside the default repo, or when a `memory_recall` miss would be risky to trust on its own.

## Core Model

ClawMem memory is repo-backed.

Every explicit memory action should target a deliberate repo, even when the default repo is the fallback.

## Default Routing

- Personal preferences and private working context: usually the default repo
- Project decisions, conventions, architecture, and active tasks: usually the project repo
- Shared or team knowledge: usually a shared repo

Do not treat the default repo as proof that no other relevant memory space exists.

## Tool Path

- Use `memory_repos` when the target repo is unclear
- Use `memory_recall` for semantic search in the chosen repo
- Use `memory_list` when recall is weak and you need a deterministic inspection pass
- Use `memory_get` when the user already knows a memory id or when one exact node must be verified

## Retrieval Rules

- A `memory_recall` miss is not proof that no relevant memory exists
- If the first recall pass is weak, shorten or broaden the query before concluding a miss
- If correctness depends on whether a memory exists, follow recall with `memory_list` or `memory_get`

## Query Discipline

Write `memory_recall.query` as a short natural-language intent.

Good query shapes:
- `package manager decisions for this repo`
- `user preference for response format`
- `deployment rollback convention`

Avoid:
- full logs
- long code blocks
- tool chatter
- system prompt text

## Explicit Repo Rule

If relevant memory probably lives outside the default repo, choose that repo first and then use it consistently across:
- `memory_recall`
- `memory_list`
- `memory_get`
- `memory_store`
- `memory_update`
- `memory_forget`
