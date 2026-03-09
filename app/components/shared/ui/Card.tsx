import type { ReactNode } from 'react'
import BasePanel from '~/components/shared/ui/BasePanel';

interface CardProps {
    children: ReactNode
    className?: string
    padding?: 'sm' | 'md' | 'lg'
}

export default function Card({ children, className = '', padding = 'md' }: CardProps) {
    const paddingClasses = {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-4'
    }

    return (
        <BasePanel className={`${paddingClasses[padding]} ${className}`}>
            {children}
        </BasePanel>
    )
}

export { Card }
