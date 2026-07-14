import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { normalizeApiBaseUrl } = require("../lib/config.js");

test("normalizeApiBaseUrl keeps route state on the GitHub-compatible namespace", () => {
  assert.equal(
    normalizeApiBaseUrl("http://127.0.0.1:4003/api/ext/v1"),
    "http://127.0.0.1:4003/api/v3"
  );
});
