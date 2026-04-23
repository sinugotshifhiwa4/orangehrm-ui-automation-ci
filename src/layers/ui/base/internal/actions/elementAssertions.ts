import { type Page, type Locator, expect } from "@playwright/test";
import { ActionBase } from "./actionBase.js";
import type {
  AssertionElementState,
  WaitForElementState,
  ElementPropertyMap,
} from "../types/actions.type.js";
import ErrorHandler from "../../../../../utils/errorHandling/errorHandler.js";
import logger from "../../../../../configuration/system/logger/loggerManager.js";

export class ElementAssertions extends ActionBase {
  /**
   * Creates element assertion helpers for the active page.
   * @param page - Active Playwright page instance.
   */
  constructor(page: Page) {
    super(page);
  }

  /**
   * Retrieves an element property
   * @param element The element locator
   * @param callerMethodName The name of the method that called the action
   * @param propertyType The type of property to retrieve
   * @param elementName The name of the element
   * @param options Optional: options for retrieving the property
   * @returns The retrieved property value
   */
  public async getElementProperty<K extends keyof ElementPropertyMap>(
    element: Locator,
    callerMethodName: string,
    propertyType: K,
    elementName: string,
    options?: { attributeName?: string },
  ): Promise<ElementPropertyMap[K]> {
    return this.performAction(
      async (): Promise<ElementPropertyMap[K]> => {
        switch (propertyType) {
          case "attribute": {
            if (!options?.attributeName) {
              throw new Error("attributeName is required for 'attribute'");
            }
            return (await element.getAttribute(
              options.attributeName,
            )) as ElementPropertyMap[K];
          }

          case "dimensions": {
            const boundingBox = await element.boundingBox();
            if (!boundingBox) {
              throw new Error("Failed to get element bounding box");
            }
            return {
              width: boundingBox.width,
              height: boundingBox.height,
            } as ElementPropertyMap[K];
          }

          case "visibleText":
            return (await element.innerText()) as ElementPropertyMap[K];

          case "textContent":
            return (await element.textContent()) as ElementPropertyMap[K];

          case "inputValue":
            return (await element.inputValue()) as ElementPropertyMap[K];

          default: {
            const _exhaustiveCheck: never = propertyType;
            throw new Error(
              `Unsupported property type: ${String(_exhaustiveCheck)}`,
            );
          }
        }
      },
      callerMethodName,
      `Retrieved ${String(propertyType)} from ${elementName}`,
      `Failed to get ${String(propertyType)} from ${elementName}`,
    );
  }

  /**
   * Retrieves all text content from multiple elements
   * @param elements The Locator of elements to retrieve text content from
   * @param callerMethodName The name of the method that called the action
   * @param elementName The name of the elements
   * @returns An array of text content from all matching elements
   */
  public async getAllTextContents(
    elements: Locator,
    callerMethodName: string,
    elementName: string,
  ): Promise<string[]> {
    return this.performAction(
      async () => {
        return elements.allTextContents();
      },
      callerMethodName,
      `Retrieved all text contents from ${elementName}`,
      `Failed to get all text contents from ${elementName}`,
    );
  }

  /**
   * Checks if an element is visible.
   * @param element The Locator of the element to check.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName The name of the element.
   * @returns A promise that resolves with true if the element is visible, or false otherwise.
   */
  public async isElementVisible(
    element: Locator,
    callerMethodName: string,
    elementName: string,
  ): Promise<boolean> {
    return this.performAction(
      () => element.isVisible(),
      callerMethodName,
      `Verified: ${elementName} is visible`,
      `Failed to check visibility of ${elementName}`,
    );
  }

  /**
   * Retrieves the count of matching elements.
   * @param element The Locator of elements to retrieve the count from.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName The name of the elements.
   * @returns A promise that resolves with the count of matching elements.
   */
  public async getElementCount(
    element: Locator,
    callerMethodName: string,
    elementName: string,
  ): Promise<number> {
    return this.performAction(
      () => element.count(),
      callerMethodName,
      `Retrieved count for ${elementName}`,
      `Failed to get count for ${elementName}`,
    );
  }

