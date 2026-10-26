import js from "@eslint/js";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import { importX } from "eslint-plugin-import-x";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

// Module boundaries: allowed dependencies go through the target module's index.ts; all others are errors.
const MODULES = ["auth", "finance", "groceries", "health"];
const ALLOWED_DEPENDENCIES = {
  auth: [],
  finance: ["auth"],
  groceries: ["auth", "finance"],
  health: ["auth", "groceries"],
};

const moduleZones = MODULES.flatMap((target) =>
  MODULES.filter((from) => from !== target).map((from) => {
    const allowed = ALLOWED_DEPENDENCIES[target].includes(from);
    return {
      target: `./src/modules/${target}`,
      from: `./src/modules/${from}`,
      ...(allowed && { except: ["./index.ts"] }),
      message: allowed
        ? `Import "${from}" through its public API: modules/${from}/index.ts.`
        : `Module "${target}" may not depend on "${from}": dependencies are one-way.`,
    };
  }),
);

const layerZones = [
  {
    target: ["./src/app.ts", "./src/server.ts"],
    from: "./src/modules",
    except: MODULES.map((name) => `./${name}/index.ts`),
    message: "Import modules through their public API: modules/<name>/index.ts.",
  },
  {
    target: "./src/shared",
    from: ["./src/modules", "./src/app.ts", "./src/server.ts"],
    message: "shared/ is used by modules; it must not import from modules/ or the app.",
  },
  {
    target: "./src/modules",
    from: ["./src/app.ts", "./src/server.ts"],
    message: "Modules must not import the app; register wiring in app.ts instead.",
  },
];

export default defineConfig([
  globalIgnores(["dist", "src/generated", "prisma.config.ts"]),
  {
    files: ["src/**/*.ts"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      "import-x/resolver-next": [createTypeScriptImportResolver({ project: "./tsconfig.json" })],
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "import-x/no-restricted-paths": ["error", { zones: [...moduleZones, ...layerZones] }],
      "import-x/no-cycle": "error",
      "import-x/no-unresolved": "off",
      "import-x/named": "off",
    },
  },
]);
