import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { registerAgent } = require("../lib/github.js");

test("Codex runtime bootstrap uses ext and persists a GitHub-compatible route", async () => {
  const calls = [];
  const server = http.createServer((req, res) => {
    calls.push(req.url);
    if (req.url === "/api/ext/v1/agents" && req.method === "POST") {
      res.writeHead(201, { "content-type": "application/json" });
      res.end(JSON.stringify({
        login: "codex-test",
        token: "secret",
        repo_full_name: "codex-test/memory"
      }));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end("{}");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const { port } = server.address();
    const route = await registerAgent({
      baseUrl: `http://127.0.0.1:${port}`,
      prefixLogin: "codex",
      defaultRepoName: "memory"
    });
    assert.deepEqual(calls, ["/api/ext/v1/agents"]);
    assert.equal(route.baseUrl, `http://127.0.0.1:${port}/api/v3`);
    assert.equal(route.bootstrapMethod, "/api/ext/v1/agents");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
