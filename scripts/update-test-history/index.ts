/**
 * index.ts  (scripts/update-test-history/index.ts)
 *
 * Thin orchestrator for the update-test-history pipeline.
 * All heavy lifting is delegated to the sibling modules:
 *
 *   constants.ts       — file paths, size caps, R2 base URL
 *   logger.ts          — winston logger singleton
 *   types.ts           — shared TypeScript interfaces
 *   helpers.ts         — pure utility functions
 *   parse-results.ts   — Playwright JSON report parsing
 *   history-manager.ts — load / update / save history file
 *
 * ── Usage ──────────────────────────────────────────────────────────────────
 *
 *   npx ts-node scripts/update-test-history/index.ts
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
} from "./constants.js";
import { logger } from "./logger.js";
import { env, formatDuration, buildReportUrls } from "./helpers.js";
import { parsePlaywrightJson } from "./parse-results.js";
import {
  loadHistory,
  updateHistory,
  saveHistory,
  getBucket,
} from "./history-manager.js";
import type { TestRun } from "./types.js";

// ─── 1. Guard: results file must exist ───────────────────────────────────────

if (!fs.existsSync(RESULTS_JSON)) {
  logger.error(`[update-test-history] ❌ Cannot find ${RESULTS_JSON}`);
  process.exit(1);
}

// ─── 2. Parse results.json ────────────────────────────────────────────────────

let parsed: ReturnType<typeof parsePlaywrightJson>;

try {
  parsed = parsePlaywrightJson(RESULTS_JSON);
} catch (err) {
  logger.error("[update-test-history] ❌ Failed to parse results.json:", err);
  process.exit(1);
}

const { passed, failed, skipped, flaky, durationMs, failedTests } = parsed;

const total = passed + failed + skipped;
const passRate =
  total > 0 ? Math.round((passed / (passed + failed || 1)) * 1000) / 10 : 0;

// ─── 3. Resolve run context from environment ──────────────────────────────────

const testType = env("TEST_TYPE", "regression");
const branch = env("GITHUB_REF_NAME", "unknown");
const runNumber = parseInt(env("GITHUB_RUN_NUMBER", "0"), 10);
const environment = env("ENV", "qa");
const now = Date.now();

const { reportUrl, allureUrl } = buildReportUrls(runNumber, environment);

// ─── 4. Build the full TestRun record ────────────────────────────────────────

const newRun: TestRun = {
  runNumber,
  runId: env("GITHUB_RUN_ID"),
  date: new Date(now).toISOString(),
  timestamp: now,
  branch,
  commitSha: env("GITHUB_SHA").slice(0, 7),
  env: environment,
  testType,
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

// ─── 5. Load → update → save ──────────────────────────────────────────────────

const history = loadHistory(HISTORY_FILE);
updateHistory(history, newRun);

try {
  saveHistory(history, HISTORY_FILE);
} catch (err) {
  logger.error("[update-test-history] ❌ Failed to write history file:", err);
  process.exit(1);
}

// ─── 6. Summary logs ──────────────────────────────────────────────────────────

const bucket = getBucket(history, branch, testType);

logger.info(
  `[update-test-history] ✅ Run #${runNumber} → branch="${branch}" testType="${testType}" status=${newRun.status}`,
);
logger.info(
  `[update-test-history]    passed=${passed} failed=${failed} skipped=${skipped} flaky=${flaky} passRate=${passRate}%`,
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
  `[update-test-history]    Index: ${history.index.length}/${MAX_INDEX_RUNS} rows`,
);
logger.info(
  `[update-test-history]    Bucket: ${bucket.runs.length}/${MAX_RUNS_PER_TYPE} runs (detail window: ${DETAIL_WINDOW})`,
);
logger.info(
  `[update-test-history]    Total runs ever: ${history.meta.totalRunsEver}`,
);
logger.info(`[update-test-history]    Saved to ${HISTORY_FILE}`);
