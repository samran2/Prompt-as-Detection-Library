export type JsonValue = null | boolean | number | string | JsonValue[] | {[key: string]: JsonValue};

export interface TechniqueInput {
  id: string;
  name: string;
  domain: string;
  kind: string;
  tactics: string[];
  platforms: string[];
  attackVersion: string;
  stixId: string;
  parentId: string | null;
  sourceUrl: string;
  behavior: string;
  telemetry: string[];
}

export interface PromptInput {
  id: string;
  techniqueId: string;
  domain: string;
  status: string;
  text: string;
  promptSha256?: string;
  metadata?: JsonValue;
}

export type Hashed<T> = Readonly<T & {contentHash: `sha256:${string}`}>;
export type CatalogResource = Hashed<{id: string; [key: string]: JsonValue}>;

export interface ResearchCatalog {
  readonly collections: Readonly<{
    techniques: readonly CatalogResource[];
    prompts: readonly CatalogResource[];
    rules: readonly CatalogResource[];
    validations: readonly CatalogResource[];
    versions: readonly CatalogResource[];
    relationships: readonly CatalogResource[];
  }>;
  readonly indexes: Readonly<Record<string, ReadonlyMap<string, CatalogResource>>>;
  readonly snapshotHash: `sha256:${string}`;
}

export interface Page<T> {
  data: readonly T[];
  meta: {pageSize: number; totalItems: number; nextCursor: string | null; snapshotHash: string};
}

export declare function canonicalJson(value: JsonValue): string;
export declare function sha256(value: string | Uint8Array): string;
export declare function queryFingerprint(value: JsonValue): string;
export declare function encodeCursor(input: {resource: string; offset: number; queryHash: string; snapshotHash: string}): string;
export declare function decodeCursor(cursor: string, expected: {resource: string; queryHash: string; snapshotHash: string}): number;
export declare function page<T>(items: readonly T[], options: {
  resource: string;
  pageSize: number;
  cursor?: string;
  filters: JsonValue;
  snapshotHash: string;
}): Page<T>;
export declare function createResearchCatalog(input: {
  techniques: TechniqueInput[];
  prompts: PromptInput[];
  rules?: Array<{id: string; [key: string]: JsonValue}>;
  validations?: Array<{id: string; [key: string]: JsonValue}>;
  version: {id: string; [key: string]: JsonValue};
}): ResearchCatalog;
