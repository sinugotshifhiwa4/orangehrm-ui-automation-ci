/**
 * Environment-related constants.
 */
export const ENVIRONMENT_CONSTANTS = {
  ROOT: "envs",
  BASE_FILE: ".env",
} as const;

/**
 * Supported environment stages.
 */
export const ENVIRONMENT_STAGES = [
  "dev",
  "qa",
  "uat",
  "preprod",
  "prod",
] as const;

/**
 * Type representing the supported environment stages.
 */
export type EnvironmentStage = (typeof ENVIRONMENT_STAGES)[number];

/**
 * Supported environment file types.
 */
export type EnvironmentFile = "secret" | "stage";
