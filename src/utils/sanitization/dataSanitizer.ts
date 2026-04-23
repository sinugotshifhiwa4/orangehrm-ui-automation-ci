import {
  DEFAULTMASKED_FIELDS,
  KEY_PATTERNS,
  MASK_PLACEHOLDER,
  type SanitizationParams,
} from "./internals/sanitization.config.js";

/**
 * Sanitizes runtime values and objects before they are logged or surfaced in error details.
 */
export default class DataSanitizer {
  /**
   * Default sanitization parameters used when no custom configuration is provided.
   */
  private static defaultParams: SanitizationParams = {
    sensitiveKeys: DEFAULTMASKED_FIELDS,
    maskValue: MASK_PLACEHOLDER,
    enablePatternDetection: true,
    maxDepth: 10,
  };

  /**
   * Sanitizes the given data object by recursively iterating over all its
   * properties and applying transformations for sensitive data masking.
   */
  public static sanitize<T>(data: T, config?: Partial<SanitizationParams>): T {
    const finalConfig = this.mergeConfig(config);
    return this.processValue(data, finalConfig);
  }

  /**
   * Sanitizes a specific field value based on field name sensitivity.
   */
  public static sanitizeFieldValue(
    fieldName: string,
    value: string,
    config?: Partial<SanitizationParams>,
  ): { displayValue: string; isSensitive: boolean } {
    const finalConfig = this.mergeConfig(config);
    const isSensitive = this.isSensitiveKey(
      fieldName,
      finalConfig.sensitiveKeys,
    );

    return {
      displayValue: isSensitive ? finalConfig.maskValue : value,
      isSensitive,
    };
  }

  /**
   * Sanitizes an error object by removing sensitive data and stack traces.
   */
  public static sanitizeErrorObject(
    obj: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!obj) return {};

