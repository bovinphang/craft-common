export const PROJECT_ROLES = [
  "ui",
  "desktop-core",
  "native-library",
  "service",
  "cli",
  "unknown",
] as const;
export const TASK_KINDS = [
  "ui",
  "ipc",
  "native-memory",
  "api",
  "data",
  "build",
  "review",
] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];
export type TaskKind = (typeof TASK_KINDS)[number];
export interface CapabilityApplicability {
  languages?: string[];
  frameworks?: string[];
  roles?: ProjectRole[];
  taskKinds?: TaskKind[];
}
export interface CapabilityCandidate {
  id: string;
  sourcePackage: string;
  applicability?: CapabilityApplicability;
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function strings(
  value: unknown,
  field: string,
  allowed?: readonly string[],
): string[] {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.some(
      (item) =>
        typeof item !== "string" ||
        !/^[a-z][a-z0-9-]*$/.test(item) ||
        (allowed && !allowed.includes(item)),
    ) ||
    new Set(value).size !== value.length
  )
    throw new Error(`Invalid capability applicability: ${field}`);
  return [...value] as string[];
}
/** Source identities come from the caller's verified catalog, never self-reported metadata. */
export function readCapabilityCandidates(
  metadata: unknown,
  sources: Readonly<Record<string, string>>,
): CapabilityCandidate[] {
  if (!Array.isArray(metadata))
    throw new Error("Capability metadata must be an array");
  const seen = new Set<string>();
  return metadata.map((item) => {
    if (
      !record(item) ||
      typeof item.id !== "string" ||
      !item.id ||
      seen.has(item.id)
    )
      throw new Error("Invalid or duplicate capability ID");
    seen.add(item.id);
    if (
      !Object.hasOwn(sources, item.id) ||
      typeof sources[item.id] !== "string" ||
      !sources[item.id]
    )
      throw new Error(`Missing verified capability source: ${item.id}`);
    const result: CapabilityCandidate = {
      id: item.id,
      sourcePackage: sources[item.id],
    };
    if (item.applicability === undefined) return result;
    if (!record(item.applicability))
      throw new Error("Invalid capability applicability");
    const value = item.applicability,
      applicability: CapabilityApplicability = {};
    if (value.languages !== undefined)
      applicability.languages = strings(value.languages, "languages");
    if (value.frameworks !== undefined)
      applicability.frameworks = strings(value.frameworks, "frameworks");
    if (value.roles !== undefined)
      applicability.roles = strings(
        value.roles,
        "roles",
        PROJECT_ROLES,
      ) as ProjectRole[];
    if (value.taskKinds !== undefined)
      applicability.taskKinds = strings(
        value.taskKinds,
        "taskKinds",
        TASK_KINDS,
      ) as TaskKind[];
    return { ...result, applicability };
  });
}
