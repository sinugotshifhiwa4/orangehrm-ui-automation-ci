/**
 * history-store.ts
 * Encapsulates loading, mutating, and persisting `test-results-history.json`.
 *
 *   const store = new HistoryStore(filePath);
 *   store.load();
 *   store.update(newRun);
 *   store.save();
 *   store.getBucket(branch, testType);
 *
 * The loaded history is held as internal state, so the orchestrator never
 * touches the raw file shape directly.
 */

import fs from "fs";

import {
  MAX_INDEX_RUNS,
  MAX_RUNS_PER_TYPE,
  DETAIL_WINDOW,
} from "./constants.js";
import { logger } from "./logger.js";
import { applyDetailWindow, toSummary } from "./helpers.js";
import type {
  FileMeta,
  HistoryFile,
  TestRun,
  TestTypeHistory,
} from "./types.js";

export class HistoryStore {
  private history: HistoryFile;

  constructor(private readonly filePath: string) {
    this.history = HistoryStore.emptyHistory(Date.now());
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Reads and parses the backing file, applying any necessary migrations.
   * Falls back to a fresh empty history if the file is missing or corrupt.
   */
  load(): this {
    if (!fs.existsSync(this.filePath)) {
      this.history = HistoryStore.emptyHistory(Date.now());
      return this;
    }

    try {
      const raw = JSON.parse(
        fs.readFileSync(this.filePath, "utf-8"),
      ) as Partial<HistoryFile> & Record<string, unknown>;
      this.history = HistoryStore.migrateIfNeeded(raw);
    } catch {
      logger.warn(
        "[update-test-history] ⚠️  Corrupted history file — starting fresh.",
      );
      this.history = HistoryStore.emptyHistory(Date.now());
    }

    return this;
  }

  /**
   * Inserts `newRun` into all three tiers:
   *   TIER 3 — byBranch bucket (with detail-window enforcement)
   *   TIER 2 — lightweight index
   *   TIER 1 — meta counters
   */
  update(newRun: TestRun): this {
    const { branch, testType, timestamp } = newRun;
    const history = this.history;

    // ── TIER 3: scoped bucket ──────────────────────────────────────────────
    if (!history.byBranch[branch]) {
      history.byBranch[branch] = { byTestType: {} };
    }
    if (!history.byBranch[branch].byTestType[testType]) {
      history.byBranch[branch].byTestType[testType] = { testType, runs: [] };
    }

    const bucket = history.byBranch[branch].byTestType[testType];
    bucket.runs.unshift(newRun);
    bucket.runs = bucket.runs.slice(0, MAX_RUNS_PER_TYPE);
    applyDetailWindow(bucket.runs, DETAIL_WINDOW);

    // ── TIER 2: index ──────────────────────────────────────────────────────
    history.index.unshift(toSummary(newRun));
    history.index = history.index.slice(0, MAX_INDEX_RUNS);

    // ── TIER 1: meta ───────────────────────────────────────────────────────
    history.meta.totalRunsEver = (history.meta.totalRunsEver ?? 0) + 1;
    history.meta.indexSize = history.index.length;
    history.meta.lastUpdated = new Date(timestamp).toISOString();

    return this;
  }

  /**
   * Writes the current history to the backing file as formatted JSON.
   *
   * @throws If the file cannot be written.
   */
  save(): void {
    fs.writeFileSync(
      this.filePath,
      JSON.stringify(this.history, null, 2),
      "utf-8",
    );
  }

  /** Returns the detail bucket for a given branch + testType. */
  getBucket(branch: string, testType: string): TestTypeHistory {
    return this.history.byBranch[branch].byTestType[testType];
  }

  /** Read-only access to the top-level metadata (for summary logging). */
  get meta(): FileMeta {
    return this.history.meta;
  }

  /** Number of rows currently held in the index tier. */
  get indexLength(): number {
    return this.history.index.length;
  }

  // ─── Internal ────────────────────────────────────────────────────────────

  private static emptyHistory(now: number): HistoryFile {
    return {
      meta: {
        lastUpdated: new Date(now).toISOString(),
        totalRunsEver: 0,
        indexSize: 0,
      },
      index: [],
      byBranch: {},
    };
  }

  /** Migrates the old flat shape (`byTestType` at root) → branch-scoped shape. */
  private static migrateIfNeeded(
    raw: Partial<HistoryFile> & Record<string, unknown>,
  ): HistoryFile {
    if (raw["byTestType"] && !raw.byBranch) {
      logger.warn(
        "[update-test-history] ⚠️  Migrating old flat history → branch-scoped shape.",
      );
      return {
        meta: {
          lastUpdated: (raw.lastUpdated as string) ?? new Date().toISOString(),
          totalRunsEver: 0,
          indexSize: 0,
        },
        index: [],
        byBranch: {
          unknown: {
            byTestType: raw["byTestType"] as Record<string, TestTypeHistory>,
          },
        },
      };
    }

    return {
      meta: (raw.meta as FileMeta) ?? {
        lastUpdated: (raw.lastUpdated as string) ?? new Date().toISOString(),
        totalRunsEver: 0,
        indexSize: 0,
      },
      index: raw.index ?? [],
      byBranch: raw.byBranch ?? {},
    };
  }
}
