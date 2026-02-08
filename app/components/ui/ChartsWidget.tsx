import { useState, useEffect } from 'react'
import Card from '~/components/ui/Card'
import SectionHeader from '~/components/ui/SectionHeader'
import Loader from '~/components/ui/Loader'

interface ChartData {
    activityByDay: Array<{ date: string; count: number }>
    companiesByLocation: Array<{ location: string; count: number }>
    contractStats: {
        active: number
        completed: number
        pending: number
    }
}

export default function ChartsWidget() {
    const [data, setData] = useState<ChartData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchChartData = async () => {
            try {
                const response = await fetch('/api/metrics/dashboard-charts')
                if (response.ok) {
                    const result = await response.json() as { success: boolean; data: ChartData }
                    setData(result.data)
                }
            } catch (error) {
                console.error('Error fetching chart data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchChartData()
    }, [])

    if (loading) {
        return (
            <Card>
                <SectionHeader>Statistics</SectionHeader>
                <div className="flex justify-center items-center py-12">
                    <Loader />
                </div>
            </Card>
        )
    }

    if (!data) {
        return (
            <Card>
                <SectionHeader>Statistics</SectionHeader>
                <div className="text-center py-12 text-gray-500 text-sm">
                    No data available
                </div>
            </Card>
        )
    }

    return (
        <Card>
            <SectionHeader>Statistics</SectionHeader>

            <div className="space-y-4">
                {/* Contract Stats */}
                <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Contract Status</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-green-50 rounded-3xl p-4">
                            <div className="text-2xl font-bold text-green-600">
                                {data.contractStats.active}
                            </div>
                            <div className="text-xs text-green-700 mt-1">Active</div>
                        </div>
                        <div className="bg-blue-50 rounded-3xl p-4">
                            <div className="text-2xl font-bold text-blue-600">
                                {data.contractStats.completed}
                            </div>
                            <div className="text-xs text-blue-700 mt-1">Completed</div>
                        </div>
                        <div className="bg-yellow-50 rounded-3xl p-4">
                            <div className="text-2xl font-bold text-yellow-600">
                                {data.contractStats.pending}
                            </div>
                            <div className="text-xs text-yellow-700 mt-1">Pending</div>
                        </div>
                    </div>
                </div>

                {/* Companies by Location */}
                {data.companiesByLocation.length > 0 && (
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Companies by Location</h3>
                        <div className="space-y-2">
                            {data.companiesByLocation.map((item) => (
                                <div key={item.location} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">{item.location}</span>
                                    <span className="text-sm font-medium text-gray-900">{item.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Activity by Day */}
                {data.activityByDay.length > 0 && (
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-3">7-Day Activity</h3>
                        <div className="space-y-2">
                            {data.activityByDay.map((item) => (
                                <div key={item.date} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">
                                        {new Date(item.date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full"
                                                style={{ width: `${Math.min(100, (item.count / 10) * 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium text-gray-900 w-8 text-right">
                                            {item.count}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
}
