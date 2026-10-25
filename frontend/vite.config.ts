import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
});
