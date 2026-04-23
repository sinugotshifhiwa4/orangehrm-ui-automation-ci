import { test, type Page, type Locator } from "@playwright/test";
import { ActionBase } from "./actionBase.js";
import DataSanitizer from "../../../../../utils/sanitization/dataSanitizer.js";
import FieldValidator from "../../../../../utils/shared/fieldValidator.js";
import ErrorHandler from "../../../../../utils/errorHandling/errorHandler.js";
import logger from "../../../../../configuration/system/logger/loggerManager.js";

export class ElementActions extends ActionBase {
  /**
   * Creates element interaction helpers for the active page.
   * @param page - Active Playwright page instance.
   */
  constructor(page: Page) {
    super(page);
  }

  /**
   * Fill an element with a given value.
   * @param element - The element to fill.
   * @param callerMethodName - The name of the method that called this function.
   * @param value - The value to fill the element with.
   * @param elementName - The name of the element.
   * @param options - Optional configuration.
   * @param options.force - If true, forces the fill action even if the element is readonly.
   * @param options.allowEmpty - If true, allows filling the element with an empty value.
   * @returns A promise that resolves when the fill action completes successfully.
   * @throws If the value is empty and allowEmpty is false, or if the fill action fails.
   */
  public async fillElement(
    element: Locator,
    callerMethodName: string,
    value: string,
    elementName: string,
    options?: { force?: boolean; allowEmpty?: boolean },
  ) {
    const sanitizedValue = FieldValidator.validate(value, callerMethodName, {
      allowEmpty: options?.allowEmpty,
    });

    const { displayValue, isSensitive } = DataSanitizer.sanitizeFieldValue(
      elementName || "element not specified",
      sanitizedValue,
    );
    const stepTitle = isSensitive
      ? `Fill ${elementName} with ${displayValue}`
      : `Fill ${elementName} with "${displayValue}"`;
    const successMessage = `${elementName || "element"} filled successfully with value: ${displayValue}`;
    const errorMessage = `Failed to fill ${elementName || "element"}`;

    await test.step(stepTitle, async () => {
      try {
        await element.fill(sanitizedValue, { force: options?.force || false });
        logger.info(successMessage);
      } catch (error) {
        ErrorHandler.captureError(error, callerMethodName, errorMessage);
        throw error;
      }
    });
  }

  /**
   * Press digits sequentially in an element.
   * @param element - The element to press the digits in.
   * @param callerMethodName - The name of the method that called this function.
   * @param text - The string of digits to press sequentially.
   * @param elementName - The name of the element.
   * @param options - Optional configuration.
   * @param options.allowEmpty - If true, allows pressing sequentially with an empty value.
   * @returns A promise that resolves when all digits have been entered successfully.
   * @throws If the text is empty and allowEmpty is false, or if the press action fails.
   */
  public async typeDigitsSequentially(
    element: Locator,
    callerMethodName: string,
    text: string,
    elementName: string,
    options?: { allowEmpty?: boolean },
  ) {
    const sanitizedText = FieldValidator.validate(text, callerMethodName, {
      allowEmpty: options?.allowEmpty,
    });

    await this.performAction(
      async () => {
        await element.pressSequentially(sanitizedText);
      },
      callerMethodName,
      `Digits '${sanitizedText}' entered sequentially in ${elementName || "element"}`,
      `Error entering digits sequentially in ${elementName || "element"}`,
    );
  }

  /**
   * Clicks an element
   * @param element The element locator
   * @param callerMethodName The name of the method that called this function
   * @param elementName The name of the element
   * @param options Optional parameters for the click action
   * @param options.force A boolean indicating whether to force the action
   * @param options.trial A boolean indicating whether to attempt the click action in a retry loop
   * @returns A promise that resolves with the result of the click action if it succeeds, or rejects with the error if it fails
   */
  public async clickElement(
    element: Locator,
    callerMethodName: string,
    elementName: string,
    options?: {
      force?: boolean;
      trial?: boolean;
    },
  ) {
    await this.performAction(
      () =>
        element.click({
          force: options?.force ?? false,
          trial: options?.trial ?? false,
        }),
      callerMethodName,
      `Clicked on ${elementName}`,
      `Error clicking on ${elementName}`,
    );
  }

