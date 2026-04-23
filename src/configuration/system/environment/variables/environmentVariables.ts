import { EnvironmentUrls } from "./internal/environment.urls.js";
import { EnvironmentCredentials } from "./internal/environment.credentials.js";

export default class EnvironmentVariables {
  public static readonly urls = EnvironmentUrls;
  public static readonly credentials = EnvironmentCredentials;
}
