import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@components": path.resolve(__dirname, "src/components"),
      "@lib": path.resolve(__dirname, "src/lib"),
      "@hooks": path.resolve(__dirname, "src/hooks"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000", 
        changeOrigin: true,
        secure: false,
      },
    },
  },
  root: ".",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
})
