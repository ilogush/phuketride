import type { ReactNode } from 'react'
import Button from '~/components/shared/ui/Button'
import type { ButtonVariant } from '~/components/shared/ui/Button'

interface EmptyStateProps {
    icon?: ReactNode
    title: string
    description?: string
    action?: {
        label: string
        onClick: () => void
        variant?: ButtonVariant
    }
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-black/5 shadow-sm text-gray-300">
                {icon || (
                   <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                   </svg>
                )}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            {description && (
                <p className="text-sm text-gray-400 max-w-sm mb-8 leading-relaxed">
                    {description}
                </p>
            )}
            {action && (
                <Button variant={action.variant ?? 'solid'} onClick={action.onClick}>
                    {action.label}
                </Button>
            )}
        </div>
    )
}
