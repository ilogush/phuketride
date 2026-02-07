import { ReactNode } from 'react'

interface DetailFieldProps {
    label: string
    value?: ReactNode
    className?: string
}

export default function DetailField({ label, value, className = '' }: DetailFieldProps) {
    return (
        <div className={className}>
            <label className="block text-xs text-gray-600 mb-1">{label}</label>
            <p className="text-sm text-gray-900">{value || '-'}</p>
        </div>
    )
}
