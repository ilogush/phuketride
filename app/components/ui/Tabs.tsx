export interface Tab {
    id: string | number
    label: string
    count?: number
}

interface TabsProps {
    tabs: Tab[]
    activeTab: string | number
    onTabChange: (tabId: string | number) => void
    className?: string
    variant?: 'pill' | 'underline'
}

export default function Tabs({ tabs, activeTab, onTabChange, className = '', variant = 'pill' }: TabsProps) {
    if (!tabs || tabs.length === 0) return null

    return (
        <div className={`flex space-x-1 bg-white p-1 rounded-full shadow-sm w-fit ${className}`}>
            {tabs.map((tab) => (
                <button
                    type="button"
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === tab.id
                        ? 'text-white bg-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                        }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    )
}
