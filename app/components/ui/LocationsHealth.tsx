import { Link } from 'react-router'
import { MapPinIcon } from '@heroicons/react/24/outline'
import Card from '~/components/ui/Card'
import SectionHeader from '~/components/ui/SectionHeader'
import DataTable, { Column } from '~/components/ui/DataTable'
import StatusBadge from '~/components/ui/StatusBadge'

interface Location {
    id: number
    name: string
    companiesCount: number
    carsCount: number
}

interface LocationsHealthProps {
    locations: Location[]
}

export default function LocationsHealth({ locations }: LocationsHealthProps) {
    const columns: Column<Location>[] = [
        {
            key: 'name',
            label: 'Location',
            render: (location) => (
                <div className="flex items-center">
                    <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                        {location.name}
                    </span>
                </div>
            ),
        },
        {
            key: 'companiesCount',
            label: 'Companies',
        },
        {
            key: 'carsCount',
            label: 'Cars',
        },
        {
            key: 'status',
            label: 'Status',
            render: (location) => {
                const isActive = location.companiesCount > 0
                return (
                    <StatusBadge variant={isActive ? 'success' : 'neutral'}>
                        {isActive ? 'Active' : 'No data'}
                    </StatusBadge>
                )
            },
        },
    ]

    return (
        <Card>
            <SectionHeader
                rightAction={
                    <Link
                        to="/locations"
                        className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        View all
                    </Link>
                }
            >
                Locations Health
            </SectionHeader>

            <DataTable
                data={locations}
                columns={columns}
                totalCount={locations.length}
                disablePagination={true}
                emptyTitle="No locations available"
                emptyDescription="Locations will appear here once added"
                emptyIcon={
                    <div className="bg-gray-50 p-4 rounded-full inline-flex">
                        <MapPinIcon className="h-8 w-8 text-gray-400" />
                    </div>
                }
            />
        </Card>
    )
}
