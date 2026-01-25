import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  target: "node22",
  // Don't bundle - let dependencies be runtime imports
  // This avoids CJS/ESM compatibility issues with gray-matter
  banner: {
    js: "#!/usr/bin/env node",
  },
});
