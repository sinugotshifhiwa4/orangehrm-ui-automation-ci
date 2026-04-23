import EnvironmentDetector from "../detector/environmentDetector.js";
import DataSanitizer from "../../../../utils/sanitization/dataSanitizer.js";
import EnvPathResolver from "../pathResolver/envPathResolver.js";
import type { Credentials } from "../../../playwright/authentication/types/credentials.types.js";
import type { EnvironmentStage } from "../constants/environment.constants.js";
import ErrorHandler from "../../../../utils/errorHandling/errorHandler.js";

export default class EnvironmentConfigManager {
  /**
   * Retrieves an environment variable based on the provided getter function and variable name.
   * Optionally sanitizes the retrieved value if the current environment is a CI/CD pipeline.
   * If the environment variable does not exist, logs an error with the provided error message.
   * @template T - The type of the environment variable being retrieved.
   * @param getValue - A function that returns the environment variable value.
   * @param variableName - The name of the environment variable being retrieved.
   * @param methodName - The name of the method where the environment variable is being retrieved.
   * @param errorMessage - The error message to log if the environment variable does not exist.
   * @returns The environment variable value of type T.
   * @throws An error if the environment variable does not exist.
   */
  public static getEnvironmentVariable<T>(
    getValue: () => T,
    variableName: string,
    methodName: string,
    errorMessage: string,
  ): T {
    try {
      const value = getValue();
      this.validateEnvironmentVariable(String(value), variableName);

      const shouldSanitize = EnvironmentDetector.isCI();

      if (typeof value === "string") {
        return shouldSanitize
          ? (DataSanitizer.sanitizeString(value) as T)
          : value;
      }

      return value;
    } catch (error) {
      ErrorHandler.captureError(error, methodName, errorMessage);
      throw error;
    }
  }

  /**
   * Verifies if the given credentials are valid.
   * Checks if the given credentials contain both a username and a password.
   * If either the username or password is missing, throws an error.
   * @param credentials - The credentials to verify
   * @returns The verified credentials
   * @throws An error if the credentials are invalid
   */
  public static verifyCredentials(credentials: Credentials): Credentials {
    if (!credentials.username || !credentials.password) {
      ErrorHandler.logAndThrow(
        "FetchLocalEnvironmentVariables",
        "Invalid credentials: Missing username or password.",
      );
    }

    return credentials;
  }

  /**
   * Validates an environment variable by checking if it has a valid value.
   * If the value is invalid (i.e. empty or whitespace), throws an error with the provided error message.
   * @param value - The value of the environment variable to validate
   * @param variableName - The name of the environment variable to validate
   */
  public static validateEnvironmentVariable(
    value: string,
    variableName: string,
  ): void {
    if (!value || value.trim() === "") {
      ErrorHandler.logAndThrow(
        "FetchLocalEnvironmentVariables",
        `Environment variable ${variableName} is not set or is empty`,
      );
    }
  }

  /**
   * Gets the file path for the environment file of the current environment stage.
   * Looks up the current environment stage using the EnvironmentDetector and
   * resolves the file path for the corresponding environment file using the
   * EnvPathResolver.
   * @returns The file path for the environment file of the current environment stage
   */
  public static getCurrentEnvFilePath(): string {
    return this.getCurrentEnvValue(
      EnvPathResolver.getEnvironmentStages(),
      "getEnvironmentStageFilePath",
      "environment file",
    );
  }

  /**
   * Retrieves a value from a source object based on the current environment.
   * If the current environment is found in the source object, returns the associated value.
   * Otherwise, throws an error with the provided error message.
   * @param source - The source object to retrieve the value from
   * @param methodName - The name of the method calling this function
   * @param resourceType - The type of resource being retrieved (e.g. environment file, credentials)
   * @returns The value associated with the current environment
   * @throws Error if the current environment is not found in the source object
   */
  private static getCurrentEnvValue(
    source: Record<string, string>,
    methodName: string,
    resourceType: string,
  ): string {
    const currentEnvironment = EnvironmentDetector.getCurrentEnvironmentStage();
    return this.getEnvValue(
      source,
      currentEnvironment,
      methodName,
      `Failed to select ${resourceType}. Invalid environment: ${currentEnvironment}. Must be 'dev', 'qa', 'uat', 'preprod' or 'prod'`,
    );
  }

  /**
   * Gets a value from a source object based on the environment.
   * If the environment is found in the source object, returns the associated value.
   * Otherwise, throws an error with the provided error message.
   * @param source - The source object to retrieve the value from
   * @param environment - The environment to retrieve the value for
   * @param methodName - The name of the method calling this function
   * @param errorMessage - The error message to throw if the environment is not found
   * @returns The value associated with the environment
   * @throws Error if the environment is not found in the source object
   */
  private static getEnvValue<T extends Record<string, string>>(
    source: T,
    environment: EnvironmentStage,
    methodName: string,
    errorMessage: string,
  ): string {
    if (source[environment]) {
      return source[environment];
    }

    ErrorHandler.logAndThrow(methodName, errorMessage);
  }
}
