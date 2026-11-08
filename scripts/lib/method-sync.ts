import fs from "node:fs";
import path from "node:path";
import { readMethodResource } from "../../src/content/catalog.js";
import { snapshotPath } from "../../src/content/snapshot.js";
import { definitions } from "../method-definitions.js";
import { ENGINEERING_TARGETS } from "../engineering-targets.js";
import { validateCoreResources } from "./engineering-content.js";

type JsonObject = Record<string, unknown>;
const object = (value: unknown): value is JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);
function readJson(root: string, relative: string): unknown {
  return JSON.parse(fs.readFileSync(snapshotPath(root, relative), "utf8"));
}
function readIndexes(root: string, prefix: string) {
  const metadata = readJson(root, prefix + "skills/metadata.json");
  const relations = readJson(root, prefix + "skills/relations.json");
  const queries = readJson(root, prefix + "skills/eval_queries.json");
  if (!Array.isArray(metadata) || !object(relations) || !object(queries))
    throw new Error("Invalid method indexes: " + prefix);
  const entries: JsonObject[] = [];
  const ids = new Set<string>();
  for (const item of metadata as unknown[]) {
    if (!object(item) || typeof item.id !== "string" || !/^cc-[a-z0-9-]+$/.test(item.id) || ids.has(item.id))
      throw new Error("Invalid or duplicate common ID: " + prefix);
    if (typeof item.version !== "string" || !Array.isArray(item.tags) || !item.tags.every(x => typeof x === "string"))
      throw new Error("Invalid common metadata: " + item.id);
    snapshotPath(root, prefix + "skills/" + item.id + "/SKILL.md");
    if (!fs.statSync(snapshotPath(root, prefix + "skills/" + item.id + "/SKILL.md")).isFile())
      throw new Error("Missing common entry: " + item.id);
    ids.add(item.id); entries.push(item);
  }
  const directories = fs.readdirSync(snapshotPath(root, prefix + "skills"), {withFileTypes:true})
    .filter(entry => entry.isDirectory() && entry.name.startsWith("cc-"))
    .map(entry=>entry.name).sort();
  if (JSON.stringify(directories) !== JSON.stringify([...ids].sort()))
    throw new Error("Common directories and metadata disagree: " + prefix);
  for (const [name, index] of [["relations",relations], ["queries",queries]] as const) {
    if (JSON.stringify(Object.keys(index).sort()) !== JSON.stringify([...ids].sort()))
      throw new Error("Common index IDs disagree: " + name);
    for (const id of ids) {
      const value = index[id];
      if (!object(value)) throw new Error("Invalid common index entry: " + id);
      for (const field of name === "queries" ? ["should_trigger","should_not_trigger"] : ["capabilityTags"]) {
        const strings = value[field];
        if (!Array.isArray(strings) || !strings.every(x => typeof x === "string"))
          throw new Error("Invalid common index field: " + id + "/" + field);
      }
    }
  }
  for (const item of definitions) if (!ids.has(item.id)) throw new Error("Missing owned common ID: " + item.id);
  return {metadata:entries, relations};
}

