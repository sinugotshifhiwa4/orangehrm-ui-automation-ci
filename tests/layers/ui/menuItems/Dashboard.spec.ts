import { test } from "../../../../fixtures/test.fixture.js";
import logger from "../../../../src/configuration/system/logger/loggerManager.js";

test.describe("Dashboard Test Suite", { tag: ["@regression", "@sanity", "@dashboard"] }, () => {
  test.beforeEach(async ({ loginOrchestrator }) => {
    await loginOrchestrator.navigateToPortal();
  });

  test("should load dashboard as the default page after successful login", async ({
    dashboardPage,
  }) => {
    await dashboardPage.verifyDashboardIsDefaultPage({
      expectedUrl: /dashboard\/index/,
      classAttribute: "active",
    });

    logger.info(
      "Assertion Passed: Dashboard is loaded as the default page with correct URL and title",
    );
  });
});
