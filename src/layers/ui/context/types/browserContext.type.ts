import type { BrowserContext, Page } from "@playwright/test";

/**
 * Represents a Playwright browser context with an associated page.
 */
export interface BrowserContextWithPage {
  context: BrowserContext;
  page: Page;
}
