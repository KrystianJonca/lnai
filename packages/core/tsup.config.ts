import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  // tsup injects baseUrl into its DTS build, which TS 6 deprecates (TS5101)
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  clean: true,
  sourcemap: false,
  splitting: false,
  treeshake: true,
  target: "node22",
});
