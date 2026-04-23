import base from "./src/configuration/system/eslint/base.mjs";
import typescript from "./src/configuration/system/eslint/typescript.mjs";
import imports from "./src/configuration/system/eslint/imports.mjs";
import unused from "./src/configuration/system/eslint/unused.mjs";
import playwright from "./src/configuration/system/eslint/playwright.mjs";
import ignores from "./src/configuration/system/eslint/ignores.mjs";
import prettierConfig from "eslint-config-prettier";

export default [
  ...base,
  ...typescript,
  ...imports,
  ...unused,
  ...playwright,
  ...ignores,
  prettierConfig,
];
