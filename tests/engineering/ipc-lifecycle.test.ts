import test from "node:test";
import { engineeringExample,execute } from "./fixtures.js";
import { assessExecution } from "../../scripts/lib/engineering-evidence.js";
test("EP-IPC-01 closed/cancelled handler cannot commit privileged effects",t=>{
  const root=engineeringExample(t,"cc-electron-project-standard");
  const args=["--test","--test-reporter=tap","ipc-lifecycle.test.cjs"];
  for(const mode of ["1","0"]) {
    const result=execute(process.execPath,args,root,{CRAFT_ENGINEERING_DEFECTIVE:mode});
    assessExecution(result,"tap",mode==="1"?"failure":"success",["closed handler cannot produce privileged effects","cancelled handler cannot produce privileged effects"],"captured-in-test");
  }
  t.diagnostic("Node handler lifecycle only; Electron GUI/sandbox/signing NOT RUN");
});
