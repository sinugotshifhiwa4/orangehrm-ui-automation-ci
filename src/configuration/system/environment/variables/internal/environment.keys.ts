/**
 * This file contains the keys for environment variables used in the application.
 * These keys are defined as constants to ensure consistency and avoid typos when accessing environment variables throughout the codebase.
 */
export const ENV_KEYS = {
  ADMIN: {
    USERNAME: "PORTAL_ADMIN_USERNAME",
    PASSWORD: "PORTAL_ADMIN_PASSWORD",
  },
  GENERAL: {
    USERNAME: "PORTAL_GENERAL_USERNAME",
    PASSWORD: "PORTAL_GENERAL_PASSWORD",
  },
} as const;
