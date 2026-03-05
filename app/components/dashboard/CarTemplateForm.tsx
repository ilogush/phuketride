import { useState, useEffect } from 'react'
import { Form } from 'react-router'
import FormField from '~/components/dashboard/FormField'
import FormSection from '~/components/dashboard/FormSection'
import CarPhotosUpload from '~/components/dashboard/CarPhotosUpload'
import AdminCard from '~/components/dashboard/AdminCard'
import Toggle from '~/components/dashboard/Toggle'
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

interface BodyType {
    id: number
    name: string
}

interface FuelType {
    id: number
    name: string
}

interface CarTemplate {
    id: number
    brand_id: number
    model_id: number
    transmission?: 'automatic' | 'manual'
    engine_volume?: number
    body_type_id?: number
    seats?: number
    doors?: number
    fuel_type_id?: number
    description?: string
    photos?: string
    feature_transmission?: 'automatic' | 'manual' | null
    feature_air_conditioning?: boolean
    feature_abs?: boolean
    feature_airbags?: boolean
    drivetrain?: 'FWD' | 'RWD' | 'AWD' | '4WD' | null
    luggage_capacity?: 'small' | 'medium' | 'large' | null
    rear_camera?: boolean
    carplay_enabled?: boolean
    android_auto_enabled?: boolean
    bluetooth_enabled?: boolean
}

interface CarTemplateFormProps {
    template?: CarTemplate | null
    brands: CarBrand[]
    models: CarModel[]
    bodyTypes: BodyType[]
    fuelTypes: FuelType[]
}

