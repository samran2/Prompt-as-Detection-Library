export interface ApiErrorEnvelope {
  error: {code: string; message: string};
}

export interface ApiPage<T> {
  data: T[];
  meta: {pageSize: number; totalItems: number; nextCursor: string | null; snapshotHash: string};
}

export interface ApiItem<T> {
  data: T;
  meta: {snapshotHash: string};
}

export interface ApiResponse<T> {
  status: number;
  etag: string | null;
  body: T | null;
}

export interface ListOptions {
  pageSize?: number;
  cursor?: string;
  ifNoneMatch?: string;
  [filter: string]: string | number | undefined;
}

export interface ResearchApiClient {
  listTechniques(options?: ListOptions): Promise<ApiResponse<ApiPage<unknown>>>;
  getTechnique(id: string): Promise<ApiResponse<ApiItem<unknown>>>;
  listPrompts(options?: ListOptions): Promise<ApiResponse<ApiPage<unknown>>>;
  getPrompt(id: string): Promise<ApiResponse<ApiItem<unknown>>>;
  listRules(options?: ListOptions): Promise<ApiResponse<ApiPage<unknown>>>;
  getRule(id: string): Promise<ApiResponse<ApiItem<unknown>>>;
  listValidations(options?: ListOptions): Promise<ApiResponse<ApiPage<unknown>>>;
  getValidation(id: string): Promise<ApiResponse<ApiItem<unknown>>>;
  listVersions(options?: ListOptions): Promise<ApiResponse<ApiPage<unknown>>>;
  getVersion(id: string): Promise<ApiResponse<ApiItem<unknown>>>;
  listRelationships(options?: ListOptions): Promise<ApiResponse<ApiPage<unknown>>>;
  getRelationship(id: string): Promise<ApiResponse<ApiItem<unknown>>>;
  search(options: ListOptions & {q: string}): Promise<ApiResponse<ApiPage<unknown>>>;
}

export declare class ResearchApiError extends Error {
  readonly status: number;
  readonly code: string;
}

export declare function createResearchApiClient(options: {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}): ResearchApiClient;
