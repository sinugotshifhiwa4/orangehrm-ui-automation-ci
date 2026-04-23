import type { AuthRole } from "../authentication/storage/constants/authentication.constants.js";

export type UserRole = "admin-user" | "general-user";
export type SetupProjectName = "setup-admin-user" | "setup-general-user";

/**
 * Fallback runtime role used when `USER_ROLE` is missing or invalid.
 * This keeps local and CI execution deterministic by defaulting role-based
 * Playwright setup, cleanup, and test project selection to the admin path.
 */
export const DEFAULT_USER_ROLE: UserRole = "admin-user";

export const USER_ROLE_TO_AUTH_ROLE: Record<UserRole, AuthRole> = {
  "admin-user": "ADMIN",
  "general-user": "GENERAL",
};

export const USER_ROLE_TO_SETUP_PROJECT: Record<UserRole, SetupProjectName> = {
  "admin-user": "setup-admin-user",
  "general-user": "setup-general-user",
};

/**
 * Resolves the active user role from the provided value or `USER_ROLE`.
 * Falls back to {@link DEFAULT_USER_ROLE} when the input is missing or invalid.
 * @param userRole - Optional explicit role override.
 * @returns The validated runtime user role.
 */
export function resolveUserRole(
  userRole: string | undefined = process.env.USER_ROLE,
): UserRole {
  return userRole && userRole in USER_ROLE_TO_AUTH_ROLE
    ? (userRole as UserRole)
    : DEFAULT_USER_ROLE;
}

/**
 * Resolves the setup project name that corresponds to the active user role.
 * @param userRole - Optional explicit role override.
 * @returns The setup project to use for authentication initialization.
 */
export function resolveSetupProject(
  userRole: string | undefined = process.env.USER_ROLE,
): SetupProjectName {
  return USER_ROLE_TO_SETUP_PROJECT[resolveUserRole(userRole)];
}
