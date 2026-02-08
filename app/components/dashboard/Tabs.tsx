export interface Tab {
    id: string | number
    label: string
    count?: number
}

interface TabsProps {
    tabs: Tab[]
    activeTab: string | number
    onTabChange?: (tabId: string | number) => void
    className?: string
    variant?: 'pill' | 'underline'
    baseUrl?: string
}

export default function Tabs({ tabs, activeTab, onTabChange, className = '', variant = 'pill', baseUrl }: TabsProps) {
    if (!tabs || tabs.length === 0) return null

    const handleClick = (e: React.MouseEvent, tabId: string | number) => {
        if (onTabChange) {
            e.preventDefault()
            e.stopPropagation()
            console.log('Tab clicked:', tabId)
            onTabChange(tabId)
        }
        // If baseUrl is provided and no onTabChange, let the link handle navigation
    }

    return (
        <div className={`flex space-x-1 bg-white p-1 rounded-full shadow-sm w-fit ${className}`}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id
                const className = `px-3 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                        ? 'text-white bg-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`

                if (baseUrl) {
                    return (
                        <a
                            key={tab.id}
                            href={`${baseUrl}?tab=${tab.id}`}
                            className={className}
                            onClick={(e) => handleClick(e, tab.id)}
                        >
                            {tab.label}
                        </a>
                    )
                }

                return (
                    <button
                        type="button"
                        key={tab.id}
                        onClick={(e) => handleClick(e, tab.id)}
                        className={className}
                    >
                        {tab.label}
                    </button>
                )
            })}
        </div>
    )
}
