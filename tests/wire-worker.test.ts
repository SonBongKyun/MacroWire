import assert from "node:assert/strict";
import test from "node:test";
import { WireWorker } from "../src/lib/ingest/wireWorker";
import type { SourceIngestResult, WireSource } from "../src/lib/ingest/sourceIngest";

const source = (id: string, nextFetchAt: Date | null = null): WireSource => ({
  id,
  name: id,
  feedUrl: `https://example.com/${id}.xml`,
  category: "글로벌",
  tier: "T2",
  nextFetchAt,
});

const success = (item: WireSource): SourceIngestResult => ({
  sourceId: item.id,
  sourceName: item.name,
  added: 0,
  skipped: 0,
  failed: false,
  latencyMs: 1,
  newArticles: [],
});

const quietLogger = { info() {}, warn() {}, error() {} };

test("polls only due sources", async () => {
  const calls: string[] = [];
  const worker = new WireWorker({
    loadSources: async () => [source("due"), source("future", new Date(20_000))],
    pollSource: async (item) => { calls.push(item.id); return success(item); },
    now: () => new Date(10_000),
    logger: quietLogger,
  });
  await worker.runOnce();
  assert.deepEqual(calls, ["due"]);
});

test("collapses overlapping scheduler ticks", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let polls = 0;
  const worker = new WireWorker({
    loadSources: async () => [source("one")],
    pollSource: async (item) => { polls++; await gate; return success(item); },
    logger: quietLogger,
  });

  const first = worker.runOnce();
  const second = worker.runOnce();
  release();
  await Promise.all([first, second]);
  assert.equal(polls, 1);
});

test("isolates one failed feed and continues polling the others", async () => {
  const calls: string[] = [];
  const worker = new WireWorker({
    loadSources: async () => [source("bad"), source("good")],
    pollSource: async (item) => {
      calls.push(item.id);
      if (item.id === "bad") throw new Error("timeout");
      return success(item);
    },
    concurrency: 1,
    logger: quietLogger,
  });

  await worker.runOnce();
  assert.deepEqual(calls, ["bad", "good"]);
});

test("graceful stop waits for the active fetch to drain", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let started!: () => void;
  const startedGate = new Promise<void>((resolve) => { started = resolve; });
  const worker = new WireWorker({
    loadSources: async () => [source("slow")],
    pollSource: async (item) => { started(); await gate; return success(item); },
    loopIntervalMs: 100,
    logger: quietLogger,
  });

  const running = worker.run();
  await startedGate;
  let stopped = false;
  const stopping = worker.stop().then(() => { stopped = true; });
  await Promise.resolve();
  assert.equal(stopped, false);
  release();
  await Promise.all([stopping, running]);
  assert.equal(stopped, true);
});
