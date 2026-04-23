import { type Page, type Response, expect } from "@playwright/test";
import { ActionBase } from "./actionBase.js";

export class NavigationActions extends ActionBase {
  /**
   * Creates navigation helpers for the active page.
   * @param page - Active Playwright page instance.
   */
  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigates to a specified URL.
   * @param url The URL to navigate to.
   * @param callerMethodName The name of the method that called this function.
   * @param options Optional navigation options.
   * @returns A promise that resolves with the response or null.
   */
  public async navigateToUrl(
    url: string,
    callerMethodName: string,
    options?: {
      waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
      timeout?: number;
    },
  ): Promise<Response | null> {
    return this.performAction(
      () => this.page.goto(url, options),
      callerMethodName,
      `Navigated to ${url}`,
      `Failed to navigate to ${url}`,
    );
  }

  /**
   * Reloads the current page.
   * @param callerMethodName The name of the method that called this function.
   * @param options Optional reload options.
   * @returns A promise that resolves with the response or null.
   */
  public async reloadPage(
    callerMethodName: string,
    options?: {
      waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
      timeout?: number;
    },
  ): Promise<Response | null> {
    return this.performAction(
      () => this.page.reload(options),
      callerMethodName,
      "Page reloaded successfully",
      "Failed to reload page",
    );
  }

  /**
   * Navigates back in browser history.
   * @param callerMethodName The name of the method that called this function.
   * @param options Optional navigation options.
   * @returns A promise that resolves with the response or null.
   */
  public async goBack(
    callerMethodName: string,
    options?: {
      waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
      timeout?: number;
    },
  ): Promise<Response | null> {
    return this.performAction(
      () => this.page.goBack(options),
      callerMethodName,
      "Navigated back successfully",
      "Failed to navigate back",
    );
  }

  /**
   * Navigates forward in browser history.
   * @param callerMethodName The name of the method that called this function.
   * @param options Optional navigation options.
   * @returns A promise that resolves with the response or null.
   */
  public async goForward(
    callerMethodName: string,
    options?: {
      waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
      timeout?: number;
    },
  ): Promise<Response | null> {
    return this.performAction(
      () => this.page.goForward(options),
      callerMethodName,
      "Navigated forward successfully",
      "Failed to navigate forward",
    );
  }

  /**
   * Gets the current page URL.
   * @param callerMethodName The name of the method that called this function.
   * @returns The current URL as a string.
   */
  public async getCurrentUrl(callerMethodName: string): Promise<string> {
    return this.performAction(
      () => Promise.resolve(this.page.url()),
      callerMethodName,
      "Retrieved current URL",
      "Failed to get current URL",
    );
  }

  /**
   * Gets the current page title.
   * @param callerMethodName The name of the method that called this function.
   * @returns A promise that resolves with the page title.
   */
  public async getPageTitle(callerMethodName: string): Promise<string> {
    return this.performAction(
      () => this.page.title(),
      callerMethodName,
      "Retrieved page title",
      "Failed to get page title",
    );
  }

  /**
   * Verifies that the current page URL matches the expected URL.
   * @param expectedUrl The expected URL or pattern to verify against.
   * @param callerMethodName The name of the method that called this function.
   * @param options Optional timeout configuration.
   */
  public async verifyPageUrl(
    expectedUrl: string | RegExp,
    callerMethodName: string,
    options?: { timeout?: number },
  ): Promise<void> {
    return this.performAction(
      async () => {
        await expect(this.page).toHaveURL(expectedUrl, {
          timeout: options?.timeout,
        });
      },
      callerMethodName,
      `URL verification passed: ${expectedUrl.toString()}`,
      `URL verification failed for: ${expectedUrl.toString()}`,
    );
  }

  /**
   * Verifies that the page title matches the expected title.
   * @param expectedTitle The expected title or pattern to verify against.
   * @param callerMethodName The name of the method that called this function.
   * @param options Optional timeout configuration.
   */
  public async verifyPageTitle(
    expectedTitle: string | RegExp,
    callerMethodName: string,
    options?: { timeout?: number },
  ): Promise<void> {
    return this.performAction(
      async () => {
        await expect(this.page).toHaveTitle(expectedTitle, {
          timeout: options?.timeout,
        });
      },
      callerMethodName,
      `Title verification passed: ${expectedTitle.toString()}`,
      `Title verification failed for: ${expectedTitle.toString()}`,
    );
  }

