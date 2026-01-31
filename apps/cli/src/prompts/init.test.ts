import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock @inquirer/prompts before importing
vi.mock("@inquirer/prompts", () => ({
  checkbox: vi.fn(),
  select: vi.fn(),
}));

import { checkbox, select } from "@inquirer/prompts";

import { isInteractiveEnvironment, runInitPrompts } from "./init";

describe("init prompts", () => {
  describe("isInteractiveEnvironment", () => {
    const originalStdin = process.stdin.isTTY;
    const originalStdout = process.stdout.isTTY;

    afterEach(() => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: originalStdin,
        writable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: originalStdout,
        writable: true,
      });
    });

    it("returns true when both stdin and stdout are TTY", () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: true,
        writable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
      });
      expect(isInteractiveEnvironment()).toBe(true);
    });

    it("returns false when stdin is not TTY", () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        writable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
      });
      expect(isInteractiveEnvironment()).toBe(false);
    });

    it("returns false when stdout is not TTY", () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: true,
        writable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        writable: true,
      });
      expect(isInteractiveEnvironment()).toBe(false);
    });

    it("returns false when both are not TTY", () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: undefined,
        writable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: undefined,
        writable: true,
      });
      expect(isInteractiveEnvironment()).toBe(false);
    });
  });

  describe("runInitPrompts", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("returns selected tools and version control settings", async () => {
      vi.mocked(checkbox).mockResolvedValueOnce(["claudeCode", "cursor"]);
      vi.mocked(select).mockResolvedValue("version-all");

      const result = await runInitPrompts();

      expect(result).toEqual({
        tools: ["claudeCode", "cursor"],
        versionControl: {
          claudeCode: true,
          cursor: true,
        },
      });
    });

    it("sets all tools to false when ignore-all is selected", async () => {
      vi.mocked(checkbox).mockResolvedValueOnce(["claudeCode", "cursor"]);
      vi.mocked(select).mockResolvedValue("ignore-all");

      const result = await runInitPrompts();

      expect(result.versionControl).toEqual({
        claudeCode: false,
        cursor: false,
      });
    });

    it("prompts for per-tool selection when per-tool is selected", async () => {
      vi.mocked(checkbox)
        .mockResolvedValueOnce(["claudeCode", "cursor", "opencode"])
        .mockResolvedValueOnce(["claudeCode"]);
      vi.mocked(select).mockResolvedValue("per-tool");

      const result = await runInitPrompts();

      expect(result.versionControl).toEqual({
        claudeCode: true,
        cursor: false,
        opencode: false,
      });
    });

    it("calls checkbox with correct options for tool selection", async () => {
      vi.mocked(checkbox).mockResolvedValueOnce(["claudeCode"]);
      vi.mocked(select).mockResolvedValue("ignore-all");

      await runInitPrompts();

      expect(checkbox).toHaveBeenCalledWith({
        message: "Which tools would you like to configure?",
        choices: expect.arrayContaining([
          expect.objectContaining({ value: "claudeCode", checked: true }),
          expect.objectContaining({ value: "cursor", checked: true }),
        ]),
        required: true,
      });
    });

    it("calls select with correct options for version control", async () => {
      vi.mocked(checkbox).mockResolvedValueOnce(["claudeCode"]);
      vi.mocked(select).mockResolvedValue("ignore-all");

      await runInitPrompts();

      expect(select).toHaveBeenCalledWith({
        message: "How would you like to handle version control?",
        choices: [
          { name: "Ignore all (add to .gitignore)", value: "ignore-all" },
          { name: "Version control all", value: "version-all" },
          { name: "Configure per tool", value: "per-tool" },
        ],
      });
    });
  });
});
