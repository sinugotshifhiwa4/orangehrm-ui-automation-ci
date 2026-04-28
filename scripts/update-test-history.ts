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
 *       "develop": {
 *         byTestType: {
 *           "regression": { testType, runs: [...] },
 *           "sanity":     { testType, runs: [...] }
 *         }
 *       }
 *     }
 *   }
 *
 * Usage (called from CI after merge-reports step):
 *   npx ts-node scripts/update-test-history.ts
 *
 * Required env vars (all available in your existing workflow):
 *   TEST_TYPE        - regression | sanity | dashboard | authenticate | skip-auth
 *   ENV              - qa | uat | preprod
 *   USER_ROLE        - admin-user | general-user
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

/**
 * A single failed (or flaky) test case captured from the JUnit XML.
 * Stored inside each TestRun so the dashboard can show "which tests failed".
 */
interface FailedTest {
  /** Full test title, e.g. "Login > should reject invalid credentials" */
  name: string;
  /**
   * Class / file path reported by Playwright JUnit output.
   * Typically the spec file path, e.g. "tests/auth/login.spec.ts".
   */
  classname: string;
  /**
   * First line of the <failure> or <error> message — trimmed to 500 chars
   * so the history file stays compact while still being diagnostic.
   */
  failureMessage: string;
  /**
   * Duration of this individual test case in seconds (from the JUnit
   * `time` attribute), rounded to 3 decimal places.
   */
  durationSec: number;
  /**
   * "failure" = assertion failure; "error" = unexpected error/exception.
   * Mirrors the JUnit element name so the dashboard can style them differently.
   */
  kind: "failure" | "error";
}

interface TestRun {
  runNumber: number;
  runId: string;
  date: string;
  branch: string;
  commitSha: string;
  env: string;
  userRole: string; // admin-user | general-user
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
  /**
   * Per-test failure details parsed from the JUnit XML.
   * Empty array when all tests pass. Capped at MAX_FAILED_TESTS_STORED
   * entries to keep the history file size predictable.
   */
  failedTests: FailedTest[];
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

// ─── Constants ────────────────────────────────────────────────────────────────

const HISTORY_FILE = path.resolve("./test-results-history.json");
const JUNIT_XML = path.resolve("./playwright-report/results.xml");
const MAX_RUNS_PER_TYPE = 50;
/**
 * Hard cap on the number of failed-test objects stored per run.
 * Prevents very large suites from bloating the history file.
 * The dashboard will show "and N more…" when this limit is hit.
 */
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

/**
 * Safely extract a plain string from a JUnit attribute or text node.
 * fast-xml-parser may return numbers, booleans, or objects; normalise them all.
 */
function attrStr(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  // Objects (e.g. nested XML nodes) are not useful as strings — return empty.
  return "";
}

/**
 * Truncate a string to `maxLen` characters, appending "…" if truncated.
 */
function truncate(s: string, maxLen: number): string {
  const trimmed = s.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen - 1) + "…";
}

// ─── Parse JUnit XML ─────────────────────────────────────────────────────────

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
    // Ensure text content of elements (e.g. <failure>) is accessible.
    textNodeName: "#text",
    // Keep single-child arrays as arrays so we can always iterate.
    isArray: (tagName) =>
      ["testsuite", "testcase", "failure", "error"].includes(tagName),
  });
  const parsed = parser.parse(raw);

  // JUnit XML can have a single <testsuite> or a <testsuites> wrapper.
  const root = parsed["testsuites"] ?? parsed["testsuite"];

  let tests = 0;
  let failures = 0;
  let errors = 0;
  let skipped = 0;
  let duration = 0; // seconds
  const failedTests: FailedTest[] = [];

  // ── Walk every <testsuite> ──────────────────────────────────────────────
  const processSuite = (suite: Record<string, unknown>) => {
    tests += parseInt(attrStr(suite["@_tests"]) || "0", 10);
    failures += parseInt(attrStr(suite["@_failures"]) || "0", 10);
    errors += parseInt(attrStr(suite["@_errors"]) || "0", 10);
    skipped += parseInt(attrStr(suite["@_skipped"]) || "0", 10);
    duration += parseFloat(attrStr(suite["@_time"]) || "0");

    // ── Walk every <testcase> inside this suite ───────────────────────────
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

      // Extract the failure/error message text.
      // fast-xml-parser may give us:
      //   - a string (text-only element)
      //   - an object with a "#text" key (mixed content)
      //   - an array of any of the above (multiple <failure> children)
      let rawMessage = "";
      const firstNode = Array.isArray(problemNode)
        ? (problemNode as unknown[])[0]
        : problemNode;

      if (typeof firstNode === "string") {
        rawMessage = firstNode;
      } else if (firstNode && typeof firstNode === "object") {
        const nodeObj = firstNode as Record<string, unknown>;
        // Prefer the @_message attribute (short summary) if present.
        const msgAttr = attrStr(nodeObj["@_message"]);
        const bodyText = attrStr(nodeObj["#text"]);
        rawMessage = msgAttr || bodyText;
      }

      // Keep only the first 500 chars — enough context, not too much noise.
      const failureMessage = truncate(rawMessage, 500);

      const durationSec = parseFloat(attrStr(tcObj["@_time"]) || "0");

      failedTests.push({
        name: truncate(attrStr(tcObj["@_name"]), 200),
        classname: truncate(attrStr(tcObj["@_classname"]), 200),
        failureMessage,
        durationSec: Math.round(durationSec * 1000) / 1000,
        kind,
      });
    }
  };

  if (root?.["testsuite"]) {
    // <testsuites> wrapper with multiple <testsuite> children.
    const inner = root["testsuite"];
    if (Array.isArray(inner)) {
      inner.forEach(processSuite);
    } else {
      processSuite(inner as Record<string, unknown>);
    }
  } else if (root) {
    // Single <testsuite> at root.
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

// 1. Read and parse results.xml
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
const userRole = env("USER_ROLE", "unknown"); // admin-user | general-user

const newRun: TestRun = {
  runNumber,
  runId: env("GITHUB_RUN_ID"),
  date: new Date().toISOString(),
  branch,
  commitSha: env("GITHUB_SHA").slice(0, 7),
  env: env("ENV", "qa"),
  userRole,
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
  failedTests, // ← per-test failure details
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
  `[update-test-history] ✅ Appended run #${runNumber} → branch="${branch}" testType="${testType}" userRole="${userRole}"`,
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
  `[update-test-history]    History now has ${runCount} run(s) for branch="${branch}" / testType="${testType}"`,
);
logger.info(`[update-test-history]    Saved to ${HISTORY_FILE}`);
