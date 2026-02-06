import Loader from './Loader'

interface PageContentProps {
    loading?: boolean
    error?: string | null
    children: React.ReactNode
    onRetry?: () => void
}

export function PageContent({ loading, error, children, onRetry }: PageContentProps) {
    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <p className="text-gray-600 font-medium">{error}</p>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="text-gray-800 hover:text-gray-500 underline text-sm font-medium"
                    >
                        Try again
                    </button>
                )}
            </div>
        )
    }

    return <>{children}</>
}
