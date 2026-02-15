import { useState, useEffect } from 'react'
import DataTable, { type Column } from '~/components/dashboard/DataTable'
import Loader from '~/components/dashboard/Loader'

interface Season {
    id: string | number
    name: string
    start_date: string
    end_date: string
    price_coefficient: number
}

interface DurationRange {
    id: string | number
    name: string
    min_days: number
    max_days: number
    price_coefficient: number
}

interface PricingMatrixRow {
    season: string
    period: string
    coefficient: number
    [key: string]: any
}

const DEFAULT_SEASONS: Season[] = [
    { id: 'default', name: 'Standard Price', start_date: '01-01', end_date: '12-31', price_coefficient: 1.0 }
]

const DEFAULT_DURATION_RANGES: DurationRange[] = [
    { id: 1, name: '1-3 days', min_days: 1, max_days: 3, price_coefficient: 1.0 },
    { id: 2, name: '4-7 days', min_days: 4, max_days: 7, price_coefficient: 0.95 },
    { id: 3, name: '8-14 days', min_days: 8, max_days: 14, price_coefficient: 0.90 },
    { id: 4, name: '15-30 days', min_days: 15, max_days: 30, price_coefficient: 0.85 },
    { id: 5, name: '31-60 days', min_days: 31, max_days: 60, price_coefficient: 0.80 },
    { id: 6, name: '61+ days', min_days: 61, max_days: 999, price_coefficient: 0.75 }
]

const formatPrice = (price: number): string => {
    return `$${price.toFixed(2)}`
}

const sortSeasonsByPriority = (seasons: Season[]): Season[] => {
    return [...seasons].sort((a, b) => b.price_coefficient - a.price_coefficient)
}

const generatePricingMatrix = (
    pricePerDay: number,
    seasons: Season[],
    durations: DurationRange[]
): PricingMatrixRow[] => {
    return seasons.map(season => {
        const row: PricingMatrixRow = {
            season: season.name,
            period: `${season.start_date} - ${season.end_date}`,
            coefficient: season.price_coefficient
        }

        durations.forEach(duration => {
            const dailyPrice = pricePerDay * season.price_coefficient * duration.price_coefficient
            const totalPrice = dailyPrice * duration.max_days

            row[`duration_${duration.id}`] = {
                daily: dailyPrice,
                total: totalPrice,
                maxDays: duration.max_days
            }
        })

        return row
    })
}

interface SeasonalPricingTableProps {
    pricePerDay: number
    companyId?: string | null
    adminMode?: boolean
}

type CompanyResponse = {
    location_id?: number | null
    settings?: { duration_ranges?: DurationRange[] }
}

type SeasonsResponse = { data?: Season[] }

export default function SeasonalPricingTable({
    pricePerDay,
    companyId,
    adminMode
}: SeasonalPricingTableProps) {
    const [seasons, setSeasons] = useState<Season[]>([])
    const [durations, setDurations] = useState<DurationRange[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)

                setDurations(DEFAULT_DURATION_RANGES.slice(0, 6))
                setSeasons(DEFAULT_SEASONS)

                if (!companyId) {
                    setLoading(false)
                    return
                }

                const companyRes = await fetch(`/api/companies/${companyId}`)
                if (!companyRes.ok) {
                    setLoading(false)
                    return
                }

                const companyData = (await companyRes.json()) as CompanyResponse
                const locationId = companyData.location_id

                if (locationId) {
                    const seasonsRes = await fetch(`/api/location-seasons?locationId=${locationId}`)
                    if (seasonsRes.ok) {
                        const seasonsData = (await seasonsRes.json()) as SeasonsResponse
                        if (seasonsData.data && seasonsData.data.length > 0) {
                            const sortedSeasons = sortSeasonsByPriority(seasonsData.data)
                            setSeasons(sortedSeasons.slice(0, 4))
                        }
                    }
                }

                if (companyData.settings?.duration_ranges) {
                    const ranges = companyData.settings.duration_ranges.slice(0, 6).map((range) => ({
                        ...range,
                        price_coefficient: 1.0
                    }))
                    setDurations(ranges)
                }

            } catch (error) {
                // Silently handle error
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [companyId])

    if (loading) {
        return (
            <div>
                <h4 className="block text-xs font-medium text-gray-500 mb-1">Seasonal Pricing Matrix</h4>
                <div className="flex justify-center items-center py-8">
                    <Loader />
                </div>
            </div>
        )
    }

    if (durations.length === 0) {
        return (
            <div>
                <h4 className="block text-xs font-medium text-gray-500 mb-1">Seasonal Pricing Matrix</h4>
                <div className="text-center py-8 text-gray-400">
                    <p>No pricing data available</p>
                    <p className="text-xs mt-1">Configure rental durations to display pricing matrix</p>
                </div>
            </div>
        )
    }

    const displaySeasons = seasons.length > 0 ? seasons.slice(0, 4) : DEFAULT_SEASONS

    const tableData: PricingMatrixRow[] = generatePricingMatrix(pricePerDay, displaySeasons, durations)

    const columns: Column<PricingMatrixRow>[] = [
        {
            key: 'season',
            label: 'Season',
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">{row.season}</span>
                    <span className="text-xs text-gray-500 mt-0.5">{row.period}</span>
                    <span className="text-xs text-gray-500 mt-0.5">
                        {row.coefficient === 1 ? 'Base Rate' :
                            row.coefficient > 1 ? `+${Math.round((row.coefficient - 1) * 100)}%` :
                                `${Math.round((row.coefficient - 1) * 100)}%`}
                    </span>
                </div>
            )
        },
        ...durations.map((duration) => ({
            key: `duration_${duration.id}`,
            label: duration.name,
            className: 'text-left',
            render: (row: PricingMatrixRow) => {
                const priceData = row[`duration_${duration.id}`]
                if (!priceData) return '-'

                return (
                    <div className="flex flex-col items-start">
                        <span className="font-bold text-gray-900">
                            {formatPrice(priceData.daily)}
                        </span>
                        <span className="text-xs text-gray-500">per day</span>
                        <div className="mt-1 pt-1 w-full text-left">
                            <span className="font-semibold text-gray-900">
                                {formatPrice(priceData.total)}
                            </span>
                            <span className="text-xs text-gray-500 block">
                                for {priceData.maxDays} days
                            </span>
                        </div>
                    </div>
                )
            }
        }))
    ]

    return (
        <div>
            <h4 className="block text-xs font-medium text-gray-500 mb-1">Seasonal Pricing Matrix</h4>

            <DataTable
                columns={columns}
                data={tableData}
                totalCount={tableData.length}
                isLoading={false}
                disablePagination={true}
            />

            <p className="mt-3 text-xs text-gray-400 italic">
                * Prices may be automatically adjusted based on market demand.
            </p>
        </div>
    )
}
