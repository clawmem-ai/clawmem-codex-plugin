import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const hookPath = resolve(here, "../hooks/user-prompt-submit.js");

function memoryIssue() {
  return {
    number: 9,
    title: "Memory: Codex plugin recall",
    state: "open",
    labels: ["type:memory", "kind:skill"],
    body: [
      "## Memory",
      "",
      "Codex plugin recall uses OpenClaw-style query planning and wiki context maps.",
      "",
      "## Relations",
      "",
      "- Source: #1"
    ].join("\n")
  };
}

function runHook(input, env) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [hookPath], {
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("close", (code) => resolveRun({ code, stdout, stderr }));
    child.stdin.end(JSON.stringify(input));
  });
}

test("UserPromptSubmit hook injects wiki-aware recall context", async () => {
  const tempDir = fs.mkdtempSync(`${os.tmpdir()}/clawmem-codex-hook-`);
  const issue = memoryIssue();
  const server = http.createServer((req, res) => {
    req.on("data", () => {});
    req.on("end", () => {
      if (req.url?.startsWith("/api/v3/search/issues")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ items: [issue] }));
        return;
      }
      if (req.url?.startsWith("/api/ext/v1/repos/tester/memory/wiki/search")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ results: [{ slug: "projects/codex", title: "Codex Plugin" }] }));
        return;
      }
      if (req.url === "/api/ext/v1/repos/tester/memory/wiki/pages/projects%2Fcodex") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          slug: "projects/codex",
          title: "Codex Plugin",
          body: [
            "Codex plugin context map refs #9.",
            "",
            "```mermaid",
            "flowchart LR",
            "  recalled --> next",
            "```"
          ].join("\n")
        }));
        return;
      }
      if (req.url === "/api/v3/repos/tester/memory/issues/9") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(issue));
        return;
      }
      res.writeHead(404, { "content-type": "application/json" });
      res.end("{}");
    });
  });
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const { port } = server.address();

  fs.writeFileSync(resolve(tempDir, "state.json"), JSON.stringify({
    version: 1,
    route: {
      baseUrl: `http://127.0.0.1:${port}/api/v3`,
      authScheme: "token",
      login: "tester",
      token: "secret",
      defaultRepo: "tester/memory"
    },
    sessions: {}
  }));

  try {
    const result = await runHook(
      { prompt: "codex plugin recall", session_id: "session-1" },
      {
        CLAUDE_PLUGIN_DATA: tempDir,
        CLAWMEM_AGENT_PREFIX: "codex",
        CLAWMEM_MEMORY_AUTO_RECALL_PLANNER_VARIANT_LIMIT: "2"
      }
    );

    assert.equal(result.code, 0);
    const payload = JSON.parse(result.stdout);
    const context = payload.hookSpecificOutput.additionalContext;
    assert.match(context, /<clawmem-context repo="tester\/memory">/);
    assert.match(context, /<clawmem-wiki-contexts>/);
    assert.match(context, /Codex plugin recall uses OpenClaw-style query planning/);
    assert.match(context, /Wiki anchors: projects\/codex/);
    assert.match(context, /flowchart LR/);
    assert.match(context, /recalled --> next/);
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
  }
});
