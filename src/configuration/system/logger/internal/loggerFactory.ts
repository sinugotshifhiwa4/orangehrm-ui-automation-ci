import winston, { format } from "winston";
import { DateTime } from "luxon";
import path from "path";
import * as fs from "fs";
import { winstonLoggerConfig, type LogLevel } from "./logger.config.js";
import type { EnvironmentStage } from "../../environment/constants/environment.constants.js";

export default class LoggerFactory {
  private static directoryEnsured = false;

  /**
   * Creates a winston logger instance with the specified log level, and transports for logging to files and the console.
   * The logger is configured to log exceptions and rejections to separate files.
   * The log files are created in the log directory specified in winstonLoggerConfig.logDirectory.
   * If the log directory does not exist, it will be created recursively.
   * @returns A winston logger instance.
   */
  public static createLogger(): winston.Logger {
    this.ensureLogDirectoryExists();

    const fileTransports = this.createFileTransports();

    return winston.createLogger({
      level: winstonLoggerConfig.logLevels.debug,
      transports: [
        ...Object.values(fileTransports),
        this.createConsoleTransport(),
      ],
      exceptionHandlers: [this.createCustomHandler("exceptions.log")],
      rejectionHandlers: [this.createCustomHandler("rejections.log")],
    });
  }

  /**
   * Ensures that the log directory specified in winstonLoggerConfig.logDirectory exists.
   * If the directory does not exist, it will be created recursively.
   * If there is an error while creating the directory, an error will be thrown.
   */
  public static ensureLogDirectoryExists(): void {
    if (this.directoryEnsured) return;

    const directory = winstonLoggerConfig.logDirectory;

    try {
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
      this.directoryEnsured = true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `Failed to create log directory at ${directory}: ${errorMessage}`,
      );
    }
  }

  /**
   * Creates a record of winston.FileTransportInstance objects, where each key is a log level
   * (e.g. "debug", "info", "warn", "error"), and each value is a winston.FileTransportInstance
   * created by the createTransport method. The createTransport method is called with the log level
   * and the corresponding filename from winstonLoggerConfig.logFilePaths.
   * @returns A record of winston.FileTransportInstance objects, where each key is a log level, and each value is a winston.FileTransportInstance created by the createTransport method.
   */
  private static createFileTransports() {
    const baseConfig = this.createBaseTransportConfig();
    const createTransport = this.createTransportFactory(baseConfig);

    return this.createLogLevelTransports(createTransport);
  }

  /**
   * Returns a base configuration for a winston.File transport.
   * The configuration includes the maximum file size, timestamp format, and custom format.
   * @returns {Object} A base configuration for a winston.File transport.
   */
  private static createBaseTransportConfig() {
    return {
      maxsize: winstonLoggerConfig.logFileLimit,
      timestampFormat: this.customTimestampFormat(),
      customFormat: this.logCustomFormat(),
    };
  }

  /**
   * Factory function for creating a winston.File transport.
   * @param baseConfig Base configuration for the transport.
   * @returns A function that creates a winston.File transport given a log level and filename.
   */
  private static createTransportFactory(
    baseConfig: ReturnType<typeof this.createBaseTransportConfig>,
  ) {
    return (level: LogLevel, filename: string) =>
      new winston.transports.File({
        maxsize: baseConfig.maxsize,
        filename: this.resolvePath(filename),
        level,
        format: this.createCombinedFormat(level, baseConfig),
      });
  }

  /**
   * Creates a winston Logform.Format that combines the level filter with the base configuration.
   * The level filter is created by the levelFilter method, and the base configuration
   * is created by the createBaseTransportConfig method.
   * The resulting format is a combination of the level filter, uncolorization, timestamp format, and custom format.
   * @param level The log level to filter for.
   * @param baseConfig The base configuration to combine with the level filter.
   * @returns A winston Logform.Format that combines the level filter with the base configuration.
   */
  private static createCombinedFormat(
    level: LogLevel,
    baseConfig: ReturnType<typeof this.createBaseTransportConfig>,
  ): winston.Logform.Format {
    return winston.format.combine(
      this.levelFilter(level),
      winston.format.uncolorize(),
      baseConfig.timestampFormat,
      baseConfig.customFormat,
    );
  }

  /**
   * Creates a record of winston FileTransportInstance objects, where each key is a log level
   * (e.g. "debug", "info", "warn", "error"), and each value is a winston FileTransportInstance
   * created by the createTransport method. The createTransport method is called with the log level
   * and the corresponding filename from winstonLoggerConfig.logFilePaths.
   * @param createTransport A function that takes a log level and a filename, and returns a winston FileTransportInstance.
   * @returns A record of winston FileTransportInstance objects, where each key is a log level, and each value is a winston FileTransportInstance created by the createTransport method.
   */
  private static createLogLevelTransports(
    createTransport: (
      level: LogLevel,
      filename: string,
    ) => winston.transports.FileTransportInstance,
  ) {
    const transports = {} as Record<
      keyof typeof winstonLoggerConfig.logLevels,
      winston.transports.FileTransportInstance
    >;

    for (const key of Object.keys(winstonLoggerConfig.logLevels) as Array<
      keyof typeof winstonLoggerConfig.logLevels
    >) {
      transports[key] = createTransport(
        winstonLoggerConfig.logLevels[key],
        winstonLoggerConfig.logFilePaths[key],
      );
    }

    return transports;
  }

  /**
   * Creates a winston ConsoleTransportInstance with a level and format
   * determined by the environment. The level is determined by the getConsoleLogLevel
   * method, and the format is determined by the createConsoleFormat method.
   * @returns {winston.transports.ConsoleTransportInstance} A winston ConsoleTransportInstance with a level and format determined by the environment.
   */
  private static createConsoleTransport(): winston.transports.ConsoleTransportInstance {
    const environment = (process.env.ENV as EnvironmentStage) || "dev";

    return new winston.transports.Console({
      level: this.getConsoleLogLevel(environment),
      format: this.createConsoleFormat(),
    });
  }

  /**
   * A winston Logform.Format that formats log messages with colored levels and timestamps.
   * The format is as follows: `${timestamp} [${level}]: ${message}`
   * where timestamp is the timestamp of the log message according to the winstonLoggerConfig.dateFormat and winstonLoggerConfig.timeZone,
   * level is the log level of the message, colored according to the winstonLoggerConfig.logLevels,
   * and message is the log message itself.
   * @returns {winston.Logform.Format} A winston Logform.Format that formats log messages with colored levels and timestamps.
   */
  private static createConsoleFormat(): winston.Logform.Format {
    return winston.format.combine(
      this.customTimestampFormat(),
      winston.format.colorize({
        colors: {
          error: "red",
          warn: "yellow",
          info: "green",
          debug: "magenta",
        },
      }),
      this.logCustomFormatColored(),
    );
  }

  /**
   * Creates a custom winston transport for logging to a file.
   * The transport is configured to write logs to a file with the specified filename.
   * The file path is resolved relative to the log directory specified in the winston logger configuration.
   * The transport is also configured to use the uncolorized log format.
   * @param filename The filename of the log file to write to.
   * @returns A winston transport instance for logging to a file.
   */
  private static createCustomHandler(filename: string) {
    return new winston.transports.File({
      filename: this.resolvePath(filename),
      format: this.createUncolorizedFormat(),
    });
  }

  /**
   * Returns a winston Logform.Format that combines uncolorization with the custom timestamp and log message formats.
   * This format is used for logging exceptions and rejections to files.
   * @returns {winston.Logform.Format} A winston Logform.Format that combines uncolorization with the custom timestamp and log message formats.
   */
  private static createUncolorizedFormat(): winston.Logform.Format {
    return winston.format.combine(
      winston.format.uncolorize(),
      this.customTimestampFormat(),
      this.logCustomFormat(),
    );
  }

  /**
   * Returns the log level that should be used for console logging based on the environment.
   * The log level is determined by a mapping of environment to log level.
   * If the environment is not found in the mapping, the default log level is used.
   * @param {EnvironmentStage} environment The environment to determine the log level for.
   * @returns {LogLevel} The log level to use for console logging in the given environment.
   */
  private static getConsoleLogLevel(environment: EnvironmentStage): LogLevel {
    const levelMap: Record<EnvironmentStage, LogLevel> = {
      dev: winstonLoggerConfig.logLevels.debug,
      qa: winstonLoggerConfig.logLevels.debug,
      uat: winstonLoggerConfig.logLevels.info,
      preprod: winstonLoggerConfig.logLevels.warn,
      prod: winstonLoggerConfig.logLevels.error,
    };

    return levelMap[environment] ?? winstonLoggerConfig.logLevels.debug;
  }

  /**
   * A winston Logform.Format that filters log messages based on their level.
   * @param {LogLevel} level The log level to filter by.
   * @returns {winston.Logform.Format} A winston Logform.Format that filters log messages based on their level.
   */
  private static levelFilter(level: LogLevel): winston.Logform.Format {
    return format((info) => (info.level === level ? info : false))();
  }

  /**
   * A winston Logform.Format that formats log messages with timestamps and colored levels.
   * The format is as follows: `${timestamp} [${level}]: ${message}`
   * where timestamp is the timestamp of the log message according to the winstonLoggerConfig.dateFormat and winstonLoggerConfig.timeZone,
   * level is the log level of the message, and message is the log message itself.
   * The level is colored according to the winstonLoggerConfig.logLevels.
   * @returns {winston.Logform.Format} A winston Logform.Format that formats log messages with timestamps and colored levels.
   */
  private static logCustomFormat(): winston.Logform.Format {
    return winston.format.printf(
      ({ level, message, timestamp }: winston.Logform.TransformableInfo) =>
        `${timestamp as string} [${level}]: ${message as string}`,
    );
  }

  /**
   * A winston Logform.Format that formats log messages with colored levels.
   * The format is as follows: `${timestamp} [${level}]: ${message}`
   * where timestamp is the timestamp of the log message according to the winstonLoggerConfig.dateFormat and winstonLoggerConfig.timeZone,
   * level is the log level of the message, and message is the log message itself.
   * The level is colored according to the winstonLoggerConfig.logLevels.
   * @returns {winston.Logform.Format} A winston Logform.Format that formats log messages with colored levels.
   */
  private static logCustomFormatColored(): winston.Logform.Format {
    return winston.format.printf(
      (info: winston.Logform.TransformableInfo) =>
        `${info.timestamp as string} [${info.level}]: ${info.message as string}`,
    );
  }

  /**
   * Creates a winston Logform.Format that formats timestamps according to the winstonLoggerConfig.dateFormat and winstonLoggerConfig.timeZone.
   * @returns {winston.Logform.Format} A winston Logform.Format that formats timestamps according to the winstonLoggerConfig.dateFormat and winstonLoggerConfig.timeZone.
   */
  private static customTimestampFormat(): winston.Logform.Format {
    return winston.format.timestamp({
      format: () =>
        DateTime.now()
          .setZone(winstonLoggerConfig.timeZone)
          .toFormat(winstonLoggerConfig.dateFormat),
    });
  }

  /**
   * Resolve the full path of a log file based on the given fileName and winstonLoggerConfig.logDirectory.
   * @param {string} fileName - The name of the log file.
   * @returns {string} The full path of the log file.
   */
  private static resolvePath(fileName: string): string {
    return path.join(winstonLoggerConfig.logDirectory, fileName);
  }
}
