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
        <div className={`bg-white rounded-3xl shadow-sm p-4 ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    {icon && <div className="w-5 h-5 text-gray-600">{icon}</div>}
                    <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                </div>
                {headerActions && <div>{headerActions}</div>}
            </div>
            {children}
        </div>
    )
}
