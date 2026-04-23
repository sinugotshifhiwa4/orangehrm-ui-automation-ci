import type { AuthRole } from "../authentication/storage/constants/authentication.constants.js";
import {
  resolveSetupProject,
  resolveUserRole,
  USER_ROLE_TO_AUTH_ROLE,
} from "./projectRole.config.js";

// Cleanup Role (AuthRole)

/**
 * Resolves the {@link AuthRole} for the cleanup project based on USER_ROLE env var.
 * Defaults to "ADMIN" if no role is specified.
 */
export const resolveCleanupRole = (): AuthRole => {
  return USER_ROLE_TO_AUTH_ROLE[resolveUserRole()];
};

// Cleanup Dependency (Setup project name)

/**
 * Resolves the setup project name that `data-cleanup` should depend on,
 * based on the current USER_ROLE environment variable.
 * Defaults to "setup-admin-user" if no role is specified.
 */
export const resolveCleanupDependency = (): string => {
  return resolveSetupProject();
};

// Project → AuthRole Maps

/**
 * Mapping of setup project names to their corresponding {@link AuthRole}.
 */
const SETUP_PROJECT_AUTH_ROLE_MAP: Record<string, AuthRole> = {
  "setup-admin-user": "ADMIN",
  "setup-general-user": "GENERAL",
};

/**
 * Mapping of runtime project names to their corresponding {@link AuthRole}.
 */
const PROJECT_AUTH_ROLE_MAP: Record<string, AuthRole> = {
  "admin-user": "ADMIN",
  "general-user": "GENERAL",
  "data-cleanup": resolveCleanupRole(),
};

/**
 * Combined mapping of all project names (setup and runtime) to their corresponding {@link AuthRole}.
 */
export const COMBINED_PROJECT_AUTH_ROLE_MAP: Record<string, AuthRole> = {
  ...SETUP_PROJECT_AUTH_ROLE_MAP,
  ...PROJECT_AUTH_ROLE_MAP,
};
