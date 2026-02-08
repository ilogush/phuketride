import { ReactNode } from 'react'

interface FormGridProps {
    children: ReactNode
    cols?: 1 | 2 | 3 | 4
    gap?: 2 | 3 | 4 | 6
    className?: string
}

export default function FormGrid({ 
    children, 
    cols = 4, 
    gap = 4,
    className = '' 
}: FormGridProps) {
    const colsClasses = {
        1: 'grid-cols-1',
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4'
    }

    const gapClasses = {
        2: 'gap-2',
        3: 'gap-3',
        4: 'gap-4',
        6: 'gap-6'
    }

    return (
        <div className={`grid ${colsClasses[cols]} ${gapClasses[gap]} ${className}`}>
            {children}
        </div>
    )
}
