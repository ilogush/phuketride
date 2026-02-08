import type { ReactNode } from 'react'
import { Link } from 'react-router'
import Button from './Button'

interface PageHeaderProps {
    title?: ReactNode
    leftActions?: ReactNode
    rightActions?: ReactNode
    actions?: ReactNode
    children?: ReactNode
    withSearch?: boolean
    searchValue?: string
    onSearchChange?: (value: string) => void
    searchPlaceholder?: string
    actionLabel?: string
    actionIcon?: ReactNode
    actionType?: 'button' | 'link' | 'submit'
    href?: string
    onAction?: () => void
    loading?: boolean
    disabled?: boolean
}

export default function PageHeader({
    title,
    leftActions,
    rightActions,
    actions,
    children,
    withSearch,
    searchValue,
    onSearchChange,
    searchPlaceholder,
    actionLabel,
    actionIcon,
    actionType,
    href,
    onAction,
    loading,
    disabled
}: PageHeaderProps) {
    let finalActions = rightActions || actions

    if (!finalActions && actionLabel) {
        if (actionType === 'link' && href) {
            finalActions = (
                <Link to={href}>
                    <Button variant="primary" icon={actionIcon} loading={loading}>
                        {actionLabel}
                    </Button>
                </Link>
            )
        } else if (actionType === 'submit' || actionType === 'button') {
            finalActions = (
                <Button
                    variant="primary"
                    icon={actionIcon}
                    onClick={onAction}
                    type={actionType}
                    loading={loading}
                    disabled={disabled}
                >
                    {actionLabel}
                </Button>
            )
        }
    }

    const hasRightActions = !!finalActions || withSearch || !!children

    return (
        <div>
            <div className={`flex flex-col sm:flex-row items-start sm:items-center ${hasRightActions ? 'justify-between' : 'justify-start'} gap-3 sm:gap-6`}>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    {leftActions}
                    {title && (
                        <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight animate-in fade-in slide-in-from-left-4 duration-500">
                            {title}
                        </h1>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto animate-in fade-in slide-in-from-right-4 duration-500">
                    {withSearch && onSearchChange && (
                        <input
                            type="text"
                            value={searchValue || ''}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder={searchPlaceholder || 'Search...'}
                            className="flex-1 sm:flex-none py-2 sm:py-4 px-3 sm:px-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent text-sm"
                        />
                    )}
                    {finalActions && (
                        <div className="flex items-center gap-2 sm:gap-3">
                            {finalActions}
                        </div>
                    )}
                    {children}
                </div>
            </div>
        </div>
    )
}
