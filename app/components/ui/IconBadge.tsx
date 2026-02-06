import { ReactNode } from 'react'

interface IconBadgeProps {
    children: ReactNode
    className?: string
    size?: 'sm' | 'md'
}

export default function IconBadge({ children, className = '', size = 'md' }: IconBadgeProps) {
    const sizeClasses = {
        sm: 'p-1.5',
        md: 'p-2'
    }

    return (
        <div className={`bg-gray-200 rounded-lg border border-gray-200 ${sizeClasses[size]} ${className}`}>
            {children}
        </div>
    )
}
