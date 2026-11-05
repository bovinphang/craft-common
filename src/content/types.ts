export type InstallLanguage = "en" | "zh-CN";
export type ContentFile = { relativePath: string; hash: string };
export type SkillRecord = {
  id: string;
  version: string;
  sourcePackage: string;
  repository: string;
  files: ContentFile[];
};
export type ContentCatalog = {
  schemaVersion: 1;
  packageName: "@bovinphang/craft-common";
  packageVersion: string;
  language: InstallLanguage;
  root: string;
  skills: SkillRecord[];
  digest: string;
};
