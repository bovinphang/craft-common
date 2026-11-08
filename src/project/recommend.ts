import path from "node:path";
import {
  TASK_KINDS,
  type CapabilityCandidate,
  type TaskKind,
} from "../content/applicability.js";
import type { ProjectInspection, ProjectUnit } from "./types.js";
export interface CapabilityRecommendation {
  id: string;
  sourcePackage: string;
  projectRoots: string[];
  reasons: string[];
}
const within = (root: string, target: string) => {
  const relative = path.relative(root, target);
  return (
    !path.isAbsolute(relative) &&
    relative !== ".." &&
    !relative.startsWith(".." + path.sep)
  );
};
/** Match delivered catalog entries only. Conditions are OR within a dimension, AND across dimensions. */
export function recommendCapabilities(input: {
  inspection: ProjectInspection;
  catalog: readonly CapabilityCandidate[];
  task?: { path?: string; kind?: TaskKind };
}): CapabilityRecommendation[] {
  const { inspection, catalog, task } = input;
  if (task?.kind && !TASK_KINDS.includes(task.kind))
    throw new Error("未知任务类型");
  let units = inspection.units;
  if (task?.path) {
    const target = path.resolve(inspection.workspace, task.path);
    if (!within(inspection.workspace, target))
      throw new Error("任务路径越过工作区边界");
    const nearest = units
      .filter((u) => within(u.root, target))
      .sort((a, b) => b.root.length - a.root.length)[0];
    units = nearest ? [nearest] : [];
    if (
      nearest &&
      task.kind === "ipc" &&
      nearest.roles.some((r) => r === "ui" || r === "desktop-core")
    ) {
      const selected = new Map([[nearest.root, nearest]]);
      for (const current of selected.values())
        for (const related of current.relatedRoots) {
          const next = inspection.units.find((u) => u.root === related);
          if (
            next &&
            next.roles.some((r) => r === "ui" || r === "desktop-core") &&
            current.frameworks.some(
              (f) =>
                ["tauri", "electron"].includes(f.id) &&
                next.frameworks.some((n) => n.id === f.id),
            )
          )
            selected.set(next.root, next);
        }
      units = [...selected.values()];
    }
  }
  return catalog
    .flatMap((candidate) => {
      const a = candidate.applicability;
      if (!a || !Object.values(a).some((v) => v?.length)) return [];
      if (task?.kind && a.taskKinds && !a.taskKinds.includes(task.kind))
        return [];
      const matches = (unit: ProjectUnit) =>
        (!a.languages || a.languages.some((v) => unit.languages.includes(v))) &&
        (!a.frameworks ||
          a.frameworks.some((v) => unit.frameworks.some((f) => f.id === v))) &&
        (!a.roles || a.roles.some((v) => unit.roles.includes(v)));
      const matched = units.filter(matches);
      if (!matched.length) return [];
      const reasons = [
        ...(a.languages
          ? [
              "language: " +
                a.languages
                  .filter((v) => matched.some((u) => u.languages.includes(v)))
                  .join(", "),
            ]
          : []),
        ...(a.frameworks
          ? [
              "framework: " +
                a.frameworks
                  .filter((v) =>
                    matched.some((u) => u.frameworks.some((f) => f.id === v)),
                  )
                  .join(", "),
            ]
          : []),
        ...(a.roles
          ? [
              "role: " +
                a.roles
                  .filter((v) => matched.some((u) => u.roles.includes(v)))
                  .join(", "),
            ]
          : []),
        ...(task?.kind && a.taskKinds ? ["task: " + task.kind] : []),
      ];
      return [
        {
          id: candidate.id,
          sourcePackage: candidate.sourcePackage,
          projectRoots: matched.map((u) => u.root).sort(),
          reasons: reasons.length
            ? reasons
            : ["project candidate; task intent unspecified"],
        },
      ];
    })
    .sort((a, b) => a.id.localeCompare(b.id, "en"));
}
