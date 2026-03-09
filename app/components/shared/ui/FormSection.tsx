import type { ReactNode } from 'react'
import AdminCard from '~/components/shared/ui/AdminCard';

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
        '6': 'gap-4'
    }[gap]

    const contentClasses = grid 
        ? `${gridClasses} ${gapClasses}` 
        : 'space-y-4'

    return (
        <AdminCard
            title={title}
            icon={icon}
            headerActions={headerActions}
            className={className}
            contentClassName={contentClasses}
        >
            {children}
        </AdminCard>
    )
}
