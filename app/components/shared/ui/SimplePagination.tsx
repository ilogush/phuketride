import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Button from '~/components/shared/ui/Button';

interface SimplePaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function SimplePagination({ currentPage, totalPages, onPageChange }: SimplePaginationProps) {
    const hasPrevious = currentPage > 1;
    const hasNext = currentPage < totalPages;

    return (
        <div className="flex items-center justify-between py-4 px-2">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Page <span className="text-gray-900">{currentPage}</span> of {totalPages}
            </div>

            <div className="flex items-center gap-2">
                <Button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={!hasPrevious}
                    variant="secondary"
                    size="sm"
                    className="ring-1 ring-gray-200 hover:ring-gray-300"
                    iconOnly
                >
                    <ChevronLeftIcon className="w-4 h-4" />
                </Button>
                <Button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={!hasNext}
                    variant="secondary"
                    size="sm"
                    className="ring-1 ring-gray-200 hover:ring-gray-300"
                    iconOnly
                >
                    <ChevronRightIcon className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
