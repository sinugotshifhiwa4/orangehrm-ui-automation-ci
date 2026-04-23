import dotenv from "dotenv";
import EnvironmentDetector from "../../detector/environmentDetector.js";
import { AsyncFileManager } from "../../../../../utils/fileManager/asyncFileManager.js";
import StagesFileManager from "../../manager/stagesFileManager.js";
import EnvPathResolver from "../../pathResolver/envPathResolver.js";
import type { EnvironmentFile } from "../../constants/environment.constants.js";
import ErrorHandler from "../../../../../utils/errorHandling/errorHandler.js";
import logger from "../../../logger/loggerManager.js";

export default class EnvironmentFileManager {
  private static instance: EnvironmentFileManager;
  private initialized = false;
  private loadedFiles: string[] = [];

  /**
   * Prevents direct instantiation and enforces singleton usage.
   */
  private constructor() {}

  /**
   * Returns the singleton instance of the EnvironmentFileManager.
   * Ensures that only one instance of the EnvironmentFileManager is created.
   * @returns {EnvironmentFileManager} The singleton instance of the EnvironmentFileManager
   */
  public static getInstance(): EnvironmentFileManager {
    if (!EnvironmentFileManager.instance) {
      EnvironmentFileManager.instance = new EnvironmentFileManager();
    }
    return EnvironmentFileManager.instance;
  }

  /**
   * Initializes the environment by loading all environment files.
   * If the environment has already been initialized, this method does nothing.
   * If the current environment is a CI/CD pipeline, this method does nothing.
   * @returns A promise that resolves to void after the environment has been initialized.
   * @throws {Error} If the environment failed to initialize.
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      logger.debug("environment already initialized");
      return;
    }

    if (EnvironmentDetector.isCI()) {
      return;
    }

    try {
      await this.loadAllEnvironments();
      this.initialized = true;
      this.logInitializationResult();
    } catch (error) {
      ErrorHandler.captureError(
        error,
        "initialize",
        "Failed to set up environment variables",
      );
      throw error;
    }
  }

  /**
   * Checks if the environment has been initialized.
   * @returns True if the environment has been initialized, false otherwise.
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Gets the list of loaded environment files.
   * Returns a read-only array of strings containing the file names of the loaded environment files.
   */
  public getLoadedFiles(): readonly string[] {
    return [...this.loadedFiles];
  }

  /**
   * Loads all environment files in sequence
   */
  private async loadAllEnvironments(): Promise<void> {
    const env = EnvironmentDetector.getCurrentEnvironmentStage();
    const stageFilePath = this.getStageFilePath(env);
    await this.loadEnvironmentFile(stageFilePath, "stage", (fp) =>
      StagesFileManager.logEnvironmentFileNotFound(fp, env),
    );
  }

  /**
   * Logs the initialization result based on loaded files
   */
  private logInitializationResult(): void {
    if (this.loadedFiles.length > 0) {
      logger.info(
        `Environment successfully initialized with ${this.loadedFiles.length} config files: ${this.loadedFiles.join(", ")}`,
      );
    } else {
      logger.warn("Environment initialized but no config files were loaded");
    }
  }

  /**
   * Unified method to load any environment file (base or stage)
   * @param filePath - Path to the environment file
   * @param fileType - Type of file being loaded (for logging)
   * @param onMissing - Optional callback to handle missing files
   */
  private async loadEnvironmentFile(
    filePath: string,
    fileType: EnvironmentFile,
    onMissing?: (filePath: string) => void,
  ): Promise<boolean> {
    try {
      const fileExists = await AsyncFileManager.doesFileExist(filePath);

      if (!fileExists) {
        if (onMissing) {
          onMissing(filePath);
        }
        return false;
      }

      // Load dotenv and validate
      const result = dotenv.config({ path: filePath, override: true });

      if (result.error) {
        throw new Error(
          `Error loading environment variables from ${filePath}: ${result.error.message}`,
        );
      }

      // Register the loaded file
      const fileName = AsyncFileManager.getBaseNameWithExtension(filePath);
      this.loadedFiles.push(fileName);
      logger.info(
        `Successfully loaded ${fileType} environment file: ${fileName}`,
      );

      return true;
    } catch (error) {
      ErrorHandler.captureError(
        error,
        "loadEnvironmentFile",
        `Failed to load ${fileType} environment file at ${filePath}`,
      );

      if (fileType === "secret") {
        throw error;
      }
      return false;
    }
  }

  /**
   * Gets the file path for a specific environment stage
   */
  private getStageFilePath(env: string): string {
    const stages = EnvPathResolver.getEnvironmentStages();

    if (!(env in stages)) {
      ErrorHandler.logAndThrow(
        "getStageFilePath",
        `Invalid environment stage: ${env}. Valid stages are: ${Object.keys(stages).join(", ")}`,
      );
    }

    return stages[env as keyof typeof stages];
  }
}
