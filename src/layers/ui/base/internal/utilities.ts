import type { RandomStringOptions } from "./types/pageActions.js";

export class Utilities {
  /**
   * Creates a random string with configurable options
   * @param length The length of the random string to create
   * @param options Configuration options for string generation
   * @returns A random string
   *
   * @example
   * // Basic usage (alphanumeric)
   * const basic = utils.createRandomString(10);
   *
   * @example
   * // With specific character sets
   * const passwordSafe = utils.createRandomString(12, {
   *   includeUppercase: true,
   *   includeLowercase: true,
   *   includeNumbers: true,
   *   includeSpecial: false
   * });
   *
   * @example
   * // With prefix/suffix for test data
   * const testEmail = utils.createRandomString(8, {
   *   includeLowercase: true,
   *   includeNumbers: true,
   *   suffix: '@example.com'
   * });
   *
   * @example
   * // For password generation
   * const strongPassword = utils.createRandomString(16, {
   *   includeUppercase: true,
   *   includeLowercase: true,
   *   includeNumbers: true,
   *   includeSpecial: true
   * });
   */
  public createRandomString(
    length: number,
    options?: RandomStringOptions,
  ): string {
    const config = this.applyDefaultOptions(options);
    const characterSet = this.buildCharacterSet(config);
    const randomPart = this.generateRandomCharacters(length, characterSet);
    return this.constructFullString(config.prefix, randomPart, config.suffix);
  }

  // === Private Helpers ===

  /**
   * Applies default options to a partially provided options object.
   * If a key is not provided in the options object, the default value will be used.
   * @param options A partially provided options object
   * @returns A fully populated options object with default values applied
   */
  private applyDefaultOptions(
    options?: Partial<RandomStringOptions>,
  ): Required<RandomStringOptions> {
    return {
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSpecial: false,
      prefix: "",
      suffix: "",
      ...options,
    };
  }

  /**
   * Builds a character set based on the provided options.
   * @param config The character set options.
   * @returns A string containing the character set.
   * @private
   */
  private buildCharacterSet(config: Required<RandomStringOptions>): string {
    let chars = "";
    if (config.includeUppercase) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (config.includeLowercase) chars += "abcdefghijklmnopqrstuvwxyz";
    if (config.includeNumbers) chars += "0123456789";
    if (config.includeSpecial) chars += "!@#$%^&*()-_=+[]{}|;:,.<>?";

    // Fallback to alphanumeric if none selected
    return (
      chars || "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    );
  }

  /**
   * Generates a random string of a given length from a given set of characters
   * @param length The length of the string to generate
   * @param characters The set of characters to use for generation
   * @returns A random string of the given length from the given set of characters
   * @example
   * // Generate a random alphanumeric string of length 12
   * const alphanumeric = utils.generateRandomCharacters(12, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
   */
  private generateRandomCharacters(length: number, characters: string): string {
    return Array.from({ length }, () =>
      characters.charAt(Math.floor(Math.random() * characters.length)),
    ).join("");
  }

  /**
   * Constructs a full string by concatenating the prefix, core, and suffix
   * @param prefix The prefix to add to the beginning of the string
   * @param core The core string to concatenate
   * @param suffix The suffix to add to the end of the string
   * @returns The fully constructed string
   */
  private constructFullString(
    prefix: string,
    core: string,
    suffix: string,
  ): string {
    return `${prefix}${core}${suffix}`;
  }
}
