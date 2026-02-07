import type { ReactNode } from 'react'

interface CardProps {
    children: ReactNode
    className?: string
    padding?: 'sm' | 'md' | 'lg'
}

export default function Card({ children, className = '', padding = 'md' }: CardProps) {
    const paddingClasses = {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6'
    }

    return (
        <div className={`bg-white rounded-3xl ${paddingClasses[padding]} ${className}`}>
            {children}
        </div>
    )
}

export { Card }
