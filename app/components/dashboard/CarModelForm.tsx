import { useState, useEffect } from 'react'
import { validateLatinOnly } from '~/lib/validation'
import Button from '~/components/ui/Button'
import Modal from '~/components/ui/Modal'
import { inputBaseStyles } from '~/lib/styles/input'
import FormField from '~/components/ui/FormField'

interface CarBrand {
    id: number
    name: string
}

interface CarModel {
    id: number
    name: string
    brand_id: number
    created_at: string
    updated_at: string
    car_brands: {
        id: number
        name: string
    }
}

interface CarModelFormProps {
    model?: CarModel | null
    brands: CarBrand[]
    onSubmit: (data: any) => void
    onCancel: () => void
}

export function CarModelForm({ model, brands, onSubmit, onCancel }: CarModelFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        brand_id: ''
    })
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        if (model) {
            setFormData({
                name: model.name,
                brand_id: model.brand_id.toString()
            })
        }
    }, [model])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }))
        }
    }

    const validate = () => {
        const newErrors: Record<string, string> = {}

        if (!formData.name.trim()) {
            newErrors.name = 'Model name is required'
        } else {
            const latinError = validateLatinOnly(formData.name, 'Model name')
            if (latinError) {
                newErrors.name = latinError
            }
        }

        if (!formData.brand_id) {
            newErrors.brand_id = 'Brand is required'
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
            brand_id: parseInt(formData.brand_id)
        })
    }

    return (
        <Modal
            title={model ? 'Edit Car Model' : 'Create Car Model'}
            onClose={onCancel}
            actions={
                <Button
                    type="submit"
                    form="car-model-form"
                    variant="primary"
                >
                    {model ? 'Save' : 'Add'}
                </Button>
            }
        >
            <form id="car-model-form" onSubmit={handleSubmit} className="grid grid-cols-4 gap-4">
                <div className="col-span-2">
                    <FormField
                        label="Brand"
                        required
                        error={errors.brand_id}
                    >
                        <select
                            id="brand_id"
                            name="brand_id"
                            value={formData.brand_id}
                            onChange={handleChange}
                            className={`${inputBaseStyles} ${errors.brand_id ? 'border-gray-600' : ''}`}
                        >
                            <option value="">Select a brand</option>
                            {brands.map(brand => (
                                <option key={brand.id} value={brand.id}>
                                    {brand.name}
                                </option>
                            ))}
                        </select>
                    </FormField>
                </div>

                <div className="col-span-2">
                    <FormField
                        label="Model Name"
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
                            placeholder="Enter model name"
                        />
                    </FormField>
                </div>
            </form>
        </Modal>
    )
}
