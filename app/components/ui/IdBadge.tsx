import { ReactNode } from 'react'

interface IdBadgeProps {
    children: ReactNode
    className?: string
}

export default function IdBadge({ children, className = '' }: IdBadgeProps) {
    return (
        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-800 text-white min-w-[2.25rem] h-5 leading-none transition-all hover:bg-gray-900 ${className}`}>
            {children}
        </span>
    )
}
