import { textareaBaseStyles } from '~/lib/styles/input'
import FormFeedbackMessage from '~/components/shared/FormFeedbackMessage'

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
    label?: string
    error?: string
    isEdit?: boolean
    onChange?: (value: string) => void
}

export function Textarea({
    label,
    onChange,
    error,
    required = false,
    disabled = false,
    isEdit = true,
    rows = 4,
    className = '',
    id,
    name,
    ...props
}: TextareaProps) {
    const isFieldDisabled = disabled || !isEdit

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(e.target.value)
    }

    return (
        <div className={className}>
            {label && (
                <label htmlFor={id || name} className="block text-xs text-gray-600 mb-1">
                    {label} {required && <span className="text-gray-500">*</span>}
                </label>
            )}
            <textarea
                id={id || name}
                name={name}
                onChange={handleChange}
                disabled={isFieldDisabled}
                rows={rows}
                className={`${textareaBaseStyles} ${error ? 'border-gray-600' : ''}`}
                {...props}
            />
            <FormFeedbackMessage message={error} tone="error" className="mt-1 text-sm" />
        </div>
    )
}
