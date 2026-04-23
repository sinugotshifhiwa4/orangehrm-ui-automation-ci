import { RegexPatterns } from "./regexPatterns.js";

/**
 * Deduplicates repeated errors and caches sanitized messages to reduce noisy logging.
 */
export class ErrorCacheManager {
  private static readonly sanitizedMessages = new Map<string, string>();
  private static readonly loggedErrors = new Set<string>();
  private static readonly MAX_CACHE_SIZE = 5000;
  private static readonly EVICTION_RATIO = 0.4;

  /**
   * Sanitizes an error message by removing ANSI escape sequences,
   * special characters, error prefixes, and trimming the message.
   * If the sanitized message is already cached, it returns the cached value.
   * Otherwise, it sanitizes the message and caches the result.
   * The cache has a maximum size to prevent memory leaks.
   *
   * @param {string} originalMessage - The error message to sanitize.
   * @returns {string} - The sanitized error message.
   */
  public static getSanitizedMessage(originalMessage: string): string {
    if (!originalMessage) return "";

    const cached = this.sanitizedMessages.get(originalMessage);
    if (cached !== undefined) return cached;

    const message: string = originalMessage || "";
    const sanitized =
      message
        .replace(RegexPatterns.ANSI_ESCAPE, "")
        .replace(RegexPatterns.SANITIZE_CHARS, "")
        .replace(RegexPatterns.ERROR_PREFIX, "")
        .trim()
        .split("\n")[0] || "".substring(0, 500);

    if (this.sanitizedMessages.size < this.MAX_CACHE_SIZE) {
      this.sanitizedMessages.set(originalMessage, sanitized);
    }

    return sanitized;
  }

  /**
   * Determines whether an error should be logged or not.
   * It checks if the error is already logged in the cache and
   * if the cache has reached its maximum size, it evicts old entries.
   * If the error is not cached and the cache is not full, it adds the error to the cache
   * and returns true. Otherwise, it returns false.
   *
   * @param {unknown} error - The error to check.
   * @returns {boolean} - Whether the error should be logged.
   */
  public static shouldLogError(error: unknown): boolean {
    const errorKey = this.generateErrorKey(error);

    if (this.loggedErrors.has(errorKey)) return false;

    if (this.loggedErrors.size >= this.MAX_CACHE_SIZE) {
      this.evictOldEntries();
    }

    this.loggedErrors.add(errorKey);
    return true;
  }

  /**
   * Evicts old entries from the logged errors cache.
   * It calculates the number of entries to remove based on the eviction ratio
   * and removes the oldest entries from the cache.
   */
  private static evictOldEntries(): void {
    const entriesToRemove = Math.floor(
      this.loggedErrors.size * this.EVICTION_RATIO,
    );
    const iterator = this.loggedErrors.values();

    for (let i = 0; i < entriesToRemove; i++) {
      const entry = iterator.next();
      if (!entry.done) {
        this.loggedErrors.delete(entry.value);
      }
    }
  }

  /**
   * Generates a unique string key for an error by hashing its stack and/or message.
   * If the error is not an instance of Error, it hashes the JSON stringified representation of the error.
   * @param {unknown} error - The error to generate a key for.
   * @returns {string} - The unique key for the error.
   */
  private static generateErrorKey(error: unknown): string {
    if (error instanceof Error) {
      return this.hashString(error.stack || `${error.name}:${error.message}`);
    }

    const errorString =
      typeof error === "string" ? error : JSON.stringify(error);
    return this.hashString(errorString);
  }

  /**
   * Hashes a string into a unique integer value.
   * This is a simple JavaScript implementation of the FNV-1a hash algorithm.
   * @param {string} str - The string to hash.
   * @returns {string} - The hashed string representation.
   */
  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff;
    }
    return hash.toString();
  }

  /**
   * Clears all sanitized messages and logged errors from the cache.
   * This is useful when rotating environment secrets, as it ensures that any
   * previously logged errors or sanitized messages are no longer associated with the
   * old secrets.
   */
  public static clearAll(): void {
    this.sanitizedMessages.clear();
    this.loggedErrors.clear();
  }
}
