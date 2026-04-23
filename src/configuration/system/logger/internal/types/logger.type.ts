/**
 * Logger configuration interface defining the structure of the logger settings.
 * This includes settings for log file limits, time zone, date format, log levels,
 * log file paths, and the log directory.
 */
export interface LoggerConfig {
  readonly logFileLimit: number;
  readonly timeZone: string;
  readonly dateFormat: string;
  readonly logLevels: Record<string, string>;
  readonly logFilePaths: Record<string, string>;
  readonly logDirectory: string;
}
