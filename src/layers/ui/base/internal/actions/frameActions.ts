import type { Page, Frame, Locator, FrameLocator } from "@playwright/test";
import { ActionBase } from "./actionBase.js";
import type { ElementActions } from "./elementActions.js";
import type { ElementAssertions } from "./elementAssertions.js";

export class FrameActions extends ActionBase {
  private elementActions: ElementActions;
  private elementAssertions: ElementAssertions;

  /**
   * Creates frame interaction helpers and reuses shared element helpers within frames.
   * @param page - Active Playwright page instance.
   * @param elementActions - Element action helper reused for frame-scoped interactions.
   * @param elementAssertions - Element assertion helper reused for frame-scoped checks.
   */
  constructor(
    page: Page,
    elementActions: ElementActions,
    elementAssertions: ElementAssertions,
  ) {
    super(page);
    this.elementActions = elementActions;
    this.elementAssertions = elementAssertions;
  }

  /**
   * Retrieves a frame by its name.
   * @param frameName The name attribute of the frame.
   * @param callerMethodName The name of the method that called the action.
   * @returns A promise that resolves with the frame if found, or null if not found.
   */
  public async getFrameByName(
    frameName: string,
    callerMethodName: string,
  ): Promise<Frame | null> {
    return this.performAction(
      () => Promise.resolve(this.page.frame({ name: frameName })),
      callerMethodName,
      `Retrieved frame: ${frameName}`,
      `Failed to get frame: ${frameName}`,
    );
  }

  /**
   * Retrieves a frame by its URL.
   * @param frameUrl The URL of the frame (can be a string or regex).
   * @param callerMethodName The name of the method that called the action.
   * @returns A promise that resolves with the frame if found, or null if not found.
   */
  public async getFrameByUrl(
    frameUrl: string | RegExp,
    callerMethodName: string,
  ): Promise<Frame | null> {
    return this.performAction(
      () => Promise.resolve(this.page.frame({ url: frameUrl })),
      callerMethodName,
      `Retrieved frame by URL: ${frameUrl}`,
      `Failed to get frame by URL: ${frameUrl}`,
    );
  }

  /**
   * Retrieves a FrameLocator by its name.
   * @param frameName The name attribute of the frame.
   * @param callerMethodName The name of the method that called the action.
   * @returns A FrameLocator for the specified frame.
   */
  public async getFrameLocator(
    frameName: string,
    callerMethodName: string,
  ): Promise<FrameLocator> {
    return this.performAction(
      () => Promise.resolve(this.page.frameLocator(`[name="${frameName}"]`)),
      callerMethodName,
      `Retrieved frame locator: ${frameName}`,
      `Failed to get frame locator: ${frameName}`,
    );
  }

  /**
   * Retrieves all frames on the page.
   * @param callerMethodName The name of the method that called the action.
   * @returns A promise that resolves with an array of all frames.
   */
  public async getAllFrames(callerMethodName: string): Promise<Frame[]> {
    return this.performAction(
      () => Promise.resolve(this.page.frames()),
      callerMethodName,
      "Retrieved all frames",
      "Failed to get all frames",
    );
  }

  /**
   * Waits for a frame to be available.
   * @param frameName The name attribute of the frame.
   * @param callerMethodName The name of the method that called the action.
   * @param timeout Optional timeout in milliseconds.
   * @returns A promise that resolves with the frame when available.
   */
  public async waitForFrame(
    frameName: string,
    callerMethodName: string,
    timeout?: number,
  ): Promise<Frame> {
    return this.performAction(
      async () => {
        const startTime = Date.now();
        const maxTimeout = timeout || 30000;

        while (Date.now() - startTime < maxTimeout) {
          const frame = this.page.frame({ name: frameName });
          if (frame) return frame;
          await this.page.waitForTimeout(100);
        }

        throw new Error(`Frame '${frameName}' not found within timeout`);
      },
      callerMethodName,
      `Frame '${frameName}' is available`,
      `Failed to wait for frame: ${frameName}`,
    );
  }

