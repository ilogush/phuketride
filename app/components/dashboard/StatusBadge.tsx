import type { ReactNode } from 'react'

interface StatusBadgeProps {
    children: ReactNode
    variant?: 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'overdue' | 'pending' | 'active' | 'closed' | 'confirmed' | 'cancelled' | 'converted' | 'draft'
    className?: string
}

export default function StatusBadge({ children, variant = 'neutral', className = '' }: StatusBadgeProps) {
    const variantClasses = {
        success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
        error: 'bg-rose-50 text-rose-700 border border-rose-100',
        warning: 'bg-amber-50 text-amber-700 border border-amber-100',
        info: 'bg-sky-50 text-sky-700 border border-sky-100',
        neutral: 'bg-slate-50 text-slate-500 border border-slate-100',
        overdue: 'bg-pink-50 text-pink-700 border border-pink-100',
        pending: 'bg-amber-50 text-amber-700 border border-amber-100',
        active: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
        closed: 'bg-slate-100 text-slate-600 border border-slate-200',
        confirmed: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
        cancelled: 'bg-rose-50 text-rose-700 border border-rose-100',
        converted: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
        draft: 'bg-slate-50 text-slate-500 border border-slate-100',
    }

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium shadow-sm ${variantClasses[variant]} ${className}`}>
            {children}
        </span>
    )
}
