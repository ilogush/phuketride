import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import type { Tab } from "./data-table-types";

interface UseDataTableControlsOptions<T> {
  tabs?: Tab<T>[];
  defaultTabId?: string;
  onTabChange?: (tabId: string) => void;
  initialPageSize: number;
  serverPagination: boolean;
}

export function useDataTableControls<T>({
  tabs,
  defaultTabId,
  onTabChange,
  initialPageSize,
  serverPagination,
}: UseDataTableControlsOptions<T>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTabId = defaultTabId || (tabs && tabs.length > 0 ? tabs[0].id : "");
  const [activeTab, setActiveTab] = useState(initialTabId);
  const [page, setPage] = useState(() => {
    const rawPage = searchParams.get("page");
    return rawPage ? Number.parseInt(rawPage, 10) : 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    const rawPageSize = searchParams.get("pageSize");
    return rawPageSize ? Number.parseInt(rawPageSize, 10) : initialPageSize;
  });
  const [sortBy, setSortBy] = useState<string | undefined>(() => searchParams.get("sortBy") || undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>(() => {
    const rawSortOrder = searchParams.get("sortOrder");
    return rawSortOrder === "asc" || rawSortOrder === "desc" ? rawSortOrder : undefined;
  });
  const didMountTabReset = useRef(false);

  useEffect(() => {
    if (!serverPagination) {
      return;
    }

    const nextPage = Number.parseInt(searchParams.get("page") || "1", 10);
    const nextPageSize = Number.parseInt(searchParams.get("pageSize") || String(initialPageSize), 10);
    const nextSortBy = searchParams.get("sortBy") || undefined;
    const rawSortOrder = searchParams.get("sortOrder");
    const nextSortOrder = rawSortOrder === "asc" || rawSortOrder === "desc" ? rawSortOrder : undefined;

    if (!Number.isNaN(nextPage) && nextPage !== page) {
      setPage(nextPage);
    }

    if (!Number.isNaN(nextPageSize) && nextPageSize !== pageSize) {
      setPageSize(nextPageSize);
    }

    if (nextSortBy !== sortBy) {
      setSortBy(nextSortBy);
    }

    if (nextSortOrder !== sortOrder) {
      setSortOrder(nextSortOrder);
    }
  }, [initialPageSize, page, pageSize, searchParams, serverPagination, sortBy, sortOrder]);

  useEffect(() => {
    if (!serverPagination) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    const currentPage = Number(next.get("page") || 1);
    const currentPageSize = Number(next.get("pageSize") || initialPageSize);
    const currentSortBy = next.get("sortBy") || undefined;
    const currentSortOrder = next.get("sortOrder") || undefined;
    const nextSortBy = sortBy || undefined;
    const nextSortOrder = sortOrder || undefined;

    if (
      currentPage === page &&
      currentPageSize === pageSize &&
      currentSortBy === nextSortBy &&
      currentSortOrder === nextSortOrder
    ) {
      return;
    }

    next.set("page", String(page));
    next.set("pageSize", String(pageSize));

    if (nextSortBy) {
      next.set("sortBy", nextSortBy);
    } else {
      next.delete("sortBy");
    }

    if (nextSortOrder) {
      next.set("sortOrder", nextSortOrder);
    } else {
      next.delete("sortOrder");
    }

    setSearchParams(next, { replace: true });
  }, [initialPageSize, page, pageSize, searchParams, serverPagination, setSearchParams, sortBy, sortOrder]);

  useEffect(() => {
    if (!tabs || tabs.length === 0) {
      return;
    }

    const hasActiveTab = tabs.some((tab) => tab.id === activeTab);
    if (hasActiveTab) {
      return;
    }

    const fallbackTabId =
      defaultTabId && tabs.some((tab) => tab.id === defaultTabId) ? defaultTabId : tabs[0].id;
    setActiveTab(fallbackTabId);
  }, [activeTab, defaultTabId, tabs]);

  useEffect(() => {
    if (!didMountTabReset.current) {
      didMountTabReset.current = true;
      return;
    }

    setPage(1);
    setSortBy(undefined);
    setSortOrder(undefined);
  }, [activeTab]);

  const actualActiveTab =
    tabs && tabs.length > 0 ? tabs.find((tab) => tab.id === activeTab)?.id || tabs[0]?.id || "" : activeTab;

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const handleSortChange = (columnKey: string) => {
    if (sortBy !== columnKey) {
      setSortBy(columnKey);
      setSortOrder("desc");
      setPage(1);
      return;
    }

    if (sortOrder === "desc") {
      setSortOrder("asc");
      setPage(1);
      return;
    }

    setSortBy(undefined);
    setSortOrder(undefined);
    setPage(1);
  };

  return {
    activeTab: actualActiveTab,
    handleSortChange,
    handleTabChange,
    page,
    pageSize,
    setPage,
    sortBy,
    sortOrder,
  };
}
