import { createHash } from "node:crypto";
import type { ProductDefinition } from "../types.js";
import type { OwnedEntry } from "./types.js";
import { textFragment } from "./text.js";

export const hashBytes = (bytes: Buffer): string =>
  createHash("sha256").update(bytes).digest("hex");

export function stable(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) +
            ":" +
            stable((value as Record<string, unknown>)[key]),
        )
        .join(",") +
      "}"
    );
  }
  const text = JSON.stringify(value);
  if (text === undefined)
    throw new Error("Configuration value must be JSON serializable");
  return text;
}

export function entryHash(
  entry: { kind: OwnedEntry["kind"]; value: unknown; id?: string },
  owner?: ProductDefinition,
): string {
  if (entry.kind !== "text-marker")
    return hashBytes(Buffer.from(stable(entry.value)));
  const marker = owner?.markerId ?? entry.id;
  if (
    !marker ||
    !/^[a-z][a-z0-9-]*$/.test(marker) ||
    typeof entry.value !== "string"
  ) {
    throw new Error(
      "Text entry hashing requires a valid owner marker and string value",
    );
  }
  return hashBytes(Buffer.from(textFragment(entry.value, marker)));
}
