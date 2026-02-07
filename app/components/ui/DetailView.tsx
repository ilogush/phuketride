import { ReactNode } from 'react'

interface DetailViewProps {
    children: ReactNode
    className?: string
}

export default function DetailView({ children, className = '' }: DetailViewProps) {
    return (
        <div className={`space-y-4 ${className}`}>
            {children}
        </div>
    )
}

