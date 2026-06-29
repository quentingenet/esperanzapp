import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { fileURLToPath, URL } from "url";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { version: pkgVersion } = require("./package.json") as { version: string };
const version = process.env.APP_VERSION ?? pkgVersion;

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: "node_modules/sql.js/dist/sql-wasm.wasm", dest: "assets" },
      ],
    }),
  ],
  optimizeDeps: {
    exclude: ["jeep-sqlite"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["node_modules/", "src/test/", "**/*.d.ts", "vite.config.ts", "eslint.config.ts"],
    },
  },
});
