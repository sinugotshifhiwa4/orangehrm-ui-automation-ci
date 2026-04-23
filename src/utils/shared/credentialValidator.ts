import ErrorHandler from "../errorHandling/errorHandler.js";

type CredentialField = "username" | "password";

/**
 * Guards against unresolved credential placeholders being used in runtime login flows.
 */
export default class CredentialValidator {
  /**
   * Matches unresolved env placeholder values such as `portal.admin.username`.
   */
  private static PLACEHOLDER_PATTERN =
    /^portal\.(admin|general)\.(username|password)$/;

  /**
   * Validates that a credential value is not an unresolved placeholder.
   *
   * Detects values matching the pattern `portal.<role>.<field>` (e.g. `portal.general.username`,
   * `portal.admin.password`) and throws an error prompting the user to update their credentials.
   *
   * @param context - The calling method identifier used for error tracing (e.g. `"LoginPage.fillUsernameInput"`).
   * @param field - The credential field being validated (`"username"` or `"password"`).
   * @param value - The credential value to check.
   * @throws If the value matches the placeholder pattern.
   */
  public static validateNotPlaceholder(
    context: string,
    field: CredentialField,
    value: string,
  ): void {
    if (this.PLACEHOLDER_PATTERN.test(value)) {
      ErrorHandler.logAndThrow(
        context,
        `${this.capitalize(field)} is still a placeholder ("${value}"). Update env credentials.`,
      );
    }
  }

  /**
   * Capitalizes the first letter of a string.
   *
   * @param value - The string to capitalize.
   * @returns The input string with its first character uppercased.
   */
  private static capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
