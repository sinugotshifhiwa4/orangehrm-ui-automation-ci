import type { ErrorDetails } from "./internals/types/error-handler.types.js";
import ErrorAnalyzer from "./internals/errorAnalyzer.js";
import { ErrorCacheManager } from "./internals/errorCacheManager.js";
import logger from "../../configuration/system/logger/loggerManager.js";

export default class ErrorHandler {
  /**
   * Captures an error and logs it in a structured format.
   * If the error is not an instance of Error, or if the error has already been logged,
   * this function will return without doing anything.
   * If the error cannot be logged (e.g. because it contains sensitive data),
   * it will log the error with the prefix "Error Handler Failure".
   * @param {unknown} error - The error to log.
   * @param {string} source - The source of the error (e.g. the component or function name).
   * @param {string} [context] - The context of the error. Omitted from output if not provided.
   */
  public static captureError(
    error: unknown,
    source: string,
    context?: string,
  ): void {
    if (!error || !ErrorCacheManager.shouldLogError(error)) return;

    try {
      const details = ErrorAnalyzer.createErrorDetails(error, source, context);
      this.logStructuredError(details);
    } catch (loggingError) {
      this.handleLoggingFailure(loggingError, source);
    }
  }

  /**
   * Logs an error and then throws it.
   * This is useful for enforcing error handling in critical parts of the codebase.
   * @param {string} source - The source of the error (e.g. the component or function name).
   * @param {string} message - The error message to log and throw.
   */
  public static logAndThrow(source: string, message: string): never {
    const error = new Error(message);
    this.captureError(error, source);
    throw error;
  }

  /**
   * Logs an error with a structured format.
   * This is useful for tracking errors in a structured format that can be easily parsed by log analysis tools.
   * @param {string} source - The source of the error (e.g. the component or function name).
   * @param {string} message - The error message to log.
   */
  public static log(source: string, message: string): void {
    const error = new Error(message);
    this.captureError(error, source);
  }

  /**
   * Clears all sanitized messages and logged errors from the cache.
   * This is useful when rotating environment secrets, as it ensures that any
   * previously logged errors or sanitized messages are no longer associated with the
   * old secrets.
   */
  public static clearErrorCache(): void {
    ErrorCacheManager.clearAll();
  }

  /**
   * Logs an error as a structured JSON object.
   * If there is an error while logging, it will fall back to logging to the console.
   * @param {ErrorDetails} details - The error details to log.
   */
  private static logStructuredError(details: ErrorDetails): void {
    try {
      logger.error(JSON.stringify(details, null, 2));
    } catch {
      console.error("Error:", details);
    }
  }

  /**
   * Handles an error that occurs while logging an error.
   * Falls back to logging to the console if the logger itself fails.
   * Note: context is always set to "Error Handler Failure" for these internal failures.
   * @param {unknown} loggingError - The error that occurred while logging the original error.
   * @param {string} source - The source of the error (e.g. the component or function name).
   */
  private static handleLoggingFailure(
    loggingError: unknown,
    source: string,
  ): void {
    const fallbackError = {
      source,
      context: "Error Handler Failure",
      message: ErrorAnalyzer.getErrorMessage(loggingError),
      timestamp: new Date().toISOString(),
    };

    try {
      logger.error(fallbackError);
    } catch {
      console.error("ErrorHandler failure:", fallbackError);
    }
  }
}
