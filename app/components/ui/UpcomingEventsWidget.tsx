import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import {
    CalendarIcon,
    ClockIcon,
    DocumentTextIcon,
    CurrencyDollarIcon,
    WrenchScrewdriverIcon
} from '@heroicons/react/24/outline'
import Card from '~/components/ui/Card'
import SectionHeader from '~/components/ui/SectionHeader'
import Loader from '~/components/ui/Loader'

interface Event {
    id: number
    title: string
    type: 'contract' | 'booking' | 'payment' | 'maintenance' | 'document'
    date: string
    status: 'upcoming' | 'today' | 'overdue'
}

interface UpcomingEventsWidgetProps {
    companyId?: number
    limit?: number
}

export default function UpcomingEventsWidget({ companyId, limit = 5 }: UpcomingEventsWidgetProps) {
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const params = new URLSearchParams({
                    limit: limit.toString(),
                    ...(companyId && { companyId: companyId.toString() })
                })
                const response = await fetch(`/api/calendar-events?${params}`)
                if (response.ok) {
                    const data = await response.json()
                    setEvents(data.data || [])
                }
            } catch (error) {
                console.error('Error fetching events:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchEvents()
    }, [companyId, limit])

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'contract':
                return DocumentTextIcon
            case 'payment':
                return CurrencyDollarIcon
            case 'maintenance':
                return WrenchScrewdriverIcon
            default:
                return CalendarIcon
        }
    }

    const getEventColor = (type: string) => {
        switch (type) {
            case 'contract':
                return 'text-blue-600 bg-blue-50'
            case 'payment':
                return 'text-green-600 bg-green-50'
            case 'maintenance':
                return 'text-orange-600 bg-orange-50'
            default:
                return 'text-gray-600 bg-gray-50'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'today':
                return 'Today'
            case 'overdue':
                return 'Overdue'
            default:
                return 'Upcoming'
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'today':
                return 'text-blue-600 bg-blue-50'
            case 'overdue':
                return 'text-red-600 bg-red-50'
            default:
                return 'text-gray-600 bg-gray-50'
        }
    }

    if (loading) {
        return (
            <Card>
                <SectionHeader>Upcoming Events</SectionHeader>
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
                        to="/calendar"
                        className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        View All
                    </Link>
                }
            >
                Upcoming Events
            </SectionHeader>

            {events.length === 0 ? (
                <div className="text-center py-8">
                    <div className="bg-gray-50 p-4 rounded-full inline-flex mb-3">
                        <CalendarIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">No upcoming events</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {events.map((event) => {
                        const Icon = getEventIcon(event.type)
                        return (
                            <div
                                key={event.id}
                                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${getEventColor(event.type)}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {event.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <ClockIcon className="h-3.5 w-3.5 text-gray-400" />
                                        <span className="text-xs text-gray-500">
                                            {new Date(event.date).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(event.status)}`}>
                                            {getStatusLabel(event.status)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </Card>
    )
}
