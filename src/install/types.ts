import type { ContentCatalog, InstallLanguage } from "../content/types.js";
export type Consumer = {
  product: string;
  manifestPath: string;
  scope: "local" | "global";
};
export type SharedRequest = {
  action: "install" | "update" | "uninstall";
  skillsDir: string;
  consumer: Consumer;
  catalog?: ContentCatalog;
  retainConsumer?: boolean;
};
export type FileMutation = {
  path: string;
  beforeHash: string | null;
  after: Buffer | null;
};
export type CommonPlan = {
  schemaVersion: 1;
  target: string;
  stateDigest: string;
  mutations: FileMutation[];
  conflicts: string[];
};
export type CommonManifest = {
  schemaVersion: 1;
  target: string;
  packageVersion: string;
  language: InstallLanguage;
  sourceDigest: string;
  files: Record<string, string>;
  residual: boolean;
};
export type DependencyLock = {
  schemaVersion: 1;
  target: string;
  consumers: Record<
    string,
    {
      consumer: Consumer;
      requiredVersion: string;
      language: InstallLanguage;
      digest: string;
    }
  >;
};