    const { stack: _stack, ...objWithoutStack } = obj;
    return this.sanitize(objWithoutStack, { enablePatternDetection: false });
  }

  /**
   * Sanitizes a string by removing ANSI escape sequences and special characters.
   */
  public static sanitizeString(value: string): string {
    if (!this.isValidString(value)) return "";

    return value
      .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, "")
      .replace(/["'\\<>]/g, "")
      .trim();
  }

  // Private helper methods

  /**
   * Merges the given configuration object with the default sanitization configuration.
   * If no configuration object is provided, it will return the default sanitization configuration.
   * If a configuration object is provided, it will merge the provided configuration object with
   * the default sanitization configuration and return the merged configuration object.
   * @param {Partial<SanitizationParams>} [config] - The sanitization configuration object to merge.
   * @returns {SanitizationParams} The merged sanitization configuration object.
   */
  private static mergeConfig(
    config?: Partial<SanitizationParams>,
  ): SanitizationParams {
    return { ...this.defaultParams, ...config };
  }

  /**
   * Checks if the given value is a valid string (i.e. typeof value is "string" and value.length > 0).
   * @param {unknown} value - The value to check.
   * @returns {value is string} - Whether the given value is a valid string.
   */
  private static isValidString(value: unknown): value is string {
    return typeof value === "string" && value.length > 0;
  }

  /**
   * Sanitizes a primitive value by removing sensitive data if pattern detection is enabled.
   * If the value is not a string, it will be returned as is.
   * If the value contains sensitive patterns and pattern detection is enabled,
   * it will replace the entire value with the configured mask value.
   * @param {T} data - The primitive value to sanitize.
   * @param {SanitizationParams} config - The sanitization configuration.
   * @returns {T} The sanitized primitive value.
   */
  private static processPrimitive<T>(data: T, config: SanitizationParams): T {
    if (!this.isValidString(data)) return data;

    // Pattern detection for sensitive data
    if (config.enablePatternDetection && this.containsSensitivePattern(data)) {
      return config.maskValue as unknown as T;
    }

    return data;
  }

  /**
   * Recursively sanitizes an object, array, or primitive value based on the given configuration.
   * Performs depth and circular reference checks to prevent infinite recursion.
   * If the value is an object, it will be sanitized using the processObject method.
   * If the value is an array, it will be sanitized using the processArray method.
   * If the value is a primitive, it will be sanitized using the processPrimitive method.
   * @param {T} data - The value to sanitize.
   * @param {SanitizationParams} config - The sanitization configuration.
   * @param {number} [depth=0] - The current depth of the object.
   * @param {WeakSet<object>} [seen=new WeakSet()] - A set of objects that have been seen during sanitization.
   * @param {string} [path=""] - The path of the object being sanitized.
   * @returns {T} The sanitized value.
   */
  private static processValue<T>(
    data: T,
    config: SanitizationParams,
    depth: number = 0,
    seen: WeakSet<object> = new WeakSet(),
    path: string = "",
  ): T {
    // Depth and circular reference checks
    if (depth > config.maxDepth) return data;
    if (data === null || data === undefined || typeof data !== "object") {
      return this.processPrimitive(data, config);
    }
    if (seen.has(data)) {
      return "[Circular]" as unknown as T;
    }

    seen.add(data);

    // Handle arrays and objects
    if (Array.isArray(data)) {
      return this.processArray(data, config, depth, seen, path);
    }
    return this.processObject(data, config, depth, seen, path);
  }

  /**
   * Recursively sanitizes an array by processing each item in the array.
   * Skips items that are not objects or have been seen before to prevent circular reference checks.
   * If the item is an object, it will be sanitized using the processObject method.
   * If the item is not an object, it will be sanitized using the processPrimitive method.
   * @param {T} data - The array to sanitize.
   * @param {SanitizationParams} config - The sanitization configuration.
   * @param {number} depth - The current depth of the array.
   * @param {WeakSet<object>} seen - A set of objects that have been seen during sanitization.
   * @param {string} path - The path of the array being sanitized.
   * @returns {T} The sanitized array.
   */
  private static processArray<T>(
    data: T,
    config: SanitizationParams,
    depth: number,
    seen: WeakSet<object>,
    path: string,
  ): T {
    const array = data as unknown[];
    const sanitizedArray = array.map((item, i) => {
      const itemPath = `${path}[${i}]`;
      return this.processValue(item, config, depth + 1, seen, itemPath);
    });

    return sanitizedArray as unknown as T;
  }

  /**
   * Sanitizes an object by recursively iterating over all its properties and applying
   * transformations for sensitive data masking.
   * @param {T} data - The object to sanitize.
   * @param {SanitizationParams} config - The sanitization configuration.
   * @param {number} depth - The current depth of the object.
   * @param {WeakSet<object>} seen - A set of objects that have been seen during sanitization.
   * @param {string} path - The path of the object being sanitized.
   * @returns {T} The sanitized object.
   */
  private static processObject<T>(
    data: T,
    config: SanitizationParams,
    depth: number,
    seen: WeakSet<object>,
    path: string,
  ): T {
    const result = { ...data } as Record<string, unknown>;

    for (const [key, value] of Object.entries(result)) {
      const keyPath = path ? `${path}.${key}` : key;

      if (this.isSensitiveKey(key, config.sensitiveKeys)) {
        result[key] = config.maskValue;
      } else {
        result[key] = this.processValue(
          value,
          config,
          depth + 1,
          seen,
          keyPath,
        );
      }
    }

    return result as T;
  }

  /**
   * Checks if a given key is a sensitive key based on the provided sensitive keys array.
   * Sensitive keys are checked in a case-insensitive manner.
   * @param {string} key - The key to check.
   * @param {string[]} sensitiveKeys - An array of sensitive keys to check against.
   * @returns {boolean} - Whether the key is a sensitive key or not.
   */
  private static isSensitiveKey(key: string, sensitiveKeys: string[]): boolean {
    const lowerKey = key.toLowerCase();
    return sensitiveKeys.some(
      (sensitiveKey) => lowerKey === sensitiveKey.toLowerCase(),
    );
  }

  /**
   * Checks if the given string contains any sensitive patterns (e.g. JWT tokens, Base64 encoded strings, etc.).
   * This function is used to determine if a string should be sanitized or not.
   * @param {string} value - The string to check for sensitive patterns.
   * @returns {boolean} - Whether the string contains any sensitive patterns.
   */
  private static containsSensitivePattern(value: string): boolean {
    return KEY_PATTERNS.some((pattern) => pattern.test(value));
  }
}
