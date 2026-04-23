/**
 * Environment Credentials
 */
export const EnvironmentCredentials = {
  PORTAL_GENERAL_USERNAME: process.env.PORTAL_GENERAL_USERNAME!,
  PORTAL_GENERAL_PASSWORD: process.env.PORTAL_GENERAL_PASSWORD!,

  PORTAL_ADMIN_USERNAME: process.env.PORTAL_ADMIN_USERNAME!,
  PORTAL_ADMIN_PASSWORD: process.env.PORTAL_ADMIN_PASSWORD!,
} as const;
