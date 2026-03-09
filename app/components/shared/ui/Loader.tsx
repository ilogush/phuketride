interface LoaderProps {
    className?: string
}

export default function Loader({ className = "" }: LoaderProps) {
    return (
        <div
            className={`flex w-24 h-4 bg-gray-200 rounded-full overflow-hidden mx-auto ${className}`}
            role="progressbar"
        >
            <div className="h-full rounded-full bg-gray-700 animate-loader-fill" />
        </div>
    )
}
