import { useState, useEffect } from 'react'
import { validateLatinOnly } from '~/lib/validation'
import Button from '~/components/ui/Button'
import Modal from '~/components/ui/Modal'
import FormField from '~/components/ui/FormField'
import { inputBaseStyles } from '~/lib/styles/input'

interface Brand {
    id: number
    name: string
    created_at: string
    updated_at: string
}

interface BrandFormProps {
    brand?: Brand | null
    onSubmit: (data: any) => void
    onCancel: () => void
}

export function BrandForm({ brand, onSubmit, onCancel }: BrandFormProps) {
    const [formData, setFormData] = useState({
        name: ''
    })
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        if (brand) {
            setFormData({
                name: brand.name
            })
        }
    }, [brand])

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
            newErrors.name = 'Brand name is required'
        } else {
            const latinError = validateLatinOnly(formData.name, 'Brand name')
            if (latinError) {
                newErrors.name = latinError
            }
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
            name: formData.name.trim()
        })
    }

    return (
        <Modal
            title={brand ? 'Edit Brand' : 'Create Brand'}
            onClose={onCancel}
            actions={
                <Button
                    type="submit"
                    form="brand-form"
                    variant="primary"
                >
                    {brand ? 'Save' : 'Add'}
                </Button>
            }
        >
            <form id="brand-form" onSubmit={handleSubmit} className="grid grid-cols-4 gap-4">
                <div className="col-span-4">
                    <FormField
                        label="Brand Name"
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
                            placeholder="Enter brand name"
                        />
                    </FormField>
                </div>
            </form>
        </Modal>
    )
}
