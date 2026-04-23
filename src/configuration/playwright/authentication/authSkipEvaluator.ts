import type { TestInfo } from "@playwright/test";
import ErrorHandler from "../../../utils/errorHandling/errorHandler.js";

export default class AuthenticationSkipEvaluator {
  /**
   * Determines if authentication should be skipped for a test based on tags.
   *
   * @param testInfo - Playwright TestInfo object
   * @param skipTags - Array of tags that indicate auth should be skipped (e.g. ['@skip-auth'])
   * @returns `true` if authentication setup should be skipped, otherwise `false`
   */
  public static shouldSkipAuthenticationIfNeeded(
    testInfo: TestInfo,
    skipTags: string[],
  ): boolean {
    try {
      if (!testInfo?.tags?.length) {
        return false;
      }

      const normalizedSkipTags = skipTags.map((tag) =>
        tag.trim().toLowerCase(),
      );

      const testTags = testInfo.tags.map((tag) => tag.toLowerCase());

      return normalizedSkipTags.some((skipTag) => testTags.includes(skipTag));
    } catch (error) {
      ErrorHandler.captureError(
        error,
        "shouldSkipAuthenticationIfNeeded",
        `Failed to determine if authentication should be skipped for test: ${
          testInfo?.title || "unknown"
        }`,
      );
      return false;
    }
  }
}
