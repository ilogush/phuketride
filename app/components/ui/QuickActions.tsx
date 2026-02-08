import { Link } from 'react-router'
import {
    PlusIcon,
    BuildingOfficeIcon,
    UserPlusIcon,
    MapPinIcon,
    TruckIcon,
    PaintBrushIcon,
    ClipboardDocumentListIcon
} from '@heroicons/react/24/outline'
import Card from '~/components/ui/Card'
import SectionHeader from '~/components/ui/SectionHeader'

interface QuickActionsProps {
    userRole?: 'admin' | 'partner' | 'manager' | 'user'
}

export default function QuickActions({ userRole = 'admin' }: QuickActionsProps) {
    // Define actions based on user role
    const adminActions = [
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

    const partnerActions = [
        {
            name: 'Add',
            href: '/dashboard/cars/create',
            icon: TruckIcon
        },
        {
            name: 'New Contract',
            href: '/dashboard/contracts/create',
            icon: ClipboardDocumentListIcon
        },
        {
            name: 'Add Manager',
            href: '/dashboard/users/create',
            icon: UserPlusIcon
        }
    ]

    const managerActions = [
        {
            name: 'New Contract',
            href: '/dashboard/contracts/create',
            icon: ClipboardDocumentListIcon
        },
        {
            name: 'Add',
            href: '/dashboard/cars/create',
            icon: TruckIcon
        }
    ]

    const userActions = [
        {
            name: 'Search Cars',
            href: '/dashboard/search-cars',
            icon: TruckIcon
        }
    ]

    // Select actions based on role
    let actions = adminActions
    if (userRole === 'partner') actions = partnerActions
    else if (userRole === 'manager') actions = managerActions
    else if (userRole === 'user') actions = userActions

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
                            className="flex items-center space-x-2.5 p-3 rounded-lg transition-colors bg-white text-gray-900 hover:bg-gray-50 hover:border-gray-200"
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
