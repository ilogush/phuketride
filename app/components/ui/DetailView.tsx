import { ReactNode } from 'react'
import StatusBadge from './StatusBadge'

interface DetailViewItem {
    label: string
    value: ReactNode
    type?: 'text' | 'badge' | 'date' | 'link'
    href?: string
}

interface DetailViewProps {
    title: string
    subtitle?: string
    data: DetailViewItem[]
    actions?: ReactNode
    className?: string
}

export function DetailView({ title, subtitle, data, actions, className = '' }: DetailViewProps) {
    const renderValue = (item: DetailViewItem) => {
        if (item.type === 'badge') {
            return typeof item.value === 'string' ? (
                <StatusBadge variant="neutral">{item.value}</StatusBadge>
            ) : (
                item.value
            )
        }

        if (item.type === 'date' && typeof item.value === 'string') {
            return new Date(item.value).toLocaleDateString()
        }

        if (item.type === 'link' && item.href) {
            return (
                <a
                    href={item.href}
                    className="text-blue-600 hover:text-blue-800 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {item.value}
                </a>
            )
        }

        return item.value || '-'
    }

    return (
        <div className={`bg-white rounded-3xl border border-gray-200 p-4 ${className}`}>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                    {subtitle && (
                        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                    )}
                </div>
                {actions && (
                    <div className="flex space-x-2">
                        {actions}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.map((item, index) => (
                    <div key={index} className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500">{item.label}</span>
                        <span className="text-sm text-gray-900 mt-1">{renderValue(item)}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
