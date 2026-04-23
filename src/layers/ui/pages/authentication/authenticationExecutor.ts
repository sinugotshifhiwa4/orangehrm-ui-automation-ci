import type { Page } from "@playwright/test";
import { BasePage } from "../../base/basePage.js";
import type { EnvironmentResolver } from "../../../../configuration/system/environment/resolver/environmentResolver.js";
import type { LoginOrchestrator } from "./loginOrchestrator.js";
import type { LoginPage } from "../login/loginPage.js";
import type { TopBar } from "../navigationBars/topbar.js";
import type { AuthRole } from "../../../../configuration/playwright/authentication/storage/constants/authentication.constants.js";
import ErrorHandler from "../../../../utils/errorHandling/errorHandler.js";
import logger from "../../../../configuration/system/logger/loggerManager.js";

export class AuthenticationExecutor extends BasePage {
  private environmentResolver: EnvironmentResolver;
  private loginOrchestrator: LoginOrchestrator;
  private loginPage: LoginPage;
  private topBar: TopBar;

  /**
   * Creates an authentication executor that coordinates login dependencies for a page session.
   * @param page - Active Playwright page instance.
   * @param environmentResolver - Resolver used to fetch environment-specific credentials.
   * @param loginOrchestrator - Orchestrator responsible for navigation and state persistence.
   * @param loginPage - Login page object used to perform the sign-in flow.
   * @param topBar - Top bar page object used to validate successful login.
   */
  constructor(
    page: Page,
    environmentResolver: EnvironmentResolver,
    loginOrchestrator: LoginOrchestrator,
    loginPage: LoginPage,
    topBar: TopBar,
  ) {
    super(page);
    this.environmentResolver = environmentResolver;
    this.loginOrchestrator = loginOrchestrator;
    this.loginPage = loginPage;
    this.topBar = topBar;
  }

  /**
   * Logs into the portal using the provided AuthRole.
   * This function retrieves the username and password for the given role, and then logs into the portal.
   * If the login attempt is successful, an authentication session state is created for the given role.
   * @param role - The AuthRole to log into the portal with.
   * @returns A promise that resolves when the login attempt has been validated, or throws an error if the login attempt fails.
   */
  public async run(role: AuthRole): Promise<void> {
    try {
      const { username, password } =
        this.environmentResolver.getPortalCredentials(role);

      await this.loginOrchestrator.loginWithValidCredentials(
        async () =>
          await this.loginPage.login({
            username: username,
            password: password,
          }),
        async () => {
          await this.loginPage.verifyInvalidCredentialsErrorIsHidden();
          await this.topBar.verifyTopBarIsVisible();
        },
        role,
      );

      logger.info(`Authentication session state created for role: ${role}`);
    } catch (error) {
      ErrorHandler.captureError(error, "run", "Failed to log into portal");
      throw error;
    }
  }
}
