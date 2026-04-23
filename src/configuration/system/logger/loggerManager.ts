import type winston from "winston";
import WinstonLoggerFactory from "./internal/loggerFactory.js";

/**
 * Centralized logger management with singleton pattern.
 * Ensures a single Winston logger instance is shared across the application.
 */
class LoggerManager {
  private static instance: winston.Logger | null = null;
  private static isInitializing = false;

  /**
   * Returns the singleton logger instance.
   * Lazily initializes the logger on first access.
   *
   * @throws {Error} If logger initialization fails
   * @returns {winston.Logger} The configured Winston logger instance
   */
  public static getLogger(): winston.Logger {
    if (this.instance) {
      return this.instance;
    }

    if (this.isInitializing) {
      throw new Error(
        "Logger is currently being initialized. Avoid circular dependencies.",
      );
    }

    try {
      this.isInitializing = true;
      this.instance = WinstonLoggerFactory.createLogger();
      return this.instance;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to initialize logger: ${errorMessage}`);
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Resets the logger instance.
   * Useful for testing or when logger reconfiguration is needed.
   *
   * @internal Use with caution in production code
   */
  public static resetLogger(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
  }
}

/**
 * Pre-initialized logger instance for convenient import.
 * Usage: `import logger from './loggerManager.js'`
 */
export default LoggerManager.getLogger();

/**
 * Export the LoggerManager class for advanced use cases.
 * Allows manual control over logger lifecycle if needed.
 */
export { LoggerManager };
