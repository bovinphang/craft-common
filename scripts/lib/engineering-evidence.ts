export interface RunEvidence {
  exitCode:number|null;
  testNames:string[];
  tests:{total:number;passed:number;failed:number;skipped:number};
  assertionMarkers:string[];
  logPath:string;
}
export interface CaseEvidence {
  caseId:string;status:"PASS"|"FAIL"|"MISSING"|"NOT_RUN";platform:string;
  toolVersions:Record<string,string>;sourceHash:string;commands:string[];
  broken?:RunEvidence;fixed?:RunEvidence;scope:string;reason?:string;
}
export interface Execution {status:number|null;output:string;error?:Error}
export type EvidenceFormat = "tap"|"cargo"|"go-json"|"native-json"|"python";
export function assessExecution(result:Execution,format:EvidenceFormat,expected:"success"|"failure",requiredNames:readonly string[],logPath:string):RunEvidence {
  if(result.error || result.status===null) throw new Error("MISSING execution tool or terminated test process");
  if(expected==="failure" && format==="tap" && !/code: ['"]ERR_ASSERTION['"]/.test(result.output))
    throw new Error("Business RED requires an actual assertion failure, not a loader/compiler error");
  if(expected==="failure" && ((format==="native-json" && !/CRAFT_ASSERTION:/.test(result.output)) || (format==="python" && !/AssertionError/.test(result.output))))
    throw new Error("Missing native business assertion failure");
  const rows:Array<{name:string;state:"passed"|"failed"|"skipped"}>=[];
  let nativeSummary:RunEvidence["tests"]|undefined;
  if(format==="tap") {
    for(const match of result.output.matchAll(/^(not ok|ok) \d+ - (.+)$/gm))
      rows.push({name:match[2],state:/# SKIP\b/.test(match[2])?"skipped":match[1]==="ok"?"passed":"failed"});
    const summary=(key:string)=>Number(result.output.match(new RegExp("^# "+key+" (\\d+)\\s*$","m"))?.[1]??NaN);
    if(summary("tests")!==rows.length || summary("pass")!==rows.filter(r=>r.state==="passed").length || summary("fail")!==rows.filter(r=>r.state==="failed").length || summary("skipped")!==rows.filter(r=>r.state==="skipped").length)
      throw new Error("Invalid TAP counts; no complete named test execution");
  } else if(format==="cargo") {
    for(const match of result.output.matchAll(/^test (.+) \.\.\. (ok|FAILED|ignored)\s*$/gm))
      rows.push({name:match[1],state:match[2]==="ok"?"passed":match[2]==="FAILED"?"failed":"skipped"});
    if(!/test result: (?:ok|FAILED)\./.test(result.output)) throw new Error("Missing Rust test completion");
  } else if(format==="go-json") {
    for(const line of result.output.split(/\r?\n/).filter(line=>line.startsWith("{"))) {
      const event=JSON.parse(line) as {Action?:string;Test?:string};
      if(event.Test && ["pass","fail","skip"].includes(event.Action??"")) rows.push({name:event.Test,state:event.Action==="pass"?"passed":event.Action==="fail"?"failed":"skipped"});
    }
  } else if(format==="native-json") {
    for(const match of result.output.matchAll(/^CRAFT_TEST (.+)$/gm)) {
      const event=JSON.parse(match[1]) as {name?:unknown;status?:unknown};
      if(typeof event.name!=="string" || !event.name || !["pass","fail","skip"].includes(String(event.status))) throw new Error("Invalid native test event");
      rows.push({name:event.name,state:event.status==="pass"?"passed":event.status==="fail"?"failed":"skipped"});
    }
    const summaries=[...result.output.matchAll(/^CRAFT_SUMMARY (.+)$/gm)];
    if(summaries.length!==1) throw new Error("Missing complete native summary");
    nativeSummary=JSON.parse(summaries[0][1]) as RunEvidence["tests"];
  } else {
    for(const match of result.output.matchAll(/^(test_\S+) \(.+?\) \.\.\. (ok|FAIL|ERROR|skipped[^\r\n]*)\s*$/gm))
      rows.push({name:match[1],state:match[2]==="ok"?"passed":match[2].startsWith("skipped")?"skipped":"failed"});
    const count=Number(result.output.match(/^Ran (\d+) tests? in /m)?.[1]??NaN);
    if(count!==rows.length || !/^(?:OK|FAILED)(?:\s|$)/m.test(result.output)) throw new Error("Missing complete Python unittest run");
  }
  const tests={total:rows.length,passed:rows.filter(r=>r.state==="passed").length,failed:rows.filter(r=>r.state==="failed").length,skipped:rows.filter(r=>r.state==="skipped").length};
  if(new Set(rows.map(row=>row.name)).size!==rows.length) throw new Error("Duplicate native test names");
  if(nativeSummary && (Object.keys(tests) as Array<keyof typeof tests>).some(key=>nativeSummary[key]!==tests[key])) throw new Error("Native counts do not match executed bodies");
  if(!requiredNames.length || !tests.total || tests.total===tests.skipped || requiredNames.some(name=>!rows.some(r=>r.name.includes(name) && r.state!=="skipped")))
    throw new Error("Zero, skipped or missing required named tests");
  if(expected==="success" ? result.status!==0 || tests.failed!==0 || tests.passed===0 : result.status===0 || tests.failed===0 || !requiredNames.some(name=>rows.some(r=>r.name.includes(name) && r.state==="failed")))
    throw new Error("Execution is not the required business "+expected);
  return {exitCode:result.status,testNames:rows.map(r=>r.name),tests,assertionMarkers:rows.filter(r=>expected==="success"?r.state==="passed":r.state==="failed").map(r=>r.name),logPath};
}
