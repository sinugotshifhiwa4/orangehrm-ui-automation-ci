import { type Locator, type Page, expect } from "@playwright/test";
import { BasePage } from "../../base/basePage.js";
import type { DefaultPageOptions } from "./types/dashboard.type.js";
import logger from "../../../../configuration/system/logger/loggerManager.js";

export class DashboardPage extends BasePage {
  private readonly dashboardHeader: Locator;
  private readonly dashboardMenuItemLink: Locator;

  /**
   * Creates the dashboard page object and resolves the primary dashboard header locator.
   * @param page - Active Playwright page instance.
   */
  constructor(page: Page) {
    super(page);

    this.dashboardHeader = page.getByRole("heading", { name: "Dashboard" });
    this.dashboardMenuItemLink = page.locator(
      'a.oxd-main-menu-item[href$="/dashboard/index"]',
    );
  }

  /**
   * Verifies that the dashboard header is visible.
   * @returns A promise that resolves when the visibility check passes.
   */
  public async verifyDashboardHeaderIsVisible(): Promise<void> {
    await this.elementAssertions.verifyElementState(
      this.dashboardHeader,
      "verifyDashboardHeaderIsVisible",
      "visible",
      "Dashboard header",
    );
  }

  /**
   * Verifies that the dashboard is the default landing page by checking the URL
   * and confirming that the dashboard menu item is marked as active.
   * @param options - Options containing the expected dashboard URL and active class name.
   * @returns A promise that resolves when the dashboard default-page assertions pass.
   */
  public async verifyDashboardIsDefaultPage(
    options: DefaultPageOptions,
  ): Promise<void> {
    const { expectedUrl, classAttribute } = options;

    await expect(this.page).toHaveURL(expectedUrl);

    const isDashboardActive = await this.element.hasClass(
      this.dashboardMenuItemLink,
      "verifyDashboardIsDefaultPage",
      classAttribute,
    );

    expect(isDashboardActive).toBe(true);

    logger.info(
      `Verified: Dashboard is the default page with URL: ${expectedUrl}`,
    );
  }
}
