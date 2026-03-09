import type { ReactNode } from 'react'
import { Link } from 'react-router'
import Button from '~/components/shared/ui/Button'

interface PageHeaderProps {
    title?: ReactNode
    subtitle?: ReactNode
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
    subtitle,
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
                    <Button variant="solid" icon={actionIcon} loading={loading}>
                        {actionLabel}
                    </Button>
                </Link>
            )
        } else if (actionType === 'submit' || actionType === 'button') {
            finalActions = (
                <Button
                    variant="solid"
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
            <div className={`flex items-center ${hasRightActions ? 'justify-between' : 'justify-start'} gap-2 sm:gap-4`}>
                <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                    {leftActions}
                    {title && (
                        <div className="min-w-0">
                            <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight animate-in fade-in slide-in-from-left-4 duration-500 truncate">
                                {title}
                            </h1>
                            {subtitle && (
                                <div className="text-xs sm:text-sm text-gray-500 truncate">
                                    {subtitle}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 animate-in fade-in slide-in-from-right-4 duration-500">
                    {withSearch && onSearchChange && (
                        <div className="relative group hidden sm:block h-11">
                            <input
                                type="text"
                                value={searchValue || ''}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder={searchPlaceholder || 'Search assets...'}
                                className="h-full py-2.5 pl-4 pr-10 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 focus:bg-white bg-gray-50/50 transition-all duration-200 text-sm w-48 lg:w-64 placeholder:text-gray-400 font-medium"
                            />
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
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
