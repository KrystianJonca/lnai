import { describe, expect, it } from "vitest";

import {
  FileNotFoundError,
  LnaiError,
  ParseError,
  PluginError,
  ValidationError,
  WriteError,
} from "./errors";

describe("LnaiError", () => {
  it("sets message and code correctly", () => {
    const error = new LnaiError("Test message", "TEST_CODE");

    expect(error.message).toBe("Test message");
    expect(error.code).toBe("TEST_CODE");
    expect(error.name).toBe("LnaiError");
  });

  it("extends Error", () => {
    const error = new LnaiError("Test", "TEST");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(LnaiError);
  });
});

describe("ParseError", () => {
  it("has filePath property", () => {
    const error = new ParseError("Parse failed", "/path/to/file.json");

    expect(error.filePath).toBe("/path/to/file.json");
    expect(error.code).toBe("PARSE_ERROR");
    expect(error.name).toBe("ParseError");
  });

  it("has cause when provided", () => {
    const cause = new Error("Original error");
    const error = new ParseError("Parse failed", "/path/to/file.json", cause);

    expect(error.cause).toBe(cause);
  });

  it("has no cause when not provided", () => {
    const error = new ParseError("Parse failed", "/path/to/file.json");

    expect(error.cause).toBeUndefined();
  });

  it("extends LnaiError", () => {
    const error = new ParseError("Parse failed", "/path/to/file.json");

    expect(error).toBeInstanceOf(LnaiError);
    expect(error).toBeInstanceOf(ParseError);
  });
});

describe("ValidationError", () => {
  it("has path array and optional value", () => {
    const error = new ValidationError(
      "Invalid value",
      ["config", "tools", "claudeCode"],
      { enabled: "yes" }
    );

    expect(error.path).toEqual(["config", "tools", "claudeCode"]);
    expect(error.value).toEqual({ enabled: "yes" });
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.name).toBe("ValidationError");
  });

  it("works without value", () => {
    const error = new ValidationError("Missing field", ["settings"]);

    expect(error.path).toEqual(["settings"]);
    expect(error.value).toBeUndefined();
  });

  it("extends LnaiError", () => {
    const error = new ValidationError("Invalid", []);

    expect(error).toBeInstanceOf(LnaiError);
    expect(error).toBeInstanceOf(ValidationError);
  });
});

describe("FileNotFoundError", () => {
  it("has filePath property", () => {
    const error = new FileNotFoundError(
      "Config not found",
      "/project/.ai/config.json"
    );

    expect(error.filePath).toBe("/project/.ai/config.json");
    expect(error.code).toBe("FILE_NOT_FOUND");
    expect(error.name).toBe("FileNotFoundError");
  });

  it("extends LnaiError", () => {
    const error = new FileNotFoundError("Not found", "/path");

    expect(error).toBeInstanceOf(LnaiError);
    expect(error).toBeInstanceOf(FileNotFoundError);
  });
});

describe("WriteError", () => {
  it("has filePath property", () => {
    const error = new WriteError("Write failed", "/output/settings.json");

    expect(error.filePath).toBe("/output/settings.json");
    expect(error.code).toBe("WRITE_ERROR");
    expect(error.name).toBe("WriteError");
  });

  it("has cause when provided", () => {
    const cause = new Error("EACCES: permission denied");
    const error = new WriteError("Write failed", "/output/file.json", cause);

    expect(error.cause).toBe(cause);
  });

  it("extends LnaiError", () => {
    const error = new WriteError("Write failed", "/path");

    expect(error).toBeInstanceOf(LnaiError);
    expect(error).toBeInstanceOf(WriteError);
  });
});

describe("PluginError", () => {
  it("has pluginId property", () => {
    const error = new PluginError("Export failed", "claudeCode");

    expect(error.pluginId).toBe("claudeCode");
    expect(error.code).toBe("PLUGIN_ERROR");
    expect(error.name).toBe("PluginError");
  });

  it("has cause when provided", () => {
    const cause = new Error("Internal plugin error");
    const error = new PluginError("Plugin crashed", "opencode", cause);

    expect(error.cause).toBe(cause);
  });

  it("extends LnaiError", () => {
    const error = new PluginError("Error", "testPlugin");

    expect(error).toBeInstanceOf(LnaiError);
    expect(error).toBeInstanceOf(PluginError);
  });
});

describe("Error inheritance chain", () => {
  it("all custom errors extend LnaiError", () => {
    const errors = [
      new ParseError("", ""),
      new ValidationError("", []),
      new FileNotFoundError("", ""),
      new WriteError("", ""),
      new PluginError("", ""),
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(LnaiError);
      expect(error).toBeInstanceOf(Error);
    }
  });
});
