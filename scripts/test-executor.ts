import { execSync } from "child_process";
import { resolveUserRole } from "../src/configuration/playwright/projectRole/projectRole.config.js";
import logger from "../src/configuration/system/logger/loggerManager.js";

// ==============================
// ENV CONFIG
// ==============================
const role = resolveUserRole();
const layer = process.env.TEST_LAYER || "ui";
const shardIndex = process.env.SHARD_INDEX;
const shardTotal = process.env.SHARD_TOTAL;
const grep = process.env.TEST_TAGS;
const isCI = process.env.CI === "true" || process.env.CI === "1";

const extraArgs = process.argv.slice(2).join(" ");

// ==============================
// LAYER CONFIG
// ==============================
const NON_BROWSER_LAYERS = new Set(["api", "db"]);

/**
 * Resolve whether browser init should be skipped.
 *
 * Priority:
 * 1. Explicit env override (SKIP_BROWSER_INIT)
 * 2. Layer-based default
 */
const skipAuthSetup: boolean = (() => {
  const override = process.env.SKIP_BROWSER_INIT;

  if (override !== undefined) {
    return override === "true";
  }

  return NON_BROWSER_LAYERS.has(layer);
})();

// ==============================
// LAYER PATHS
// ==============================
const layerPaths: Record<string, string> = {
  ui: "tests/layers/ui",
  api: "tests/layers/api",
  db: "tests/layers/db",
  all: "",
};

const path = layerPaths[layer];

// ==============================
// VALIDATION
// ==============================
if (path === undefined) {
  logger.error(
    `Unknown layer: "${layer}". Available: ${Object.keys(layerPaths).join(", ")}`,
  );
  process.exit(1);
}

// ==============================
// LOG CONFIG
// ==============================
logger.info("======================================");
logger.info("Playwright Test Runner");
logger.info(`Layer       : ${layer}`);
logger.info(`Role        : ${role}`);
logger.info(`CI          : ${isCI}`);
logger.info(`Shard       : ${shardIndex || "-"} / ${shardTotal || "-"}`);
logger.info(`Grep        : ${grep || "-"}`);
logger.info(`Extra Args  : ${extraArgs || "-"}`);
logger.info(`Skip Browser: ${skipAuthSetup}`);
logger.info("======================================");

// ==============================
// BUILD COMMAND
// ==============================
const projectArg = layer === "ui" ? `--project=${role}` : "";

let shardArg = "";
if (shardIndex && shardTotal) {
  shardArg = `--shard=${shardIndex}/${shardTotal}`;
}

let grepArg = "";
if (grep) {
  grepArg = `--grep="${grep}"`;
}

const command = [
  "npx playwright test",
  path,
  projectArg,
  shardArg,
  grepArg,
  extraArgs,
]
  .filter(Boolean)
  .join(" ");

logger.info(`Executing: ${command}`);

// ==============================
// EXECUTE
// ==============================
execSync(command, {
  stdio: "inherit",
  env: {
    ...process.env,
    USER_ROLE: role,
    TEST_LAYER: layer,
    SKIP_BROWSER_INIT: String(skipAuthSetup),
  },
});
