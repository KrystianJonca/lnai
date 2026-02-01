import { describe, expect, it } from "vitest";

import { getDirFromGlob } from "../../utils/rules";

describe("getDirFromGlob", () => {
  it("should extract directory from glob pattern", () => {
    expect(getDirFromGlob("apps/cli/**/*.ts")).toBe("apps/cli");
    expect(getDirFromGlob("packages/core/src/index.ts")).toBe(
      "packages/core/src"
    );
    expect(getDirFromGlob("README.md")).toBe(".");
    expect(getDirFromGlob("src/*.ts")).toBe("src");
    expect(getDirFromGlob("src/{a,b}.ts")).toBe("src");
  });

  it("should handle current directory", () => {
    expect(getDirFromGlob("*.ts")).toBe(".");
    expect(getDirFromGlob(".")).toBe(".");
  });
});
