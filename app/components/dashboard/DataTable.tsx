import type { DataTableProps } from "./data-table-types";
import EmptyState from './EmptyState'
import Loader from './Loader'
import Tabs from './Tabs'
import SimplePagination from './SimplePagination'
import { formatCellValue, getPropertyValue, toReactNode } from "./data-table-utils";
import { useDataTableControls } from "./useDataTableControls";
import { useDataTableData } from "./useDataTableData";

export type { Column, Tab } from "./data-table-types";

export default function DataTable<T>({
    columns,
    fetchData,
    tabs,
    defaultTabId,
    onTabChange,
    disablePagination = false,
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
    serverPagination = false
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

    const { currentData, error, filteredData, isLoading, totalCount } = useDataTableData({
        activeTab,
        currentFetchData,
        disablePagination,
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

            <div className="border border-gray-200 rounded-3xl overflow-hidden bg-white">
                <div className="overflow-x-auto sm:mx-0">
                    <table className="min-w-full divide-y divide-gray-100 bg-transparent">
                        <thead>
                            <tr className="bg-gray-50/50">
                                {currentColumns.map((col, idx) => {
                                    return (
                                        <th
                                            key={col.key}
                                            scope="col"
                                            className={`${idx === 0 ? 'pl-4' : 'px-4'} py-2 text-left text-xs font-normal text-gray-500 tracking-tight uppercase ${idx > 2 ? 'hidden sm:table-cell' : ''} ${col.className || ''}`}
                                            onClick={() => {
                                                if (!col.sortable) return
                                                handleSortChange(col.key)
                                            }}
                                        >
                                            <span className={col.sortable ? 'cursor-pointer select-none inline-flex items-center gap-1' : ''}>
                                                {col.label}
                                                {col.sortable && sortBy === col.key && (
                                                    <span aria-hidden>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                                                )}
                                            </span>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading && filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={currentColumns.length} className="px-4 py-8 text-center text-sm text-gray-500">
                                        <div className="flex justify-center items-center">
                                            <Loader />
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={currentColumns.length} className="px-4 py-8 text-center text-sm text-gray-600">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <span>Failed to load data: {error?.message}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentData.length === 0 ? (
                                <tr>
                                    <td colSpan={currentColumns.length} className="px-4 py-8 text-center text-sm text-gray-500">
                                        <EmptyState
                                            title={emptyTitle || 'No data'}
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
                                        className={`group hover:bg-white transition-all ${isLoading ? 'opacity-50' : ''} ${getRowClassName ? getRowClassName(item, idx) : ''}`}
                                    >
                                        {currentColumns.map((col, cIdx) => {
                                            const cellValue = col.render
                                                ? col.render(item, idx, page, pageSize)
                                                : getPropertyValue(item, col.key);

                                            const formattedValue = col.render ? cellValue : formatCellValue(col.key, cellValue)

                                            return (
                                                <td
                                                    key={col.key}
                                                    className={`${cIdx === 0 ? 'pl-4' : 'px-4'} py-2 text-sm text-gray-900 ${col.wrap ? 'whitespace-normal align-middle' : 'whitespace-nowrap align-middle'} ${cIdx > 2 ? 'hidden sm:table-cell' : ''} ${col.className || ''}`}
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

            {!disablePagination && (
                    <SimplePagination
                    currentPage={page}
                    totalPages={Math.max(1, Math.ceil(totalCount / pageSize))}
                    onPageChange={setPage}
                />
            )}
        </div>
    )
}
