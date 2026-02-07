import { useState, useEffect } from 'react'
import { validateLatinOnly } from '~/lib/validation'
import Button from '~/components/ui/Button'
import Modal from '~/components/ui/Modal'

interface Color {
    id: number
    name: string
    hex_code: string
    created_at: string
    updated_at: string
}

interface ColorFormProps {
    color?: Color | null
    onSubmit: (data: any) => void
    onCancel: () => void
}

export function ColorForm({ color, onSubmit, onCancel }: ColorFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        hex_code: '#000000'
    })
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        if (color) {
            setFormData({
                name: color.name,
                hex_code: color.hex_code
            })
        }
    }, [color])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }))
        }
    }

    const validate = () => {
        const newErrors: Record<string, string> = {}

        if (!formData.name.trim()) {
            newErrors.name = 'Color name is required'
        } else {
            const latinError = validateLatinOnly(formData.name, 'Color name')
            if (latinError) {
                newErrors.name = latinError
            }
        }

        if (!formData.hex_code.trim()) {
            newErrors.hex_code = 'Hex code is required'
        }

        if (!/^#[0-9A-Fa-f]{6}$/.test(formData.hex_code)) {
            newErrors.hex_code = 'Invalid hex code format (use #RRGGBB)'
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
            hex_code: formData.hex_code.trim()
        })
    }

    return (
        <Modal
            title={color ? 'Edit Color' : 'Create Color'}
            onClose={onCancel}
            actions={
                <Button
                    type="submit"
                    form="color-form"
                    variant="primary"
                >
                    {color ? 'Save' : 'Add'}
                </Button>
            }
        >
            <form id="color-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-500">
                        Color Name *
                    </label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`block w-full rounded-lg sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors ${errors.name ? 'border-gray-600' : ''
                            }`}
                        placeholder="Enter color name"
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-gray-700">{errors.name}</p>
                    )}
                </div>

                <div>
                    <label htmlFor="hex_code" className="block text-sm font-medium text-gray-500">
                        Hex Code *
                    </label>
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            id="hex_code"
                            name="hex_code"
                            value={formData.hex_code}
                            onChange={handleChange}
                            className={`block flex-1 rounded-lg border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors ${errors.hex_code ? 'border-gray-600' : ''
                                }`}
                            placeholder="#RRGGBB"
                        />
                        <div
                            className="w-10 h-10 rounded-lg"
                            style={{ backgroundColor: formData.hex_code }}
                        />
                    </div>
                    {errors.hex_code && (
                        <p className="mt-1 text-sm text-gray-700">{errors.hex_code}</p>
                    )}
                </div>
            </form>
        </Modal>
    )
}
