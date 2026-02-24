import { useState, useEffect } from 'react'
import { validateLatinOnly } from '~/lib/validation'
import Button from '~/components/dashboard/Button'
import Modal from '~/components/dashboard/Modal'
import FormField from '~/components/dashboard/FormField'
import DeleteButton from '~/components/dashboard/DeleteButton'
import Toggle from '~/components/dashboard/Toggle'
import { inputBaseStyles, textareaBaseStyles } from '~/lib/styles/input'

export type FieldType = 'text' | 'number' | 'select' | 'textarea' | 'checkbox' | 'color' | 'toggle'

export interface FieldConfig {
    name: string
    label: string
    type: FieldType
    required?: boolean
    placeholder?: string
    maxLength?: number
    options?: Array<{ id: number | string; name: string }>
    validation?: (value: any, formData: Record<string, any>) => string | null
    disabled?: boolean
    className?: string
    rows?: number
    helpText?: string
    transform?: (value: any) => any
}

interface GenericDictionaryFormProps {
    title: string
    fields: FieldConfig[]
    data?: Record<string, any> | null
    onSubmit: (data: Record<string, any>) => void
    onCancel: () => void
    onDelete?: () => void
    submitLabel?: string
    gridCols?: number
}

export function GenericDictionaryForm({
    title,
    fields,
    data,
    onSubmit,
    onCancel,
    onDelete,
    submitLabel,
    gridCols = 4
}: GenericDictionaryFormProps) {
    const [formData, setFormData] = useState<Record<string, any>>({})
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        const initialData: Record<string, any> = {}
        fields.forEach(field => {
            if (data && data[field.name] !== undefined) {
                initialData[field.name] = data[field.name]
            } else {
                initialData[field.name] = field.type === 'checkbox' || field.type === 'toggle' ? false : ''
            }
        })
        setFormData(initialData)
    }, [data, fields])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target
        const field = fields.find(f => f.name === name)

        let newValue: any = value

        if (type === 'checkbox') {
            newValue = (e.target as HTMLInputElement).checked
        } else if (field?.transform) {
            newValue = field.transform(value)
        }

        setFormData(prev => ({ ...prev, [name]: newValue }))

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }))
        }
    }

    const validate = () => {
        const newErrors: Record<string, string> = {}

        fields.forEach(field => {
            const value = formData[field.name]

            if (field.required && (field.type === 'checkbox' || field.type === 'toggle')) {
                // Skip validation for checkboxes/toggles
            } else if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
                newErrors[field.name] = `${field.label} is required`
                return
            }

            if (field.validation && value) {
                const error = field.validation(value, formData)
                if (error) {
                    newErrors[field.name] = error
                    return
                }
            }

            if (field.type === 'text' && value && typeof value === 'string') {
                const latinError = validateLatinOnly(value, field.label)
                if (latinError) {
                    newErrors[field.name] = latinError
                }
            }
        })

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!validate()) {
            return
        }

        const submitData: Record<string, any> = {}
        fields.forEach(field => {
            const value = formData[field.name]
            submitData[field.name] = typeof value === 'string' ? value.trim() : value
        })

        onSubmit(submitData)
    }

    const renderField = (field: FieldConfig) => {
        const value = formData[field.name] ?? ''
        const error = errors[field.name]
        const inputClass = `${inputBaseStyles} ${error ? 'border-gray-600' : ''}`

        switch (field.type) {
            case 'textarea':
                return (
                    <FormField
                        label={field.label}
                        required={field.required}
                        error={error}
                        className={field.className}
                    >
                        <textarea
                            id={field.name}
                            name={field.name}
                            value={value}
                            onChange={handleChange}
                            rows={field.rows || 3}
                            className={`${textareaBaseStyles} ${error ? 'border-gray-600' : ''}`}
                            placeholder={field.placeholder}
                            disabled={field.disabled}
                        />
                        {field.helpText && (
                            <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
                        )}
                    </FormField>
                )

            case 'select':
                return (
                    <FormField
                        label={field.label}
                        required={field.required}
                        error={error}
                        className={field.className}
                    >
                        <select
                            id={field.name}
                            name={field.name}
                            value={value}
                            onChange={handleChange}
                            className={inputClass}
                            disabled={field.disabled}
                        >
                            <option value="">{field.placeholder || `Select ${field.label}`}</option>
                            {field.options?.map(option => (
                                <option key={option.id} value={option.id}>
                                    {option.name}
                                </option>
                            ))}
                        </select>
                        {field.helpText && (
                            <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
                        )}
                    </FormField>
                )

            case 'checkbox':
                return (
                    <div className={`flex items-center gap-2 px-1 ${field.className || ''}`}>
                        <input
                            type="checkbox"
                            id={field.name}
                            name={field.name}
                            checked={!!value}
                            onChange={handleChange}
                            className="h-4 w-4 text-gray-900 border-gray-200 rounded focus:ring-0 focus:ring-offset-0"
                            disabled={field.disabled}
                        />
                        <label htmlFor={field.name} className="text-sm text-gray-500">
                            {field.label}
                        </label>
                        {field.helpText && (
                            <span className="text-xs text-gray-400">({field.helpText})</span>
                        )}
                    </div>
                )

            case 'toggle':
                return (
                    <div className={`flex items-center justify-between ${field.className || ''}`}>
                        <label htmlFor={field.name} className="block text-sm text-gray-500">
                            {field.label} {field.helpText && <span className="text-xs">({field.helpText})</span>}
                        </label>
                        <Toggle
                            size="sm"
                            enabled={Boolean(value)}
                            disabled={field.disabled}
                            onChange={() => {
                                if (!field.disabled) {
                                    setFormData(prev => ({ ...prev, [field.name]: !prev[field.name] }))
                                }
                            }}
                        />
                    </div>
                )

            case 'color':
                return (
                    <FormField
                        label={field.label}
                        required={field.required}
                        error={error}
                        className={field.className}
                    >
                        <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                id={field.name}
                                name={field.name}
                                value={value}
                                onChange={handleChange}
                                maxLength={field.maxLength}
                                className={`${inputClass} flex-1`}
                                placeholder={field.placeholder}
                                disabled={field.disabled}
                            />
                            <div
                                className="w-10 h-10 rounded-lg border border-gray-200"
                                style={{ backgroundColor: value || '#000000' }}
                            />
                        </div>
                        {field.helpText && (
                            <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
                        )}
                    </FormField>
                )

            default:
                return (
                    <FormField
                        label={field.label}
                        required={field.required}
                        error={error}
                        className={field.className}
                    >
                        <input
                            type={field.type}
                            id={field.name}
                            name={field.name}
                            value={value}
                            onChange={handleChange}
                            maxLength={field.maxLength}
                            className={inputClass}
                            placeholder={field.placeholder}
                            disabled={field.disabled}
                        />
                        {field.helpText && (
                            <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
                        )}
                    </FormField>
                )
        }
    }

    const formId = `${title.toLowerCase().replace(/\s+/g, '-')}-form`

    return (
        <Modal
            title={title}
            onClose={onCancel}
            actions={
                <div className="flex gap-2">
                    {data && onDelete && <DeleteButton onClick={onDelete} />}
                    <Button type="submit" form={formId} variant="primary">
                        {submitLabel || (data ? 'Save' : 'Add')}
                    </Button>
                </div>
            }
        >
            <form id={formId} onSubmit={handleSubmit} className={`grid grid-cols-${gridCols} gap-4`}>
                {fields.map(field => (
                    <div key={field.name} className={field.className || `col-span-${gridCols}`}>
                        {renderField(field)}
                    </div>
                ))}
            </form>
        </Modal>
    )
}
