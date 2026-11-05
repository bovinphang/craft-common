// 仅用于尚未公开发布的 tarball 联调，不写宿主 npm 配置。
import fs from "node:fs";
import path from "node:path";
import { createServer } from "node:http";
import { createHash } from "node:crypto";

const [archive, configFile] = process.argv.slice(2);
if (!archive || !configFile)
  throw new Error("需要 tarball 路径和临时 npmrc 路径");
const body = fs.readFileSync(archive);
const integrity = `sha512-${createHash("sha512").update(body).digest("base64")}`;
const pkg = JSON.parse(
  fs.readFileSync(path.resolve("package.json"), "utf8"),
) as Record<string, unknown>;
const name = "@bovinphang/craft-common";
const version = String(pkg.version);
const server = createServer((req, res) => {
  if (req.url === "/__shutdown" && req.method === "POST") {
    res.end("closed");
    server.close();
    return;
  }
  if (req.url?.includes("/-/")) {
    res.setHeader("content-type", "application/octet-stream");
    res.end(body);
    return;
  }
  let requested: string;
  try {
    requested = decodeURIComponent(req.url ?? "").replace(/^\//, "");
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  if (requested !== name) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  const address = server.address();
  if (!address || typeof address === "string") {
    res.writeHead(500);
    res.end();
    return;
  }
  const tarball = `${process.argv.includes("--canonical") ? "https://registry.npmjs.org" : `http://127.0.0.1:${address.port}`}/@bovinphang/craft-common/-/craft-common-${version}.tgz`;
  res.setHeader("content-type", "application/json");
  res.end(
    JSON.stringify({
      name,
      "dist-tags": { latest: version },
      time: { [version]: fs.statSync(archive).mtime.toISOString() },
      versions: { [version]: { ...pkg, dist: { tarball, integrity } } },
    }),
  );
});
server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("未能绑定本地临时 registry");
  fs.writeFileSync(
    configFile,
    `@bovinphang:registry=http://127.0.0.1:${address.port}/\n`,
  );
  console.log(`LOCAL_COMMON_REGISTRY=http://127.0.0.1:${address.port}`);
});
