import { SyncFileManager } from "../../../../utils/fileManager/syncFileManager.js";
import {
  ENVIRONMENT_CONSTANTS,
  ENVIRONMENT_STAGES,
  type EnvironmentStage,
} from "../constants/environment.constants.js";

export default class EnvPathResolver {
  private static rootDir: string | null = null;

  /**
   * Gets the file paths for all environment stage files.
   * @returns A mapping of environment stages to their file paths
   * @example
   * Returns: { dev: "/path/.env.dev", prod: "/path/.env.prod", ... }
   */
  public static getEnvironmentStages(): Record<EnvironmentStage, string> {
    return Object.fromEntries(
      ENVIRONMENT_STAGES.map((stage) => [
        stage,
        SyncFileManager.join(
          this.rootPath,
          `${ENVIRONMENT_CONSTANTS.BASE_FILE}.${stage}`,
        ),
      ]),
    ) as Record<EnvironmentStage, string>;
  }

  /**
   * Type guard to check if a value is a valid environment stage.
   * @param value - The value to check
   * @returns True if the value is a valid EnvironmentStage
   */
  public static isValidStage(value: unknown): value is EnvironmentStage {
    return (
      typeof value === "string" &&
      ENVIRONMENT_STAGES.includes(value as EnvironmentStage)
    );
  }

  /**
   * Gets the root directory path for environment files.
   * Lazily initializes and ensures the directory exists on first access.
   * @returns The absolute path to the environment files root directory
   */
  private static get rootPath(): string {
    if (this.rootDir === null) {
      this.rootDir = SyncFileManager.resolve(ENVIRONMENT_CONSTANTS.ROOT);
      SyncFileManager.ensureDirectoryExists(this.rootDir);
    }
    return this.rootDir;
  }
}
