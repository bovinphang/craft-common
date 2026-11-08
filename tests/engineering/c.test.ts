import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { engineeringExample,execute } from "./fixtures.js";
import { assessExecution } from "../../scripts/lib/engineering-evidence.js";
test("EP-C-01 checked sizes, outputs and partial allocation cleanup",t=>{
  const root=engineeringExample(t,"cc-c-project-standard"),probe=execute("cc",["--version"],root);
  if(probe.error?.message.includes("ENOENT")){t.skip("MISSING C compiler; use explicit Docker verification");return;}
  assert.equal(probe.status,0,probe.output);
  const program=path.join(root,process.platform==="win32"?"boundary-test.exe":"boundary-test");
  const compile=execute("cc",["-std=c11","-DNDEBUG","-Wall","-Wextra","-Werror","boundary.c","boundary_test.c","-o",program],root);assert.equal(compile.status,0,compile.output);
  for(const mode of ["1","0"]) {
    const result=execute(program,[],root,{CRAFT_ENGINEERING_DEFECTIVE:mode});
    const evidence=assessExecution(result,"native-json",mode==="1"?"failure":"success",["overflow_and_partial_cleanup"],"captured-in-test");
    assert.equal(evidence.tests.total,2);
  }
});
