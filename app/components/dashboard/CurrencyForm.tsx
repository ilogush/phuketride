import { useState, useEffect } from 'react'
import Modal from '~/components/ui/Modal'
import { validateLatinOnly } from '~/lib/validation'
import Button from '~/components/ui/Button'
import FormField from '~/components/ui/FormField'
import { inputBaseStyles } from '~/lib/styles/input'

interface Currency {
    id: number
    code: string
    name: string
    symbol: string
    is_active: boolean
    created_at: string
    updated_at: string
}

interface CurrencyFormProps {
    currency?: Currency | null
    onSubmit: (data: any) => void
    onCancel: () => void
}

export function CurrencyForm({ currency, onSubmit, onCancel }: CurrencyFormProps) {
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        symbol: '',
        is_active: true
    })
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        if (currency) {
            setFormData({
                code: currency.code,
                name: currency.name,
                symbol: currency.symbol,
                is_active: currency.is_active
            })
        }
    }, [currency])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target

        if (name === 'code') {
            setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }))
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

        if (!formData.code.trim()) {
            newErrors.code = 'Currency code is required'
        } else if (formData.code.length !== 3) {
            newErrors.code = 'Currency code must be exactly 3 characters'
        } else if (!/^[A-Z]{3}$/.test(formData.code)) {
            newErrors.code = 'Currency code must contain only uppercase letters'
        }

        if (!formData.name.trim()) {
            newErrors.name = 'Currency name is required'
        } else {
            const latinError = validateLatinOnly(formData.name, 'Currency name')
            if (latinError) {
                newErrors.name = latinError
            }
        }

        if (!formData.symbol.trim()) {
            newErrors.symbol = 'Currency symbol is required'
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
            code: formData.code.trim(),
            name: formData.name.trim(),
            symbol: formData.symbol.trim(),
            is_active: formData.is_active
        })
    }

    return (
        <Modal
            title={currency ? 'Edit Currency' : 'Create Currency'}
            onClose={onCancel}
            actions={
                <Button
                    type="submit"
                    form="currency-form"
                    variant="primary"
                >
                    {currency ? 'Save' : 'Add'}
                </Button>
            }
        >
            <form id="currency-form" onSubmit={handleSubmit} className="space-y-4">
                <FormField
                    label="Currency Name"
                    required
                    error={errors.name}
                >
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`${inputBaseStyles} ${errors.name ? 'border-gray-600' : ''}`}
                        placeholder="US Dollar"
                    />
                </FormField>

                <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-2">
                        <FormField
                            label="Code (ISO)"
                            required
                            error={errors.code}
                        >
                            <input
                                type="text"
                                id="code"
                                name="code"
                                value={formData.code}
                                onChange={handleChange}
                                maxLength={3}
                                className={`${inputBaseStyles} font-mono uppercase ${errors.code ? 'border-gray-600' : ''}`}
                                placeholder="USD"
                            />
                        </FormField>
                    </div>

                    <div className="col-span-2">
                        <FormField
                            label="Symbol"
                            required
                            error={errors.symbol}
                        >
                            <input
                                type="text"
                                id="symbol"
                                name="symbol"
                                value={formData.symbol}
                                onChange={handleChange}
                                maxLength={10}
                                className={`${inputBaseStyles} text-lg ${errors.symbol ? 'border-gray-600' : ''}`}
                                placeholder="$"
                            />
                        </FormField>
                    </div>
                </div>

                <div className="flex items-center gap-2 px-1">
                    <input
                        type="checkbox"
                        id="is_active"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleChange}
                        className="h-4 w-4 text-gray-900 border-gray-200 rounded focus:ring-0 focus:ring-offset-0"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium text-gray-500">
                        Active
                    </label>
                </div>
            </form>
        </Modal>
    )
}
