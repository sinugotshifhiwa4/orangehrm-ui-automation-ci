import type { Browser, BrowserContext, Page } from "@playwright/test";
import type { BrowserContextWithPage } from "./types/browserContext.type.js";

export class BrowserContextManager {
  private readonly browser: Browser;

  /**
   * Creates a manager for creating and controlling isolated browser contexts.
   * @param browser - The Playwright browser instance used to create contexts.
   */
  constructor(browser: Browser) {
    this.browser = browser;
  }

  /**
   * Creates a new browser context with default settings, and a new page within that context.
   * The resulting context and page are isolated from any other contexts and pages.
   * This is useful for testing scenarios where you want to start with a clean slate.
   * @returns A promise that resolves to an object containing the new context and page.
   */
  public async createDefaultContext(): Promise<BrowserContextWithPage> {
    const context = await this.browser.newContext();
    const page = await context.newPage();
    return { context, page };
  }

  /**
   * Creates a new browser context with storage state undefined, and a new page within that context.
   * The resulting context and page are isolated from any other contexts and pages.
   * This is useful for testing scenarios where you want to start with a clean slate.
   * @returns A promise that resolves to an object containing the new context and page.
   */
  public async createIsolatedContext(): Promise<BrowserContextWithPage> {
    const context = await this.browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    return { context, page };
  }

  /**
   * Closes a browser context if it is not null.
   * This method is idempotent and will not throw an error if the context is already closed.
   * @param context - The browser context to close.
   * @returns A promise that resolves when the browser context is closed.
   */
  public async close(context: BrowserContext): Promise<void> {
    if (context) {
      await context.close();
    }
  }

  /**
   * Simulates a click action on a page and waits for a new page to load before returning it.
   * @param page - The page to click on.
   * @param clickFn - A function that performs the click action.
   * @returns The new page created after the click action.
   */
  public async clickAndWaitForNewPage(
    page: Page,
    clickFn: () => Promise<void>,
  ): Promise<Page> {
    const [newPage] = await Promise.all([
      page.context().waitForEvent("page"),
      clickFn(),
    ]);
    await newPage.waitForLoadState();
    return newPage;
  }
}
