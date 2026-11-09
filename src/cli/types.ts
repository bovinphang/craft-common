import type { InstallLanguage } from "../content/types.js";
export type CliExitCode = 0 | 1 | 2;
export type CliScope = "local" | "global";
export interface CliProductDefinition {
  packageName: string;
  commandName: string;
  binName: string;
  version: string;
  runtimes: readonly string[];
  languages?: readonly InstallLanguage[];
  defaults?: {
    runtime?: string;
    language?: InstallLanguage;
    scope?: CliScope;
    setupScope?: CliScope;
  };
  help?: string;
}
export interface CliIO {
  cwd: string;
  home: string;
  productRoot: string;
  env: NodeJS.ProcessEnv;
  stdout(value: string): void;
  stderr(value: string): void;
  isTTY?: boolean;
  signal?: AbortSignal;
}
export interface CliInstallation {
  runtime: string;
  scope: CliScope;
  language: InstallLanguage;
  manifestPath?: string;
  data?: unknown;
}
export interface CliResourceOptions {
  action: "install" | "update" | "uninstall";
  runtime: string;
  scope: CliScope;
  language: InstallLanguage;
  dryRun: boolean;
  force: boolean;
  canPrompt: boolean;
  installation?: CliInstallation;
}
export interface CliCommandResult {
  code?: CliExitCode;
  value?: unknown;
  text?: string;
}
export interface CliDiscoveryFilter {
  runtimes?: string[];
  scopes?: CliScope[];
  onError?: (error: Error) => void;
}
export interface CliPrompts {
  promptRuntime(): Promise<string[] | undefined>;
  promptLocation(runtimes: string[]): Promise<boolean | undefined>;
  promptLanguage(): Promise<InstallLanguage | undefined>;
}
export interface CliProductAdapter {
  discover(filter: CliDiscoveryFilter, io: CliIO): Promise<CliInstallation[]>;
  resource(options: CliResourceOptions, io: CliIO): Promise<CliCommandResult>;
  command?(argv: string[], io: CliIO): Promise<CliCommandResult | undefined>;
  prompts?(io: CliIO): CliPrompts;
  lifecycle?(
    action: "update" | "uninstall",
    argv: string[],
    io: CliIO,
  ): Promise<CliExitCode>;
}
