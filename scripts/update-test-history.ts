/**
 * update-test-history.ts
 *
 * Reads the merged Playwright `results.json` and appends a new entry
 * to `test-results-history.json`, scoped by BRANCH → TEST_TYPE so that
 * trends are tracked independently per branch and per test type.
 *
 * ── Scalability design (500+ runs) ─────────────────────────────────────────
 *
 *  The file uses THREE tiers instead of one flat array:
 *
 *  1. `meta`        — top-level stats (total run count, last updated, etc.)
 *                     Always tiny; safe to read on every page load.
 *
 *  2. `index`       — lightweight summary rows (no failedTests) sorted newest-
 *                     first, capped at MAX_INDEX_RUNS.  The dashboard reads
 *                     ONLY this for list views, charts, and filters — it never
 *                     needs to touch the full detail tier unless the user
 *                     drills into a specific run.
 *
 *  3. `byBranch`    — full detail rows (including failedTests) scoped by
 *                     branch → testType, capped at MAX_RUNS_PER_TYPE per
 *                     bucket.  failedTests are stripped from runs that fall
 *                     outside the DETAIL_WINDOW newest entries to keep the
 *                     file size predictable even with large suites.
 *
 *  This means:
 *    • A dashboard rendering 200 rows reads ~200 small objects, not 500+ large ones.
 *    • Detailed failure info is available for the most recent runs per bucket.
 *    • The JSON file grows sub-linearly as run counts increase.
 *
 * ── History shape ──────────────────────────────────────────────────────────
 *
 *  {
 *    meta: {
 *      lastUpdated: string,
 *      totalRunsEver: number,
 *      indexSize: number,
 *    },
 *    index: RunSummary[],          // newest-first, capped at MAX_INDEX_RUNS
 *    byBranch: {
 *      "<branch>": {
 *        byTestType: {
 *          "<testType>": {
 *            testType: string,
 *            runs: TestRun[],     // newest-first, capped at MAX_RUNS_PER_TYPE
 *          }
 *        }
 *      }
 *    }
 *  }
 *
 * ── Usage ──────────────────────────────────────────────────────────────────
 *
 *  npx ts-node scripts/update-test-history.ts
 *
 * ── Required env vars ──────────────────────────────────────────────────────
 *
 *  TEST_TYPE          regression | sanity | dashboard | authenticate | skip-auth
 *  ENV                qa | uat | preprod
 *  USER_ROLE          admin-user | general-user
 *  GITHUB_RUN_NUMBER
 *  GITHUB_RUN_ID
 *  GITHUB_REF_NAME    branch name
 *  GITHUB_SHA
 *  GITHUB_REPOSITORY
 *  GITHUB_REPOSITORY_OWNER
 */

import fs from "fs";
import path from "path";
import winston from "winston";

// ─── Logger ───────────────────────────────────────────────────────────────────

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
  ),
  transports: [new winston.transports.Console()],
});

// ─── Types ────────────────────────────────────────────────────────────────────

/** Stored inside each TestRun — full detail, available for recent runs only. */
interface FailedTest {
  /** Full test title e.g. "Login > should reject invalid credentials" */
  name: string;
  /** Spec file path relative to project root. */
  classname: string;
  /** Duration of this individual test case in seconds. */
  durationSec: number;
  /** "failure" = assertion; "error" = unexpected exception. */
  kind: "failure" | "error";
}

/**
 * TIER 3 — full detail row, stored in byBranch buckets.
 * `failedTests` may be stripped (set to []) on older runs to save space.
 */
interface TestRun {
  runNumber: number;
  runId: string;
  date: string;
  timestamp: number;
  branch: string;
  commitSha: string;
  env: string;
  testType: string;
  userRole: string;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  total: number;
  passRate: number;
  status: "PASS" | "FAIL";
  durationMs: number;
  durationMin: string;
  reportUrl: string;
  allureUrl: string;
  failedTests: FailedTest[];
  failedTestsStripped?: boolean;
}

type RunSummary = Omit<TestRun, "failedTests" | "failedTestsStripped">;

interface TestTypeHistory {
  testType: string;
  runs: TestRun[];
}

interface BranchHistory {
  byTestType: Record<string, TestTypeHistory>;
}

