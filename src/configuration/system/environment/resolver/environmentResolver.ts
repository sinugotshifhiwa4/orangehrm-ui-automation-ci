import EnvironmentDetector from "../detector/environmentDetector.js";
import EnvironmentConfigManager from "../manager/environmentConfigManager.js";
import EnvironmentVariables from "../variables/environmentVariables.js";
import { ENV_KEYS } from "../variables/internal/environment.keys.js";
import type { Credentials } from "../../../playwright/authentication/types/credentials.types.js";
import type { AuthRole } from "../../../playwright/authentication/storage/constants/authentication.constants.js";
import ErrorHandler from "../../../../utils/errorHandling/errorHandler.js";

export class EnvironmentResolver {
  /**
   * Retrieves the portal base URL
   */
  public getPortalBaseUrl(): string {
    try {
      return this.isCI()
        ? this.getRequiredEnv("CI_PORTAL_BASE_URL")
        : this.resolveLocalVariable(
            () => EnvironmentVariables.urls.PORTAL_BASE_URL,
            "Portal Base URL",
          );
    } catch (error) {
      ErrorHandler.captureError(
        error,
        "getPortalBaseUrl",
        "Failed to get portal base URL",
      );
      throw error;
    }
  }

  /**
   * Gets portal credentials for a given role
   */
  public getPortalCredentials(role: AuthRole) {
    try {
      return this.isCI()
        ? this.resolveCICredentials(role)
        : this.resolveLocalCredentials(role);
    } catch (error) {
      ErrorHandler.captureError(
        error,
        "getPortalCredentials",
        `Failed to get portal credentials for role: ${role}`,
      );
      throw error;
    }
  }

  // Private Core Logic

  /**
   * Central role → env key mapping
   */
  private readonly roleKeyMap = {
    ADMIN: {
      username: ENV_KEYS.ADMIN.USERNAME,
      password: ENV_KEYS.ADMIN.PASSWORD,
    },
    GENERAL: {
      username: ENV_KEYS.GENERAL.USERNAME,
      password: ENV_KEYS.GENERAL.PASSWORD,
    },
  };

  /**
   * Resolve CI credentials
   */
  private resolveCICredentials(role: AuthRole): Credentials {
    const keys = this.roleKeyMap[role];

    const username = this.getRequiredEnv(`CI_${keys.username}`);
    const password = this.getRequiredEnv(`CI_${keys.password}`);

    return EnvironmentConfigManager.verifyCredentials({
      username,
      password,
    });
  }

  /**
   * Resolve local credentials (with decryption)
   */
  private resolveLocalCredentials(role: AuthRole) {
    const keys = this.roleKeyMap[role];

    const username =
      EnvironmentVariables.credentials[
        keys.username as keyof typeof EnvironmentVariables.credentials
      ];
    const password =
      EnvironmentVariables.credentials[
        keys.password as keyof typeof EnvironmentVariables.credentials
      ];

    return EnvironmentConfigManager.verifyCredentials({ username, password });
  }

  // Helpers

  /**
   * Determines if running in CI
   */
  private isCI(): boolean {
    return EnvironmentDetector.isCI();
  }

  /**
   * Gets required environment variable or fails fast
   */
  private getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing environment variable: ${key}`);
    }
    return value;
  }

  /**
   * Resolves a local environment-backed value with consistent error handling.
   * @param getValue - Lazy accessor for the target value.
   * @param description - Human-readable label used in error metadata.
   * @returns The resolved local configuration value.
   */
  private resolveLocalVariable<T>(getValue: () => T, description: string): T {
    return EnvironmentConfigManager.getEnvironmentVariable(
      getValue,
      this.toKey(description),
      this.toMethod(description),
      `Failed to get ${description.toLowerCase()}`,
    );
  }

  /**
   * Converts a human-readable description into the compact error key format used by the config manager.
   * @param description - Human-readable configuration label.
   * @returns The normalized metadata key.
   */
  private toKey(description: string): string {
    return description.toLowerCase().replace(/\s+/g, "");
  }

  /**
   * Converts a human-readable description into the method name used in error metadata.
   * @param description - Human-readable configuration label.
   * @returns The derived accessor-style method name.
   */
  private toMethod(description: string): string {
    return `get${description.replace(/\s+/g, "")}`;
  }
}
