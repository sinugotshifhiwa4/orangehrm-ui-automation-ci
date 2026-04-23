import type { TestInfo } from "@playwright/test";
import type { AuthRole } from "../authentication/storage/constants/authentication.constants.js";
import { COMBINED_PROJECT_AUTH_ROLE_MAP } from "./projectRole.map.js";
import ErrorHandler from "../../../utils/errorHandling/errorHandler.js";

/**
 * Retrieves the authentication role associated with a project.
 * @param {TestInfo} testInfo - The test info object which contains the project name.
 * @returns {AuthRole} The authentication role associated with the project.
 * @throws {Error} If no role is mapped for the project.
 */
export function getAuthRoleByProject(testInfo: TestInfo): AuthRole {
  const role = COMBINED_PROJECT_AUTH_ROLE_MAP[testInfo.project.name];

  if (!role) {
    ErrorHandler.logAndThrow(
      "getAuthRoleByProject",
      `No role mapped for project: "${testInfo.project.name}". Expected one of: ${Object.keys(COMBINED_PROJECT_AUTH_ROLE_MAP).join(", ")}`,
    );
  }

  return role;
}
