import { ReactNode } from 'react'

interface DetailFieldProps {
    label: string
    value: ReactNode
    className?: string
}

export default function DetailField({ label, value, className = '' }: DetailFieldProps) {
    return (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-500">{label}</label>
            <p className="mt-1 text-sm text-gray-900">{value}</p>
        </div>
    )
}
