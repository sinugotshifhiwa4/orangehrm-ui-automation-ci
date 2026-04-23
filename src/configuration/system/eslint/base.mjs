import tseslint from "typescript-eslint";

export default [
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["**/*.ts"],
  })),
];