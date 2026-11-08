import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncMethods } from "./lib/method-sync.js";
export { syncMethods, planMethodSync } from "./lib/method-sync.js";
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2).filter(arg => arg !== "--");
  if (args.some(arg => arg !== "--check")) throw new Error("Only --check is supported");
  const result = syncMethods({root:path.resolve(import.meta.dirname,".."),check:args.includes("--check")});
  console.log(args.includes("--check") ? "Common methods consistent" : "Common methods synchronized: " + result.changed.length + " files");
}