export function CarTemplateForm({ template, brands, models, bodyTypes, fuelTypes }: CarTemplateFormProps) {
    const [formData, setFormData] = useState({
        brand_id: '',
        model_id: '',
        transmission: 'automatic',
        engine_volume: '',
        body_type_id: '',
        seats: '',
        doors: '',
        fuel_type_id: '',
        description: '',
        feature_air_conditioning: true,
        feature_abs: true,
        feature_airbags: true,
        drivetrain: 'FWD',
        luggage_capacity: 'medium',
        rear_camera: true,
        carplay_enabled: false,
        android_auto_enabled: false,
        bluetooth_enabled: true,
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
                transmission: template.transmission || 'automatic',
                engine_volume: template.engine_volume?.toString() || '',
                body_type_id: template.body_type_id?.toString() || '',
                seats: template.seats?.toString() || '',
                doors: template.doors?.toString() || '',
                fuel_type_id: template.fuel_type_id?.toString() || '',
                description: template.description || '',
                feature_air_conditioning: template.feature_air_conditioning == null ? true : Boolean(template.feature_air_conditioning),
                feature_abs: template.feature_abs == null ? true : Boolean(template.feature_abs),
                feature_airbags: template.feature_airbags == null ? true : Boolean(template.feature_airbags),
                drivetrain: template.drivetrain || 'FWD',
                luggage_capacity: template.luggage_capacity || 'medium',
                rear_camera: template.rear_camera == null ? true : Boolean(template.rear_camera),
                carplay_enabled: template.carplay_enabled == null ? false : Boolean(template.carplay_enabled),
                android_auto_enabled: template.android_auto_enabled == null ? false : Boolean(template.android_auto_enabled),
                bluetooth_enabled: template.bluetooth_enabled == null ? true : Boolean(template.bluetooth_enabled),
                photos: existingPhotos
            })
        }
    }, [template])

    useEffect(() => {
        if (template?.brand_id) return
        if (!formData.brand_id && brands.length > 0) {
            setFormData(prev => ({ ...prev, brand_id: String(brands[0].id) }))
        }
    }, [template, formData.brand_id, brands])

    useEffect(() => {
        if (formData.brand_id) {
            const filtered = models.filter(m => Number(m.brand_id) === Number(formData.brand_id))
            setFilteredModels(filtered)

            if (template?.model_id) {
                const templateModelId = Number(template.model_id)
                if (
                    filtered.some((m) => Number(m.id) === templateModelId) &&
                    Number(formData.model_id || 0) !== templateModelId
                ) {
                    setFormData(prev => ({ ...prev, model_id: String(templateModelId) }))
                }
                return
            }

            if (!filtered.find(m => Number(m.id) === Number(formData.model_id))) {
                setFormData(prev => ({ ...prev, model_id: filtered.length > 0 ? String(filtered[0].id) : '' }))
            }
        } else {
            setFilteredModels([])
            setFormData(prev => ({ ...prev, model_id: '' }))
        }
    }, [template, formData.brand_id, formData.model_id, models])

    useEffect(() => {
        if (template?.body_type_id && template?.fuel_type_id) return
        const hasBodyType = bodyTypes.some((item) => String(item.id) === formData.body_type_id)
        if ((!formData.body_type_id || !hasBodyType) && bodyTypes.length > 0) {
            setFormData(prev => ({ ...prev, body_type_id: String(bodyTypes[0].id) }))
        }
        const hasFuelType = fuelTypes.some((item) => String(item.id) === formData.fuel_type_id)
        if ((!formData.fuel_type_id || !hasFuelType) && fuelTypes.length > 0) {
            setFormData(prev => ({ ...prev, fuel_type_id: String(fuelTypes[0].id) }))
        }
    }, [template, formData.body_type_id, formData.fuel_type_id, bodyTypes, fuelTypes])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handlePhotosChange = (photos: Array<{ base64: string; fileName: string }>) => {
        setFormData(prev => ({ ...prev, photos }))
    }

    return (
        <Form method="post" id="car-template-form">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                    <FormSection title="Basic Information" icon={<TruckIcon className="w-5 h-5" />}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <FormField label="Brand" required error={errors.brand_id}>
                                <select
                                    name="brand_id"
                                    value={formData.brand_id}
                                    onChange={handleChange}
                                    className={`${selectBaseStyles} ${errors.brand_id ? 'border-gray-600' : ''}`}
                                    required
                                >
                                    {brands.map(brand => (
                                        <option key={brand.id} value={brand.id}>
                                            {brand.name}
                                        </option>
                                    ))}
                                </select>
                            </FormField>

                            <FormField label="Model" required error={errors.model_id}>
                                <select
                                    name="model_id"
                                    value={formData.model_id}
                                    onChange={handleChange}
                                    className={`${selectBaseStyles} ${errors.model_id ? 'border-gray-600' : ''}`}
                                    required
                                >
                                    {filteredModels.map(model => (
                                        <option key={model.id} value={model.id}>
                                            {model.name}
                                        </option>
                                    ))}
                                </select>
                            </FormField>

                            <FormField label="Transmission" required error={errors.transmission}>
                                <select
                                    name="transmission"
                                    value={formData.transmission}
                                    onChange={handleChange}
                                    className={selectBaseStyles}
                                    required
                                >
                                    <option value="automatic">Automatic</option>
                                    <option value="manual">Manual</option>
                                </select>
                            </FormField>

                            <FormField label="Body Type" required error={errors.body_type_id}>
                                <select
                                    name="body_type_id"
                                    value={formData.body_type_id}
                                    onChange={handleChange}
                                    className={`${selectBaseStyles} ${errors.body_type_id ? 'border-gray-600' : ''}`}
                                    required
                                >
                                    {bodyTypes.map(type => (
                                        <option key={type.id} value={type.id}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                            </FormField>

                            <FormField label="Fuel Type" required error={errors.fuel_type_id}>
                                <select
                                    name="fuel_type_id"
                                    value={formData.fuel_type_id}
                                    onChange={handleChange}
                                    className={`${selectBaseStyles} ${errors.fuel_type_id ? 'border-gray-600' : ''}`}
                                    required
                                >
                                    {fuelTypes.map(type => (
                                        <option key={type.id} value={type.id}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                            </FormField>

                            <FormField label="Engine Volume (L)" required error={errors.engine_volume}>
                                <input
                                    type="number"
                                    name="engine_volume"
                                    value={formData.engine_volume}
                                    onChange={handleChange}
                                    className={`${inputBaseStyles} ${errors.engine_volume ? 'border-gray-600' : ''}`}
                                    placeholder="2.0"
                                    step="0.1"
                                    min="0"
                                    required
                                />
                            </FormField>

                            <FormField label="Seats" required error={errors.seats}>
                                <input
                                    type="number"
                                    name="seats"
                                    value={formData.seats}
                                    onChange={handleChange}
                                    className={`${inputBaseStyles} ${errors.seats ? 'border-gray-600' : ''}`}
                                    placeholder="5"
                                    min="1"
                                    required
                                />
                            </FormField>

                            <FormField label="Doors" required error={errors.doors}>
                                <input
                                    type="number"
                                    name="doors"
                                    value={formData.doors}
                                    onChange={handleChange}
                                    className={`${inputBaseStyles} ${errors.doors ? 'border-gray-600' : ''}`}
                                    placeholder="4"
                                    min="1"
                                    required
                                />
                            </FormField>

                            <FormField label="Luggage Capacity" required>
                                <select
                                    name="luggage_capacity"
                                    value={formData.luggage_capacity}
                                    onChange={handleChange}
                                    className={selectBaseStyles}
                                    required
                                >
                                    <option value="small">Small</option>
                                    <option value="medium">Medium</option>
                                    <option value="large">Large</option>
                                </select>
                            </FormField>

                            <FormField label="Airbags">
                                <div className="flex items-center justify-between px-4 border border-gray-200 rounded-xl h-[38px] bg-white">
                                    <span className="text-sm text-gray-900">{formData.feature_airbags ? "Enabled" : "Disabled"}</span>
                                    <Toggle
                                        enabled={formData.feature_airbags}
                                        onChange={(enabled) => setFormData(prev => ({ ...prev, feature_airbags: enabled }))}
                                    />
                                </div>
                            </FormField>

                        </div>
                    </FormSection>

                    <FormSection title="Description" icon={<DocumentTextIcon className="w-5 h-5" />}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="col-span-full">
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
                </div>

                <div className="space-y-4 lg:sticky lg:top-4 h-fit">
                    <AdminCard title="Photos" icon={<PhotoIcon className="w-5 h-5" />}>
                        <p className="text-xs text-gray-500 mb-3">Car Photos (max 12)</p>
                        <CarPhotosUpload
                            currentPhotos={formData.photos.map(p => p.base64)}
                            onPhotosChange={handlePhotosChange}
                            maxPhotos={12}
                        />
                    </AdminCard>
                </div>
            </div>
            <input type="hidden" name="photos" value={JSON.stringify(formData.photos)} />
            <input type="hidden" name="feature_air_conditioning" value={formData.feature_air_conditioning ? "1" : "0"} />
            <input type="hidden" name="feature_abs" value={formData.feature_abs ? "1" : "0"} />
            <input type="hidden" name="feature_airbags" value={formData.feature_airbags ? "1" : "0"} />
            <input type="hidden" name="drivetrain" value={formData.drivetrain} />
            <input type="hidden" name="rear_camera" value={formData.rear_camera ? "1" : "0"} />
            <input type="hidden" name="bluetooth_enabled" value={formData.bluetooth_enabled ? "1" : "0"} />
            <input type="hidden" name="carplay_enabled" value={formData.carplay_enabled ? "1" : "0"} />
            <input type="hidden" name="android_auto_enabled" value={formData.android_auto_enabled ? "1" : "0"} />
        </Form>
    )
}
