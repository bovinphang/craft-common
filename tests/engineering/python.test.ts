import test from "node:test";
import assert from "node:assert/strict";
import { engineeringExample,execute } from "./fixtures.js";
import { assessExecution } from "../../scripts/lib/engineering-evidence.js";
test("EP-PY-01 import is side-effect free and partial initialization closes resources",t=>{
  const root=engineeringExample(t,"cc-python-project-standard"),command=process.platform==="win32"?"python":"python3",probe=execute(command,["--version"],root);
  if(probe.error?.message.includes("ENOENT")){t.skip("MISSING Python; no Python evidence");return;}
  assert.equal(probe.status,0,probe.output);
  for(const mode of ["1","0"]) {
    const result=execute(command,["-B","-m","unittest","-v","test_resource_boundary.py"],root,{PYTHONDONTWRITEBYTECODE:"1",CRAFT_ENGINEERING_DEFECTIVE:mode});
    assessExecution(result,"python",mode==="1"?"failure":"success",["test_import_is_clean","test_partial_initialization_cleanup"],"captured-in-test");
  }
});
