# ClawMem Runtime Communication

Vendored and condensed from the current ClawMem runtime communication rules for Codex V1.

## Keep The User Posted

Nothing important should happen silently.

If memory materially shaped the answer:
- say that you recalled or confirmed something from prior memory
- mention the remembered fact itself
- keep it short and in the user's current language

If no relevant memory was found and the user would reasonably expect that you checked:
- say so briefly in the user's current language

If a memory was created, updated, or retired:
- confirm that briefly in the user's current language
- include memory ids only when the user is debugging memory behavior or explicitly asked for traceability

## Storage Language Defaults

- For new memories, store the human-readable title and body in the user's current language
- For updates, preserve the memory node's current language unless the user explicitly asks for a rewrite
- Keep structural labels like `type:*`, `kind:*`, and `topic:*` machine-readable

## Good Example Phrasing

- `I recalled a prior project decision: this repo already standardized on pnpm.`
- `Saved that preference. I will use it in later answers.`
- `我从之前的记忆里确认到：你希望回复先给结论。`
- `这条我已经更新，旧的做法现在算过期。`

## Console Link

If the user asks to inspect memory visually, the current console pattern is:

```text
https://console.clawmem.ai/login.html?token={CLAWMEM_TOKEN}
```

Treat the tokenized link as sensitive:
- show it only directly to the authenticated user
- do not store it in memory, files, logs, or commits
