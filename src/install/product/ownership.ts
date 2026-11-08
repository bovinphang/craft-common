import path from "node:path";
import type { ProductDefinition } from "./types.js";

const resourceDirectories = new Set([
  "skills",
  "agents",
  "commands",
  "rules",
  "workflows",
  "global_workflows",
  "prompts",
  "instructions",
  "hooks",
]);

export function assertProductOwnership(
  file: string,
  owner: ProductDefinition,
  roots: readonly string[] = [],
): void {
  const absolute = path.resolve(file);
  const boundary = [...roots]
    .sort((a, b) => b.length - a.length)
    .find((root) => {
      const relative = path.relative(root, absolute);
      return (
        relative &&
        !path.isAbsolute(relative) &&
        relative !== ".." &&
        !relative.startsWith(".." + path.sep)
      );
    });
  const parts = (boundary ? path.relative(boundary, absolute) : absolute).split(
    path.sep,
  );
  if (
    boundary &&
    resourceDirectories.has(path.basename(boundary).toLowerCase())
  )
    parts.unshift(path.basename(boundary));
  if (
    parts.some((part) =>
      ["craft-manifests", owner.stateDirectoryName.toLowerCase()].includes(
        part.toLowerCase(),
      ),
    ) ||
    path.basename(file).toLowerCase() === owner.manifestName.toLowerCase() ||
    (parts.some((part) => part.toLowerCase() === ".claude-plugin") &&
      !(
        owner.nativeMetadata === true &&
        parts.at(-2)?.toLowerCase() === ".claude-plugin" &&
        ["plugin.json", "marketplace.json"].includes(
          parts.at(-1)!.toLowerCase(),
        )
      ))
  ) {
    throw new Error(`Product write targets reserved ownership state: ${file}`);
  }
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].toLowerCase();
    if (
      part.startsWith("cc-") &&
      (i === parts.length - 1 ||
        resourceDirectories.has(parts[i - 1]?.toLowerCase()))
    ) {
      throw new Error(`Product cannot claim a common namespace: ${file}`);
    }
    if (resourceDirectories.has(part) && parts[i + 1]) {
      const child = parts[i + 1].toLowerCase();
      if (
        /^[a-z][a-z0-9]*-/.test(child) &&
        !child.startsWith(owner.resourcePrefix.toLowerCase()) &&
        !child.startsWith(owner.markerId.toLowerCase()) &&
        !(owner.resourceEntries?.[part] ?? []).some(
          (name) => name.toLowerCase() === child,
        ) &&
        !parts
          .slice(0, i)
          .some(
            (parent) => parent.toLowerCase() === owner.markerId.toLowerCase(),
          )
      ) {
        throw new Error(
          `Product cannot claim another resource namespace: ${file}`,
        );
      }
    }
    if (
      i === parts.length - 1 &&
      part.endsWith(".manifest.json") &&
      part !== owner.manifestName.toLowerCase()
    ) {
      throw new Error(
        `Product cannot claim another ownership manifest: ${file}`,
      );
    }
  }
}

export function assertProductDefinition(owner: ProductDefinition): void {
  if (
    !owner.packageName ||
    !owner.consumerProduct ||
    !/^[a-z][a-z0-9-]*-$/.test(owner.resourcePrefix) ||
    owner.resourcePrefix === "cc-" ||
    !/^[a-z][a-z0-9-]*$/.test(owner.markerId) ||
    !/^[a-z0-9][a-z0-9.-]*\.manifest\.json$/.test(owner.manifestName) ||
    !/^\.?[a-z0-9][a-z0-9.-]*$/.test(owner.stateDirectoryName) ||
    (owner.retainUnrequestedFiles !== undefined &&
      typeof owner.retainUnrequestedFiles !== "boolean") ||
    (owner.nativeMetadata !== undefined &&
      typeof owner.nativeMetadata !== "boolean") ||
    (owner.resourceEntries !== undefined &&
      Object.entries(owner.resourceEntries).some(
        ([key, names]) =>
          !resourceDirectories.has(key) ||
          !Array.isArray(names) ||
          names.some(
            (name) =>
              typeof name !== "string" ||
              !name ||
              /[\\/]/.test(name) ||
              name === "." ||
              name === "..",
          ),
      ))
  ) {
    throw new Error("Invalid product ownership definition");
  }
}
