export type OwnedEntry =
  | {
      kind: "text-marker";
      id: string;
      value: string;
      hash: string;
      createdFile: boolean;
    }
  | {
      kind: "json-path" | "toml-key";
      id: string;
      path: string[];
      value: unknown;
      hash: string;
      createdFile: boolean;
    }
  | {
      kind: "json-hook";
      id: string;
      event: string;
      value: Record<string, unknown>;
      hash: string;
      createdFile: boolean;
    };
