import type { NavigationActions } from "../actions/navigationActions.js";
import type { ElementActions } from "../actions/elementActions.js";
import type { ElementAssertions } from "../actions/elementAssertions.js";
import type { BrowserActions } from "../actions/browserActions.js";
import type { FrameActions } from "../actions/frameActions.js";
import type { FileActions } from "../actions/fileActions.js";
import type { Utilities } from "../utilities.js";

/**
 * Interface for page actions
 */
export interface IPageActions {
  navigation: NavigationActions;
  element: ElementActions;
  elementAssertions: ElementAssertions;
  browser: BrowserActions;
  frame: FrameActions;
  file: FileActions;
  utilities: Utilities;
}

/**
 * Interface for random string options
 */
export type RandomStringOptions = {
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSpecial?: boolean;
  prefix?: string;
  suffix?: string;
};
