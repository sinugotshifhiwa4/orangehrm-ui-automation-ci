import { type Locator, type Page, expect } from "@playwright/test";
import { BasePage } from "../../base/basePage.js";
import CredentialValidator from "../../../../utils/shared/credentialValidator.js";
import type { Credentials } from "../../../../configuration/playwright/authentication/types/credentials.types.js";
import type { PageTitleOptions } from "./types/login.type.js";
import ErrorHandler from "../../../../utils/errorHandling/errorHandler.js";
import logger from "../../../../configuration/system/logger/loggerManager.js";

export class LoginPage extends BasePage {
  private readonly companyLogo: Locator;
  private readonly loginTitle: Locator;
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly invalidCredentialsError: Locator;
  private readonly usernameRequiredError: Locator;
  private readonly passwordRequiredError: Locator;

  /**
   * Creates the login page object and resolves its key UI locators.
   * @param page - Active Playwright page instance.
   */
  constructor(page: Page) {
    super(page);
    this.companyLogo = page.getByRole("img", { name: "company-branding" });
    this.loginTitle = page.getByRole("heading", { name: "Login" });
    this.usernameInput = page.getByRole("textbox", { name: "Username" });
    this.passwordInput = page.getByRole("textbox", { name: "Password" });
    this.loginButton = page.getByRole("button", { name: "Login" });
    this.invalidCredentialsError = page
      .getByRole("alert")
      .getByText("Invalid credentials");
    this.usernameRequiredError = page.locator(
      '.oxd-input-group:has(input[name="username"]) .oxd-input-field-error-message',
    );

    this.passwordRequiredError = page.locator(
      '.oxd-input-group:has(input[name="password"]) .oxd-input-field-error-message',
    );
  }

  /**
   * Verifies that the OrangeHRM company logo is visible on the login page.
   * @returns A promise that resolves when the logo visibility check passes.
   */
  public async verifyCompanyLogoIsVisible(): Promise<void> {
    await this.elementAssertions.verifyElementState(
      this.companyLogo,
      "verifyCompanyLogoIsVisible",
      "visible",
      "company logo",
    );
  }

  /**
   * Verifies that the login page heading is visible.
   * @returns A promise that resolves when the title visibility check passes.
   */
  public async verifyLoginTitleIsVisible(): Promise<void> {
    await this.elementAssertions.verifyElementState(
      this.loginTitle,
      "verifyLoginTitleIsVisible",
      "visible",
      "login title",
    );
  }

  /**
   * Fills the username field while validating required and placeholder values.
   * @param options - Credential values that may include the username.
   * @param fillOptions - Optional behavior overrides for empty input handling.
   * @returns A promise that resolves when the username field has been filled.
   */
  private async fillUsernameInput(
    options: Credentials,
    fillOptions?: { allowEmpty?: boolean },
  ): Promise<void> {
    const { username } = options;

    if (!username && !fillOptions?.allowEmpty) {
      ErrorHandler.logAndThrow(
        "LoginPage.fillUsernameInput",
        "Username is required.",
      );
    }

    if (!fillOptions?.allowEmpty) {
      CredentialValidator.validateNotPlaceholder(
        "LoginPage.fillUsernameInput",
        "username",
        username,
      );
    }

    await this.element.fillElement(
      this.usernameInput,
      "fillUsernameInput",
      username ?? "",
      "username input",
      { allowEmpty: fillOptions?.allowEmpty },
    );
  }

  /**
   * Fills the password field while validating required and placeholder values.
   * @param options - Credential values that may include the password.
   * @param fillOptions - Optional behavior overrides for empty input handling.
   * @returns A promise that resolves when the password field has been filled.
   */
  private async fillPasswordInput(
    options: Credentials,
    fillOptions?: { allowEmpty?: boolean },
  ): Promise<void> {
    const { password } = options;

    if (!password && !fillOptions?.allowEmpty) {
      ErrorHandler.logAndThrow(
        "LoginPage.fillPasswordInput",
        "Password is required.",
      );
    }

    if (!fillOptions?.allowEmpty) {
      CredentialValidator.validateNotPlaceholder(
        "LoginPage.fillPasswordInput",
        "password",
        password,
      );
    }

    await this.element.fillElement(
      this.passwordInput,
      "fillPasswordInput",
      password ?? "",
      "password input",
      { allowEmpty: fillOptions?.allowEmpty },
    );
  }

