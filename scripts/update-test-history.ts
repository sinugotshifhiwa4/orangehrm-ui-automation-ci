/**
 *
 * Reads the merged Playwright `index.json` and appends a new entry
 * to `test-results-history.json`, scoped by TEST_TYPE so that
 * regression / sanity / dashboard / etc. trends are never mixed.
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
import winston from "winston";

// ─── Local logger (avoids importing internal loggerManager) ──────────────────

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
  ),
  transports: [new winston.transports.Console()],
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlaywrightStats {
  expected: number;
  unexpected: number;
  skipped: number;
  flaky: number;
  duration: number;
}

interface PlaywrightIndexJson {
  stats: PlaywrightStats;
  startTime?: string;
}

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

interface HistoryFile {
  lastUpdated: string;
  byTestType: Record<string, TestTypeHistory>;
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

// ─── Main ─────────────────────────────────────────────────────────────────────

const HISTORY_FILE = path.resolve("./test-results-history.json");
const PLAYWRIGHT_INDEX = path.resolve("./playwright-report/index.json");
const MAX_RUNS_PER_TYPE = 50;

// 1. Read Playwright index.json
if (!fs.existsSync(PLAYWRIGHT_INDEX)) {
  logger.error(`[update-test-history] ❌ Cannot find ${PLAYWRIGHT_INDEX}`);
  process.exit(1);
}

let playwrightData: PlaywrightIndexJson;
try {
  playwrightData = JSON.parse(
    fs.readFileSync(PLAYWRIGHT_INDEX, "utf-8"),
  ) as PlaywrightIndexJson;
} catch {
  logger.error(
    "[update-test-history] ❌ Failed to parse playwright-report/index.json",
  );
  process.exit(1);
}

const stats = playwrightData.stats;
const passed = stats.expected ?? 0;
const failed = stats.unexpected ?? 0;
const skipped = stats.skipped ?? 0;
const flaky = stats.flaky ?? 0;
const total = passed + failed + skipped;
const passRate =
  total > 0 ? Math.round((passed / (passed + failed)) * 1000) / 10 : 0;

const testType = env("TEST_TYPE", "regression");
const runNumber = parseInt(env("GITHUB_RUN_NUMBER", "0"), 10);

const newRun: TestRun = {
  runNumber,
  runId: env("GITHUB_RUN_ID"),
  date: new Date().toISOString(),
  branch: env("GITHUB_REF_NAME"),
  commitSha: env("GITHUB_SHA").slice(0, 7),
  env: env("ENV", "qa"),
  passed,
  failed,
  skipped,
  flaky,
  total,
  passRate,
  durationMs: stats.duration ?? 0,
  durationMin: formatDuration(stats.duration ?? 0),
  reportUrl: buildReportUrl(runNumber),
  allureUrl: buildReportUrl(runNumber, "allure/index.html"),
};

// 2. Load existing history file (or start fresh)
let history: HistoryFile = {
  lastUpdated: new Date().toISOString(),
  byTestType: {},
};

if (fs.existsSync(HISTORY_FILE)) {
  try {
    history = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8")) as HistoryFile;
  } catch {
    logger.warn(
      "[update-test-history] ⚠️  Corrupted history file — starting fresh.",
    );
  }
}

// 3. Append to the correct test-type bucket
if (!history.byTestType[testType]) {
  history.byTestType[testType] = {
    testType,
    runs: [],
  };
}

history.byTestType[testType].runs.push(newRun);

// Keep last 50 per test type
history.byTestType[testType].runs =
  history.byTestType[testType].runs.slice(-MAX_RUNS_PER_TYPE);

history.lastUpdated = new Date().toISOString();

// 4. Write back
try {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
} catch (err) {
  logger.error("[update-test-history] ❌ Failed to write history file:", err);
  process.exit(1);
}

logger.info(
  `[update-test-history] ✅ Appended run #${runNumber} to testType="${testType}"`,
);
logger.info(
  `[update-test-history]    passed=${passed} failed=${failed} skipped=${skipped} passRate=${passRate}%`,
);
logger.info(
  `[update-test-history]    History now has ${history.byTestType[testType].runs.length} runs for "${testType}"`,
);
logger.info(`[update-test-history]    Saved to ${HISTORY_FILE}`);
