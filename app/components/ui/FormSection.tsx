import { ReactNode } from 'react'

interface FormSectionProps {
    title: string
    icon?: ReactNode
    children: ReactNode
    className?: string
    headerActions?: ReactNode
}

export default function FormSection({ title, icon, children, className = '', headerActions }: FormSectionProps) {
    return (
        <div className={`bg-white rounded-3xl border border-gray-200 p-4 space-y-4 ${className}`}>
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    {icon && <div className="w-6 h-6">{icon}</div>}
                    {title}
                </h2>
                {headerActions && <div>{headerActions}</div>}
            </div>
            {children}
        </div>
    )
}
