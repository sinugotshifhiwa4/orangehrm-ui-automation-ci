import { test } from "../../../../fixtures/test.fixture.js";
import { getAuthRoleByProject } from "../../../../src/configuration/playwright/projectRole/projectRoleResolver.js";
import logger from "../../../../src/configuration/system/logger/loggerManager.js";

test.describe("Invalid Login Test Suite", { tag: ["@skip-auth", "@regression"] }, () => {
  test.beforeEach(async ({ loginOrchestrator }) => {
    await loginOrchestrator.navigateToPortal();
  });

  test("should display required field errors when submitting login form without credentials", async ({
    loginPage,
  }) => {
    await loginPage.fillLoginFields({ username: "", password: "" }, { allowEmpty: true });
    await loginPage.clickLoginButton();
    await loginPage.verifyRequiredFieldErrorsAreVisible();

    logger.info(
      "Assertion Passed: Required field errors displayed when submitting login form without credentials",
    );
  });

  test("should display invalid credentials error when submitting login form with incorrect username and password", async ({
    loginPage,
  }) => {
    const invalidUsername = "invalidAdminUser";
    const invalidPassword = "invalidAdminPass";

    await loginPage.login({ username: invalidUsername, password: invalidPassword });
    await loginPage.verifyInvalidCredentialsErrorIsVisible();
    logger.info(
      "Assertion Passed: Invalid credentials error displayed when submitting login form with incorrect username and password",
    );
  });

  test("should display invalid credentials error when submitting login form with incorrect username", async ({
    environmentResolver,
    loginPage,
    testInfo,
  }) => {
    const invalidUsername = "invalidAdminUser";
    const { password } = environmentResolver.getPortalCredentials(getAuthRoleByProject(testInfo));

    await loginPage.login({ username: invalidUsername, password: password });
    await loginPage.verifyInvalidCredentialsErrorIsVisible();
    logger.info(
      "Assertion Passed: Invalid credentials error displayed when submitting login form with incorrect username",
    );
  });

  test("should display invalid credentials error when submitting login form with incorrect password", async ({
    environmentResolver,
    loginPage,
    testInfo,
  }) => {
    const { username } = environmentResolver.getPortalCredentials(getAuthRoleByProject(testInfo));
    const invalidPassword = "invalidAdminPass";

    await loginPage.login({ username: username, password: invalidPassword });
    await loginPage.verifyInvalidCredentialsErrorIsVisible();
    logger.info(
      "Assertion Passed: Invalid credentials error displayed when submitting login form with incorrect password",
    );
  });
});
