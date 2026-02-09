import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Button from './Button';

interface SimplePaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function SimplePagination({ currentPage, totalPages, onPageChange }: SimplePaginationProps) {
    const hasPrevious = currentPage > 1;
    const hasNext = currentPage < totalPages;

    return (
        <div className="flex items-center justify-between py-4">
            <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
            </div>

            <div className="flex items-center gap-2">
                <Button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={!hasPrevious}
                    variant="secondary"
                    size="sm"
                >
                    <ChevronLeftIcon className="w-4 h-4 mr-1" />
                    Previous
                </Button>
                <Button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={!hasNext}
                    variant="secondary"
                    size="sm"
                >
                    Next
                    <ChevronRightIcon className="w-4 h-4 ml-1" />
                </Button>
            </div>
        </div>
    );
}