  /**
   * Waits for the URL to match a specified pattern.
   * @param pattern URL pattern (string or regex) to match.
   * @param callerMethodName The name of the method that called this function.
   * @param options Optional timeout and waitUntil options.
   */
  public async waitForURL(
    pattern: string | RegExp,
    callerMethodName: string,
    options?: {
      timeout?: number;
      waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
    },
  ): Promise<void> {
    await this.performAction(
      () => this.page.waitForURL(pattern, options),
      callerMethodName,
      `URL matches pattern: ${pattern}`,
      `Failed waiting for URL to match: ${pattern}`,
    );
  }

  /**
   * Waits for the page to be fully loaded.
   * @param callerMethodName The name of the method that called this function.
   * @param state The load state to wait for.
   * @param options Optional timeout.
   */
  public async waitForPageLoad(
    callerMethodName: string,
    state: "load" | "domcontentloaded" | "networkidle" = "load",
    options?: { timeout?: number },
  ): Promise<void> {
    await this.performAction(
      () => this.page.waitForLoadState(state, options),
      callerMethodName,
      `Page reached ${state} state`,
      `Failed waiting for page to reach ${state} state`,
    );
  }

  /**
   * Waits for navigation to complete after an action.
   * @param action The action that triggers navigation.
   * @param callerMethodName The name of the method that called this function.
   * @param options Optional timeout and waitUntil options.
   * @returns A promise that resolves with the response or null.
   */
  public async waitForNavigation(
    action: () => Promise<void>,
    callerMethodName: string,
    options?: {
      timeout?: number;
      waitUntil?: "load" | "domcontentloaded" | "networkidle";
    },
  ): Promise<Response | null> {
    return this.performAction(
      async () => {
        const waitPromise = this.page.waitForLoadState(
          options?.waitUntil || "load",
          { timeout: options?.timeout },
        );
        await Promise.all([waitPromise, action()]);
        return null;
      },
      callerMethodName,
      "Navigation completed successfully",
      "Failed waiting for navigation",
    );
  }

  /**
   * Checks if the current URL contains a specific substring.
   * @param substring The substring to check for in the URL.
   * @param callerMethodName The name of the method that called this function.
   * @returns True if the URL contains the substring, false otherwise.
   */
  public async urlContains(
    substring: string,
    callerMethodName: string,
  ): Promise<boolean> {
    return this.performAction(
      () => Promise.resolve(this.page.url().includes(substring)),
      callerMethodName,
      `Checked if URL contains: ${substring}`,
      `Failed to check if URL contains: ${substring}`,
    );
  }

  /**
   * Checks if the current URL matches a regex pattern.
   * @param pattern The regex pattern to match against the URL.
   * @param callerMethodName The name of the method that called this function.
   * @returns True if the URL matches the pattern, false otherwise.
   */
  public async urlMatches(
    pattern: RegExp,
    callerMethodName: string,
  ): Promise<boolean> {
    return this.performAction(
      () => Promise.resolve(pattern.test(this.page.url())),
      callerMethodName,
      `Checked if URL matches pattern: ${pattern}`,
      `Failed to check if URL matches pattern: ${pattern}`,
    );
  }

  /**
   * Brings the page to the front (activates the tab).
   * @param callerMethodName The name of the method that called this function.
   */
  public async bringToFront(callerMethodName: string): Promise<void> {
    await this.performAction(
      () => this.page.bringToFront(),
      callerMethodName,
      "Brought page to front",
      "Failed to bring page to front",
    );
  }

  /**
   * Sets the viewport size.
   * @param width The viewport width.
   * @param height The viewport height.
   * @param callerMethodName The name of the method that called this function.
   */
  public async setViewportSize(
    width: number,
    height: number,
    callerMethodName: string,
  ): Promise<void> {
    await this.performAction(
      () => this.page.setViewportSize({ width, height }),
      callerMethodName,
      `Viewport size set to ${width}x${height}`,
      `Failed to set viewport size to ${width}x${height}`,
    );
  }
}
