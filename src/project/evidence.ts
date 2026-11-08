import path from "node:path";
import { parse as parseToml } from "smol-toml";
import { parseDocument } from "yaml";
export const BUILD_MARKERS: Readonly<Record<string, readonly string[]>> = {
  "Cargo.toml": ["rust"],
  "go.mod": ["go"],
  "go.work": ["go"],
  "pom.xml": ["java"],
  "build.gradle": ["java"],
  "build.gradle.kts": ["java"],
  "settings.gradle": ["java"],
  "settings.gradle.kts": ["java"],
  "pyproject.toml": ["python"],
  "setup.py": ["python"],
  "setup.cfg": ["python"],
  "requirements.txt": ["python"],
  "CMakeLists.txt": [],
  "CMakePresets.json": [],
  "meson.build": [],
  Makefile: [],
  makefile: [],
  "package.json": [],
  "pnpm-workspace.yaml": [],
  "tauri.conf.json": [],
  "Tauri.toml": [],
};
export const SOURCE_EXTENSIONS: Readonly<Record<string, string>> = {
  ".rs": "rust",
  ".go": "go",
  ".java": "java",
  ".py": "python",
  ".c": "c",
  ".cc": "cpp",
  ".cpp": "cpp",
  ".cxx": "cpp",
  ".c++": "cpp",
  ".hpp": "cpp",
  ".hxx": "cpp",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".vue": "javascript",
};
export const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "target",
  ".venv",
  "venv",
  "build",
  "dist",
  ".idea",
  ".gradle",
  "__pycache__",
  ".mypy_cache",
  ".pytest_cache",
  "vendor",
  ".ssh",
  ".aws",
  ".azure",
  ".kube",
]);
export const sensitiveFile = (name: string): boolean =>
  /^\.env(?:\.|$)|\.(?:pem|key|p12|pfx)$|^(?:id_rsa|id_ed25519|credentials|auth\.json)$/i.test(
    name,
  );
export const sourceLanguage = (file: string): string | undefined =>
  SOURCE_EXTENSIONS[path.extname(file).toLowerCase()];
