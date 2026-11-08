import { parse, stringify } from "smol-toml";
import type { OwnedEntry } from "./types.js";
import { safeKeys, getPath } from "./json.js";
import { entryHash } from "./hash.js";
type TomlEntry = Extract<OwnedEntry, { kind: "json-path" | "toml-key" }>;
function parsed(body: string): Record<string, unknown> {
  try {
    return parse(body) as Record<string, unknown>;
  } catch {
    throw new Error("共享 TOML 配置损坏或无法无损整合");
  }
}
export function fragment(entry: TomlEntry): string {
  let value = entry.value;
  for (const key of [...entry.path].reverse()) value = { [key]: value };
  return (
    "\n# " +
    entry.id +
    ":start\n" +
    stringify(value as Record<string, unknown>) +
    "# " +
    entry.id +
    ":end\n"
  );
}
export function editToml(
  body: string,
  entry: TomlEntry,
  action: "upsert" | "remove",
  previous?: OwnedEntry,
): string | null | undefined {
  safeKeys(entry.path);
  const root = parsed(body),
    start = "# " + entry.id + ":start",
    end = "# " + entry.id + ":end";
  const starts = body.split(start).length - 1,
    ends = body.split(end).length - 1;
  let after: string;
  if (starts === 0 && ends === 0) {
    if (action === "remove") return body;
    if (getPath(root, entry.path) !== undefined) return;
    after = body + fragment(entry);
  } else {
    if (
      starts !== 1 ||
      ends !== 1 ||
      !previous ||
      previous.kind !== "toml-key" ||
      entryHash({ kind: "toml-key", value: getPath(root, entry.path) }) !==
        previous.hash
    )
      return;
    const old = fragment(previous);
    if (!body.includes(old)) return;
    after = body.replace(old, action === "upsert" ? fragment(entry) : "");
  }
  parsed(after);
  return action === "remove" && entry.createdFile && after === ""
    ? null
    : after;
}
