import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { ClockIcon } from '@heroicons/react/24/outline'
import Card from '~/components/ui/Card'
import SectionHeader from '~/components/ui/SectionHeader'
import Loader from '~/components/ui/Loader'

interface AuditLog {
    id: number
    user_id: string
    role: string
    company_id: number | null
    entity_type: string
    entity_id: string
    action: string
    created_at: string
    users?: {
        name: string
        surname?: string
        email: string
    }
    companies?: {
        name: string
    }
}

export default function RecentActivity() {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchRecentActivity = async () => {
            try {
                const response = await fetch('/api/logs?sortBy=created_at&sortOrder=desc')
                if (response.ok) {
                    const data = await response.json()
                    setLogs(data.data || [])
                }
            } catch (error) {
                console.error('Error fetching recent activity:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchRecentActivity()
    }, [])

    const getActionLabel = (action: string) => {
        const labels: Record<string, string> = {
            create: 'Created',
            update: 'Updated',
            delete: 'Deleted',
            login: 'Logged in',
            correct: 'Corrected'
        }
        return labels[action] || action
    }

    const getEntityLabel = (entityType: string) => {
        const labels: Record<string, string> = {
            car: 'Car',
            contract: 'Contract',
            payment: 'Payment',
            user: 'User',
            company: 'Company',
            location: 'Location',
            district: 'District',
            car_brand: 'Brand',
            car_model: 'Model',
            car_template: 'Template',
            color: 'Color',
            currency: 'Currency',
            payment_status: 'Payment Status',
            payment_type: 'Payment Type',
            booking: 'Booking',
            company_car: 'Company Car',
            company_currencies: 'Company Currencies'
        }
        return labels[entityType] || entityType
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (minutes < 1) return 'Just now'
        if (minutes < 60) return `${minutes}m ago`
        if (hours < 24) return `${hours}h ago`
        if (days < 7) return `${days}d ago`
        return date.toLocaleDateString()
    }

    if (loading) {
        return (
            <Card>
                <SectionHeader>Recent Activity</SectionHeader>
                <div className="flex justify-center items-center py-8">
                    <Loader />
                </div>
            </Card>
        )
    }

    return (
        <Card>
            <SectionHeader
                rightAction={
                    <Link
                        to="/admin/audit-logs"
                        className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        View all
                    </Link>
                }
            >
                Recent Activity
            </SectionHeader>

            {logs.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                    No recent activity
                </div>
            ) : (
                <div className="space-y-2">
                    {logs.map((log) => (
                        <div key={log.id} className="flex items-start space-x-2.5 pb-2.5 border-b border-gray-200 last:border-0 last:pb-0">
                            <div className="flex-shrink-0 mt-0.5">
                                <ClockIcon className="h-3.5 w-3.5 text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900">
                                    <span className="font-medium">
                                        {log.users?.name
                                            ? `${log.users.name}${log.users.surname ? ' ' + log.users.surname : ''}`.trim()
                                            : 'Unknown'}
                                    </span>
                                    {' '}
                                    <span className="text-gray-600">{getActionLabel(log.action).toLowerCase()}</span>
                                    {' '}
                                    <span className="font-medium">{getEntityLabel(log.entity_type)}</span>
                                    {log.company_id && log.companies && (
                                        <>
                                            {' '}
                                            <span className="text-gray-600">in</span>
                                            {' '}
                                            <span className="font-medium">{log.companies.name}</span>
                                        </>
                                    )}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {formatTime(log.created_at)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    )
}