  /**
   * Clears an element.
   * @param element The element locator
   * @param callerMethodName The name of the method that called this function.
   * @param elementName The name of the element.
   * @returns A promise that resolves with the result of the clear action if it succeeds, or rejects with the error if it fails.
   */
  public async clearElement(
    element: Locator,
    callerMethodName: string,
    elementName: string,
  ) {
    await this.performAction(
      () => element.clear(),
      callerMethodName,
      `Cleared ${elementName}`,
      `Error clearing ${elementName}`,
    );
  }

  /**
   * Clears an element by clicking on it three times and then pressing the backspace key.
   * This method is useful for clearing text fields that do not support the 'clear' method.
   * @param element The element locator
   * @param callerMethodName The name of the method that called this function.
   * @param elementName The name of the element.
   * @returns A promise that resolves with the result of the clear action if it succeeds, or rejects with the error if it fails.
   */
  public async clearElementWithBackSpace(
    element: Locator,
    callerMethodName: string,
    elementName: string,
  ) {
    await this.performAction(
      async () => {
        await element.click({ clickCount: 3 });
        await element.press("Backspace");
      },
      callerMethodName,
      `Cleared ${elementName}`,
      `Error clearing ${elementName}`,
    );
  }

  /**
   * Selects an option in an element.
   * @param element The element locator.
   * @param callerMethodName The name of the method that called this function.
   * @param optionValue The value of the option to select.
   * @param elementName The name of the element.
   * @returns A promise that resolves with the result of the select action if it succeeds, or rejects with the error if it fails.
   */
  public async selectOption(
    element: Locator,
    callerMethodName: string,
    optionValue: string,
    elementName: string,
  ) {
    const cleanOptionValue = optionValue.replace(/^["']|["']$/g, "");

    return this.performAction(
      () => element.selectOption(cleanOptionValue),
      callerMethodName,
      `${elementName} option selected successfully with value: ${cleanOptionValue}`,
      `Error selecting option in ${elementName}`,
    );
  }

  /**
   * Focuses an element, i.e., sets focus on it.
   * @param element The element locator
   * @param callerMethodName The name of the method that called this function
   * @param elementName The name of the element
   * @returns A promise that resolves with the result of the focus action if it succeeds, or rejects with the error if it fails.
   */
  public async focusElement(
    element: Locator,
    callerMethodName: string,
    elementName: string,
  ): Promise<void> {
    return this.performAction(
      () => element.focus(),
      callerMethodName,
      `Focused on ${elementName}`,
      `Failed to focus on ${elementName}`,
    );
  }

  /**
   * Blurs an element, i.e., removes focus from it.
   * @param element The element locator.
   * @param callerMethodName The name of the method that called this function.
   * @param elementName The name of the element.
   * @returns A promise that resolves with the result of the blur action if it succeeds, or rejects with the error if it fails.
   */
  public async blurElement(
    element: Locator,
    callerMethodName: string,
    elementName: string,
  ): Promise<void> {
    return this.performAction(
      () => element.blur(),
      callerMethodName,
      `Blurred ${elementName}`,
      `Failed to blur ${elementName}`,
    );
  }

  /**
   * Checks an element, i.e., adds the checked state to it.
   * @param element The element locator.
   * @param callerMethodName The name of the method that called this function.
   * @param elementName The name of the element.
   * @param options Optional parameters for the check action.
   * @param options.force A boolean indicating whether to force the action.
   * @returns A promise that resolves with the result of the check action if it succeeds, or rejects with the error if it fails.
   * @example
   * await checkElement(element, "checkElement", "checkbox");
   */
  public async checkElement(
    element: Locator,
    callerMethodName: string,
    elementName: string,
    options?: { force?: boolean },
  ): Promise<void> {
    await this.performAction(
      () => element.check({ force: options?.force ?? false }),
      callerMethodName,
      `${elementName} checked successfully`,
      `Failed to check ${elementName}`,
    );
  }

  /**
   * Unchecks an element, i.e., removes the checked state from it.
   * @param element The element locator.
   * @param callerMethodName The name of the method that called this function.
   * @param elementName The name of the element.
   * @param options Optional parameters for the uncheck action.
   * @param options.force A boolean indicating whether to force the action.
   * @returns A promise that resolves with the result of the uncheck action if it succeeds, or rejects with the error if it fails.
   */
  public async uncheckElement(
    element: Locator,
    callerMethodName: string,
    elementName: string,
    options?: { force?: boolean },
  ): Promise<void> {
    await this.performAction(
      () => element.uncheck({ force: options?.force ?? false }),
      callerMethodName,
      `${elementName} unchecked successfully`,
      `Failed to uncheck ${elementName}`,
    );
  }

  /**
   * Hovers over an element.
   * @param element The element locator.
   * @param callerMethodName The name of the method that called this function.
   * @param elementName The name of the element.
   * @returns A promise that resolves with the result of the hover action if it succeeds, or rejects with the error if it fails.
   * @example
   * await hoverElement(element, "hoverElement", "button");
   */
  public async hoverElement(
    element: Locator,
    callerMethodName: string,
    elementName: string,
  ): Promise<void> {
    await this.performAction(
      async () => {
        await element.hover();
      },
      callerMethodName,
      `Hovered on ${elementName}`,
      `Failed to hover on ${elementName}`,
    );
  }

  /**
   * Hovers over an element and then clicks on it.
   * @param element The element locator.
   * @param callerMethodName The name of the method that called this function.
   * @param elementName The name of the element.
   * @returns A promise that resolves with the result of the hover and click action if it succeeds, or rejects with the error if it fails.
   * @example
   * await hoverThenClick(element, "hoverThenClick", "button");
   */
  public async hoverThenClick(
    element: Locator,
    callerMethodName: string,
    elementName: string,
  ): Promise<void> {
    await this.performAction(
      async () => {
        await this.hoverElement(element, callerMethodName, elementName);
        await this.clickElement(element, callerMethodName, elementName);
      },
      callerMethodName,
      `Hovered and clicked on ${elementName}`,
      `Failed to hover and click on ${elementName}`,
    );
  }

  /**
   * Double-clicks an element.
   * @param element The element locator.
   * @param callerMethodName The name of the method that called this function.
   * @param elementName The name of the element.
   * @param options Optional parameters for the double-click action.
   * @returns A promise that resolves with the result of the double-click action if it succeeds, or rejects with the error if it fails.
   * @example
   * await doubleClickElement(element, "doubleClickElement", "button", { force: true });
   */
  public async doubleClickElement(
    element: Locator,
    callerMethodName: string,
    elementName: string,
    options?: { force?: boolean },
  ): Promise<void> {
    await this.performAction(
      () => element.dblclick({ force: options?.force || false }),
      callerMethodName,
      `Double-clicked on ${elementName}`,
      `Failed to double-click on ${elementName}`,
    );
  }

  /**
   * Right-clicks an element.
   * @param element The element locator.
   * @param callerMethodName The name of the method that called this function.
   * @param elementName The name of the element.
   * @param options Optional parameters for the right-click action.
   * @returns A promise that resolves with the result of the right-click action if it succeeds, or rejects with the error if it fails.
   * @example
   * await rightClickElement(element, "rightClickElement", "button", { force: true });
   */
  public async rightClickElement(
    element: Locator,
    callerMethodName: string,
    elementName: string,
    options?: { force?: boolean },
  ): Promise<void> {
    await this.performAction(
      () => element.click({ button: "right", force: options?.force || false }),
      callerMethodName,
      `Right-clicked on ${elementName}`,
      `Failed to right-click on ${elementName}`,
    );
  }

  /**
   * Drags an element to another element.
   * @param sourceElement The element to drag.
   * @param targetElement The element to drag to.
   * @param callerMethodName The name of the method that called this function.
   * @param sourceElementName The name of the source element.
   * @param targetElementName The name of the target element.
   * @param options Optional parameters for the drag action.
   * @returns A promise that resolves with the result of the drag action if it succeeds, or rejects with the error if it fails.
   * @example
   * await dragTo(sourceElement, targetElement, "dragTo", "source", "target", { force: true });
   */
  public async dragTo(
    sourceElement: Locator,
    targetElement: Locator,
    callerMethodName: string,
    sourceElementName: string,
    targetElementName: string,
    options?: {
      force?: boolean;
      sourcePosition?: { x: number; y: number };
      targetPosition?: { x: number; y: number };
    },
  ): Promise<void> {
    await this.performAction(
      async () => {
        const dragOptions: {
          force?: boolean;
          sourcePosition?: { x: number; y: number };
          targetPosition?: { x: number; y: number };
        } = {};

        if (options?.force !== undefined) {
          dragOptions.force = options.force;
        }
        if (options?.sourcePosition) {
          dragOptions.sourcePosition = options.sourcePosition;
        }
        if (options?.targetPosition) {
          dragOptions.targetPosition = options.targetPosition;
        }

        await sourceElement.dragTo(targetElement, dragOptions);
      },
      callerMethodName,
      `Dragged ${sourceElementName} to ${targetElementName}`,
      `Failed to drag ${sourceElementName} to ${targetElementName}`,
    );
  }

  /**
   * Check whether a locator has a given attribute (regardless of its value).
   * @param element The element locator.
   * @param callerMethodName The name of the method that called this function.
   * @param attr The attribute name to check.
   */
  public async hasAttribute(
    element: Locator,
    callerMethodName: string,
    attr: string,
  ): Promise<boolean> {
    return this.performAction(
      async () => (await element.getAttribute(attr)) !== null,
      callerMethodName,
      `Attribute "${attr}" found on element`,
      `Failed to check attribute "${attr}" on element`,
    );
  }

  /**
   * Return the value of an attribute, or null if it is absent.
   * @param element The element locator.
   * @param callerMethodName The name of the method that called this function.
   * @param attr The attribute name to retrieve.
   */
  public async getAttributeValue(
    element: Locator,
    callerMethodName: string,
    attr: string,
  ): Promise<string | null> {
    return this.performAction(
      () => element.getAttribute(attr),
      callerMethodName,
      `Retrieved value for attribute "${attr}"`,
      `Failed to get value for attribute "${attr}"`,
    );
  }

  /**
   * Check whether a locator contains a specific CSS class.
   * Uses a word-boundary regex to avoid partial matches (e.g. "btn" inside "btn-primary").
   * @param element The element locator.
   * @param callerMethodName The name of the method that called this function.
   * @param className The CSS class name to look for.
   */
  public async hasClass(
    element: Locator,
    callerMethodName: string,
    className: string,
  ): Promise<boolean> {
    return this.performAction(
      async () => {
        const classes = await element.getAttribute("class");
        if (!classes) return false;
        return new RegExp(`(?:^|\\s)${className}(?:\\s|$)`).test(classes);
      },
      callerMethodName,
      `Class "${className}" found on element`,
      `Failed to check class "${className}" on element`,
    );
  }

  /**
   * Check whether a locator is disabled.
   * @param element The element locator.
   * @param callerMethodName The name of the method that called this function.
   */
  public async isDisabled(
    element: Locator,
    callerMethodName: string,
  ): Promise<boolean> {
    return this.performAction(
      () => element.isDisabled(),
      callerMethodName,
      `Checked disabled state of element`,
      `Failed to check disabled state of element`,
    );
  }

  /**
   * Poll until a locator has a specific CSS class, or timeout is reached.
   * @param element The element locator.
   * @param callerMethodName The name of the method that called this function.
   * @param className The CSS class to wait for.
   * @param timeout Maximum wait time in milliseconds (default: 5000).
   */
  public async waitForClass(
    element: Locator,
    callerMethodName: string,
    className: string,
    timeout = 5000,
  ): Promise<void> {
    await this.performAction(
      async () => {
        await element.waitFor({ state: "attached" });
        await element
          .page()
          .waitForFunction(
            ({
              el,
              cls,
            }: {
              el: SVGElement | HTMLElement | null;
              cls: string;
            }) => el !== null && el.classList.contains(cls),
            { el: await element.elementHandle(), cls: className },
            { timeout },
          );
      },
      callerMethodName,
      `Class "${className}" appeared on element`,
      `Timed out waiting for class "${className}" on element`,
    );
  }

  /**
   * Poll until a locator's attribute equals the expected value, or timeout is reached.
   * @param element The element locator.
   * @param callerMethodName The name of the method that called this function.
   * @param attr The attribute name to watch.
   * @param value The expected attribute value.
   * @param timeout Maximum wait time in milliseconds (default: 5000).
   */
  public async waitForAttributeValue(
    element: Locator,
    callerMethodName: string,
    attr: string,
    value: string,
    timeout = 5000,
  ): Promise<void> {
    await this.performAction(
      async () => {
        await element.waitFor({ state: "attached" });
        await element
          .page()
          .waitForFunction(
            ({
              el,
              a,
              v,
            }: {
              el: SVGElement | HTMLElement | null;
              a: string;
              v: string;
            }) => el !== null && el.getAttribute(a) === v,
            { el: await element.elementHandle(), a: attr, v: value },
            { timeout },
          );
      },
      callerMethodName,
      `Attribute "${attr}" reached value "${value}" on element`,
      `Timed out waiting for attribute "${attr}" to equal "${value}" on element`,
    );
  }
}
