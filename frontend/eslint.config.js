import js from "@eslint/js";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import { importX } from "eslint-plugin-import-x";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

// Module boundaries: allowed dependencies go through the target module's index.ts; all others are errors.
const MODULES = ["shell", "dashboard", "auth", "finance", "groceries", "health"];
const ALLOWED_DEPENDENCIES = {
  shell: [],
  dashboard: ["auth", "finance", "groceries", "health"],
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
        ? `Import "${from}" through its public API: "@/modules/${from}".`
        : `Module "${target}" may not depend on "${from}": dependencies are one-way.`,
    };
  }),
);

const layerZones = [
  {
    target: "./src/app",
    from: "./src/modules",
    except: MODULES.map((name) => `./${name}/index.ts`),
    message: "app/ imports modules through their public API: @/modules/<name>.",
  },
  {
    target: "./src/shared",
    from: ["./src/modules", "./src/app"],
    message: "shared/ is used by modules; it must not import from modules/ or app/.",
  },
  {
    target: "./src/modules",
    from: "./src/app",
    message: "Modules must not import from app/.",
  },
];

export default defineConfig([
  globalIgnores(["dist", "coverage"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat["recommended-latest"],
      reactRefresh.configs.vite,
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    settings: {
      "import-x/resolver-next": [createTypeScriptImportResolver({ project: "./tsconfig.app.json" })],
    },
    rules: {
      "import-x/no-restricted-paths": ["error", { zones: [...moduleZones, ...layerZones] }],
      "import-x/no-cycle": "error",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true, allowExportNames: ["loader", "action", "Component", "ErrorBoundary"] },
      ],
      "import-x/no-unresolved": "off",
      "import-x/named": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/shared/components/ui/**/*.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
]);
