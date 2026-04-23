import type { Page, Locator, Download } from "@playwright/test";
import { ActionBase } from "./actionBase.js";
import { AsyncFileManager } from "../../../../../utils/fileManager/asyncFileManager.js";
import fs from "fs";
import DownloadPathBuilder from "../downloadPathBuilder.js";
import type { ElementActions } from "./elementActions.js";
import type { FileUploadMethod } from "../types/actions.type.js";
import type { DownloadPathOptions } from "../types/downloadPathBuilder.type.js";
import ErrorHandler from "../../../../../utils/errorHandling/errorHandler.js";

export class FileActions extends ActionBase {
  private ElementActions: ElementActions;

  /**
   * Creates file interaction helpers for uploads and downloads on the active page.
   * @param page - Active Playwright page instance.
   * @param elementActions - Element helper used for file-picker interactions.
   */
  constructor(page: Page, elementActions: ElementActions) {
    super(page);
    this.ElementActions = elementActions;
  }

  /**
   * Executes a download action and verifies that the file has been downloaded to the specified path.
   * Ensures the downloads directory exists, then triggers the download action and verifies the file has been downloaded.
   * If the download fails, an error is thrown.
   * @param callerMethodName Name of the method that called this function.
   * @param errorMessage Error message to log if the download fails.
   * @param triggerAction Action to trigger the download.
   * @param options Options for creating a download path.
   * @returns A promise that resolves with the downloaded file.
   * @throws {Error} If the download fails.
   */
  public async executeDownload(
    callerMethodName: string,
    errorMessage: string,
    triggerAction: () => Promise<void>,
    options: DownloadPathOptions,
  ) {
    try {
      await this.ensureDownloadDirectoryExists();

      const downloadPath = DownloadPathBuilder.createFilePath(options.fileName);

      const download = await this.handleDownload(
        callerMethodName,
        triggerAction,
        downloadPath,
      );

      await this.verifyFileDownloaded(callerMethodName, downloadPath);

      return this.createDownloadResult(downloadPath, download);
    } catch (error) {
      ErrorHandler.captureError(error, callerMethodName, errorMessage);
      throw error;
    }
  }

  /**
   * Upload a file to the page.
   *
   * @param element Element to interact with for uploading the file.
   * @param callerMethodName Name of the method that called this function.
   * @param filePath Path to save the file to.
   * @param uploadMethod Method to use for uploading the file: 'fileChooser' or 'inputFiles'.
   * @param elementName Name of the element.
   * @returns Promise that resolves with the result of the upload action if it succeeds, or rejects with the error if it fails.
   */
  public async uploadFile(
    element: Locator,
    callerMethodName: string,
    filePath: string,
    uploadMethod: FileUploadMethod,
    elementName: string,
  ) {
    return this.performAction(
      async () => {
        if (uploadMethod === "fileChooser") {
          // Wait for fileChooser to be triggered
          const [fileChooser] = await Promise.all([
            this.page.waitForEvent("filechooser"),
            this.ElementActions.clickElement(
              element,
              callerMethodName,
              elementName,
            ),
          ]);
          await fileChooser.setFiles(filePath);
        } else {
          await element.setInputFiles(filePath);
        }
      },
      callerMethodName,
      `File '${elementName}' uploaded successfully via '${uploadMethod}' on path: ${filePath}`,
      `Failed to upload file via ${uploadMethod}`,
    );
  }

  /**
   * Handles a file download.
   * Waits for the download to be triggered and returns the downloaded file.
   * If a downloadPath is provided, the file is saved to that path.
   * @param callerMethodName Name of the method that called this function.
   * @param triggerAction Action to trigger the download.
   * @param downloadPath Path to save the downloaded file to.
   * @returns Promise that resolves with the downloaded file.
   */
  public async handleDownload(
    callerMethodName: string,
    triggerAction: () => Promise<void>,
    downloadPath?: string,
  ): Promise<Download> {
    return this.performAction(
      async () => {
        const [download] = await Promise.all([
          this.page.waitForEvent("download"),
          triggerAction(),
        ]);

        if (downloadPath) {
          await download.saveAs(downloadPath);
        }

        return download;
      },
      callerMethodName,
      `File download handled${downloadPath ? ` and saved to: ${downloadPath}` : ""}`,
      "Failed to handle file download",
    );
  }

  /**
   * Verifies that a file has been downloaded to the specified path.
   *
   * @param callerMethodName Name of the method that called this function.
   * @param filePath Path to the file to verify.
   * @returns A promise that resolves if the verification succeeds, or rejects with the error if it fails.
   * @example
   * await verifyFileDownloaded("verifyFileDownloaded", "path/to/file");
   */
  public async verifyFileDownloaded(
    callerMethodName: string,
    filePath: string,
  ): Promise<void> {
    return this.performAction(
      async () => {
        const result = await AsyncFileManager.checkAccess(
          filePath,
          fs.constants.F_OK,
        );

        if (!result) {
          ErrorHandler.logAndThrow(
            "assertFileDownloaded",
            `File not found at path: ${filePath}`,
          );
        }
      },
      callerMethodName,
      `File successfully downloaded to: ${filePath}`,
      `File verification failed for: ${filePath}`,
    );
  }

  /**
   * Ensures the downloads directory exists, if it doesn't, creates it.
   * This directory is used to store downloaded files.
   */
  private async ensureDownloadDirectoryExists() {
    const exist = await AsyncFileManager.doesDirectoryExist("downloads");

    if (!exist) {
      await AsyncFileManager.ensureDirectory("downloads");
    }
  }

  /**
   * Creates a download result object for a successful download.
   * The download result object contains the following properties:
   * - success: A boolean indicating whether the download was successful.
   * - filePath: The path to the downloaded file.
   * - fileName: The name of the downloaded file as suggested by the browser.
   * @param {string} filePath - The path to the downloaded file.
   * @param {Download} download - The download object returned by playwright.
   * @returns {Object} The download result object.
   */
  private createDownloadResult(filePath: string, download: Download) {
    return {
      success: true,
      filePath,
      fileName: download.suggestedFilename(),
    };
  }
}
