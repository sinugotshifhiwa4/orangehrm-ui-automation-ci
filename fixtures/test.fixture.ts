import { test as baseTest, expect, type TestInfo } from "@playwright/test";

// Configuration

import AuthenticationSkipEvaluator from "../src/configuration/playwright/authentication/authSkipEvaluator.js";
import AuthenticationFileManager from "../src/configuration/playwright/authentication/storage/authenticationFileManager.js";
import { getAuthRoleByProject } from "../src/configuration/playwright/projectRole/projectRoleResolver.js";

import { EnvironmentResolver } from "../src/configuration/system/environment/resolver/environmentResolver.js";
import { AuthenticationStatePersister } from "../src/configuration/playwright/authentication/state/authenticationStatePersister.js";

// Context

import { TestContext } from "../src/layers/ui/context/testContext.js";
import { BrowserContextManager } from "../src/layers/ui/context/browserContextManager.js";

// Pages
import { LoginOrchestrator } from "../src/layers/ui/pages/authentication/loginOrchestrator.js";
import { AuthenticationExecutor } from "../src/layers/ui/pages/authentication/authenticationExecutor.js";
import { LoginPage } from "../src/layers/ui/pages/login/loginPage.js";
import { TopBar } from "../src/layers/ui/pages/navigationBars/topbar.js";
import { SideBar } from "../src/layers/ui/pages/navigationBars/sidebar.js";
import { DashboardPage } from "../src/layers/ui/pages/menuItems/dashboardPage.js";

type TestFixtures = {
  testInfo: TestInfo;

  // Configuration
  environmentResolver: EnvironmentResolver;
  authenticationStatePersister: AuthenticationStatePersister;

  testContext: TestContext;
  browserContextManager: BrowserContextManager;

  // Pages
  loginOrchestrator: LoginOrchestrator;
  authenticationExecutor: AuthenticationExecutor;
  loginPage: LoginPage;
  topBar: TopBar;
  sideBar: SideBar;
  dashboardPage: DashboardPage;
};

export const test = baseTest.extend<TestFixtures>({
  /**
   * Sets the zoom level of the page to 0.7.
   * This is required to ensure that the layout of the webpage is consistent with the expected layout.
   * @param {Page} page - The page object to add the init script to.
   * @returns {Promise<void>} - A promise that resolves when the page is loaded with the zoom level set.
   */
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        document.body.style.zoom = "0.70";
      });
    });

    await use(page);
  },

  testInfo: async ({}, use, testInfo: TestInfo) => {
    await use(testInfo);
  },

  // Configuration

  environmentResolver: async ({}, use) => {
    await use(new EnvironmentResolver());
  },

  authenticationStatePersister: async ({ page }, use) => {
    await use(new AuthenticationStatePersister(page));
  },

  testContext: async ({}, use) => {
    await use(new TestContext());
  },

  browserContextManager: async ({ browser }, use) => {
    await use(new BrowserContextManager(browser));
  },

  // Pages
  loginOrchestrator: async (
    { page, environmentResolver, authenticationStatePersister },
    use,
  ) => {
    await use(
      new LoginOrchestrator(
        page,
        environmentResolver,
        authenticationStatePersister,
      ),
    );
  },

  authenticationExecutor: async (
    { page, environmentResolver, loginOrchestrator, loginPage, topBar },
    use,
  ) => {
    await use(
      new AuthenticationExecutor(
        page,
        environmentResolver,
        loginOrchestrator,
        loginPage,
        topBar,
      ),
    );
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  topBar: async ({ page, dashboardPage }, use) => {
    await use(new TopBar(page, dashboardPage));
  },

  sideBar: async ({ page }, use) => {
    await use(new SideBar(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  /**
   * Saves the authentication state to a file for the given role.
   * The file path is determined by the AuthenticationFileManager based on the resolved role.
   *
   * @param testInfo - The test info used to resolve the role and check for skip tags
   * @returns A promise that resolves to true if the authentication state was saved successfully, or undefined if the test is tagged with @skip-auth
   * @throws If the role cannot be resolved or the authentication state cannot be saved
   */
  storageState: async ({}, use, testInfo) => {
    const shouldSkipAuth =
      AuthenticationSkipEvaluator.shouldSkipAuthenticationIfNeeded(testInfo);

    if (shouldSkipAuth) {
      await use(undefined);
      return;
    }

    const role = getAuthRoleByProject(testInfo);

    const filePath = role
      ? AuthenticationFileManager.getFilePath(role)
      : undefined;

    await use(filePath);
  },
});

export { expect };