export function declaredNativeLanguages(body: string): string[] {
  const result = new Set<string>();
  for (const command of cmakeCommands(body)) {
    if (!["project", "enable_language"].includes(command.name)) continue;
    const tokens = /\bLANGUAGES\b/i.test(command.args)
      ? command.args.split(/\bLANGUAGES\b/i)[1]
      : command.name === "enable_language"
        ? command.args
        : "";
    if (/\bC\b/.test(tokens)) result.add("c");
    if (/\bCXX\b/.test(tokens)) result.add("cpp");
  }
  return [...result].sort();
}
export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function jsonManifest(body: string): Record<string, unknown> {
  const value: unknown = JSON.parse(body);
  const document = parseDocument(body, { uniqueKeys: true });
  if (
    document.errors.length ||
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  )
    throw new Error("Invalid JSON manifest");
  return record(value);
}
export function tomlManifest(body: string): Record<string, unknown> {
  return record(parseToml(body));
}
export function yamlManifest(body: string): Record<string, unknown> {
  const document = parseDocument(body, { uniqueKeys: true, strict: true });
  if (document.errors.length) throw new Error("Invalid YAML manifest");
  return record(document.toJS({ maxAliasCount: 10 }));
}
/** Preserve a declared constraint, never URLs, credentials or an invented resolved version. */
export function versionConstraint(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  const text = value.trim();
  return text.length <= 128 &&
    /^(?:[~^<>=!]*\s*v?\d[0-9A-Za-z.*+~<>=!,|\s-]*|\*)$/.test(text)
    ? text
    : undefined;
}
export interface ManifestDependency {
  name: string;
  version?: string;
}
export function npmDependencies(body: string): ManifestDependency[] {
  const pkg = jsonManifest(body);
  return [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ].flatMap((key) => {
    if (
      pkg[key] !== undefined &&
      (!pkg[key] || typeof pkg[key] !== "object" || Array.isArray(pkg[key]))
    )
      throw new Error("Invalid npm dependency table");
    return Object.entries(record(pkg[key])).map(([name, value]) => {
      if (typeof value !== "string")
        throw new Error("Invalid npm dependency value");
      return { name, version: versionConstraint(value) };
    });
  });
}
export function cargoDependencies(body: string): ManifestDependency[] {
  const manifest = tomlManifest(body),
    tables = [
      record(manifest.dependencies),
      record(manifest["build-dependencies"]),
      ...Object.values(record(manifest.target)).flatMap((target) => [
        record(record(target).dependencies),
        record(record(target)["build-dependencies"]),
      ]),
    ];
  return tables.flatMap((table) =>
    Object.entries(table).map(([key, value]) => ({
      name:
        typeof record(value).package === "string"
          ? (record(value).package as string)
          : key,
      version: versionConstraint(
        typeof value === "string" ? value : record(value).version,
      ),
    })),
  );
}
export function pythonDependencies(body: string): ManifestDependency[] {
  const manifest = tomlManifest(body),
    project = record(manifest.project),
    values = Array.isArray(project.dependencies) ? project.dependencies : [];
  const result = values.flatMap((value) => {
    if (typeof value !== "string") throw new Error("Invalid Python dependency");
    const match =
      /^\s*([A-Za-z0-9][A-Za-z0-9._-]*)(?:\[[^\]]*\])?\s*([^;]*)/.exec(value);
    return match
      ? [
          {
            name: match[1].toLowerCase().replace(/_/g, "-"),
            version: versionConstraint(match[2]),
          },
        ]
      : [];
  });
  for (const [name, value] of Object.entries(
    record(record(record(manifest.tool).poetry).dependencies),
  ))
    result.push({
      name: name.toLowerCase().replace(/_/g, "-"),
      version: versionConstraint(
        typeof value === "string" ? value : record(value).version,
      ),
    });
  return result;
}
export function goDependencies(body: string): ManifestDependency[] {
  const clean = body.replace(/\/\/[^\n]*/g, ""),
    result: ManifestDependency[] = [];
  let block = false;
  for (const raw of clean.split(/\r?\n/)) {
    let line = raw.trim();
    if (/^require\s*\(/.test(line)) {
      block = true;
      line = line.replace(/^require\s*\(/, "").trim();
    } else if (line === ")") {
      block = false;
      continue;
    } else if (line.startsWith("require ")) line = line.slice(8).trim();
    else if (!block) continue;
    const match = /^([^\s]+)\s+(v[^\s]+)/.exec(line);
    if (match)
      result.push({ name: match[1], version: versionConstraint(match[2]) });
  }
  return result;
}
export interface MavenCoordinate {
  group: string;
  artifact: string;
  version?: string;
}
export function mavenCoordinates(body: string): MavenCoordinate[] {
  if (/<!DOCTYPE|<!ENTITY/i.test(body))
    throw new Error("Unsupported XML entity declarations");
  const clean = body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\?[\s\S]*?\?>/g, "")
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");
  if (!/^\s*<project(?:\s|\/?>)/.test(clean))
    throw new Error("Invalid Maven project");
  const stack: string[] = [];
  let previous = 0,
    roots = 0;
  for (const match of clean.matchAll(
    /<\/?([A-Za-z_][\w:.-]*)(?:\s+(?:[^"'<>]|"[^"]*"|'[^']*')*)?\s*\/?>/g,
  )) {
    const between = clean.slice(previous, match.index);
    if (between.includes("<") || (!stack.length && between.trim()))
      throw new Error("Malformed XML");
    previous = match.index! + match[0].length;
    if (match[0].startsWith("</")) {
      if (stack.pop() !== match[1]) throw new Error("Unbalanced XML");
    } else {
      if (!stack.length && ++roots > 1) throw new Error("Multiple XML roots");
      if (!/\/\s*>$/.test(match[0])) stack.push(match[1]);
    }
  }
  if (stack.length || clean.slice(previous).trim())
    throw new Error("Unbalanced XML");
  return [
    ...clean.matchAll(/<(dependency|parent)>\s*([\s\S]*?)<\/\1>/g),
  ].flatMap((match) => {
    const group = /<groupId>\s*([^<]+)\s*<\/groupId>/
        .exec(match[2])?.[1]
        .trim(),
      artifact = /<artifactId>\s*([^<]+)\s*<\/artifactId>/
        .exec(match[2])?.[1]
        .trim(),
      version = /<version>\s*([^<]+)\s*<\/version>/.exec(match[2])?.[1].trim();
    return group && artifact
      ? [{ group, artifact, version: versionConstraint(version) }]
      : [];
  });
}
function gradleDeclarations(body: string): string {
  return body
    .replace(/"""[\s\S]*?"""|'''[\s\S]*?'''/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}
export function gradleCoordinates(body: string): MavenCoordinate[] {
  return [
    ...gradleDeclarations(body).matchAll(
      /^\s*(?:implementation|api|runtimeOnly|compileOnly)\s*(?:\(\s*)?["']([^:"']+):([^:"']+)(?::([^"']+))?["']/gm,
    ),
  ].map((match) => ({
    group: match[1],
    artifact: match[2],
    version: versionConstraint(match[3]),
  }));
}
export function gradlePlugins(body: string): ManifestDependency[] {
  return [
    ...gradleDeclarations(body).matchAll(
      /^\s*id\s*(?:\(\s*|\s+)["']([^"']+)["']\s*\)?\s*(?:version\s*["']([^"']+)["'])?/gm,
    ),
  ].map((match) => ({ name: match[1], version: versionConstraint(match[2]) }));
}
/** Lex only top-level command calls; never execute CMake or inspect commands inside string arguments. */
export function cmakeCommands(
  body: string,
): Array<{ name: string; args: string }> {
  const result: Array<{ name: string; args: string }> = [];
  let index = 0;
  const bracket = (): string | undefined =>
    /^\[(=*)\[/.exec(body.slice(index))?.[1];
  const skipBracket = (equals: string) => {
    const end = body.indexOf("]" + equals + "]", index + equals.length + 2);
    if (end < 0) throw new Error("Unclosed CMake bracket");
    index = end + equals.length + 2;
  };
  const comment = () => {
    if (body[index] !== "#") return false;
    index++;
    const equals = bracket();
    if (equals !== undefined) skipBracket(equals);
    else {
      const end = body.indexOf("\n", index);
      index = end < 0 ? body.length : end + 1;
    }
    return true;
  };
  const quoted = () => {
    const start = index++;
    while (index < body.length) {
      if (body[index] === "\\") {
        index += 2;
        continue;
      }
      if (body[index++] === '"') return body.slice(start, index);
    }
    throw new Error("Unclosed CMake string");
  };
  while (index < body.length) {
    if (/\s/.test(body[index])) {
      index++;
      continue;
    }
    if (comment()) continue;
    if (body[index] === '"') {
      quoted();
      continue;
    }
    const literal = bracket();
    if (literal !== undefined) {
      skipBracket(literal);
      continue;
    }
    const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(body.slice(index));
    if (!name) {
      index++;
      continue;
    }
    index += name[0].length;
    while (index < body.length && /\s/.test(body[index])) index++;
    if (body[index] !== "(") continue;
    index++;
    let depth = 1,
      args = "";
    while (index < body.length && depth) {
      if (comment()) {
        args += " ";
        continue;
      }
      if (body[index] === '"') {
        args += quoted();
        continue;
      }
      const equals = bracket();
      if (equals !== undefined) {
        skipBracket(equals);
        args += " ";
        continue;
      }
      const value = body[index++];
      if (value === "(") depth++;
      if (value === ")") depth--;
      if (depth) args += value;
    }
    if (depth) throw new Error("Unclosed CMake command");
    result.push({ name: name[0].toLowerCase(), args });
  }
  return result;
}
export function cmakePackageVersion(
  body: string,
  name: string,
): { present: boolean; version?: string } {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let present = false,
    version: string | undefined;
  for (const command of cmakeCommands(body)) {
    if (command.name === "find_package") {
      const match = new RegExp(
        `^\\s*(?:${escaped}|"${escaped}")(?:\\s+([^\\s)]+))?(?=\\s|$)`,
      ).exec(command.args);
      if (match) {
        present = true;
        version = versionConstraint(match[1]);
      }
    } else if (
      command.name === "target_link_libraries" &&
      new RegExp(`\\b${escaped}::${escaped}\\b`).test(command.args)
    )
      present = true;
  }
  return { present, version };
}
