import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173, // must match WEB_URL in backend/.env (CORS + Better Auth trustedOrigins)
    strictPort: true,
    // D-020: the browser only talks to this dev server; /api/* is forwarded to Express.
    // Same origin in dev → no CORS, relative URLs ("/api/v1/me") in the app.
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  build: {
    sourcemap: true,
  },
  // Vitest (D-022) reuses this file, so tests resolve "@/..." exactly like the app.
  test: {
    environment: "node", // component tests will switch to jsdom per file (Phase 4)
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
