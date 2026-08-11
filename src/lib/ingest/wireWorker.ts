import type { SourceIngestResult, WireSource } from "./sourceIngest";

export interface WireWorkerDependencies {
  loadSources: () => Promise<WireSource[]>;
  pollSource: (source: WireSource) => Promise<SourceIngestResult>;
  now?: () => Date;
  loopIntervalMs?: number;
  concurrency?: number;
  logger?: Pick<Console, "info" | "warn" | "error">;
}

function isDue(source: WireSource, now: Date): boolean {
  return !source.nextFetchAt || source.nextFetchAt.getTime() <= now.getTime();
}

export class WireWorker {
  private readonly now: () => Date;
  private readonly loopIntervalMs: number;
  private readonly concurrency: number;
  private readonly logger: Pick<Console, "info" | "warn" | "error">;
  private readonly active = new Map<string, Promise<unknown>>();
  private tickPromise: Promise<void> | null = null;
  private loopPromise: Promise<void> | null = null;
  private stopRequested = false;
  private wakeLoop: (() => void) | null = null;

  constructor(private readonly dependencies: WireWorkerDependencies) {
    this.now = dependencies.now ?? (() => new Date());
    this.loopIntervalMs = Math.max(100, dependencies.loopIntervalMs ?? 1_000);
    this.concurrency = Math.max(1, dependencies.concurrency ?? 4);
    this.logger = dependencies.logger ?? console;
  }

  get activeCount(): number {
    return this.active.size;
  }

  runOnce(): Promise<void> {
    if (this.tickPromise) return this.tickPromise;
    this.tickPromise = this.executeTick().finally(() => {
      this.tickPromise = null;
    });
    return this.tickPromise;
  }

  private async executeTick(): Promise<void> {
    let sources: WireSource[];
    try {
      sources = await this.dependencies.loadSources();
    } catch (error) {
      this.logger.error("[wire] could not load sources; next loop will retry", error);
      return;
    }

    const due = sources
      .filter((source) => isDue(source, this.now()) && !this.active.has(source.id))
      .sort((a, b) => (a.nextFetchAt?.getTime() ?? 0) - (b.nextFetchAt?.getTime() ?? 0));

    if (due.length === 0) return;

    let cursor = 0;
    const runners = Array.from({ length: Math.min(this.concurrency, due.length) }, async () => {
      while (cursor < due.length && !this.stopRequested) {
        const source = due[cursor++];
        const task = this.pollOne(source);
        this.active.set(source.id, task);
        try {
          await task;
        } finally {
          this.active.delete(source.id);
        }
      }
    });

    await Promise.allSettled(runners);
  }

  private async pollOne(source: WireSource): Promise<void> {
    this.logger.info(`[wire] ${source.tier} fetch ${source.name}`);
    try {
      const result = await this.dependencies.pollSource(source);
      if (result.failed) {
        this.logger.warn(`[wire] ${source.name} failed in ${result.latencyMs}ms: ${result.error ?? "unknown error"}`);
      } else {
        this.logger.info(
          `[wire] ${source.name} +${result.added}, ${result.skipped} skipped, ${result.latencyMs}ms`,
        );
      }
    } catch (error) {
      // A single source is never allowed to reject the worker loop.
      this.logger.error(`[wire] isolated failure for ${source.name}`, error);
    }
  }

  run(): Promise<void> {
    if (this.loopPromise) return this.loopPromise;
    this.stopRequested = false;
    this.loopPromise = this.runLoop().finally(() => {
      this.loopPromise = null;
    });
    return this.loopPromise;
  }

  private async runLoop(): Promise<void> {
    this.logger.info("[wire] worker started");
    while (!this.stopRequested) {
      await this.runOnce();
      if (!this.stopRequested) await this.waitForNextLoop();
    }
    await Promise.allSettled([...this.active.values()]);
    this.logger.info("[wire] worker stopped cleanly");
  }

  private waitForNextLoop(): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.wakeLoop = null;
        resolve();
      }, this.loopIntervalMs);
      this.wakeLoop = () => {
        clearTimeout(timer);
        this.wakeLoop = null;
        resolve();
      };
    });
  }

  async stop(): Promise<void> {
    this.stopRequested = true;
    this.wakeLoop?.();
    if (this.loopPromise) await this.loopPromise;
    else await Promise.allSettled([...this.active.values()]);
  }
}
