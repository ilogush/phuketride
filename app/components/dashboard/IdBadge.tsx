import type { ReactNode } from 'react'

interface IdBadgeProps {
    children: ReactNode
    className?: string
}

export default function IdBadge({ children, className = '' }: IdBadgeProps) {
    return (
        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-gray-800 text-white min-w-[2.25rem] h-5 leading-none ${className}`}>
            {children}
        </span>
    )
}
