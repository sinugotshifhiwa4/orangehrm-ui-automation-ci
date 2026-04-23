import * as os from "os";
import type { AllocatorType } from "./types/workerAllocator.type.js";
import ErrorHandler from "../../../utils/errorHandling/errorHandler.js";

export default class WorkerAllocator {
  private static readonly totalCores = os.cpus().length;
  private static readonly MIN_WORKERS = 1;

  /**
   * Optimal worker count for the current environment.
   * Uses sharding in CI or the provided local strategy otherwise.
   */
  public static getOptimalWorkerCount(localStrategy: AllocatorType): number {
    return this.shardingEnabled
      ? this.getWorkersForCIShard()
      : this.getWorkersForLocalStrategy(localStrategy);
  }

  /**
   * Whether sharding is enabled for the current test run.
   */
  private static get shardingEnabled(): boolean {
    return !!(process.env.SHARD_INDEX && process.env.SHARD_TOTAL);
  }

  private static getWorkersForCIShard(): number {
    const shardTotal = parseInt(process.env.SHARD_TOTAL || "1", 10);
    const shardIndex = parseInt(process.env.SHARD_INDEX || "1", 10);

    this.validateShardConfig(shardIndex, shardTotal);

    return Math.max(
      this.MIN_WORKERS,
      this.calculateShardWorkers(shardIndex, shardTotal),
    );
  }

  private static validateShardConfig(
    shardIndex: number,
    shardTotal: number,
  ): void {
    if (shardTotal < 1) {
      ErrorHandler.logAndThrow(
        "WorkerAllocator",
        `Invalid shard config: SHARD_TOTAL must be at least 1, got ${shardTotal}.`,
      );
    }

    if (shardIndex < 1 || shardIndex > shardTotal) {
      ErrorHandler.logAndThrow(
        "WorkerAllocator",
        `Invalid shard config: SHARD_INDEX (${shardIndex}) must be between 1 and SHARD_TOTAL (${shardTotal}).`,
      );
    }
  }

  private static calculateShardWorkers(
    shardIndex: number,
    shardTotal: number,
  ): number {
    const baseWorkersPerShard = Math.floor(this.totalCores / shardTotal);
    const remainingCores = this.totalCores % shardTotal;
    const zeroBasedIndex = shardIndex - 1;

    return zeroBasedIndex < remainingCores
      ? baseWorkersPerShard + 1
      : baseWorkersPerShard;
  }

  /**
   * Worker count for local development based on the given allocation strategy.
   */
  private static getWorkersForLocalStrategy(strategy: AllocatorType): number {
    switch (strategy) {
      case "all-cores":
        return this.totalCores;
      case "75-percent":
        return Math.max(this.MIN_WORKERS, Math.ceil(this.totalCores * 0.75));
      case "50-percent":
        return Math.max(this.MIN_WORKERS, Math.ceil(this.totalCores * 0.5));
      case "25-percent":
        return Math.max(this.MIN_WORKERS, Math.ceil(this.totalCores * 0.25));
      case "10-percent":
        return Math.max(this.MIN_WORKERS, Math.ceil(this.totalCores * 0.1));
      default: {
        const _exhaustive: never = strategy;
        return ErrorHandler.logAndThrow(
          "WorkerAllocator",
          `Unknown allocation strategy: ${String(_exhaustive)}. Valid strategies: all-cores, 75-percent, 50-percent, 25-percent, 10-percent.`,
        );
      }
    }
  }
}
