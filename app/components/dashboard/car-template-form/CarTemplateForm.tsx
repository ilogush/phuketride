import { Form } from 'react-router'
import FormField from '~/components/shared/ui/FormField'
import FormSection from '~/components/shared/ui/FormSection'
import CarPhotosUpload from '~/components/dashboard/CarPhotosUpload'
import AdminCard from '~/components/shared/ui/AdminCard'
import Toggle from '~/components/shared/ui/Toggle'
import { Input } from '~/components/shared/ui/Input'
import { Select } from '~/components/shared/ui/Select'
import { TruckIcon, PhotoIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import type { BodyType, CarBrand, CarModel, CarTemplate, FuelType } from './car-template-form.types'
import { useCarTemplateFormState } from '~/hooks/useCarTemplateFormState'

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
                            <Select
                                label="Brand"
                                name="brand_id"
                                value={formData.brand_id}
                                onChange={handleChange}
                                required
                                error={errors.brand_id}
                                options={brands.map(brand => ({ id: brand.id, name: brand.name }))}
                            />

                            <Select
                                label="Model"
                                name="model_id"
                                value={formData.model_id}
                                onChange={handleChange}
                                required
                                error={errors.model_id}
                                options={filteredModels.map(model => ({ id: model.id, name: model.name }))}
                            />

                            <Select
                                label="Transmission"
                                name="transmission"
                                value={formData.transmission}
                                onChange={handleChange}
                                required
                                error={errors.transmission}
                                options={[
                                    { id: 'automatic', name: 'Automatic' },
                                    { id: 'manual', name: 'Manual' }
                                ]}
                            />

                            <Select
                                label="Body Type"
                                name="body_type_id"
                                value={formData.body_type_id}
                                onChange={handleChange}
                                required
                                error={errors.body_type_id}
                                options={bodyTypes.map(type => ({ id: type.id, name: type.name }))}
                            />

                            <Select
                                label="Fuel Type"
                                name="fuel_type_id"
                                value={formData.fuel_type_id}
                                onChange={handleChange}
                                required
                                error={errors.fuel_type_id}
                                options={fuelTypes.map(type => ({ id: type.id, name: type.name }))}
                            />

                            <Input
                                label="Engine Volume (L)"
                                type="number"
                                name="engine_volume"
                                value={formData.engine_volume}
                                onChange={handleChange}
                                placeholder="2.0"
                                step="0.1"
                                min="0"
                                required
                                error={errors.engine_volume}
                            />

                            <Input
                                label="Seats"
                                type="number"
                                name="seats"
                                value={formData.seats}
                                onChange={handleChange}
                                placeholder="5"
                                min="1"
                                required
                                error={errors.seats}
                            />

                            <Input
                                label="Doors"
                                type="number"
                                name="doors"
                                value={formData.doors}
                                onChange={handleChange}
                                placeholder="4"
                                min="1"
                                required
                                error={errors.doors}
                            />

                            <Select
                                label="Luggage Capacity"
                                name="luggage_capacity"
                                value={formData.luggage_capacity}
                                onChange={handleChange}
                                required
                                options={[
                                    { id: 'small', name: 'Small' },
                                    { id: 'medium', name: 'Medium' },
                                    { id: 'large', name: 'Large' }
                                ]}
                            />

                            <div className="flex flex-col">
                                <label className="block text-xs text-gray-600 mb-1 ml-1">
                                    Airbags
                                </label>
                                <div className="flex h-11 items-center justify-between rounded-2xl border border-gray-200 bg-white px-4">
                                    <span className="text-sm text-gray-900">{formData.feature_airbags ? "Enabled" : "Disabled"}</span>
                                    <Toggle
                                        checked={formData.feature_airbags}
                                        onCheckedChange={(enabled) => setFormData((prev: typeof formData) => ({ ...prev, feature_airbags: enabled }))}
                                    />
                                </div>
                            </div>

                        </div>
                    </FormSection>

                    <FormSection title="Description" icon={<DocumentTextIcon className="w-5 h-5" />}>
                        <div className="grid grid-cols-1">
                            <FormField label="Description" error={errors.description}>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="block w-full rounded-2xl text-sm py-2.5 px-4 bg-white text-gray-900 border border-gray-200 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 hover:border-gray-300 placeholder:text-xs placeholder:font-normal placeholder:normal-case placeholder:text-gray-400 resize-vertical"
                                    placeholder="Enter template description"
                                    rows={4}
                                />
                            </FormField>
                        </div>
                    </FormSection>
                </div>

                <div className="space-y-4 lg:sticky lg:top-4 h-fit">
                    <AdminCard title="Photos" icon={<PhotoIcon className="w-5 h-5" />}>
                        <p className="text-xs text-gray-500 mb-3">Car Photos</p>
                        <CarPhotosUpload
                            currentPhotos={formData.photos.map(p => p.base64)}
                            onPhotosChange={(p: Array<{ base64: string; fileName: string }>) => handlePhotosChange(p)}
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
