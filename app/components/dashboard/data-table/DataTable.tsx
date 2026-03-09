import type { ReactNode } from "react";
import type { DataTableProps } from "./data-table-types";
import EmptyState from '~/components/shared/ui/EmptyState'
import Loader from '~/components/shared/ui/Loader'
import Tabs from '~/components/shared/ui/Tabs'
import SimplePagination from '~/components/shared/ui/SimplePagination'
import { formatCellValue, getPropertyValue, toReactNode } from "./data-table-utils";
import { useDataTableControls } from '~/hooks/useDataTableControls';
import { useDataTableData } from '~/hooks/useDataTableData';

export type { Column, Tab } from "./data-table-types";

function formatHeaderLabel(label: ReactNode) {
    if (typeof label !== "string") {
        return label
    }

    if (label.length === 0) {
        return label
    }

    return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()
}

export default function DataTable<T>({
    columns,
    fetchData,
    tabs,
    defaultTabId,
    onTabChange,
    pagination,
    initialPageSize = 20,
    data: providedData,
    totalCount: providedTotalCount,
    isLoading: providedIsLoading,
    getRowClassName,
    emptyTitle,
    emptyDescription,
    emptyIcon,
    emptyAction,
    searchQuery = '',
    serverPagination = false,
    onRowClick,
    caption,
    ariaLabel
}: DataTableProps<T>) {
    if (!tabs && (!columns || (!fetchData && !providedData))) {
        throw new Error('Either tabs or both columns and fetchData must be provided')
    }

    const { activeTab, handleSortChange, handleTabChange, page, pageSize, setPage, sortBy, sortOrder } =
        useDataTableControls({
            defaultTabId,
            initialPageSize,
            onTabChange,
            serverPagination,
            tabs,
        })

    const currentColumns = tabs ? tabs.find(t => t.id === activeTab)?.columns || [] : (columns || [])
    const currentFetchData = tabs ? tabs.find(t => t.id === activeTab)?.fetchData : fetchData
    const paginationEnabled = pagination ?? true

    const { currentData, error, filteredData, isLoading, totalCount } = useDataTableData({
        activeTab,
        currentFetchData,
        paginationEnabled,
        page,
        pageSize,
        providedData,
        providedIsLoading,
        providedTotalCount,
        searchQuery,
        serverPagination,
        sortBy,
        sortOrder,
    })

    return (
        <div className="overflow-hidden">
            {tabs && tabs.length > 0 && (
                <Tabs
                    tabs={tabs.map(t => ({ id: t.id, label: t.label }))}
                    activeTab={activeTab}
                    onTabChange={(id) => handleTabChange(id as string)}
                />
            )}

            <div className="border border-gray-100 rounded-xl overflow-hidden bg-white ring-1 ring-black/5">
                <div className="overflow-x-auto sm:mx-0">
                    <table className="min-w-full divide-y divide-gray-100 bg-transparent" aria-label={ariaLabel}>
                        {caption && <caption className="sr-only">{caption}</caption>}
                        <thead>
                            <tr className="bg-gray-50/50">
                                {currentColumns.map((col, idx) => {
                                    const isSorted = sortBy === col.key
                                    const ariaSort = !col.sortable
                                        ? undefined
                                        : isSorted
                                            ? (sortOrder === 'asc' ? 'ascending' : 'descending')
                                            : 'none'
                                    return (
                                        <th
                                            key={col.key}
                                            scope="col"
                                            aria-sort={ariaSort}
                                            className={`${idx === 0 ? 'px-4' : 'px-4'} py-4 text-left text-xs font-bold text-gray-400 tracking-wide ${idx > 2 ? 'hidden sm:table-cell' : ''} ${col.className || ''}`}
                                        >
                                            {col.sortable ? (
                                                <button
                                                    type="button"
                                                    className="cursor-pointer select-none inline-flex items-center gap-1 group/sort"
                                                    onClick={() => handleSortChange(col.key)}
                                                >
                                                    {formatHeaderLabel(col.label)}
                                                    <span className={`transition-opacity duration-200 ${isSorted ? 'opacity-100' : 'opacity-0 group-hover/sort:opacity-100'}`} aria-hidden>
                                                        {isSorted 
                                                          ? (sortOrder === 'asc' ? '▲' : '▼') 
                                                          : '↕'}
                                                    </span>
                                                </button>
                                            ) : (
                                                <span>{formatHeaderLabel(col.label)}</span>
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading && filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={currentColumns.length} className="px-4 py-12 text-center text-sm text-gray-500">
                                        <div className="flex justify-center items-center">
                                            <Loader />
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={currentColumns.length} className="px-4 py-12 text-center text-sm text-gray-600">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <span className="font-bold text-red-500 uppercase tracking-tight">Load Error</span>
                                            <span className="text-gray-500">{error?.message}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentData.length === 0 ? (
                                <tr>
                                    <td colSpan={currentColumns.length} className="px-4 py-12 text-center text-sm text-gray-500">
                                        <EmptyState
                                            title={emptyTitle || 'No data found'}
                                            description={emptyDescription}
                                            icon={emptyIcon}
                                            action={emptyAction}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                currentData.map((item, idx) => (
                                    <tr
                                        key={String(getPropertyValue(item, 'id') ?? idx)}
                                        className={`group hover:bg-gray-50/50 transition-all duration-200 ${isLoading ? 'opacity-50' : ''} ${onRowClick ? 'cursor-pointer' : ''} ${getRowClassName ? getRowClassName(item, idx) : ''}`}
                                        onClick={() => onRowClick?.(item, idx)}
                                    >
                                        {currentColumns.map((col, cIdx) => {
                                            const cellValue = col.render
                                                ? col.render(item, idx, page, pageSize)
                                                : getPropertyValue(item, col.key);

                                            const formattedValue = col.render ? cellValue : formatCellValue(col.key, cellValue)

                                            return (
                                                <td
                                                    key={col.key}
                                                    className={`${cIdx === 0 ? 'px-4' : 'px-4'} py-4 text-sm font-medium text-gray-700 ${col.wrap ? 'whitespace-normal align-middle' : 'whitespace-nowrap align-middle'} ${cIdx > 2 ? 'hidden sm:table-cell' : ''} ${col.className || ''}`}
                                                >
                                                    {toReactNode(formattedValue)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {paginationEnabled && (
                    <SimplePagination
                    currentPage={page}
                    totalPages={Math.max(1, Math.ceil(totalCount / pageSize))}
                    onPageChange={setPage}
                />
            )}
        </div>
    )
}
