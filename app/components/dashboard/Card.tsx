import type { ReactNode } from 'react'
import BasePanel from "~/components/dashboard/BasePanel";

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
        <BasePanel className={`${paddingClasses[padding]} ${className}`}>
            {children}
        </BasePanel>
    )
}

export { Card }
