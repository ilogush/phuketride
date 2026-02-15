// Database query optimization helpers
// Provides pagination, filtering, and efficient queries

import { SQL, sql } from "drizzle-orm";

export interface PaginationParams {
    page: number;
    limit: number;
}

export interface PaginationResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export function getPaginationParams(searchParams: URLSearchParams): PaginationParams {
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "20")));
    
    return { page, limit };
}

export function calculatePagination(page: number, limit: number, total: number) {
    const totalPages = Math.ceil(total / limit);
    
    return {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    };
}

// Search helper - creates LIKE conditions for multiple fields
export function createSearchCondition(
    searchTerm: string,
    fields: SQL[]
): SQL | undefined {
    if (!searchTerm || searchTerm.trim() === "") return undefined;
    
    const term = `%${searchTerm.trim()}%`;
    const conditions = fields.map(field => sql`${field} LIKE ${term}`);
    
    // Combine with OR
    return conditions.reduce((acc, condition) => 
        acc ? sql`${acc} OR ${condition}` : condition
    );
}

// Efficient count query
export async function getCount(
    db: any,
    table: any,
    where?: SQL
): Promise<number> {
    const query = db.select({ count: sql<number>`count(*)` }).from(table);
    
    if (where) {
        query.where(where);
    }
    
    const result = await query;
    return result[0]?.count || 0;
}

// Batch operations helper
export async function batchInsert<T>(
    db: any,
    table: any,
    data: T[],
    batchSize: number = 100
): Promise<void> {
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await db.insert(table).values(batch);
    }
}

// Select only needed columns to reduce data transfer
export function selectColumns<T extends Record<string, any>>(
    columns: (keyof T)[]
): Record<string, any> {
    return columns.reduce((acc, col) => {
        acc[col as string] = true;
        return acc;
    }, {} as Record<string, any>);
}
