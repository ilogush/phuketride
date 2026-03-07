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
    ariaLabel?: string
}

export default function Tabs({ tabs, activeTab, onTabChange, className = '', variant = 'pill', baseUrl, ariaLabel }: TabsProps) {
    if (!tabs || tabs.length === 0) return null

    const handleClick = (e: React.MouseEvent, tabId: string | number) => {
        if (onTabChange) {
            e.preventDefault()
            e.stopPropagation()
            onTabChange(tabId)
        }
        // If baseUrl is provided and no onTabChange, let the link handle navigation
    }

    const handleKeyDown = (e: React.KeyboardEvent, tabId: string | number, index: number) => {
        let nextIndex = index
        
        if (e.key === 'ArrowRight') {
            e.preventDefault()
            nextIndex = (index + 1) % tabs.length
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            nextIndex = (index - 1 + tabs.length) % tabs.length
        } else if (e.key === 'Home') {
            e.preventDefault()
            nextIndex = 0
        } else if (e.key === 'End') {
            e.preventDefault()
            nextIndex = tabs.length - 1
        } else {
            return
        }

        const nextTab = tabs[nextIndex]
        if (onTabChange) {
            onTabChange(nextTab.id)
        }
        
        // Focus next tab button
        const tabElements = document.querySelectorAll('[role="tab"]')
        const nextElement = tabElements[nextIndex] as HTMLElement
        nextElement?.focus()
    }

    return (
        <div 
            className={`flex space-x-1 bg-white p-1 rounded-full shadow-sm w-fit ${className}`}
            role="tablist"
            aria-label={ariaLabel || "Navigation tabs"}
        >
            {tabs.map((tab, index) => {
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
                            onKeyDown={(e) => handleKeyDown(e, tab.id, index)}
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={`tabpanel-${tab.id}`}
                            tabIndex={isActive ? 0 : -1}
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
                        onKeyDown={(e) => handleKeyDown(e, tab.id, index)}
                        className={className}
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`tabpanel-${tab.id}`}
                        tabIndex={isActive ? 0 : -1}
                    >
                        {tab.label}
                    </button>
                )
            })}
        </div>
    )
}
