import fs from "node:fs";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

// Task-scoped, loopback-only metadata for immutable local candidate archives.
const [archive, configFile, ...args] = process.argv.slice(2);
if (!archive || !configFile) throw new Error("需要 tarball 路径和临时 npmrc 路径");
const archives = [archive];
let canonical = false, port = 0;
for (let index = 0; index < args.length; index++) {
  const arg = args[index];
  if (arg === "--canonical") { canonical = true; continue; }
  if (arg !== "--also" && arg !== "--port") throw new Error("未知本地源参数");
  const value = args[++index];
  if (!value || value.startsWith("--")) throw new Error("本地源参数缺少值");
  if (arg === "--also") archives.push(value);
  else {
    if (!/^\d+$/.test(value) || Number(value) > 65535) throw new Error("无效本地端口");
    port = Number(value);
  }
}
const name = "@bovinphang/craft-common";
const records = new Map<string, { pkg: Record<string, unknown>; body: Buffer; integrity: string; time: string }>();
let latest = "";
for (const file of archives) {
  const pkg = JSON.parse(execFileSync("tar", ["-xOf", file, "package/package.json"], { encoding: "utf8", windowsHide: true, maxBuffer: 4 * 1024 * 1024 })) as Record<string, unknown>;
  if (pkg.name !== name || typeof pkg.version !== "string" || !pkg.version) throw new Error("本地归档身份无效");
  const body = fs.readFileSync(file), integrity = "sha512-" + createHash("sha512").update(body).digest("base64");
  const existing = records.get(pkg.version);
  if (existing && existing.integrity !== integrity) throw new Error("同版本不可对应不同归档字节");
  records.set(pkg.version, { pkg, body, integrity, time: fs.statSync(file).mtime.toISOString() });
  if (!latest) latest = pkg.version;
}
const server = createServer((req, res) => {
  if (req.url === "/__shutdown" && req.method === "POST") { res.end("closed"); server.close(); return; }
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); res.end(); return; }
  let requested: string;
  try { requested = decodeURIComponent((req.url ?? "").split("?")[0]).replace(/^\//, ""); }
  catch { res.writeHead(400); res.end(); return; }
  for (const [version, record] of records) {
    if (requested === name + "/-/craft-common-" + version + ".tgz") { res.setHeader("content-type", "application/octet-stream"); res.end(record.body); return; }
  }
  if (requested !== name) { res.writeHead(404); res.end("not found"); return; }
  const address = server.address();
  if (!address || typeof address === "string") { res.writeHead(500); res.end(); return; }
  const base = canonical ? "https://registry.npmjs.org" : "http://127.0.0.1:" + address.port;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ name, "dist-tags": { latest }, time: Object.fromEntries([...records].map(([version, record]) => [version, record.time])), versions: Object.fromEntries([...records].map(([version, record]) => [version, { ...record.pkg, dist: { tarball: base + "/" + name + "/-/craft-common-" + version + ".tgz", integrity: record.integrity } }])) }));
});
server.listen(port, "127.0.0.1", () => {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("未能绑定本地临时 registry");
  fs.writeFileSync(configFile, "@bovinphang:registry=http://127.0.0.1:" + address.port + "/\n");
  console.log("LOCAL_COMMON_REGISTRY=http://127.0.0.1:" + address.port);
});
