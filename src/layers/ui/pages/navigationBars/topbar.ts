import type { Locator, Page } from "@playwright/test";
import { BasePage } from "../../base/basePage.js";
import type { DashboardPage } from "../menuItems/dashboardPage.js";

export class TopBar extends BasePage {
  private dashboardPage: DashboardPage;

  private readonly upgradeButton: Locator;
  private readonly userDropdownSelector: Locator;

  /**
   * Creates the top bar page object and wires in dashboard validation dependencies.
   * @param page - Active Playwright page instance.
   * @param dashboardPage - Dashboard page object used to validate successful landing state.
   */
  constructor(page: Page, dashboardPage: DashboardPage) {
    super(page);

    this.dashboardPage = dashboardPage;

    this.upgradeButton = page.getByRole("button", { name: "Upgrade" });
    this.userDropdownSelector = page
      .getByRole("banner")
      .getByRole("img", { name: "profile picture" });
  }

  /**
   * Verifies that the top bar is fully visible after login.
   * @returns A promise that resolves when all top bar visibility checks pass.
   */
  public async verifyTopBarIsVisible(): Promise<void> {
    await Promise.all([
      this.dashboardPage.verifyDashboardHeaderIsVisible(),
      this.verifyUpgradeButtonIsVisible(),
      this.verifyUserDropdownSelectorIsVisible(),
    ]);
  }

  /**
   * Verifies that the Upgrade button is visible in the top bar.
   * @returns A promise that resolves when the button visibility check passes.
   */
  private async verifyUpgradeButtonIsVisible(): Promise<void> {
    await this.elementAssertions.verifyElementState(
      this.upgradeButton,
      "verifyUpgradeButtonIsVisible",
      "visible",
      "Upgrade button",
    );
  }

  /**
   * Verifies that the user profile dropdown trigger is visible in the top bar.
   * @returns A promise that resolves when the dropdown trigger visibility check passes.
   */
  private async verifyUserDropdownSelectorIsVisible(): Promise<void> {
    await this.elementAssertions.verifyElementState(
      this.userDropdownSelector,
      "verifyUserDropdownSelectorIsVisible",
      "visible",
      "User dropdown selector",
    );
  }
}
