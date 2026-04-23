import EnvironmentDetector from "../../../system/environment/detector/environmentDetector.js";
import { AsyncFileManager } from "../../../../utils/fileManager/asyncFileManager.js";
import { SyncFileManager } from "../../../../utils/fileManager/syncFileManager.js";
import AuthenticationPathResolver from "../pathResolver/authPathResolver.js";
import { FileEncoding } from "../../../../utils/fileManager/internal/file-encoding.enum.js";
import type { AuthRole } from "../storage/constants/authentication.constants.js";
import ErrorHandler from "../../../../utils/errorHandling/errorHandler.js";
import logger from "../../../system/logger/loggerManager.js";

export default class AuthenticationFileManager {
  /**
   * Indicates whether the application is running in a CI environment.
   */
  private static readonly isCI = EnvironmentDetector.isCI();

  /**
   * Keeps track of roles that have already been initialized.
   */
  private static initializedRoles = new Set<AuthRole>();

  /**
   * Resolves the absolute path to the authentication state file for a given role.
   * If running in a CI environment, the path will include the shard index and total shard count.
   * If not running in a CI environment, the path will be the local authentication state file path.
   * @param role - The role to resolve the authentication state file path for.
   * @returns The absolute path to the authentication state file for the given role.
   * @throws Error - If the authentication state file path cannot be resolved.
   */
  public static getFilePath(role: AuthRole): string {
    try {
      const resolver = this.isCI
        ? AuthenticationPathResolver.getCIFilePath(role)
        : AuthenticationPathResolver.getLocalFilePath(role);

      return SyncFileManager.resolve(resolver);
    } catch (error) {
      ErrorHandler.captureError(
        error,
        "getFilePath",
        "Failed to resolve auth state file path",
      );
      throw error;
    }
  }

  /**
   * Synchronously resets the authentication state file for a given role.
   * @param role - The role to reset the authentication state file for.
   * @returns The absolute path to the authentication state file that was reset.
   * @throws Error - If the authentication state file cannot be reset.
   */
  public static resetSync(role: AuthRole): string {
    try {
      const filePath = this.getFilePath(role);
      this.writeFileSync(filePath);
      logger.debug(`Reset auth state file (sync) for ${role}: ${filePath}`);
      return filePath;
    } catch (error) {
      ErrorHandler.captureError(
        error,
        "resetSync",
        "Failed to synchronously reset auth state file",
      );
      throw error;
    }
  }

  /**
   * Initializes the authentication state file for a given role.
   * If the authentication state file for the given role has already been initialized, this function does nothing.
   * @param role - The role to initialize the authentication state file for.
   * @returns A promise that resolves to true if the authentication state file is initialized successfully, or false if initialization fails.
   */
  public static async initialize(role: AuthRole): Promise<boolean> {
    if (this.initializedRoles.has(role)) {
      logger.debug(`Auth state file already initialized for role: ${role}`);
      return true;
    }

    try {
      const filePath = this.getFilePath(role);
      await this.writeFileAsync(filePath);
      this.initializedRoles.add(role);
      logger.debug(`Initialized auth state file for ${role}: ${filePath}`);
      return true;
    } catch (error) {
      ErrorHandler.captureError(
        error,
        "initialize",
        "Failed to initialize auth state file",
      );
      return false;
    }
  }

  /**
   * Resets the authentication state manager session flag for a given role or all roles.
   * If a role is provided, the session flag for that role will be reset.
   * If no role is provided, the session flags for all roles will be reset.
   * @param {AuthRole} [role] - The role to reset the session flag for, or omit to reset all roles.
   */
  public static reset(role?: AuthRole): void {
    if (role) {
      this.initializedRoles.delete(role);
      logger.debug(`Reset auth state manager session flag for role: ${role}`);
    } else {
      this.initializedRoles.clear();
      logger.debug("Reset auth state manager session flags for all roles");
    }
  }

  /**
   * Synchronously writes empty auth state to file.
   * @param filePath - The path to the file to write to
   */
  private static writeFileSync(filePath: string): void {
    SyncFileManager.writeFile(
      filePath,
      AuthenticationPathResolver.getEmptyAuthState(),
      "authStateFile",
      FileEncoding.UTF8,
    );
  }

  /**
   * Asynchronously writes empty auth state to file.
   * @param filePath - The path to the file to write to
   * @returns A promise that resolves when the file has been written to
   * @throws {Error} If the file cannot be written to
   */
  private static async writeFileAsync(filePath: string): Promise<void> {
    await AsyncFileManager.writeFile(
      filePath,
      AuthenticationPathResolver.getEmptyAuthState(),
      "authStateFile",
      FileEncoding.UTF8,
    );
  }
}
