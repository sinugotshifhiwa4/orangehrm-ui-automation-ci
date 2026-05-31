/**
 * types.ts
 * Shared TypeScript interfaces for the update-test-history pipeline.
 *
 * ── History shape (3-tier) ────────────────────────────────────────────────────
 *
 *  {
 *    meta:     FileMeta          — tiny top-level stats, always loaded
 *    index:    RunSummary[]      — lightweight rows (no failedTests), newest-first
 *    byBranch: Record<branch, BranchHistory>  — full detail, scoped per bucket
 *  }
 */

// ─── Domain types ─────────────────────────────────────────────────────────────

/** Stored inside each TestRun — full detail, available for recent runs only. */
export interface FailedTest {
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
export interface TestRun {
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

/** TIER 2 — lightweight summary row, omits failedTests detail. */
export type RunSummary = Omit<TestRun, "failedTests" | "failedTestsStripped">;

export interface TestTypeHistory {
  testType: string;
  runs: TestRun[];
}

export interface BranchHistory {
  byTestType: Record<string, TestTypeHistory>;
}

/** TIER 1 — top-level file metadata. */
export interface FileMeta {
  lastUpdated: string;
  totalRunsEver: number;
  indexSize: number;
}

export interface HistoryFile {
  meta: FileMeta;
  index: RunSummary[];
  byBranch: Record<string, BranchHistory>;
}

// ─── Playwright JSON report types ─────────────────────────────────────────────

export interface PlaywrightJsonStats {
  expected: number;
  unexpected: number;
  skipped: number;
  flaky: number;
  duration: number;
}

export interface PlaywrightJsonTest {
  title: string;
  /** "expected" | "unexpected" | "skipped" | "flaky" */
  status: string;
  duration: number;
}

export interface PlaywrightJsonSpec {
  title: string;
  /** Relative file path e.g. "layers/ui/login/InvalidLogin.spec.ts" */
  file: string;
  ok: boolean;
  tests: PlaywrightJsonTest[];
}

export interface PlaywrightJsonSuite {
  title: string;
  file?: string;
  specs: PlaywrightJsonSpec[];
  suites?: PlaywrightJsonSuite[];
}

export interface PlaywrightJsonReport {
  stats: PlaywrightJsonStats;
  suites: PlaywrightJsonSuite[];
}

/** Normalised result returned by parsePlaywrightJson(). */
export interface ParseResult {
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  durationMs: number;
  failedTests: FailedTest[];
}
