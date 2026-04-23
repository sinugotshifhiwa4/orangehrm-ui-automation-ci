import path from "path";
import fs from "fs";
import ErrorHandler from "../../errorHandling/errorHandler.js";

export default abstract class BaseFileManager {
  /**
   * Normalizes and secures a file path
   */
  protected static normalize(inputPath: string): string {
    if (!inputPath) {
      throw new Error("Path cannot be empty");
    }

    if (inputPath.includes("\0")) {
      throw new Error("Path contains null bytes");
    }

    // Just normalize and resolve - let the OS handle the rest
    return path.resolve(path.normalize(inputPath));
  }

  /**
   * Validates a file or directory path
   */
  protected static validate(filePath: string, paramName = "path"): void {
    if (!filePath) {
      ErrorHandler.logAndThrow(
        "FileManager.validate",
        `Invalid argument: '${paramName}' is required.`,
      );
    }

    if (paramName === "filePath" && /[\/\\]$/.test(filePath)) {
      ErrorHandler.logAndThrow(
        "FileManager.validate",
        `Invalid file path: '${filePath}' cannot end with a directory separator.`,
      );
    }
  }

  /**
   * Helper method to get human-readable access mode description
   */
  protected static getAccessModeDescription(mode: number): string {
    const modes: string[] = [];

    if (mode & fs.constants.F_OK) modes.push("exists");
    if (mode & fs.constants.R_OK) modes.push("readable");
    if (mode & fs.constants.W_OK) modes.push("writable");
    if (mode & fs.constants.X_OK) modes.push("executable");

    return modes.length > 0 ? modes.join(", ") : "unknown";
  }

  /**
   * Resolves a file path to an absolute path.
   *
   * @param fileName - Name of the file to resolve.
   * @returns The absolute path to the file.
   */
  public static resolve(fileName: string): string {
    return path.resolve(fileName);
  }

  /**
   * Joins path segments into a single path.
   * @param {...segments} - Path segments to join.
   * @returns The joined path.
   * @throws {Error} If no path segments are provided.
   */
  public static join(...segments: string[]): string {
    if (segments.length === 0) {
      throw new Error("At least one path segment is required");
    }

    const joinedPath = path.join(...segments);
    return this.normalize(joinedPath);
  }

  /**
   * Gets the base name of a given file path (excluding its extension).
   */
  public static getBaseName(filePath: string): string {
    return path.basename(filePath, path.extname(filePath));
  }

  /**
   * Gets the base name of a given file path including its extension.
   */
  public static getBaseNameWithExtension(filePath: string): string {
    return path.basename(filePath);
  }

  /**
   * Gets the file extension of a given file path.
   * @param {string} filePath The file path to get the extension from.
   * @returns {string} The file extension.
   */
  public static getExtension(filePath: string): string {
    return path.extname(filePath);
  }
}
