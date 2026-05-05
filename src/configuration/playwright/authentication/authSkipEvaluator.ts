import type { TestInfo } from "@playwright/test";
import ErrorHandler from "../../../utils/errorHandling/errorHandler.js";

export default class AuthenticationSkipEvaluator {
  /**
   * Determines if authentication should be skipped for a test based on tags.
   *
   * @param testInfo - Playwright TestInfo object
   * @returns `true` if authentication setup should be skipped, otherwise `false`
   */
  public static shouldSkipAuthenticationIfNeeded(testInfo: TestInfo): boolean {
    try {
      const testTags = AuthenticationSkipEvaluator.extractTags(testInfo);
      if (!testTags.length) {
        return false;
      }

      return testTags.includes("@skip-auth");
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

  private static extractTags(testInfo: TestInfo): string[] {
    const explicitTags = testInfo?.tags ?? [];
    const titlePath = testInfo?.titlePath ?? [];
    const titleTokens = [...titlePath, testInfo?.title ?? ""]
      .join(" ")
      .match(/@[\S]+/g);

    return [...new Set([...explicitTags, ...(titleTokens ?? [])])].map((tag) =>
      tag.trim().toLowerCase(),
    );
  }
}
