/// <reference types="vite/client" />

// Typed VITE_* variables (validated at runtime in shared/lib/env.ts).
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
