import path from "node:path";
import type { ProjectRole } from "../content/applicability.js";
import type { FrameworkDetector } from "./types.js";
import {
  npmDependencies,
  cargoDependencies,
  jsonManifest,
} from "./evidence.js";
export function npmFrameworkDetector(
  id: string,
  packages: readonly string[],
  roles: readonly ProjectRole[],
): FrameworkDetector {
  return {
    id,
    detect(input) {
      const body = input.readManifest("package.json");
      if (!body) return;
      const dependency = npmDependencies(body).find((item) =>
        packages.includes(item.name),
      );
      if (!dependency) return;
      return {
        evidence: { id, version: dependency.version, paths: ["package.json"] },
        roles: [...roles],
        relatedRoots: [],
      };
    },
  };
}
export function cargoFrameworkDetector(
  id: string,
  crate: string,
  roles: readonly ProjectRole[],
): FrameworkDetector {
  return {
    id,
    detect(input) {
      const body = input.readManifest("Cargo.toml");
      if (!body) return;
      const dependency = cargoDependencies(body).find(
        (item) => item.name === crate,
      );
      if (!dependency) return;
      return {
        evidence: { id, version: dependency.version, paths: ["Cargo.toml"] },
        roles: [...roles],
        relatedRoots: [],
      };
    },
  };
}
const electron: FrameworkDetector = {
  id: "electron",
  detect(input) {
    const body = input.readManifest("package.json");
    if (!body) return;
    const dependency = npmDependencies(body).find(
      (item) => item.name === "electron",
    );
    if (!dependency) return;
    const pkg = jsonManifest(body);
    return {
      evidence: {
        id: "electron",
        version: dependency.version,
        paths: ["package.json"],
      },
      roles: typeof pkg.main === "string" ? ["desktop-core"] : [],
      relatedRoots: [],
    };
  },
};
const tauri: FrameworkDetector = {
  id: "tauri",
  detect(input) {
    const own = input.readManifest("Cargo.toml"),
      nested = input.readManifest("src-tauri/Cargo.toml");
    const configuration =
        input.readManifest("tauri.conf.json") ??
        input.readManifest("Tauri.toml"),
      nestedConfiguration =
        input.readManifest("src-tauri/tauri.conf.json") ??
        input.readManifest("src-tauri/Tauri.toml");
    if (own) {
      const dependency = cargoDependencies(own).find(
        (item) => item.name === "tauri",
      );
      if (dependency)
        return {
          evidence: {
            id: "tauri",
            version: dependency.version,
            paths: [
              "Cargo.toml",
              ...(configuration
                ? [
                    input.files.includes("tauri.conf.json")
                      ? "tauri.conf.json"
                      : "Tauri.toml",
                  ]
                : []),
            ],
          },
          roles: configuration ? ["desktop-core"] : [],
          relatedRoots:
            configuration && path.basename(input.root) === "src-tauri"
              ? [path.dirname(input.root)]
              : [],
        };
    }
    if (nested && nestedConfiguration && input.readManifest("package.json")) {
      const dependency = cargoDependencies(nested).find(
        (item) => item.name === "tauri",
      );
      if (dependency)
        return {
          evidence: {
            id: "tauri",
            version: dependency.version,
            paths: [
              "package.json",
              "src-tauri/Cargo.toml",
              input.files.includes("src-tauri/tauri.conf.json")
                ? "src-tauri/tauri.conf.json"
                : "src-tauri/Tauri.toml",
            ],
          },
          roles: ["ui"],
          relatedRoots: [path.join(input.root, "src-tauri")],
        };
    }
    return undefined;
  },
};
export const DESKTOP_FRAMEWORK_DETECTORS: readonly FrameworkDetector[] = [
  tauri,
  electron,
];
