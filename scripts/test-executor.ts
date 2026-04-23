import { execSync } from "child_process";
import { resolveUserRole } from "../src/configuration/playwright/projectRole/projectRole.config.js";
import logger from "../src/configuration/system/logger/loggerManager.js";

// ENV CONFIG
const role = resolveUserRole();
const layer = process.env.TEST_LAYER || "ui";
const shardIndex = process.env.SHARD_INDEX;
const shardTotal = process.env.SHARD_TOTAL;
const grep = process.env.TEST_TAGS;
const isCI = process.env.CI === "true" || process.env.CI === "1";

const extraArgs = process.argv.slice(2).join(" ");

/**
 * @constant NON_BROWSER_LAYERS
 * @description Layers that never require a browser session or stored auth state.
 *
 * @constant skipAuthSetup
 * @description Controls whether browser initialisation and auth setup are skipped.
 *
 * Resolution order:
 * 1. `SKIP_BROWSER_INIT` env var — explicit override always wins (any layer)
 * 2. Layer default:
 *    - `api` / `db` → `"true"`  (no browser needed)
 *    - `ui`         → `"false"` (uses stored auth state)
 *
 * @example Override for a tagged UI run that bypasses auth:
 *   SKIP_BROWSER_INIT=true TEST_TAGS=@skip-auth npm run test:ui
 */
const NON_BROWSER_LAYERS = new Set(["api", "db"]);
const skipAuthSetup: string = (() => {
  if (process.env.SKIP_BROWSER_INIT !== undefined) {
    return process.env.SKIP_BROWSER_INIT;
  }
  return NON_BROWSER_LAYERS.has(layer) ? "true" : "false";
})();

// LAYER PATHS
const layerPaths: Record<string, string> = {
  ui: "tests/layers/ui",
  api: "tests/layers/api",
  db: "tests/layers/db",
  all: "",
};

const path = layerPaths[layer];

// VALIDATION
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

// EXECUTE
execSync(command, {
  stdio: "inherit",
  env: {
    ...process.env,
    USER_ROLE: role,
    TEST_LAYER: layer,
    SKIP_BROWSER_INIT: skipAuthSetup,
  },
});
