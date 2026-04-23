import EnvironmentDetector from "../environment/detector/environmentDetector.js";
import type { TimeoutOptions } from "./types/timeoutManager.type.js";

export default class TimeoutManager {
  private static CI_MULTIPLIER = 2;

  public static timeout({
    timeoutInMs,
    ciMultiplier = TimeoutManager.CI_MULTIPLIER,
  }: TimeoutOptions): number {
    return EnvironmentDetector.isCI()
      ? timeoutInMs * ciMultiplier
      : timeoutInMs;
  }
}
