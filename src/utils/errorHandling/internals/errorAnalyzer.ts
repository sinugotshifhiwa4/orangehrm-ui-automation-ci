import DataSanitizer from "../../sanitization/dataSanitizer.js";
import { ErrorCacheManager } from "./errorCacheManager.js";
import type {
  ErrorDetails,
  MatcherResult,
  MatcherError,
} from "./types/error-handler.types.js";

/**
 * Extracts and sanitizes structured error metadata from unknown thrown values.
 */
export default class ErrorAnalyzer {
  private static readonly MESSAGE_PROPS = ["message"];

  /**
   * Creates an ErrorDetails object based on the given error, source, and context.
   * If the error is null or undefined, it will create an empty ErrorDetails object.
   * If the error is an Error instance, it will extract the sanitized message from the error.
   * If the error is an object, it will extract all available error details from the object.
   * The resulting ErrorDetails object will contain the source, message, timestamp, and environment.
   * Context is only included when explicitly provided.
   * @param {unknown} error - The error object to extract details from.
   * @param {string} source - The source of the error.
   * @param {string} [context] - The context of the error (omitted from output if not provided).
   * @returns {ErrorDetails}
   */
  public static createErrorDetails(
    error: unknown,
    source: string,
    context?: string,
  ): ErrorDetails {
    if (!error) {
      return this.createEmptyErrorDetails(source, context);
    }

    const message = this.getErrorMessage(error);
    const additionalDetails = this.isErrorObject(error)
      ? this.extractAllErrorDetails(error)
      : {};

    const details: ErrorDetails = {
      source,
      ...(context ? { context } : {}),
      message,
      timestamp: new Date().toISOString(),
      environment: process.env.ENV || "dev",
      ...additionalDetails,
    };

    // Explicitly remove matcherResult if it somehow made it through
    delete details.matcherResult;

    return details;
  }

  /**
   * Gets the error message from the given error object.
   * If the error object is null or undefined, it will return an empty string.
   * If the error object is an Error instance, it will return the sanitized error message.
   * If the error object is a string, it will return the sanitized error message.
   * If the error object is an object, it will return the error message extracted from the object.
   * If the error object is of any other type, it will return the string representation of the error object.
   * @param {unknown} error - The error object to get the message from.
   * @returns {string} The error message.
   */
  public static getErrorMessage(error: unknown): string {
    if (!error) return "";

    if (error instanceof Error) {
      return ErrorCacheManager.getSanitizedMessage(error.message);
    }

    if (typeof error === "string") {
      return ErrorCacheManager.getSanitizedMessage(error);
    }

    if (this.isErrorObject(error)) {
      return this.handleObjectError(error);
    }

    return JSON.stringify(error);
  }

  /**
   * Extracts all available error details from the given error object.
   * It will extract the stack trace, error type/name, and any other properties that
   * are available on the error object using DataSanitizer.
   * It will avoid duplicates and unwanted keys.
   * @param {Record<string, unknown>} error - The error object to extract details from.
   * @returns {Record<string, unknown>} The extracted error details.
   */
  private static extractAllErrorDetails(
    error: Record<string, unknown>,
  ): Record<string, unknown> {
    const details: Record<string, unknown> = {};

    // Extract stack trace
    const stack = this.getStackTrace(error);
    if (stack) details.stack = stack;

    // Extract error type/name
    const errorType = this.getErrorType(error);
    if (errorType) details.errorType = errorType;

    // Check for matcher error (Playwright/Jest)
    if (this.isMatcherError(error)) {
      Object.assign(details, this.extractMatcherDetails(error.matcherResult));
    }

    // Use DataSanitizer to get all other properties
    const sanitizedError = DataSanitizer.sanitizeErrorObject(error);

    // Skip these keys that we either already extracted or don't want
    const skipKeys = new Set([
      "name",
      "stack",
      "message",
      "constructor",
      "matcherResult",
    ]);

    // Merge sanitized properties, avoiding duplicates and unwanted keys
    for (const [key, value] of Object.entries(sanitizedError)) {
      if (!skipKeys.has(key) && !(key in details) && value != null) {
        details[key] = value;
      }
    }

    return details;
  }

  /**
   * Extracts the stack trace from the given error object if available.
   * If the error object contains a "stack" property and it's a string,
   * it will sanitize the stack trace using ErrorCacheManager and return the
   * first 2000 characters of the sanitized stack trace.
   * Otherwise, it will return undefined.
   * @param {Record<string, unknown>} error - The error object to extract the stack trace from.
   * @returns {string | undefined} The extracted stack trace or undefined if not available.
   */
  private static getStackTrace(
    error: Record<string, unknown>,
  ): string | undefined {
    if ("stack" in error && typeof error.stack === "string") {
      const sanitized = ErrorCacheManager.getSanitizedMessage(error.stack);
      return sanitized.substring(0, 2000);
    }
    return undefined;
  }

