export const RUNTIME_DESCRIPTORS = Object.freeze({
  claude: { localDirectory: ".claude", skills: true },
  codex: { localDirectory: ".codex", skills: true },
  cursor: { localDirectory: ".cursor", skills: true },
  windsurf: { localDirectory: ".windsurf", skills: true },
  opencode: { localDirectory: ".opencode", skills: true },
  kilo: { localDirectory: ".kilo", skills: true },
  gemini: { localDirectory: ".gemini", skills: true },
  copilot: { localDirectory: ".github", skills: false },
  antigravity: { localDirectory: ".agent", skills: true },
  augment: { localDirectory: ".augment", skills: true },
  trae: { localDirectory: ".trae", skills: false },
  codebuddy: { localDirectory: ".codebuddy", skills: true },
  cline: { localDirectory: "", skills: false },
  openclaw: { localDirectory: ".openclaw", skills: true },
  qoder: { localDirectory: ".qoder", skills: true },
});

export type RuntimeId = keyof typeof RUNTIME_DESCRIPTORS;

export function runtimeDescriptor(id: string) {
  if (!Object.hasOwn(RUNTIME_DESCRIPTORS, id)) {
    throw new Error(`Unknown runtime: ${id}`);
  }
  return RUNTIME_DESCRIPTORS[id as RuntimeId];
}
