import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
export { execute } from "../frameworks/fixtures.js";
export const packageRoot=path.resolve(import.meta.dirname,"../..");
export function engineeringExample(t:{after(fn:()=>void):void},id:string):string {
  const source=path.join(packageRoot,"skills",id,"examples/engineering");
  assert.ok(fs.existsSync(source),"missing engineering example: "+id);
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"cc-engineering-"));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.cpSync(source,root,{recursive:true});return root;
}