  /**
   * Retrieves the bounding box of an element.
   * @param element The Locator of the element to retrieve the bounding box from.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName The name of the element.
   * @returns A promise that resolves with the bounding box of the element if it succeeds, or null if it fails.
   * The bounding box is represented as an object with the following properties:
   * - x: The x-coordinate of the top-left corner of the bounding box.
   * - y: The y-coordinate of the top-left corner of the bounding box.
   * - width: The width of the bounding box.
   * - height: The height of the bounding box.
   */
  public async getBoundingBox(
    element: Locator,
    callerMethodName: string,
    elementName: string,
  ): Promise<{ x: number; y: number; width: number; height: number } | null> {
    return this.performAction(
      () => element.boundingBox(),
      callerMethodName,
      `Retrieved bounding box for ${elementName}`,
      `Failed to get bounding box for ${elementName}`,
    );
  }

  /**
   * Verifies that an element is in a specified state.
   * @param element The Locator of the element to verify the state of.
   * @param callerMethodName The name of the method that called the action.
   * @param state The desired state of the element: "enabled", "disabled", "visible", or "hidden".
   * @param elementName The name of the element.
   */
  public async verifyElementState(
    element: Locator,
    callerMethodName: string,
    state: AssertionElementState,
    elementName: string,
  ): Promise<void> {
    await this.performAction(
      async () => {
        switch (state) {
          case "enabled":
            await expect(element).toBeEnabled();
            break;
          case "disabled":
            await expect(element).toBeDisabled();
            break;
          case "visible":
            await expect(element).toBeVisible();
            break;
          case "hidden":
            await expect(element).not.toBeVisible();
            break;
        }
      },
      callerMethodName,
      `${elementName} state is ${state}`,
      `Failed to verify element ${elementName} is ${state}`,
    );
  }

  /**
   * Waits for an element to be in a specified state.
   * @param element The Locator of the element to wait for.
   * @param callerMethodName The name of the method that called the action.
   * @param state The desired state of the element: "attached", "detached", "enabled", "disabled", "visible", or "hidden".
   * @param elementName The name of the element.
   * @param options Optional: timeout for the waitForElementState action.
   * @returns A promise that resolves if the verification succeeds, or rejects with an error if it fails.
   */
  public async waitForElementState(
    element: Locator,
    callerMethodName: string,
    state: WaitForElementState,
    elementName: string,
    options?: { timeout?: number },
  ): Promise<void> {
    await this.performAction(
      async () => {
        await element.waitFor({
          state,
          ...(options?.timeout !== undefined && { timeout: options.timeout }),
        });
      },
      callerMethodName,
      `${elementName} is ${state}`,
      `Failed waiting for element ${elementName} to be ${state}`,
    );
  }

  /**
   * Checks if an element reaches a specified state within the timeout period.
   * @param element The Locator of the element to wait for.
   * @param callerMethodName The name of the method that called the action.
   * @param state The desired state of the element: "attached", "detached", "enabled", "disabled", "visible", or "hidden".
   * @param elementName The name of the element.
   * @param options Optional: timeout for the waitForElementState action.
   * @returns A promise that resolves with true if the verification succeeds, or false if it fails.
   */
  public async isElementStateReached(
    element: Locator,
    callerMethodName: string,
    state: WaitForElementState,
    elementName: string,
    options?: { timeout?: number },
  ): Promise<boolean> {
    try {
      await this.performAction(
        async () => {
          await element.waitFor({
            state,
            ...(options?.timeout !== undefined && { timeout: options.timeout }),
          });
        },
        callerMethodName,
        `${elementName} is ${state}`,
        `Failed waiting for element ${elementName} to be ${state}`,
      );

      return true;
    } catch (error) {
      ErrorHandler.captureError(
        error,
        callerMethodName,
        `waitForElementState failed for ${elementName}`,
      );
      return false;
    }
  }

  /**
   * Checks if an element is editable.
   * @param element The Locator of the element to check.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName The name of the element.
   * @returns A promise that resolves with true if the element is editable, or false otherwise.
   */
  public async isElementEditable(
    element: Locator,
    callerMethodName: string,
    elementName: string,
  ): Promise<boolean> {
    return this.performAction(
      () => element.isEditable(),
      callerMethodName,
      `${elementName} is editable`,
      `Failed to check if ${elementName} is editable`,
    );
  }

