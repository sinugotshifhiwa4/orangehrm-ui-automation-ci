import type { Page } from "@playwright/test";
import { NavigationActions } from "./actions/navigationActions.js";
import { ElementActions } from "./actions/elementActions.js";
import { ElementAssertions } from "./actions/elementAssertions.js";
import { BrowserActions } from "./actions/browserActions.js";
import { FrameActions } from "./actions/frameActions.js";
import { FileActions } from "./actions/fileActions.js";
import { Utilities } from "./utilities.js";
import type { IPageActions } from "../internal/types/pageActions.js";

export class PageActionsContainer implements IPageActions {
  public readonly page: Page;

  // Frequently used actions
  public readonly navigation: NavigationActions;
  public readonly element: ElementActions;
  public readonly elementAssertions: ElementAssertions;

  // Lazily instantiated actions
  private _browser?: BrowserActions;
  private _frame?: FrameActions;
  private _file?: FileActions;
  private _utilities?: Utilities;

  /**
   * Creates an action container bound to a single Playwright page.
   * Frequently used actions are initialized eagerly, while less common ones are lazy-loaded.
   * @param page - Active page instance used by all action helpers.
   */
  constructor(page: Page) {
    this.page = page;

    // instantiate commonly used actions
    this.navigation = new NavigationActions(page);
    this.element = new ElementActions(page);
    this.elementAssertions = new ElementAssertions(page);
  }

  // Lazy getters for rarely used actions

  /**
   * Returns the BrowserActions object.
   *
   * @returns {BrowserActions} The BrowserActions object.
   */
  get browser(): BrowserActions {
    if (!this._browser) {
      this._browser = new BrowserActions(this.page);
    }
    return this._browser;
  }

  /**
   * Returns the FrameActions object.
   * @returns {FrameActions} The FrameActions object.
   */
  get frame(): FrameActions {
    if (!this._frame) {
      this._frame = new FrameActions(
        this.page,
        this.element,
        this.elementAssertions,
      );
    }
    return this._frame;
  }

  /**
   * Returns the FileActions object.
   * @returns {FileActions} The FileActions object.
   */
  get file(): FileActions {
    if (!this._file) {
      this._file = new FileActions(this.page, this.element);
    }
    return this._file;
  }

  /**
   * Returns the utilities object.
   * @returns {Utilities} The utilities object.
   */
  get utilities(): Utilities {
    if (!this._utilities) {
      this._utilities = new Utilities();
    }
    return this._utilities;
  }
}
