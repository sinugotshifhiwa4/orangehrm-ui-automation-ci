import EnvironmentDetector from "../detector/environmentDetector.js";
import EnvironmentFileManager from "./internal/EnvironmentFileManager.js";
import AuthenticationFileManager from "../../../playwright/authentication/storage/authenticationFileManager.js";
import { AUTH_ROLES } from "../../../playwright/authentication/storage/constants/authentication.constants.js";
import ErrorHandler from "../../../../utils/errorHandling/errorHandler.js";

/**
 * Initializes the environment config by loading all environment files in sequence.
 * Ensures environment variables are available for the current environment.
 * If initialization fails, logs an error with the error and error message.
 * @returns A promise that resolves when environment config is initialized.
 * @throws An error if initialization fails.
 */
async function initializeEnvironmentConfig(): Promise<void> {
  try {
    await EnvironmentFileManager.getInstance().initialize();
  } catch (error) {
    ErrorHandler.captureError(
      error,
      "initializeEnvironmentConfig",
      "Failed to initialize environment config",
    );
    throw error;
  }
}

/**
 * Initializes empty authentication state for all roles.
 * This function is used to reset the authentication state when running in a CI environment.
 * It uses the AuthenticationFileManager to initialize empty authentication state for each role.
 * If initialization fails, logs an error with the error and error message.
 * @returns A promise that resolves when empty authentication state is initialized for all roles.
 * @throws An error if initialization fails.
 */
async function initializeEmptyAuthenticationState(): Promise<void> {
  try {
    await Promise.all(
      AUTH_ROLES.map((role) => AuthenticationFileManager.initialize(role)),
    );
  } catch (error) {
    ErrorHandler.captureError(
      error,
      "initializeEmptyAuthenticationState",
      "Failed to reset authentication state",
    );
    throw error;
  }
}

/**
 * Performs global setup for the environment and authentication state.
 * If running in a CI environment, only initializes empty authentication state.
 * If not running in a CI environment, initializes both environment config and empty authentication state.
 * If initialization fails, logs an error with the error and error message.
 * @returns A promise that resolves when global setup is complete.
 * @throws An error if initialization fails.
 */
async function globalSetup(): Promise<void> {
  try {
    const tasks: Promise<void>[] = [initializeEmptyAuthenticationState()];

    if (!EnvironmentDetector.isCI()) {
      tasks.push(initializeEnvironmentConfig());
    }

    await Promise.all(tasks);
  } catch (error) {
    ErrorHandler.captureError(
      error,
      "globalSetup",
      "Failed to perform global setup",
    );
    throw error;
  }
}

export default globalSetup;
