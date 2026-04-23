import importPlugin from "eslint-plugin-import";

export default [
  {
    files: ["**/*.ts"],
    plugins: {
      import: importPlugin,
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
        node: true,
      },
    },
    rules: {
      "import/no-duplicates": ["error", { "prefer-inline": true }],
      "import/extensions": [
        "error",
        "ignorePackages",
        {
          ts: "never",
          js: "always",
          mjs: "always",
        },
      ],
    },
  },
];