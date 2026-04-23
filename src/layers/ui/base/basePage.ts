import type { Page } from "@playwright/test";
import { PageActionsContainer } from "./internal/pageActionsContainer.js";
import type { IPageActions } from "../base/internal/types/pageActions.js";

export class BasePage {
  public readonly page: Page;
  protected readonly actions: IPageActions;

  /**
   * Creates a base page wrapper with shared action helpers.
   * @param page - Active Playwright page instance.
   * @param actions - Optional prebuilt action container for dependency injection.
   */
  constructor(page: Page, actions?: IPageActions) {
    this.page = page;
    this.actions = actions || new PageActionsContainer(page);
  }

  /**
   * Returns the navigation actions.
   */
  public get navigation() {
    return this.actions.navigation;
  }

  /**
   * Returns the element actions object.
   */
  public get element() {
    return this.actions.element;
  }

  /**
   * Returns the element assertions object.
   */
  public get elementAssertions() {
    return this.actions.elementAssertions;
  }

  /**
   * Returns the browser actions object.
   */
  public get browser() {
    return this.actions.browser;
  }

  /**
   * Returns the frame actions object.
   */
  public get frame() {
    return this.actions.frame;
  }

  /**
   * Returns the file actions object.
   */
  public get file() {
    return this.actions.file;
  }
}
