import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router'
import DataTable, { type Column, type Tab } from '~/components/dashboard/DataTable'
import IdBadge from '~/components/dashboard/IdBadge'
import Button from '~/components/dashboard/Button'
import { format } from 'date-fns'
import { useToast } from '~/lib/toast'

interface Payment {
    id: number
    amount: number
    payment_date: string
    payment_method: string
    notes: string
    created_at: string
    created_by: string
    payment_statuses: {
        name: string
        value: string
    }
    payment_types: {
        name: string
        sign: '+' | '-'
    }
    contracts: {
        id: number
        client: {
            name: string
            surname: string
        }
    }
    creator?: {
        name: string
        surname: string
    }
}

type PaymentsResponse = { data: Payment[]; totalCount: number }
type FetchParams = Parameters<Tab<Payment>['fetchData']>[0]

export default function PaymentsTable({ searchQuery = '' }: { searchQuery?: string }) {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const toast = useToast()
    const companyId = searchParams.get('company_id')
    const adminMode = searchParams.get('admin_mode')
    const [user, setUser] = useState<{ role?: string; companyId?: number | null; company_id?: number | null } | null>(null)

    useEffect(() => {
        async function fetchUser() {
            try {
                const response = await fetch('/api/user')
                if (response.ok) {
                    const userData = await response.json()
                    setUser(userData as { role?: string; companyId?: number | null; company_id?: number | null })
                }
            } catch {
                setUser(null)
            }
        }
        fetchUser()
    }, [])

    const fetchPayments = async (params: FetchParams, sign?: string): Promise<PaymentsResponse> => {
        try {
            const queryParams = new URLSearchParams({
                page: params.page.toString(),
                pageSize: params.pageSize.toString(),
            })

            if (params.sortBy) {
                queryParams.set('sortBy', params.sortBy)
                queryParams.set('sortOrder', params.sortOrder || 'desc')
            }

            let effectiveCompanyId = companyId
            const userCompanyId = user?.companyId ?? user?.company_id
            if (!effectiveCompanyId && user && (user.role === 'partner' || user.role === 'manager') && userCompanyId) {
                effectiveCompanyId = userCompanyId.toString()
            }

            if (effectiveCompanyId) {
                queryParams.set('company_id', effectiveCompanyId)
            }

            if (adminMode) {
                queryParams.set('admin_mode', 'true')
            }

            const filters = params.filters || {}

            if (sign) {
                filters.sign = sign
            }

            queryParams.set('filters', JSON.stringify(filters))

            const response = await fetch(`/api/payments?${queryParams.toString()}`)
            if (!response.ok) {
                throw new Error('Failed to fetch payments')
            }

            const result = (await response.json()) as PaymentsResponse
            if (result.data.length === 0 && params.page === 1) {
                await toast.info('No payments found')
            }
            return result
        } catch (error) {
            await toast.error('Failed to load payments')
            throw error
        }
    }

    const fetchAllPayments = (params: FetchParams) => fetchPayments(params)
    const fetchIncomePayments = (params: FetchParams) => fetchPayments(params, '+')
    const fetchExpensePayments = (params: FetchParams) => fetchPayments(params, '-')

    const columns: Column<Payment>[] = [
        {
            key: 'id',
            label: 'id',
            render: (item) => (
                <Button
                    type="button"
                    variant="unstyled"
                    onClick={() => {
                        const params = new URLSearchParams()
                        if (adminMode) params.set('admin_mode', 'true')
                        if (companyId) params.set('company_id', companyId)
                        navigate(`/payments/${item.id}?${params.toString()}`)
                    }}
                    className="hover:opacity-70 transition-opacity"
                >
                    <IdBadge>{item.id.toString().padStart(4, '0')}</IdBadge>
                </Button>
            )
        },
        {
            key: 'created_at',
            label: 'date',
            sortable: true,
            render: (item) => {
                const date = item.payment_date || item.created_at
                return (
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                            {format(new Date(date), 'dd MMM yyyy')}
                        </span>
                        <span className="text-xs text-gray-500">
                            {format(new Date(date), 'HH:mm')}
                        </span>
                    </div>
                )
            }
        },
        {
            key: 'contract_id',
            label: 'contract',
            render: (item) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                        #{item.contracts?.id?.toString().padStart(4, '0') || 'N/A'}
                    </span>
                    <span className="text-xs text-gray-500">
                        {item.contracts?.client ? `${item.contracts.client.name} ${item.contracts.client.surname}` : 'Unknown User'}
                    </span>
                </div>
            )
        },
        {
            key: 'payment_type',
            label: 'type',
            render: (item) => (
                <span className="text-sm text-gray-500">
                    {item.payment_types?.name || '-'}
                </span>
            )
        },
        {
            key: 'payment_method',
            label: 'method',
            render: (item) => (
                <span className="text-sm text-gray-500 capitalize">{item.payment_method}</span>
            )
        },
        {
            key: 'status',
            label: 'status',
            render: (item) => (
                <span className="text-sm text-gray-500">
                    {item.payment_statuses.name.toLowerCase()}
                </span>
            )
        },
        {
            key: 'created_by',
            label: 'created by',
            render: (item) => (
                <span className="text-sm text-gray-500">
                    {item.creator ? `${item.creator.name} ${item.creator.surname}` : '-'}
                </span>
            )
        },
        {
            key: 'amount',
            label: 'amount',
            sortable: true,
            render: (item) => {
                const sign = item.payment_types?.sign || '+'
                const amount = new Intl.NumberFormat('en-US').format(item.amount)
                return (
                    <span className="text-sm font-bold text-gray-800">
                        {sign}{amount} ฿
                    </span>
                )
            }
        }
    ]

    const paymentTabs: Tab<Payment>[] = [
        {
            id: 'all',
            label: 'All',
            columns: columns,
            fetchData: fetchAllPayments
        },
        {
            id: 'income',
            label: 'Income',
            columns: columns,
            fetchData: fetchIncomePayments
        },
        {
            id: 'expense',
            label: 'Expenses',
            columns: columns,
            fetchData: fetchExpensePayments
        }
    ]

    return (
        <DataTable
            tabs={paymentTabs}
            defaultTabId="all"
            initialPageSize={20}
            searchQuery={searchQuery}
            disablePagination={true}
        />
    )
}