  /**
   * Retrieves the error type or name from the given error object if available.
   * If the error object is an instance of Error, it will return the error type.
   * If the error object contains a "name" property and it's a string, it will return the name.
   * Otherwise, it will return undefined.
   * @param {Record<string, unknown>} error - The error object to retrieve the type or name from.
   * @returns {string | undefined} The error type or name if available, or undefined if not available.
   */
  private static getErrorType(
    error: Record<string, unknown>,
  ): string | undefined {
    if (error instanceof Error) {
      return error.constructor.name;
    }

    if (
      "name" in error &&
      typeof error.name === "string" &&
      error.name !== "Error"
    ) {
      return error.name;
    }

    return undefined;
  }

  /**
   * Extracts details from a MatcherResult object, typically used for Playwright or Jest.
   * Includes the pass result, matcher name, expected value, received value, and log if present.
   * @param {MatcherResult} matcher - The MatcherResult object to extract details from.
   * @returns {Record<string, unknown>} An object containing the extracted details.
   */
  private static extractMatcherDetails(
    matcher: MatcherResult,
  ): Record<string, unknown> {
    const details: Record<string, unknown> = {
      pass: matcher.pass,
      matcherName: matcher.name,
    };

    if (matcher.expected !== undefined) details.expected = matcher.expected;
    if (matcher.actual !== undefined) details.received = matcher.actual;
    else if (matcher.received !== undefined)
      details.received = matcher.received;

    if ("log" in matcher && Array.isArray(matcher.log)) {
      details.log = matcher.log;
    }

    return details;
  }

  /**
   * Checks if the given error object is a MatcherError.
   * @param {unknown} error - The error object to check.
   * @returns {error is MatcherError} True if the error object is a MatcherError, false otherwise.
   */
  private static isMatcherError(error: unknown): error is MatcherError {
    return (
      this.hasProperty(error, "matcherResult") &&
      this.isValidMatcherResult(error.matcherResult)
    );
  }

  /**
   * Checks if the given matcherResult object is a valid MatcherResult.
   * @param {unknown} matcherResult - The matcherResult object to check.
   * @returns {matcherResult is MatcherResult} True if valid, false otherwise.
   */
  private static isValidMatcherResult(
    matcherResult: unknown,
  ): matcherResult is MatcherResult {
    return (
      typeof matcherResult === "object" &&
      matcherResult !== null &&
      this.hasProperty(matcherResult, "message") &&
      this.hasProperty(matcherResult, "pass") &&
      typeof matcherResult.message === "string" &&
      typeof matcherResult.pass === "boolean"
    );
  }

  /**
   * Checks if an object has a specified property.
   * @param {unknown} obj - The object to check.
   * @param {T} prop - The property to check for.
   * @returns {obj is Record<T, unknown>} True if the object has the specified property, false otherwise.
   */
  private static hasProperty<T extends PropertyKey>(
    obj: unknown,
    prop: T,
  ): obj is Record<T, unknown> {
    return typeof obj === "object" && obj !== null && prop in obj;
  }

  /**
   * Creates an empty ErrorDetails object with the given source and optional context.
   * Context key is omitted entirely when not provided.
   * @param {string} source - The source of the error.
   * @param {string} [context] - The context of the error (omitted if not provided).
   * @returns {ErrorDetails} An empty ErrorDetails object.
   */
  private static createEmptyErrorDetails(
    source: string,
    context?: string,
  ): ErrorDetails {
    return {
      source,
      ...(context ? { context } : {}),
      message: "Unknown error",
      timestamp: new Date().toISOString(),
      environment: process.env.ENV || "dev",
    };
  }

  /**
   * Checks if the given error object is an object.
   * @param {unknown} error - The error object to check.
   * @returns {error is Record<string, unknown>} True if the error object is an object, false otherwise.
   */
  private static isErrorObject(
    error: unknown,
  ): error is Record<string, unknown> {
    return error !== null && typeof error === "object";
  }

  /**
   * Handles an error object by extracting the error message from it.
   * @param {Record<string, unknown>} error - The error object to extract the error message from.
   * @returns {string} The extracted error message or a fallback error message if not available.
   */
  private static handleObjectError(error: Record<string, unknown>): string {
    for (const prop of this.MESSAGE_PROPS) {
      const value = error[prop];
      if (typeof value === "string" && value.trim()) {
        return ErrorCacheManager.getSanitizedMessage(value);
      }
    }

    return this.stringifyErrorObject(error);
  }

  /**
   * Stringifies an error object into a JSON string.
   * @param {Record<string, unknown>} errorObj - The error object to stringify.
   * @returns {string} The stringified error object or a fallback error message.
   */
  private static stringifyErrorObject(
    errorObj: Record<string, unknown>,
  ): string {
    try {
      const stringified = JSON.stringify(errorObj);
      return stringified === "{}" ? "Empty object" : stringified;
    } catch {
      return "Object with circular references";
    }
  }
}
