import { describe, expect, it } from "vitest";

import { validateMcpServers } from "./mcp";

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