export function planMethodSync(root: string): Array<{relativePath:string;bytes:Buffer}> {
  const pkg = readJson(root, "package.json");
  if (!object(pkg) || typeof pkg.version !== "string" || !pkg.version || !object(pkg.repository) || typeof pkg.repository.url !== "string")
    throw new Error("Invalid common package identity");
  const repository = pkg.repository.url;
  const sourcesFile = snapshotPath(root,"methods/engineering-practices.sources.json");
  const rulesFile = snapshotPath(root,"methods/engineering-practices.rules.json");
  const sourceBytes=fs.readFileSync(sourcesFile), ruleBytes=fs.readFileSync(rulesFile);
  const staged: Array<{relativePath:string;bytes:Buffer}> = [];
  const put = (relativePath: string, value: string | Buffer) => {
    snapshotPath(root, relativePath);
    staged.push({relativePath,bytes:Buffer.isBuffer(value)?value:Buffer.from(value)});
  };
  const owned = new Map(definitions.map(item=>[item.id,item]));
  for (const language of ["en","zh-CN"] as const) {
    const prefix = language === "en" ? "" : "localized/zh-CN/";
    const indexes = readIndexes(root,prefix);
    snapshotPath(root,prefix+"methods/engineering-practices.md");
    const core=readMethodResource(root,"engineering-practices",language);
    validateCoreResources({markdown:core.toString(),sources:JSON.parse(sourceBytes.toString()),rules:JSON.parse(ruleBytes.toString())});
    if(language==="zh-CN") {
      put(prefix+"methods/engineering-practices.sources.json",sourceBytes);
      put(prefix+"methods/engineering-practices.rules.json",ruleBytes);
    }
    for(const id of Object.keys(ENGINEERING_TARGETS)) {
      if(!indexes.metadata.some(item=>item.id===id)) throw new Error("Missing engineering target: "+id);
      const base=prefix+`skills/${id}/references/common/engineering-practices`;
      put(base+".md",core); put(base+".sources.json",sourceBytes); put(base+".rules.json",ruleBytes);
    }
    for (const definition of definitions) {
      if (!definition.method) continue;
      snapshotPath(root, prefix + "methods/" + definition.method + ".md");
      put(prefix + `skills/${definition.id}/references/method.md`,readMethodResource(root,definition.method,language));
      const description = language === "en" ? definition.description : definition.zhDescription;
      const name = language === "en" ? definition.name : definition.zhName;
      const guide = language === "en"
        ? "Read and follow the [shared method](references/method.md). Select project-specific tools and domain checks from the actual repository; this workflow does not require a frontend stack."
        : "读取并遵循[公共方法](references/method.md)，依据实际项目选择工具和专业检查，本流程不要求前端技术栈。";
      put(prefix+`skills/${definition.id}/SKILL.md`,`---\nname: ${definition.id}\ndescription: ${description}\n---\n\n# ${name}\n\n${guide}\n`);
    }
    const metadata = indexes.metadata.map(item => {
      const definition = owned.get(item.id as string);
      if (!definition) return {...item,version:pkg.version};
      const name = language === "en" ? definition.name : definition.zhName;
      return {...item, id:definition.id,name,category:definition.category,tags:definition.tags,summary:name,version:pkg.version,license:"MIT",homepage:repository,repository,keywords:[definition.category,...definition.tags],platforms:["skills-cli","skillreg","claude-code","codex","cursor","opencode","openclaw","generic-skill-runtime"]};
    });
    const relations = {...indexes.relations};
    for (const definition of definitions) relations[definition.id] = {...(relations[definition.id] as JsonObject),capabilityTags:definition.tags};
    put(prefix+"skills/metadata.json",JSON.stringify(metadata,null,2)+"\n");
    put(prefix+"skills/relations.json",JSON.stringify(relations,null,2)+"\n");
    // Queries are validated above, never rewritten or reduced by generation.
  }
  return staged.sort((a,b)=>a.relativePath.localeCompare(b.relativePath));
}

export function syncMethods(input: {root:string;check?:boolean}): {changed:string[]} {
  const plan = planMethodSync(input.root);
  const changes = plan.filter(item => {
    const target=snapshotPath(input.root,item.relativePath);
    return !fs.existsSync(target) || !fs.readFileSync(target).equals(item.bytes);
  });
  if (input.check && changes.length) throw new Error("Method synchronization drift: " + changes.map(item=>item.relativePath).join(", "));
  if (!input.check) for (const item of changes) {
    const target = snapshotPath(input.root,item.relativePath);
    fs.mkdirSync(path.dirname(target),{recursive:true}); fs.writeFileSync(target,item.bytes);
  }
  return {changed:changes.map(item=>item.relativePath)};
}
