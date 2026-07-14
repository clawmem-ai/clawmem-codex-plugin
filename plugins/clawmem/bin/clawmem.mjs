#!/usr/bin/env node

import process from "node:process";

function normalizeBaseUrl(value) {
  const base = (value || "https://git.clawmem.ai").replace(/\/+$/, "");
  if (base.endsWith("/api/ext/v1")) return `${base.slice(0, -"/api/ext/v1".length)}/api/v3`;
  return base.endsWith("/api/v3") ? base : `${base}/api/v3`;
}

function extensionBaseUrl(value) {
  return normalizeBaseUrl(value).replace(/\/api\/v3$/, "/api/ext/v1");
}

function usage() {
  process.stderr.write([
    "Usage:",
    "  clawmem auth codex --base-url <url> --prefix-login <prefix> --default-repo-name <name> [--json]",
    "  clawmem whoami --base-url <url> [--json]",
    "",
  ].join("\n"));
}

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    i += 1;
  }
  return flags;
}

function shellExport(name, value) {
  return `export ${name}='${String(value).replace(/'/g, "'\\''")}'`;
}

async function authCodex(flags) {
  const baseUrl = extensionBaseUrl(typeof flags["base-url"] === "string" ? flags["base-url"] : undefined);
  const prefixLogin = typeof flags["prefix-login"] === "string" ? flags["prefix-login"] : "codex";
  const defaultRepoName = typeof flags["default-repo-name"] === "string" ? flags["default-repo-name"] : "codex-memory";
  const response = await fetch(`${baseUrl}/agents`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      prefix_login: prefixLogin,
      default_repo_name: defaultRepoName,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`bootstrap failed with HTTP ${response.status}: ${text || response.statusText}`);
  }
  const payload = await response.json();
  const result = {
    login: payload.login,
    repo: payload.repo_full_name,
    token: payload.token,
    exports: {
      CLAWMEM_TOKEN: payload.token,
      CLAWMEM_DEFAULT_REPO: payload.repo_full_name,
      CLAWMEM_REPO: payload.repo_full_name,
    },
  };
  if (flags.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write([
    `ClawMem agent login: ${result.login}`,
    `Default repo: ${result.repo}`,
    "",
    "Export these variables in the shell that launches Codex:",
    shellExport("CLAWMEM_TOKEN", result.token),
    shellExport("CLAWMEM_DEFAULT_REPO", result.repo),
    shellExport("CLAWMEM_REPO", result.repo),
    "",
    "Next steps:",
    "1. Add the ClawMem marketplace: codex plugin marketplace add clawmem-ai/clawmem-codex-plugin --ref main",
    "2. Install the plugin: codex plugin add clawmem@clawmem-ai",
    "3. Start a new Codex thread and ask Codex to run clawmem_codex_bootstrap.",
    "",
  ].join("\n"));
}

async function whoami(flags) {
  const token = process.env.CLAWMEM_TOKEN?.trim();
  if (!token) {
    throw new Error("CLAWMEM_TOKEN is required for whoami.");
  }
  const baseUrl = normalizeBaseUrl(typeof flags["base-url"] === "string" ? flags["base-url"] : undefined);
  const response = await fetch(`${baseUrl}/user`, {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`whoami failed with HTTP ${response.status}: ${text || response.statusText}`);
  }
  const payload = await response.json();
  const result = {
    login: payload.login,
    name: payload.name,
    repo: process.env.CLAWMEM_DEFAULT_REPO || process.env.CLAWMEM_REPO || null,
  };
  if (flags.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write([
    `Agent login: ${result.login}`,
    `Agent name: ${result.name || "(none)"}`,
    `Configured repo: ${result.repo || "(unset)"}`,
    "",
  ].join("\n"));
}

async function main() {
  const [, , command, subcommand, ...rest] = process.argv;
  if (command === "auth" && subcommand === "codex") {
    const flags = parseFlags(rest);
    await authCodex(flags);
    return;
  }
  if (command === "whoami") {
    const flags = parseFlags([subcommand, ...rest].filter(Boolean));
    await whoami(flags);
    return;
  }
  usage();
  process.exitCode = 1;
}

await main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
