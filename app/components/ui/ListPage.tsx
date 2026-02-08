import { ReactNode } from 'react'
import { Link } from 'react-router'
import PageHeader from './PageHeader'
import Tabs from './Tabs'
import DataTable, { type Column } from './DataTable'
import Button from './Button'
import { PlusIcon } from '@heroicons/react/24/outline'

interface Tab {
    id: string
    label: string
    count?: number
}

interface AddButton {
    label: string
    href: string
    icon?: ReactNode
}

interface EmptyState {
    title: string
    description?: string
    icon?: ReactNode
}

interface ListPageProps<T> {
    title: string
    data: T[]
    columns: Column<T>[]
    tabs?: Tab[]
    activeTab?: string
    onTabChange?: (tabId: string) => void
    addButton?: AddButton
    rightActions?: ReactNode
    emptyState?: EmptyState
    totalCount?: number
    searchValue?: string
    onSearchChange?: (value: string) => void
    searchPlaceholder?: string
}

export default function ListPage<T>({
    title,
    data,
    columns,
    tabs,
    activeTab,
    onTabChange,
    addButton,
    rightActions,
    emptyState,
    totalCount,
    searchValue,
    onSearchChange,
    searchPlaceholder
}: ListPageProps<T>) {
    // Build right actions
    let finalRightActions = rightActions

    if (!finalRightActions && addButton) {
        finalRightActions = (
            <Link to={addButton.href}>
                <Button 
                    variant="primary" 
                    icon={addButton.icon || <PlusIcon className="w-5 h-5" />}
                >
                    {addButton.label}
                </Button>
            </Link>
        )
    }

    return (
        <div className="space-y-4">
            <PageHeader
                title={title}
                rightActions={finalRightActions}
                withSearch={!!onSearchChange}
                searchValue={searchValue}
                onSearchChange={onSearchChange}
                searchPlaceholder={searchPlaceholder}
            />

            {tabs && tabs.length > 0 && (
                <Tabs 
                    tabs={tabs} 
                    activeTab={activeTab || tabs[0].id} 
                    onTabChange={onTabChange || (() => {})} 
                />
            )}

            <DataTable
                data={data}
                columns={columns}
                totalCount={totalCount || data.length}
                emptyTitle={emptyState?.title || 'No items found'}
                emptyDescription={emptyState?.description}
                emptyIcon={emptyState?.icon}
            />
        </div>
    )
}
