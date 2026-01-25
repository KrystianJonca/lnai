import type { ToolId } from "../constants";
import type {
  OutputFile,
  UnifiedState,
  ValidationResult,
} from "../types/index";

export interface Plugin {
  id: ToolId;
  name: string;

  /** Detect if this tool's configuration exists in the given directory */
  detect(rootDir: string): Promise<boolean>;

  /** Import existing tool configuration into unified state */
  import(rootDir: string): Promise<Partial<UnifiedState> | null>;

  /** Export unified state to this tool's native format */
  export(state: UnifiedState, rootDir: string): Promise<OutputFile[]>;

  /** Validate unified state for this tool */
  validate(state: UnifiedState): ValidationResult;
}
