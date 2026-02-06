import { ReactNode } from 'react'

interface SectionProps {
    title?: string
    description?: string
    children: ReactNode
    className?: string
    headerAction?: ReactNode
    size?: 'sm' | 'md' | 'lg'
}

export default function Section({
    title,
    description,
    children,
    className = '',
    headerAction,
    size = 'lg'
}: SectionProps) {
    const titleSizeClasses = {
        sm: 'text-sm font-semibold text-gray-900',
        md: 'text-base font-semibold text-gray-900',
        lg: 'text-lg font-medium text-gray-900'
    }

    const marginClasses = {
        sm: 'mb-2',
        md: 'mb-3',
        lg: 'mb-4'
    }

    return (
        <div className={className}>
            {(title || description || headerAction) && (
                <div className={`flex items-center justify-between ${marginClasses[size]}`}>
                    <div>
                        {title && (
                            <h3 className={titleSizeClasses[size]}>{title}</h3>
                        )}
                        {description && (
                            <p className="mt-1 text-sm text-gray-500">{description}</p>
                        )}
                    </div>
                    {headerAction && (
                        <div>{headerAction}</div>
                    )}
                </div>
            )}
            {children}
        </div>
    )
}
