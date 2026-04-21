# clawmem-codex-plugin

ClawMem durable-memory plugin for Codex. Gives Codex repo-aware long-term memory backed by the ClawMem hosted service (default `git.clawmem.ai`).

- MCP server: launched over stdio from the shared [clawmem-mcp-server](https://github.com/clawmem-ai/clawmem-mcp-server) repo via `npx`.
- Skill: [`skills/clawmem-codex/SKILL.md`](skills/clawmem-codex/SKILL.md) — tells Codex when to recall, save, update, or forget memories.
- Bootstrap: automatic on first tool call. No token or repo setup required.

## Install

### Via a marketplace (recommended)

Add the plugin to one of your Codex marketplaces (`~/.agents/plugins/marketplace.json` for personal use or `./.agents/plugins/marketplace.json` for a per-repo marketplace):

```json
{
  "name": "clawmem-ai",
  "interface": { "displayName": "ClawMem" },
  "plugins": [
    {
      "name": "clawmem",
      "source": {
        "source": "git",
        "url": "https://github.com/clawmem-ai/clawmem-codex-plugin"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Productivity"
    }
  ]
}
```

Then in Codex, open the Plugins UI and install `clawmem` from the `ClawMem` marketplace. Start a fresh session to load the MCP server and skill together.

### Local development

Clone the repo and use a `"source": "local"` marketplace entry (see [`examples/repo-marketplace.json`](examples/repo-marketplace.json) and [`examples/personal-marketplace.json`](examples/personal-marketplace.json)).

## Architecture

- `.codex-plugin/plugin.json` — Codex plugin manifest (points at the skill dir and `.mcp.json`).
- `.mcp.json` — stdio MCP declaration. Runs `npx -y github:clawmem-ai/clawmem-mcp-server`; `npx` fetches and caches the server on first launch.
- `skills/clawmem-codex/` — the Codex-specific memory protocol skill.
- `bin/clawmem.mjs` — optional manual bootstrap / auth helper (not required; the MCP server auto-bootstraps).

### Environment

Everything is optional. Defaults live inside `clawmem-mcp-server`. The values this bundle sets:

| Env var | Value | Why |
| --- | --- | --- |
| `CLAWMEM_STATE_DIR` | `~/.local/state/clawmem` | Persist token + route outside of npx's cache directory so the auto-provisioned identity survives server restarts. |
| `CLAWMEM_AGENT_PREFIX` | `codex` | Tags the auto-provisioned agent login as a Codex user (defaults to `claude` otherwise). |

Override anything via your shell or the `env` block of `.mcp.json`.

## Validation

In a fresh session, try:

1. `What memory repos can I access in ClawMem?` → model calls `memory_repos` and lists the auto-provisioned default repo (`codex-<slug>/memory`).
2. `Remember that this project uses pnpm and the old npm instructions are stale.` → model calls `memory_store` (or `memory_update` if a conflicting memory exists).
3. `Search ClawMem for decisions about package managers.` → model calls `memory_recall`; if keyword search misses, falls back to `memory_list`.

## Related repos

- [clawmem-mcp-server](https://github.com/clawmem-ai/clawmem-mcp-server) — the shared stdio MCP server.
- [clawmem-claude-code-plugin](https://github.com/clawmem-ai/clawmem-claude-code-plugin) — the Claude Code flavor of the same memory system.
