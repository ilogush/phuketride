import { useState, useEffect } from 'react'
import { Form } from 'react-router'
import FormField from '~/components/dashboard/FormField'
import FormSection from '~/components/dashboard/FormSection'
import CarPhotosUpload from '~/components/dashboard/CarPhotosUpload'
import { inputBaseStyles, selectBaseStyles } from '~/lib/styles/input'
import { TruckIcon, PhotoIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

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
    production_year?: number
    transmission?: 'automatic' | 'manual'
    engine_volume?: number
    body_type?: string
    seats?: number
    doors?: number
    fuel_type?: string
    description?: string
    photos?: string
}

interface CarTemplateFormProps {
    template?: CarTemplate | null
    brands: CarBrand[]
    models: CarModel[]
}

export function CarTemplateForm({ template, brands, models }: CarTemplateFormProps) {
    const [formData, setFormData] = useState({
        brand_id: '',
        model_id: '',
        production_year: '',
        transmission: '',
        engine_volume: '',
        body_type: '',
        seats: '',
        doors: '',
        fuel_type: '',
        description: '',
        photos: [] as Array<{ base64: string; fileName: string }>
    })
    const [filteredModels, setFilteredModels] = useState<CarModel[]>([])
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        if (template) {
            const existingPhotos = template.photos ? JSON.parse(template.photos) : []
            setFormData({
                brand_id: template.brand_id.toString(),
                model_id: template.model_id.toString(),
                production_year: template.production_year?.toString() || '',
                transmission: template.transmission || '',
                engine_volume: template.engine_volume?.toString() || '',
                body_type: template.body_type || '',
                seats: template.seats?.toString() || '',
                doors: template.doors?.toString() || '',
                fuel_type: template.fuel_type || '',
                description: template.description || '',
                photos: existingPhotos
            })
        }
    }, [template])

    useEffect(() => {
        if (formData.brand_id) {
            const filtered = models.filter(m => m.brand_id === parseInt(formData.brand_id))
            setFilteredModels(filtered)
            
            if (!filtered.find(m => m.id === parseInt(formData.model_id))) {
                setFormData(prev => ({ ...prev, model_id: '' }))
            }
        } else {
            setFilteredModels([])
            setFormData(prev => ({ ...prev, model_id: '' }))
        }
    }, [formData.brand_id, models])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handlePhotosChange = (photos: Array<{ base64: string; fileName: string }>) => {
        setFormData(prev => ({ ...prev, photos }))
    }

    return (
        <Form method="post" id="car-template-form" className="space-y-4">
            <FormSection title="Basic Information" icon={<TruckIcon className="w-5 h-5" />}>
                <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-1">
                        <FormField label="Brand" required error={errors.brand_id}>
                            <select
                                name="brand_id"
                                value={formData.brand_id}
                                onChange={handleChange}
                                className={`${selectBaseStyles} ${errors.brand_id ? 'border-gray-600' : ''}`}
                                required
                            >
                                <option value="">Select brand</option>
                                {brands.map(brand => (
                                    <option key={brand.id} value={brand.id}>
                                        {brand.name}
                                    </option>
                                ))}
                            </select>
                        </FormField>
                    </div>

                    <div className="col-span-1">
                        <FormField label="Model" required error={errors.model_id}>
                            <select
                                name="model_id"
                                value={formData.model_id}
                                onChange={handleChange}
                                className={`${selectBaseStyles} ${errors.model_id ? 'border-gray-600' : ''}`}
                                required
                            >
                                <option value="">Select model</option>
                                {filteredModels.map(model => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                    </option>
                                ))}
                            </select>
                        </FormField>
                    </div>

                    <div className="col-span-1">
                        <FormField label="Year" error={errors.production_year}>
                            <input
                                type="number"
                                name="production_year"
                                value={formData.production_year}
                                onChange={handleChange}
                                className={`${inputBaseStyles} ${errors.production_year ? 'border-gray-600' : ''}`}
                                placeholder="2024"
                                min="1900"
                                max={new Date().getFullYear() + 1}
                            />
                        </FormField>
                    </div>

                    <div className="col-span-1">
                        <FormField label="Transmission" error={errors.transmission}>
                            <select
                                name="transmission"
                                value={formData.transmission}
                                onChange={handleChange}
                                className={selectBaseStyles}
                            >
                                <option value="">Select</option>
                                <option value="automatic">Automatic</option>
                                <option value="manual">Manual</option>
                            </select>
                        </FormField>
                    </div>

                    <div className="col-span-1">
                        <FormField label="Body Type" error={errors.body_type}>
                            <input
                                type="text"
                                name="body_type"
                                value={formData.body_type}
                                onChange={handleChange}
                                className={`${inputBaseStyles} ${errors.body_type ? 'border-gray-600' : ''}`}
                                placeholder="Sedan"
                            />
                        </FormField>
                    </div>

                    <div className="col-span-1">
                        <FormField label="Fuel Type" error={errors.fuel_type}>
                            <input
                                type="text"
                                name="fuel_type"
                                value={formData.fuel_type}
                                onChange={handleChange}
                                className={`${inputBaseStyles} ${errors.fuel_type ? 'border-gray-600' : ''}`}
                                placeholder="Gasoline"
                            />
                        </FormField>
                    </div>

                    <div className="col-span-1">
                        <FormField label="Engine Volume (L)" error={errors.engine_volume}>
                            <input
                                type="number"
                                name="engine_volume"
                                value={formData.engine_volume}
                                onChange={handleChange}
                                className={`${inputBaseStyles} ${errors.engine_volume ? 'border-gray-600' : ''}`}
                                placeholder="2.0"
                                step="0.1"
                                min="0"
                            />
                        </FormField>
                    </div>

                    <div className="col-span-1">
                        <FormField label="Seats" error={errors.seats}>
                            <input
                                type="number"
                                name="seats"
                                value={formData.seats}
                                onChange={handleChange}
                                className={`${inputBaseStyles} ${errors.seats ? 'border-gray-600' : ''}`}
                                placeholder="5"
                                min="1"
                            />
                        </FormField>
                    </div>

                    <div className="col-span-1">
                        <FormField label="Doors" error={errors.doors}>
                            <input
                                type="number"
                                name="doors"
                                value={formData.doors}
                                onChange={handleChange}
                                className={`${inputBaseStyles} ${errors.doors ? 'border-gray-600' : ''}`}
                                placeholder="4"
                                min="1"
                            />
                        </FormField>
                    </div>

                    <div className="col-span-1"></div>
                </div>
            </FormSection>

            <FormSection title="Photos" icon={<PhotoIcon className="w-5 h-5" />}>
                <CarPhotosUpload
                    currentPhotos={formData.photos.map(p => p.base64)}
                    onPhotosChange={handlePhotosChange}
                    maxPhotos={12}
                />
                <input type="hidden" name="photos" value={JSON.stringify(formData.photos)} />
            </FormSection>

            <FormSection title="Description" icon={<DocumentTextIcon className="w-5 h-5" />}>
                <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-4">
                        <FormField label="Description" error={errors.description}>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                className={inputBaseStyles}
                                placeholder="Enter template description"
                                rows={4}
                            />
                        </FormField>
                    </div>
                </div>
            </FormSection>
        </Form>
    )
}
