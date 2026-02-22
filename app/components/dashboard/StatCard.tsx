import { Link } from 'react-router'
import type { ReactNode } from 'react'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline'

interface StatCardProps {
    name: string
    value: string | number
    subtext?: string
    icon?: ReactNode
    href?: string
    className?: string
    variant?: 'compact' | 'default' | 'detailed'
    trend?: {
        value: number
        isPositive: boolean
    }
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral'
}

export default function StatCard({
    name,
    value,
    subtext,
    icon,
    href,
    className = '',
    variant = 'default',
    trend,
    color = 'neutral'
}: StatCardProps) {
    const colorClasses = {
        primary: {
            bg: 'bg-blue-50',
            icon: 'text-blue-600',
            border: 'border-blue-200'
        },
        secondary: {
            bg: 'bg-gray-50',
            icon: 'text-gray-600',
            border: 'border-gray-200'
        },
        success: {
            bg: 'bg-green-50',
            icon: 'text-green-600',
            border: 'border-green-200'
        },
        warning: {
            bg: 'bg-yellow-50',
            icon: 'text-yellow-600',
            border: 'border-yellow-200'
        },
        error: {
            bg: 'bg-red-50',
            icon: 'text-red-600',
            border: 'border-red-200'
        },
        neutral: {
            bg: 'bg-gray-100',
            icon: 'text-gray-700',
            border: 'border-gray-200'
        }
    }

    const currentColor = colorClasses[color]

    // Compact variant (120px height, simple)
    if (variant === 'compact') {
        const content = (
            <div className={`bg-white rounded-3xl p-4 flex flex-col justify-between h-[120px] hover:shadow-md transition-shadow cursor-pointer ${className}`}>
                <div className="flex justify-between items-start">
                    <span className="text-xs text-gray-500 font-medium">{name}</span>
                    {icon && (
                        <div className={`${currentColor.bg} rounded-xl p-2`}>
                            <div className={`h-6 w-6 ${currentColor.icon}`}>{icon}</div>
                        </div>
                    )}
                </div>
                <div>
                    <div className="text-2xl font-semibold text-gray-800">{value}</div>
                    {subtext && (
                        <div className="text-xs text-gray-500 mt-0.5">{subtext}</div>
                    )}
                </div>
            </div>
        )

        if (href) {
            return <Link to={href}>{content}</Link>
        }
        return content
    }

    // Detailed variant (160px height, with trend and enhanced styling)
    if (variant === 'detailed') {
        const content = (
            <div className={`bg-white rounded-3xl p-7 shadow-sm flex flex-col justify-between h-40 hover:shadow-xl hover:-translate-y-1 transition-all border border-gray-100 group ${className}`}>
                <div className="flex justify-between items-start">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">{name}</span>
                    {icon && (
                        <div className="p-2.5 bg-gray-50/50 border border-gray-100 rounded-xl transition-all group-hover:bg-gray-100">
                            <div className={`h-6 w-6 ${currentColor.icon}`}>
                                {icon}
                            </div>
                        </div>
                    )}
                </div>
                <div>
                    <div className="text-4xl font-bold text-gray-900 tracking-tight leading-none mb-2">{value}</div>
                    <div className="flex items-center gap-3 mt-1">
                        {subtext && (
                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                {subtext}
                            </div>
                        )}
                        {trend && (
                            <div className={`text-xs font-bold uppercase tracking-wide flex items-center gap-2${trend.isPositive ? 'text-green-600' : 'text-red-500'}`}>
                                {trend.isPositive ? '↑' : '↓'} {trend.value}%
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )

        if (href) {
            return <Link to={href} className="block">{content}</Link>
        }
        return content
    }

    // Default variant (standard card with optional trend)
    const content = (
        <div className={`bg-white rounded-3xl border ${currentColor.border} p-4 ${className} hover:border-gray-300 transition-colors cursor-pointer`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">{name}</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>

                    {subtext && !trend && (
                        <p className="text-xs text-gray-500 mt-1">{subtext}</p>
                    )}

                    {trend && (
                        <div className={`flex items-center mt-2 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {trend.isPositive ? (
                                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                            ) : (
                                <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                            )}
                            <span>{Math.abs(trend.value)}%</span>
                            {subtext && (
                                <span className="text-gray-500 ml-2">{subtext}</span>
                            )}
                        </div>
                    )}
                </div>

                {icon && (
                    <div className={`${currentColor.bg} rounded-xl p-3`}>
                        <div className={`h-6 w-6 ${currentColor.icon}`}>
                            {icon}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )

    if (href) {
        return <Link to={href}>{content}</Link>
    }

    return content
}
