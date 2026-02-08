import { ReactNode } from 'react'

interface SectionHeaderProps {
    children: ReactNode
    size?: 'sm' | 'md' | 'lg'
    className?: string
    rightAction?: ReactNode
}

export default function SectionHeader({
    children,
    size = 'lg',
    className = '',
    rightAction
}: SectionHeaderProps) {
    const sizeClasses = {
        sm: 'text-sm font-semibold text-gray-900',
        md: 'text-base font-semibold text-gray-900',
        lg: 'text-base font-semibold text-gray-900'
    }

    const marginClasses = {
        sm: 'mb-2',
        md: 'mb-3',
        lg: 'mb-3'
    }

    if (rightAction) {
        return (
            <div className={`flex items-center justify-between ${className}`}>
                <h3 className={`${sizeClasses[size]} ${marginClasses[size]}`}>
                    {children}
                </h3>
                {rightAction}
            </div>
        )
    }

    return (
        <h3 className={`${sizeClasses[size]} ${marginClasses[size]} ${className}`}>
            {children}
        </h3>
    )
}
