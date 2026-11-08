import fs from "node:fs";
import path from "node:path";
import { currentHash } from "./planner.js";

interface Entry {
  path: string;
  before: string | null;
  after: string | null;
}
function descendant(root: string, file: string): boolean {
  const relative = path.relative(root, file);
  return (
    Boolean(relative) &&
    !path.isAbsolute(relative) &&
    relative !== ".." &&
    !relative.startsWith(".." + path.sep)
  );
}
function transition(entry: Entry, entries: readonly Entry[]): boolean {
  return (
    entry.before !== null &&
    entry.after === null &&
    entries.some(
      (other) => other.after !== null && descendant(entry.path, other.path),
    )
  );
}
/** A deleted file may now be the directory created for its journaled child files. */
export function transactionEntryHash(
  entry: Entry,
  entries: readonly Entry[],
): string | null {
  if (transition(entry, entries)) {
    try {
      const stat = fs.lstatSync(entry.path);
      if (stat.isDirectory() && !stat.isSymbolicLink()) return null;
    } catch (error) {
      if (
        !["ENOENT", "ENOTDIR"].includes(
          (error as NodeJS.ErrnoException).code ?? "",
        )
      )
        throw error;
    }
  }
  return currentHash(entry.path);
}
/** Remove only empty directories that could not exist below the original file. */
export function prepareTransitionRestore(
  entry: Entry,
  entries: readonly Entry[],
): void {
  if (!transition(entry, entries)) return;
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(entry.path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) return;
  const directories = new Set<string>([entry.path]);
  for (const child of entries) {
    if (!descendant(entry.path, child.path)) continue;
    let parent = path.dirname(child.path);
    while (descendant(entry.path, parent)) {
      directories.add(parent);
      parent = path.dirname(parent);
    }
  }
  for (const directory of [...directories].sort(
    (a, b) => b.length - a.length,
  )) {
    try {
      fs.rmdirSync(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}
