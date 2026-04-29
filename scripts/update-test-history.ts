/**
 * update-test-history.ts
 *
 * Reads the merged Playwright `results.xml` (JUnit) and appends a new entry
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
 *
 *    // ── TIER 2: lightweight index (no failedTests) ──
 *    index: RunSummary[],          // newest-first, capped at MAX_INDEX_RUNS
 *
 *    // ── TIER 3: full detail, scoped ──
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
import { XMLParser } from "fast-xml-parser";
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
  /** Spec file path reported by Playwright JUnit output. */
  classname: string;
  /** First 500 chars of the <failure>/<error> message. */
  failureMessage: string;
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
  /** ISO date string */
  date: string;
  /** Unix ms — used for sorting without re-parsing date strings */
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
  /** Derived: "PASS" when failed === 0, else "FAIL" */
  status: "PASS" | "FAIL";

  durationMs: number;
  /** Human-readable e.g. "2m 34s" */
  durationMin: string;

  reportUrl: string;
  allureUrl: string;

  /**
   * Per-test failure details.  Present for runs within DETAIL_WINDOW;
   * stripped (empty array) on older runs to keep file size bounded.
   */
  failedTests: FailedTest[];
  /**
   * True when failedTests was stripped due to age.
   * The UI can show "details unavailable for this run" instead of
   * misleadingly showing an empty list.
   */
  failedTestsStripped?: boolean;
}

/**
 * TIER 2 — lightweight summary row stored in the top-level index.
 * Identical to TestRun but without the bulky failedTests array.
 * Used by the dashboard for list rendering, charts, and filtering.
 */
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
  /** Rolling counter — never resets, useful for "total runs ever" display. */
  totalRunsEver: number;
  /** Current length of the index array — avoids a .length call in the UI. */
  indexSize: number;
}

interface HistoryFile {
  meta: FileMeta;
  /** TIER 2: lightweight summaries, newest-first, capped at MAX_INDEX_RUNS. */
  index: RunSummary[];
  /** TIER 3: full detail scoped by branch → testType. */
  byBranch: Record<string, BranchHistory>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HISTORY_FILE = path.resolve("./test-results-history.json");
const JUNIT_XML = path.resolve("./playwright-report/results.xml");

/**
 * How many lightweight summary rows to keep in the top-level index.
 * The dashboard uses this for all list views and charts — bump if you need
 * a longer trend window visible without branch filtering.
 */
const MAX_INDEX_RUNS = 200;

/**
 * How many full-detail runs to keep per branch+testType bucket.
 * Each bucket is independent, so total storage = buckets × MAX_RUNS_PER_TYPE.
 */
const MAX_RUNS_PER_TYPE = 50;

/**
 * How many of the newest runs (per bucket) keep their failedTests array.
 * Older runs beyond this window have failedTests stripped to [] to save space.
 * Must be ≤ MAX_RUNS_PER_TYPE.
 */
const DETAIL_WINDOW = 20;

/** Hard cap on failedTests entries per run to prevent huge suites bloating the file. */
const MAX_FAILED_TESTS_STORED = 50;

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

function buildReportUrl(runNumber: number, sub?: string): string {
  const owner = env("GITHUB_REPOSITORY_OWNER");
  const repo = env("GITHUB_REPOSITORY").split("/")[1] ?? "";
  const base = `https://${owner}.github.io/${repo}/reports/${runNumber}`;
  return sub ? `${base}/${sub}` : `${base}/index.html`;
}

function attrStr(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return "";
}

function truncate(s: string, maxLen: number): string {
  const trimmed = s.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen - 1) + "…";
}

/** Strip failedTests from runs outside the detail window (in-place). */
function applyDetailWindow(runs: TestRun[]): void {
  // runs is newest-first; strip everything beyond DETAIL_WINDOW
  for (let i = DETAIL_WINDOW; i < runs.length; i++) {
    if (runs[i].failedTests.length > 0 || !runs[i].failedTestsStripped) {
      runs[i].failedTests = [];
      runs[i].failedTestsStripped = true;
    }
  }
}

/** Build a RunSummary from a TestRun (drop the failedTests fields). */
function toSummary(run: TestRun): RunSummary {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { failedTests, failedTestsStripped, ...summary } = run;
  return summary;
}

// ─── Parse JUnit XML ──────────────────────────────────────────────────────────

interface ParseResult {
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  failedTests: FailedTest[];
}

