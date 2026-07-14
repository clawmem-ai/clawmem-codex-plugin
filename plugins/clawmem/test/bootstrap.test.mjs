import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(here, "../bin/clawmem.mjs");

function startFakeBackend(token = "test-token") {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += String(chunk); });
    req.on("end", () => {
      if (req.url === "/api/ext/v1/agents" && req.method === "POST") {
        let repoName = "codex-memory";
        try {
          const payload = JSON.parse(body || "{}");
          repoName = String(payload.default_repo_name || repoName);
        } catch {
          // Keep the default repo name for invalid JSON in tests.
        }
        res.writeHead(201, { "content-type": "application/json" });
        res.end(JSON.stringify({
          login: "clawmem-agent",
          token,
          repo_full_name: `clawmem-ai/${repoName}`,
        }));
        return;
      }
      if (req.url === "/api/v3/user" && req.method === "GET") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ login: "clawmem-agent", name: "ClawMem Agent" }));
        return;
      }
      res.writeHead(404, { "content-type": "application/json" });
      res.end("{}");
    });
  });
  return new Promise((resolveBackend) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolveBackend({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((resolveClose) => server.close(resolveClose)),
      });
    });
  });
}

function runCli(args, extraEnv = {}) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      env: {
        ...process.env,
        ...extraEnv,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("close", (code) => {
      resolveRun({ code, stdout, stderr });
    });
  });
}

test("auth codex prints token and repo exports", async () => {
  const backend = await startFakeBackend("test-token");
  try {
    const result = await runCli([
      "auth",
      "codex",
      "--base-url",
      backend.baseUrl,
      "--prefix-login",
      "codex",
      "--default-repo-name",
      "codex-memory",
    ]);
    assert.equal(result.code, 0);
    assert.match(result.stdout, /export CLAWMEM_TOKEN='test-token'/);
    assert.match(result.stdout, /export CLAWMEM_DEFAULT_REPO='clawmem-ai\/codex-memory'/);
    assert.match(result.stdout, /export CLAWMEM_REPO='clawmem-ai\/codex-memory'/);
  } finally {
    await backend.close();
  }
});

test("whoami shows current repo without leaking token", async () => {
  const backend = await startFakeBackend("test-token");
  try {
    const result = await runCli(
      ["whoami", "--base-url", backend.baseUrl],
      {
        CLAWMEM_TOKEN: "test-token",
        CLAWMEM_DEFAULT_REPO: "clawmem-ai/demo-memory",
      },
    );
    assert.equal(result.code, 0);
    assert.match(result.stdout, /Agent login: clawmem-agent/);
    assert.match(result.stdout, /Configured repo: clawmem-ai\/demo-memory/);
    assert.doesNotMatch(result.stdout, /test-token/);
  } finally {
    await backend.close();
  }
});
