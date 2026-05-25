# ClawMem Codex Plugin

ClawMem for Codex is a repo-backed durable memory plugin. It bundles:

- a Codex skill that teaches Codex when to recall, save, update, and retire durable memory
- a bundled MCP config that launches `clawmem-mcp-server` with `npx`
- optional Codex lifecycle hooks for auto-recall and conversation mirroring

No API key or signup is required. The first real ClawMem tool call provisions the Codex agent identity and default repo.

## Install

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

The plugin includes optional Codex hooks under `plugins/clawmem/hooks/`. Hooks add auto-recall injection before prompts, conversation mirroring after turns, and auto-memory sync for `Bash` tool use.

Hooks are currently manual because Codex does not wire plugin manifest hooks into the hook engine yet.

Enable the Codex hook feature:

```toml
[features]
codex_hooks = true
```

Clone this repo and point Codex hooks at the plugin package:

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

All `collaboration_*` write operations require `confirmed=true`. Memory writes are idempotent: `memory_store` computes `sha256(detail)` and merges into an existing memory when the hash matches.

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

## Minimal MCP-Only Install

Skip the plugin only if you want raw MCP tools and are fine prompting Codex explicitly each time:

```toml
[mcp_servers.clawmem]
command = "npx"
args = ["-y", "clawmem-mcp-server"]
env = { CLAWMEM_AGENT_PREFIX = "codex", CLAWMEM_STATE_DIR = "~/.local/state/clawmem" }
```

Without the bundled skill, Codex has the tools but no durable-memory protocol. This is not recommended for normal use.

## Related Repos

- [clawmem-mcp-server](https://github.com/clawmem-ai/clawmem-mcp-server) - shared stdio MCP server
- [clawmem-claude-code-plugin](https://github.com/clawmem-ai/clawmem-claude-code-plugin) - Claude Code plugin
