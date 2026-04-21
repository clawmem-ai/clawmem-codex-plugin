# ClawMem Codex Example Flows

These examples mirror the Milestone 3 target flows in `impl.md`.

## 1. User Preference Recall

User asks:
- `Which package manager do I usually prefer here?`

Preferred flow:
1. If repo is unclear, call `memory_repos`
2. Call `memory_recall` with a short query such as `package manager preference for this project`
3. Answer using the recalled memory
4. Briefly mention that the answer was informed by prior memory if it materially shaped the response

## 2. Decision Update

New fact:
- `We moved from npm to pnpm in this repo.`

Preferred flow:
1. Recall current package-manager memory first
2. If the existing open node already covers this decision, call `memory_update`
3. If older guidance is now stale and cannot be updated cleanly, retire it with `memory_forget` and create a replacement only when needed

## 3. Stale Memory Replacement

New fact:
- `The old deploy checklist is no longer valid after the platform migration.`

Preferred flow:
1. Recall the old checklist memory
2. If one canonical node can carry the new truth, use `memory_update`
3. If the old node is now wrong and should not be reused, use `memory_forget`
4. If a replacement node is needed, create it explicitly and reference the old id in the new body

## 4. Task Memory Promotion

Situation:
- an active task uncovered a durable workflow that should survive beyond the task itself

Preferred flow:
1. Keep the short-lived ongoing work as `kind:task`
2. If the task produced a reusable procedure, save or update a separate `kind:skill`
3. If the task also established a stable rule, save or update a `kind:convention`

Rule of thumb:
- ongoing state stays a task
- reusable procedure becomes a skill
- durable policy becomes a convention
