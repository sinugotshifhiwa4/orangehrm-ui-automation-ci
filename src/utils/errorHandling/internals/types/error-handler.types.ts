/**
 * Comprehensive error information captured during test execution or runtime failures.
 * Contains contextual metadata, stack traces, and optional test matcher details for debugging.
 */
export interface ErrorDetails {
  source: string;
  context?: string;
  message: string;
  timestamp: string;
  environment: string;
  stack?: string;
  errorType?: string;
  pass?: boolean;
  matcherName?: string;
  expected?: unknown;
  received?: unknown;
  log?: string[];
  [key: string]: unknown;
}

/**
 * Result object returned by test matcher functions indicating whether an assertion
 * passed or failed, along with relevant values and diagnostic information.
 */
export type MatcherResult = {
  message: string;
  pass: boolean;
  name?: string;
  expected?: unknown;
  actual?: unknown;
  received?: unknown;
  log?: string[];
};

/**
 * Wrapper object for matcher failures, used to distinguish test assertion errors
 * from other runtime errors in test frameworks.
 */
export type MatcherError = {
  matcherResult: MatcherResult;
};
