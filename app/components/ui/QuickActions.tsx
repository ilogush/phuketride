import { Link } from 'react-router'
import {
    PlusIcon,
    BuildingOfficeIcon,
    UserPlusIcon,
    MapPinIcon,
    TruckIcon,
    PaintBrushIcon
} from '@heroicons/react/24/outline'
import Card from '~/components/ui/Card'
import SectionHeader from '~/components/ui/SectionHeader'

export default function QuickActions() {
    const actions = [
        {
            name: 'Create Company',
            href: '/dashboard/companies/create',
            icon: BuildingOfficeIcon
        },
        {
            name: 'Create User',
            href: '/dashboard/users/create',
            icon: UserPlusIcon
        },
        {
            name: 'Create Location',
            href: '/dashboard/locations/create',
            icon: MapPinIcon
        },
        {
            name: 'Create Color',
            href: '/dashboard/colors/create',
            icon: PaintBrushIcon
        }
    ]

    return (
        <Card>
            <SectionHeader>Quick Actions</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {actions.map((action) => {
                    const Icon = action.icon
                    return (
                        <Link
                            key={action.name}
                            to={action.href}
                            className="flex items-center space-x-2.5 p-3 rounded-lg border border-gray-200 transition-colors bg-white text-gray-900 hover:bg-gray-50 hover:border-gray-200"
                        >
                            <Icon className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium">{action.name}</span>
                        </Link>
                    )
                })}
            </div>
        </Card>
    )
}
