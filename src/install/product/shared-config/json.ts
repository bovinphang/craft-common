import { parseDocument } from "yaml";
import type { OwnedEntry } from "./types.js";
import { stable, entryHash } from "./hash.js";
type JsonEntry =
  | Extract<OwnedEntry, { kind: "json-hook" }>
  | Extract<OwnedEntry, { kind: "json-path" | "toml-key" }>;
export function safeKeys(keys: string[]): void {
  if (
    !keys.length ||
    keys.some(
      (k) => !k || ["__proto__", "prototype", "constructor"].includes(k),
    )
  )
    throw new Error("共享配置路径无效");
}
export function getPath(
  root: Record<string, unknown>,
  keys: string[],
): unknown {
  let value: unknown = root;
  for (const key of keys) {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      !Object.hasOwn(value, key)
    )
      return;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}
export function readJson(body: string): Record<string, unknown> {
  let root: Record<string, unknown>;
  try {
    root = body.trim() ? (JSON.parse(body) as Record<string, unknown>) : {};
    const doc = parseDocument(body || "{}", { uniqueKeys: true });
    if (doc.errors.length) throw new Error("重复键");
    if (!root || typeof root !== "object" || Array.isArray(root))
      throw new Error("非对象");
  } catch {
    throw new Error("共享 JSON 配置损坏或包含重复键");
  }
  return root;
}
export function editJson(
  body: string,
  entry: JsonEntry,
  action: "upsert" | "remove",
  previous?: OwnedEntry,
): string | null | undefined {
  const root = readJson(body);
  const keys = entry.kind === "json-hook" ? ["hooks", entry.event] : entry.path;
  safeKeys(keys);
  let parent = root;
  for (const key of keys.slice(0, -1)) {
    if (!Object.hasOwn(parent, key)) {
      if (action === "remove") return body;
      parent[key] = {};
    }
    const next = parent[key];
    if (!next || typeof next !== "object" || Array.isArray(next)) return;
    parent = next as Record<string, unknown>;
  }
  const key = keys.at(-1)!;
  if (entry.kind === "json-hook") {
    const hooks = parent[key] === undefined ? [] : parent[key];
    if (!Array.isArray(hooks)) return;
    const matches = hooks.flatMap((v, i) =>
      stable(v) === stable(previous?.value ?? entry.value) ? [i] : [],
    );
    if (matches.length > 1) return;
    if (matches.length === 1) {
      if (
        !previous ||
        previous.kind !== "json-hook" ||
        entryHash(previous) !== previous.hash
      )
        return;
      hooks.splice(
        matches[0],
        1,
        ...(action === "upsert" ? [entry.value] : []),
      );
    } else if (action === "upsert") {
      if (previous) return;
      hooks.push(entry.value);
    }
    if (hooks.length) parent[key] = hooks;
    else delete parent[key];
  } else {
    const exists = Object.hasOwn(parent, key);
    if (
      exists &&
      (!previous ||
        entryHash({ kind: "json-path", value: parent[key] }) !== previous.hash)
    )
      return;
    if (action === "upsert") parent[key] = entry.value;
    else if (exists) delete parent[key];
  }
  // 只剪除空的父节点；用户的非空键完整保留。
  for (let depth = keys.length - 1; depth > 0; depth--) {
    const prefix = keys.slice(0, depth),
      value = getPath(root, prefix);
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !Object.keys(value).length
    ) {
      const owner =
        depth === 1
          ? root
          : (getPath(root, prefix.slice(0, -1)) as Record<string, unknown>);
      delete owner[prefix.at(-1)!];
    }
  }
  if (action === "remove" && entry.createdFile && !Object.keys(root).length)
    return null;
  return JSON.stringify(root, null, 2) + "\n";
}
