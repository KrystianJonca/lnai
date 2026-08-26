import { describe, expect, it } from "vitest";

import { validateMcpServers, validateOAuthFieldSupport } from "./mcp";

describe("validateMcpServers", () => {
  const pathPrefix = ["settings", "mcpServers"];

  it("returns empty array for undefined mcpServers", () => {
    const warnings = validateMcpServers(undefined, pathPrefix);

    expect(warnings).toEqual([]);
  });

  it("returns empty array for empty mcpServers", () => {
    const warnings = validateMcpServers({}, pathPrefix);

    expect(warnings).toEqual([]);
  });

  it("returns empty array for valid stdio server with command", () => {
    const warnings = validateMcpServers(
      {
        myServer: {
          command: "npx",
          args: ["-y", "some-mcp-server"],
        },
      },
      pathPrefix
    );

    expect(warnings).toEqual([]);
  });

  it("returns empty array for valid http server with url", () => {
    const warnings = validateMcpServers(
      {
        myServer: {
          type: "http",
          url: "https://example.com/mcp",
        },
      },
      pathPrefix
    );

    expect(warnings).toEqual([]);
  });

  it("returns empty array for valid sse server with url", () => {
    const warnings = validateMcpServers(
      {
        myServer: {
          type: "sse",
          url: "https://example.com/mcp",
        },
      },
      pathPrefix
    );

    expect(warnings).toEqual([]);
  });

  it("warns when local server has no command", () => {
    const warnings = validateMcpServers(
      {
        badServer: {
          args: ["--some-flag"],
        },
      },
      pathPrefix
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toEqual({
      path: ["settings", "mcpServers", "badServer"],
      message:
        'MCP server "badServer" has no command or type - it will be skipped',
    });
  });

  it("warns when http server has no url", () => {
    const warnings = validateMcpServers(
      {
        badServer: {
          type: "http",
        },
      },
      pathPrefix
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toEqual({
      path: ["settings", "mcpServers", "badServer"],
      message:
        'MCP server "badServer" is remote but has no URL - it will be skipped',
    });
  });

  it("warns when sse server has no url", () => {
    const warnings = validateMcpServers(
      {
        badServer: {
          type: "sse",
        },
      },
      pathPrefix
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toEqual({
      path: ["settings", "mcpServers", "badServer"],
      message:
        'MCP server "badServer" is remote but has no URL - it will be skipped',
    });
  });

  it("returns multiple warnings for multiple invalid servers", () => {
    const warnings = validateMcpServers(
      {
        noCommand: {
          args: ["--flag"],
        },
        noUrl: {
          type: "http",
        },
        valid: {
          command: "node",
          args: ["server.js"],
        },
      },
      pathPrefix
    );

    expect(warnings).toHaveLength(2);
    expect(warnings.map((w) => w.path[2])).toContain("noCommand");
    expect(warnings.map((w) => w.path[2])).toContain("noUrl");
  });

  it("uses custom path prefix", () => {
    const warnings = validateMcpServers(
      {
        badServer: {
          args: ["--flag"],
        },
      },
      ["custom", "path"]
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.path).toEqual(["custom", "path", "badServer"]);
  });
});

describe("validateOAuthFieldSupport", () => {
  const pathPrefix = ["settings", "mcpServers"];

  it("returns empty array for undefined mcpServers", () => {
    const warnings = validateOAuthFieldSupport(
      undefined,
      pathPrefix,
      "Cursor",
      ["callbackPort"]
    );

    expect(warnings).toEqual([]);
  });

  it("returns empty array when no server has oauth configured", () => {
    const warnings = validateOAuthFieldSupport(
      { myServer: { command: "npx" } },
      pathPrefix,
      "Cursor",
      ["callbackPort"]
    );

    expect(warnings).toEqual([]);
  });

  it("returns empty array when the configured oauth fields are all supported", () => {
    const warnings = validateOAuthFieldSupport(
      {
        myServer: {
          type: "http",
          url: "https://example.com/mcp",
          oauth: { clientId: "abc" },
        },
      },
      pathPrefix,
      "Cursor",
      ["callbackPort"]
    );

    expect(warnings).toEqual([]);
  });

  it("warns about a single unsupported field", () => {
    const warnings = validateOAuthFieldSupport(
      {
        myServer: {
          type: "http",
          url: "https://example.com/mcp",
          oauth: { clientId: "abc", callbackPort: 8080 },
        },
      },
      pathPrefix,
      "Cursor",
      ["callbackPort"]
    );

    expect(warnings).toEqual([
      {
        path: ["settings", "mcpServers", "myServer", "oauth"],
        message:
          'MCP server "myServer" has OAuth callbackPort configured - Cursor does not support syncing this field, so it will be skipped',
      },
    ]);
  });

  it("warns about multiple unsupported fields", () => {
    const warnings = validateOAuthFieldSupport(
      {
        myServer: {
          type: "http",
          url: "https://example.com/mcp",
          oauth: { clientId: "abc", clientSecret: "shh", scopes: ["read"] },
        },
      },
      pathPrefix,
      "GitHub Copilot",
      ["clientSecret", "scopes"]
    );

    expect(warnings).toEqual([
      {
        path: ["settings", "mcpServers", "myServer", "oauth"],
        message:
          'MCP server "myServer" has OAuth clientSecret, scopes configured - GitHub Copilot does not support syncing these fields, so they will be skipped',
      },
    ]);
  });
});
