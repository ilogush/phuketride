import { useState, useEffect, useMemo, useRef, isValidElement } from 'react'
import { useSearchParams } from 'react-router'
import EmptyState from './EmptyState'
import Loader from './Loader'
import Tabs from './Tabs'
import SimplePagination from './SimplePagination'
import { formatContactPhone } from '~/lib/phone'

export interface Column<T> {
    key: string
    label: React.ReactNode
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
        filters?: Record<string, unknown>
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
        filters?: Record<string, unknown>
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
    serverPagination?: boolean
}

function getPropertyValue(item: unknown, key: string): unknown {
    if (!item || typeof item !== 'object') return undefined
    return (item as Record<string, unknown>)[key]
}

function includesQuery(value: unknown, query: string): boolean {
    if (value === null || value === undefined) return false
    if (typeof value === 'object') {
        return Object.values(value as Record<string, unknown>).some((nestedValue) => includesQuery(nestedValue, query))
    }
    return String(value).toLowerCase().includes(query)
}

function toReactNode(value: unknown): React.ReactNode {
    if (value === null || value === undefined) return ''
    if (isValidElement(value)) return value
    if (Array.isArray(value)) return value as React.ReactNode
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
    return String(value)
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
    searchQuery = '',
    serverPagination = false
}: DataTableProps<T>) {
    const [searchParams, setSearchParams] = useSearchParams()

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

    useEffect(() => {
        if (!serverPagination) return
        const next = new URLSearchParams(searchParams)
        const currentPage = Number(next.get('page') || 1)
        const currentPageSize = Number(next.get('pageSize') || initialPageSize)
        if (currentPage === page && currentPageSize === pageSize) return
        next.set('page', String(page))
        next.set('pageSize', String(pageSize))
        setSearchParams(next, { replace: true })
    }, [serverPagination, searchParams, setSearchParams, page, pageSize, initialPageSize])

    const [sortBy, setSortBy] = useState<string | undefined>(() => searchParams.get('sortBy') || undefined)
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>(() => {
        const raw = searchParams.get('sortOrder')
        return raw === 'asc' || raw === 'desc' ? raw : undefined
    })

    useEffect(() => {
        if (!serverPagination) return
        const urlSortBy = searchParams.get('sortBy') || undefined
        const urlSortOrderRaw = searchParams.get('sortOrder')
        const urlSortOrder = urlSortOrderRaw === 'asc' || urlSortOrderRaw === 'desc' ? urlSortOrderRaw : undefined
        if (urlSortBy !== sortBy) setSortBy(urlSortBy)
        if (urlSortOrder !== sortOrder) setSortOrder(urlSortOrder)
    }, [serverPagination, searchParams, sortBy, sortOrder])

    useEffect(() => {
        if (!serverPagination) return
        const next = new URLSearchParams(searchParams)
        const currentSortBy = next.get('sortBy') || undefined
        const currentSortOrder = next.get('sortOrder') || undefined
        const nextSortBy = sortBy || undefined
        const nextSortOrder = sortOrder || undefined
        if (currentSortBy === nextSortBy && currentSortOrder === nextSortOrder) return
        if (nextSortBy) next.set('sortBy', nextSortBy)
        else next.delete('sortBy')
        if (nextSortOrder) next.set('sortOrder', nextSortOrder)
        else next.delete('sortOrder')
        setSearchParams(next, { replace: true })
    }, [serverPagination, searchParams, setSearchParams, sortBy, sortOrder])

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
        if (serverPagination) return data
        if (!searchQuery.trim()) return data

        const query = searchQuery.toLowerCase()
        return data.filter((item) => {
            if (!item || typeof item !== 'object') return false
            return Object.values(item as Record<string, unknown>).some((value) => includesQuery(value, query))
        })
    }, [data, searchQuery, serverPagination])

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
        if (serverPagination) return filteredData
        if (disablePagination) return filteredData

        const start = (page - 1) * pageSize
        return filteredData.slice(start, start + pageSize)
    }, [filteredData, page, pageSize, currentFetchData, disablePagination, serverPagination])

    const actualTotalCount = (currentFetchData || serverPagination) ? totalCount : filteredData.length

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
                                            onClick={() => {
                                                if (!col.sortable) return
                                                if (sortBy !== col.key) {
                                                    setSortBy(col.key)
                                                    setSortOrder('desc')
                                                    setPage(1)
                                                    return
                                                }
                                                if (sortOrder === 'desc') {
                                                    setSortOrder('asc')
                                                    setPage(1)
                                                    return
                                                }
                                                setSortBy(undefined)
                                                setSortOrder(undefined)
                                                setPage(1)
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

                                            // Auto-format ID and contact columns
                                            const formattedValue = !col.render && col.key === 'id' && typeof cellValue === 'number'
                                                ? (
                                                    <span className="font-mono text-xs bg-gray-800 text-white px-2 py-1 rounded-full">
                                                        {String(cellValue).padStart(3, '0')}
                                                    </span>
                                                )
                                                : !col.render && (col.key === 'phone' || col.key === 'whatsapp')
                                                    ? formatContactPhone(typeof cellValue === 'string' ? cellValue : null)
                                                    : cellValue;

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
                    totalPages={Math.max(1, Math.ceil(actualTotalCount / pageSize))}
                    onPageChange={setPage}
                />
            )}
        </div>
    )
}
