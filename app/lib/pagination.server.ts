import { QUERY_LIMITS } from "~/lib/query-limits";

type PaginationOptions = {
    defaultPageSize?: number;
    maxPageSize?: number;
};

export function getPaginationFromUrl(url: URL, options: PaginationOptions = {}) {
    const defaultPageSize = options.defaultPageSize ?? 20;
    const maxPageSize = options.maxPageSize ?? QUERY_LIMITS.LARGE;

    const pageParam = Number(url.searchParams.get("page") || "1");
    const pageSizeParam = Number(url.searchParams.get("pageSize") || String(defaultPageSize));

    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
    const pageSize = Number.isFinite(pageSizeParam) && pageSizeParam > 0
        ? Math.min(Math.floor(pageSizeParam), maxPageSize)
        : defaultPageSize;

    return {
        page,
        pageSize,
        offset: (page - 1) * pageSize,
    };
}
