import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readContentCatalog } from "../src/content/catalog.js";

export function packSkills(root: string, output: string): void {
  const catalog = readContentCatalog(root, "en");
  const index = [];
  for (const skill of catalog.skills) {
    const dest = path.join(output, skill.id);
    fs.mkdirSync(dest, { recursive: true });
    for (const file of skill.files) {
      const target = path.join(dest, file.relativePath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(
        path.join(catalog.root, "skills", skill.id, file.relativePath),
        target,
      );
    }
    fs.copyFileSync(path.join(root, "LICENSE"), path.join(dest, "LICENSE"));
    const description = fs
      .readFileSync(path.join(dest, "SKILL.md"), "utf8")
      .match(/^description:\s*(.*)$/m)?.[1];
    const pkg = {
      name: `@bovinphang/${skill.id}`,
      version: skill.version,
      description,
      type: "module",
      license: "MIT",
      repository: {
        type: "git",
        url: skill.repository,
        directory: `skills/${skill.id}`,
      },
      files: [
        "SKILL.md",
        "references",
        "scripts",
        "data",
        "styles",
        "assets",
        "metadata.json",
        "README.md",
        "LICENSE",
      ],
      publishConfig: { access: "public" },
    };
    fs.writeFileSync(
      path.join(dest, "package.json"),
      `${JSON.stringify(pkg, null, 2)}\n`,
    );
    fs.writeFileSync(
      path.join(dest, "metadata.json"),
      `${JSON.stringify(skill, null, 2)}\n`,
    );
    fs.writeFileSync(
      path.join(dest, "README.md"),
      `# ${skill.id}\n\n来源：[craft-common](${skill.repository})，版本 ${skill.version}。本包包含完整技能及运行资源，可由支持 SKILL.md 的 Runtime 使用。\n`,
    );
    index.push({ id: skill.id, version: skill.version, packagePath: skill.id });
  }
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(
    path.join(output, "index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  packSkills(root, path.join(root, "skill-packages"));
  console.log("公共独立技能包已生成");
}
