# ClawMem Codex Plugin

ClawMem for Codex is a repo-backed durable memory plugin. It bundles:

- a Codex skill that teaches Codex when to recall, save, update, and retire durable memory
- an internal MCP config that launches `clawmem-mcp-server` for the plugin
- optional Codex lifecycle hooks for memory-first, wiki-aware auto-recall and conversation mirroring

No API key or signup is required. The first real ClawMem tool call provisions the Codex agent identity and default repo.

## Install

User-facing installation is the Codex plugin. Do not install ClawMem as a raw MCP server unless you are debugging the MCP transport directly.

Add the ClawMem marketplace from this GitHub repo:

```sh
codex plugin marketplace add clawmem-ai/clawmem-codex-plugin --ref main
```

Install the plugin:

```sh
codex plugin add clawmem@clawmem-ai
```

Start a new Codex thread after installation. Codex loads new plugin skills and MCP tools at the thread boundary.

## Verify

Ask Codex:

```text
Run clawmem_codex_bootstrap and verify ClawMem is ready.
```

`clawmem_codex_bootstrap` actively provisions the agent route when needed and reports the state path, default repo, optional hooks, marketplace entry, and pending repo invitations.

If that tool is not available, ask Codex to call `memory_repos` once as the fallback provisioning trigger, then update the marketplace and reinstall:

```sh
codex plugin marketplace upgrade clawmem-ai
codex plugin add clawmem@clawmem-ai
```

## Update

Refresh the marketplace snapshot and reinstall the plugin:

```sh
codex plugin marketplace upgrade clawmem-ai
codex plugin add clawmem@clawmem-ai
```

Open a new Codex thread after reinstalling.

## Optional Hooks

The plugin includes optional Codex hooks under `plugins/clawmem/hooks/`. Hooks add memory-first, wiki-aware recall injection before prompts, conversation mirroring after turns, and auto-memory sync for `Bash` tool use.

The plugin manifest points at `./hooks/hooks.json`. If your Codex build loads plugin-bundled hooks, review and trust the bundled hooks when Codex prompts for hook trust.

For older or manual installs, hooks can still be copied into `~/.codex/hooks.json`. If hooks are disabled globally, enable the canonical feature key:

```toml
[features]
hooks = true
```

Manual hook fallback:

```sh
git clone https://github.com/clawmem-ai/clawmem-codex-plugin ~/clawmem-codex-plugin
export CLAWMEM_CODEX_PLUGIN_ROOT=~/clawmem-codex-plugin/plugins/clawmem
cp "$CLAWMEM_CODEX_PLUGIN_ROOT/hooks/hooks.json" ~/.codex/hooks.json
```

Put the `CLAWMEM_CODEX_PLUGIN_ROOT` export in your shell init file. If you already have `~/.codex/hooks.json`, merge the `hooks.*` arrays manually instead of overwriting the file.

## What Is Implemented

- first-run bootstrap with `POST /api/v3/agents`, with fallback to `POST /api/v3/anonymous/session` for older backends
- Codex-specific `clawmem_codex_bootstrap` tool for active provisioning and setup checks
- state persistence at `~/.local/state/clawmem/`
- MCP tools for memory CRUD, issue CRUD, and collaboration workflows
- optional `UserPromptSubmit`, `Stop`, and `PostToolUse` hooks
- `UserPromptSubmit` searches open `type:memory` issues first, adds wiki context maps as background/boosters when available, and injects `hookSpecificOutput.additionalContext`
- hook auto-recall defaults to OpenClaw-style query planning: full, compact, core, surface, literal, and entity search variants run in parallel, with wiki issue refs used only as ranking hints

All `collaboration_*` write operations require `confirmed=true`. Memory writes are idempotent: `memory_store` computes `sha256(detail)` and merges into an existing memory when the hash matches.

Optional hook tuning:

- `CLAWMEM_MEMORY_AUTO_RECALL_STRATEGY=single|literal-repair|query-planner`
- `CLAWMEM_MEMORY_AUTO_RECALL_PLANNER_VARIANT_LIMIT=1..6`
- `CLAWMEM_MEMORY_AUTO_RECALL_LIMIT=1..20`

## Caveats

- `PostToolUse` only fires for `Bash` in Codex in current tested setups. Use `memory_store` explicitly for durable facts until Codex widens the matcher.
- Plugin-bundled hooks may require trust review, and older Codex builds may still need the manual `~/.codex/hooks.json` fallback.
- Wiki context maps are background and ranking hints. Open `type:memory` issues remain the durable memory ground truth.

## Local Development

This repo is also a Codex marketplace. The marketplace manifest lives at `.agents/plugins/marketplace.json`, and the plugin package lives at `plugins/clawmem/`.

For local testing:

```sh
codex plugin marketplace add /path/to/clawmem-codex-plugin
codex plugin add clawmem@clawmem-ai
npm test
```

Validate the plugin manifest with the Codex plugin validator:

```sh
python3 /path/to/plugin-creator/scripts/validate_plugin.py plugins/clawmem
```

## MCP Debug Fallback

The plugin owns the normal install path and includes its MCP config. Use this raw MCP-only config only for debugging the MCP server outside the plugin, or for a temporary fallback when the plugin cannot be installed:

```toml
[mcp_servers.clawmem]
command = "npx"
args = ["-y", "clawmem-mcp-server"]
env = { CLAWMEM_AGENT_PREFIX = "codex", CLAWMEM_STATE_DIR = "~/.local/state/clawmem" }
```

Without the plugin, Codex has raw tools but no bundled skill, hook recall, marketplace metadata, or durable-memory protocol. This is not recommended for normal use.

## Migrating From The Old Manual Install

Older ClawMem Codex installs asked users to clone this repo locally and hand-edit `~/.agents/plugins/marketplace.json`. The official marketplace flow above replaces that setup.

If you installed with the old manual flow, remove the old local entry first so Codex does not keep discovering the stale path:

```sh
codex plugin remove clawmem@clawmem-ai
codex plugin marketplace remove clawmem-ai
```

Then delete the old `clawmem` entry from `~/.agents/plugins/marketplace.json` if you added one manually. If that file only existed for ClawMem, you can remove the file.

Install from the Git marketplace:

```sh
codex plugin marketplace add clawmem-ai/clawmem-codex-plugin --ref main
codex plugin add clawmem@clawmem-ai
```

Open a new Codex thread after migrating.

After this one-time migration, routine updates are:

```sh
codex plugin marketplace upgrade clawmem-ai
codex plugin add clawmem@clawmem-ai
```

## Related Repos

- [clawmem-mcp-server](https://github.com/clawmem-ai/clawmem-mcp-server) - shared stdio MCP server
- [clawmem-claude-code-plugin](https://github.com/clawmem-ai/clawmem-claude-code-plugin) - Claude Code plugin
