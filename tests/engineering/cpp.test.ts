import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { engineeringExample,execute } from "./fixtures.js";
import { assessExecution } from "../../scripts/lib/engineering-evidence.js";
test("EP-CPP-01 borrowed values stay borrowed and partial construction releases ownership",t=>{
  const root=engineeringExample(t,"cc-cpp-project-standard"),probe=execute("c++",["--version"],root);
  if(probe.error?.message.includes("ENOENT")){t.skip("MISSING C++ compiler; use explicit Docker verification");return;}
  assert.equal(probe.status,0,probe.output);
  const program=path.join(root,process.platform==="win32"?"boundary-test.exe":"boundary-test");
  const compile=execute("c++",["-std=c++17","-DNDEBUG","-Wall","-Wextra","-Werror","boundary.cpp","boundary_test.cpp","-o",program],root);assert.equal(compile.status,0,compile.output);
  for(const mode of ["1","0"]) {
    const result=execute(program,[],root,{CRAFT_ENGINEERING_DEFECTIVE:mode});
    const evidence=assessExecution(result,"native-json",mode==="1"?"failure":"success",["borrowing_and_partial_construction"],"captured-in-test");
    assert.equal(evidence.tests.total,2);
  }
});
