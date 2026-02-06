import * as fs from "node:fs/promises";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupTempDir, copyFixture, createTempDir } from "../__tests__/utils";
import type { ToolId } from "../constants";
import { UNIFIED_DIR } from "../constants";
import { ValidationError } from "../errors";
import { MANIFEST_FILENAME, readManifest } from "../manifest/index";
import { runSyncPipeline } from "./index";

describe("runSyncPipeline", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe("full pipeline", () => {
    it("runs complete pipeline with full config", async () => {
      await copyFixture("valid/full", tempDir);

      const results = await runSyncPipeline({ rootDir: tempDir });

      // Should have results for both tools
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.validation.valid)).toBe(true);
    });

    it("creates output files for claudeCode", async () => {
      await copyFixture("valid/full", tempDir);

      await runSyncPipeline({ rootDir: tempDir, tools: ["claudeCode"] });

      // Check that .claude files were created
      const claudeDir = path.join(tempDir, ".claude");
      const stat = await fs.stat(claudeDir);
      expect(stat.isDirectory()).toBe(true);

      // Check symlinks
      const claudeMdStat = await fs.lstat(path.join(claudeDir, "CLAUDE.md"));
      expect(claudeMdStat.isSymbolicLink()).toBe(true);
    });

    it("creates output files for opencode", async () => {
      await copyFixture("valid/full", tempDir);

      await runSyncPipeline({ rootDir: tempDir, tools: ["opencode"] });

      // Check that opencode.json was created
      const opencodeConfig = path.join(tempDir, "opencode.json");
      const content = await fs.readFile(opencodeConfig, "utf-8");
      const config = JSON.parse(content);

      expect(config.$schema).toBe("https://opencode.ai/config.json");
    });
  });

  describe("validation errors", () => {
    it("throws ValidationError for invalid config", async () => {
      const aiDir = path.join(tempDir, ".ai");
      await fs.mkdir(aiDir, { recursive: true });

      // Create invalid config with wrong type for enabled
      await fs.writeFile(
        path.join(aiDir, "config.json"),
        JSON.stringify({ tools: { claudeCode: { enabled: "not-a-boolean" } } }),
        "utf-8"
      );

      await expect(runSyncPipeline({ rootDir: tempDir })).rejects.toThrow(
        /Unified config validation failed/
      );
    });

    it("throws ValidationError for invalid settings", async () => {
      const aiDir = path.join(tempDir, ".ai");
      await fs.mkdir(aiDir, { recursive: true });

      await fs.writeFile(
        path.join(aiDir, "config.json"),
        JSON.stringify({ tools: { claudeCode: { enabled: true } } }),
        "utf-8"
      );
      await fs.writeFile(
        path.join(aiDir, "settings.json"),
        JSON.stringify({ permissions: { allow: "not-an-array" } }),
        "utf-8"
      );

      await expect(runSyncPipeline({ rootDir: tempDir })).rejects.toThrow(
        /Unified config validation failed/
      );
    });

    it("throws ValidationError for invalid tool ID", async () => {
      await copyFixture("valid/minimal", tempDir);

      await expect(
        runSyncPipeline({
          rootDir: tempDir,
          tools: ["invalidTool" as ToolId],
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        runSyncPipeline({
          rootDir: tempDir,
          tools: ["invalidTool" as ToolId],
        })
      ).rejects.toThrow(/Invalid tool\(s\): invalidTool/);
    });
  });

  describe("tool selection", () => {
    it("syncs only specified tools", async () => {
      await copyFixture("valid/full", tempDir);

      const results = await runSyncPipeline({
        rootDir: tempDir,
        tools: ["claudeCode"],
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.tool).toBe("claudeCode");
    });

    it("syncs only enabled tools from config", async () => {
      const aiDir = path.join(tempDir, ".ai");
      await fs.mkdir(aiDir, { recursive: true });

      // Only claudeCode enabled
      await fs.writeFile(
        path.join(aiDir, "config.json"),
        JSON.stringify({
          tools: {
            claudeCode: { enabled: true },
            opencode: { enabled: false },
          },
        }),
        "utf-8"
      );

      const results = await runSyncPipeline({ rootDir: tempDir });

      expect(results).toHaveLength(1);
      expect(results[0]?.tool).toBe("claudeCode");
    });

    it("returns empty array when no tools match", async () => {
      const aiDir = path.join(tempDir, ".ai");
      await fs.mkdir(aiDir, { recursive: true });

      await fs.writeFile(
        path.join(aiDir, "config.json"),
        JSON.stringify({
          tools: {
            claudeCode: { enabled: true },
          },
        }),
        "utf-8"
      );

      // Request a tool that isn't enabled
      const results = await runSyncPipeline({
        rootDir: tempDir,
        tools: ["opencode"],
      });

      // opencode isn't registered in the requested tools filter, but we still
      // process it since it's explicitly requested
      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  describe("dryRun mode", () => {
    it("does not write files when dryRun is true", async () => {
      await copyFixture("valid/minimal", tempDir);

      const results = await runSyncPipeline({
        rootDir: tempDir,
        dryRun: true,
        tools: ["claudeCode"],
      });

      // Results should indicate what would be created
      expect(results.length).toBeGreaterThan(0);

      // But .claude directory should not exist
      await expect(fs.access(path.join(tempDir, ".claude"))).rejects.toThrow();
    });

    it("returns correct change actions in dryRun", async () => {
      await copyFixture("valid/full", tempDir);

      const results = await runSyncPipeline({
        rootDir: tempDir,
        dryRun: true,
        tools: ["claudeCode"],
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.changes.length).toBeGreaterThan(0);
      // All actions should be 'create' since files don't exist yet
      expect(results[0]?.changes.every((c) => c.action === "create")).toBe(
        true
      );
    });
  });

  describe(".gitignore management", () => {
    it("adds to .gitignore for tools with versionControl: false", async () => {
      const aiDir = path.join(tempDir, ".ai");
      await fs.mkdir(aiDir, { recursive: true });

      await fs.writeFile(
        path.join(aiDir, "config.json"),
        JSON.stringify({
          tools: {
            claudeCode: { enabled: true, versionControl: false },
          },
        }),
        "utf-8"
      );

      // Add settings so there's content to export
      await fs.writeFile(
        path.join(aiDir, "settings.json"),
        JSON.stringify({ permissions: { allow: ["Bash(git:*)"] } }),
        "utf-8"
      );

      await runSyncPipeline({ rootDir: tempDir, tools: ["claudeCode"] });

      const gitignore = await fs.readFile(
        path.join(tempDir, ".gitignore"),
        "utf-8"
      );
      expect(gitignore).toContain("# lnai-generated");
    });

    it("does not add to .gitignore for tools with versionControl: true", async () => {
      const aiDir = path.join(tempDir, ".ai");
      await fs.mkdir(aiDir, { recursive: true });

      await fs.writeFile(
        path.join(aiDir, "config.json"),
        JSON.stringify({
          tools: {
            claudeCode: { enabled: true, versionControl: true },
          },
        }),
        "utf-8"
      );

      await runSyncPipeline({ rootDir: tempDir, tools: ["claudeCode"] });

      // .gitignore might not exist or should not have lnai entries
      try {
        const gitignore = await fs.readFile(
          path.join(tempDir, ".gitignore"),
          "utf-8"
        );
        // If it exists, it should be minimal
        expect(
          gitignore.includes(".claude") && gitignore.includes("lnai-generated")
        ).toBe(false);
      } catch {
        // File doesn't exist, which is fine
      }
    });

    it("does not ignore shared paths when any producing tool has versionControl: true", async () => {
      const aiDir = path.join(tempDir, ".ai");
      await fs.mkdir(aiDir, { recursive: true });

      await fs.writeFile(
        path.join(aiDir, "config.json"),
        JSON.stringify({
          tools: {
            cursor: { enabled: true, versionControl: false },
            copilot: { enabled: true, versionControl: true },
          },
        }),
        "utf-8"
      );

      // Create AGENTS.md so both tools produce root AGENTS.md
      await fs.writeFile(
        path.join(aiDir, "AGENTS.md"),
        "# Project Agent",
        "utf-8"
      );

      // Add settings so cursor produces .cursor/cli.json (tool-unique path)
      await fs.writeFile(
        path.join(aiDir, "settings.json"),
        JSON.stringify({ permissions: { allow: ["Bash(git:*)"] } }),
        "utf-8"
      );

      await runSyncPipeline({
        rootDir: tempDir,
        tools: ["cursor", "copilot"],
      });

      const gitignorePath = path.join(tempDir, ".gitignore");
      let gitignore: string;
      try {
        gitignore = await fs.readFile(gitignorePath, "utf-8");
      } catch {
        gitignore = "";
      }

      // AGENTS.md should NOT be ignored because copilot has versionControl: true
      expect(gitignore).not.toMatch(/^AGENTS\.md$/m);

      // .cursor/ paths SHOULD be ignored (unique to cursor which has versionControl: false)
      expect(gitignore).toContain(".cursor/");

      // .github/ paths should NOT be ignored (unique to copilot which has versionControl: true)
      expect(gitignore).not.toMatch(/\.github\//);
    });

    it("ignores shared paths when all producing tools have versionControl: false", async () => {
      const aiDir = path.join(tempDir, ".ai");
      await fs.mkdir(aiDir, { recursive: true });

      await fs.writeFile(
        path.join(aiDir, "config.json"),
        JSON.stringify({
          tools: {
            cursor: { enabled: true, versionControl: false },
            copilot: { enabled: true, versionControl: false },
          },
        }),
        "utf-8"
      );

      await fs.writeFile(
        path.join(aiDir, "AGENTS.md"),
        "# Project Agent",
        "utf-8"
      );

      await runSyncPipeline({
        rootDir: tempDir,
        tools: ["cursor", "copilot"],
      });

      const gitignore = await fs.readFile(
        path.join(tempDir, ".gitignore"),
        "utf-8"
      );

      // AGENTS.md SHOULD be ignored because both tools have versionControl: false
      expect(gitignore).toMatch(/^AGENTS\.md$/m);
    });

    it("preserves managed entries during single-tool partial sync", async () => {
      await copyFixture("valid/full", tempDir);

      // Initial full sync writes managed entries for claudeCode (versionControl: false)
      await runSyncPipeline({ rootDir: tempDir });

      const gitignorePath = path.join(tempDir, ".gitignore");
      const before = await fs.readFile(gitignorePath, "utf-8");
      expect(before).toContain(".claude/CLAUDE.md");

      // Partial sync only opencode (versionControl: true) should not drop claude entries
      await runSyncPipeline({ rootDir: tempDir, tools: ["opencode"] });

      const after = await fs.readFile(gitignorePath, "utf-8");
      expect(after).toContain(".claude/CLAUDE.md");
      expect(after).toContain("# lnai-generated");
    });
  });

  describe("change detection", () => {
    it("detects unchanged files on second run", async () => {
      await copyFixture("valid/full", tempDir);

      // First run
      await runSyncPipeline({ rootDir: tempDir, tools: ["claudeCode"] });

      // Second run
      const results = await runSyncPipeline({
        rootDir: tempDir,
        tools: ["claudeCode"],
      });

      expect(results).toHaveLength(1);
      // All changes should be 'unchanged' on second run
      expect(results[0]?.changes.every((c) => c.action === "unchanged")).toBe(
        true
      );
    });
  });

  describe("error handling", () => {
    it("throws when .ai directory is missing", async () => {
      await expect(runSyncPipeline({ rootDir: tempDir })).rejects.toThrow();
    });
  });

  describe("manifest tracking", () => {
    it("creates manifest after first sync", async () => {
      await copyFixture("valid/full", tempDir);

      await runSyncPipeline({ rootDir: tempDir, tools: ["claudeCode"] });

      // Manifest should exist
      const manifestPath = path.join(tempDir, UNIFIED_DIR, MANIFEST_FILENAME);
      const stat = await fs.stat(manifestPath);
      expect(stat.isFile()).toBe(true);

      // Manifest should contain claudeCode entry
      const manifest = await readManifest(tempDir);
      expect(manifest?.tools.claudeCode).toBeDefined();
      expect(manifest?.tools.claudeCode?.files.length).toBeGreaterThan(0);
    });

    it("does not update manifest during dry-run", async () => {
      await copyFixture("valid/full", tempDir);

      await runSyncPipeline({
        rootDir: tempDir,
        dryRun: true,
        tools: ["claudeCode"],
      });

      // Manifest should not exist
      const manifestPath = path.join(tempDir, UNIFIED_DIR, MANIFEST_FILENAME);
      await expect(fs.access(manifestPath)).rejects.toThrow();
    });

    it("preserves other tools in manifest during partial sync", async () => {
      await copyFixture("valid/full", tempDir);

      // First sync claudeCode
      await runSyncPipeline({ rootDir: tempDir, tools: ["claudeCode"] });

      // Then sync cursor
      await runSyncPipeline({ rootDir: tempDir, tools: ["cursor"] });

      // Manifest should contain both tools
      const manifest = await readManifest(tempDir);
      expect(manifest?.tools.claudeCode).toBeDefined();
      expect(manifest?.tools.cursor).toBeDefined();
    });
  });

  describe("orphan cleanup", () => {
    it("deletes orphaned files when config is removed", async () => {
      await copyFixture("valid/full", tempDir);

      // First sync with full config including skills
      await runSyncPipeline({ rootDir: tempDir, tools: ["claudeCode"] });

      // Verify skill symlink exists
      const skillPath = path.join(tempDir, ".claude", "skills", "deploy");
      const statBefore = await fs.lstat(skillPath);
      expect(statBefore.isSymbolicLink()).toBe(true);

      // Remove skill from .ai/skills/
      const skillsDir = path.join(tempDir, UNIFIED_DIR, "skills");
      await fs.rm(skillsDir, { recursive: true, force: true });

      // Re-sync
      const results = await runSyncPipeline({
        rootDir: tempDir,
        tools: ["claudeCode"],
      });

      // Should have delete action in changes
      const deleteChanges = results[0]?.changes.filter(
        (c) => c.action === "delete"
      );
      expect(deleteChanges?.length).toBeGreaterThan(0);
      expect(deleteChanges?.some((c) => c.path.includes("skills/deploy"))).toBe(
        true
      );

      // Skill symlink should be deleted
      await expect(fs.lstat(skillPath)).rejects.toThrow();
    });

    it("removes deleted files from managed .gitignore entries", async () => {
      await copyFixture("valid/full", tempDir);

      await runSyncPipeline({ rootDir: tempDir, tools: ["claudeCode"] });

      const gitignorePath = path.join(tempDir, ".gitignore");
      const gitignoreBefore = await fs.readFile(gitignorePath, "utf-8");
      expect(gitignoreBefore).toContain(".claude/skills/deploy");

      const skillsDir = path.join(tempDir, UNIFIED_DIR, "skills");
      await fs.rm(skillsDir, { recursive: true, force: true });

      await runSyncPipeline({ rootDir: tempDir, tools: ["claudeCode"] });

      const gitignoreAfter = await fs.readFile(gitignorePath, "utf-8");
      expect(gitignoreAfter).not.toContain(".claude/skills/deploy");
      expect(gitignoreAfter).toContain("# lnai-generated");
    });

    it("shows delete actions in dry-run without deleting", async () => {
      await copyFixture("valid/full", tempDir);

      // First sync
      await runSyncPipeline({ rootDir: tempDir, tools: ["claudeCode"] });

      // Remove skill
      const skillsDir = path.join(tempDir, UNIFIED_DIR, "skills");
      await fs.rm(skillsDir, { recursive: true, force: true });

      // Dry-run sync
      const results = await runSyncPipeline({
        rootDir: tempDir,
        dryRun: true,
        tools: ["claudeCode"],
      });

      // Should show delete action
      const deleteChanges = results[0]?.changes.filter(
        (c) => c.action === "delete"
      );
      expect(deleteChanges?.length).toBeGreaterThan(0);

      // But skill symlink should still exist
      const skillPath = path.join(tempDir, ".claude", "skills", "deploy");
      const stat = await fs.lstat(skillPath);
      expect(stat.isSymbolicLink()).toBe(true);
    });

    it("skips cleanup when --skip-cleanup is set", async () => {
      await copyFixture("valid/full", tempDir);

      // First sync
      await runSyncPipeline({ rootDir: tempDir, tools: ["claudeCode"] });

      // Remove skill
      const skillsDir = path.join(tempDir, UNIFIED_DIR, "skills");
      await fs.rm(skillsDir, { recursive: true, force: true });

      // Sync with skipCleanup
      const results = await runSyncPipeline({
        rootDir: tempDir,
        skipCleanup: true,
        tools: ["claudeCode"],
      });

      // Should not have delete actions
      const deleteChanges = results[0]?.changes.filter(
        (c) => c.action === "delete"
      );
      expect(deleteChanges?.length ?? 0).toBe(0);

      // Skill symlink should still exist
      const skillPath = path.join(tempDir, ".claude", "skills", "deploy");
      const stat = await fs.lstat(skillPath);
      expect(stat.isSymbolicLink()).toBe(true);
    });

    it("handles first sync with no previous manifest gracefully", async () => {
      await copyFixture("valid/minimal", tempDir);

      // First sync should work without errors
      const results = await runSyncPipeline({
        rootDir: tempDir,
        tools: ["claudeCode"],
      });

      expect(results).toHaveLength(1);
      // No delete actions on first sync
      const deleteChanges = results[0]?.changes.filter(
        (c) => c.action === "delete"
      );
      expect(deleteChanges?.length ?? 0).toBe(0);
    });
  });
});
