import type { ReactNode } from 'react'

interface FormSectionProps {
    title: string
    icon?: ReactNode
    children: ReactNode
    className?: string
    headerActions?: ReactNode
    grid?: 'cols-1' | 'cols-2' | 'cols-3' | 'cols-4' | false
    gap?: '2' | '3' | '4' | '6'
}

export default function FormSection({ 
    title, 
    icon, 
    children, 
    className = '', 
    headerActions,
    grid = false,
    gap = '4'
}: FormSectionProps) {
    const gridClasses = grid ? {
        'cols-1': 'grid grid-cols-1',
        'cols-2': 'grid grid-cols-2',
        'cols-3': 'grid grid-cols-3',
        'cols-4': 'grid grid-cols-4'
    }[grid] : ''

    const gapClasses = {
        '2': 'gap-2',
        '3': 'gap-3',
        '4': 'gap-4',
        '6': 'gap-6'
    }[gap]

    const contentClasses = grid 
        ? `${gridClasses} ${gapClasses}` 
        : 'space-y-4'

    return (
        <div className={`bg-white rounded-3xl shadow-sm p-4 ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    {icon && <div className="w-5 h-5 text-gray-600">{icon}</div>}
                    <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                </div>
                {headerActions && <div>{headerActions}</div>}
            </div>
            <div className={contentClasses}>
                {children}
            </div>
        </div>
    )
}
