/**
 * Unified repository contract types
 * All repo functions should use these standardized types
 */

export type SortOrder = "asc" | "desc";

export type PaginationParams = {
  pageSize: number;
  offset: number;
};

export type SortParams = {
  sortBy: string;
  sortOrder: SortOrder;
};

export type SearchParams = {
  search: string;
};

export type FilterParams = {
  status?: string;
  companyId?: number | null;
  [key: string]: unknown;
};

export type ListQueryParams = PaginationParams & SortParams & SearchParams & FilterParams;

export type CountQueryParams = SearchParams & FilterParams;

export type ListResult<T> = {
  items: T[];
  totalCount: number;
};

export type StatusCount = {
  status: string;
  count: number;
};

export type D1Result<T = unknown> = {
  results?: T[];
  success: boolean;
  meta: any;
  error?: string;
};

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  all<T = unknown>(): Promise<D1Result<T>>;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result<null>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch<T = unknown>(statements: D1PreparedStatementLike[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

/**
 * Base repository interface
 * All domain repos should implement relevant methods from this interface
 */
export interface BaseRepository<TListRow, TDetailRow> {
  // List operations
  list(params: ListQueryParams & { db: D1DatabaseLike }): Promise<TListRow[]>;
  count(params: CountQueryParams & { db: D1DatabaseLike }): Promise<number>;
  listStatusCounts?(params: FilterParams & { db: D1DatabaseLike }): Promise<StatusCount[]>;

  // Detail operations
  getById(params: { db: D1DatabaseLike; id: number }): Promise<TDetailRow | null>;
}

/**
 * Helper to normalize count result from D1
 */
export function normalizeCount(row: { count?: number | string } | null): number {
  return Number(row?.count || 0);
}

/**
 * Helper to normalize status counts from D1
 */
export function normalizeStatusCounts(
  results: Array<{ status: string; count: number | string }> | undefined
): StatusCount[] {
  return (results || []).map((row) => ({
    status: row.status,
    count: Number(row.count),
  }));
}

/**
 * Helper to build search binds for common patterns
 */
export function buildSearchBinds(search: string, fieldCount: number): string[] {
  const q = `%${search}%`;
  return Array(fieldCount).fill(q);
}

/**
 * Helper to build ORDER BY clause with tiebreaker
 */
export function buildSortClause(
  sortMapping: Record<string, string>,
  sortBy: string,
  sortOrder: SortOrder,
  defaultSort: string,
  tiebreakerColumn: string = "id"
): string {
  const sortColumn = sortMapping[sortBy] || sortMapping[defaultSort] || defaultSort;
  const direction = sortOrder === "asc" ? "ASC" : "DESC";
  return `ORDER BY ${sortColumn} ${direction}, ${tiebreakerColumn} DESC`;
}
