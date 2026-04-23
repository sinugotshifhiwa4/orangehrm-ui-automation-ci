import type { Page } from "@playwright/test";
import { BasePage } from "../../../../layers/ui/base/basePage.js";
import AuthenticationFileManager from "../storage/authenticationFileManager.js";
import type { AuthRole } from "../storage/constants/authentication.constants.js";
import ErrorHandler from "../../../../utils/errorHandling/errorHandler.js";
import logger from "../../../system/logger/loggerManager.js";

export class AuthenticationStatePersister extends BasePage {
  /**
   * Creates a persister bound to the current Playwright page context.
   * @param page - Active page used to capture storage state.
   */
  constructor(page: Page) {
    super(page);
  }

  /**
   * Saves the current authentication state to a file for the given role.
   * This function uses the Playwright context to save the current authentication state to a file.
   * The file path is determined by the AuthenticationFileManager, which depends on the role.
   * If the authentication state is saved successfully, the function returns true.
   * If an error occurs while saving the authentication state, an error is thrown.
   * @param role - The role to save the authentication state for.
   * @returns A promise that resolves to true if the authentication state is saved successfully, or throws an error if saving fails.
   */
  public async saveAuthenticationState(role: AuthRole): Promise<boolean> {
    try {
      const storagePath = AuthenticationFileManager.getFilePath(role);
      await this.page.context().storageState({ path: storagePath });
      logger.debug(`Authentication state saved successfully`);
      return true;
    } catch (error) {
      ErrorHandler.captureError(
        error,
        "saveAuthenticationState",
        "Failed to save authentication state",
      );
      throw error;
    }
  }
}
