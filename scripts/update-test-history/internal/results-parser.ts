/**
 * results-parser.ts
 * Reads and parses the merged Playwright `results.json` report.
 *
 *   new ResultsParser(jsonPath).parse() → ParseResult
 */

import fs from "fs";

import { MAX_FAILED_TESTS_STORED } from "./constants.js";
import { logger } from "./logger.js";
import { truncate } from "./helpers.js";
import type {
  FailedTest,
  ParseResult,
  PlaywrightJsonReport,
  PlaywrightJsonSuite,
} from "./types.js";

export class ResultsParser {
  constructor(private readonly jsonPath: string) {}

  /**
   * Parses the Playwright JSON report and returns normalised stats.
   *
   * @throws If the file cannot be read or parsed.
   */
  parse(): ParseResult {
    logger.info(
      `[update-test-history] Parsing Playwright JSON report: ${this.jsonPath}`,
    );

    const raw = fs.readFileSync(this.jsonPath, "utf-8");
    const report = JSON.parse(raw) as PlaywrightJsonReport;
    const { stats, suites } = report;

    logger.info(
      `[update-test-history] Stats — expected=${stats.expected} unexpected=${stats.unexpected} skipped=${stats.skipped} flaky=${stats.flaky} duration=${stats.duration}ms`,
    );

    const failedTests: FailedTest[] = [];
    this.collectFailedSpecs(suites, failedTests);

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

  /**
   * Recursively walks the suite tree to collect all failed specs.
   * Playwright nests suites as: file suite → describe suite → specs.
   */
  private collectFailedSpecs(
    suites: PlaywrightJsonSuite[],
    failedTests: FailedTest[],
  ): void {
    for (const suite of suites) {
      // Recurse into nested describe blocks first
      if (suite.suites && suite.suites.length > 0) {
        this.collectFailedSpecs(suite.suites, failedTests);
      }

      for (const spec of suite.specs) {
        if (spec.ok) continue;
        if (failedTests.length >= MAX_FAILED_TESTS_STORED) return;

        // A spec can have multiple test entries (retries).
        // Determine kind from the first non-passing test result.
        const failingTest = spec.tests.find((t) => t.status === "unexpected");
        const kind: "failure" | "error" = failingTest ? "failure" : "error";

        // Setup-project failures can report tests with an undefined `duration`,
        // which would propagate NaN here and become `null` in JSON. Coerce to 0.
        const totalMs = spec.tests.reduce(
          (sum, t) => sum + (Number.isFinite(t.duration) ? t.duration : 0),
          0,
        );
        const durationSec = Math.round(totalMs) / 1000;

        failedTests.push({
          name: truncate(spec.title, 200),
          classname: truncate(spec.file, 200),
          durationSec,
          kind,
        });
      }
    }
  }
}
