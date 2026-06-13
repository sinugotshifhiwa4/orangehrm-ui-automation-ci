/**
 * logger.ts
 * Creates a pre-configured winston logger for the update-test-history pipeline.
 * Import `logger` directly — it is a singleton module-level instance.
 */

import winston from "winston";

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
  ),
  transports: [new winston.transports.Console()],
});
