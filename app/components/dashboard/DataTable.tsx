import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router'
import EmptyState from './EmptyState'
import Loader from './Loader'
import Tabs from './Tabs'
import { Pagination } from './Pagination'

export interface Column<T> {
    key: string
    label: string
    sortable?: boolean
    render?: (item: T, index: number, page: number, pageSize: number) => React.ReactNode
    wrap?: boolean
    className?: string
}

export interface Tab<T = Record<string, unknown>> {
    id: string
    label: string
    fetchData: (params: {
        page: number
        pageSize: number
        sortBy?: string
        sortOrder?: 'asc' | 'desc'
        filters?: Record<string, any>
    }) => Promise<{ data: T[]; totalCount: number }>
    columns: Column<T>[]
}

interface DataTableProps<T> {
    columns?: Column<T>[]
    fetchData?: (params: {
        page: number
        pageSize: number
        sortBy?: string
        sortOrder?: 'asc' | 'desc'
        filters?: Record<string, any>
    }) => Promise<{ data: T[]; totalCount: number }>
    tabs?: Tab<T>[]
    defaultTabId?: string
    onTabChange?: (tabId: string) => void
    disablePagination?: boolean
    initialPageSize?: number
    data?: T[]
    totalCount?: number
    isLoading?: boolean
    getRowClassName?: (item: T, index: number) => string
    emptyTitle?: string
    emptyDescription?: string
    emptyIcon?: React.ReactNode
    emptyAction?: {
        label: string
        onClick: () => void
        variant?: 'primary' | 'secondary'
    }
    searchQuery?: string
}

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
    searchQuery = ''
}: DataTableProps<T>) {
    const [searchParams] = useSearchParams()

    const initialTabId = defaultTabId || (tabs && tabs.length > 0 ? tabs[0].id : '')
    const [activeTab, setActiveTab] = useState<string>(initialTabId)

    const [page, setPage] = useState(() => {
        if (typeof window !== 'undefined') {
            const p = searchParams.get('page')
            return p ? parseInt(p) : 1
        }
        return 1
    })

    const [pageSize, setPageSize] = useState(() => {
        if (typeof window !== 'undefined') {
            const ps = searchParams.get('pageSize')
            return ps ? parseInt(ps) : initialPageSize
        }
        return initialPageSize
    })

    // Sync state with URL params
    useEffect(() => {
        const urlPage = searchParams.get('page')
        const urlPageSize = searchParams.get('pageSize')
        
        if (urlPage) {
            const parsedPage = parseInt(urlPage)
            if (!isNaN(parsedPage) && parsedPage !== page) {
                setPage(parsedPage)
            }
        }
        
        if (urlPageSize) {
            const parsedPageSize = parseInt(urlPageSize)
            if (!isNaN(parsedPageSize) && parsedPageSize !== pageSize) {
                setPageSize(parsedPageSize)
            }
        }
    }, [searchParams])

    const [sortBy, setSortBy] = useState<string | undefined>()
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>()

    const userHasSelectedTab = useRef(false)

    useEffect(() => {
        if (tabs && tabs.length > 0) {
            const foundTab = tabs.find(t => t.id === activeTab)
            if (!foundTab) {
                const targetTabId = defaultTabId && tabs.find(t => t.id === defaultTabId)
                    ? defaultTabId
                    : tabs[0].id
                setActiveTab(targetTabId)
                userHasSelectedTab.current = false
            }
        }
    }, [tabs, activeTab, defaultTabId])

    const actualActiveTab = tabs && tabs.length > 0
        ? (tabs.find(t => t.id === activeTab)?.id || tabs[0]?.id || '')
        : activeTab

    if (!tabs && (!columns || (!fetchData && !providedData))) {
        throw new Error('Either tabs or both columns and fetchData must be provided')
    }

    const currentColumns = tabs ? tabs.find(t => t.id === actualActiveTab)?.columns || [] : (columns || [])
    const currentFetchData = tabs ? tabs.find(t => t.id === actualActiveTab)?.fetchData : fetchData

    const [internalData, setInternalData] = useState<T[]>([])
    const [internalTotalCount, setInternalTotalCount] = useState(0)
    const [internalLoading, setInternalLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        if (!currentFetchData) return

        const loadData = async () => {
            setInternalLoading(true)
            setError(null)
            try {
                const filters = {}
                const result = await currentFetchData({
                    page,
                    pageSize,
                    sortBy,
                    sortOrder,
                    filters
                })
                setInternalData(result.data)
                setInternalTotalCount(result.totalCount)
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to load data'))
            } finally {
                setInternalLoading(false)
            }
        }

        loadData()
    }, [currentFetchData, page, pageSize, sortBy, sortOrder, actualActiveTab])

    const data = (providedData !== undefined) ? providedData : internalData
    const totalCount = providedTotalCount ?? internalTotalCount
    const isLoading = providedIsLoading ?? internalLoading

    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return data

        const query = searchQuery.toLowerCase()
        return data.filter((item: any) => {
            return Object.values(item).some(value => {
                if (value === null || value === undefined) return false

                if (typeof value === 'object') {
                    return Object.values(value).some(nestedValue =>
                        String(nestedValue).toLowerCase().includes(query)
                    )
                }

                return String(value).toLowerCase().includes(query)
            })
        })
    }, [data, searchQuery])

    useEffect(() => {
        const urlTab = searchParams.get('tab')

        if (urlTab !== activeTab) {
            setPage(1)
        }

        setSortBy(undefined)
        setSortOrder(undefined)
    }, [activeTab, searchParams])





    const currentData = useMemo(() => {
        if (currentFetchData) return filteredData
        if (disablePagination) return filteredData

        const start = (page - 1) * pageSize
        return filteredData.slice(start, start + pageSize)
    }, [filteredData, page, pageSize, currentFetchData, disablePagination])

    const actualTotalCount = currentFetchData ? totalCount : filteredData.length

    return (
        <div className="overflow-hidden">
            {tabs && tabs.length > 0 && (
                <Tabs
                    tabs={tabs.map(t => ({ id: t.id, label: t.label }))}
                    activeTab={actualActiveTab}
                    onTabChange={(id) => {
                        setActiveTab(id as string)
                        if (onTabChange) {
                            onTabChange(id as string)
                        }
                    }}
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
                                        >
                                            <span>{col.label}</span>
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
                                        key={(item as any).id || idx}
                                        className={`group hover:bg-white transition-all ${isLoading ? 'opacity-50' : ''} ${getRowClassName ? getRowClassName(item, idx) : ''}`}
                                    >
                                        {currentColumns.map((col, cIdx) => {
                                            const cellValue = col.render
                                                ? col.render(item, idx, page, pageSize)
                                                : (item as any)[col.key];

                                            // Auto-format ID columns
                                            const formattedValue = !col.render && col.key === 'id' && typeof cellValue === 'number'
                                                ? (
                                                    <span className="font-mono text-xs bg-gray-800 text-white px-2 py-1 rounded-full">
                                                        {String(cellValue).padStart(4, '0')}
                                                    </span>
                                                )
                                                : cellValue;

                                            return (
                                                <td
                                                    key={col.key}
                                                    className={`${cIdx === 0 ? 'pl-4' : 'px-4'} py-2 text-sm text-gray-900 ${col.wrap ? 'whitespace-normal align-middle' : 'whitespace-nowrap align-middle'} ${cIdx > 2 ? 'hidden sm:table-cell' : ''} ${col.className || ''}`}
                                                >
                                                    {formattedValue}
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
                <Pagination
                    pagination={{
                        currentPage: page,
                        totalPages: Math.ceil(actualTotalCount / pageSize),
                        pageSize,
                        totalItems: actualTotalCount,
                        hasNext: page < Math.ceil(actualTotalCount / pageSize),
                        hasPrevious: page > 1
                    }}
                />
            )}
        </div>
    )
}
