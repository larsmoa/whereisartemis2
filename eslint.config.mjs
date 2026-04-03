import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,

  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),

  {
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },

  // TypeScript-aware rules — only applied to TS/TSX files that are part of the project
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tseslint,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: true,
      },
    },
    rules: {
      // Disallow any — prefer explicit types
      "@typescript-eslint/no-explicit-any": "error",

      // Enforce type-only imports to keep runtime bundle clean
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      // No console.log left in code
      "no-console": "error",

      // Enforce exhaustive switch statements
      "@typescript-eslint/switch-exhaustiveness-check": "error",

      // Prefer nullish coalescing over ||
      "@typescript-eslint/prefer-nullish-coalescing": "error",

      // Prefer optional chaining
      "@typescript-eslint/prefer-optional-chain": "error",

      // No unused vars (TypeScript-aware version)
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-unused-vars": "off",

      // No floating promises
      "@typescript-eslint/no-floating-promises": "error",

      // Require await in async functions
      "@typescript-eslint/require-await": "error",

      // Require explicit return types on functions and class methods
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
    },
  },
]);

export default eslintConfig;
