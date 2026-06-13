/**
 * constants.ts
 * Shared constants for the update-test-history pipeline.
 */

import path from "path";

// ─── File paths ───────────────────────────────────────────────────────────────

export const HISTORY_FILE = path.resolve("./test-results-history.json");
export const RESULTS_JSON = path.resolve("./playwright-report/results.json");

// ─── History size limits ──────────────────────────────────────────────────────

/** Maximum number of lightweight summary rows kept in the index tier. */
export const MAX_INDEX_RUNS = 200;

/** Maximum number of full detail rows kept per branch → testType bucket. */
export const MAX_RUNS_PER_TYPE = 50;

/**
 * Number of most-recent runs (per bucket) that retain full failedTests detail.
 * Older runs have failedTests stripped to keep the file size predictable.
 */
export const DETAIL_WINDOW = 20;

/** Hard cap on the number of failed test entries stored per run. */
export const MAX_FAILED_TESTS_STORED = 50;

// ─── Remote storage ───────────────────────────────────────────────────────────

export const R2_PUBLIC_BASE =
  "https://pub-1a2929fbcaf44458951bbb84b49b5f3f.r2.dev/orangehrm-automation";
