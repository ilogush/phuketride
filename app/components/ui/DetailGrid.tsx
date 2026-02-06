import { ReactNode } from 'react'

interface DetailGridProps {
    children: ReactNode
    cols?: 1 | 2 | 3 | 4
    className?: string
}

export default function DetailGrid({ children, cols = 2, className = '' }: DetailGridProps) {
    const gridCols = {
        1: 'grid-cols-1',
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4'
    }

    return (
        <div className={`grid ${gridCols[cols]} gap-4 ${className}`}>
            {children}
        </div>
    )
}
