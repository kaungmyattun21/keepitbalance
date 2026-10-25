import js from "@eslint/js";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import { importX } from "eslint-plugin-import-x";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

// ---------------------------------------------------------------------------
// Module boundaries (D-013, D-014)
//
// Which business modules each module may use. Dependencies are one-way:
// Groceries → Finance, Health → Groceries, everyone → Auth. Anything not
// listed here is forbidden. Allowed imports must go through the module's
// index.ts (its public API), never its internal files.
// ---------------------------------------------------------------------------
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
        ? `Import "${from}" through its public API: "@/modules/${from}" (D-014).`
        : `Module "${target}" may not depend on "${from}" (D-014: dependencies are one-way).`,
    };
  }),
);

const layerZones = [
  {
    // app/ (router, providers, layout) composes modules, but only through their public API.
    target: "./src/app",
    from: "./src/modules",
    except: MODULES.map((name) => `./${name}/index.ts`),
    message: "app/ imports modules through their public API: @/modules/<name> (D-014).",
  },
  {
    target: "./src/shared",
    from: ["./src/modules", "./src/app"],
    message: "shared/ is used by modules; it must not import from modules/ or app/ (D-013).",
  },
  {
    target: "./src/modules",
    from: "./src/app",
    message: "Modules must not import from app/ (D-013).",
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
      // Resolves the "@/..." alias from tsconfig.app.json, so boundaries apply to aliased imports too.
      "import-x/resolver-next": [createTypeScriptImportResolver({ project: "./tsconfig.app.json" })],
    },
    rules: {
      "import-x/no-restricted-paths": ["error", { zones: [...moduleZones, ...layerZones] }],
      "import-x/no-cycle": "error",
      // TypeScript already reports unresolved imports and missing named exports.
      "import-x/no-unresolved": "off",
      "import-x/named": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // shadcn components export variant helpers next to the component; that's fine for Fast Refresh.
    files: ["src/shared/components/ui/**/*.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
]);
