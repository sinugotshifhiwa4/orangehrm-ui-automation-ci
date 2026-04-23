/**
 * Shared regular expressions used across error sanitization and normalization flows.
 */
export class RegexPatterns {
  /**
   * Matches ANSI escape sequences used for terminal colors and formatting.
   * Pattern: ESC[ followed by optional numeric/semicolon parameters and a letter.
   * @example "\u001b[31m" (red text), "\u001b[0m" (reset)
   */
  public static readonly ANSI_ESCAPE = /\u001b\[[0-9;]*[a-zA-Z]/g;

  /**
   * Matches potentially dangerous characters that should be sanitized in user input.
   * Includes double quotes, single quotes, backslashes, and angle brackets.
   */
  public static readonly SANITIZE_CHARS = /["'\\<>]/g;

  /**
   * Matches common JavaScript error type prefixes at the start of error messages.
   * Captures Error, TypeError, ReferenceError, SyntaxError, RangeError, and URIError.
   */
  public static readonly ERROR_PREFIX =
    /^(Error|TypeError|ReferenceError|SyntaxError|RangeError|URIError): /;
}
