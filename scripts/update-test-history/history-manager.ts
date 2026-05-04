/**
 * history-manager.ts
 * Handles loading, mutating, and persisting `test-results-history.json`.
 *
 * Exported surface:
 *   loadHistory(filePath)                       → HistoryFile
 *   updateHistory(history, newRun)              → void  (mutates in-place)
 *   saveHistory(history, filePath)              → void
 *   getBucket(history, branch, testType)        → TestTypeHistory
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

// ─── Empty history factory ────────────────────────────────────────────────────

function emptyHistory(now: number): HistoryFile {
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

// ─── Migration: flat shape → branch-scoped shape ──────────────────────────────

function migrateIfNeeded(
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

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Reads and parses `filePath`, applying any necessary migrations.
 * Returns a fresh empty history if the file does not exist or is corrupt.
 */
export function loadHistory(filePath: string): HistoryFile {
  if (!fs.existsSync(filePath)) {
    return emptyHistory(Date.now());
  }

  try {
    const raw = JSON.parse(
      fs.readFileSync(filePath, "utf-8"),
    ) as Partial<HistoryFile> & Record<string, unknown>;
    return migrateIfNeeded(raw);
  } catch {
    logger.warn(
      "[update-test-history] ⚠️  Corrupted history file — starting fresh.",
    );
    return emptyHistory(Date.now());
  }
}

/**
 * Mutates `history` in-place by inserting `newRun` into all three tiers:
 *   TIER 3 — byBranch bucket (with detail-window enforcement)
 *   TIER 2 — lightweight index
 *   TIER 1 — meta counters
 */
export function updateHistory(history: HistoryFile, newRun: TestRun): void {
  const { branch, testType, timestamp } = newRun;
  const now = timestamp;

  // ── TIER 3: scoped bucket ────────────────────────────────────────────────
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

  // ── TIER 2: index ────────────────────────────────────────────────────────
  history.index.unshift(toSummary(newRun));
  history.index = history.index.slice(0, MAX_INDEX_RUNS);

  // ── TIER 1: meta ─────────────────────────────────────────────────────────
  history.meta.totalRunsEver = (history.meta.totalRunsEver ?? 0) + 1;
  history.meta.indexSize = history.index.length;
  history.meta.lastUpdated = new Date(now).toISOString();
}

/**
 * Serialises `history` to `filePath` as formatted JSON.
 *
 * @throws If the file cannot be written.
 */
export function saveHistory(history: HistoryFile, filePath: string): void {
  fs.writeFileSync(filePath, JSON.stringify(history, null, 2), "utf-8");
}

/**
 * Convenience accessor — returns the detail bucket for a given branch + testType.
 * Call this AFTER `updateHistory` to read the mutated bucket for logging.
 */
export function getBucket(
  history: HistoryFile,
  branch: string,
  testType: string,
): TestTypeHistory {
  return history.byBranch[branch].byTestType[testType];
}
