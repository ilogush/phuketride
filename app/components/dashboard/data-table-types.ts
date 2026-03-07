import type { ReactNode } from "react";
import type { ButtonVariant } from "./Button";

export interface Column<T> {
  key: string;
  label: ReactNode;
  sortable?: boolean;
  render?: (item: T, index: number, page: number, pageSize: number) => ReactNode;
  wrap?: boolean;
  className?: string;
}

export interface Tab<T = Record<string, unknown>> {
  id: string;
  label: string;
  fetchData: (params: {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, unknown>;
  }) => Promise<{ data: T[]; totalCount: number }>;
  columns: Column<T>[];
}

export interface DataTableProps<T> {
  columns?: Column<T>[];
  fetchData?: (params: {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, unknown>;
  }) => Promise<{ data: T[]; totalCount: number }>;
  tabs?: Tab<T>[];
  defaultTabId?: string;
  onTabChange?: (tabId: string) => void;
  pagination?: boolean;
  initialPageSize?: number;
  data?: T[];
  totalCount?: number;
  isLoading?: boolean;
  getRowClassName?: (item: T, index: number) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  emptyAction?: {
    label: string;
    onClick: () => void;
    variant?: ButtonVariant;
  };
  searchQuery?: string;
  serverPagination?: boolean;
  caption?: string;
  ariaLabel?: string;
}
