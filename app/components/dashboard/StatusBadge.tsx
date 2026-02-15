import type { ReactNode } from 'react'

interface StatusBadgeProps {
    children: ReactNode
    variant?: 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'overdue'
    className?: string
}

export default function StatusBadge({ children, variant = 'neutral', className = '' }: StatusBadgeProps) {
    const variantClasses = {
        success: 'bg-green-50 text-green-700 border border-green-100',
        error: 'bg-gray-300 text-gray-800 border border-gray-100',
        warning: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
        info: 'bg-blue-50 text-blue-700 border border-blue-100',
        neutral: 'bg-gray-50 text-gray-500',
        overdue: 'bg-pink-50 text-pink-700 border border-pink-100'
    }

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium shadow-sm ${variantClasses[variant]} ${className}`}>
            {children}
        </span>
    )
}
