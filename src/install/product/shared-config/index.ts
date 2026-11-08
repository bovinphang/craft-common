import { parse as parseToml } from "smol-toml";
import type { ProductDefinition } from "../types.js";
import type { OwnedEntry } from "./types.js";
import { assertProductDefinition } from "../ownership.js";
import { editJson, getPath, readJson, safeKeys } from "./json.js";
import { editText, textFragment } from "./text.js";
import { editToml, fragment } from "./toml.js";
import { entryHash } from "./hash.js";

export { entryHash, stable, hashBytes } from "./hash.js";
export type ConfigEntryStatus = "healthy" | "missing" | "modified";

export function validateConfigEntry(
  entry: OwnedEntry,
  owner: ProductDefinition,
): void {
  assertProductDefinition(owner);
  if (
    !entry ||
    !["text-marker", "json-hook", "json-path", "toml-key"].includes(
      entry.kind,
    ) ||
    typeof entry.id !== "string" ||
    (entry.id !== owner.markerId &&
      !entry.id.startsWith(owner.markerId + "-")) ||
    typeof entry.createdFile !== "boolean" ||
    !/^[a-f0-9]{64}$/.test(entry.hash) ||
    entryHash(entry, owner) !== entry.hash
  ) {
    throw new Error("Invalid shared configuration ownership or digest");
  }
  if (entry.kind === "json-path" || entry.kind === "toml-key")
    safeKeys(entry.path);
  if (entry.kind === "json-hook") {
    safeKeys(["hooks", entry.event]);
    if (
      !entry.value ||
      typeof entry.value !== "object" ||
      Array.isArray(entry.value)
    )
      throw new Error("Invalid hook configuration value");
  }
}

export function configEntryStatus(
  before: Buffer | null,
  owner: ProductDefinition,
  entry: OwnedEntry,
): ConfigEntryStatus {
  validateConfigEntry(entry, owner);
  if (before === null) return "missing";
  const body = before.toString("utf8");
  try {
    if (entry.kind === "text-marker") {
      const start = `<!-- ${owner.markerId}:start -->`,
        end = `<!-- ${owner.markerId}:end -->`;
      if (!body.includes(start) && !body.includes(end)) return "missing";
      return body.split(start).length === 2 &&
        body.split(end).length === 2 &&
        body.includes(textFragment(entry.value, owner.markerId))
        ? "healthy"
        : "modified";
    }
    const root =
      entry.kind === "toml-key"
        ? (parseToml(body) as Record<string, unknown>)
        : readJson(body);
    if (entry.kind === "json-hook") {
      const array = getPath(root, ["hooks", entry.event]);
      if (array === undefined) return "missing";
      if (!Array.isArray(array)) return "modified";
      const count = array.filter(
        (value) => entryHash({ kind: "json-hook", value }) === entry.hash,
      ).length;
      return count === 1
        ? "healthy"
        : count === 0 && array.length === 0
          ? "missing"
          : "modified";
    }
    const value = getPath(root, entry.path);
    if (value === undefined) return "missing";
    if (entryHash({ kind: entry.kind, value }) !== entry.hash)
      return "modified";
    return entry.kind === "toml-key" && !body.includes(fragment(entry))
      ? "modified"
      : "healthy";
  } catch {
    return "modified";
  }
}

export function planConfigEntry(input: {
  before: Buffer | null;
  owner: ProductDefinition;
  entry: OwnedEntry;
  previous?: OwnedEntry;
  action: "upsert" | "remove";
}): { after: Buffer | null; status: "changed" | "unchanged" | "preserved" } {
  const { before, owner, entry, previous, action } = input;
  validateConfigEntry(entry, owner);
  if (action !== "upsert" && action !== "remove")
    throw new Error("Invalid configuration action");
  if (previous) {
    validateConfigEntry(previous, owner);
    if (previous.id !== entry.id || previous.kind !== entry.kind)
      throw new Error("Configuration identity changed");
  }
  if (action === "remove" && before === null)
    return { after: null, status: "unchanged" };
  if (action === "remove" && previous) {
    const status = configEntryStatus(before, owner, previous);
    if (status === "modified") return { after: before, status: "preserved" };
    if (status === "missing") return { after: before, status: "unchanged" };
  }
  const body = before?.toString("utf8") ?? "";
  const text =
    entry.kind === "text-marker"
      ? editText(body, entry, action, previous, owner.markerId)
      : entry.kind === "toml-key"
        ? editToml(body, entry, action, previous)
        : editJson(body, entry, action, previous);
  if (text === undefined) return { after: before, status: "preserved" };
  const after = text === null ? null : Buffer.from(text);
  return {
    after,
    status:
      after === null
        ? before === null
          ? "unchanged"
          : "changed"
        : before?.equals(after)
          ? "unchanged"
          : "changed",
  };
}
