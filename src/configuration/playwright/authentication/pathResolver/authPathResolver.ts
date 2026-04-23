import { SyncFileManager } from "../../../../utils/fileManager/syncFileManager.js";
import {
  AUTH_STATE_CONFIG,
  type AuthRole,
} from "../storage/constants/authentication.constants.js";
import ErrorHandler from "../../../../utils/errorHandling/errorHandler.js";

export default class AuthenticationPathResolver {
  private static rootDir: string | null = null;

  /**
   * Gets the CI authentication file path for a given user role.
   * In a CI environment, this function will return a file path that includes the shard index and total shards count.
   * The file path is constructed by concatenating the CI shard prefix, the user role, the shard index, and the total shard count.
   * If no shard index or total shard count is found, the function will return the file path without the shard index and total shard count.
   * @param role - The user role to get the CI file path for
   * @returns The CI file path for the given user role
   */
  public static getCIFilePath(role: AuthRole): string {
    return this.execute("getCIFilePath", "Failed to get CI file path", () => {
      const root = this.getRootDir();
      const { SHARD_INDEX, SHARD_TOTAL } = process.env;

      if (SHARD_INDEX && SHARD_TOTAL) {
        const shardFileName = `${AUTH_STATE_CONFIG.CI_SHARD_PREFIX}${role.toLowerCase()}-${SHARD_INDEX}.json`;
        return SyncFileManager.join(root, shardFileName);
      }

      return SyncFileManager.join(root, AUTH_STATE_CONFIG.CI_USERS[role]);
    });
  }

  /**
   * Gets the local authentication file path for a given user role.
   * This file path is used to store the authentication state for a user role in a local file.
   * @param role - The user role to get the local file path for
   * @returns The local file path for the given user role
   */
  public static getLocalFilePath(role: AuthRole): string {
    return this.execute(
      "getLocalFilePath",
      "Failed to get local file path",
      () =>
        SyncFileManager.join(this.getRootDir(), AUTH_STATE_CONFIG.USERS[role]),
    );
  }

  /**
   * Returns the empty authentication state string used to initialize the authentication state file.
   * This string is used as a placeholder when the authentication state file is reset or initialized.
   * @returns The empty authentication state string.
   */
  public static getEmptyAuthState(): string {
    return this.execute(
      "getEmptyAuthState",
      "Failed to get empty auth state",
      () => AUTH_STATE_CONFIG.EMPTY_STATE,
    );
  }

  /**
   * Executes a given operation and wraps any errors with additional information using ErrorHandler.
   * @template T - The type of the operation result
   * @param methodName - The name of the method calling this function
   * @param errorMessage - An error message to log if the operation fails
   * @param operation - The operation to execute
   * @returns The operation result
   * @throws Error - If the operation fails, an error with additional information is thrown
   */
  private static execute<T>(
    methodName: string,
    errorMessage: string,
    operation: () => T,
  ): T {
    try {
      return operation();
    } catch (error) {
      ErrorHandler.captureError(error, methodName, errorMessage);
      throw error;
    }
  }

  /**
   * Gets the root directory path for authentication state files.
   * Lazily initializes and ensures the directory exists on first access.
   * @returns The absolute path to the authentication state files root directory
   */
  private static getRootDir(): string {
    return this.execute("getRootDir", "Failed to get root directory", () => {
      if (this.rootDir === null) {
        this.rootDir = SyncFileManager.resolve(
          AUTH_STATE_CONFIG.ROOT_DIRECTORY,
        );
        SyncFileManager.ensureDirectoryExists(this.rootDir);
      }
      return this.rootDir;
    });
  }
}