interface FileMeta {
  lastUpdated: string;
  totalRunsEver: number;
  indexSize: number;
}

interface HistoryFile {
  meta: FileMeta;
  index: RunSummary[];
  byBranch: Record<string, BranchHistory>;
}

// ─── Playwright JSON report types ─────────────────────────────────────────────

interface PlaywrightJsonStats {
  expected: number;
  unexpected: number;
  skipped: number;
  flaky: number;
  duration: number;
}

interface PlaywrightJsonTest {
  title: string;
  /** "expected" | "unexpected" | "skipped" | "flaky" */
  status: string;
  duration: number;
}

interface PlaywrightJsonSpec {
  title: string;
  /** Relative file path e.g. "layers/ui/login/InvalidLogin.spec.ts" */
  file: string;
  ok: boolean;
  tests: PlaywrightJsonTest[];
}

interface PlaywrightJsonSuite {
  title: string;
  file?: string;
  specs: PlaywrightJsonSpec[];
  suites?: PlaywrightJsonSuite[];
}

interface PlaywrightJsonReport {
  stats: PlaywrightJsonStats;
  suites: PlaywrightJsonSuite[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HISTORY_FILE = path.resolve("./test-results-history.json");
const RESULTS_JSON = path.resolve("./playwright-report/results.json");

const MAX_INDEX_RUNS = 200;
const MAX_RUNS_PER_TYPE = 50;
const DETAIL_WINDOW = 20;
const MAX_FAILED_TESTS_STORED = 50;

const R2_PUBLIC_BASE =
  "https://pub-1a2929fbcaf44458951bbb84b49b5f3f.r2.dev/orangehrm-automation";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function env(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function buildReportUrls(
  runNumber: number,
  environment: string,
): { reportUrl: string; allureUrl: string } {
  const base = `${R2_PUBLIC_BASE}/build-reports/run-${runNumber}-${environment}`;
  return {
    reportUrl: `${base}/playwright/index.html`,
    allureUrl: `${base}/allure/index.html`,
  };
}

function truncate(s: string, maxLen: number): string {
  const trimmed = s.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen - 1) + "…";
}

function applyDetailWindow(runs: TestRun[]): void {
  for (let i = DETAIL_WINDOW; i < runs.length; i++) {
    if (runs[i].failedTests.length > 0 || !runs[i].failedTestsStripped) {
      runs[i].failedTests = [];
      runs[i].failedTestsStripped = true;
    }
  }
}

function toSummary(run: TestRun): RunSummary {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { failedTests, failedTestsStripped, ...summary } = run;
  return summary;
}

// ─── Parse Playwright JSON report ────────────────────────────────────────────

interface ParseResult {
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  durationMs: number;
  failedTests: FailedTest[];
}

/**
 * Recursively walks the suite tree to collect all failed specs.
 * Playwright nests suites as: file suite → describe suite → specs.
 */
function collectFailedSpecs(
  suites: PlaywrightJsonSuite[],
  failedTests: FailedTest[],
): void {
  for (const suite of suites) {
    // Recurse into nested suites (describe blocks)
    if (suite.suites && suite.suites.length > 0) {
      collectFailedSpecs(suite.suites, failedTests);
    }

    for (const spec of suite.specs) {
      if (spec.ok) continue;
      if (failedTests.length >= MAX_FAILED_TESTS_STORED) return;

      // A spec can have multiple test entries (retries). Determine kind from
      // the first non-passing test result.
      const failingTest = spec.tests.find((t) => t.status === "unexpected");
      const kind: "failure" | "error" = failingTest ? "failure" : "error";
      const durationSec =
        Math.round(
          (spec.tests.reduce((sum, t) => sum + t.duration, 0) / 1000) * 1000,
        ) / 1000;

      failedTests.push({
        name: truncate(spec.title, 200),
        classname: truncate(spec.file, 200),
        durationSec,
        kind,
      });
    }
  }
}

function parsePlaywrightJson(jsonPath: string): ParseResult {
  logger.info(
    `[update-test-history] Parsing Playwright JSON report: ${jsonPath}`,
  );

  const raw = fs.readFileSync(jsonPath, "utf-8");
  const report = JSON.parse(raw) as PlaywrightJsonReport;
  const { stats, suites } = report;

  logger.info(
    `[update-test-history] Stats — expected=${stats.expected} unexpected=${stats.unexpected} skipped=${stats.skipped} flaky=${stats.flaky} duration=${stats.duration}ms`,
  );

  const failedTests: FailedTest[] = [];
  collectFailedSpecs(suites, failedTests);

  logger.info(
    `[update-test-history] Failed specs captured: ${failedTests.length}`,
  );

  return {
    passed: stats.expected,
    failed: stats.unexpected,
    skipped: stats.skipped,
    flaky: stats.flaky,
    durationMs: stats.duration,
    failedTests,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// 1. Parse results.json
if (!fs.existsSync(RESULTS_JSON)) {
  logger.error(`[update-test-history] ❌ Cannot find ${RESULTS_JSON}`);
  process.exit(1);
}

let passed: number;
let failed: number;
let skipped: number;
let flaky: number;
let durationMs: number;
let failedTests: FailedTest[];

try {
  ({ passed, failed, skipped, flaky, durationMs, failedTests } =
    parsePlaywrightJson(RESULTS_JSON));
} catch (err) {
  logger.error("[update-test-history] ❌ Failed to parse results.json:", err);
  process.exit(1);
}

const total = passed + failed + skipped;
const passRate =
  total > 0 ? Math.round((passed / (passed + failed || 1)) * 1000) / 10 : 0;

const testType = env("TEST_TYPE", "regression");
const branch = env("GITHUB_REF_NAME", "unknown");
const runNumber = parseInt(env("GITHUB_RUN_NUMBER", "0"), 10);
const environment = env("ENV", "qa");
const now = Date.now();

// 2. Build report URLs from R2
const { reportUrl, allureUrl } = buildReportUrls(runNumber, environment);

// 3. Build the full TestRun
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

// 4. Load existing history (or start fresh)
let history: HistoryFile = {
  meta: {
    lastUpdated: new Date(now).toISOString(),
    totalRunsEver: 0,
    indexSize: 0,
  },
  index: [],
  byBranch: {},
};

if (fs.existsSync(HISTORY_FILE)) {
  try {
    const raw = JSON.parse(
      fs.readFileSync(HISTORY_FILE, "utf-8"),
    ) as Partial<HistoryFile> & Record<string, unknown>;

    // ── Migration: old flat shape had byTestType at root ──────────────────
    if (raw["byTestType"] && !raw.byBranch) {
      logger.warn(
        "[update-test-history] ⚠️  Migrating old flat history → branch-scoped shape.",
      );
      history = {
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
    } else {
      history = {
        meta: raw.meta ?? {
          lastUpdated: (raw.lastUpdated as string) ?? new Date().toISOString(),
          totalRunsEver: 0,
          indexSize: 0,
        },
        index: raw.index ?? [],
        byBranch: raw.byBranch ?? {},
      };
    }
  } catch {
    logger.warn(
      "[update-test-history] ⚠️  Corrupted history file — starting fresh.",
    );
  }
}

// 5. ── TIER 3: update scoped bucket ──────────────────────────────────────────

if (!history.byBranch[branch]) {
  history.byBranch[branch] = { byTestType: {} };
}
if (!history.byBranch[branch].byTestType[testType]) {
  history.byBranch[branch].byTestType[testType] = { testType, runs: [] };
}

const bucket = history.byBranch[branch].byTestType[testType];
bucket.runs.unshift(newRun);
bucket.runs = bucket.runs.slice(0, MAX_RUNS_PER_TYPE);
applyDetailWindow(bucket.runs);

// 6. ── TIER 2: update lightweight index ──────────────────────────────────────

const summary = toSummary(newRun);
history.index.unshift(summary);
history.index = history.index.slice(0, MAX_INDEX_RUNS);

// 7. ── TIER 1: update meta ────────────────────────────────────────────────────

history.meta.totalRunsEver = (history.meta.totalRunsEver ?? 0) + 1;
history.meta.indexSize = history.index.length;
history.meta.lastUpdated = new Date(now).toISOString();

// 8. Write back
try {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
} catch (err) {
  logger.error("[update-test-history] ❌ Failed to write history file:", err);
  process.exit(1);
}

// ─── Summary logs ─────────────────────────────────────────────────────────────

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
