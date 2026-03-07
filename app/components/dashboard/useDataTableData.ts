import { useDeferredValue, useEffect, useEffectEvent, useMemo, useState } from "react";
import { includesQuery } from "./data-table-utils";

interface UseDataTableDataOptions<T> {
  currentFetchData?: (params: {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, unknown>;
  }) => Promise<{ data: T[]; totalCount: number }>;
  providedData?: T[];
  providedTotalCount?: number;
  providedIsLoading?: boolean;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  activeTab: string;
  searchQuery: string;
  serverPagination: boolean;
  paginationEnabled: boolean;
}

export function useDataTableData<T>({
  currentFetchData,
  providedData,
  providedTotalCount,
  providedIsLoading,
  page,
  pageSize,
  sortBy,
  sortOrder,
  activeTab,
  searchQuery,
  serverPagination,
  paginationEnabled,
}: UseDataTableDataOptions<T>) {
  const [internalData, setInternalData] = useState<T[]>([]);
  const [internalTotalCount, setInternalTotalCount] = useState(0);
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const loadData = useEffectEvent(async () => {
    if (!currentFetchData) {
      return;
    }

    setInternalLoading(true);
    setError(null);

    try {
      const result = await currentFetchData({
        page,
        pageSize,
        sortBy,
        sortOrder,
        filters: {},
      });
      setInternalData(result.data);
      setInternalTotalCount(result.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setInternalLoading(false);
    }
  });

  useEffect(() => {
    if (!currentFetchData) {
      return;
    }

    loadData();
  }, [activeTab, currentFetchData, loadData, page, pageSize, sortBy, sortOrder]);

  const data = providedData ?? internalData;
  const totalCount = providedTotalCount ?? internalTotalCount;
  const isLoading = providedIsLoading ?? internalLoading;

  const filteredData = useMemo(() => {
    if (serverPagination) {
      return data;
    }

    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return data;
    }

    return data.filter((item) => {
      if (!item || typeof item !== "object") {
        return false;
      }

      return Object.values(item as Record<string, unknown>).some((value) =>
        includesQuery(value, normalizedQuery),
      );
    });
  }, [data, deferredSearchQuery, serverPagination]);

  const currentData = useMemo(() => {
    if (currentFetchData || serverPagination || !paginationEnabled) {
      return filteredData;
    }

    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [currentFetchData, filteredData, page, pageSize, serverPagination, paginationEnabled]);

  return {
    currentData,
    error,
    filteredData,
    isLoading,
    totalCount: (currentFetchData || serverPagination) ? totalCount : filteredData.length,
  };
}
