import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { startFakeBackend } from "../../clawmem-mcp/test/support/fake-backend.ts";

const here = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(here, "../bin/clawmem.mjs");

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
  const backend = await startFakeBackend([], "test-token");
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
    assert.match(result.stdout, /export CLAWMEM_REPO='clawmem-ai\/codex-memory'/);
  } finally {
    await backend.close();
  }
});

test("whoami shows current repo without leaking token", async () => {
  const backend = await startFakeBackend([], "test-token");
  try {
    const result = await runCli(
      ["whoami", "--base-url", backend.baseUrl],
      {
        CLAWMEM_TOKEN: "test-token",
        CLAWMEM_REPO: "clawmem-ai/demo-memory",
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
