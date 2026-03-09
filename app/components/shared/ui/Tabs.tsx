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
            className={`flex items-center gap-1 bg-white p-1 rounded-full w-fit ${className}`}
            role="tablist"
            aria-label={ariaLabel || "Navigation tabs"}
        >
            {tabs.map((tab, index) => {
                const isActive = activeTab === tab.id
                const tabBaseClass = `h-9 px-5 text-[11px] font-bold uppercase tracking-widest rounded-full transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap select-none`
                const activeStateClass = `bg-gray-900 text-white`
                const inactiveStateClass = `bg-gray-200 text-gray-900 hover:bg-gray-300`
                
                const combinedClass = [
                    tabBaseClass,
                    isActive ? activeStateClass : inactiveStateClass
                ].join(' ')

                if (baseUrl) {
                    return (
                        <a
                            key={tab.id}
                            href={`${baseUrl}?tab=${tab.id}`}
                            className={combinedClass}
                            onClick={(e) => handleClick(e, tab.id)}
                            onKeyDown={(e) => handleKeyDown(e, tab.id, index)}
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={`tabpanel-${tab.id}`}
                            tabIndex={isActive ? 0 : -1}
                        >
                            {tab.label}
                            {tab.count !== undefined && (
                              <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                {tab.count}
                              </span>
                            )}
                        </a>
                    )
                }

                return (
                    <button
                        type="button"
                        key={tab.id}
                        onClick={(e) => handleClick(e, tab.id)}
                        onKeyDown={(e) => handleKeyDown(e, tab.id, index)}
                        className={combinedClass}
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`tabpanel-${tab.id}`}
                        tabIndex={isActive ? 0 : -1}
                    >
                        {tab.label}
                        {tab.count !== undefined && (
                          <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {tab.count}
                          </span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
