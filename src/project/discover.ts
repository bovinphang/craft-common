import fs from "node:fs";
import path from "node:path";
import {
  BUILD_MARKERS,
  IGNORED_DIRS,
  sensitiveFile,
  sourceLanguage,
  declaredNativeLanguages,
  jsonManifest,
  tomlManifest,
  yamlManifest,
  record,
  cmakeCommands,
  versionConstraint,
} from "./evidence.js";
import { PROJECT_ROLES } from "../content/applicability.js";
import { DESKTOP_FRAMEWORK_DETECTORS } from "./frameworks.js";
import type {
  ProjectInspection,
  ProjectUnit,
  WorkspaceInspectionOptions,
} from "./types.js";
const within = (root: string, file: string): boolean => {
  const relative = path.relative(root, file);
  return (
    !path.isAbsolute(relative) &&
    relative !== ".." &&
    !relative.startsWith(".." + path.sep)
  );
};
const key = (file: string) =>
  process.platform === "win32"
    ? path.resolve(file).toLowerCase()
    : path.resolve(file);
export function inspectWorkspace(
  options: WorkspaceInspectionOptions,
): ProjectInspection {
  const maxDepth = options.maxDepth ?? 12,
    maxEntries = options.maxEntries ?? 10000;
  if (
    !Number.isInteger(maxDepth) ||
    maxDepth < 0 ||
    maxDepth > 64 ||
    !Number.isInteger(maxEntries) ||
    maxEntries < 1 ||
    maxEntries > 1000000
  )
    throw new Error("扫描参数非法");
  const declared = path.resolve(options.workspace),
    workspace = fs.realpathSync(declared);
  if (!fs.statSync(workspace).isDirectory())
    throw new Error("工作区必须是目录");
  let task: string | undefined;
  if (options.taskPath) {
    const lexical = path.resolve(declared, options.taskPath);
    if (!within(declared, lexical)) throw new Error("任务路径越过工作区边界");
    task = path.resolve(workspace, path.relative(declared, lexical));
    let current = task;
    while (key(current) !== key(workspace)) {
      try {
        if (fs.lstatSync(current).isSymbolicLink())
          throw new Error("任务路径包含链接，无法确认边界");
      } catch (error) {
        if (
          !["ENOENT", "ENOTDIR"].includes(
            (error as NodeJS.ErrnoException).code ?? "",
          )
        )
          throw error;
      }
      const parent = path.dirname(current);
      if (parent === current) throw new Error("任务路径越界");
      current = parent;
    }
  }
  const report: ProjectInspection = {
      schemaVersion: 1,
      workspace,
      units: [],
      warnings: [],
      truncated: false,
    },
    files: string[] = [];
  let entries = 0;
  const warn = (message: string, truncated = false) => {
    report.warnings.push(message);
    if (truncated) report.truncated = true;
  };
  function visit(directory: string, depth: number): void {
    if (entries >= maxEntries) {
      warn("达到扫描数量上限，结果不完整", true);
      return;
    }
    if (depth > maxDepth) {
      warn("达到扫描深度上限：" + path.relative(workspace, directory), true);
      return;
    }
    let handle: fs.Dir;
    try {
      handle = fs.opendirSync(directory);
    } catch {
      warn("无法读取目录：" + path.relative(workspace, directory), true);
      return;
    }
    try {
      let entry: fs.Dirent | null;
      while ((entry = handle.readSync()) !== null) {
        if (++entries > maxEntries) {
          warn("达到扫描数量上限，结果不完整", true);
          break;
        }
        const file = path.join(directory, entry.name);
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) {
          if (!IGNORED_DIRS.has(entry.name) && !entry.name.startsWith(".ssh"))
            visit(file, depth + 1);
        } else if (
          entry.isFile() &&
          !sensitiveFile(entry.name) &&
          (Object.hasOwn(BUILD_MARKERS, entry.name) ||
            sourceLanguage(entry.name))
        )
          files.push(file);
      }
    } finally {
      handle.closeSync();
    }
  }
  visit(workspace, 0);
  files.sort();
  const inventory = new Set(files),
    roots = new Map<string, ProjectUnit>(),
    invalid = new Set<string>(),
    cache = new Map<string, string | undefined>();
  const relative = (file: string) =>
    path.relative(workspace, file).split(path.sep).join("/");
  function ensure(root: string): ProjectUnit {
    let unit = roots.get(root);
    if (!unit) {
      unit = {
        root,
        languages: [],
        frameworks: [],
        roles: [],
        evidence: [],
        buildFiles: [],
        relatedRoots: [],
        ambiguous: false,
      };
      roots.set(root, unit);
    }
    return unit;
  }
  function read(file: string): string | undefined {
    if (cache.has(file)) return cache.get(file);
    cache.set(file, undefined);
    if (
      !inventory.has(file) ||
      !Object.hasOwn(BUILD_MARKERS, path.basename(file)) ||
      path.basename(file) === "setup.py"
    )
      return;
    try {
      const stat = fs.lstatSync(file);
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        !within(workspace, fs.realpathSync(file))
      )
        throw new Error("Unsafe manifest");
      if (stat.size > 262144) {
        warn("清单过大，未读取：" + relative(file));
        invalid.add(file);
        return;
      }
      const descriptor = fs.openSync(
        file,
        fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0),
      );
      let body: string;
      try {
        if (!fs.fstatSync(descriptor).isFile())
          throw new Error("Unsafe manifest");
        const buffer = Buffer.alloc(262145),
          length = fs.readSync(descriptor, buffer, 0, buffer.length, 0);
        if (length > 262144) throw new Error("Manifest grew");
        body = buffer.subarray(0, length).toString("utf8");
        if (body.includes("\0")) throw new Error("Binary manifest");
      } finally {
        fs.closeSync(descriptor);
      }
      if (file.endsWith(".json")) jsonManifest(body);
      else if (file.endsWith(".toml")) tomlManifest(body);
      else if (file.endsWith(".yaml")) yamlManifest(body);
      cache.set(file, body);
      return body;
    } catch {
      warn("清单无法读取或解析：" + relative(file));
      invalid.add(file);
      return;
    }
  }
  const addLanguage = (unit: ProjectUnit, language: string) => {
    if (!unit.languages.includes(language)) unit.languages.push(language);
  };
  for (const file of files) {
    const marker = BUILD_MARKERS[path.basename(file)];
    if (!marker) continue;
    const unit = ensure(path.dirname(file));
    unit.buildFiles.push(relative(file));
    unit.evidence.push(relative(file));
    for (const language of marker) addLanguage(unit, language);
    const body = read(file);
    try {
      if (body && path.basename(file) === "CMakeLists.txt")
        for (const language of declaredNativeLanguages(body))
          addLanguage(unit, language);
      if (body && path.basename(file) === "package.json") {
        const pkg = jsonManifest(body);
        if (
          record(pkg.dependencies).typescript ||
          record(pkg.devDependencies).typescript
        )
          addLanguage(unit, "typescript");
        if (typeof pkg.main === "string" && sourceLanguage(pkg.main))
          addLanguage(unit, sourceLanguage(pkg.main)!);
      }
    } catch {
      invalid.add(file);
      warn("清单语言证据无法解析：" + relative(file));
    }
  }
  for (const file of files) {
    const language = sourceLanguage(file);
    if (!language) continue;
    const owner =
      [...roots.keys()]
        .filter((root) => within(root, file))
        .sort((a, b) => b.length - a.length)[0] ?? workspace;
    const unit = ensure(owner);
    addLanguage(unit, language);
    unit.evidence.push(relative(file));
  }
  const declaredRelations = new Map<string, Set<string>>();
  for (const unit of roots.values()) {
    const ownedFiles = files
      .filter((file) => within(unit.root, file))
      .map((file) => path.relative(unit.root, file).split(path.sep).join("/"));
    const readManifest = (name: string): string | undefined => {
      if (
        !name ||
        path.isAbsolute(name) ||
        name.includes("\\") ||
        name
          .split("/")
          .some((part) => !part || part === "." || part === "..") ||
        sensitiveFile(path.basename(name))
      )
        return;
      return read(path.join(unit.root, name));
    };
    const detectors = [
        ...DESKTOP_FRAMEWORK_DETECTORS,
        ...(options.detectors ?? []),
      ],
      seen = new Set<string>();
    for (const detector of detectors) {
      if (seen.has(detector.id)) continue;
      seen.add(detector.id);
      try {
        const found = detector.detect({
          root: unit.root,
          files: ownedFiles,
          readManifest,
        });
        if (!found) continue;
        if (
          found.evidence.id !== detector.id ||
          !/^[a-z][a-z0-9-]*$/.test(detector.id) ||
          !Array.isArray(found.roles) ||
          found.roles.some((role) => !PROJECT_ROLES.includes(role)) ||
          !Array.isArray(found.relatedRoots)
        )
          throw new Error("Invalid detector result");
        const paths = found.evidence.paths.map((name) =>
          path.resolve(unit.root, name),
        );
        if (
          !paths.length ||
          paths.some(
            (file) =>
              !inventory.has(file) ||
              !within(unit.root, file) ||
              !cache.get(file),
          )
        )
          throw new Error("Unverified framework evidence");
        const version = versionConstraint(found.evidence.version);
        unit.frameworks.push({
          id: detector.id,
          version,
          paths: paths.map(relative),
        });
        for (const role of found.roles)
          if (!unit.roles.includes(role)) unit.roles.push(role);
        for (const related of found.relatedRoots) {
          const target = path.resolve(unit.root, related);
          if (within(workspace, target) && roots.has(target)) {
            const group = declaredRelations.get(unit.root) ?? new Set<string>();
            group.add(target);
            declaredRelations.set(unit.root, group);
          }
        }
        if (!version)
          warn(
            "框架版本约束不明：" +
              detector.id +
              "（" +
              relative(unit.root) +
              "）",
          );
      } catch {
        warn(
          "框架证据无法解析：" +
            detector.id +
            "（" +
            relative(unit.root) +
            "）",
        );
      }
    }
    try {
      const pkg = readManifest("package.json");
      if (pkg) {
        const value = jsonManifest(pkg);
        if (
          (typeof value.bin === "string" ||
            Object.keys(record(value.bin)).length) &&
          !unit.roles.includes("cli")
        )
          unit.roles.push("cli");
      }
      const py = readManifest("pyproject.toml");
      if (
        py &&
        Object.keys(record(record(tomlManifest(py).project).scripts)).length &&
        !unit.roles.includes("cli")
      )
        unit.roles.push("cli");
      const cargo = readManifest("Cargo.toml");
      if (
        cargo &&
        !unit.roles.length &&
        (Object.keys(record(tomlManifest(cargo).lib)).length ||
          ownedFiles.includes("src/lib.rs"))
      )
        unit.roles.push("native-library");
      const cmake = readManifest("CMakeLists.txt");
      if (
        cmake &&
        !unit.roles.length &&
        cmakeCommands(cmake).some((command) => command.name === "add_library")
      )
        unit.roles.push("native-library");
    } catch {
      warn("应用角色证据无法解析：" + relative(unit.root));
    }
  }
  const link = (a: string, b: string) => {
    if (a === b) return;
    const first = roots.get(a),
      second = roots.get(b);
    if (!first || !second) return;
    if (!first.relatedRoots.includes(b)) first.relatedRoots.push(b);
    if (!second.relatedRoots.includes(a)) second.relatedRoots.push(a);
  };
  for (const [from, targets] of declaredRelations)
    for (const to of targets) {
      const a = roots.get(from)!,
        b = roots.get(to)!;
      if (
        a.frameworks.some((item) => item.id === "tauri") &&
        b.frameworks.some((item) => item.id === "tauri") &&
        (path.dirname(from) === to || path.dirname(to) === from)
      )
        link(from, to);
    }
  function members(unit: ProjectUnit, patterns: unknown, marker: string): void {
    if (!Array.isArray(patterns)) return;
    for (const pattern of patterns) {
      if (
        typeof pattern !== "string" ||
        !pattern ||
        pattern.startsWith("!") ||
        path.isAbsolute(pattern) ||
        pattern.split(/[\\/]/).some((part) => part === ".." || part === ".")
      ) {
        warn("工作区成员模式无法确认：" + relative(unit.root));
        continue;
      }
      const escaped = pattern
          .split("/")
          .map((part) =>
            part === "**"
              ? ".*"
              : part
                  .split("*")
                  .map((text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
                  .join("[^/]*"),
          )
          .join("/"),
        regex = new RegExp("^" + escaped + "$");
      for (const candidate of roots.values()) {
        const local = path
          .relative(unit.root, candidate.root)
          .split(path.sep)
          .join("/");
        if (
          within(unit.root, candidate.root) &&
          regex.test(local) &&
          inventory.has(path.join(candidate.root, marker))
        )
          link(unit.root, candidate.root);
      }
    }
  }
  for (const unit of roots.values())
    try {
      const pkg = read(path.join(unit.root, "package.json"));
      if (pkg) {
        const value = jsonManifest(pkg),
          patterns = Array.isArray(value.workspaces)
            ? value.workspaces
            : record(value.workspaces).packages;
        members(unit, patterns, "package.json");
      }
      const cargo = read(path.join(unit.root, "Cargo.toml"));
      if (cargo)
        members(
          unit,
          record(tomlManifest(cargo).workspace).members,
          "Cargo.toml",
        );
      const pnpm = read(path.join(unit.root, "pnpm-workspace.yaml"));
      if (pnpm) members(unit, yamlManifest(pnpm).packages, "package.json");
    } catch {
      warn("工作区成员清单无法解析：" + relative(unit.root));
    }
  report.units = [...roots.values()]
    .map(
      (unit) =>
        ({
          ...unit,
          languages: unit.languages.sort(),
          frameworks: unit.frameworks.sort((a, b) => a.id.localeCompare(b.id)),
          roles: unit.roles.length ? unit.roles.sort() : ["unknown"],
          evidence: [...new Set(unit.evidence)].sort(),
          buildFiles: unit.buildFiles.sort(),
          relatedRoots: unit.relatedRoots.sort(),
          ambiguous:
            !unit.languages.length ||
            !unit.buildFiles.length ||
            unit.buildFiles.some((file) =>
              invalid.has(path.join(workspace, file)),
            ),
        }) as ProjectUnit,
    )
    .sort((a, b) => a.root.localeCompare(b.root, "en"));
  if (task && !report.units.some((unit) => within(unit.root, task!)))
    warn("任务路径没有可确认的项目根");
  report.warnings = [...new Set(report.warnings)];
  return report;
}
