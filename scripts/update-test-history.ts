/**
 * update-test-history.ts
 *
 * Reads the merged Playwright `results.xml` (JUnit) and appends a new entry
 * to `test-results-history.json`, scoped by BRANCH → TEST_TYPE so that
 * trends are tracked independently per branch and per test type.
 *
 * History shape:
 *   {
 *     lastUpdated: string,
 *     byBranch: {
 *       "environment/QA": {
 *         byTestType: {
 *           "regression": { testType, runs: [...] },
 *           "sanity":     { testType, runs: [...] }
 *         }
 *       },
 *       "environment/UAT": { ... }
 *     }
 *   }
 *
 * Usage (called from CI after merge-reports step):
 *   npx ts-node scripts/update-test-history.ts
 *
 * Required env vars (all available in your existing workflow):
 *   TEST_TYPE        - regression | sanity | dashboard | authenticate | skip-auth
 *   ENV              - qa | uat | preprod
 *   GITHUB_RUN_NUMBER
 *   GITHUB_RUN_ID
 *   GITHUB_REF_NAME  - branch name
 *   GITHUB_SHA
 *   GITHUB_REPOSITORY
 *   GITHUB_REPOSITORY_OWNER
 */

import fs from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import winston from "winston";

// ─── Local logger ─────────────────────────────────────────────────────────────

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
  ),
  transports: [new winston.transports.Console()],
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestRun {
  runNumber: number;
  runId: string;
  date: string;
  branch: string;
  commitSha: string;
  env: string;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  total: number;
  passRate: number; // 0–100
  durationMs: number;
  durationMin: string; // human-readable "2m 34s"
  reportUrl: string;
  allureUrl: string;
}

interface TestTypeHistory {
  testType: string;
  runs: TestRun[];
}

interface BranchHistory {
  byTestType: Record<string, TestTypeHistory>;
}

interface HistoryFile {
  lastUpdated: string;
  byBranch: Record<string, BranchHistory>;
}

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

// ─── Parse JUnit XML ─────────────────────────────────────────────────────────

function parseJUnitXml(xmlPath: string): {
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
} {
  const raw = fs.readFileSync(xmlPath, "utf-8");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const parsed = parser.parse(raw);

  // JUnit XML can have a single <testsuite> or a <testsuites> wrapper
  const suites = parsed["testsuites"] ?? parsed["testsuite"];

  let tests = 0;
  let failures = 0;
  let errors = 0;
  let skipped = 0;
  let duration = 0; // seconds

  const processSuite = (suite: Record<string, string>) => {
    tests += parseInt(suite["@_tests"] ?? "0", 10);
    failures += parseInt(suite["@_failures"] ?? "0", 10);
    errors += parseInt(suite["@_errors"] ?? "0", 10);
    skipped += parseInt(suite["@_skipped"] ?? "0", 10);
    duration += parseFloat(suite["@_time"] ?? "0");
  };

  if (suites?.["testsuite"]) {
    // <testsuites> wrapper with multiple <testsuite> children
    const inner = suites["testsuite"];
    if (Array.isArray(inner)) {
      inner.forEach(processSuite);
    } else {
      processSuite(inner);
    }
  } else if (suites) {
    // Single <testsuite> at root
    processSuite(suites);
  }

  const totalFailed = failures + errors;
  const passed = tests - totalFailed - skipped;

  return {
    passed: Math.max(0, passed),
    failed: totalFailed,
    skipped,
    durationMs: Math.round(duration * 1000),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const HISTORY_FILE = path.resolve("./test-results-history.json");
const JUNIT_XML = path.resolve("./playwright-report/results.xml");
const MAX_RUNS_PER_TYPE = 50;

// 1. Read and parse results.xml
if (!fs.existsSync(JUNIT_XML)) {
  logger.error(`[update-test-history] ❌ Cannot find ${JUNIT_XML}`);
  process.exit(1);
}

let passed: number;
let failed: number;
let skipped: number;
let durationMs: number;

try {
  ({ passed, failed, skipped, durationMs } = parseJUnitXml(JUNIT_XML));
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

const newRun: TestRun = {
  runNumber,
  runId: env("GITHUB_RUN_ID"),
  date: new Date().toISOString(),
  branch,
  commitSha: env("GITHUB_SHA").slice(0, 7),
  env: env("ENV", "qa"),
  passed,
  failed,
  skipped,
  flaky: 0, // JUnit XML does not carry flaky info; extend if needed
  total,
  passRate,
  durationMs,
  durationMin: formatDuration(durationMs),
  reportUrl: buildReportUrl(runNumber),
  allureUrl: buildReportUrl(runNumber, "allure/index.html"),
};

// 2. Load existing history file (or start fresh)
let history: HistoryFile = {
  lastUpdated: new Date().toISOString(),
  byBranch: {},
};

if (fs.existsSync(HISTORY_FILE)) {
  try {
    history = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8")) as HistoryFile;

    // Migrate old flat shape (byTestType at root) → new branch-scoped shape
    const legacy = history as unknown as Record<string, unknown>;
    if (legacy["byTestType"] && !history.byBranch) {
      logger.warn(
        "[update-test-history] ⚠️  Migrating old flat history to branch-scoped shape.",
      );
      history = {
        lastUpdated: history.lastUpdated,
        byBranch: {
          unknown: {
            byTestType: legacy["byTestType"] as Record<string, TestTypeHistory>,
          },
        },
      };
    }
  } catch {
    logger.warn(
      "[update-test-history] ⚠️  Corrupted history file — starting fresh.",
    );
  }
}

// 3. Ensure branch + testType buckets exist
if (!history.byBranch[branch]) {
  history.byBranch[branch] = { byTestType: {} };
}
if (!history.byBranch[branch].byTestType[testType]) {
  history.byBranch[branch].byTestType[testType] = { testType, runs: [] };
}

// 4. Append run and cap at MAX_RUNS_PER_TYPE
history.byBranch[branch].byTestType[testType].runs.push(newRun);
history.byBranch[branch].byTestType[testType].runs =
  history.byBranch[branch].byTestType[testType].runs.slice(-MAX_RUNS_PER_TYPE);

history.lastUpdated = new Date().toISOString();

// 5. Write back
try {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
} catch (err) {
  logger.error("[update-test-history] ❌ Failed to write history file:", err);
  process.exit(1);
}

const runCount = history.byBranch[branch].byTestType[testType].runs.length;

logger.info(
  `[update-test-history] ✅ Appended run #${runNumber} → branch="${branch}" testType="${testType}"`,
);
logger.info(
  `[update-test-history]    passed=${passed} failed=${failed} skipped=${skipped} passRate=${passRate}%`,
);
logger.info(
  `[update-test-history]    History now has ${runCount} run(s) for branch="${branch}" / testType="${testType}"`,
);
logger.info(`[update-test-history]    Saved to ${HISTORY_FILE}`);
