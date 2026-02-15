import {
    ChevronDoubleLeftIcon,
    ChevronDoubleRightIcon,
    ChevronLeftIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline'
import { useSearchParams } from 'react-router'
import Button from './Button'
import type { PaginationMetadata } from '~/types/pagination'

interface PaginationProps {
    pagination: PaginationMetadata
    pageSizeOptions?: number[]
    disabled?: boolean
}

export function Pagination({
    pagination,
    pageSizeOptions = [10, 25, 50, 100],
    disabled = false
}: PaginationProps) {
    const { currentPage, totalPages, pageSize, totalItems, hasNext, hasPrevious } = pagination
    const [searchParams, setSearchParams] = useSearchParams()

    const handlePageChange = (page: number) => {
        if (!disabled) {
            const newParams = new URLSearchParams(searchParams)
            newParams.set('page', page.toString())
            setSearchParams(newParams)
        }
    }

    const handleFirstPage = () => {
        if (hasPrevious && !disabled) {
            handlePageChange(1)
        }
    }

    const handlePreviousPage = () => {
        if (hasPrevious && !disabled) {
            handlePageChange(currentPage - 1)
        }
    }

    const handleNextPage = () => {
        if (hasNext && !disabled) {
            handlePageChange(currentPage + 1)
        }
    }

    const handleLastPage = () => {
        if (hasNext && !disabled) {
            handlePageChange(totalPages)
        }
    }

    const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newPageSize = parseInt(event.target.value, 10)
        if (!disabled) {
            const newParams = new URLSearchParams(searchParams)
            newParams.set('pageSize', newPageSize.toString())
            newParams.set('page', '1')
            setSearchParams(newParams)
        }
    }

    return (
        <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-2">
                <label htmlFor="page-size" className="text-sm text-gray-500">
                    Items per page:
                </label>
                <select
                    id="page-size"
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    disabled={disabled}
                    className="rounded-3xl border border-gray-300 px-3 py-1.5 text-sm text-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {pageSizeOptions.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages} ({totalItems} total items)
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        onClick={handleFirstPage}
                        disabled={!hasPrevious || disabled}
                        variant="secondary"
                        size="sm"
                        title="First page"
                        icon={<ChevronDoubleLeftIcon className="w-4 h-4" />}
                    />
                    <Button
                        onClick={handlePreviousPage}
                        disabled={!hasPrevious || disabled}
                        variant="secondary"
                        size="sm"
                        title="Previous page"
                        icon={<ChevronLeftIcon className="w-4 h-4" />}
                    />
                    <Button
                        onClick={handleNextPage}
                        disabled={!hasNext || disabled}
                        variant="secondary"
                        size="sm"
                        title="Next page"
                        icon={<ChevronRightIcon className="w-4 h-4" />}
                    />
                    <Button
                        onClick={handleLastPage}
                        disabled={!hasNext || disabled}
                        variant="secondary"
                        size="sm"
                        title="Last page"
                        icon={<ChevronDoubleRightIcon className="w-4 h-4" />}
                    />
                </div>
            </div>
        </div>
    )
}
