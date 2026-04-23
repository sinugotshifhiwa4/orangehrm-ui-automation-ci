import playwright from "eslint-plugin-playwright";

export default [
  {
    files: ["**/*.spec.ts", "tests/**/*.ts"],
    plugins: {
      playwright,
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      ...playwright.configs["flat/recommended"].rules,
      "playwright/expect-expect": "off",
      "no-console": "off",
    },
  },
];