  /**
   * Checks if an element is read-only.
   * @param element The Locator of the element to check.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName The name of the element.
   * @returns A promise that resolves with true if the element is read-only, or false otherwise.
   * An element is considered read-only if it has the "readonly" attribute, is disabled, or is not editable.
   */
  public async isElementReadOnly(
    element: Locator,
    callerMethodName: string,
    elementName: string,
  ): Promise<boolean> {
    return this.performAction(
      async () => {
        const readOnlyAttribute = await element.getAttribute("readonly");
        const disabledAttribute = await element.getAttribute("disabled");
        const isEditable = await element.isEditable();

        // Element is read-only if it has readonly attribute, is disabled, or is not editable
        return (
          readOnlyAttribute !== null ||
          disabledAttribute !== null ||
          !isEditable
        );
      },
      callerMethodName,
      `${elementName} is read-only`,
      `Failed to check if ${elementName} is read-only`,
    );
  }

  /**
   * Checks if a cell is non-editable.
   * @param cell The Locator of the cell to check.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName The name of the element.
   * @returns A promise that resolves with true if the cell is non-editable, or false otherwise.
   * A cell is considered non-editable if it does not contain any input or textarea elements, or any elements with the "contenteditable" attribute set to true.
   */
  public async isCellNonEditable(
    cell: Locator,
    callerMethodName: string,
    elementName: string,
  ): Promise<boolean> {
    return this.performAction(
      async () => {
        // Check if cell contains an input or textarea
        const hasInput = await cell
          .locator("input, textarea, [contenteditable='true']")
          .count();

        // If no interactive element is present, it's considered non-editable
        return hasInput === 0;
      },
      callerMethodName,
      `${elementName} is non-editable`,
      `Failed to check if ${elementName} is non-editable`,
    );
  }

  /**
   * Checks if an element is checked.
   * @param element The Locator of the element to check.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName The name of the element.
   * @returns A promise that resolves with true if the element is checked, or false otherwise.
   * @example
   * await isElementChecked(element, "isElementChecked", "checkbox");
   */
  public async isElementChecked(
    element: Locator,
    callerMethodName: string,
    elementName: string,
  ): Promise<boolean> {
    return this.performAction(
      () => element.isChecked(),
      callerMethodName,
      `${elementName} is checked`,
      `Failed to check if ${elementName} is checked`,
    );
  }

  /**
   * Checks if an element is disabled.
   * @param element The Locator of the element to check.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName The name of the element.
   * @returns A promise that resolves with true if the element is disabled, or false otherwise.
   */
  public async isElementDisabled(
    element: Locator,
    callerMethodName: string,
    elementName: string,
  ): Promise<boolean> {
    try {
      const isDisabled = await element.isDisabled();
      logger.info(`${elementName} disabled state: ${isDisabled}`);
      return isDisabled;
    } catch (error) {
      ErrorHandler.captureError(
        error,
        callerMethodName,
        `Failed to check disabled state for ${elementName}`,
      );
      throw error;
    }
  }

  /**
   * Verifies the state of a checkbox.
   * @param element The Locator of the element to verify.
   * @param callerMethodName The name of the method that called the action.
   * @param isChecked Whether the checkbox should be checked or not.
   * @param elementName The name of the element.
   * @returns A promise that resolves if the verification succeeds, or rejects with an error if it fails.
   * @example
   * await verifyCheckboxState(element, "verifyCheckboxState", true, "checkbox");
   */
  public async verifyCheckboxState(
    element: Locator,
    callerMethodName: string,
    isChecked: boolean,
    elementName: string,
  ): Promise<void> {
    await this.performAction(
      async () => {
        if (isChecked) {
          await expect(element).toBeChecked();
        } else {
          await expect(element).not.toBeChecked();
        }
      },
      callerMethodName,
      `${elementName} is ${isChecked ? "checked" : "unchecked"}`,
      `Failed to verify ${elementName} is ${isChecked ? "checked" : "unchecked"}`,
    );
  }

