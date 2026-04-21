# clawmem-codex-plugin

ClawMem durable-memory plugin for Codex. Gives Codex repo-aware long-term memory backed by the ClawMem hosted service (default `git.clawmem.ai`).

- MCP server: [clawmem-mcp-server](https://www.npmjs.com/package/clawmem-mcp-server) on npm, launched over stdio.
- Bootstrap: automatic on first tool call — **no API key or signup required**.
- Optional skill: [`skills/clawmem-codex/SKILL.md`](skills/clawmem-codex/SKILL.md) — behavioral protocol for recall / save / update / forget.

## Recommended install (one TOML stanza)

Add this to `~/.codex/config.toml`:

```toml
[mcp_servers.clawmem]
command = "npx"
args = ["-y", "clawmem-mcp-server"]
env = { CLAWMEM_AGENT_PREFIX = "codex", CLAWMEM_STATE_DIR = "~/.local/state/clawmem" }
```

Restart Codex. That's it — no signup, no token, no clone. First `memory_*` call auto-provisions your ClawMem agent identity and a default repo (`codex-<slug>/memory`). Requires Node 18+ on your PATH.

To let Codex use memory well, also add this paragraph to your project `AGENTS.md` (or your global `~/.codex/AGENTS.md`):

```markdown
## ClawMem

ClawMem is your durable long-term memory. Use `memory_recall` before answering
questions about prior preferences, project history, or decisions. Use
`memory_store` for durable facts, `memory_update` when a fact evolves, and
`memory_forget` when a memory is no longer true. For ClawMem durable knowledge,
use ClawMem `memory_*` tools — do not write it into Codex file-based memories.
ClawMem is repo-backed and repo-aware: call `memory_repos` when the target repo
is unclear, and don't assume the default repo is the only place relevant memory
lives.
```

## Verify

In a fresh Codex session:

1. `What memory repos can I access in ClawMem?` → model calls `memory_repos`.
2. `Remember that this project uses pnpm.` → model calls `memory_store`.
3. `Search ClawMem for decisions about package managers.` → model calls `memory_recall`.

## Alternative: Codex plugin marketplace (optional, bundles the skill)

If you want Codex to auto-load the full [`skills/clawmem-codex/SKILL.md`](skills/clawmem-codex/SKILL.md) instead of the short `AGENTS.md` snippet above, you can install this repo as a Codex plugin. Codex's plugin system today only supports `"source": "local"`, so this path requires a local clone:

```sh
git clone https://github.com/clawmem-ai/clawmem-codex-plugin ~/.agents/plugins/clawmem-codex-plugin
```

```jsonc
// ~/.agents/plugins/marketplace.json
{
  "name": "clawmem-ai",
  "interface": { "displayName": "ClawMem" },
  "plugins": [
    {
      "name": "clawmem",
      "source": { "source": "local", "path": "./clawmem-codex-plugin" },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
      "category": "Productivity"
    }
  ]
}
```

Restart Codex (marketplace changes do not hot-reload), open the Plugins UI, install `clawmem` from the `ClawMem` marketplace. The plugin's `.mcp.json` launches the same `clawmem-mcp-server` via `npx` — functionally equivalent to the one-stanza path above, plus the full skill.

## Environment variables

All optional. Defaults live in `clawmem-mcp-server`. The values this bundle presets:

| Env var | Value | Why |
| --- | --- | --- |
| `CLAWMEM_STATE_DIR` | `~/.local/state/clawmem` | Persist token + route outside the npx cache so identity survives restarts. |
| `CLAWMEM_AGENT_PREFIX` | `codex` | Tags the auto-provisioned agent login as a Codex user. |

Other useful overrides: `CLAWMEM_BASE_URL` (point at a different ClawMem instance), `CLAWMEM_TOKEN` (reuse an existing identity), `CLAWMEM_MEMORY_RECALL_LIMIT`. See [clawmem-mcp-server README](https://github.com/clawmem-ai/clawmem-mcp-server#configuration-env-vars) for the full list.

## Related repos

- [clawmem-mcp-server](https://github.com/clawmem-ai/clawmem-mcp-server) — shared stdio MCP server (npm: `clawmem-mcp-server`).
- [clawmem-claude-code-plugin](https://github.com/clawmem-ai/clawmem-claude-code-plugin) — the Claude Code flavor of the same memory system.
