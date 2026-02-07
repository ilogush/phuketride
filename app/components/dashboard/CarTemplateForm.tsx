import { useState, useEffect } from 'react'
import Modal from '~/components/ui/Modal'
import Button from '~/components/ui/Button'

interface CarBrand {
    id: number
    name: string
}

interface CarModel {
    id: number
    name: string
    brand_id: number
}

interface CarTemplate {
    id: number
    brand_id: number
    model_id: number
    body_type_id?: number
    fuel_type_id?: number
    door_count_id?: number
    seat_count_id?: number
    transmission_type_id?: number
    engine_volume_id?: number
}

interface CarTemplateFormProps {
    template?: CarTemplate | null
    brands: CarBrand[]
    models: CarModel[]
    referenceData?: {
        bodyTypes: Array<{ id: number; name: string }>
        fuelTypes: Array<{ id: number; name: string }>
        doorCounts: Array<{ id: number; count: number }>
        seatCounts: Array<{ id: number; count: number }>
        transmissionTypes: Array<{ id: number; name: string }>
        engineVolumes: Array<{ id: number; volume: number }>
    }
    onSubmit: (data: any) => void
    onCancel: () => void
}

export function CarTemplateForm({ template, brands, models, referenceData, onSubmit, onCancel }: CarTemplateFormProps) {
    const [formData, setFormData] = useState({
        brand_id: '',
        model_id: '',
        body_type_id: '',
        fuel_type_id: '',
        door_count_id: '',
        seat_count_id: '',
        transmission_type_id: '',
        engine_volume_id: ''
    })
    const [filteredModels, setFilteredModels] = useState<CarModel[]>([])
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        if (template) {
            setFormData({
                brand_id: template.brand_id.toString(),
                model_id: template.model_id.toString(),
                body_type_id: template.body_type_id?.toString() || '',
                fuel_type_id: template.fuel_type_id?.toString() || '',
                door_count_id: template.door_count_id?.toString() || '',
                seat_count_id: template.seat_count_id?.toString() || '',
                transmission_type_id: template.transmission_type_id?.toString() || '',
                engine_volume_id: template.engine_volume_id?.toString() || ''
            })
        }
    }, [template])

    useEffect(() => {
        if (formData.brand_id) {
            const brandId = parseInt(formData.brand_id)
            const filtered = models.filter(model => model.brand_id === brandId)
            setFilteredModels(filtered)
        } else {
            setFilteredModels([])
        }
    }, [formData.brand_id, models])

    const handleFieldChange = (name: string, value: string) => {
        if (name === 'brand_id') {
            setFormData(prev => ({
                ...prev,
                [name]: value,
                model_id: ''
            }))
        } else {
            setFormData(prev => ({ ...prev, [name]: value }))
        }

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }))
        }
    }

    const validate = () => {
        const newErrors: Record<string, string> = {}

        if (!formData.brand_id) {
            newErrors.brand_id = 'Brand is required'
        }

        if (!formData.model_id) {
            newErrors.model_id = 'Model is required'
        }

        if (!formData.body_type_id) {
            newErrors.body_type_id = 'Body type is required'
        }

        if (!formData.fuel_type_id) {
            newErrors.fuel_type_id = 'Fuel type is required'
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
            brand_id: parseInt(formData.brand_id),
            model_id: parseInt(formData.model_id),
            body_type_id: formData.body_type_id ? parseInt(formData.body_type_id) : undefined,
            fuel_type_id: formData.fuel_type_id ? parseInt(formData.fuel_type_id) : undefined,
            door_count_id: formData.door_count_id ? parseInt(formData.door_count_id) : undefined,
            seat_count_id: formData.seat_count_id ? parseInt(formData.seat_count_id) : undefined,
            transmission_type_id: formData.transmission_type_id ? parseInt(formData.transmission_type_id) : undefined,
            engine_volume_id: formData.engine_volume_id ? parseInt(formData.engine_volume_id) : undefined
        })
    }

    const inputClass = "block w-full rounded-xl sm:text-sm py-2 px-3 bg-white text-gray-800 focus:ring-0 focus:border-gray-500 focus:outline-none transition-colors"

    return (
        <Modal
            title={template ? 'Edit Car Template' : 'Create Car Template'}
            onClose={onCancel}
            maxWidth="lg"
            actions={
                <Button
                    type="submit"
                    form="car-template-form"
                    variant="primary"
                >
                    {template ? 'Save' : 'Add'}
                </Button>
            }
        >
            <form id="car-template-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Brand *</label>
                        <select
                            value={formData.brand_id}
                            onChange={(e) => handleFieldChange('brand_id', e.target.value)}
                            className={`${inputClass} ${errors.brand_id ? 'border-gray-600' : ''}`}
                        >
                            <option value="">Select a brand</option>
                            {brands.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                        {errors.brand_id && <p className="mt-1 text-sm text-gray-700">{errors.brand_id}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Model *</label>
                        <select
                            value={formData.model_id}
                            onChange={(e) => handleFieldChange('model_id', e.target.value)}
                            disabled={!formData.brand_id}
                            className={`${inputClass} ${errors.model_id ? 'border-gray-600' : ''} ${!formData.brand_id ? 'opacity-50' : ''}`}
                        >
                            <option value="">Select a model</option>
                            {filteredModels.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                        {errors.model_id && <p className="mt-1 text-sm text-gray-700">{errors.model_id}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Body Type *</label>
                        <select
                            value={formData.body_type_id}
                            onChange={(e) => handleFieldChange('body_type_id', e.target.value)}
                            className={`${inputClass} ${errors.body_type_id ? 'border-gray-600' : ''}`}
                        >
                            <option value="">Select body type</option>
                            {(referenceData?.bodyTypes || []).map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        {errors.body_type_id && <p className="mt-1 text-sm text-gray-700">{errors.body_type_id}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Fuel Type *</label>
                        <select
                            value={formData.fuel_type_id}
                            onChange={(e) => handleFieldChange('fuel_type_id', e.target.value)}
                            className={`${inputClass} ${errors.fuel_type_id ? 'border-gray-600' : ''}`}
                        >
                            <option value="">Select fuel type</option>
                            {(referenceData?.fuelTypes || []).map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        {errors.fuel_type_id && <p className="mt-1 text-sm text-gray-700">{errors.fuel_type_id}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Doors</label>
                        <select
                            value={formData.door_count_id}
                            onChange={(e) => handleFieldChange('door_count_id', e.target.value)}
                            className={inputClass}
                        >
                            <option value="">Select doors</option>
                            {(referenceData?.doorCounts || []).map(d => (
                                <option key={d.id} value={d.id}>{d.count}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Seats</label>
                        <select
                            value={formData.seat_count_id}
                            onChange={(e) => handleFieldChange('seat_count_id', e.target.value)}
                            className={inputClass}
                        >
                            <option value="">Select seats</option>
                            {(referenceData?.seatCounts || []).map(s => (
                                <option key={s.id} value={s.id}>{s.count}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Transmission</label>
                        <select
                            value={formData.transmission_type_id}
                            onChange={(e) => handleFieldChange('transmission_type_id', e.target.value)}
                            className={inputClass}
                        >
                            <option value="">Select transmission</option>
                            {(referenceData?.transmissionTypes || []).map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Engine Volume</label>
                        <select
                            value={formData.engine_volume_id}
                            onChange={(e) => handleFieldChange('engine_volume_id', e.target.value)}
                            className={inputClass}
                        >
                            <option value="">Select engine volume</option>
                            {(referenceData?.engineVolumes || []).map(e => (
                                <option key={e.id} value={e.id}>{e.volume}L</option>
                            ))}
                        </select>
                    </div>
                </div>
            </form>
        </Modal>
    )
}
