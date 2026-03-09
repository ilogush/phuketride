import type { ReactNode } from 'react'
import FormFeedbackMessage from '~/components/shared/FormFeedbackMessage'

interface FormFieldProps {
    label: string
    required?: boolean
    error?: string
    hint?: string
    children: ReactNode
    className?: string
}

export default function FormField({
    label,
    required = false,
    error,
    hint,
    children,
    className = '',
}: FormFieldProps) {
    const normalizedLabel = label.trim()
    const labelHasAsterisk = normalizedLabel.endsWith('*')
    const labelText = labelHasAsterisk ? normalizedLabel.slice(0, -1).trimEnd() : normalizedLabel

    return (
        <div className={className}>
            <label className="block text-xs text-gray-600 mb-1">
                {labelText} {(required || labelHasAsterisk) && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            {children}
            <FormFeedbackMessage message={hint} tone="hint" className="mt-1 text-xs" />
            <FormFeedbackMessage message={error} tone="error" className="mt-1 text-sm" />
        </div>
    )
}
