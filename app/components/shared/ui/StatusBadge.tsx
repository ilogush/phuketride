import type { ReactNode } from 'react'

interface StatusBadgeProps {
    children: ReactNode
    variant?: 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'overdue' | 'pending' | 'active' | 'closed' | 'confirmed' | 'cancelled' | 'converted' | 'draft'
    className?: string
}

export default function StatusBadge({ children, variant = 'neutral', className = '' }: StatusBadgeProps) {
    const variantClasses = {
        success: 'bg-emerald-50 text-emerald-700 border-emerald-100/50',
        error: 'bg-rose-50 text-rose-700 border-rose-100/50',
        warning: 'bg-amber-50 text-amber-700 border-amber-100/50',
        info: 'bg-sky-50 text-sky-700 border-sky-100/50',
        neutral: 'bg-gray-50 text-gray-500 border-gray-100/50',
        overdue: 'bg-pink-50 text-pink-700 border-pink-100/50',
        pending: 'bg-amber-50 text-amber-700 border-amber-100/50',
        active: 'bg-emerald-50 text-emerald-700 border-emerald-100/50',
        closed: 'bg-gray-100 text-gray-600 border-gray-200/50',
        confirmed: 'bg-indigo-50 text-indigo-700 border-indigo-100/50',
        cancelled: 'bg-rose-50 text-rose-700 border-rose-100/50',
        converted: 'bg-emerald-50 text-emerald-700 border-emerald-100/50',
        draft: 'bg-gray-50 text-gray-500 border-gray-100/50',
    }

    const hasIndicator = ['success', 'active', 'confirmed', 'converted'].includes(variant)

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all duration-200 select-none ${variantClasses[variant]} ${className}`}>
            {hasIndicator && (
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 animate-pulse" />
            )}
            {children}
        </span>
    )
}