  /**
   * Switches to a frame and returns its context.
   * @param frameName The name attribute of the frame.
   * @param callerMethodName The name of the method that called the action.
   * @returns A promise that resolves with the frame context.
   */
  public async switchToFrame(
    frameName: string,
    callerMethodName: string,
  ): Promise<Frame> {
    return this.performAction(
      async () => {
        const frame = await this.getFrameByName(frameName, callerMethodName);
        if (!frame) throw new Error(`Frame '${frameName}' not found`);
        return frame;
      },
      callerMethodName,
      `Switched to frame: ${frameName}`,
      `Failed to switch to frame: ${frameName}`,
    );
  }

  /**
   * Gets a locator for an element within a specific frame.
   * @param frameName The name attribute of the frame.
   * @param selector The CSS selector for the element.
   * @param callerMethodName The name of the method that called the action.
   * @returns A promise that resolves with the element locator.
   */
  public async getElementInFrame(
    frameName: string,
    selector: string,
    callerMethodName: string,
  ): Promise<Locator> {
    return this.performAction(
      async () => {
        const frame = await this.getFrameByName(frameName, callerMethodName);
        if (!frame) throw new Error(`Frame '${frameName}' not found`);
        return frame.locator(selector);
      },
      callerMethodName,
      `Retrieved element '${selector}' in frame '${frameName}'`,
      `Failed to get element '${selector}' in frame '${frameName}'`,
    );
  }

  /**
   * Clicks an element within a frame.
   * @param frameName The name attribute of the frame.
   * @param selector The CSS selector for the element.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName Name of the element.
   * @param options Optional click options.
   */
  public async clickElementInFrame(
    frameName: string,
    selector: string,
    callerMethodName: string,
    elementName: string,
    options?: { force?: boolean },
  ): Promise<void> {
    await this.performAction(
      async () => {
        const element = await this.getElementInFrame(
          frameName,
          selector,
          callerMethodName,
        );
        await this.elementActions.clickElement(
          element,
          callerMethodName,
          elementName,
          options,
        );
      },
      callerMethodName,
      `Clicked ${elementName} in frame ${frameName}`,
      `Failed to click ${elementName} in frame ${frameName}`,
    );
  }

  /**
   * Fills an element within a frame.
   * @param frameName The name attribute of the frame.
   * @param selector The CSS selector for the element.
   * @param value The value to fill.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName Name of the element.
   * @param options Optional fill options.
   */
  public async fillElementInFrame(
    frameName: string,
    selector: string,
    value: string,
    callerMethodName: string,
    elementName: string,
    options?: { force?: boolean },
  ): Promise<void> {
    await this.performAction(
      async () => {
        const element = await this.getElementInFrame(
          frameName,
          selector,
          callerMethodName,
        );
        await this.elementActions.fillElement(
          element,
          callerMethodName,
          value,
          elementName,
          options,
        );
      },
      callerMethodName,
      `Filled ${elementName} in frame ${frameName}`,
      `Failed to fill ${elementName} in frame ${frameName}`,
    );
  }

  /**
   * Checks a checkbox or radio button within a frame.
   * @param frameName The name attribute of the frame.
   * @param selector The CSS selector for the element.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName Name of the element.
   */
  public async checkElementInFrame(
    frameName: string,
    selector: string,
    callerMethodName: string,
    elementName: string,
    options?: { force?: boolean },
  ): Promise<void> {
    await this.performAction(
      async () => {
        const element = await this.getElementInFrame(
          frameName,
          selector,
          callerMethodName,
        );
        await this.elementActions.checkElement(
          element,
          callerMethodName,
          elementName,
          options,
        );
      },
      callerMethodName,
      `Checked ${elementName} in frame ${frameName}`,
      `Failed to check ${elementName} in frame ${frameName}`,
    );
  }

