import { textareaBaseStyles } from '~/lib/styles/input'

interface TextareaProps {
    label?: string
    placeholder?: string
    value?: string
    onChange?: (value: string) => void
    error?: string
    required?: boolean
    disabled?: boolean
    rows?: number
    className?: string
    id?: string
    name?: string
}

export function Textarea({
    label,
    placeholder,
    value,
    onChange,
    error,
    required = false,
    disabled = false,
    rows = 4,
    className = '',
    id,
    name
}: TextareaProps) {
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (onChange) {
            onChange(e.target.value)
        }
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
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                disabled={disabled}
                rows={rows}
                className={`${textareaBaseStyles} ${error ? 'border-gray-600' : ''}`}
            />
            {error && (
                <p className="mt-1 text-sm text-gray-700">{error}</p>
            )}
        </div>
    )
}
