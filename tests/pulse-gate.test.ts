import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import {
  markPulsed,
  resetPulseGate,
  shouldPulse,
  withPulseLock,
} from "../src/lib/ingest/pulseGate";

beforeEach(() => resetPulseGate());

test("the first pulse from a cold instance always runs", () => {
  assert.deepEqual(shouldPulse(1_000_000), { run: true, retryInMs: 0 });
});

test("a second pulse inside the cooldown is refused with a retry hint", () => {
  const t0 = 1_000_000;
  markPulsed(t0);

  const soon = shouldPulse(t0 + 10_000);
  assert.equal(soon.run, false);
  assert.equal(soon.retryInMs, 35_000, "should report the remaining wait");

  assert.equal(shouldPulse(t0 + 44_999).run, false);
  assert.equal(shouldPulse(t0 + 45_000).run, true, "cooldown is inclusive at the boundary");
});

test("concurrent callers collapse onto one run", async () => {
  let runs = 0;
  const task = async () => {
    runs++;
    await new Promise((r) => setTimeout(r, 20));
    return runs;
  };

  // Three tabs pulsing in the same tick must produce one ingest.
  const [a, b, c] = await Promise.all([
    withPulseLock(task),
    withPulseLock(task),
    withPulseLock(task),
  ]);

  assert.equal(runs, 1, "the task should have executed once");
  assert.deepEqual([a, b, c], [1, 1, 1], "every caller gets the same result");
});

test("the cooldown starts when the run finishes, not when it began", async () => {
  await withPulseLock(async () => {
    await new Promise((r) => setTimeout(r, 30));
  });
  assert.equal(shouldPulse().run, false, "a run that just completed opens the cooldown");
});

test("a failed run still opens the cooldown and still rejects the caller", async () => {
  await assert.rejects(
    withPulseLock(async () => {
      throw new Error("feed unreachable");
    }),
    /feed unreachable/
  );

  // Otherwise a broken upstream would let every timer retry without limit.
  assert.equal(shouldPulse().run, false);
});

test("the lock clears after a run so a later pulse can proceed", async () => {
  await withPulseLock(async () => "first");
  resetPulseGate();
  const second = await withPulseLock(async () => "second");
  assert.equal(second, "second");
});
