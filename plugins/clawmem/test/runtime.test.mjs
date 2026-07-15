import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const github = require("../lib/github.js");
const { ensureRoute, formatRecallContext, recall, recallWithContext } = require("../lib/runtime.js");

function patchGithub(patches) {
  const originals = {};
  for (const [key, value] of Object.entries(patches)) {
    originals[key] = github[key];
    github[key] = value;
  }
  return () => {
    for (const [key, value] of Object.entries(originals)) github[key] = value;
  };
}

function memoryIssue({ number, title = "Memory", detail, state = "open", labels = ["type:memory"] }) {
  const body = [
    "detail: |-",
    ...String(detail || "").split("\n").map((line) => `  ${line}`)
  ].join("\n");
  return { number, title, body, state, labels };
}

test("ensureRoute registers the Codex prefix without a project-directory suffix", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "clawmem-codex-runtime-prefix-"));
  const previous = {
    CLAWMEM_AGENT_PREFIX: process.env.CLAWMEM_AGENT_PREFIX,
    CLAWMEM_STATE_DIR: process.env.CLAWMEM_STATE_DIR,
    CLAWMEM_BASE_URL: process.env.CLAWMEM_BASE_URL,
    CLAWMEM_DEFAULT_REPO_NAME: process.env.CLAWMEM_DEFAULT_REPO_NAME,
  };
  process.env.CLAWMEM_AGENT_PREFIX = "codex";
  process.env.CLAWMEM_STATE_DIR = stateDir;
  process.env.CLAWMEM_BASE_URL = "https://git.example.test";
  process.env.CLAWMEM_DEFAULT_REPO_NAME = "memory";
  let registration = null;
  const restore = patchGithub({
    registerAgent: async (input) => {
      registration = input;
      return {
        login: "codex-123abc",
        token: "token",
        defaultRepo: "codex-123abc/memory",
        baseUrl: "https://git.example.test/api/v3",
      };
    },
  });

  try {
    await ensureRoute();
    assert.equal(registration.prefixLogin, "codex");
    assert.equal(registration.defaultRepoName, "memory");
  } finally {
    restore();
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("recallWithContext boosts memories referenced by wiki context maps", async () => {
  const viewed = [];
  const restore = patchGithub({
    searchIssues: async () => [
      memoryIssue({ number: 1, title: "Memory: primary one", detail: "Primary memory one." }),
      memoryIssue({ number: 2, title: "Memory: primary two", detail: "Primary memory two." }),
      memoryIssue({ number: 3, title: "Memory: primary three", detail: "Primary memory three." })
    ],
    searchWikiPages: async () => [{
      slug: "projects/clawmem",
      title: "ClawMem",
      score: 10,
      snippet: "Architecture context refs: #99"
    }],
    getWikiPage: async () => ({
      slug: "projects/clawmem",
      title: "ClawMem",
      body: [
        "# Project: ClawMem",
        "",
        "- Wiki is a context map, not memory ground truth. refs: #99",
        "- Conversation refs stay provenance. refs: #77",
        "```",
        "#66 should not count from code.",
        "```"
      ].join("\n")
    }),
    getIssue: async (_route, _repo, number) => {
      viewed.push(number);
      if (number === 99) {
        return memoryIssue({
          number: 99,
          title: "Memory: wiki architecture",
          detail: "ClawMem wiki pages are context maps and issue memories are source of truth.",
          labels: ["type:memory", "kind:decision"]
        });
      }
      return {
        number,
        title: "Conversation source",
        body: "Raw transcript provenance.",
        state: "open",
        labels: ["type:conversation"]
      };
    }
  });

  try {
    const bundle = await recallWithContext({}, "owner/main-memory", "clawmem architecture wiki", 3);

    assert.equal(bundle.wikiContexts.length, 1);
    assert.deepEqual(bundle.wikiContexts[0].issueRefs, ["#99", "#77"]);
    assert.deepEqual(viewed, [99, 77]);
    assert.deepEqual(bundle.memories.map((memory) => memory.issueNumber), [1, 2, 99]);
    assert.deepEqual(bundle.memories.find((memory) => memory.issueNumber === 99).wikiAnchors, ["projects/clawmem"]);

    const context = formatRecallContext(bundle, "owner/main-memory");
    assert.match(context, /<clawmem-wiki-contexts>/);
    assert.match(context, /Wiki context maps, when present, are background and ranking hints/);
    assert.match(context, /Wiki anchors: projects\/clawmem/);
    assert.doesNotMatch(context, /#66 should not count from code/);
  } finally {
    restore();
  }
});

test("recallWithContext keeps memory recall when wiki search fails", async () => {
  const restore = patchGithub({
    searchIssues: async () => [
      memoryIssue({ number: 5, title: "Memory: primary recall", detail: "Primary recall should survive wiki failures." })
    ],
    searchWikiPages: async () => {
      throw new Error("wiki unavailable");
    }
  });

  try {
    const bundle = await recallWithContext({}, "owner/main-memory", "primary recall", 3);

    assert.equal(bundle.memories.length, 1);
    assert.equal(bundle.memories[0].issueNumber, 5);
    assert.equal(bundle.wikiContexts.length, 0);
  } finally {
    restore();
  }
});

test("recall uses OpenClaw-style query planner variants", async () => {
  const calls = [];
  const restore = patchGithub({
    searchIssues: async (_route, q, params = {}) => {
      calls.push({ q, debug: Boolean(params.debug) });
      if (params.debug) {
        return [
          {
            ...memoryIssue({
              number: 44,
              title: "Memory: pottery class",
              detail: "Caroline started pottery classes in March."
            }),
            debug: { search_path: "lexical_only", lexical_rank: 1 }
          }
        ];
      }
      return [
        memoryIssue({
          number: 9,
          title: "Memory: broad Caroline",
          detail: "Caroline has a broad activity profile."
        })
      ];
    }
  });

  try {
    const found = await recall({}, "owner/main-memory", "What month did Caroline start pottery classes?", 2, {
      plannerVariantLimit: 2,
      recallStrategy: "query-planner"
    });

    assert.equal(calls.length, 2);
    assert.equal(calls[0].debug, false);
    assert.equal(calls[1].debug, true);
    assert.match(calls[1].q, /Caroline|pottery|class/);
    assert.deepEqual(found.map((memory) => memory.issueNumber), [9, 44]);
  } finally {
    restore();
  }
});
