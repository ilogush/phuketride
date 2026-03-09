import { useState } from 'react'
import { useNavigate } from 'react-router'
import Button from '~/components/shared/ui/Button'
import FormField from '~/components/shared/ui/FormField'
import { Input } from '~/components/shared/ui/Input'
import { Textarea } from '~/components/shared/ui/Textarea'
import { useAsyncToastAction } from '~/lib/useAsyncToastAction'
import { useDateMasking } from '~/lib/useDateMasking'
import { formatDateTimeForDisplay, parseDateTimeFromDisplay } from '~/lib/formatters'

interface MaintenanceFormProps {
    carId: number
    currentMileage?: number
    onSuccess?: () => void
    onCancel?: () => void
}

const maintenanceTypes = [
    { value: 'oil_change', label: 'Oil Change' },
    { value: 'tire_change', label: 'Tire Change' },
    { value: 'brake_service', label: 'Brake Service' },
    { value: 'general_service', label: 'General Service' },
    { value: 'repair', label: 'Repair' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'other', label: 'Other' }
]

export default function MaintenanceForm({
    carId,
    currentMileage = 0,
    onSuccess,
    onCancel
}: MaintenanceFormProps) {
    const navigate = useNavigate()
    const { notifyError, run } = useAsyncToastAction()
    const { maskDateTimeInput } = useDateMasking()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        daily_mileage_limit: '',
        maintenance_type: 'oil_change',
        description: '',
        mileage: currentMileage.toString(),
        cost: '',
        notes: '',
        performed_at: formatDateTimeForDisplay(new Date()),
        next_maintenance_date: ''
    })

    const [errors, setErrors] = useState<Record<string, string>>({})

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }))
        }
    }

    const validate = () => {
        const newErrors: Record<string, string> = {}

        if (!formData.maintenance_type) {
            newErrors.maintenance_type = 'Maintenance type is required'
        }

        if (!formData.mileage || parseInt(formData.mileage) < 0) {
            newErrors.mileage = 'Valid mileage is required'
        }

        if (formData.cost && parseFloat(formData.cost) < 0) {
            newErrors.cost = 'Cost must be positive'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validate()) {
            await notifyError('Please fix validation errors')
            return
        }

        setIsSubmitting(true)

        await run(
            async () => {
                const response = await fetch('/api/maintenance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        company_car_id: carId,
                        maintenance_type: formData.maintenance_type,
                        description: formData.description || undefined,
                        mileage: parseInt(formData.mileage),
                        cost: formData.cost ? parseFloat(formData.cost) : undefined,
                        notes: formData.notes || undefined,
                        performed_at: parseDateTimeFromDisplay(formData.performed_at),
                        next_maintenance_date: formData.next_maintenance_date
                            ? parseDateTimeFromDisplay(formData.next_maintenance_date)
                            : undefined
                    })
                })

                if (!response.ok) {
                    const errorData = (await response.json()) as { error?: string }
                    throw new Error(errorData.error || 'Failed to create maintenance record')
                }

                return response
            },
            {
                successMessage: 'Maintenance record created successfully',
                errorMessage: 'Failed to create maintenance record',
                onSuccess: async () => {
                    onSuccess?.()
                },
            }
        )

        setIsSubmitting(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Daily Mileage Limit (km)" error={errors.daily_mileage_limit}>
                <Input
                    type="number"
                    value={formData.daily_mileage_limit}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('daily_mileage_limit', e.target.value)}
                    min={0}
                    placeholder="Optional daily mileage limit"
                />
            </FormField>

            <FormField label="Maintenance Type" required error={errors.maintenance_type}>
                <select
                    value={formData.maintenance_type}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('maintenance_type', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {maintenanceTypes.map(type => (
                        <option key={type.value} value={type.value}>
                            {type.label}
                        </option>
                    ))}
                </select>
            </FormField>

            <FormField label="Description">
                <Input
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('description', e.target.value)}
                    placeholder="Brief description of the maintenance"
                />
            </FormField>

            <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2">
                    <FormField label="Mileage (km)" required error={errors.mileage}>
                        <Input
                            type="number"
                            value={formData.mileage}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('mileage', e.target.value)}
                            min={0}
                        />
                    </FormField>
                </div>

                <div className="col-span-2">
                    <FormField label="Cost" error={errors.cost}>
                        <Input
                            type="number"
                            value={formData.cost}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('cost', e.target.value)}
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                        />
                    </FormField>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2">
                    <FormField label="Performed At" required>
                        <Input
                            type="text"
                            value={formData.performed_at}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                maskDateTimeInput(e)
                                handleChange('performed_at', e.target.value)
                            }}
                            placeholder="DD/MM/YYYY HH:mm"
                        />
                    </FormField>
                </div>

                <div className="col-span-2">
                    <FormField label="Next Maintenance Date">
                        <Input
                            type="text"
                            value={formData.next_maintenance_date}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                maskDateTimeInput(e)
                                handleChange('next_maintenance_date', e.target.value)
                            }}
                            placeholder="DD/MM/YYYY HH:mm"
                        />
                    </FormField>
                </div>
            </div>

            <FormField label="Notes">
                <Textarea
                    value={formData.notes}
                    onChange={(value: string) => handleChange('notes', value)}
                    rows={3}
                    placeholder="Additional notes about the maintenance"
                />
            </FormField>

            <div className="flex justify-end space-x-2 pt-4 border-t">
                {onCancel && (
                    <Button
                        type="button"
                        onClick={onCancel}
                        variant="outline"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                )}
                <Button
                    type="submit"
                    variant="solid"
                    loading={isSubmitting}
                >
                    Create Maintenance Record
                </Button>
            </div>
        </form>
    )
}
