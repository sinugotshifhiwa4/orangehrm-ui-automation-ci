/**
 * Provides consistent date and identifier formatting helpers for logs and test data.
 */
export default class DateFormatter {
  /**
   * Returns a string representing the current local time in the format of 'YYYY-MM-DD HH:MM:SS'.
   *
   * @example
   * const currentTime = DateFormatter.formatLocalTime();
   * logger.info(currentTime); // '2022-07-22 14:30:00'
   * @returns {string} A string representing the current local time.
   */
  public static formatLocalTime(): string {
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0"),
    ].join("");
  }

  /**
   * Formats a given date into a string in the format of 'YYYY-MM-DD HH:MM:SS'.
   * @param {Date} date - The date to be formatted.
   * @returns {string} - The formatted date string.
   */
  public static formatDate(date: Date): string {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
      String(date.getHours()).padStart(2, "0"),
      String(date.getMinutes()).padStart(2, "0"),
      String(date.getSeconds()).padStart(2, "0"),
    ].join("");
  }

  /**
   * Generates a unique identifier based on the current timestamp.
   * @param {string} [prefix='IT'] - Optional prefix to be appended to the generated ID.
   * @returns {string} - The generated ID in the format of `<prefix>-<timestamp>`.
   */
  public static generateId(prefix: string = "IT"): string {
    return `${prefix}-${this.formatLocalTime()}`;
  }
}