  /**
   * Unchecks a checkbox within a frame.
   * @param frameName The name attribute of the frame.
   * @param selector The CSS selector for the element.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName Name of the element.
   */
  public async uncheckElementInFrame(
    frameName: string,
    selector: string,
    callerMethodName: string,
    elementName: string,
    options?: { force?: boolean },
  ): Promise<void> {
    await this.performAction(
      async () => {
        const element = await this.getElementInFrame(
          frameName,
          selector,
          callerMethodName,
        );
        await this.elementActions.uncheckElement(
          element,
          callerMethodName,
          elementName,
          options,
        );
      },
      callerMethodName,
      `Unchecked ${elementName} in frame ${frameName}`,
      `Failed to uncheck ${elementName} in frame ${frameName}`,
    );
  }

  /**
   * Selects an option from a dropdown within a frame.
   * @param frameName The name attribute of the frame.
   * @param selector The CSS selector for the element.
   * @param optionValue The value of the option to select.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName Name of the element.
   */
  public async selectOptionInFrame(
    frameName: string,
    selector: string,
    optionValue: string,
    callerMethodName: string,
    elementName: string,
  ): Promise<void> {
    await this.performAction(
      async () => {
        const element = await this.getElementInFrame(
          frameName,
          selector,
          callerMethodName,
        );
        await this.elementActions.selectOption(
          element,
          callerMethodName,
          optionValue,
          elementName,
        );
      },
      callerMethodName,
      `Selected option in ${elementName} in frame ${frameName}`,
      `Failed to select option in ${elementName} in frame ${frameName}`,
    );
  }

  /**
   * Hovers over an element within a frame.
   * @param frameName The name attribute of the frame.
   * @param selector The CSS selector for the element.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName Name of the element.
   */
  public async hoverElementInFrame(
    frameName: string,
    selector: string,
    callerMethodName: string,
    elementName: string,
  ): Promise<void> {
    await this.performAction(
      async () => {
        const element = await this.getElementInFrame(
          frameName,
          selector,
          callerMethodName,
        );
        await this.elementActions.hoverElement(
          element,
          callerMethodName,
          elementName,
        );
      },
      callerMethodName,
      `Hovered over ${elementName} in frame ${frameName}`,
      `Failed to hover over ${elementName} in frame ${frameName}`,
    );
  }

  /**
   * Double-clicks an element within a frame.
   * @param frameName The name attribute of the frame.
   * @param selector The CSS selector for the element.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName Name of the element.
   * @param options Optional double-click options.
   */
  public async doubleClickElementInFrame(
    frameName: string,
    selector: string,
    callerMethodName: string,
    elementName: string,
    options?: { force?: boolean },
  ): Promise<void> {
    await this.performAction(
      async () => {
        const element = await this.getElementInFrame(
          frameName,
          selector,
          callerMethodName,
        );
        await this.elementActions.doubleClickElement(
          element,
          callerMethodName,
          elementName,
          options,
        );
      },
      callerMethodName,
      `Double-clicked ${elementName} in frame ${frameName}`,
      `Failed to double-click ${elementName} in frame ${frameName}`,
    );
  }

  /**
   * Right-clicks an element within a frame.
   * @param frameName The name attribute of the frame.
   * @param selector The CSS selector for the element.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName Name of the element.
   * @param options Optional right-click options.
   */
  public async rightClickElementInFrame(
    frameName: string,
    selector: string,
    callerMethodName: string,
    elementName: string,
    options?: { force?: boolean },
  ): Promise<void> {
    await this.performAction(
      async () => {
        const element = await this.getElementInFrame(
          frameName,
          selector,
          callerMethodName,
        );
        await this.elementActions.rightClickElement(
          element,
          callerMethodName,
          elementName,
          options,
        );
      },
      callerMethodName,
      `Right-clicked ${elementName} in frame ${frameName}`,
      `Failed to right-click ${elementName} in frame ${frameName}`,
    );
  }

