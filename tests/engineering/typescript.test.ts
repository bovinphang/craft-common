import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { engineeringExample,execute,packageRoot } from "./fixtures.js";
import { assessExecution } from "../../scripts/lib/engineering-evidence.js";
import { supportsNativeTypeStripping } from "../../scripts/verify-engineering.js";
test("EP-TS-01 unknown input is rejected before effects and valid input succeeds",t=>{
  const root=engineeringExample(t,"cc-typescript-project-standard");
  if(!supportsNativeTypeStripping(process.versions.node)){t.skip("MISSING sample Node>=22.18 type stripping; product Node>=22 unchanged");return;}
  const compiler=path.join(packageRoot,"node_modules/typescript/bin/tsc");
  const compile=execute(process.execPath,[compiler,"--noEmit","-p",root,"--typeRoots",path.join(packageRoot,"node_modules/@types")],root);
  assert.equal(compile.status,0,compile.output);
  const args=["--experimental-strip-types","--test","--test-reporter=tap","boundary.test.ts"];
  const broken=execute(process.execPath,args,root,{CRAFT_ENGINEERING_DEFECTIVE:"1"});
  assert.notEqual(broken.status,0);assert.match(broken.output,/not ok.*rejects invalid input/);
  const fixed=execute(process.execPath,args,root,{CRAFT_ENGINEERING_DEFECTIVE:"0"});
  assert.equal(fixed.status,0,fixed.output);assert.match(fixed.output,/# pass 2\b/);assert.match(fixed.output,/# fail 0\b/);
  assessExecution(broken,"tap","failure",["rejects invalid input"],"captured-in-test");
  assessExecution(fixed,"tap","success",["rejects invalid input","accepts a valid input"],"captured-in-test");
});
