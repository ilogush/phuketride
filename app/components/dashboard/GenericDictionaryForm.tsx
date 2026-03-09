import { useState, useEffect } from 'react'
import { validateLatinOnly } from '~/lib/validation'
import Button from '~/components/shared/ui/Button'
import Modal from '~/components/shared/ui/Modal'
import FormField from '~/components/shared/ui/FormField'
import DeleteButton from '~/components/shared/ui/DeleteButton'
import Toggle from '~/components/shared/ui/Toggle'
import { Input } from '~/components/shared/ui/Input'
import { Select } from '~/components/shared/ui/Select'
import { Textarea } from '~/components/shared/ui/Textarea'
import AdminCard from '~/components/shared/ui/AdminCard'
import { XMarkIcon } from '@heroicons/react/24/outline'

export type FieldType = 'text' | 'number' | 'select' | 'textarea' | 'checkbox' | 'color' | 'toggle'

export interface FieldConfig {
    name: string
    label: string
    type: FieldType
    required?: boolean
    placeholder?: string
    maxLength?: number
    options?: Array<{ id: number | string; name: string }>
    validation?: (value: unknown, formData: Record<string, unknown>) => string | null
    disabled?: boolean
    className?: string
    rows?: number
    helpText?: string
    step?: string | number
    transform?: (value: string) => unknown
}

interface GenericDictionaryFormProps {
    title: string
    fields: FieldConfig[]
    data?: Record<string, unknown> | null
    onSubmit: (data: Record<string, unknown>) => void
    onCancel: () => void
    onDelete?: () => void
    submitLabel?: string
    gridCols?: number
    mode?: 'modal' | 'sidebar'
    icon?: React.ReactNode
}

const GRID_CLASS_NAMES: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
}

const COL_SPAN_CLASS_NAMES: Record<number, string> = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
}

const toInputValue = (value: unknown): string | number | readonly string[] | undefined => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string' || typeof value === 'number') return value
    if (Array.isArray(value)) return value.map((v) => String(v))
    return String(value)
}

const toColorValue = (value: unknown): string => {
    if (typeof value === 'string' && value.trim()) return value
    return '#000000'
}

export function GenericDictionaryForm({
    title,
    fields,
    data,
    onSubmit,
    onCancel,
    onDelete,
    submitLabel,
    gridCols = 4,
    mode = 'modal',
    icon
}: GenericDictionaryFormProps) {
    const [formData, setFormData] = useState<Record<string, unknown>>({})
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        const initialData: Record<string, unknown> = {}
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

        let newValue: unknown = value

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

        const submitData: Record<string, unknown> = {}
        fields.forEach(field => {
            const value = formData[field.name]
            submitData[field.name] = typeof value === 'string' ? value.trim() : value
        })

        onSubmit(submitData)
    }

    const renderField = (field: FieldConfig) => {
        const value = formData[field.name] ?? ''
        const error = errors[field.name]

        switch (field.type) {
            case 'textarea':
                return (
                    <FormField
                        label={field.label}
                        required={field.required}
                        hint={field.helpText}
                        className={field.className}
                    >
                        <Textarea
                            label={undefined}
                            id={field.name}
                            name={field.name}
                            value={toInputValue(value)}
                            onChange={(nextValue) =>
                                handleChange({
                                    target: {
                                        name: field.name,
                                        value: nextValue,
                                        type: 'textarea',
                                    },
                                } as React.ChangeEvent<HTMLTextAreaElement>)
                            }
                            rows={field.rows || 3}
                            placeholder={field.placeholder}
                            disabled={field.disabled}
                            error={error}
                        />
                    </FormField>
                )

            case 'select':
                return (
                    <FormField
                        label={field.label}
                        required={field.required}
                        className={field.className}
                    >
                        <Select
                            label={undefined}
                            id={field.name}
                            name={field.name}
                            value={toInputValue(value)}
                            onChange={handleChange}
                            error={error}
                            disabled={field.disabled}
                            options={field.options || []}
                            placeholder={field.placeholder}
                            showPlaceholderOption={Boolean(field.placeholder)}
                        />
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
                            checked={Boolean(value)}
                            disabled={field.disabled}
                            onCheckedChange={() => {
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
                        hint={field.helpText}
                        className={field.className}
                    >
                        <div className="flex items-center space-x-2">
                            <Input
                                label={undefined}
                                type="text"
                                id={field.name}
                                name={field.name}
                                value={toInputValue(value)}
                                onChange={handleChange}
                                maxLength={field.maxLength}
                                className="flex-1"
                                placeholder={field.placeholder}
                                disabled={field.disabled}
                                error={error}
                            />
                            <div
                                className="w-10 h-10 rounded-lg border border-gray-200"
                                style={{ backgroundColor: toColorValue(value) }}
                            />
                        </div>
                    </FormField>
                )

            default:
                return (
                    <FormField
                        label={field.label}
                        required={field.required}
                        hint={field.helpText}
                        className={field.className}
                    >
                        <Input
                            label={undefined}
                            type={field.type}
                            id={field.name}
                            name={field.name}
                            value={toInputValue(value)}
                            onChange={handleChange}
                            maxLength={field.maxLength}
                            step={field.step}
                            placeholder={field.placeholder}
                            disabled={field.disabled}
                            error={error}
                        />
                    </FormField>
                )
        }
    }

    const formId = `${title.toLowerCase().replace(/\s+/g, '-')}-form`
    const gridClassName = GRID_CLASS_NAMES[gridCols] || GRID_CLASS_NAMES[4]
    const defaultColSpanClassName = COL_SPAN_CLASS_NAMES[gridCols] || COL_SPAN_CLASS_NAMES[4]

    const formContent = (
        <form id={formId} onSubmit={handleSubmit} className={`grid ${mode === 'sidebar' ? 'grid-cols-1' : gridClassName} gap-4`}>
            {fields.map(field => (
                <div key={field.name} className={mode === 'sidebar' ? '' : (field.className || defaultColSpanClassName)}>
                    {renderField(field)}
                </div>
            ))}
        </form>
    )

    if (mode === 'sidebar') {
        return (
            <AdminCard
                title={title}
                icon={icon}
                headerActions={
                    <button
                        onClick={onCancel}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                }
            >
                {formContent}
                <div className="flex gap-2 pt-2">
                    <Button type="submit" form={formId} variant="solid" className="flex-1 justify-center">
                        {submitLabel || (data ? 'Save' : 'Add')}
                    </Button>
                    {data && onDelete && <DeleteButton onClick={onDelete} />}
                </div>
            </AdminCard>
        )
    }

    return (
        <Modal
            title={title}
            onClose={onCancel}
            actions={
                <div className="flex gap-2">
                    {data && onDelete && <DeleteButton onClick={onDelete} />}
                    <Button type="submit" form={formId} variant="solid">
                        {submitLabel || (data ? 'Save' : 'Add')}
                    </Button>
                </div>
            }
        >
            {formContent}
        </Modal>
    )
}
