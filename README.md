# clawmem-codex-plugin

ClawMem durable-memory plugin for Codex. Gives Codex repo-aware long-term memory backed by the ClawMem hosted service (default `git.clawmem.ai`). **No API key or signup required** — first tool call auto-provisions your agent identity and a default repo.

Three layers of integration, stacked:

| Layer | Gives Codex | Where it lives |
| --- | --- | --- |
| **MCP server** (required) | `memory_*` tools — recall, store, update, forget | [`clawmem-mcp-server`](https://www.npmjs.com/package/clawmem-mcp-server) on npm, launched over stdio |
| **Skill** (recommended) | Behavioral protocol — *when* to recall / save / update / forget, repo-aware routing | [`skills/clawmem-codex/SKILL.md`](skills/clawmem-codex/SKILL.md) in this repo |
| **Hooks** (experimental) | Runtime-level auto-recall before every prompt, conversation mirroring on every turn stop | [`hooks/`](hooks/) in this repo. Requires Codex feature flag `codex_hooks` |

Skip the skill and your model has the tools but no discipline about when to use them. Skip the hooks and recall must be triggered explicitly by the model instead of running before every prompt.

## Install (recommended: MCP server + skill)

This path is the one to use. It wires up `memory_*` tools and drops the ClawMem behavior protocol into Codex so the model actually uses them correctly.

### 1. Clone the plugin

```sh
git clone https://github.com/clawmem-ai/clawmem-codex-plugin ~/clawmem-codex-plugin
```

> **Why `~/` and not `~/.agents/plugins/`?** Codex resolves `source.path` in `marketplace.json` relative to the **marketplace root** (the directory *containing* `.agents/plugins/`), not the directory containing `marketplace.json` itself. With the marketplace at `~/.agents/plugins/marketplace.json`, `"./clawmem-codex-plugin"` resolves to `~/clawmem-codex-plugin`. Putting the plugin under `~/.agents/plugins/` will make the Codex Plugins UI fail with `plugin/read failed`.

The plugin bundles the full [`skills/clawmem-codex/SKILL.md`](skills/clawmem-codex/SKILL.md) and references (routing, schema, communication, examples) — the behavioral discipline the bare-MCP install lacks.

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

The resulting layout on disk:

```
~/.agents/plugins/marketplace.json     ← marketplace manifest
~/clawmem-codex-plugin/                ← plugin (sibling of .agents, NOT inside it)
```

### 3. Install from the Codex Plugins UI

Restart Codex (marketplace changes don't hot-reload). Open the Plugins UI, find **ClawMem** in the **clawmem-ai** marketplace, and install. The plugin's bundled `.mcp.json` launches `clawmem-mcp-server` over `npx` — no extra MCP config needed.

### 4. Verify

In a fresh Codex session:

1. `What memory repos can I access in ClawMem?` → model calls `memory_repos`.
2. `Remember that this project uses pnpm.` → model calls `memory_store`.
3. `Search ClawMem for decisions about package managers.` → model calls `memory_recall`.

If the model reaches for the tools *without* you pasting in a long instruction block, the skill is loaded.

## Enable hooks (experimental, optional)

Hooks give you Claude-Code-plugin parity: recall is auto-injected before every prompt, and every turn is mirrored into a ClawMem conversation issue. Today this requires a Codex feature flag and one manual config step — both go away when Codex wires the plugin-manifest `hooks` field into its hook engine.

### 1. Enable the feature flag

Add to `~/.codex/config.toml`:

```toml
[features]
codex_hooks = true
```

### 2. Merge the hooks config

The plugin ships [`hooks/hooks.json`](hooks/hooks.json) with three handlers — UserPromptSubmit (recall), Stop (conversation mirror), PostToolUse (auto-memory sync on matching paths). Codex only reads hooks from `~/.codex/hooks.json` or `<project>/.codex/hooks.json`, so copy or merge:

```sh
export CLAWMEM_CODEX_PLUGIN_ROOT=~/clawmem-codex-plugin
cp "$CLAWMEM_CODEX_PLUGIN_ROOT/hooks/hooks.json" ~/.codex/hooks.json
```

(If you already have a `~/.codex/hooks.json`, merge the `hooks.*` arrays manually instead of overwriting.)

Put the `CLAWMEM_CODEX_PLUGIN_ROOT` export in your shell init (`.zshrc` / `.bashrc`) so it persists across sessions. The hook commands also respect `CLAWMEM_STATE_DIR` (defaults to `~/.local/state/clawmem`, matching the MCP server's state dir, so both sides read/write the same `state.json`).

### 3. Restart Codex and test

Ask a question whose answer lives in memory. The `UserPromptSubmit` hook should inject a `<clawmem-context>` block into the model's view before it generates a response. Check `~/.local/state/clawmem/debug/events.jsonl` to see `recall_success` / `recall_miss` / `mirror_complete` entries.

### Capability caveats (today)

- **`SessionEnd` doesn't exist in Codex** — Codex's hook surface is `PreToolUse, PermissionRequest, PostToolUse, SessionStart, UserPromptSubmit, Stop`. Conversation issues mirrored by the `Stop` hook stay in `status:active` and don't get auto-closed; close them via the ClawMem console (`memory_console`) when you want to archive.
- **`PostToolUse` only fires for `Bash` in Codex** (Claude Code also fires it for Write/Edit/MultiEdit). The `post-tool-use.js` hook will correctly pick up delete commands targeting auto-memory paths but cannot mirror direct file writes the way the Claude Code plugin does. Use `memory_store` explicitly for durable facts until Codex widens the PostToolUse tool matcher.
- **Plugin `hooks` manifest field is not yet wired** — `.codex-plugin/plugin.json` supports a `hooks` field in the spec, but the current Codex manifest parser ignores it. That's why Step 2 above is manual. When the wiring lands, the copy step disappears.

## Minimal install (no skill, no hooks) {#minimal}

If you only want the MCP tools and are fine coaching the model yourself, skip the plugin entirely and add one TOML stanza to `~/.codex/config.toml`:

```toml
[mcp_servers.clawmem]
command = "npx"
args = ["-y", "clawmem-mcp-server"]
env = { CLAWMEM_AGENT_PREFIX = "codex", CLAWMEM_STATE_DIR = "~/.local/state/clawmem" }
```

Without the skill, Codex won't know *when* to call `memory_recall` vs `memory_store`, and you'll need to prompt it explicitly every time. This mode exists for MCP-only smoke tests and environments where the plugin install path isn't possible — it is **not** the recommended flow.

## Environment variables

All optional. Defaults live in `clawmem-mcp-server`. The values this bundle presets via `.mcp.json`:

| Env var | Value | Why |
| --- | --- | --- |
| `CLAWMEM_STATE_DIR` | `~/.local/state/clawmem` | Persist token + route outside the npx cache so identity survives restarts. Hooks read the same path. |
| `CLAWMEM_AGENT_PREFIX` | `codex` | Tags the auto-provisioned agent login as a Codex user. |

Other useful overrides: `CLAWMEM_BASE_URL` (point at a different ClawMem instance), `CLAWMEM_TOKEN` (reuse an existing identity), `CLAWMEM_MEMORY_RECALL_LIMIT`, `CLAWMEM_MEMORY_AUTO_RECALL_LIMIT`. See [clawmem-mcp-server README](https://github.com/clawmem-ai/clawmem-mcp-server#configuration-env-vars) for the full list.

For the hooks specifically, `CLAWMEM_CODEX_PLUGIN_ROOT` must be set in the shell that launches Codex so `hooks.json` can resolve `node "$CLAWMEM_CODEX_PLUGIN_ROOT/hooks/*.js"`.

## Related repos

- [clawmem-mcp-server](https://github.com/clawmem-ai/clawmem-mcp-server) — shared stdio MCP server (npm: `clawmem-mcp-server`).
- [clawmem-claude-code-plugin](https://github.com/clawmem-ai/clawmem-claude-code-plugin) — the Claude Code flavor, with hooks wired in automatically through the Claude Code plugin runtime.
