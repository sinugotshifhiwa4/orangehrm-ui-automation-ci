import TimeoutManager from "../../system/timeoutManager/timeoutManager.js";

export const TIMEOUTS = {
  test: TimeoutManager.timeout({ timeoutInMs: 65_000 }),
  expect: TimeoutManager.timeout({ timeoutInMs: 45_000 }),

  api: {
    standard: TimeoutManager.timeout({ timeoutInMs: 10_000 }),
    upload: TimeoutManager.timeout({ timeoutInMs: 60_000 }),
    download: TimeoutManager.timeout({ timeoutInMs: 90_000 }),
    healthCheck: TimeoutManager.timeout({ timeoutInMs: 3_000 }),
    connection: TimeoutManager.timeout({ timeoutInMs: 8_000 }),
  },

  db: {
    query: TimeoutManager.timeout({ timeoutInMs: 15_000 }),
    transaction: TimeoutManager.timeout({ timeoutInMs: 30_000 }),
    migration: TimeoutManager.timeout({ timeoutInMs: 120_000 }),
    connection: TimeoutManager.timeout({ timeoutInMs: 10_000 }),
    request: TimeoutManager.timeout({ timeoutInMs: 10_000 }),
    poolAcquisition: TimeoutManager.timeout({ timeoutInMs: 10_000 }),
    idle: TimeoutManager.timeout({ timeoutInMs: 10_000 }),
  },
} as const;

export const {
  test: TEST_TIMEOUT,
  expect: EXPECT_TIMEOUT,
  api: API_TIMEOUT,
  db: DB_TIMEOUT,
} = TIMEOUTS;
