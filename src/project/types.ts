import type { ProjectRole } from "../content/applicability.js";
export interface FrameworkEvidence {
  id: string;
  version?: string;
  paths: string[];
}
export interface ProjectUnit {
  root: string;
  languages: string[];
  frameworks: FrameworkEvidence[];
  roles: ProjectRole[];
  evidence: string[];
  buildFiles: string[];
  relatedRoots: string[];
  ambiguous: boolean;
}
export interface ProjectInspection {
  schemaVersion: 1;
  workspace: string;
  units: ProjectUnit[];
  warnings: string[];
  truncated: boolean;
}
export interface FrameworkDetector {
  id: string;
  detect(input: {
    root: string;
    files: readonly string[];
    readManifest: (relative: string) => string | undefined;
  }):
    | {
        evidence: FrameworkEvidence;
        roles: ProjectRole[];
        relatedRoots: string[];
      }
    | undefined;
}
export interface WorkspaceInspectionOptions {
  workspace: string;
  taskPath?: string;
  maxDepth?: number;
  maxEntries?: number;
  detectors?: readonly FrameworkDetector[];
}
