import { ReactNode } from 'react'

interface IdBadgeProps {
    children: ReactNode
    className?: string
}

export default function IdBadge({ children, className = '' }: IdBadgeProps) {
    return (
        <span className={`font-mono text-xs bg-gray-800 text-white px-2 py-1 rounded-full ${className}`}>
            {children}
        </span>
    )
}
