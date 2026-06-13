/**
 * index.ts  (scripts/update-test-history/index.ts)
 *
 * Entry point for the update-test-history pipeline. All work lives in the
 * TestHistoryUpdater class and its internal/ collaborators.
 *
 * ── Usage ──────────────────────────────────────────────────────────────────
 *
 *   npx tsx scripts/update-test-history/index.ts
 */

import { TestHistoryUpdater } from "./test-history-updater.js";

new TestHistoryUpdater().run();