function parseJUnitXml(xmlPath: string): ParseResult {
  const raw = fs.readFileSync(xmlPath, "utf-8");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    isArray: (tagName) =>
      ["testsuite", "testcase", "failure", "error"].includes(tagName),
  });
  const parsed = parser.parse(raw);

  const root = parsed["testsuites"] ?? parsed["testsuite"];

  let tests = 0;
  let failures = 0;
  let errors = 0;
  let skipped = 0;
  let duration = 0;
  const failedTests: FailedTest[] = [];

  const processSuite = (suite: Record<string, unknown>) => {
    tests += parseInt(attrStr(suite["@_tests"]) || "0", 10);
    failures += parseInt(attrStr(suite["@_failures"]) || "0", 10);
    errors += parseInt(attrStr(suite["@_errors"]) || "0", 10);
    skipped += parseInt(attrStr(suite["@_skipped"]) || "0", 10);
    duration += parseFloat(attrStr(suite["@_time"]) || "0");

    const testcases = suite["testcase"];
    if (!testcases) return;

    const caseArray = Array.isArray(testcases) ? testcases : [testcases];

    for (const tc of caseArray) {
      if (typeof tc !== "object" || tc === null) continue;
      const tcObj = tc as Record<string, unknown>;

      const hasFailure =
        tcObj["failure"] != null &&
        (Array.isArray(tcObj["failure"])
          ? (tcObj["failure"] as unknown[]).length > 0
          : true);
      const hasError =
        tcObj["error"] != null &&
        (Array.isArray(tcObj["error"])
          ? (tcObj["error"] as unknown[]).length > 0
          : true);

      if (!hasFailure && !hasError) continue;
      if (failedTests.length >= MAX_FAILED_TESTS_STORED) continue;

      const kind: "failure" | "error" = hasFailure ? "failure" : "error";
      const problemNode = hasFailure ? tcObj["failure"] : tcObj["error"];

      let rawMessage = "";
      const firstNode = Array.isArray(problemNode)
        ? (problemNode as unknown[])[0]
        : problemNode;

      if (typeof firstNode === "string") {
        rawMessage = firstNode;
      } else if (firstNode && typeof firstNode === "object") {
        const nodeObj = firstNode as Record<string, unknown>;
        const msgAttr = attrStr(nodeObj["@_message"]);
        const bodyText = attrStr(nodeObj["#text"]);
        rawMessage = msgAttr || bodyText;
      }

      const durationSec = parseFloat(attrStr(tcObj["@_time"]) || "0");

      failedTests.push({
        name: truncate(attrStr(tcObj["@_name"]), 200),
        classname: truncate(attrStr(tcObj["@_classname"]), 200),
        failureMessage: truncate(rawMessage, 500),
        durationSec: Math.round(durationSec * 1000) / 1000,
        kind,
      });
    }
  };

  if (root?.["testsuite"]) {
    const inner = root["testsuite"];
    if (Array.isArray(inner)) inner.forEach(processSuite);
    else processSuite(inner as Record<string, unknown>);
  } else if (root) {
    processSuite(root as Record<string, unknown>);
  }

  const totalFailed = failures + errors;
  const passed = Math.max(0, tests - totalFailed - skipped);

  return {
    passed,
    failed: totalFailed,
    skipped,
    durationMs: Math.round(duration * 1000),
    failedTests,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// 1. Parse results.xml
if (!fs.existsSync(JUNIT_XML)) {
  logger.error(`[update-test-history] ❌ Cannot find ${JUNIT_XML}`);
  process.exit(1);
}

let passed: number;
let failed: number;
let skipped: number;
let durationMs: number;
let failedTests: FailedTest[];

try {
  ({ passed, failed, skipped, durationMs, failedTests } =
    parseJUnitXml(JUNIT_XML));
} catch (err) {
  logger.error("[update-test-history] ❌ Failed to parse results.xml:", err);
  process.exit(1);
}

const total = passed + failed + skipped;
const passRate =
  total > 0 ? Math.round((passed / (passed + failed || 1)) * 1000) / 10 : 0;

const testType = env("TEST_TYPE", "regression");
const branch = env("GITHUB_REF_NAME", "unknown");
const runNumber = parseInt(env("GITHUB_RUN_NUMBER", "0"), 10);
const now = Date.now();

// 2. Build the full TestRun
const newRun: TestRun = {
  runNumber,
  runId: env("GITHUB_RUN_ID"),
  date: new Date(now).toISOString(),
  timestamp: now,

  branch,
  commitSha: env("GITHUB_SHA").slice(0, 7),

  env: env("ENV", "qa"),
  testType,
  userRole: env("USER_ROLE", "unknown"),

  passed,
  failed,
  skipped,
  flaky: 0,
  total,

  passRate,
  status: failed > 0 ? "FAIL" : "PASS",

  durationMs,
  durationMin: formatDuration(durationMs),

  reportUrl: buildReportUrl(runNumber),
  allureUrl: buildReportUrl(runNumber, "allure/index.html"),

  failedTests,
};

// 3. Load existing history (or start fresh)
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
      // ── Migration: previous version had no meta/index ─────────────────
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

// 4. ── TIER 3: update scoped bucket ──────────────────────────────────────────

if (!history.byBranch[branch]) {
  history.byBranch[branch] = { byTestType: {} };
}
if (!history.byBranch[branch].byTestType[testType]) {
  history.byBranch[branch].byTestType[testType] = { testType, runs: [] };
}

const bucket = history.byBranch[branch].byTestType[testType];

// Prepend (newest-first) and cap
bucket.runs.unshift(newRun);
bucket.runs = bucket.runs.slice(0, MAX_RUNS_PER_TYPE);

// Strip failedTests from runs outside the detail window
applyDetailWindow(bucket.runs);

// 5. ── TIER 2: update lightweight index ──────────────────────────────────────

const summary = toSummary(newRun);
history.index.unshift(summary);
history.index = history.index.slice(0, MAX_INDEX_RUNS);

// 6. ── TIER 1: update meta ────────────────────────────────────────────────────

history.meta.totalRunsEver = (history.meta.totalRunsEver ?? 0) + 1;
history.meta.indexSize = history.index.length;
history.meta.lastUpdated = new Date(now).toISOString();

// 7. Write back
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
  `[update-test-history]    passed=${passed} failed=${failed} skipped=${skipped} passRate=${passRate}%`,
);
logger.info(
  `[update-test-history]    failedTests captured: ${failedTests.length}${
    failedTests.length === MAX_FAILED_TESTS_STORED
      ? ` (capped at ${MAX_FAILED_TESTS_STORED})`
      : ""
  }`,
);
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
