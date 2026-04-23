import { defineConfig, devices } from "@playwright/test";
import { TIMEOUTS } from "./src/configuration/playwright/timeouts/timeout.config.js";
import EnvironmentDetector from "./src/configuration/system/environment/detector/environmentDetector.js";
import { shouldSkipBrowserInit } from "./src/configuration/playwright/flags/browser.flags.js";
import WorkerAllocator from "./src/configuration/playwright/workerAllocator/workerAllocator.js";
import { resolveCleanupDependency } from "./src/configuration/playwright/projectRole/projectRole.map.js";
import {
  resolveSetupProject,
  resolveUserRole,
} from "./src/configuration/playwright/projectRole/projectRole.config.js";

// check if running in CI
const isCI = EnvironmentDetector.isCI();

// check if browser init should be skipped
const skipAuthSetup = shouldSkipBrowserInit();

// resolve user role
const role = resolveUserRole();

// resolve cleanup role
const setupRole = resolveCleanupDependency();

// Determine shard index for parallel execution in CI
const shardIndex = process.env.SHARD_INDEX || "0";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  timeout: TIMEOUTS.test,
  expect: {
    timeout: TIMEOUTS.expect,
  },
  testDir: "./tests",
  globalSetup: "./src/configuration/system/environment/global/globalSetup.ts",
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: WorkerAllocator.getOptimalWorkerCount("10-percent"),
  reporter: isCI
    ? [["blob", { outputDir: `blob-report-${shardIndex}`, alwaysReport: true }]]
    : [["html"], ["line"]],

  /**
   * The `grep` option enables running tests by tag or keyword.
   * You can set the `TEST_TAGS` environment variable (e.g., `@regression`, `@sanity`) to filter which tests run.
   */
  grep:
    typeof process.env.TEST_TAGS === "string"
      ? new RegExp(`(^|\\s)${process.env.TEST_TAGS}(\\s|$)`)
      : process.env.TEST_TAGS || /.*/,

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /**
     * Test artifacts & browser mode.
     * - In CI: optimize for performance and smaller artifacts.
     * - In local dev: maximize visibility for debugging.
     */
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "on",
    headless: isCI ? true : false,

    /**
     * Browser launch options:
     * - In Jenkins CI with GPU-enabled workers, enable GPU acceleration.
     * - Locally, you can leave it default for simplicity.
     */
    launchOptions: {
      args: isCI
        ? [
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--enable-features=VaapiVideoDecoder",
            "--enable-gpu-rasterization",
            "--enable-zero-copy",
            "--ignore-gpu-blocklist",
            "--use-gl=egl",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding",
            "--disable-extensions",
            "--disable-plugins",
            "--no-first-run",
            "--disable-default-apps",
            "--disable-translate",
          ]
        : [],
    },
  },

  projects: [
    /**
     * Playwright Project Configuration
     *
     * This framework uses a staged, dependency-driven execution model to ensure
     * reliable, isolated, and role-based test execution.
     *
     * Execution Flow:
     * 1. Setup Projects (Authentication Initialization)
     *    - setup-admin-user  (only registered when USER_ROLE=admin-user)
     *    - setup-general-user (only registered when USER_ROLE=general-user)
     *    Only the setup project matching the current USER_ROLE is registered,
     *    ensuring both never run simultaneously.
     *    They only run when `skipAuthSetup` is false.
     *
     * 2. Data Cleanup Project
     *    - data-cleanup
     *    Executes pre-test cleanup scripts to remove test data and ensure a clean environment.
     *    This project depends on the appropriate setup project (resolved dynamically via `setupRole`),
     *    ensuring authentication is established before cleanup runs.
     *
     * 3. Role-Based Test Execution
     *    - admin-user
     *    - general-user
     *    These projects execute the actual test suites using pre-authenticated session states.
     *    They depend on the `data-cleanup` project to guarantee a consistent test environment.
     *
     * Key Features:
     * - Dynamic dependency resolution using environment variables (e.g., USER_ROLE).
     * - Conditional setup execution via `skipAuthSetup` (useful for CI optimizations).
     * - Only the setup project matching USER_ROLE is registered — never both simultaneously.
     * - Clear separation of concerns: authentication, environment preparation, and test execution.
     *
     * This structure improves test stability, reduces flaky tests, and ensures
     * consistent execution across QA, UAT, and CI/CD pipelines.
     */
    ...(!skipAuthSetup
      ? [
          ...(resolveSetupProject(role) === "setup-admin-user"
            ? [
                {
                  name: "setup-admin-user",
                  use: { ...devices["Desktop Chrome"] },
                  testMatch: /.*\.admin-user\.setup\.ts/,
                },
              ]
            : []),
          ...(resolveSetupProject(role) === "setup-general-user"
            ? [
                {
                  name: "setup-general-user",
                  use: { ...devices["Desktop Chrome"] },
                  testMatch: /.*\.general-user\.setup\.ts/,
                },
              ]
            : []),
        ]
      : []),
    {
      name: "data-cleanup",
      testMatch: /.*\.data-cleanup\.spec\.ts/,
      dependencies: skipAuthSetup ? [] : [setupRole],
    },
    {
      name: "admin-user",
      dependencies: skipAuthSetup ? [] : ["data-cleanup"],
    },
    {
      name: "general-user",
      dependencies: skipAuthSetup ? [] : ["data-cleanup"],
    },
  ],
});
