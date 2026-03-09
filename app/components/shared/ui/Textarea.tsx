import { textareaBaseStyles } from '~/lib/styles/input'
import FormFeedbackMessage from '~/components/shared/FormFeedbackMessage'

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
    label?: string
    error?: string
    hint?: string
    isEdit?: boolean
    onChange?: (value: string) => void
    onValueChange?: (value: string) => void
    fieldClassName?: string
    containerClassName?: string
}

export function Textarea({
    label,
    onChange,
    onValueChange,
    error,
    hint,
    required = false,
    disabled = false,
    isEdit = true,
    rows = 4,
    className = '',
    id,
    name,
    fieldClassName = '',
    containerClassName = '',
    ...props
}: TextareaProps) {
    const isFieldDisabled = disabled || !isEdit
    const normalizedLabel = typeof label === 'string' ? label.trim() : label
    const labelHasAsterisk = typeof normalizedLabel === 'string' && normalizedLabel.endsWith('*')
    const labelText = typeof normalizedLabel === 'string' && labelHasAsterisk
        ? normalizedLabel.slice(0, -1).trimEnd()
        : normalizedLabel

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(e.target.value)
        onValueChange?.(e.target.value)
        props.onInput?.(e)
    }

    return (
        <div className={className}>
            {label && (
                <label htmlFor={id || name} className="block text-xs text-gray-600 mb-1 ml-1">
                    {labelText} {(required || labelHasAsterisk) && <span className="text-red-400 ml-0.5">*</span>}
                </label>
            )}
            <textarea
                id={id || name}
                name={name}
                onChange={handleChange}
                disabled={isFieldDisabled}
                rows={rows}
                readOnly={props.readOnly}
                className={`${textareaBaseStyles} ${error ? 'border-red-200 ring-1 ring-red-500/20 bg-red-50/10' : ''} ${props.readOnly ? 'bg-gray-50/20' : ''} ${fieldClassName}`.trim()}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                        e.stopPropagation()
                    }
                    if (props.onKeyDown) props.onKeyDown(e)
                }}
                {...props}
            />
            <FormFeedbackMessage message={hint} tone="hint" className={`mt-1 ml-1 text-xs ${containerClassName}`.trim()} />
            {error && (
                <div className="flex items-center gap-1.5 mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="w-1 h-1 rounded-full bg-red-500" />
                    <p className="text-[11px] font-bold text-red-600 uppercase tracking-tight">{error}</p>
                </div>
            )}
        </div>
    )
}