  /**
   * Checks if an element has a background colour class.
   * @param element The Locator of the element to check.
   * @param colour The colour to check for.
   * @param callerMethodName The name of the method that called the action.
   * @param elementName The name of the element.
   * @returns A promise that resolves with true if the element has the specified background colour class, or false otherwise.
   * @example
   * await hasBackgroundColourClass(element, "red", "hasBackgroundColourClass", "button");
   */
  public async hasBackgroundColourClass(
    element: Locator,
    colour: string,
    callerMethodName: string,
    elementName: string,
  ): Promise<boolean> {
    try {
      const classAttribute = await element.getAttribute("class");
      const hasColour = !!classAttribute?.match(new RegExp(`bg-${colour}-`));

      logger.info(
        `${elementName} background colour '${colour}' present: ${hasColour}`,
      );

      return hasColour;
    } catch (error) {
      ErrorHandler.captureError(
        error,
        callerMethodName,
        `Failed to check background colour '${colour}' for ${elementName}`,
      );
      throw error;
    }
  }

  /**
   * Waits for an element to stabilize with a specific keyword.
   * This method uses expect-poll to continuously check the input value of the element
   * until it matches the provided keyword four times in a row. This is useful for elements
   * that are updated dynamically and need to be checked for a specific state.
   * @param element The Locator of the element to wait for.
   * @param keyword The keyword to wait for.
   * @param callerMethodName The name of the method that called this function.
   * @param elementName The name of the element.
   * @returns A promise that resolves when the element has stabilized with the keyword, or rejects with an error if it fails.
   */
  public async waitForUIToStabilize(
    element: Locator,
    callerMethodName: string,
    keyword: string,
    elementName: string,
  ): Promise<void> {
    await this.performAction(
      async () => {
        let stableCount = 0;

        await expect
          .poll(async () => {
            const value = await element.inputValue();

            if (value === keyword) {
              stableCount++;
            } else {
              stableCount = 0;
            }

            return stableCount;
          })
          .toBeGreaterThanOrEqual(4);
      },
      callerMethodName,
      `${elementName} stabilized with keyword '${keyword}'`,
      `Failed to stabilize ${elementName} with keyword '${keyword}'`,
    );
  }

  /**
   * Waits for the first visible locator from a list of locator-result pairs.
   * The function takes a list of locator-result pairs and waits for the first visible locator.
   * Once the first visible locator is found, the function returns the corresponding result.
   * If no locator becomes visible within the specified timeout, the function throws an error.
   * @param locatorResultPairs An array of objects containing a locator and its corresponding result.
   * @param timeout The timeout in milliseconds to wait for the first visible locator.
   * @param methodName The name of the method that called this function.
   * @param errorMessage The error message to throw if no locator becomes visible within the specified timeout.
   * @returns A promise that resolves with the result of the first visible locator, or rejects with an error if no locator becomes visible within the specified timeout.
   *
   * @example
   * // Two locators competing — returns whichever becomes visible first
   * const result = await this.waitForFirstVisibleLocator(
   *   [
   *     { locator: this.flagCreatedPopupNotification(options), result: "created" as const },
   *     { locator: this.flagAlreadyExistPopupNotification(options), result: "alreadyExist" as const },
   *   ],
   *   5000,
   *   "waitForFlagCreatedOrAlreadyExistNotification",
   *   "Failed to wait for flag created or already exist notification",
   * );
   *
   * // Handle the result
   * if (result === "alreadyExist") {
   *   logger.info("Flag already exists");
   * } else {
   *   logger.info("Flag created successfully");
   * }
   */
  public async waitForFirstVisibleLocator<T extends string>(
    locatorResultPairs: Array<{ locator: Locator; result: T }>,
    timeout: number,
    methodName: string,
    errorMessage: string,
  ): Promise<T> {
    try {
      const locators = locatorResultPairs.map((pair) => pair.locator);
      const combinedLocator = locators.reduce((acc, locator) =>
        acc.or(locator),
      );

      await expect(combinedLocator).toBeVisible({ timeout });

      for (const { locator, result } of locatorResultPairs) {
        if (await locator.isVisible()) {
          return result;
        }
      }

      throw new Error("No locator became visible");
    } catch (error) {
      ErrorHandler.captureError(error, methodName, errorMessage);
      throw error;
    }
  }
}
