import { parse } from "yaml";
import { PROJECT_ROLES, TASK_KINDS } from "../../src/content/applicability.js";
export const CORE_RULE_IDS = ["ENG-CONTRACT","ENG-ERROR","ENG-RESOURCE","ENG-CONCURRENCY","ENG-BOUNDARY","ENG-DEPENDENCY","ENG-VERIFICATION","ENG-OPERABILITY"] as const;
export const ENGINEERING_CASE_IDS = ["EP-TS-01","EP-RS-01","EP-GO-01","EP-JAVA-01","EP-PY-01","EP-C-01","EP-CPP-01","EP-UI-01","EP-IPC-01","EP-SVC-01"] as const;
export type PracticeLevel = "required" | "recommended" | "conditional";
export interface PracticeCard { id:string;level:PracticeLevel;sourceIds:string[];caseIds:string[];evidence:"case"|"review-only"|"not-run" }
type Obj = Record<string,unknown>;
const record = (v:unknown):v is Obj => v!==null && typeof v==="object" && !Array.isArray(v);
const text = (v:unknown):v is string => typeof v==="string" && v.trim().length>0;
const level = (v:unknown):v is PracticeLevel => v==="required" || v==="recommended" || v==="conditional";
function strings(v:unknown, allowed?:readonly string[]): v is string[] {
  return Array.isArray(v) && v.length>0 && v.every(x=>text(x) && (!allowed || allowed.includes(x))) && new Set(v).size===v.length;
}
function fail(what:string):never { throw new Error("Invalid engineering content: "+what); }
function cardBody(markdown:string,id:string,ids:readonly string[]):string {
  const marker=`<a id="${id}"></a>`;
  const first=markdown.indexOf(marker);
  if(first<0 || markdown.indexOf(marker,first+marker.length)!==-1) fail("anchor "+id);
  const next=ids.filter(other=>other!==id).map(other=>markdown.indexOf(`<a id="${other}"></a>`,first+marker.length)).filter(index=>index>=0);
  return markdown.slice(first,next.length?Math.min(...next):undefined);
}
function checkSections(body:string,id:string):void {
  for(const heading of ["Risk|风险","Applies|适用","Decision|决策","Exceptions|例外","Examples|正反示意","Verification|验证","Sources|来源"])
    if(!new RegExp("^### (?:"+heading+")(?:\\s|$)","m").test(body)) fail(id+" missing section "+heading);
}
export function validateCoreResources(input:{markdown:string;sources:unknown;rules:unknown}):void {
  const {markdown,sources,rules}=input;
  if(!record(sources) || sources.schemaVersion!==1 || !Array.isArray(sources.sources)) fail("source schema");
  const ids=new Set<string>();
  for(const source of sources.sources as unknown[]) {
    if(!record(source) || !text(source.id) || !/^[a-z][a-z0-9-]*$/.test(source.id) || ids.has(source.id)) fail("source id");
    for(const field of ["publisher","title","url","section","checkedAt","versionScope","limits"]) if(!text(source[field])) fail("source "+field);
    const url=new URL(source.url as string);
    if(url.protocol!=="https:" || url.username || url.password) fail("source URL");
    if(!/^\d{4}-\d{2}-\d{2}$/.test(source.checkedAt as string) || !Number.isFinite(Date.parse(source.checkedAt as string))) fail("source date");
    if(!["verified","unknown"].includes(String(source.licenseStatus)) || !["adopt","conditional","defer","reject"].includes(String(source.adoption))) fail("source disposition");
    ids.add(source.id);
  }
  if(!ids.size || !record(rules) || rules.schemaVersion!==1 || !Array.isArray(rules.rules) || rules.rules.length!==8) fail("rule schema");
  const seen=new Set<string>();
  for(const rule of rules.rules as unknown[]) {
    if(!record(rule) || !text(rule.id) || !CORE_RULE_IDS.includes(rule.id as typeof CORE_RULE_IDS[number]) || seen.has(rule.id)) fail("rule id");
    if(rule.kind!=="core" || !level(rule.level) || rule.anchor!==rule.id || "ownerSkill" in rule) fail("rule scope");
    if(!strings(rule.sourceIds) || rule.sourceIds.some(id=>!ids.has(id)) || !strings(rule.caseIds,ENGINEERING_CASE_IDS)) fail("rule source/case");
    if(rule.roles!==undefined && !strings(rule.roles,PROJECT_ROLES)) fail("rule roles");
    if(rule.taskKinds!==undefined && !strings(rule.taskKinds,TASK_KINDS)) fail("rule tasks");
    if(rule.languages!==undefined && !strings(rule.languages,["typescript","rust","go","java","python","c","cpp"])) fail("rule languages");
    checkSections(cardBody(markdown,rule.id,CORE_RULE_IDS),rule.id);
    seen.add(rule.id);
  }
}
export function parsePracticeCards(markdown:string,ownerSkill:string):PracticeCard[] {
  const frontmatter=markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if(!frontmatter) fail("practice frontmatter");
  const data:unknown=parse(frontmatter[1]);
  if(!record(data) || !Array.isArray(data.practiceCards) || !data.practiceCards.length) fail("practice cards");
  const cards:PracticeCard[]=[],seen=new Set<string>();
  for(const item of data.practiceCards as unknown[]) {
    if(!record(item) || !text(item.id) || !item.id.startsWith(ownerSkill+":") || !/^[a-z0-9-]+:[a-z0-9-]+$/.test(item.id) || seen.has(item.id) || !level(item.level)) fail("practice identity");
    if(!strings(item.sourceIds) || !strings(item.caseIds,ENGINEERING_CASE_IDS) || !["case","review-only","not-run"].includes(String(item.evidence))) fail("practice evidence");
    cards.push({id:item.id,level:item.level,sourceIds:item.sourceIds,caseIds:item.caseIds,evidence:item.evidence as PracticeCard["evidence"]}); seen.add(item.id);
  }
  for(const card of cards) checkSections(cardBody(markdown,card.id,cards.map(c=>c.id)),card.id);
  return cards;
}
