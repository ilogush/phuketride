import { Form } from 'react-router'
import FormField from '~/components/dashboard/FormField'
import FormSection from '~/components/dashboard/FormSection'
import CarPhotosUpload from '~/components/dashboard/CarPhotosUpload'
import AdminCard from '~/components/dashboard/AdminCard'
import Toggle from '~/components/dashboard/Toggle'
import { inputBaseStyles, selectBaseStyles } from '~/lib/styles/input'
import { TruckIcon, PhotoIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import type { BodyType, CarBrand, CarModel, CarTemplate, FuelType } from './car-template-form.types'
import { useCarTemplateFormState } from './useCarTemplateFormState'

interface CarTemplateFormProps {
    template?: CarTemplate | null
    brands: CarBrand[]
    models: CarModel[]
    bodyTypes: BodyType[]
    fuelTypes: FuelType[]
}

export function CarTemplateForm({ template, brands, models, bodyTypes, fuelTypes }: CarTemplateFormProps) {
    const { errors, filteredModels, formData, setFormData, updateField } = useCarTemplateFormState({
        template,
        brands,
        models,
        bodyTypes,
        fuelTypes,
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        updateField(name as keyof typeof formData, value)
    }

    const handlePhotosChange = (photos: Array<{ base64: string; fileName: string }>) => {
        updateField('photos', photos)
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
