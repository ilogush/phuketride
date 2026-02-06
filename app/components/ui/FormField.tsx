import { ReactNode } from 'react'

interface FormFieldProps {
    label: string
    required?: boolean
    error?: string
    children: ReactNode
    className?: string
}

export default function FormField({ label, required = false, error, children, className = '' }: FormFieldProps) {
    return (
        <div className={className}>
            <label className="block text-xs text-gray-600 mb-1">
                {label} {required && <span className="text-gray-500">*</span>}
            </label>
            <div className="mt-1">
                {children}
            </div>
            {error && (
                <p className="mt-1 text-sm text-gray-700">{error}</p>
            )}
        </div>
    )
}
