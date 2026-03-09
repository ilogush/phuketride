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
            <div className={`bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-4 flex flex-col justify-between h-[120px] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:ring-black/10 transition-all duration-300 cursor-pointer ${className}`}>
                <div className="flex justify-between items-start">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{name}</span>
                    {icon && (
                        <div className={`${currentColor.bg} rounded-xl p-2`}>
                            <div className={`h-5 w-5 ${currentColor.icon}`}>{icon}</div>
                        </div>
                    )}
                </div>
                <div>
                    <div className="text-2xl font-bold text-gray-900 leading-none">{value}</div>
                    {subtext && (
                        <div className="text-[11px] text-gray-400 mt-1 font-medium">{subtext}</div>
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
            <div className={`bg-white rounded-[2rem] p-7 ring-1 ring-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between h-40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 group ${className}`}>
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-0.5 mt-1">
                        <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">{name}</span>
                        <div className={`h-0.5 w-4 rounded-full ${currentColor.bg.replace('bg-', 'bg-').replace('50', '200')}`} />
                    </div>
                    {icon && (
                        <div className={`p-2.5 ${currentColor.bg} rounded-xl transition-all group-hover:scale-110 duration-300 ring-1 ring-white/50`}>
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
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {subtext}
                            </div>
                        )}
                        {trend && (
                            <div className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-md ${trend.isPositive ? 'text-green-600' : 'text-red-500'}`}>
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
        <div className={`bg-white rounded-[2rem] ring-1 ring-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 ${className} hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:ring-black/10 transition-all duration-300 cursor-pointer`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">{name}</p>
                    <p className="text-3xl font-bold text-gray-900 tracking-tight leading-none">{value}</p>

                    {subtext && !trend && (
                        <p className="text-[11px] font-medium text-gray-400 mt-2">{subtext}</p>
                    )}

                    {trend && (
                        <div className={`flex items-center mt-3 text-[11px] font-bold uppercase tracking-widest ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {trend.isPositive ? (
                                <ArrowTrendingUpIcon className="h-3.5 w-3.5 mr-1" />
                            ) : (
                                <ArrowTrendingDownIcon className="h-3.5 w-3.5 mr-1" />
                            )}
                            <span>{Math.abs(trend.value)}%</span>
                            {subtext && (
                                <span className="text-gray-400 ml-2">{subtext}</span>
                            )}
                        </div>
                    )}
                </div>

                {icon && (
                    <div className={`${currentColor.bg} rounded-xl p-3 ring-1 ring-white/50`}>
                        <div className={`h-7 w-7 ${currentColor.icon}`}>
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
