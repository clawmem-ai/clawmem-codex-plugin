import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getWikiPage } = require("../lib/github.js");

test("wiki reads prefer the Console extension route and fall back to api v3", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes("/api/ext/v1/repos/acme/memory/wiki/pages/workflows%2Fpilot")) {
      return new Response(JSON.stringify({ message: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ slug: "workflows/pilot", sha: "v3-sha", body: "# Pilot" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    const page = await getWikiPage({ baseUrl: "https://api.example/api/v3", token: "t" }, "acme/memory", "workflows/pilot");
    assert.equal(page.sha, "v3-sha");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(calls, [
    "https://api.example/api/ext/v1/repos/acme/memory/wiki/pages/workflows%2Fpilot",
    "https://api.example/api/v3/repos/acme/memory/wiki/pages/workflows%2Fpilot"
  ]);
});
