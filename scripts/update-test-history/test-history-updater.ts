/**
 * test-history-updater.ts
 *
 * Main orchestrator class for the update-test-history pipeline. Composes the
 * internal helpers and collaborators:
 *
 *   internal/constants.ts      — file paths, size caps, R2 base URL
 *   internal/logger.ts         — winston logger singleton
 *   internal/types.ts          — shared TypeScript interfaces
 *   internal/helpers.ts        — pure utility functions
 *   internal/results-parser.ts — ResultsParser (Playwright JSON parsing)
 *   internal/history-store.ts  — HistoryStore (load / update / save)
 *
 * ── Required env vars ──────────────────────────────────────────────────────
 *
 *   TEST_TYPE          regression | sanity | dashboard | authenticate | skip-auth
 *   ENV                qa | uat | preprod
 *   USER_ROLE          admin-user | general-user
 *   GITHUB_RUN_NUMBER
 *   GITHUB_RUN_ID
 *   GITHUB_REF_NAME    branch name
 *   GITHUB_SHA
 *   GITHUB_REPOSITORY
 *   GITHUB_REPOSITORY_OWNER
 */

import fs from "fs";

import {
  HISTORY_FILE,
  RESULTS_JSON,
  DETAIL_WINDOW,
  MAX_INDEX_RUNS,
  MAX_RUNS_PER_TYPE,
} from "./internal/constants.js";
import { logger } from "./internal/logger.js";
import { env, formatDuration, buildReportUrls } from "./internal/helpers.js";
import { ResultsParser } from "./internal/results-parser.js";
import { HistoryStore } from "./internal/history-store.js";
import type { ParseResult, TestRun } from "./internal/types.js";

export class TestHistoryUpdater {
  private readonly parser: ResultsParser;
  private readonly store: HistoryStore;

  constructor(
    private readonly resultsJson: string = RESULTS_JSON,
    private readonly historyFile: string = HISTORY_FILE,
  ) {
    this.parser = new ResultsParser(this.resultsJson);
    this.store = new HistoryStore(this.historyFile);
  }

  /** Runs the full pipeline. Exits the process with code 1 on fatal errors. */
  run(): void {
    this.assertResultsExist();

    const parsed = this.parseResults();
    const newRun = this.buildRun(parsed);

    this.store.load().update(newRun);
    this.persist();
    this.logSummary(newRun, parsed);
  }

  // ─── Pipeline steps ────────────────────────────────────────────────────────

  private assertResultsExist(): void {
    if (!fs.existsSync(this.resultsJson)) {
      logger.error(`[update-test-history] ❌ Cannot find ${this.resultsJson}`);
      process.exit(1);
    }
  }

  private parseResults(): ParseResult {
    try {
      return this.parser.parse();
    } catch (err) {
      logger.error(
        "[update-test-history] ❌ Failed to parse results.json:",
        err,
      );
      process.exit(1);
    }
  }

  /** Builds the full TestRun record from parsed stats + the run environment. */
  private buildRun(parsed: ParseResult): TestRun {
    const { passed, failed, skipped, flaky, durationMs, failedTests } = parsed;

    const total = passed + failed + skipped + flaky;
    const passRate =
      total > 0 ? Math.round((passed / (passed + failed || 1)) * 1000) / 10 : 0;

    const environment = env("ENV", "qa");
    const runNumber = parseInt(env("GITHUB_RUN_NUMBER", "0"), 10);
    const now = Date.now();

    const { reportUrl, allureUrl } = buildReportUrls(runNumber, environment);

    return {
      runNumber,
      runId: env("GITHUB_RUN_ID"),
      date: new Date(now).toISOString(),
      timestamp: now,
      branch: env("GITHUB_REF_NAME", "unknown"),
      commitSha: env("GITHUB_SHA").slice(0, 7),
      env: environment,
      testType: env("TEST_TYPE", "regression"),
      userRole: env("USER_ROLE", "unknown"),
      passed,
      failed,
      skipped,
      flaky,
      total,
      passRate,
      status: failed > 0 ? "FAIL" : "PASS",
      durationMs,
      durationMin: formatDuration(durationMs),
      reportUrl,
      allureUrl,
      failedTests,
    };
  }

  private persist(): void {
    try {
      this.store.save();
    } catch (err) {
      logger.error(
        "[update-test-history] ❌ Failed to write history file:",
        err,
      );
      process.exit(1);
    }
  }

  // ─── Summary logging ─────────────────────────────────────────────────────

  private logSummary(newRun: TestRun, parsed: ParseResult): void {
    const { passed, failed, skipped, flaky, failedTests } = parsed;
    const { branch, testType, runNumber, reportUrl, allureUrl } = newRun;
    const bucket = this.store.getBucket(branch, testType);

    logger.info(
      `[update-test-history] ✅ Run #${runNumber} → branch="${branch}" testType="${testType}" status=${newRun.status}`,
    );
    logger.info(
      `[update-test-history]    passed=${passed} failed=${failed} skipped=${skipped} flaky=${flaky} passRate=${newRun.passRate}%`,
    );

    if (failedTests.length > 0) {
      logger.info(`[update-test-history]    Failed tests:`);
      for (const ft of failedTests) {
        logger.info(
          `[update-test-history]      • [${ft.kind}] ${ft.name} (${ft.durationSec}s)`,
        );
        logger.info(`[update-test-history]        ${ft.classname}`);
      }
    }

    logger.info(`[update-test-history]    reportUrl: ${reportUrl}`);
    logger.info(`[update-test-history]    allureUrl: ${allureUrl}`);
    logger.info(
      `[update-test-history]    Index: ${this.store.indexLength}/${MAX_INDEX_RUNS} rows`,
    );
    logger.info(
      `[update-test-history]    Bucket: ${bucket.runs.length}/${MAX_RUNS_PER_TYPE} runs (detail window: ${DETAIL_WINDOW})`,
    );
    logger.info(
      `[update-test-history]    Total runs ever: ${this.store.meta.totalRunsEver}`,
    );
    logger.info(`[update-test-history]    Saved to ${this.historyFile}`);
  }
}
