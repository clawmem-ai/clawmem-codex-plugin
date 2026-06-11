#!/usr/bin/env node
const { appendEvent, mutateState } = require("../lib/state");
const {
  resolveMemoryAutoRecallLimit,
  resolveMemoryAutoRecallPlannerVariantLimit,
  resolveMemoryAutoRecallStrategy
} = require("../lib/config");
const github = require("../lib/github");
const { ensureRoute, formatRecallContext, recallWithContext } = require("../lib/runtime");

async function readJsonStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function main() {
  const input = await readJsonStdin();
  const route = await ensureRoute();
  const repo = route.defaultRepo;
  const prompt = String(input.prompt || "").trim();
  const sessionId = String(input.session_id || "unknown");

  mutateState((state) => {
    const session = state.sessions[sessionId] || { nextTurnId: 1 };
    session.pendingTurn = {
      turnId: session.nextTurnId || 1,
      prompt,
      createdAt: new Date().toISOString()
    };
    session.nextTurnId = (session.nextTurnId || 1) + 1;
    state.sessions[sessionId] = session;
    return state;
  });

  let recallBundle = { memories: [], wikiContexts: [] };
  try {
    if (prompt) {
      recallBundle = await recallWithContext(route, repo, prompt, resolveMemoryAutoRecallLimit(), {
        plannerVariantLimit: resolveMemoryAutoRecallPlannerVariantLimit(),
        recallStrategy: resolveMemoryAutoRecallStrategy()
      });
    }
    const recalled = recallBundle.memories || [];
    const wikiContexts = recallBundle.wikiContexts || [];
    await github.createEvent(route, {
      repo,
      type: recalled.length > 0 || wikiContexts.length > 0 ? "recall_success" : "recall_miss",
      severity: "info",
      step: "user_prompt_submit",
      session_id: sessionId,
      message: recalled.length > 0 || wikiContexts.length > 0
        ? `Recalled ${recalled.length} memories and ${wikiContexts.length} wiki context maps before prompt execution.`
        : "No relevant memories or wiki context maps recalled before prompt execution.",
      details: {
        prompt,
        memory_ids: recalled.map((item) => item.memoryId),
        wiki_slugs: wikiContexts.map((item) => item.slug).filter(Boolean),
        wiki_anchor_memory_ids: recalled
          .filter((item) => item.wikiAnchors && item.wikiAnchors.length > 0)
          .map((item) => item.memoryId)
      }
    });
  } catch (error) {
    appendEvent({
      source: "hook",
      hook: "UserPromptSubmit",
      type: "recall_error",
      error: String(error)
    });
    return;
  }

  appendEvent({
    source: "hook",
    hook: "UserPromptSubmit",
    type: "recall_complete",
    sessionId,
    repo,
    count: recallBundle.memories.length,
    wikiContextCount: recallBundle.wikiContexts.length
  });

  if (recallBundle.memories.length === 0 && recallBundle.wikiContexts.length === 0) return;
  const additionalContext = formatRecallContext(recallBundle, repo);
  if (!additionalContext) return;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext
      }
    })
  );
}

main().catch((error) => {
  appendEvent({
    source: "hook",
    hook: "UserPromptSubmit",
    type: "fatal_error",
    error: String(error)
  });
  process.exit(0);
});
