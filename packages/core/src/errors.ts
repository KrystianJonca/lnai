export class LnaiError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "LnaiError";
    this.code = code;
  }
}

export class ParseError extends LnaiError {
  public readonly filePath: string;

  constructor(message: string, filePath: string, cause?: Error) {
    super(message, "PARSE_ERROR");
    this.name = "ParseError";
    this.filePath = filePath;
    if (cause) {
      this.cause = cause;
    }
  }
}

export class ValidationError extends LnaiError {
  public readonly path: string[];
  public readonly value?: unknown;

  constructor(message: string, path: string[], value?: unknown) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
    this.path = path;
    this.value = value;
  }
}

export class FileNotFoundError extends LnaiError {
  public readonly filePath: string;

  constructor(message: string, filePath: string) {
    super(message, "FILE_NOT_FOUND");
    this.name = "FileNotFoundError";
    this.filePath = filePath;
  }
}

export class WriteError extends LnaiError {
  public readonly filePath: string;

  constructor(message: string, filePath: string, cause?: Error) {
    super(message, "WRITE_ERROR");
    this.name = "WriteError";
    this.filePath = filePath;
    if (cause) {
      this.cause = cause;
    }
  }
}

export class PluginError extends LnaiError {
  public readonly pluginId: string;

  constructor(message: string, pluginId: string, cause?: Error) {
    super(message, "PLUGIN_ERROR");
    this.name = "PluginError";
    this.pluginId = pluginId;
    if (cause) {
      this.cause = cause;
    }
  }
}
