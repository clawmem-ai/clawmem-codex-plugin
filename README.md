# ClawMem Codex Plugin

ClawMem for Codex is a repo-backed durable memory plugin that provisions a per-agent route, recalls relevant memory before prompts (via optional hooks), mirrors turns into conversation issues, and exposes manual memory tools over MCP. **No API key or signup required** — first tool call auto-provisions your agent identity and a default repo.

> **Using Claude Code instead?** Install [clawmem-claude-code-plugin](https://github.com/clawmem-ai/clawmem-claude-code-plugin) via the Claude Code plugin marketplace — same ClawMem backend, hooks wired in automatically.

## Install And Use

### 1. Clone the plugin

```sh
git clone https://github.com/clawmem-ai/clawmem-codex-plugin ~/clawmem-codex-plugin
```

The plugin must be a **sibling** of `~/.agents/`, not inside it. Codex resolves `source.path` in `marketplace.json` relative to the parent of `.agents/plugins/`; putting the plugin under `~/.agents/plugins/` makes the Codex Plugins UI fail with `plugin/read failed`.

### 2. Register the marketplace

Create or edit `~/.agents/plugins/marketplace.json`:

```jsonc
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

Expected layout on disk:

```
~/.agents/plugins/marketplace.json     ← marketplace manifest
~/clawmem-codex-plugin/                ← plugin (sibling of .agents)
```

### 3. Install from the Codex Plugins UI

Restart Codex (marketplace changes don't hot-reload), open the Plugins UI, find **ClawMem** under the **clawmem-ai** marketplace, and install. The bundled `.mcp.json` launches `clawmem-mcp-server` over `npx` — no extra MCP config needed.

### 4. Enable hooks (optional, experimental)

Hooks add auto-recall injection before every prompt and conversation mirroring on every turn. Currently requires a Codex feature flag plus one manual config step — both go away when Codex wires the plugin-manifest `hooks` field into its hook engine.

Add to `~/.codex/config.toml`:

```toml
[features]
codex_hooks = true
```

Copy the bundled `hooks.json` into Codex's hooks directory and export the plugin root:

```sh
export CLAWMEM_CODEX_PLUGIN_ROOT=~/clawmem-codex-plugin
cp "$CLAWMEM_CODEX_PLUGIN_ROOT/hooks/hooks.json" ~/.codex/hooks.json
```

Put the `CLAWMEM_CODEX_PLUGIN_ROOT` export in your shell init (`.zshrc` / `.bashrc`) so it persists. If you already have `~/.codex/hooks.json`, merge the `hooks.*` arrays manually instead of overwriting.

Check `~/.local/state/clawmem/debug/events.jsonl` for `recall_complete` / `mirror_complete` entries to confirm hooks are firing.

## Uninstall

Remove the plugin directory and marketplace entry:

```sh
rm -rf ~/clawmem-codex-plugin
# If ClawMem was the only plugin in the marketplace, remove the whole file:
rm ~/.agents/plugins/marketplace.json
# Otherwise edit the file and drop the `clawmem` entry.
```

Strip the plugin's installed-state block from `~/.codex/config.toml`:

```toml
# Delete this block (if present):
[plugins."clawmem@clawmem-ai"]
enabled = true
```

If you enabled hooks, remove them too:

```sh
rm ~/.codex/hooks.json
# And drop [features] codex_hooks = true from ~/.codex/config.toml if nothing else uses it.
```

Clear the ClawMem state (deletes your agent identity and route; next install will bootstrap a fresh one):

```sh
rm -rf ~/.local/state/clawmem
```

If you used the minimal install (MCP-only), remove the `[mcp_servers.clawmem]` stanza from `~/.codex/config.toml`.

Restart Codex after cleanup.

## What is implemented

- first-run bootstrap with `POST /api/v3/agents`, with automatic fallback to `POST /api/v3/anonymous/session` on older backends
- state persistence at `~/.local/state/clawmem/` with `0o700` dir / `0o600` file permissions on POSIX
- `UserPromptSubmit` hook runs recall query sanitization (envelope / URL / prior injection stripping, 1500-char cap) and injects `hookSpecificOutput.additionalContext`
- `Stop` hook mirrors turns into a `type:conversation` issue incrementally using a `lastMirroredCount` cursor; each turn becomes a dedicated comment; conversation issues are labeled `source:codex` / titled `Codex Session …`
- `PostToolUse` hook handles auto-memory sync for `Bash` (Codex only fires `PostToolUse` for `Bash`)
- MCP tools (38 total): memory CRUD, issue CRUD, collaboration F1/F2/F3 — same surface as the Claude Code plugin. See [clawmem-mcp-server README](https://github.com/clawmem-ai/clawmem-mcp-server#tools).

All `collaboration_*` write operations require `confirmed=true`. Memory writes are idempotent: `memory_store` computes `sha256(detail)` and merges into an existing memory when the hash matches.

### Capability caveats vs Claude Code

- **No `SessionEnd` event in Codex** — conversation issues stay `status:active` and don't auto-close. Close them via the ClawMem console (`memory_console`) when you want to archive.
- **`PostToolUse` only fires for `Bash` in Codex** (Claude Code also fires for Write/Edit/MultiEdit). Use `memory_store` explicitly for durable facts until Codex widens the matcher.
- **Plugin-manifest `hooks` field not wired yet** — `.codex-plugin/plugin.json` accepts a `hooks` field in the spec, but the Codex manifest parser currently ignores it. That's why the manual `cp hooks.json` step is still required.

## Minimal install (MCP server only)

Skip the plugin if you only want the MCP tools and are fine prompting the model explicitly each time. Add to `~/.codex/config.toml`:

```toml
[mcp_servers.clawmem]
command = "npx"
args = ["-y", "clawmem-mcp-server"]
env = { CLAWMEM_AGENT_PREFIX = "codex", CLAWMEM_STATE_DIR = "~/.local/state/clawmem" }
```

Without the bundled skill, Codex has the tools but no discipline about when to call them. **Not recommended** — exists for MCP-only smoke tests and environments where the plugin install path isn't possible.

## Environment variables

The plugin's `.mcp.json` presets:

| Env var | Value | Why |
| --- | --- | --- |
| `CLAWMEM_STATE_DIR` | `~/.local/state/clawmem` | Persist token + route outside the npx cache. Hooks read the same path. |
| `CLAWMEM_AGENT_PREFIX` | `codex` | Tags the auto-provisioned agent login as a Codex user, and drives the `source:codex` conversation label. |

For hooks, also export `CLAWMEM_CODEX_PLUGIN_ROOT=~/clawmem-codex-plugin` in your shell init so `hooks.json` can resolve `node "$CLAWMEM_CODEX_PLUGIN_ROOT/hooks/*.js"`.

Other overrides: `CLAWMEM_BASE_URL`, `CLAWMEM_TOKEN`, `CLAWMEM_MEMORY_RECALL_LIMIT`, `CLAWMEM_MEMORY_AUTO_RECALL_LIMIT`. See [clawmem-mcp-server configuration](https://github.com/clawmem-ai/clawmem-mcp-server#configuration-env-vars) for the full list.

## Related repos

- [clawmem-mcp-server](https://github.com/clawmem-ai/clawmem-mcp-server) — shared stdio MCP server (npm: `clawmem-mcp-server`)
- [clawmem-claude-code-plugin](https://github.com/clawmem-ai/clawmem-claude-code-plugin) — Claude Code flavor with hooks wired in automatically
