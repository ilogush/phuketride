import { Link } from 'react-router'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

interface BackButtonProps {
    href?: string
    to?: string
}

export function BackButton({ href, to }: BackButtonProps) {
    const destination = to || href || '/dashboard'
    return (
        <Link
            to={destination}
            className="inline-flex items-center justify-center p-2 rounded-full bg-white hover:bg-gray-200 transition-all duration-200 shadow-sm border border-gray-200"
        >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
        </Link>
    )
}

export default BackButton;