  /**
   * Gets text content from an element within a frame.
   * @param frameName The name attribute of the frame.
   * @param selector The CSS selector for the element.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName Name of the element.
   * @returns A promise that resolves with the text content.
   */
  public async getTextFromFrame(
    frameName: string,
    selector: string,
    callerMethodName: string,
    elementName: string,
  ): Promise<string | null> {
    return this.performAction(
      async () => {
        const element = await this.getElementInFrame(
          frameName,
          selector,
          callerMethodName,
        );

        return this.elementAssertions.getElementProperty(
          element,
          callerMethodName,
          "textContent",
          elementName,
        );
      },
      callerMethodName,
      `Retrieved text from ${elementName} in frame ${frameName}`,
      `Failed to get text from ${elementName} in frame ${frameName}`,
    );
  }

  /**
   * Verifies element state within a frame.
   * @param frameName The name attribute of the frame.
   * @param selector The CSS selector for the element.
   * @param state The expected state.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName Name of the element.
   */
  public async verifyElementStateInFrame(
    frameName: string,
    selector: string,
    state: "enabled" | "disabled" | "visible" | "hidden",
    callerMethodName: string,
    elementName: string,
  ): Promise<void> {
    await this.performAction(
      async () => {
        const element = await this.getElementInFrame(
          frameName,
          selector,
          callerMethodName,
        );
        await this.elementAssertions.verifyElementState(
          element,
          callerMethodName,
          state,
          elementName,
        );
      },
      callerMethodName,
      `Verified ${elementName} is ${state} in frame ${frameName}`,
      `Failed to verify ${elementName} is ${state} in frame ${frameName}`,
    );
  }

  /**
   * Waits for an element to be visible within a frame.
   * @param frameName The name attribute of the frame.
   * @param selector The CSS selector for the element.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName Name of the element.
   */
  public async waitForElementInFrame(
    frameName: string,
    selector: string,
    callerMethodName: string,
    elementName: string,
  ): Promise<void> {
    await this.performAction(
      async () => {
        const element = await this.getElementInFrame(
          frameName,
          selector,
          callerMethodName,
        );
        await this.elementAssertions.waitForElementState(
          element,
          callerMethodName,
          "visible",
          elementName,
        );
      },
      callerMethodName,
      `${elementName} is visible in frame ${frameName}`,
      `Failed to wait for ${elementName} in frame ${frameName}`,
    );
  }

  /**
   * Checks if an element is visible within a frame.
   * @param frameName The name attribute of the frame.
   * @param selector The CSS selector for the element.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName Name of the element.
   * @returns A promise that resolves with true if visible, false otherwise.
   */
  public async isElementVisibleInFrame(
    frameName: string,
    selector: string,
    callerMethodName: string,
    elementName: string,
  ): Promise<boolean> {
    return this.performAction(
      async () => {
        const element = await this.getElementInFrame(
          frameName,
          selector,
          callerMethodName,
        );
        return this.elementAssertions.isElementVisible(
          element,
          callerMethodName,
          elementName,
        );
      },
      callerMethodName,
      `Checked visibility of ${elementName} in frame ${frameName}`,
      `Failed to check visibility of ${elementName} in frame ${frameName}`,
    );
  }

  /**
   * Gets the count of elements matching a selector within a frame.
   * @param frameName The name attribute of the frame.
   * @param selector The CSS selector for the elements.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName Name of the elements.
   * @returns A promise that resolves with the count.
   */
  public async getElementCountInFrame(
    frameName: string,
    selector: string,
    callerMethodName: string,
    elementName: string,
  ): Promise<number> {
    return this.performAction(
      async () => {
        const frame = await this.getFrameByName(frameName, callerMethodName);
        if (!frame) throw new Error(`Frame '${frameName}' not found`);
        const elements = frame.locator(selector);
        return this.elementAssertions.getElementCount(
          elements,
          callerMethodName,
          elementName,
        );
      },
      callerMethodName,
      `Retrieved count of ${elementName} in frame ${frameName}`,
      `Failed to get count of ${elementName} in frame ${frameName}`,
    );
  }
}
