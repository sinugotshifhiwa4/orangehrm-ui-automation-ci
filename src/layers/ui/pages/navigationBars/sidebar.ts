import type { Page } from "@playwright/test";
import { BasePage } from "../../base/basePage.js";

export class SideBar extends BasePage {
  /**
   * Creates the sidebar page object.
   * @param page - Active Playwright page instance.
   */
  constructor(page: Page) {
    super(page);
  }
}
