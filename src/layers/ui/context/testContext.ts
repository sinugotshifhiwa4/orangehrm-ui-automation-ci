import ErrorHandler from "../../../utils/errorHandling/errorHandler.js";

export class TestContext {
  /**
   * The data store for the TestContext.
   */
  private data: Record<string, unknown> = {};

  /**
   * Sets a key-value pair in the TestContext data store.
   * @param {string} key The key of the value to be stored in the data store.
   * @param {unknown} value The value to be associated with the provided key in the data store.
   */
  public set(key: string, value: unknown): void {
    this.data[key] = value;
  }

  /**
   * Retrieves a value from the TestContext data store based on the provided key.
   * @template T The type of the value to be retrieved.
   * @param {string} key The key of the value to be retrieved from the data store.
   * @returns {T} The value associated with the provided key.
   * @throws {Error} If the key does not exist in the data store.
   */
  public get<T>(key: string): T {
    if (!(key in this.data)) {
      ErrorHandler.logAndThrow("get", `Key "${key}" does not exist.`);
    }
    return this.data[key] as T;
  }

  /**
   * Checks if a key-value pair exists in the TestContext data store.
   * @param {string} key The key to be checked for existence in the data store.
   * @returns {boolean} True if the key exists, false otherwise.
   */
  public has(key: string): boolean {
    return key in this.data;
  }

  /**
   * Removes a key-value pair from the TestContext data store.
   * If the key does not exist in the data store, this function does nothing.
   * @param {string} key The key to be removed from the data store.
   */
  public remove(key: string): void {
    delete this.data[key];
  }

  /**
   * Resets the TestContext data store to an empty object.
   * This is useful when you want to ensure that any data stored in
   * the TestContext is cleared before running a test.
   */
  public clear(): void {
    this.data = {};
  }

  /**
   * Returns an array of strings representing all the keys currently
   * stored in the TestContext data store.
   * @return {string[]} An array of strings representing all the keys currently
   * stored in the TestContext data store.
   */
  public keys(): string[] {
    return Object.keys(this.data);
  }
}
