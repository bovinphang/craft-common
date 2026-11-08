import type { InstallLanguage } from "../../content/types.js";
import type { OwnedEntry } from "./shared-config/types.js";
import type { InstallSession } from "./session.js";

export type ProductAction = "install" | "update" | "uninstall";
export interface ProductDefinition {
  packageName: string;
  consumerProduct: string;
  resourcePrefix: string;
  manifestName: string;
  stateDirectoryName: string;
  markerId: string;
  retainUnrequestedFiles?: boolean;
  nativeMetadata?: boolean;
  resourceEntries?: Readonly<Record<string, readonly string[]>>;
}
export interface ProductContext {
  packageVersion: string;
  runtime: string;
  scope: "local" | "global";
  language: InstallLanguage;
  cwd: string;
  home: string;
  baseDir: string;
  allowedRoots: string[];
  dryRun: boolean;
}
export interface CommonPointer {
  target: string;
  ledgerDir: string;
  packageVersion: string;
  language: InstallLanguage;
  digest: string;
}
export interface ProductManifestState {
  product: string;
  packageVersion: string;
  runtime: string;
  scope: "local" | "global";
  language: InstallLanguage;
  installedAt: string;
  files: Array<{ path: string; hash: string }>;
  sharedEntries: Array<{ path: string; entry: OwnedEntry }>;
  common?: CommonPointer;
}
export interface ManifestCodec {
  decode(bytes: Buffer, ctx: ProductContext): ProductManifestState;
  encode(state: ProductManifestState, ctx: ProductContext): Buffer;
}
export interface ProductInstallResult {
  changed: string[];
  preserved: string[];
  conflicts: string[];
  common: "shared" | "none" | "retained";
  status: "complete" | "partial" | "planned";
}
export interface RuntimeProductAdapter {
  configurationFiles(ctx: ProductContext): string[];
  plan(ctx: ProductContext, session: InstallSession): Promise<void>;
}
