import { useState, useEffect } from 'react'
import Modal from '~/components/ui/Modal'
import { validateLatinOnly } from '~/lib/validation'
import Button from '~/components/ui/Button'

interface PaymentStatus {
    id: number
    name: string
    value: number
    description?: string
    is_active: boolean
    created_at: string
    updated_at: string
}

interface PaymentStatusFormProps {
    status?: PaymentStatus | null
    onSubmit: (data: any) => void
    onCancel: () => void
}

export function PaymentStatusForm({ status, onSubmit, onCancel }: PaymentStatusFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        value: 0,
        description: '',
        is_active: true
    })
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        if (status) {
            setFormData({
                name: status.name,
                value: status.value,
                description: status.description || '',
                is_active: status.is_active
            })
        }
    }, [status])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target

        if (name === 'value') {
            setFormData(prev => ({ ...prev, [name]: parseInt(value) }))
        } else if (name === 'is_active') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
        } else {
            setFormData(prev => ({ ...prev, [name]: value }))
        }

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }))
        }
    }

    const validate = () => {
        const newErrors: Record<string, string> = {}

        if (!formData.name.trim()) {
            newErrors.name = 'Status name is required'
        } else {
            const latinError = validateLatinOnly(formData.name, 'Status name')
            if (latinError) {
                newErrors.name = latinError
            }
        }

        if (![-1, 0, 1].includes(formData.value)) {
            newErrors.value = 'Value must be -1 (refund), 0 (pending), or 1 (payment)'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!validate()) {
            return
        }

        onSubmit({
            name: formData.name.trim(),
            value: formData.value,
            description: formData.description.trim(),
            is_active: formData.is_active
        })
    }

    return (
        <Modal
            title={status ? 'Edit Payment Status' : 'Create Payment Status'}
            onClose={onCancel}
            actions={
                <Button
                    type="submit"
                    form="payment-status-form"
                    variant="primary"
                >
                    {status ? 'Save' : 'Add'}
                </Button>
            }
        >
            <form id="payment-status-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-500">
                        Status Name *
                    </label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`block w-full rounded-lg sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors ${errors.name ? 'border-gray-600' : ''
                            }`}
                        placeholder="e.g., Paid, Pending, Refund"
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-gray-700">{errors.name}</p>
                    )}
                </div>

                <div>
                    <label htmlFor="value" className="block text-sm font-medium text-gray-500">
                        Value Type *
                    </label>
                    <select
                        id="value"
                        name="value"
                        value={formData.value}
                        onChange={handleChange}
                        className={`block w-full rounded-lg sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors ${errors.value ? 'border-gray-600' : ''
                            }`}
                    >
                        <option value="1">Payment (+1)</option>
                        <option value="0">Pending (0)</option>
                        <option value="-1">Refund (-1)</option>
                    </select>
                    {errors.value && (
                        <p className="mt-1 text-sm text-gray-700">{errors.value}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                        This determines if the status represents money coming in (+1), pending (0), or going out (-1)
                    </p>
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-500">
                        Description
                    </label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        className={`block w-full rounded-lg sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors ${errors.description ? 'border-gray-600' : ''
                            }`}
                        placeholder="Optional description of what this status means"
                    />
                    {errors.description && (
                        <p className="mt-1 text-sm text-gray-700">{errors.description}</p>
                    )}
                </div>

                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="is_active"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-200 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                        Active
                    </label>
                </div>
            </form>
        </Modal>
    )
}