  /**
   * Fills both login form fields after validating the page is ready.
   * @param options - Credential values to enter into the login form.
   * @param fillOptions - Optional behavior overrides for empty input handling.
   * @returns A promise that resolves when both login fields have been filled.
   */
  public async fillLoginFields(
    options: Credentials,
    fillOptions?: { allowEmpty?: boolean },
  ): Promise<void> {
    await this.verifyCompanyLogoIsVisible();
    await this.verifyLoginTitleIsVisible();
    await this.fillUsernameInput(options, fillOptions);
    await this.fillPasswordInput(options, fillOptions);
  }

  /**
   * Clicks the login button.
   * @returns A promise that resolves when the click action completes.
   */
  public async clickLoginButton(): Promise<void> {
    await this.element.clickElement(
      this.loginButton,
      "clickLoginButton",
      "login button",
    );
  }

  /**
   * Fills the login form and submits it.
   * @param options - Credential values to use for the login attempt.
   * @returns A promise that resolves when the form has been submitted.
   */
  public async login(options: Credentials): Promise<void> {
    await this.fillLoginFields(options);
    await this.clickLoginButton();
  }

  /**
   * Verifies that the invalid-credentials alert is visible.
   * @returns A promise that resolves when the alert visibility check passes.
   */
  public async verifyInvalidCredentialsErrorIsVisible(): Promise<void> {
    await this.elementAssertions.verifyElementState(
      this.invalidCredentialsError,
      "verifyInvalidCredentialsErrorIsVisible",
      "visible",
      "invalid credentials error",
    );
  }

  /**
   * Verifies that the invalid-credentials alert is hidden.
   * @returns A promise that resolves when the alert hidden-state check passes.
   */
  public async verifyInvalidCredentialsErrorIsHidden(): Promise<void> {
    await this.elementAssertions.verifyElementState(
      this.invalidCredentialsError,
      "verifyInvalidCredentialsErrorIsHidden",
      "hidden",
      "invalid credentials error",
    );
  }

  /**
   * Verifies that both required-field validation messages are visible.
   * @returns A promise that resolves when both field-error checks pass.
   */
  public async verifyRequiredFieldErrorsAreVisible(): Promise<void> {
    await Promise.all([
      this.verifyUsernameRequiredErrorIsVisible(),
      this.verifyPasswordRequiredErrorIsVisible(),
    ]);
  }

  /**
   * Verifies that the username required-field message is visible.
   * @returns A promise that resolves when the username error is visible.
   */
  private async verifyUsernameRequiredErrorIsVisible(): Promise<void> {
    await this.elementAssertions.verifyElementState(
      this.usernameRequiredError,
      "verifyUsernameRequiredErrorIsVisible",
      "visible",
      "username required error",
    );
  }

  /**
   * Verifies that the password required-field message is visible.
   * @returns A promise that resolves when the password error is visible.
   */
  private async verifyPasswordRequiredErrorIsVisible(): Promise<void> {
    await this.elementAssertions.verifyElementState(
      this.passwordRequiredError,
      "verifyPasswordRequiredErrorIsVisible",
      "visible",
      "password required error",
    );
  }

  /**
   * Verifies that the browser page title matches the expected login-page title.
   * @param options - Options containing the expected page title.
   * @returns A promise that resolves when the title assertion passes.
   */
  public async verifyPageTitleIsDisplayedCorrectly(
    options: PageTitleOptions,
  ): Promise<void> {
    const actualPageTitle = await this.navigation.getPageTitle(
      "verifyPageTitleIsDisplayedCorrectly",
    );

    expect(actualPageTitle).toBe(options.title);

    logger.info(
      `Verified: Page title '${actualPageTitle}' matches expected '${options.title}'`,
    );
  }
}
