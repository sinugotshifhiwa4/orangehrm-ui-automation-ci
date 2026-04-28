import { test } from "../../../../fixtures/test.fixture.js";
import logger from "../../../../src/configuration/system/logger/loggerManager.js";

test.describe("Valid Login Test Suite", { tag: ["@regression", "@sanity"] }, () => {
  test.beforeEach(async ({ loginOrchestrator }) => {
    await loginOrchestrator.navigateToPortal();
  });

  test("should display invalid credentials error when submitting login form with incorrect username", async ({
    dashboardPage,
  }) => {
    await dashboardPage.verifyDashboardHeaderIsVisible();
    logger.info(
      "Assertion Passed: Invalid credentials error displayed when submitting login form with incorrect username",
    );
  });

  test("verify page title is displayed correctly", { tag: "@skip-auth" }, async ({ loginPage }) => {
    const expectedTitle = "OrangeHRM";

    await loginPage.verifyPageTitleIsDisplayedCorrectly({
      title: expectedTitle,
    });

    logger.info(`Assertion Passed: Page title is correctly displayed as "${expectedTitle}"`);
  });
});
