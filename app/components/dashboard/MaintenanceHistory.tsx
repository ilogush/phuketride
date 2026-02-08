import { useState } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import DataTable, { Column } from '~/components/dashboard/DataTable'
import Button from '~/components/dashboard/Button'
import Modal from '~/components/dashboard/Modal'
import MaintenanceForm from '~/components/dashboard/MaintenanceForm'
import { PlusIcon, WrenchIcon } from '@heroicons/react/24/outline'

interface MaintenanceHistoryProps {
    carId: number
    currentMileage?: number
}

interface MaintenanceRecord {
    id: number
    maintenance_type: string
    description?: string
    cost?: string
    daily_mileage_limit?: number
    mileage?: number
    performed_at: string
    notes?: string
    next_maintenance_date?: string
}

const maintenanceTypeLabels: Record<string, string> = {
    oil_change: 'Oil Change',
    tire_change: 'Tire Change',
    brake_service: 'Brake Service',
    general_service: 'General Service',
    repair: 'Repair',
    inspection: 'Inspection',
    other: 'Other'
}

export default function MaintenanceHistory({ carId, currentMileage }: MaintenanceHistoryProps) {
    const [isFormOpen, setIsFormOpen] = useState(false)

    const { data, error, isLoading, mutate } = useSWR(
        `/api/maintenance?car_id=${carId}`,
        async (url) => {
            const response = await fetch(url)
            if (!response.ok) throw new Error('Failed to fetch maintenance history')
            const result = await response.json()
            return result.data || []
        }
    )

    const handleSuccess = () => {
        setIsFormOpen(false)
        mutate()
    }

    const columns: Column<MaintenanceRecord>[] = [
        {
            key: 'maintenance_type',
            label: 'Type',
            render: (record) => (
                <div>
                    <div className="font-semibold text-gray-900">
                        {maintenanceTypeLabels[record.maintenance_type] || record.maintenance_type}
                    </div>
                    {record.description && (
                        <div className="text-sm text-gray-600 mt-1">{record.description}</div>
                    )}
                </div>
            ),
            wrap: true,
        },
        {
            key: 'performed_at',
            label: 'Date',
            render: (record) => format(new Date(record.performed_at), 'MMM dd, yyyy'),
        },
        {
            key: 'mileage',
            label: 'Mileage',
            render: (record) => record.mileage ? `${record.mileage.toLocaleString()} km` : '-',
            className: 'hidden sm:table-cell',
        },
        {
            key: 'cost',
            label: 'Cost',
            render: (record) => record.cost ? `$${parseFloat(record.cost).toFixed(2)}` : '-',
            className: 'hidden sm:table-cell',
        },
        {
            key: 'notes',
            label: 'Notes',
            render: (record) => (
                <div className="text-sm">
                    {record.daily_mileage_limit && (
                        <div className="text-gray-600">
                            Daily limit: {record.daily_mileage_limit.toLocaleString()} km/day
                        </div>
                    )}
                    {record.notes && (
                        <div className="text-gray-600 mt-1">{record.notes}</div>
                    )}
                    {record.next_maintenance_date && (
                        <div className="text-gray-500 mt-1">
                            Next: {format(new Date(record.next_maintenance_date), 'MMM dd, yyyy')}
                        </div>
                    )}
                </div>
            ),
            wrap: true,
            className: 'hidden lg:table-cell',
        },
    ]

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-600">Failed to load maintenance history</p>
                <Button onClick={() => mutate()} variant="secondary" className="mt-4">
                    Retry
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Maintenance History</h3>
                <Button
                    onClick={() => setIsFormOpen(true)}
                    icon={<PlusIcon className="w-4 h-4" />}
                    variant="primary"
                    size="sm"
                >
                    Add Record
                </Button>
            </div>

            <DataTable
                data={data || []}
                columns={columns}
                totalCount={data?.length || 0}
                isLoading={isLoading}
                disablePagination={true}
                emptyTitle="No maintenance records yet"
                emptyDescription="Click 'Add Record' to create the first one"
                emptyIcon={<WrenchIcon className="w-10 h-10 text-gray-400" />}
            />

            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title="Add Maintenance Record"
                size="lg"
            >
                <MaintenanceForm
                    carId={carId}
                    currentMileage={currentMileage}
                    onSuccess={handleSuccess}
                    onCancel={() => setIsFormOpen(false)}
                />
            </Modal>
        </div>
    )
}
