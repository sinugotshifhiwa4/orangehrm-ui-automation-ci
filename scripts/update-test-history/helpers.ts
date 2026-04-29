/**
 * helpers.ts
 * Pure utility functions for the update-test-history pipeline.
 * No side-effects, no I/O — safe to unit-test in isolation.
 */

import { R2_PUBLIC_BASE } from "./constants.js";
import type { TestRun, RunSummary } from "./types.js";

// ─── String / formatting ──────────────────────────────────────────────────────

/**
 * Reads an environment variable, returning `fallback` when absent or empty.
 */
export function env(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

/**
 * Formats a millisecond duration as a human-readable string.
 * @example formatDuration(125_000) // "2m 5s"
 * @example formatDuration(45_000)  // "45s"
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

/**
 * Truncates a string to `maxLen` characters, appending "…" when trimmed.
 */
export function truncate(s: string, maxLen: number): string {
  const trimmed = s.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen - 1) + "…";
}

// ─── URL builders ─────────────────────────────────────────────────────────────

/**
 * Builds the Playwright report and Allure report URLs for a given run.
 */
export function buildReportUrls(
  runNumber: number,
  environment: string,
): { reportUrl: string; allureUrl: string } {
  const base = `${R2_PUBLIC_BASE}/build-reports/run-${runNumber}-${environment}`;
  return {
    reportUrl: `${base}/playwright/index.html`,
    allureUrl: `${base}/allure/index.html`,
  };
}

// ─── History helpers ──────────────────────────────────────────────────────────

/**
 * Strips `failedTests` from runs outside the detail window (in-place).
 * Runs are expected to be sorted newest-first.
 */
export function applyDetailWindow(runs: TestRun[], detailWindow: number): void {
  for (let i = detailWindow; i < runs.length; i++) {
    if (runs[i].failedTests.length > 0 || !runs[i].failedTestsStripped) {
      runs[i].failedTests = [];
      runs[i].failedTestsStripped = true;
    }
  }
}

/**
 * Converts a full `TestRun` to a lightweight `RunSummary` by removing
 * the `failedTests` and `failedTestsStripped` fields.
 */
export function toSummary(run: TestRun): RunSummary {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { failedTests, failedTestsStripped, ...summary } = run;
  return summary;
}
