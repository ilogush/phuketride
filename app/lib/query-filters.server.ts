export type SortOrder = "asc" | "desc";

type ParseListFiltersOptions<TTab extends string, TStatus extends string, TSortBy extends string> = {
    tabs?: readonly TTab[];
    defaultTab?: TTab;
    statuses?: readonly TStatus[];
    defaultStatus?: TStatus;
    sortBy?: readonly TSortBy[];
    defaultSortBy?: TSortBy;
    defaultSortOrder?: SortOrder;
    defaultSearch?: string;
};

function parseEnumFilter<TValue extends string>(
    value: string | null,
    allowed: readonly TValue[] | undefined,
    fallback: TValue | undefined
): TValue | undefined {
    if (!allowed || allowed.length === 0) return fallback;
    if (value && allowed.includes(value as TValue)) return value as TValue;
    return fallback ?? allowed[0];
}

export function parseListFilters<TTab extends string, TStatus extends string, TSortBy extends string>(
    url: URL,
    options: ParseListFiltersOptions<TTab, TStatus, TSortBy>
) {
    const tab = parseEnumFilter(url.searchParams.get("tab"), options.tabs, options.defaultTab);
    const status = parseEnumFilter(url.searchParams.get("status"), options.statuses, options.defaultStatus);
    const sortBy = parseEnumFilter(url.searchParams.get("sortBy"), options.sortBy, options.defaultSortBy);
    const sortOrderRaw = url.searchParams.get("sortOrder");
    const sortOrder: SortOrder = sortOrderRaw === "asc" || sortOrderRaw === "desc"
        ? sortOrderRaw
        : (options.defaultSortOrder ?? "desc");
    const search = (url.searchParams.get("search") || options.defaultSearch || "").trim();

    return { tab, status, sortBy, sortOrder, search };
}
