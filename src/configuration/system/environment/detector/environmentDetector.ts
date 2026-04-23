import type { EnvironmentStage } from "../constants/environment.constants.js";
import StagesFilePathResolver from "../pathResolver/envPathResolver.js";

export default class EnvironmentDetector {
  /**
   * Determines if the current execution environment is a CI/CD pipeline.
   * Checks for presence of known environment variables indicating a CI/CD pipeline.
   * @returns True if the environment is a CI/CD pipeline, false otherwise.
   */
  public static isCI(): boolean {
    return !!(
      process.env.CI ||
      process.env.GITHUB_ACTIONS ||
      process.env.GITLAB_CI ||
      process.env.TRAVIS ||
      process.env.CIRCLECI ||
      process.env.JENKINS_URL ||
      process.env.BITBUCKET_BUILD_NUMBER
    );
  }

  /**
   * Gets the current environment stage.
   * Looks for the 'ENV' or 'NODE_ENV' environment variable and defaults to 'dev' if not found.
   * Checks if the environment stage is valid using the StagesFilePathResolver.
   * If the stage is valid, returns it, otherwise returns 'dev'.
   * @returns The current environment stage
   */
  public static getCurrentEnvironmentStage(): EnvironmentStage {
    const env = process.env.ENV || process.env.NODE_ENV || "dev";
    return StagesFilePathResolver.isValidStage(env) ? env : "dev";
  }

  /**
   * Determines if the current environment is development.
   * @returns True if the environment is development, false otherwise
   */
  public static isDevelopment(): boolean {
    return this.getCurrentEnvironmentStage() === "dev";
  }

  /**
   * Determines if the current environment is QA (Quality Assurance).
   * @returns True if the environment is QA, false otherwise
   */
  public static isQA(): boolean {
    return this.getCurrentEnvironmentStage() === "qa";
  }

  /**
   * Determines if the current environment is UAT (User Acceptance Testing).
   * @returns True if the environment is UAT, false otherwise
   */
  public static isUAT(): boolean {
    return this.getCurrentEnvironmentStage() === "uat";
  }

  /**
   * Determines if the current environment is pre-production.
   * @returns True if the environment is pre-production, false otherwise
   */
  public static isPreprod(): boolean {
    return this.getCurrentEnvironmentStage() === "preprod";
  }

  /**
   * Determines if the current environment is production.
   * @returns True if the environment is production, false otherwise
   */
  public static isProduction(): boolean {
    return this.getCurrentEnvironmentStage() === "prod";
  }
}
