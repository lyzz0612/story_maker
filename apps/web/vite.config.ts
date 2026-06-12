import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  server: {
    port: Number(process.env.WEB_PORT ?? 5174),
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.SERVER_PORT ?? 3001}`,
        changeOrigin: true
      }
    }
  },
  preview: {
    port: Number(process.env.WEB_PORT ?? 5174),
    host: "0.0.0.0"
  }
});
