import path from "path";
import type { LoggerConfig } from "./types/logger.type.js";

/**
 * Winston logger configuration object that adheres to the LoggerConfig interface.
 * This configuration includes settings for log file limits, time zone, date format,
 * log levels, log file paths, and the log directory. The log levels and file paths
 * are defined as constant objects to ensure type safety and consistency across the application.
 */
const _logLevels = {
  debug: "debug",
  info: "info",
  error: "error",
  warn: "warn",
} as const;

/**
 * Log file paths for different log levels, defined as a constant object to ensure type safety and consistency across the application.
 */
const _logFilePaths = {
  debug: "debug.log",
  info: "info.log",
  error: "error.log",
  warn: "warn.log",
} as const;

/**
 * Winston logger configuration object that adheres to the LoggerConfig interface.
 * This configuration includes settings for log file limits, time zone, date format,
 * log levels, log file paths, and the log directory.
 */
export const winstonLoggerConfig = {
  logFileLimit: 10 * 1024 * 1024,
  timeZone: "Africa/Johannesburg",
  dateFormat: "yyyy-MM-dd'T'HH:mm:ssZZ",
  logLevels: _logLevels,
  logFilePaths: _logFilePaths,
  logDirectory: path.resolve(process.cwd(), "logs"),
} satisfies LoggerConfig;

// Exporting types for log levels and log file paths based on the defined constant objects to ensure type safety and consistency across the application.
export type LogLevel = (typeof _logLevels)[keyof typeof _logLevels];

// Exporting type for log file paths based on the defined constant object to ensure type safety and consistency across the application.
export type LogFilePath = (typeof _logFilePaths)[keyof typeof _logFilePaths];
