/**
 * Constants used for authentication state management
 */
export const AUTH_STATE_CONFIG = {
  ROOT_DIRECTORY: ".auth",

  USERS: {
    GENERAL: "general-user.json",
    ADMIN: "admin-user.json",
  },

  CI_USERS: {
    GENERAL: "ci-general-user.json",
    ADMIN: "ci-admin-user.json",
  },

  EMPTY_STATE: "{}",

  CI_SHARD_PREFIX: "ci-login-shard-",
} as const;

/**
 * Type for authentication roles
 */
export type AuthRole = keyof typeof AUTH_STATE_CONFIG.USERS;

/**
 * List of authentication roles
 */
export const AUTH_ROLES = ["ADMIN", "GENERAL"] as const;
