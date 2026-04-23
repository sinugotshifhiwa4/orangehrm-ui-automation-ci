import DateFormatter from "../../../../utils/shared/dateFormatter.js";
import { SyncFileManager } from "../../../../utils/fileManager/syncFileManager.js";

export default class DownloadPathBuilder {
  private static readonly directory = "downloads";

  /**
   * Creates a file path for a downloaded file.
   * The file path is constructed by combining the current working directory, the "downloads" directory,
   * the base item code, the current date and the current time.
   * The file name will be in the format of "BaseItemCode_Date_Time.Extension".
   * @param {string} fileName - The name of the file to be downloaded.
   * @param {string} extension - The extension of the file to be downloaded.
   * @returns {string} The file path for the downloaded file.
   */
  public static createFilePath(fileName: string): string {
    const timestamp = DateFormatter.formatLocalTime();

    return SyncFileManager.join(
      process.cwd(),
      this.directory,
      `${fileName}_${timestamp}`,
    );
  }
}
