import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { snapshotPath } from "../src/content/snapshot.js";
import { assessExecution, type CaseEvidence, type EvidenceFormat, type Execution } from "./lib/engineering-evidence.js";

type Environment="host"|"docker";
/** Sample-only feature floor; the product's supported Node >=22 contract is unchanged. */
export function supportsNativeTypeStripping(version:string):boolean {
  const parsed=/^(\d+)\.(\d+)\.(\d+)(?:-|$)/.exec(version);
  return !!parsed && (Number(parsed[1])>22 || (Number(parsed[1])===22 && Number(parsed[2])>=18));
}
const cases:Record<string,{skill:string;format:EvidenceFormat;names:string[];image:string;scope:string}>={
  "EP-TS-01":{skill:"cc-typescript-project-standard",format:"tap",names:["rejects invalid input"],image:"",scope:"TypeScript external-input effects; no UI/payment or declaration-publishing guarantee"},
  "EP-RS-01":{skill:"cc-rust-project-standard",format:"cargo",names:["failure_releases_and_preserves_cause"],image:"rust:1.96-bookworm",scope:"Safe Rust Result/Drop; declared MSRV not established by newer-toolchain run"},
  "EP-GO-01":{skill:"cc-go-project-standard",format:"go-json",names:["TestCancellationWaitsForBoth"],image:"golang:1.25-bookworm",scope:"Event-driven cancellation/join for two workers; no all-schedule or race-freedom claim"},
  "EP-JAVA-01":{skill:"cc-java-project-standard",format:"native-json",names:["failure_closes_and_preserves_cause"],image:"maven:3.9-eclipse-temurin-17",scope:"Java failure cause and owned lease close; no external driver/GUI/executor test"},
  "EP-PY-01":{skill:"cc-python-project-standard",format:"python",names:["test_import_is_clean","test_partial_initialization_cleanup"],image:"rust:1.96-bookworm",scope:"Python real import marker and context cleanup; no external DB test"},
  "EP-C-01":{skill:"cc-c-project-standard",format:"native-json",names:["overflow_and_partial_cleanup"],image:"rust:1.96-bookworm",scope:"C11 controlled allocation/cleanup; no sanitizer or whole-program proof"},
  "EP-CPP-01":{skill:"cc-cpp-project-standard",format:"native-json",names:["borrowing_and_partial_construction"],image:"rust:1.96-bookworm",scope:"C++17 owned/borrowed cleanup; sample exception policy only, no user-project upgrade"},
  "EP-IPC-01":{skill:"cc-electron-project-standard",format:"tap",names:["closed handler cannot produce privileged effects"],image:"",scope:"Real Node IPC handler core; no Electron GUI/sandbox/permission activation/signing"},
};
export function parseEngineeringArgs(args:readonly string[]):{caseIds:string[];environment:Environment;prepare:boolean} {
  let caseIds=Object.keys(cases),environment:Environment="host",prepare=false;
  for(let i=0;i<args.length;i++) {
    const arg=args[i];if(arg==="--") continue;
    if(arg==="--prepare"){prepare=true;continue;}
    if(arg!=="--case" && arg!=="--environment") throw new Error("Unsupported engineering argument: "+arg);
    const value=args[++i];if(!value || value.startsWith("--")) throw new Error("Missing engineering option value");
    if(arg==="--case") {caseIds=value.split(",");if(!caseIds.length || new Set(caseIds).size!==caseIds.length || caseIds.some(id=>!Object.hasOwn(cases,id))) throw new Error("Case not owned by common");}
    else {if(value!=="host" && value!=="docker") throw new Error("Expected host|docker");environment=value;}
  }
  return {caseIds,environment,prepare};
}
function execute(command:string,args:string[],cwd:string,extra:NodeJS.ProcessEnv={}):Execution {
  const env:NodeJS.ProcessEnv={...process.env,RUSTUP_AUTO_INSTALL:"0",GOTOOLCHAIN:"local",GOPROXY:"off",GOSUMDB:"off",PYTHONDONTWRITEBYTECODE:"1",...extra};delete env.NODE_TEST_CONTEXT;
  const result=spawnSync(command,args,{cwd,env,encoding:"utf8",windowsHide:true,timeout:600000,maxBuffer:8*1024*1024});
  return {status:result.status,output:(result.stdout??"")+"\n"+(result.stderr??""),error:result.error};
}
function hashSource(root:string):string {
  const hash=createHash("sha256");
  const walk=(dir:string,prefix:string)=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
    if(entry.isSymbolicLink()) throw new Error("Engineering source links are not permitted");
    if(["node_modules","target","__pycache__"].includes(entry.name)) throw new Error("Unexpected cache in engineering source");
    const file=path.join(dir,entry.name),relative=prefix+entry.name;
    if(entry.isDirectory()) walk(file,relative+"/");else {hash.update(relative+"\0");hash.update(fs.readFileSync(file));hash.update("\0");}
  }};walk(root,"");return hash.digest("hex");
}
function nodeArchive(root:string,prepare:boolean,call:(command:string,args:string[],cwd?:string)=>Execution,imageId:string):string {
  const relative="reports/engineering/toolchains/node-v24.14.1-linux-x64";
  const cache=snapshotPath(root,relative),archive=snapshotPath(root,relative+"/node.tar.xz"),sums=snapshotPath(root,relative+"/SHASUMS256.txt"),binary=snapshotPath(root,relative+"/node");
  if(!fs.existsSync(archive) || !fs.existsSync(sums)) {
    if(!prepare) throw new Error("MISSING prepared official Linux Node toolchain; use --prepare");
    fs.mkdirSync(cache,{recursive:true});
    const download=`import fs from 'node:fs';import path from 'node:path';import{createHash}from'node:crypto';const dir=process.argv[1],name='node-v24.14.1-linux-x64.tar.xz',base='https://nodejs.org/dist/v24.14.1/';async function get(name){const r=await fetch(base+name,{signal:AbortSignal.timeout(120000)});if(!r.ok)throw new Error('Official Node HTTP '+r.status);return Buffer.from(await r.arrayBuffer());}const sums=await get('SHASUMS256.txt'),body=await get(name);const expected=sums.toString().split(/\\r?\\n/).map(line=>line.trim().split(/\\s+/)).find(parts=>parts[1]===name)?.[0];if(!expected||createHash('sha256').update(body).digest('hex')!==expected)throw new Error('Node release checksum mismatch');fs.writeFileSync(path.join(dir,'node.tar.xz'),body);fs.writeFileSync(path.join(dir,'SHASUMS256.txt'),sums);console.log('Official Node release SHA256 verified: '+expected);`;
    const downloaded=call(process.execPath,["--input-type=module","--eval",download,cache]);
    fs.writeFileSync(path.join(cache,"prepare.log"),downloaded.output);
    if(downloaded.status!==0) throw new Error("Official Node explicit preparation failed");
  }
  const expected=fs.readFileSync(sums,"utf8").split(/\r?\n/).map(line=>line.trim().split(/\s+/)).find(parts=>parts[1]==="node-v24.14.1-linux-x64.tar.xz")?.[0];
  if(!expected || createHash("sha256").update(fs.readFileSync(archive)).digest("hex")!==expected) throw new Error("Node release checksum mismatch");
  if(!fs.existsSync(binary)) {
    if(!prepare) throw new Error("MISSING extracted Linux Node binary; use --prepare");
    const extracted=call("docker",["run","--rm","--network","none","--mount",`type=bind,source=${archive},target=/archive.tar.xz,readonly`,"--mount",`type=bind,source=${cache},target=/tools`,imageId,"sh","-c","tar -xJf /archive.tar.xz -C /tools --strip-components=2 node-v24.14.1-linux-x64/bin/node && chmod +x /tools/node"]);
    if(extracted.status!==0) throw new Error("Official Node extraction failed");
    fs.writeFileSync(path.join(cache,"binary.sha256"),createHash("sha256").update(fs.readFileSync(binary)).digest("hex"));
  }
  const binaryHash=snapshotPath(root,relative+"/binary.sha256");
  if(!fs.existsSync(binaryHash) || fs.readFileSync(binaryHash,"utf8")!==createHash("sha256").update(fs.readFileSync(binary)).digest("hex")) throw new Error("Extracted Node checksum mismatch");
  return cache;
}
export function verifyEngineering(input:{root:string;caseIds:readonly string[];prepare:boolean;environment:Environment}):CaseEvidence[] {
  if(!input.caseIds.length || new Set(input.caseIds).size!==input.caseIds.length || input.caseIds.some(id=>!Object.hasOwn(cases,id)) || !["host","docker"].includes(input.environment)) throw new Error("Invalid engineering selection");
  const reports=path.join(input.root,"reports/engineering");fs.mkdirSync(reports,{recursive:true});
  const run=fs.mkdtempSync(path.join(reports,"run-"));
  return input.caseIds.map(caseId=>{
    const definition=cases[caseId],out=path.join(run,caseId);fs.mkdirSync(out);
    const evidence:CaseEvidence={caseId,status:"FAIL",platform:process.platform+"/"+input.environment,toolVersions:{},sourceHash:"unavailable",commands:[],scope:definition.scope};
    try {
      const source=snapshotPath(input.root,`skills/${definition.skill}/examples/engineering`);
      if(!fs.existsSync(source)){evidence.status="MISSING";throw new Error("Missing owned example");}
      evidence.sourceHash=hashSource(source);
      const call=(command:string,args:string[],cwd=out,extra:NodeJS.ProcessEnv={})=>{
        evidence.commands.push(JSON.stringify([command,...args]));return execute(command,args,cwd,extra);
      };
      let broken:Execution,fixed:Execution;
      if(input.environment==="docker") {
        const image=definition.image || "rust:1.96-bookworm";
        let inspected=call("docker",["image","inspect",image,"--format","{{.Id}}"]);
        if(inspected.status!==0 && input.prepare) {
          const prepared=call("docker",["pull",image]);fs.writeFileSync(path.join(out,"prepare.log"),prepared.output);if(prepared.status!==0) throw new Error("Explicit image preparation failed");
          inspected=call("docker",["image","inspect",image,"--format","{{.Id}}"]);
        }
        if(inspected.status!==0){evidence.status="MISSING";throw new Error("Missing Docker/image; prepare explicitly");}
        const imageId=inspected.output.trim();evidence.toolVersions.imageId=imageId;
        if(!/^sha256:[a-f0-9]{64}$/.test(imageId)) throw new Error("Invalid inspected image identity");
        const imagePlatform=call("docker",["image","inspect",imageId,"--format","{{.Os}}/{{.Architecture}}"]);
        if(imagePlatform.status!==0) throw new Error("Unable to verify container platform");
        evidence.platform=imagePlatform.output.trim()+" (docker on "+process.platform+")";
        const toolMounts:string[]=[];
        if(caseId==="EP-TS-01" || caseId==="EP-IPC-01") {
          let cache:string;
          try{cache=nodeArchive(input.root,input.prepare,call,imageId);}catch(error){if(error instanceof Error && error.message.startsWith("MISSING"))evidence.status="MISSING";throw error;}
          toolMounts.push("--mount",`type=bind,source=${cache},target=/tools,readonly`);
          evidence.toolVersions.nodeRelease="https://nodejs.org/dist/v24.14.1/SHASUMS256.txt; archive and extracted binary checksums verified";
        }
        if(caseId==="EP-TS-01") {
          const ts=fs.realpathSync(path.join(input.root,"node_modules/typescript")),types=fs.realpathSync(path.join(input.root,"node_modules/@types/node"));
          const expected=JSON.parse(fs.readFileSync(path.join(source,"package.json"),"utf8")).devDependencies as Record<string,string>;
          for(const [dir,key]of [[ts,"typescript"],[types,"@types/node"]])if(JSON.parse(fs.readFileSync(path.join(dir,"package.json"),"utf8")).version!==expected[key])throw new Error("Prepared TypeScript tool version differs from example declaration");
          const undici=path.dirname(createRequire(path.join(types,"package.json")).resolve("undici-types/package.json"));
          for(const [from,to]of [[ts,"/toolchain/typescript"],[types,"/toolchain/@types/node"],[undici,"/toolchain/node_modules/undici-types"]])toolMounts.push("--mount",`type=bind,source=${from},target=${to},readonly`);
        }
        const result=call("docker",["run","--rm","--network","none",...toolMounts,"--mount",`type=bind,source=${source},target=/src,readonly`,"--mount",`type=bind,source=${path.join(input.root,"scripts/engineering-container.sh")},target=/runner.sh,readonly`,"--mount",`type=bind,source=${out},target=/out`,"-e",`CASE_ID=${caseId}`,imageId,"sh","/runner.sh"]);
        fs.writeFileSync(path.join(out,"container.log"),result.output);
        if(result.status!==0) throw new Error("Container tool/compile preparation failed; inspect logs");
        const status=JSON.parse(fs.readFileSync(path.join(out,"status.json"),"utf8")) as {red:number;green:number};
        evidence.toolVersions.tools=fs.readFileSync(path.join(out,"versions.txt"),"utf8").trim();
        broken={status:status.red,output:fs.readFileSync(path.join(out,"red.log"),"utf8")};fixed={status:status.green,output:fs.readFileSync(path.join(out,"green.log"),"utf8")};
      } else {
        if(caseId==="EP-TS-01" && !supportsNativeTypeStripping(process.versions.node)){evidence.status="MISSING";throw new Error("MISSING sample Node>=22.18 type-stripping capability; product Node>=22 is unchanged");}
        const work=path.join(out,"work");fs.cpSync(source,work,{recursive:true});
        let command:string,args:string[],compile:[string,string[]]|undefined,probe:string[];
        switch(caseId) {
          case "EP-TS-01":command=process.execPath;probe=["--version"];args=["--experimental-strip-types","--test","--test-reporter=tap","boundary.test.ts"];compile=[process.execPath,[path.join(input.root,"node_modules/typescript/bin/tsc"),"--noEmit","-p",work,"--typeRoots",path.join(input.root,"node_modules/@types")]];break;
          case "EP-RS-01":command="cargo";probe=["--version"];args=["test","--offline","--locked"];compile=[command,[...args,"--no-run"]];break;
          case "EP-GO-01":command="go";probe=["version"];args=["test","-json","-count=1","-timeout=15s","./..."];compile=[command,["test","-run=^$","./..."]];break;
          case "EP-JAVA-01":command="java";probe=["-version"];args=["-ea","-cp",work,"ResourceBoundaryTest"];compile=["javac",["--release","17","ResourceBoundary.java","ResourceBoundaryTest.java"]];break;
          case "EP-PY-01":command=process.platform==="win32"?"python":"python3";probe=["--version"];args=["-B","-m","unittest","-v","test_resource_boundary.py"];break;
          case "EP-C-01":command=path.join(work,process.platform==="win32"?"boundary-test.exe":"boundary-test");probe=[];args=[];compile=["cc",["-std=c11","-DNDEBUG","-Wall","-Wextra","-Werror","boundary.c","boundary_test.c","-o",command]];break;
          case "EP-CPP-01":command=path.join(work,process.platform==="win32"?"boundary-test.exe":"boundary-test");probe=[];args=[];compile=["c++",["-std=c++17","-DNDEBUG","-Wall","-Wextra","-Werror","boundary.cpp","boundary_test.cpp","-o",command]];break;
          default:command=process.execPath;probe=["--version"];args=["--test","--test-reporter=tap","ipc-lifecycle.test.cjs"];
        }
        const versionCommand=probe.length?command:compile![0],versionArgs=probe.length?probe:["--version"];
        const version=call(versionCommand,versionArgs,work);
        if(version.status!==0){evidence.status=version.error?"MISSING":"FAIL";throw new Error("Tool version probe failed");}
        evidence.toolVersions[versionCommand]=version.output.trim();
        const extraProbes:Array<[string,string[]]>=caseId==="EP-TS-01"?[[process.execPath,[path.join(input.root,"node_modules/typescript/bin/tsc"),"--version"]]]:caseId==="EP-RS-01"?[["rustc",["--version"]]]:caseId==="EP-JAVA-01"?[["javac",["-version"]]]:[];
        for(const [tool,toolArgs] of extraProbes){const checked=call(tool,toolArgs,work);if(checked.status!==0){evidence.status=checked.error?"MISSING":"FAIL";throw new Error("Declared compiler unavailable");}evidence.toolVersions[tool+" "+toolArgs.join(" ")]=checked.output.trim();}
        if(compile) {const prepared=call(compile[0],compile[1],work);fs.writeFileSync(path.join(out,"compile.log"),prepared.output);if(prepared.status!==0){if(prepared.error)evidence.status="MISSING";throw new Error("Tool/compile preparation failed");}}
        broken=call(command,args,work,{CRAFT_ENGINEERING_DEFECTIVE:"1"});fixed=call(command,args,work,{CRAFT_ENGINEERING_DEFECTIVE:"0"});
        fs.writeFileSync(path.join(out,"red.log"),broken.output);fs.writeFileSync(path.join(out,"green.log"),fixed.output);
      }
      evidence.broken=assessExecution(broken,definition.format,"failure",definition.names,path.join(out,"red.log"));
      evidence.fixed=assessExecution(fixed,definition.format,"success",definition.names,path.join(out,"green.log"));
      evidence.status="PASS";
    } catch(error) {evidence.reason=error instanceof Error?error.message:String(error);}
    fs.writeFileSync(path.join(out,"evidence.json"),JSON.stringify(evidence,null,2)+"\n");return evidence;
  });
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {const results=verifyEngineering({root:path.resolve(import.meta.dirname,".."),...parseEngineeringArgs(process.argv.slice(2))});console.log(JSON.stringify(results,null,2));process.exitCode=results.some(r=>r.status==="FAIL")?1:results.some(r=>r.status!=="PASS")?2:0;}
  catch(error){console.error(error instanceof Error?error.message:"Invalid engineering invocation");process.exitCode=2;}
}
