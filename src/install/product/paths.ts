import fs from "node:fs";
import path from "node:path";
import { canonicalPath } from "../identity.js";
import { runtimeDescriptor } from "./runtime-descriptors.js";

export interface RuntimeTargetInput {
  runtime: string;
  cwd: string;
  home: string;
  scope: "local" | "global";
  env: NodeJS.ProcessEnv;
  compatibility: "frontend" | "backend";
  baseDir?: string;
}

export interface RuntimeTargets {
  baseDir: string;
  skillsDir?: string;
  resourceRoots: string[];
}

export function resolveRuntimeTargets(
  input: RuntimeTargetInput,
): RuntimeTargets {
  const descriptor = runtimeDescriptor(input.runtime);
  const { runtime, env, compatibility, scope } = input;
  if (scope !== "local" && scope !== "global") throw new Error("Invalid scope");
  if (compatibility !== "frontend" && compatibility !== "backend") {
    throw new Error("Invalid compatibility profile");
  }
  const cwd = path.resolve(input.cwd),
    home = path.resolve(input.home);
  const expand = (value: string): string =>
    compatibility === "frontend"
      ? value === "~" || value.startsWith("~/")
        ? path.join(home, value.slice(1))
        : value
      : value.replace(/^~(?=[\\/]|$)/, home);
  const present = (value: string | undefined): boolean =>
    compatibility === "frontend" ? Boolean(value) : value !== undefined;
  const key =
    runtime === "codex"
      ? "CODEX_HOME"
      : runtime === "openclaw"
        ? "OPENCLAW_STATE_DIR"
        : `${runtime.toUpperCase()}_CONFIG_DIR`;
  const configured = present(env[key])
    ? env[key]
    : runtime === "openclaw" && present(env.OPENCLAW_CONFIG_DIR)
      ? env.OPENCLAW_CONFIG_DIR
      : undefined;
  const xdg =
    compatibility === "frontend"
      ? env.XDG_CONFIG_HOME
        ? expand(env.XDG_CONFIG_HOME)
        : path.join(home, ".config")
      : (env.XDG_CONFIG_HOME ?? path.join(home, ".config"));
  const defaults: Record<string, string> = {
    windsurf: path.join(home, ".codeium", "windsurf"),
    opencode: path.join(xdg, "opencode"),
    kilo: path.join(xdg, "kilo"),
    antigravity: path.join(home, ".gemini", "config"),
    cline: path.join(home, "Documents", "Cline"),
  };
  const global =
    configured === undefined
      ? (defaults[runtime] ?? path.join(home, `.${runtime}`))
      : expand(configured);
  // Profiles preserve existing relative/empty environment override semantics.
  const defaultBaseDir =
    scope === "local"
      ? path.join(cwd, descriptor.localDirectory)
      : compatibility === "backend"
        ? path.resolve(global)
        : global;
  const baseDir = input.baseDir ?? defaultBaseDir;
  const skillsDir = !descriptor.skills
    ? undefined
    : runtime === "codex"
      ? path.join(scope === "global" ? home : cwd, ".agents", "skills")
      : runtime === "openclaw"
        ? path.join(scope === "global" ? baseDir : cwd, "skills")
        : path.join(baseDir, "skills");
  return {
    baseDir,
    ...(skillsDir ? { skillsDir } : {}),
    resourceRoots: [
      ...new Set(
        [
          baseDir,
          ...(skillsDir ? [skillsDir] : []),
          ...(scope === "local" ? [cwd] : []),
        ].map((root) => path.resolve(root)),
      ),
    ],
  };
}

export function productPathKey(file: string): string {
  const resolved = path.resolve(file);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function inside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return (
    !path.isAbsolute(relative) &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`)
  );
}

export function safeProductPath(
  file: string,
  roots: readonly string[],
): string {
  const absolute = path.resolve(file);
  const candidates = roots
    .flatMap((root) => {
      const real = canonicalPath(root);
      return [
        { boundary: path.resolve(root), real },
        { boundary: real, real },
      ];
    })
    .sort((a, b) => b.boundary.length - a.boundary.length);
  for (const { boundary, real } of candidates) {
    if (
      productPathKey(absolute) === productPathKey(boundary) ||
      !inside(boundary, absolute)
    )
      continue;
    let current = absolute;
    while (productPathKey(current) !== productPathKey(boundary)) {
      try {
        if (fs.lstatSync(current).isSymbolicLink())
          throw new Error(`Product path contains an internal link: ${current}`);
      } catch (error) {
        if (
          !["ENOENT", "ENOTDIR"].includes(
            (error as NodeJS.ErrnoException).code ?? "",
          )
        )
          throw error;
      }
      const parent = path.dirname(current);
      if (parent === current)
        throw new Error("Product path did not reach its declared boundary");
      current = parent;
    }
    return path.resolve(real, path.relative(boundary, absolute));
  }
  throw new Error(`Product path exceeds its allowed boundary: ${file}`);
}
