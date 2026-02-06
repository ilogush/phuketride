import { Link } from 'react-router'
import { ChevronRightIcon } from '@heroicons/react/24/outline'

interface BreadcrumbItem {
    label: string
    href?: string
}

interface BreadcrumbProps {
    items: BreadcrumbItem[]
    className?: string
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
    return (
        <nav className={`flex ${className}`} aria-label="Breadcrumb">
            <ol className="flex items-center space-x-1">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1

                    return (
                        <li key={index} className="flex items-center">
                            {index > 0 && (
                                <ChevronRightIcon className="h-4 w-4 text-gray-500 mx-1" />
                            )}

                            {item.href ? (
                                <Link
                                    to={item.href}
                                    className={`text-sm font-medium ${isLast
                                            ? 'text-gray-900'
                                            : 'text-gray-500 hover:text-gray-500'
                                        }`}
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span className="text-sm font-medium text-gray-900">
                                    {item.label}
                                </span>
                            )}
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}
